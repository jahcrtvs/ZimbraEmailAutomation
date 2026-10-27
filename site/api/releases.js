// GET /api/releases: every published version with its installer size and a list of what changed.
// Curated notes take priority; other releases use user-facing feat/fix commit lines.
// Env: GITHUB_TOKEN (same as /api/download), GITHUB_REPO (optional, owner/name).
import notes from "../release-notes.json" with { type: "json" };
const REPO = process.env.GITHUB_REPO || "jahcrtvs/ZimbraEmailAutomation";

// "- feat: new thing (abc1234)" -> { type: "feat", text: "new thing" }.
export function parseChanges(body) {
  return String(body || "").split(/\r?\n/).filter(l => l.startsWith("- ")).map(l => {
    const line = l.slice(2).replace(/\s*\([0-9a-f]{7,40}\)\s*$/, "").trim();
    const m = /^([a-z]+)(?:\([^)]*\))?!?:\s*(.+)$/i.exec(line);
    return m && { type: m[1].toLowerCase(), text: m[2] };
  }).filter(c => c && (c.type === "feat" || c.type === "fix") && c.text);
}

export function releaseChanges(version, body, curated = notes) {
  const all = Object.hasOwn(curated, version) ? curated[version] : parseChanges(body);
  return { changes: all.slice(0, 5), more: Math.max(0, all.length - 5) };
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  if (req.method !== "GET" && req.method !== "HEAD") { res.statusCode = 405; res.setHeader("Allow", "GET, HEAD"); return res.end("{}"); }
  const token = process.env.GITHUB_TOKEN;
  if (!token) { res.statusCode = 503; res.setHeader("Cache-Control", "no-store"); return res.end(JSON.stringify({ error: "Downloads are not set up yet." })); }
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=50`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "daily-digest-site" }
    });
    if (!r.ok) throw new Error("release list " + r.status);
    const releases = (await r.json())
      .filter(x => !x.draft && !x.prerelease && /^v\d+\.\d+\.\d+$/.test(x.tag_name))
      .map(x => {
        const exe = x.assets?.find(a => /\.exe$/i.test(a.name));
        const version = x.tag_name.slice(1);
        return exe && { version, date: x.published_at, size: exe.size, ...releaseChanges(version, x.body) };
      })
      .filter(Boolean);
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.end(JSON.stringify({ releases }));
  } catch (e) {
    console.error("releases failed", e.message);
    res.statusCode = 502;
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify({ error: "The version list could not be loaded. Try again in a minute." }));
  }
}
