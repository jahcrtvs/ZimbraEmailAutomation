import { dueAt, isValidRecipients } from "../shared/time.js";

export function createScheduler({ store, now = () => new Date(), prepare, notify = () => {}, onChange = () => {}, intervalMs = 30000 }) {
  let busy = false, timer = null;
  const commit = fn => { const items = store.update("schedule", fn); onChange(items); return items; };

  const setStatus = (id, status) => commit(items => items.map(i => i.id === id ? { ...i, status } : i));
  const remove = id => commit(items => items.filter(i => i.id !== id));
  function upsert(item) {
    if (!dueAt(item.date, item.time)) throw new Error("Invalid date or time.");
    if (!isValidRecipients(item.recipient)) throw new Error("Enter a valid email address.");
    return commit(items => items.some(i => i.id === item.id) ? items.map(i => i.id === item.id ? item : i) : [...items, item]);
  }
  function markOverdueMissed() {
    const t = now();
    const overdue = i => {
      if (i.status !== "scheduled") return false;
      const due = dueAt(i.date, i.time);
      return !!due && due <= t;
    };
    if (!store.read("schedule").some(overdue)) return;
    commit(list => list.map(i => overdue(i) ? { ...i, status: "missed" } : i));
  }
  async function tick() {
    if (busy) return;
    busy = true;
    try {
      for (const it of store.read("schedule")) {
        if (it.status !== "scheduled") continue;
        const due = dueAt(it.date, it.time);
        if (!due || due > now()) continue;
        try {
          await prepare(it);
          setStatus(it.id, "prepared");
          notify("Email prepared in Zimbra", "Review it in Zimbra and press Send.");
        } catch {
          setStatus(it.id, "missed");
          notify("Scheduled digest was not prepared", "No email was sent.");
        }
      }
    } finally { busy = false; }
  }
  return {
    start() { markOverdueMissed(); timer = setInterval(tick, intervalMs); tick(); },
    stop() { clearInterval(timer); },
    tick, markOverdueMissed, setStatus, upsert, remove
  };
}
