import { useEffect, useState } from "react";
import { Download, ArrowLeft } from "lucide-react";
import { DOWNLOAD_URL } from "./config.js";

const LABEL = { feat: "New", fix: "Fix", perf: "Faster", docs: "Docs", refactor: "Change", chore: "Change", other: "Change" };
const mb = n => Math.round(n / 1048576) + " MB";
const day = iso => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
// Release commits ("chore: release vX") are already filtered out, so what is left is user-visible work.
const label = t => LABEL[t] || "Change";

function Release({ r, latest }) {
  return (
    <article className="rel" aria-labelledby={"v" + r.version}>
      <div className="rel-head">
        <h2 id={"v" + r.version}>Version {r.version}</h2>
        {latest && <span className="rel-tag">Latest</span>}
        <span className="rel-meta">{day(r.date)} · {mb(r.size)}</span>
        <a className={"btn btn-sm" + (latest ? "" : " btn-ghost")} href={`${DOWNLOAD_URL}?v=${r.version}`}>
          <Download size={16} aria-hidden="true" />Download<span className="visually-hidden"> version {r.version}</span>
        </a>
      </div>
      {r.changes.length ? (
        <ul className="rel-changes">
          {r.changes.map((c, i) => <li key={i}><span className={"chg chg-" + c.type}>{label(c.type)}</span>{c.text}</li>)}
        </ul>
      ) : <p className="rel-none">No changes listed for this version.</p>}
    </article>
  );
}

export default function Downloads() {
  const [state, setState] = useState({ status: "loading", releases: [] });
  useEffect(() => {
    let off = false;
    fetch("/api/releases").then(async r => {
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "The version list could not be loaded.");
      return j.releases;
    }).then(releases => !off && setState({ status: "ok", releases }), e => !off && setState({ status: "error", message: e.message, releases: [] }));
    return () => { off = true; };
  }, []);

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="nav-wrap">
        <div className="nav container">
          <a className="mark" href="/"><img src="/icon.png" alt="" width="28" height="28" />Daily Digest</a>
          <a className="btn btn-sm btn-ghost dl-back" href="/"><ArrowLeft size={16} aria-hidden="true" />Back to home</a>
        </div>
      </header>
      <main id="main" className="container dl">
        <h1>Downloads</h1>
        <p className="lead dl-lead">Every version of Daily Digest for Windows, newest first, with what changed in each.</p>
        {state.status === "loading" && <p className="dl-state" role="status">Loading versions…</p>}
        {state.status === "error" && <p className="dl-state" role="alert">{state.message} <a href="/api/download">Download the latest version</a> instead.</p>}
        {state.status === "ok" && !state.releases.length && <p className="dl-state">No versions are published yet.</p>}
        {state.releases.map((r, i) => <Release key={r.version} r={r} latest={i === 0} />)}
        <p className="aside dl-note">Older versions are kept for reference. If the app says an update is required, install the latest one.</p>
      </main>
      <footer className="foot container">
        <a className="mark" href="/"><img src="/icon.png" alt="" width="24" height="24" />Daily Digest</a>
        <span>Developed by Jah Dela Cruz</span>
      </footer>
    </>
  );
}
