import { useEffect, useState } from "react";
import { Download, ArrowLeft, ChevronDown, Laptop, Terminal } from "lucide-react";
import { DOWNLOAD_URL, VERSION, SIZE } from "./config.js";
import Footer from "./Footer.jsx";

const LABEL = { feat: "New", fix: "Fix", perf: "Faster", docs: "Docs", refactor: "Change", chore: "Change", other: "Change" };
const mb = n => Math.round(n / 1048576) + " MB";
const day = iso => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
const label = t => LABEL[t] || "Change";

// lucide has no brand marks, so the Windows logo is drawn here.
const WindowsLogo = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M3 5.1 10.4 4v7.1H3zM11.4 3.9 21 2.5v8.6h-9.6zM3 12.1h7.4v7.1L3 18.1zM11.4 12.1H21v8.6l-9.6-1.4z" />
  </svg>
);

// Windows is the only build. Mac and Linux are shown so people know they are planned.
function Platforms({ latest }) {
  const version = latest ? latest.version : VERSION;
  const size = latest ? mb(latest.size) : SIZE;
  return (
    <div className="plat">
      <div className="plat-card plat-on">
        <WindowsLogo />
        <h2 className="plat-name">Windows</h2>
        <p className="plat-meta">Version {version} · {size}</p>
        <a className="btn btn-sm" href={DOWNLOAD_URL}>
          <Download size={16} aria-hidden="true" />Download for Windows
        </a>
      </div>
      {[["Mac", Laptop], ["Linux", Terminal]].map(([name, Icon]) => (
        <div className="plat-card" key={name}>
          <Icon size={28} aria-hidden="true" />
          <h2 className="plat-name">{name}</h2>
          <p className="plat-meta">Not available yet</p>
          <span className="btn btn-sm btn-ghost plat-soon" aria-disabled="true">Coming soon</span>
        </div>
      ))}
    </div>
  );
}

// The newest version starts open; older ones stay closed so a long change list does not crowd the page.
function Release({ r, latest }) {
  const [open, setOpen] = useState(latest);
  const n = r.changes.length + (r.more || 0);
  return (
    <article className={latest ? "rel rel-latest" : "rel"}>
      <div className="rel-head">
        <h2 className="rel-title">
          <button type="button" className="rel-toggle" aria-expanded={open} aria-controls={"c" + r.version} onClick={() => setOpen(!open)}>
            <ChevronDown className="rel-chev" size={20} aria-hidden="true" />
            <span>Version {r.version}</span>
          </button>
        </h2>
        {latest && <span className="rel-tag">Latest</span>}
        <span className="rel-meta">{day(r.date)} · {mb(r.size)} · {n ? n + (n === 1 ? " change" : " changes") : "no user-facing changes"}</span>
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
  const [older, setOlder] = useState(false);
  useEffect(() => {
    let off = false;
    fetch("/api/releases").then(async r => {
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "The version list could not be loaded.");
      return j.releases;
    }).then(releases => !off && setState({ status: "ok", releases }), e => !off && setState({ status: "error", message: e.message, releases: [] }));
    return () => { off = true; };
  }, []);
  const [latest, ...rest] = state.releases;

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
        <p className="lead dl-lead">Get the latest Daily Digest for Windows. Mac and Linux are coming soon; please wait for an official download.</p>
        <Platforms latest={latest} />
        {state.status === "loading" && <p className="dl-state" role="status">Loading versions…</p>}
        {state.status === "error" && <p className="dl-state" role="alert">{state.message} The Download button above still gets the latest version.</p>}
        {state.status === "ok" && !state.releases.length && <p className="dl-state">No versions are published yet.</p>}
        {latest && <Release r={latest} latest />}
        {rest.length > 0 && (
          <>
            <button type="button" className="rel-toggle dl-older" aria-expanded={older} aria-controls="older" onClick={() => setOlder(!older)}>
              <ChevronDown className="rel-chev" size={20} aria-hidden="true" />
              <span>{older ? "Hide" : "Show"} older versions ({rest.length})</span>
            </button>
            <div id="older" hidden={!older}>
              {rest.map(r => <Release key={r.version} r={r} latest={false} />)}
              <p className="aside dl-note">Older versions are kept for reference. If the app says an update is required, install the latest one.</p>
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
