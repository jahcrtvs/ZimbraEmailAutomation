import { useEffect, useState } from "react";
import { Download, ArrowLeft, ChevronDown } from "lucide-react";
import { DOWNLOAD_URL } from "./config.js";
import Footer from "./Footer.jsx";

const LABEL = { feat: "New", fix: "Fix", perf: "Faster", docs: "Docs", refactor: "Change", chore: "Change", other: "Change" };
const mb = n => Math.round(n / 1048576) + " MB";
const day = iso => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
const label = t => LABEL[t] || "Change";

// The newest version starts open; older ones stay closed so a long change list does not crowd the page.
function Release({ r, latest }) {
  const [open, setOpen] = useState(latest);
  const n = r.changes.length + (r.more || 0);
  return (
    <article className="rel">
      <div className="rel-head">
        <h2 className="rel-title">
          <button type="button" className="rel-toggle" aria-expanded={open} aria-controls={"c" + r.version} onClick={() => setOpen(!open)}>
            <ChevronDown className="rel-chev" size={20} aria-hidden="true" />
            <span>Version {r.version}</span>
          </button>
        </h2>
        {latest && <span className="rel-tag">Latest</span>}
        <span className="rel-meta">{day(r.date)} · {mb(r.size)} · {n ? n + (n === 1 ? " change" : " changes") : "no user-facing changes"}</span>
        {latest && <a className="btn btn-sm" href={DOWNLOAD_URL}>
          <Download size={16} aria-hidden="true" />Download<span className="visually-hidden"> version {r.version}</span>
        </a>}
      </div>
      <div id={"c" + r.version} hidden={!open}>
        {n ? (
          <>
            <ul className="rel-changes">
              {r.changes.map((c, i) => <li key={i}><span className={"chg chg-" + c.type}>{label(c.type)}</span>{c.text}</li>)}
            </ul>
            {r.more > 0 && <p className="rel-none">and {r.more} more</p>}
          </>
        ) : <p className="rel-none">No user-facing changes in this version.</p>}
      </div>
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
        <p className="lead dl-lead">Every version of Daily Digest for Windows, newest first, with what changed in each. Linux and Mac support is coming soon; please wait for an official download.</p>
        {state.status === "loading" && <p className="dl-state" role="status">Loading versions…</p>}
        {state.status === "error" && <p className="dl-state" role="alert">{state.message} <a href="/api/download">Download the latest version</a> instead.</p>}
        {state.status === "ok" && !state.releases.length && <p className="dl-state">No versions are published yet.</p>}
        {state.releases.map((r, i) => <Release key={r.version} r={r} latest={i === 0} />)}
        <p className="aside dl-note">Older versions are kept for reference. If the app says an update is required, install the latest one.</p>
      </main>
      <Footer />
    </>
  );
}
