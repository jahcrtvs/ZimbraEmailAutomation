import { useEffect, useRef, useState } from "react";
import { Copy, Check, MailCheck, Laptop } from "lucide-react";
import { armed, useInView, useLater, useMounted } from "./motion.js";

const SECTIONS = [["how", "How it works"], ["privacy", "Privacy"], ["setup", "Setup"]];

// Sections carry data-nav; the one crossing the middle of the screen marks its link, and one bar slides under it.
export function Nav({ download }) {
  const [cur, setCur] = useState(null);
  const links = useRef(null);
  const bar = useRef(null);
  useEffect(() => {
    const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && setCur(e.target.dataset.nav || null)), { rootMargin: "-45% 0px -54% 0px" });
    document.querySelectorAll("[data-nav]").forEach(s => io.observe(s));
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const place = () => {
      const a = cur && links.current.querySelector(`a[href="#${cur}"]`);
      bar.current.style.opacity = a ? 1 : 0;
      if (a) bar.current.style.transform = `translateX(${a.offsetLeft}px) scaleX(${a.offsetWidth})`;
    };
    place();
    addEventListener("resize", place);
    return () => removeEventListener("resize", place);
  }, [cur]);
  return (
    <header className="nav-wrap">
      <div className="nav container">
        <a className="mark" href="#top">Daily Digest</a>
        <nav aria-label="Sections" ref={links}>
          {SECTIONS.map(([id, label]) => <a key={id} href={"#" + id} aria-current={cur === id ? "true" : undefined}>{label}</a>)}
          <span className="nav-bar" ref={bar} aria-hidden="true" />
        </nav>
        <a className="btn btn-sm" href={download}>Download</a>
      </div>
    </header>
  );
}

// Bayer 4x4 thresholds mixed with a left-to-right sweep: the capture resolves through an ordered dither,
// with an orange front where the cells are about to clear. Then the chips dock onto its corners.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function HeroArt() {
  const [phase, setPhase] = useState("");
  const img = useRef(null);
  const cv = useRef(null);
  useEffect(() => {
    if (!armed()) return setPhase("is-shown");
    let raf;
    const start = () => {
      const c = cv.current, box = img.current.getBoundingClientRect(), dpr = devicePixelRatio || 1;
      c.width = Math.round(box.width * dpr); c.height = Math.round(box.height * dpr);
      const ctx = c.getContext("2d"), size = Math.round(12 * dpr), cols = Math.ceil(c.width / size), rows = Math.ceil(c.height / size);
      const css = getComputedStyle(document.documentElement), ground = css.getPropertyValue("--color-paper-3"), front = css.getPropertyValue("--color-accent");
      const cells = [];
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) cells.push([x * size, y * size, 0.6 * (x / cols) + 0.4 * (BAYER[(y % 4) * 4 + (x % 4)] / 16)]);
      setPhase("is-revealing");
      const t0 = performance.now(), dur = 1200;
      const tick = now => {
        const p = Math.min(1, (now - t0) / dur) * 1.12;
        ctx.clearRect(0, 0, c.width, c.height);
        for (const [x, y, t] of cells) {
          if (t <= p) continue;
          ctx.fillStyle = t - p < 0.07 ? front : ground;
          ctx.fillRect(x, y, size, size);
        }
        if (p < 1.12) raf = requestAnimationFrame(tick);
        else setPhase("is-shown");
      };
      raf = requestAnimationFrame(tick);
    };
    if (img.current.complete) start(); else img.current.addEventListener("load", start, { once: true });
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <figure className={"hero-art " + phase}>
      <div className="frame">
        <img ref={img} className="shot shot-report" src="/screens/report.png" alt="Daily Digest showing a finished report with Today's Work, Blockers and Tomorrow sections" width="1440" height="900" fetchpriority="high" />
        <canvas ref={cv} className="dither" aria-hidden="true" />
      </div>
      <p className="chip chip-a"><MailCheck size={20} aria-hidden="true" /><span><strong>Prepared, never sent</strong>You press Send in Zimbra</span></p>
      <p className="chip chip-b"><Laptop size={20} aria-hidden="true" /><span><strong>Stays on your PC</strong>Local AI through Ollama</span></p>
    </figure>
  );
}

