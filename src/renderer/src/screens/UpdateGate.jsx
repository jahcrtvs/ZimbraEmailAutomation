import React from "react";
import { Banner, Button } from "../ds";

// Covers the whole app when this version is older than the minimum the website allows.
export function UpdateRequired({ update, a }) {
  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="upd-title" style={{ position: "absolute", inset: 0, zIndex: 300, background: "var(--surface-window)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 440, textAlign: "center" }}>
        <h1 id="upd-title" style={{ margin: 0, font: "600 22px/1.3 var(--font-sans)", color: "var(--fg-1)" }}>Update required</h1>
        <p style={{ margin: "12px 0 24px", font: "var(--text-body)", color: "var(--fg-2)", textWrap: "pretty" }}>
          This version of Daily Digest (v{update.current}) is no longer supported. Download and install v{update.latest} to keep using it. Your notes, history and settings are kept.
        </p>
        <Button variant="primary" size="lg" icon="download" onClick={a.downloadUpdate}>Download v{update.latest}</Button>
      </div>
    </div>
  );
}

// A dismissible notice when a newer version exists but this one still works.
export function UpdateBanner({ update, a }) {
  return (
    <div style={{ position: "absolute", top: 12, right: 16, width: 380, zIndex: 150 }}>
      <Banner tone="info" title={`Version ${update.latest} is available`} actions={<>
        <Button variant="primary" size="sm" onClick={a.downloadUpdate}>Download</Button>
        <Button variant="ghost" size="sm" onClick={a.dismissUpdate}>Later</Button>
      </>}>You are on v{update.current}.</Banner>
    </div>
  );
}
