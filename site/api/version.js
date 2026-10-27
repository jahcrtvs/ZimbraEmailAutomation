// GET /api/version: tells the desktop app the newest version and the oldest one still allowed to run.
// latest comes from the newest GitHub Release, so it moves as soon as a release is published.
// min comes from MIN_VERSION in the Vercel project settings; raise it to force everyone below it to update.
// Env: GITHUB_TOKEN (same as /api/download), GITHUB_REPO (optional), MIN_VERSION (optional, default 0.0.0).
const REPO = process.env.GITHUB_REPO || "jahcrtvs/ZimbraEmailAutomation";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  if (req.method !== "GET" && req.method !== "HEAD") { res.statusCode = 405; res.setHeader("Allow", "GET, HEAD"); return res.end("{}"); }
  const min = /^\d+\.\d+\.\d+$/.test(process.env.MIN_VERSION || "") ? process.env.MIN_VERSION : "0.0.0";
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error("no token");
    const rel = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "daily-digest-site" }
    });
    if (!rel.ok) throw new Error("release lookup " + rel.status);
    const latest = String((await rel.json()).tag_name || "").replace(/^v/, "");
    if (!/^\d+\.\d+\.\d+/.test(latest)) throw new Error("bad tag");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.end(JSON.stringify({ latest, min }));
  } catch (e) {
    // Still report min so a forced update works even if GitHub is down; the app treats a missing latest as "no newer version".
    console.error("version lookup failed", e.message);
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify({ latest: null, min }));
  }
}
