// GET /api/download: sends the visitor to the latest Windows installer in the private repo.
// GitHub answers an authenticated asset request with a short-lived signed link; we redirect to it,
// so the file streams from GitHub and the token never leaves the server.
// Env (Vercel project settings): GITHUB_TOKEN (fine-grained, Contents: read-only, this repo only),
// GITHUB_REPO (optional, owner/name).
const REPO = process.env.GITHUB_REPO || "jahcrtvs/ZimbraEmailAutomation";
const API = "https://api.github.com";

function fail(res, status, message) {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(`<!doctype html><meta charset="utf-8"><title>Download unavailable</title><body style="font-family:system-ui;background:#0c0c0c;color:#fff;padding:40px"><p>${message}</p><p><a style="color:#f6a23a" href="/">Back to Daily Digest</a></p>`);
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") { res.setHeader("Allow", "GET, HEAD"); return fail(res, 405, "Use a normal link to download."); }
  const token = process.env.GITHUB_TOKEN;
  if (!token) return fail(res, 503, "Downloads are not set up yet.");
  const headers = { Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "daily-digest-site" };

  try {
    // ?v=1.2.1 picks an older version; without it the newest release is served.
    const v = new URL(req.url, "http://x").searchParams.get("v");
    if (v !== null && !/^\d+\.\d+\.\d+$/.test(v)) return fail(res, 400, "That is not a version number.");
    const rel = await fetch(`${API}/repos/${REPO}/releases/${v ? "tags/v" + v : "latest"}`, { headers: { ...headers, Accept: "application/vnd.github+json" } });
    if (rel.status === 404 && v) return fail(res, 404, `Version ${v} was not found.`);
    if (!rel.ok) { console.error("release lookup failed", rel.status); return fail(res, 502, "The release could not be found. Try again in a minute."); }
    const asset = (await rel.json()).assets?.find(a => /\.exe$/i.test(a.name));
    if (!asset) return fail(res, 404, v ? `Version ${v} has no Windows installer.` : "The latest release has no Windows installer yet.");

    const file = await fetch(asset.url, { headers: { ...headers, Accept: "application/octet-stream" }, redirect: "manual" });
    const to = file.headers.get("location");
    if (file.status < 300 || file.status >= 400 || !to) { console.error("asset link failed", file.status); return fail(res, 502, "The installer link could not be created. Try again in a minute."); }

    res.statusCode = 302;
    res.setHeader("Location", to);
    res.setHeader("Cache-Control", "no-store");
    res.end();
  } catch (e) {
    console.error("download failed", e.message);
    fail(res, 502, "GitHub could not be reached. Try again in a minute.");
  }
}
