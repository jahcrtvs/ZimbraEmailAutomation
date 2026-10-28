import React from "react";
import { Modal, Button, Icon } from "../ds";

export const TOUR_STEPS = [
  { icon: "square-pen", title: "Welcome to Daily Digest", body: "Type rough notes about your day. Daily Digest turns them into a formal status report and prepares the email in Zimbra. This short tour shows how." },
  { icon: "list", title: "1. Write your notes", body: "Fill in the five boxes: Today's Work, Topics / Lessons, Still Working On, Blockers and Tomorrow. One line is one item, and press Enter for the next item. Only Today's Work is needed. Press Use example notes to see how it looks." },
  { icon: "sparkles", title: "2. Generate and review", body: "Press Generate Digest (Ctrl+Enter). Each item becomes one sentence, written by the local AI on your computer. Read the report, edit any sentence, then approve it." },
  { icon: "mail", title: "3. Schedule or prepare", body: "Schedule the digest for a time, or prepare it now. Daily Digest fills in the email in Zimbra through Chrome and stops. It never presses Send: you review the email and send it yourself." },
  { icon: "settings", title: "4. Set up once", body: "In Settings, add your name and role, the default recipients and your Zimbra address. Sign in to Zimbra in Chrome yourself, then press Test Connection. To use the local AI, install Ollama and press Save and check." }
];

export function Onboarding({ step, a }) {
  const last = step === TOUR_STEPS.length - 1, t = TOUR_STEPS[step];
  return <Modal fixed width={480} onClose={a.finishTour} title={t.title}
    footer={<>
      <span style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }} aria-label={"Step " + (step + 1) + " of " + TOUR_STEPS.length}>
        {TOUR_STEPS.map((_, i) => <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: i === step ? "var(--fg-accent)" : "var(--border-subtle)" }} />)}
      </span>
      {step === 0 ? <Button variant="ghost" onClick={a.finishTour}>Skip</Button> : <Button variant="ghost" onClick={() => a.tourStep(step - 1)}>Back</Button>}
      {last ? <>
        <Button variant="outline" icon="settings" onClick={() => { a.finishTour(); a.go("settings"); }}>Open Settings</Button>
        <Button variant="primary" onClick={a.finishTour}>Get started</Button>
      </> : <Button variant="primary" onClick={() => a.tourStep(step + 1)}>Next</Button>}
    </>}>
    <div style={{ display: "flex", gap: 14 }}>
      <span style={{ width: 36, height: 36, flexShrink: 0, borderRadius: "50%", background: "var(--tint-info)", color: "var(--status-info)", display: "grid", placeItems: "center" }}><Icon name={t.icon} size={18} /></span>
      <p style={{ margin: 0, font: "var(--text-body)", color: "var(--fg-2)", textWrap: "pretty" }}>{t.body}</p>
    </div>
  </Modal>;
}
