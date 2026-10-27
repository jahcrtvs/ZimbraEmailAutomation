import React from "react";
import { AppSidebar, Toast } from "./ds";
import { AppShell, AppStatus } from "./AppShell.jsx";
import { useApp } from "./useApp.js";
import { NewDigestScreen } from "./screens/NewDigest.jsx";
import { ScheduledScreen } from "./screens/Scheduled.jsx";
import { HistoryScreen } from "./screens/History.jsx";
import { TemplatesScreen } from "./screens/Templates.jsx";
import { SettingsScreen } from "./screens/Settings.jsx";
import { UpdateBanner, UpdateRequired } from "./screens/UpdateGate.jsx";
import { CrashScreen } from "./screens/CrashScreen.jsx";
import { ScheduleModal, SendModal, PrepareModal, LoginModal, ZimbraErrorDialog, ZimbraStatusModal, ConfirmCancel, ConfirmRegen, MissedDialog, ViewModal, CloudConsentDialog } from "./screens/dialogs.jsx";

export function App() {
  const { s, a, ready, bootError } = useApp();
  if (bootError) return <CrashScreen title="Daily Digest could not load your data" message="Your notes, history and settings could not be read. Reload to try again." details={bootError} />;
  if (!ready) return null;
  const nSch = s.items.filter(i => i.status === "scheduled").length;
  const items = [
    { id: "new", label: "New Digest", icon: "square-pen", kbd: "Ctrl+N" },
    { id: "scheduled", label: "Scheduled", icon: "clock", count: nSch || undefined, countTone: "info" },
    { id: "history", label: "History", icon: "history" },
    { id: "templates", label: "Templates", icon: "layout-template" },
    { id: "settings", label: "Settings", icon: "settings" }
  ];
  const Screen = { new: NewDigestScreen, scheduled: ScheduledScreen, history: HistoryScreen, templates: TemplatesScreen, settings: SettingsScreen }[s.page];
  const mt = s.modal && s.modal.t;
  return (
    <AppShell status={<AppStatus s={s} />}>
      <AppSidebar items={items} value={s.page} onChange={id => id === "new" ? (a.go("new"), a.newDigest()) : a.go(id)} connected={s.zimbra} onConnectionClick={() => a.setModal({ t: "zstatus" })} />
      <main style={{ flex: 1, minWidth: 0, display: "flex", minHeight: 0, margin: "0 10px 10px 0", background: "var(--surface-panel)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}><Screen s={s} a={a} /></main>
      {mt === "schedule" && <ScheduleModal key={s.modal.id || "n"} s={s} a={a} />}
      {mt === "send" && <SendModal s={s} a={a} />}
      {mt === "prepare" && <PrepareModal s={s} a={a} />}
      {mt === "login" && <LoginModal s={s} a={a} />}
      {mt === "zerr" && <ZimbraErrorDialog s={s} a={a} />}
      {mt === "zstatus" && <ZimbraStatusModal s={s} a={a} />}
      {mt === "cancelSched" && <ConfirmCancel s={s} a={a} />}
      {mt === "regen" && <ConfirmRegen a={a} />}
      {mt === "missed" && <MissedDialog s={s} a={a} />}
      {mt === "view" && <ViewModal s={s} a={a} />}
      {mt === "cloud" && s.cloudAsk && <CloudConsentDialog s={s} a={a} />}
      {s.update?.state === "optional" && !s.updateDismissed && <UpdateBanner update={s.update} a={a} />}
      {s.update?.state === "required" && <UpdateRequired update={s.update} a={a} />}
      {s.toast && <div key={s.toast.id} style={{ position: "absolute", left: 0, right: 0, bottom: 24, display: "flex", justifyContent: "center", zIndex: 200, pointerEvents: "none" }}><div style={{ pointerEvents: "auto" }}><Toast tone={s.toast.tone} message={s.toast.message} onClose={a.clearToast} /></div></div>}
    </AppShell>
  );
}
