import { compareVersions } from "../shared/version.js";

// Asks the Daily Digest website which version is current and which is the oldest still allowed.
// state: "ok" (up to date, or the check could not be made), "optional" (newer exists), "required" (this version is too old).
// A failed check never blocks the app, so a website outage cannot lock anyone out.
export function createUpdateChecker({ baseUrl, version, fetchImpl = fetch, timeoutMs = 8000 }) {
  const downloadUrl = baseUrl + "/api/download";
  const ok = { state: "ok", current: version, latest: version, downloadUrl };
  async function check() {
    try {
      const r = await fetchImpl(baseUrl + "/api/version", { signal: AbortSignal.timeout(timeoutMs), headers: { Accept: "application/json" } });
      if (!r.ok) return ok;
      const { latest, min } = await r.json();
      if (compareVersions(version, min) === -1) return { state: "required", current: version, latest: latest || min, downloadUrl };
      if (compareVersions(version, latest) === -1) return { state: "optional", current: version, latest, downloadUrl };
      return ok;
    } catch { return ok; }
  }
  return { check, downloadUrl };
}
