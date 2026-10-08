import React from "react";
import { fmt, toISODate, formatTime } from "@shared/time.js";
import { hasNotes, EMPTY_NOTES, SAMPLE_NOTES, DEFAULT_TEMPLATE, subjectFor, blocksToText } from "@shared/report.js";
import { itemFromDisk, itemToDisk, historyFromDisk, historyToDisk } from "./persist.js";

const api = () => window.api;
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
const draftOf = b => Object.fromEntries(b.map((x, i) => x.type === "section" ? [i, x.items.join("\n")] : null).filter(Boolean));

const initial = () => ({
  page: "new", stage: "form", notes: { ...EMPTY_NOTES }, today: new Date(), date: new Date(), blocks: [], draft: {},
  digestStatus: "none", schedule: { date: new Date(), time: "5:00 PM", to: "" }, items: [], modal: null, zimbra: false, toast: null,
  genAt: null, savedAt: null, sentAt: null, history: [], historySel: null, template: DEFAULT_TEMPLATE,
  settings: null, hasKey: { gemini: false, groq: false }, genStep: 0, prepStep: 0, testing: false, testingAI: false, curId: null, genError: null, modalDetails: null, modalCode: null
});

export function useApp() {
  const [s, setS] = React.useState(initial);
  const [ready, setReady] = React.useState(false);
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
  const subject = (c = ref.current) => subjectFor(c.settings.email.defaultSubject, c.date);

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
    let off = () => {}, offStep = () => {};
    api().store.load().then(async d => {
      const settings = d.settings;
      const today = new Date();
      setS(p => ({ ...p, settings, hasKey: d.hasKey, template: d.template.body, today, date: today,
        notes: { ...EMPTY_NOTES, ...d.draft.notes }, digestStatus: hasNotes(d.draft.notes) ? "draft" : "none",
        history: d.history.map(historyFromDisk), items: d.schedule.map(itemFromDisk),
        schedule: { date: today, time: settings.general.defaultSendTime, to: settings.email.defaultRecipient } }));
      setReady(true);
      maybeShowMissed(d.schedule.map(itemFromDisk));
      api().zimbra.check(settings.zimbra.url).then(r => up({ zimbra: r === "connected" }), () => up({ zimbra: false }));
    });
    off = api().schedule.onChanged(applyItems);
    offStep = api().zimbra.onStep(n => up({ prepStep: n }));
    return () => { off(); offStep(); clear(); };
  }, []);

  // ---- autosave notes (debounced)
  React.useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => api().store.save("draft", { notes: s.notes }), 600);
    return () => clearTimeout(t);
  }, [s.notes, ready]);

  async function runPrepare({ to, subj, blocks, forCur }) {
    clear();
    up({ modal: { t: "prepare" }, prepStep: 0 });
    try {
      await api().zimbra.prepare({ url: ref.current.settings.zimbra.url, to, subject: subj, body: blocksToText(blocks) });
      up(p => ({ prepStep: 3, zimbra: true, digestStatus: forCur ? "prepared" : p.digestStatus }));
      toast("Email prepared in Zimbra.");
      return true;
    } catch (e) {
      up({ modal: { t: e.code === "LOGIN" ? "login" : "zerr" }, modalDetails: e.message, modalCode: e.code, zimbra: e.code === "LOGIN" ? false : ref.current.zimbra });
      return false;
    }
  }

  const a = {
    go: page => up({ page, historySel: null }),
    newDigest: () => { const c = ref.current; if (["none", "sent"].includes(c.digestStatus)) a.resetDigest(); else up({ page: "new" }); },
    resetDigest: () => { clear(); const now = new Date(); up(p => ({ page: "new", stage: "form", notes: { ...EMPTY_NOTES }, blocks: [], draft: {}, digestStatus: "none", savedAt: null, sentAt: null, curId: null, date: now, today: now, modal: null, genError: null })); api().store.save("draft", { notes: { ...EMPTY_NOTES } }); },
    setNotes: notes => up(p => ({ notes, digestStatus: p.digestStatus === "none" ? "draft" : p.digestStatus })),
    fillSample: () => up({ notes: { ...SAMPLE_NOTES }, digestStatus: "draft" }),
    async generate() {
      const c = ref.current;
      if (!hasNotes(c.notes)) return;
      clear();
      const id = ++genId.current;
      up({ page: "new", stage: "generating", genStep: 0, modal: null, genError: null });
      later(() => up({ genStep: 1 }), 600);
      later(() => up({ genStep: 2 }), 1200);
      try {
        const blocks = await api().generate({ notes: c.notes, template: c.template, profile: c.settings.profile, date: toISODate(c.date), model: c.settings.ai.model, provider: c.settings.ai.provider });
        if (id !== genId.current) return;
        clear();
        up({ stage: "review", blocks, digestStatus: "ready", savedAt: null, genAt: formatTime(new Date()) });
      } catch (e) {
        if (id !== genId.current) return;
        clear();
        up({ stage: "error", genError: { details: e.message } });
      }
    },
    regenerate: () => { if (ref.current.savedAt) up({ modal: { t: "regen" } }); else a.generate(); },
    editNotes: () => up({ stage: "form", digestStatus: "draft" }),
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
        up({ schedule: sch, digestStatus: "scheduled", stage: "review", modal: null, curId: id });
        toast(editId ? "Schedule updated." : "Digest scheduled for " + sch.time + ".");
      } catch (e) { up({ modal: { ...c.modal, fail: true } }); }
    },
    async cancelSchedule(id) {
      applyItems(await api().schedule.setStatus(id, "cancelled"));
      up(p => ({ digestStatus: id === p.curId ? "ready" : p.digestStatus, curId: id === p.curId ? null : p.curId, modal: null }));
      toast("Digest cancelled.", "info");
    },
    openSend: () => up({ modal: { t: "send" } }),
    async confirmSend() {
      const c = ref.current;
      if (!c.zimbra) { try { const r = await api().zimbra.check(c.settings.zimbra.url); up({ zimbra: r === "connected" }); if (r !== "connected") { up({ modal: { t: "login" } }); return; } } catch (e) { up({ modal: { t: "zerr" }, modalDetails: e.message, modalCode: e.code }); return; } }
      await runPrepare({ to: c.schedule.to, subj: subject(c), blocks: c.blocks, forCur: true });
    },
    async loginZimbra() { up({ modal: null }); toast("Opening Zimbra in your browser…", "info"); try { await api().zimbra.open(ref.current.settings.zimbra.url); } catch (e) { up({ modal: { t: "zerr" }, modalDetails: e.message, modalCode: e.code }); } },
    async retryZimbra() { up({ modal: null, testing: true }); try { const r = await api().zimbra.check(ref.current.settings.zimbra.url); up({ testing: false, zimbra: r === "connected", modal: { t: "send" } }); } catch (e) { up({ testing: false, modal: { t: "zerr" }, modalDetails: e.message, modalCode: e.code }); } },
    async testZimbra() {
      up({ testing: true });
      try { const r = await api().zimbra.check(ref.current.settings.zimbra.url); up({ testing: false, zimbra: r === "connected" }); toast(r === "connected" ? "Zimbra connection OK." : "Zimbra login required.", r === "connected" ? "success" : "warning"); }
      catch (e) { up({ testing: false, zimbra: false }); toast("Unable to connect to Zimbra.", "danger"); }
    },
    async openZimbra() { toast("Opening Zimbra in your browser…", "info"); try { await api().zimbra.open(ref.current.settings.zimbra.url); } catch (e) { toast("Unable to open Zimbra.", "danger"); } },
    setModal: modal => up({ modal }), closeModal: () => { up({ modal: null }); },
    clearToast: () => up({ toast: null }),
    markSent() {
      const c = ref.current, time = formatTime(new Date());
      const entry = { id: uid(), date: c.date, dateLabel: fmt(c.date), time, to: c.schedule.to, blocks: c.blocks, notes: c.notes, status: "sent" };
      const history = [entry, ...c.history];
      api().store.save("history", history.map(historyToDisk));
      up({ digestStatus: "sent", sentAt: time, history });
    },
    async prepareMissed(id) {
      const it = ref.current.items.find(i => i.id === id);
      const ok = await runPrepare({ to: it.to, subj: it.subject || subject(), blocks: it.blocks, forCur: false });
      if (ok) applyItems(await api().schedule.setStatus(id, "prepared"));
    },
    async dismissMissed(id) { applyItems(await api().schedule.setStatus(id, "cancelled")); up({ modal: null }); toast("Digest cancelled. No email was sent.", "info"); },
    selectHistory: id => up({ historySel: id }),
    duplicate: h => { up({ notes: { ...h.notes }, page: "new", stage: "form", digestStatus: "draft", blocks: [], savedAt: null, curId: null }); toast("Notes copied. Generate and review the new digest.", "info"); },
    saveTemplate: tpl => { up({ template: tpl }); api().store.save("template", { ...{ id: "daily-digest", name: "Daily Digest" }, body: tpl, variables: ["date", "name", "role", "tasks", "topics", "weekly_plans", "blockers", "tomorrow"] }); toast("Template saved."); },
    async saveSettings({ settings, apiKey }) {
      await api().store.save("settings", settings);
      if (apiKey && apiKey.trim()) { const prov = settings.ai.provider; await api().setApiKey(apiKey, prov); up(p => ({ hasKey: { ...p.hasKey, [prov]: true } })); }
      up(p => ({ settings, schedule: p.digestStatus === "scheduled" ? p.schedule : { ...p.schedule, to: settings.email.defaultRecipient, time: settings.general.defaultSendTime } }));
      toast("Settings saved.");
    },
    async testAI() {
      up({ testingAI: true });
      try { await api().testAI(ref.current.settings.ai.model, ref.current.settings.ai.provider); toast("Connection OK."); }
      catch (e) { toast("Unable to connect: " + e.message, "danger"); }
      up({ testingAI: false });
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

  return { s, a, ready };
}
