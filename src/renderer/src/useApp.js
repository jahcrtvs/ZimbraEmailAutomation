import React from "react";
import { fmt, toISODate, fromISODate, formatTime } from "@shared/time.js";
import { hasNotes, EMPTY_NOTES, SAMPLE_NOTES, DEFAULT_TEMPLATE, subjectFor, blocksToText } from "@shared/report.js";
import { itemFromDisk, itemToDisk, historyFromDisk, historyToDisk } from "./persist.js";

const api = () => window.api;
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
const draftOf = b => Object.fromEntries(b.map((x, i) => x.type === "section" ? [i, x.items.join("\n")] : null).filter(Boolean));

const initial = () => ({
  page: "new", stage: "form", notes: { ...EMPTY_NOTES }, today: new Date(), date: new Date(), blocks: [], draft: {},
  digestStatus: "none", schedule: { date: new Date(), time: "5:00 PM", to: "" }, items: [], modal: null, zimbra: false, toast: null,
  genAt: null, savedAt: null, sentAt: null, history: [], historySel: null, template: DEFAULT_TEMPLATE,
  settings: null, hasKey: { gemini: false, groq: false }, genStep: 0, prepStep: 0, testing: false, testingAI: false, curId: null, genError: null, modalDetails: null, modalCode: null,
  update: null, updateDismissed: false, aiSource: null, aiNote: null, cloudAsk: null, audit: [], localStatus: null, checkingLocal: false, genLines: [], notifications: [], draftReport: null, tour: null
});
// A saved draft Report is reopened only if it has sentences to show.
const validReport = r => r && Array.isArray(r.blocks) && r.blocks.length > 0 ? r : null;

