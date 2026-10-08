import React from "react";

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
      <div className="app-drag" style={{ height: "var(--titlebar-height)", flexShrink: 0, display: "flex", alignItems: "center", padding: "0 150px 0 14px", background: "var(--surface-titlebar)", borderBottom: "1px solid var(--border-subtle)", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, right: 0, textAlign: "center", font: "var(--text-app-title)", color: "var(--fg-2)", pointerEvents: "none" }}>Daily Digest</div>
        <div className="app-nodrag" style={{ marginLeft: "auto", position: "relative" }}>{status}</div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", position: "relative" }}>{children}</div>
    </div>
  );
}
