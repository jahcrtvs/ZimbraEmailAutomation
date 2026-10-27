export const KINDS = ["update", "alarm", "error", "reminder"];
const MAX = 100;

// The app's notification list: what the Notifications page shows. A popup is also shown on the desktop when asked.
export function createNotifications({ store, now = () => new Date(), popup = () => {}, onChange = () => {} }) {
  const commit = fn => { const list = store.update("notifications", fn); onChange(list); return list; };
  // key: something said once (an update version, one day's alarm) is never added again.
  function add({ kind, title, body = "", key }, { show = false } = {}) {
    if (!KINDS.includes(kind)) throw new Error("Unknown notification kind.");
    if (key && store.read("notifications").some(n => n.key === key)) return store.read("notifications");
    // The popup goes first so a failed save cannot hide an alarm or a prepared email.
    if (show) popup(title, body);
    const n = { id: now().getTime().toString(36) + Math.random().toString(36).slice(2, 6), kind, title, body, at: now().toISOString(), read: false, ...(key ? { key } : {}) };
    return commit(list => [n, ...list].slice(0, MAX));
  }
  const markAllRead = () => commit(list => list.map(n => n.read ? n : { ...n, read: true }));
  const clear = () => commit(() => []);
  return { add, markAllRead, clear };
}
