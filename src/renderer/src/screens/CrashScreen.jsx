import React from "react";
import { Button } from "../ds";

// Sends a page error to the crash log in the main process. Reporting must never cause another error.
export function reportError(where, e) {
  Promise.resolve()
    .then(() => window.api.logError({ where, message: String(e?.message || e), stack: String(e?.stack || "") }))
    .catch(() => {});
}

// Covers the whole app when it cannot go on, instead of leaving an empty window.
export function CrashScreen({ title, message, details, onReload = () => window.location.reload() }) {
  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="crash-title" style={{ position: "absolute", inset: 0, zIndex: 400, background: "var(--surface-window)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <h1 id="crash-title" style={{ margin: 0, font: "600 22px/1.3 var(--font-sans)", color: "var(--fg-1)" }}>{title}</h1>
        <p style={{ margin: "12px 0 16px", font: "var(--text-body)", color: "var(--fg-2)", textWrap: "pretty" }}>{message}</p>
        {details && <p style={{ margin: "0 0 24px", font: "var(--text-meta)", fontFamily: "var(--font-mono)", color: "var(--fg-3)", overflowWrap: "anywhere" }}>{details}</p>}
        <Button variant="primary" size="lg" onClick={onReload}>Reload</Button>
      </div>
    </div>
  );
}

export class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { reportError("screen", error); }
  render() {
    if (!this.state.error) return this.props.children;
    return <CrashScreen title="Something went wrong" message="Daily Digest hit an error and could not show this screen. Your saved notes, history and schedule are kept. Reload to continue." details={String(this.state.error.message || this.state.error)} />;
  }
}
