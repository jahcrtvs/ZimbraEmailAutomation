import React from "react";
import logo from "../../../build/icon.png";

export function AppStatus({ s }) {
  const busy = s.stage === "generating", sch = s.digestStatus === "scheduled";
  const c = busy || sch ? "var(--status-info)" : s.zimbra ? "var(--status-success)" : "var(--status-warning)";
  const label = busy ? "Generating…" : sch ? "Scheduled · " + s.schedule.time : s.zimbra ? "Ready" : "Offline";
  return (
    <span role="status" style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "500 12px/1 var(--font-sans)", color: "var(--fg-3)" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: c, animation: busy ? "dd-pulse 1.2s infinite" : "none" }} />{label}
    </span>
  );
}

export function AppShell({ status, children }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--surface-window)" }}>
      <div className="app-drag" style={{ height: "var(--titlebar-height)", flexShrink: 0, display: "flex", alignItems: "center", gap: 10, padding: "0 150px 0 20px", background: "var(--surface-titlebar)" }}>
        <img src={logo} alt="" width={22} height={22} style={{ borderRadius: 6 }} />
        <span style={{ font: "var(--text-app-title)", color: "var(--fg-1)", letterSpacing: "var(--tracking-display)" }}>Daily Digest</span>
        <div className="app-nodrag" style={{ marginLeft: "auto" }}>{status}</div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", position: "relative" }}>{children}</div>
    </div>
  );
}
