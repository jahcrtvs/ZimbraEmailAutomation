export const AUDIT_LIMIT = 200;

export function createAudit(store, now = () => new Date()) {
  return {
    record({ provider, reason, chars }) {
      store.update("audit", list => [...list, { at: now().toISOString(), provider, reason, chars }].slice(-AUDIT_LIMIT));
    }
  };
}
