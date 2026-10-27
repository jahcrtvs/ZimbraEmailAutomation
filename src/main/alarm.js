import { dueAt, toISODate } from "../shared/time.js";

// On weekdays, at the time set in Settings, reminds the user to write today's digest. Off unless turned on.
export function createAlarm({ store, notifications, now = () => new Date(), intervalMs = 30000 }) {
  let timer = null;
  function tick() {
    const { enabled, time } = store.read("settings").alarm;
    if (!enabled) return;
    const t = now(), today = toISODate(t);
    const due = dueAt(today, time);
    if (!due || due > t || t.getDay() === 0 || t.getDay() === 6) return;
    // Nothing to remind about once today's digest is sent or on its way.
    if (store.read("history").some(h => h.date === today)) return;
    if (store.read("schedule").some(i => i.date === today && ["scheduled", "prepared"].includes(i.status))) return;
    notifications.add({ kind: "alarm", key: "alarm:" + today, title: "Time for your Daily Digest", body: "Write today's notes and prepare the report in Zimbra." }, { show: true });
  }
  // Runs from a timer: a failed read or save must not stop the next try.
  const safeTick = () => { try { tick(); } catch { /* try again next tick */ } };
  return {
    start() { timer = setInterval(safeTick, intervalMs); safeTick(); },
    stop() { clearInterval(timer); },
    tick
  };
}
