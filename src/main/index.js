import { app, BrowserWindow, ipcMain, safeStorage, shell, Notification } from "electron";
import { join } from "node:path";
import { chromium } from "playwright-core";
import { createStore } from "./store.js";
import { createSecrets } from "./secrets.js";
import { createGenerator } from "./generate.js";
import { createAudit } from "./audit.js";
import { createScheduler } from "./scheduler.js";
import { createZimbra } from "./zimbra.js";
import { createFakeZimbra } from "./zimbra.fake.js";
import { ensureChrome } from "./chrome.js";
import { registerIpc } from "./ipc.js";
import { blocksToText, subjectFor } from "../shared/report.js";
import { fromISODate } from "../shared/time.js";

if (process.env.DD_USER_DATA) app.setPath("userData", process.env.DD_USER_DATA);
const PORT = 9222;

if (!app.requestSingleInstanceLock()) { app.quit(); }
else {
  let win = null;
  app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

  app.whenReady().then(() => {
    const dir = app.getPath("userData");
    const store = createStore(dir);
    const secrets = createSecrets(dir, safeStorage);
    const generator = createGenerator({
      getKey: p => secrets.getKey(p),
      audit: createAudit(store),
      // Tests must never reach a developer's running Ollama or any cloud service.
      fetchImpl: process.env.DD_TEST ? async () => { throw new Error("network disabled in tests"); } : undefined
    });
    const send = (ch, payload) => { if (win && !win.isDestroyed()) win.webContents.send(ch, payload); };
    const zimbra = process.env.DD_TEST
      ? createFakeZimbra(dir)
      : createZimbra({
          connect: () => chromium.connectOverCDP(`http://127.0.0.1:${PORT}`),
          ensure: url => ensureChrome({ port: PORT, profileDir: join(dir, "chrome-profile"), url })
        });
    const scheduler = createScheduler({
      store,
      prepare: it => zimbra.prepareMessage({ url: store.read("settings").zimbra.url, to: it.recipient, subject: it.subject || subjectFor(store.read("settings").email.defaultSubject, fromISODate(it.date), store.read("settings").email.dateFormat), body: blocksToText(it.blocks) }),
      notify: (title, body) => { if (Notification.isSupported()) new Notification({ title, body }).show(); },
      onChange: items => send("schedule:changed", items)
    });
    registerIpc({ ipcMain, store, secrets, generator, scheduler, zimbra, shell, send });
    // Load the local model now so the first report does not wait for it. Best effort.
    generator.warmUp(store.read("settings").ai.local);
    app.setLoginItemSettings({ openAtLogin: !!store.read("settings").app.startWithWindows && !process.env.DD_TEST });

    win = new BrowserWindow({
      width: 1440, height: 900, minWidth: 1100, minHeight: 700, show: false, backgroundColor: "#0c0c0c", title: "Daily Digest",
      titleBarStyle: "hidden", titleBarOverlay: { color: "#050505", symbolColor: "#bdbdbd", height: 40 },
      webPreferences: { preload: join(__dirname, "../preload/index.js"), sandbox: true, contextIsolation: true, nodeIntegration: false }
    });
    win.removeMenu();
    win.once("ready-to-show", () => win.show());
    // Keep running (minimised) while digests are scheduled so the timer can fire.
    win.on("close", e => {
      if (!app.isQuitting && store.read("schedule").some(i => i.status === "scheduled")) { e.preventDefault(); win.minimize(); }
    });
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL);
    else win.loadFile(join(__dirname, "../renderer/index.html"));

    scheduler.start();
  });
  app.on("before-quit", () => { app.isQuitting = true; });
  app.on("window-all-closed", () => app.quit());
}
