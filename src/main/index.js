import { app, BrowserWindow, ipcMain, safeStorage, shell, Notification, dialog } from "electron";
import { join } from "node:path";
import { chromium } from "playwright-core";
import { createStore } from "./store.js";
import { createSecrets } from "./secrets.js";
import { createGenerator } from "./generate.js";
import { createAudit } from "./audit.js";
import { createScheduler } from "./scheduler.js";
import { createNotifications } from "./notifications.js";
import { createAlarm } from "./alarm.js";
import { createZimbra } from "./zimbra.js";
import { createFakeZimbra } from "./zimbra.fake.js";
import { createChrome } from "./chrome.js";
import { createOllamaStarter } from "./ollama.js";
import { createUpdateChecker } from "./update.js";
import { registerIpc } from "./ipc.js";
import { createCrashLog, catchUncaught, watchRenderer } from "./crash.js";
import { blocksToText, subjectFor } from "../shared/report.js";
import { fromISODate } from "../shared/time.js";

// The Daily Digest website: /api/version says whether this build is current, /api/download serves the installer.
const UPDATE_SITE = process.env.DD_UPDATE_SITE || "https://daily-digest-eight-pearl.vercel.app";

if (process.env.DD_USER_DATA) app.setPath("userData", process.env.DD_USER_DATA);

if (!app.requestSingleInstanceLock()) { app.quit(); }
else {
  let win = null;
  const crash = createCrashLog(join(app.getPath("userData"), "crash.log"));
  catchUncaught(process, crash.log);
  app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

  app.whenReady().then(() => {
    const dir = app.getPath("userData");
    const store = createStore(dir);
    const secrets = createSecrets(dir, safeStorage);
    const generator = createGenerator({
      getKey: p => secrets.getKey(p),
      audit: createAudit(store),
      // Tests must never reach a developer's running Ollama or any cloud service.
      fetchImpl: process.env.DD_TEST ? async () => { throw new Error("network disabled in tests"); } : undefined,
      startLocal: process.env.DD_TEST ? undefined : createOllamaStarter()
    });
    const send = (ch, payload) => { if (win && !win.isDestroyed()) win.webContents.send(ch, payload); };
    const chrome = createChrome({ profileDir: join(dir, "chrome-profile"), launch: (profile, opts) => chromium.launchPersistentContext(profile, opts) });
    app.on("before-quit", () => { chrome.close(); });
    const zimbra = process.env.DD_TEST ? createFakeZimbra(dir) : createZimbra({ getContext: () => chrome.context() });
    const notifications = createNotifications({
      store,
      popup: (title, body) => {
        if (!Notification.isSupported()) return;
        const n = new Notification({ title, body });
        n.on("click", () => { if (win && !win.isDestroyed()) { win.restore(); win.show(); win.focus(); } });
        n.show();
      },
      onChange: list => send("notifications:changed", list)
    });
    const scheduler = createScheduler({
      store,
      prepare: it => zimbra.prepareMessage({ url: store.read("settings").zimbra.url, to: it.recipient, subject: it.subject || subjectFor(store.read("settings").email.defaultSubject, fromISODate(it.date), store.read("settings").email.dateFormat), body: blocksToText(it.blocks) }),
      // The popup is shown even when the list cannot be saved.
      notify: (title, body, kind = "reminder") => { try { notifications.add({ kind, title, body }, { show: true }); } catch (e) { crash.log("notify", e); } },
      onChange: items => send("schedule:changed", items)
    });
    const alarm = createAlarm({ store, notifications });
    // Tests must not depend on the website being reachable; the checker treats a failed request as "up to date".
    const update = createUpdateChecker({ baseUrl: UPDATE_SITE, version: app.getVersion(), fetchImpl: process.env.DD_TEST ? async () => { throw new Error("network disabled in tests"); } : undefined });
    const applyLogin = settings => app.setLoginItemSettings({ openAtLogin: !!settings.app.startWithWindows && !process.env.DD_TEST });
    registerIpc({ ipcMain, store, secrets, generator, scheduler, zimbra, shell, send, update, notifications, log: crash.log, onSettingsSaved: applyLogin });
    // Load the local model now so the first report does not wait for it. Best effort.
    generator.warmUp(store.read("settings").ai.local);
    applyLogin(store.read("settings"));

    win = new BrowserWindow({
      width: 1440, height: 900, minWidth: 1100, minHeight: 700, show: false, backgroundColor: "#0c0c0c", title: "Daily Digest",
      titleBarStyle: "hidden", titleBarOverlay: { color: "#050505", symbolColor: "#bdbdbd", height: 40 },
      webPreferences: { preload: join(__dirname, "../preload/index.js"), sandbox: true, contextIsolation: true, nodeIntegration: false }
    });
    win.removeMenu();
    win.once("ready-to-show", () => win.show());
    // Keep running (minimised) while digests are scheduled or the alarm is on so the timers can fire, and while the
    // Zimbra Chrome window is open, because quitting closes it and would lose an unsent message.
    win.on("close", e => {
      if (!app.isQuitting && (chrome.isOpen() || store.read("settings").alarm.enabled || store.read("schedule").some(i => i.status === "scheduled"))) { e.preventDefault(); win.minimize(); }
    });
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    // The window only ever shows the app page; any other page would get window.api.
    win.webContents.on("will-navigate", e => e.preventDefault());
    watchRenderer(win.webContents, crash.log, {
      onGiveUp: () => dialog.showErrorBox("Daily Digest stopped working", "The window crashed several times. Quit Daily Digest and open it again. Details were saved to " + crash.file)
    });
    if (process.env.ELECTRON_RENDERER_URL) win.loadURL(process.env.ELECTRON_RENDERER_URL);
    else win.loadFile(join(__dirname, "../renderer/index.html"));

    scheduler.start();
    alarm.start();
  }).catch(e => {
    // Without this the app would fail to start with no window and no message.
    crash.log("startup", e);
    dialog.showErrorBox("Daily Digest could not start", String(e.message || e) + "\n\nDetails were saved to " + crash.file);
    app.quit();
  });
  app.on("before-quit", () => { app.isQuitting = true; });
  app.on("window-all-closed", () => app.quit());
}