export function useApp() {
  const [s, setS] = React.useState(initial);
  const [ready, setReady] = React.useState(false);
  const [bootError, setBootError] = React.useState(null);
  const ref = React.useRef(s); ref.current = s;
  const up = p => setS(prev => ({ ...prev, ...(typeof p === "function" ? p(prev) : p) }));
  const timers = React.useRef([]);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const genId = React.useRef(0);
  const shownMissed = React.useRef(new Set());

  const toast = (message, tone = "success") => {
    const id = Date.now();
    up({ toast: { message, tone, id } });
    later(() => up(p => p.toast && p.toast.id === id ? { toast: null } : {}), 3200);
  };
  // Errors also go to Notifications, so one missed toast is not lost.
  const noteError = (title, body) => { api().notifications?.addError(title, body).catch(() => {}); };
  // For saves that would otherwise fail without the user knowing.
  const failed = what => e => { toast("Could not " + what + ": " + (e?.message || e), "danger"); noteError("Could not " + what, String(e?.message || e)); };
  const subject = (c = ref.current) => subjectFor(c.settings.email.defaultSubject, c.date, c.settings.email.dateFormat);

  const maybeShowMissed = items => {
    const m = items.find(i => i.status === "missed" && !shownMissed.current.has(i.id));
    if (m && !ref.current.modal) { shownMissed.current.add(m.id); up({ modal: { t: "missed", id: m.id } }); }
  };
  const applyItems = disk => {
    const items = disk.map(itemFromDisk);
    up(p => ({ items, digestStatus: p.curId && items.find(i => i.id === p.curId)?.status === "prepared" && p.digestStatus === "scheduled" ? "prepared" : p.digestStatus }));
    maybeShowMissed(items);
  };

  // ---- boot
  React.useEffect(() => {
    let off = () => {}, offStep = () => {}, offProgress = () => {}, offNotes = () => {};
    api().store.load().then(async d => {
      const settings = d.settings;
      const today = new Date();
      // Restore a back-filled digest date from the draft; never a future one.
      const saved = /^\d{4}-\d{2}-\d{2}$/.test(d.draft.date || "") && hasNotes(d.draft.notes) && d.draft.date < toISODate(today) ? fromISODate(d.draft.date) : today;
      const report = hasNotes(d.draft.notes) ? validReport(d.draft.report) : null;
      setS(p => ({ ...p, settings, tour: settings.app.onboarded ? null : 0, hasKey: d.hasKey, audit: d.audit, template: d.template.body, today, date: saved, notifications: d.notifications || [],
        notes: { ...EMPTY_NOTES, ...d.draft.notes }, digestStatus: report ? "ready" : hasNotes(d.draft.notes) ? "draft" : "none",
        ...(report ? { stage: "review", blocks: report.blocks, aiSource: report.aiSource || null, aiNote: report.aiNote || null, genAt: report.genAt || null, savedAt: report.savedAt || null, draftReport: report } : {}),
        history: d.history.map(historyFromDisk), items: d.schedule.map(itemFromDisk),
        schedule: { date: today, time: settings.general.defaultSendTime, to: settings.email.defaultRecipient } }));
      setReady(true);
      maybeShowMissed(d.schedule.map(itemFromDisk));
      api().zimbra.check().then(r => up({ zimbra: r === "connected" }), () => up({ zimbra: false }));
    }).catch(e => setBootError(String(e?.message || e)));
    off = api().schedule.onChanged(applyItems);
    offStep = api().zimbra.onStep(n => up({ prepStep: n }));
    offProgress = api().onGenerateProgress?.(p => up(prev => prev.stage === "generating" ? { genLines: [...prev.genLines, p.sentence] } : {})) || (() => {});
    offNotes = api().notifications?.onChanged(notifications => up({ notifications })) || (() => {});
    return () => { off(); offStep(); offProgress(); offNotes(); clear(); };
  }, []);

  // ---- update check: on launch, then every few hours while the app stays open
  React.useEffect(() => {
    if (!ready || !api().update) return;
    const run = () => api().update.check().then(u => up({ update: u }), () => {});
    run();
    const t = setInterval(run, 4 * 60 * 60 * 1000);
    return () => clearInterval(t);
  }, [ready]);

  // ---- autosave notes (debounced)
  React.useEffect(() => {
    if (!ready) return;
    // The saved draft Report goes along, or saving the notes would drop it.
    const t = setTimeout(() => api().store.save("draft", { notes: s.notes, date: toISODate(s.date), report: s.draftReport }).catch(failed("save your notes")), 600);
    return () => clearTimeout(t);
  }, [s.notes, s.date, s.draftReport, ready]);

  async function runPrepare({ to, subj, blocks, forCur }) {
    clear();
    up({ modal: { t: "prepare" }, prepStep: 0 });
    try {
      await api().zimbra.prepare({ to, subject: subj, body: blocksToText(blocks) });
      up(p => ({ prepStep: 3, zimbra: true, digestStatus: forCur ? "prepared" : p.digestStatus, draftReport: forCur ? null : p.draftReport }));
      toast("Email prepared in Zimbra.");
      return true;
    } catch (e) {
      up({ modal: { t: e.code === "LOGIN" ? "login" : "zerr" }, modalDetails: e.message, modalCode: e.code, zimbra: e.code === "LOGIN" ? false : ref.current.zimbra });
      noteError(e.code === "LOGIN" ? "Zimbra login required" : "Email could not be prepared in Zimbra", e.code === "LOGIN" ? "Sign in to Zimbra, then prepare the email again." : String(e.message || e));
      return false;
    }
  }

  const a = {
    go: page => {
      up({ page, historySel: null });
      if (page === "notifications" && ref.current.notifications.some(n => !n.read)) api().notifications.markAllRead().catch(() => {});
    },
    clearNotifications: () => api().notifications.clear().catch(failed("clear notifications")),
    newDigest: () => { const c = ref.current; if (["none", "sent"].includes(c.digestStatus)) a.resetDigest(); else up({ page: "new" }); },
    resetDigest: () => { clear(); const now = new Date(); up(p => ({ page: "new", stage: "form", notes: { ...EMPTY_NOTES }, blocks: [], draft: {}, digestStatus: "none", savedAt: null, sentAt: null, curId: null, date: now, today: now, modal: null, genError: null, aiSource: null, aiNote: null, cloudAsk: null, genLines: [], draftReport: null })); api().store.save("draft", { notes: { ...EMPTY_NOTES }, report: null }).catch(failed("clear your notes")); },
    setNotes: notes => up(p => ({ notes, digestStatus: p.digestStatus === "none" ? "draft" : p.digestStatus })),
    setDate: date => up({ date }),
    fillSample:() => up({ notes: { ...SAMPLE_NOTES }, digestStatus: "draft" }),
    generate: () => a.run("auto"),
    cloudSend: () => a.run("cloud"),
    // Keep why the local AI failed: "you chose not to send" alone hides what needs fixing.
    cloudDecline: () => a.run("template", ref.current.cloudAsk?.failure?.message),
    async run(mode, why) {
      const c = ref.current;
      if (!hasNotes(c.notes)) return;
      clear();
      const id = ++genId.current;
      up({ page: "new", stage: "generating", genStep: 0, modal: null, genError: null, cloudAsk: null, genLines: [] });
      later(() => up({ genStep: 1 }), 600);
      later(() => up({ genStep: 2 }), 1200);
      try {
        const r = await api().generate({ notes: c.notes, template: c.template, profile: c.settings.profile, date: toISODate(c.date), dateFormat: c.settings.email.dateFormat, mode });
        if (id !== genId.current) return;
        clear();
        if (r.status === "needs-consent") { up({ modal: { t: "cloud" }, cloudAsk: r }); return; }
        up({ stage: "review", blocks: r.blocks, aiSource: r.source, aiNote: why ? why + " " + r.note : r.note, digestStatus: "ready", savedAt: null, genAt: formatTime(new Date()) });
        if (r.source === "groq" || r.source === "gemini") api().store.load().then(d => up({ audit: d.audit }), () => {});
      } catch (e) {
        if (id !== genId.current) return;
        clear();
        up({ stage: "error", genError: { details: e.message } });
        noteError("Report could not be generated", String(e.message || e));
      }
    },
    regenerate: () => { if (ref.current.savedAt) up({ modal: { t: "regen" } }); else a.generate(); },
    // A Report saved for the old notes must not come back after they change.
    editNotes: () => up({ stage: "form", digestStatus: "draft", draftReport: null }),
    async saveDraft() {
      const c = ref.current;
      const report = { blocks: c.blocks, aiSource: c.aiSource, aiNote: c.aiNote, genAt: c.genAt, savedAt: c.savedAt, at: formatTime(new Date()) };
      try { await api().store.save("draft", { notes: c.notes, date: toISODate(c.date), report }); }
      catch (e) { failed("save the draft")(e); return; }
      up({ draftReport: report });
      toast("Draft saved. It opens here next time.");
    },
    startEdit: () => up(p => ({ stage: "editing", draft: draftOf(p.blocks) })),
    setDraft: draft => up({ draft }),
    saveEdit: () => { up(p => ({ stage: "review", savedAt: formatTime(new Date()), blocks: p.blocks.map((b, i) => b.type === "section" && p.draft[i] != null ? { ...b, items: p.draft[i].split(/\r?\n/).map(x => x.trim()).filter(Boolean) } : b) })); toast("Saved"); },
    cancelEdit: () => up({ stage: "review" }),
    openSchedule: (edit, id) => up({ modal: { t: "schedule", edit, id } }),
    async confirmSchedule(sch, editId) {
      const c = ref.current;
      try {
        if (editId && editId !== c.curId) {
          const it = c.items.find(i => i.id === editId);
          disk(await api().schedule.upsert(itemToDisk({ ...it, ...sch, status: "scheduled" })));
          up({ modal: null }); toast("Schedule updated."); return;
        }
        const id = c.curId || uid();
        const item = { id, ...sch, subject: subject(c), status: "scheduled", blocks: c.blocks };
        disk(await api().schedule.upsert(itemToDisk(item)));
        up({ schedule: sch, digestStatus: "scheduled", stage: "review", modal: null, curId: id, draftReport: null });
        toast(editId ? "Schedule updated." : "Digest scheduled for " + sch.time + ".");
      } catch (e) { up({ modal: { ...c.modal, fail: true } }); }
    },
    async cancelSchedule(id) {
      try { applyItems(await api().schedule.setStatus(id, "cancelled")); }
      catch (e) { up({ modal: null }); failed("cancel the digest")(e); return; }
      up(p => ({ digestStatus: id === p.curId ? "ready" : p.digestStatus, curId: id === p.curId ? null : p.curId, modal: null }));
      toast("Digest cancelled.", "info");
    },
    openSend: () => up({ modal: { t: "send" } }),
    async confirmSend() {
      const c = ref.current;
      if (!c.zimbra) { try { const r = await api().zimbra.check(); up({ zimbra: r === "connected" }); if (r !== "connected") { up({ modal: { t: "login" } }); return; } } catch (e) { up({ modal: { t: "zerr" }, modalDetails: e.message, modalCode: e.code }); return; } }
      await runPrepare({ to: c.schedule.to, subj: subject(c), blocks: c.blocks, forCur: true });
    },
    async loginZimbra() { up({ modal: null }); toast("Opening Zimbra in your browser…", "info"); try { await api().zimbra.open(); } catch (e) { up({ modal: { t: "zerr" }, modalDetails: e.message, modalCode: e.code }); } },
    async retryZimbra() { up({ modal: null, testing: true }); try { const r = await api().zimbra.check(); up({ testing: false, zimbra: r === "connected", modal: { t: "send" } }); } catch (e) { up({ testing: false, modal: { t: "zerr" }, modalDetails: e.message, modalCode: e.code }); } },
    async testZimbra() {
      up({ testing: true });
      try { const r = await api().zimbra.check(); up({ testing: false, zimbra: r === "connected" }); toast(r === "connected" ? "Zimbra connection OK." : "Zimbra login required.", r === "connected" ? "success" : "warning"); }
      catch (e) { up({ testing: false, zimbra: false }); toast("Unable to connect to Zimbra.", "danger"); }
    },
    async openZimbra() { toast("Opening Zimbra in your browser…", "info"); try { await api().zimbra.open(); } catch (e) { toast("Unable to open Zimbra.", "danger"); } },
    setModal: modal => up({ modal }), closeModal: () => { up({ modal: null }); },
    clearToast: () => up({ toast: null }),
    startTour: () => up({ tour: 0 }),
    tourStep: tour => up({ tour }),
    // Skip and finish both count: the tour opens by itself only once. Settings can show it again.
    finishTour: () => {
      const c = ref.current;
      up({ tour: null });
      if (c.settings.app.onboarded) return;
      const settings = { ...c.settings, app: { ...c.settings.app, onboarded: true } };
      api().store.save("settings", settings).then(() => up({ settings }), () => {});
    },
    dismissUpdate: () => up({ updateDismissed: true }),
    downloadUpdate: () => api().update.download().catch(() => toast("Could not open the download page.", "danger")),
    async markSent() {
      const c = ref.current, time = formatTime(new Date());
      const entry = { id: uid(), date: c.date, dateLabel: fmt(c.date), time, to: c.schedule.to, blocks: c.blocks, notes: c.notes, status: "sent" };
      const history = [entry, ...c.history];
      // Show Sent only once it is in History, or a restart would lose it.
      try { await api().store.save("history", history.map(historyToDisk)); }
      catch (e) { failed("save this digest to History")(e); return; }
      up({ digestStatus: "sent", sentAt: time, history, draftReport: null });
    },
    async prepareMissed(id) {
      const it = ref.current.items.find(i => i.id === id);
      const ok = await runPrepare({ to: it.to, subj: it.subject || subject(), blocks: it.blocks, forCur: false });
      if (ok) await api().schedule.setStatus(id, "prepared").then(applyItems, failed("update the schedule"));
    },
    async dismissMissed(id) {
      try { applyItems(await api().schedule.setStatus(id, "cancelled")); }
      catch (e) { up({ modal: null }); failed("cancel the digest")(e); return; }
      up({ modal: null }); toast("Digest cancelled. No email was sent.", "info");
    },
    selectHistory: id => up({ historySel: id }),
    duplicate: h => { up({ notes: { ...h.notes }, page: "new", stage: "form", digestStatus: "draft", blocks: [], savedAt: null, curId: null }); toast("Notes copied. Generate and review the new digest.", "info"); },
    saveTemplate: tpl => { up({ template: tpl }); api().store.save("template", { ...{ id: "daily-digest", name: "Daily Digest" }, body: tpl, variables: ["date", "name", "role", "tasks", "topics", "weekly_plans", "blockers", "tomorrow"] }).then(() => toast("Template saved."), failed("save the template")); },
    async saveSettings({ settings, apiKey }) {
      try { await api().store.save("settings", settings); }
      catch (e) { failed("save settings")(e); return false; }
      const prov = settings.ai.fallback.provider;
      if (apiKey && apiKey.trim() && prov !== "none") {
        try { await api().setApiKey(apiKey, prov); up(p => ({ hasKey: { ...p.hasKey, [prov]: true } })); }
        catch (e) { failed("save the API key")(e); return false; }
      }
      up(p => ({ settings, schedule: p.digestStatus === "scheduled" ? p.schedule : { ...p.schedule, to: settings.email.defaultRecipient, time: settings.general.defaultSendTime } }));
      toast("Settings saved.");
    },
    async testAI(provider) {
      up({ testingAI: true });
      try { await api().testAI(provider); toast("Connection OK."); }
      catch (e) { toast("Unable to connect: " + e.message, "danger"); }
      up({ testingAI: false });
    },
    async checkLocal() {
      up({ checkingLocal: true });
      try { up({ localStatus: await api().localStatus(), checkingLocal: false }); }
      catch (e) { up({ localStatus: { state: "no-server", detail: e.message }, checkingLocal: false }); }
    }
  };
  function disk(items) { applyItems(items); }

  // ---- keyboard shortcuts (Ctrl on Windows)
  React.useEffect(() => {
    const h = e => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const c = ref.current, k = e.key.toLowerCase();
      if (k === "n") { e.preventDefault(); a.newDigest(); }
      else if (k === "enter" && c.page === "new" && ["form", "error"].includes(c.stage)) { e.preventDefault(); a.generate(); }
      else if (k === "s" && e.shiftKey) { e.preventDefault(); if (c.stage === "review" && c.digestStatus === "ready") a.openSchedule(false); }
      else if (k === "s") { e.preventDefault(); if (c.stage === "editing" && c.page === "new") a.saveEdit(); else if (c.page === "templates" && window.__ddSaveTemplate) window.__ddSaveTemplate(); else if (c.page === "settings" && window.__ddSaveSettings) window.__ddSaveSettings(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return { s, a, ready, bootError };
}