// Each row writes its sentence when the list comes on screen, and again when picked:
// a short "Writing" state, then the sentence lights column by column like an LED sign.
export function Pairs({ pairs }) {
  const [ref, seen] = useInView();
  const [rows, setRows] = useState(() => pairs.map(() => "idle"));
  const [sel, setSel] = useState(null);
  const later = useLater();
  const setRow = (i, s) => setRows(r => r.map((v, j) => (j === i ? s : v)));
  useEffect(() => { if (armed()) setRows(pairs.map(() => "dark")); }, [pairs]);
  useEffect(() => {
    if (!seen || !armed()) return;
    pairs.forEach((_, i) => { later(() => setRow(i, "writing"), i * 650); later(() => setRow(i, "lit"), i * 650 + 450); });
  }, [seen]);
  const write = i => {
    setSel(i);
    if (!armed()) return;
    setRow(i, "writing");
    later(() => setRow(i, "lit"), 450);
  };
  return (
    <ol className="pairs" ref={ref}>
      {pairs.map(([rough, done], i) => (
        <li key={rough}>
          <button type="button" className="pair" data-state={rows[i]} aria-pressed={sel === i} onClick={() => write(i)}>
            <span className="rough">{rough}</span>
            <span className="done"><span className="done-text">{done}</span><span className="writing" aria-hidden="true">Writing</span></span>
          </button>
        </li>
      ))}
    </ol>
  );
}

// The two send dialogs sit on a horizontal rail; the step buttons and the dialog's own action move along it.
// Before hydration (or without JavaScript) both dialogs simply stack.
const STEPS = [
  { label: "Confirm", src: "/screens/send.png", w: 440, h: 299, alt: "Send dialog listing the recipients and subject, with a Prepare in Zimbra button" },
  { label: "Ready", src: "/screens/ready.png", w: 440, h: 205, alt: "Confirmation that the email is ready in Zimbra for review" },
];
export function ZimbraRail() {
  const live = useMounted();
  const [step, setStep] = useState(0);
  return (
    <div className={"rail" + (live ? " is-live" : "")} style={{ "--step": step }}>
      {live && (
        <div className="seg" role="group" aria-label="Send steps">
          {STEPS.map((s, i) => <button key={s.label} type="button" aria-pressed={step === i} onClick={() => setStep(i)}>{i + 1}. {s.label}</button>)}
        </div>
      )}
      <div className="rail-window">
        <div className="rail-track">
          {STEPS.map((s, i) => (
            <img key={s.src} className="shot rail-item" src={s.src} alt={s.alt} width={s.w} height={s.h} loading="lazy" decoding="async"
              aria-hidden={live && step !== i ? "true" : undefined} data-current={!live || step === i} onClick={() => live && setStep(i)} />
          ))}
        </div>
      </div>
      {live && <button type="button" className="btn btn-ghost" onClick={() => setStep(step ? 0 : 1)}>{step ? "Start again" : "Prepare in Zimbra"}</button>}
    </div>
  );
}

// The same sample notes the consent capture uses, with the app's own placeholder names.
const NOTE = [["emailed "], ["priya@example.com", "[EMAIL_1]"], [" about the staging build\nreview the pull request on "], ["https://git.example.com/app/pull/12", "[URL_1]"]];
export function Redact() {
  const live = useMounted();
  const [view, setView] = useState("plain");
  const [wiping, setWiping] = useState(false);
  const later = useLater();
  const show = v => {
    if (v === view || wiping) return;
    if (!armed()) return setView(v);
    setWiping(true);
    later(() => setView(v), 340);
    later(() => setWiping(false), 380);
  };
  const cloud = view === "cloud";
  return (
    <div className="redact">
      {live && (
        <div className="seg" role="group" aria-label="Which text to show">
          <button type="button" aria-pressed={!cloud} disabled={wiping} onClick={() => show("plain")}>Your notes</button>
          <button type="button" aria-pressed={cloud} disabled={wiping} onClick={() => show("cloud")}>Sent to the cloud</button>
        </div>
      )}
      <pre className="note" aria-live="polite">
        {NOTE.map(([text, swap], i) => swap
          ? <span key={i} className={"tok" + (wiping ? " is-wiping" : "") + (cloud ? " is-swapped" : "")}>{cloud ? swap : text}<span className="wipe" aria-hidden="true" /></span>
          : text)}
      </pre>
    </div>
  );
}

export function CopyCommand({ text }) {
  const live = useMounted();
  const [state, setState] = useState("idle");
  const code = useRef(null);
  const later = useLater();
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setState("copied"); }
    catch { getSelection().selectAllChildren(code.current); setState("failed"); }
    later(() => setState("idle"), 2000);
  };
  return (
    <span className="cmd">
      <code ref={code}>{text}</code>
      {live && (
        <button type="button" className="copy" data-state={state} onClick={copy}>
          <span className="copy-icons" aria-hidden="true"><Copy size={16} /><Check size={16} /></span>
          <span aria-live="polite">{state === "copied" ? "Copied" : state === "failed" ? "Press Ctrl+C" : "Copy"}</span>
        </button>
      )}
    </span>
  );
}

export function Steps({ children }) {
  const [ref, seen] = useInView(0.5);
  return <ol className={"steps" + (seen ? " is-lit" : "")} ref={ref}>{children}</ol>;
}
