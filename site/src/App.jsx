import { Download, Laptop, ShieldCheck, Lock, KeyRound, Coffee } from "lucide-react";
import { VERSION, SIZE, DOWNLOADS_PAGE, MODEL, DONATE_URL } from "./config.js";
import Footer from "./Footer.jsx";
import { Nav,HeroArt, Pairs, ZimbraRail, Redact, CopyCommand, Steps } from "./demos.jsx";

const PAIRS = [
  ["fixed duplicate result", "Resolved the issue of duplicate results by optimizing the query logic."],
  ["hql vs criteria", "Compared HQL and the Criteria API for their respective use cases."],
  ["worked on hibernate", "Worked on Hibernate, focusing on the Criteria API for query construction."],
];

function CoffeeButton({ className = "" }) {
  return <a className={"btn btn-ghost btn-coffee " + className} href={DONATE_URL} target="_blank" rel="noopener noreferrer"><Coffee size={18} aria-hidden="true" />Buy me a coffee</a>;
}

function DownloadButton() {
  return (
    <div className="get">
      <a className="btn" href={DOWNLOADS_PAGE}><Download size={18} aria-hidden="true" />Download for Windows</a>
      <p className="get-note">Free, version {VERSION} for Windows 10 and 11, {SIZE}. Linux and Mac support is coming soon.</p>
    </div>
  );
}

function Support() {
  if (!DONATE_URL) return null;
  return (
    <div className="support">
      <p>Daily Digest is free. If it saves you time, you can support its development.</p>
      <CoffeeButton />
    </div>
  );
}

function Shot({ src, alt, w, h, className = "" }) {
  return <img className={"shot " + className} src={src} alt={alt} width={w} height={h} loading="lazy" decoding="async" />;
}

export default function App() {
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <Nav download={DOWNLOADS_PAGE} donate={DONATE_URL} />

      <main id="main">
        <section className="hero" id="top" data-nav="">
          <div className="container hero-grid">
            <div className="hero-copy">
              <h1>Turn daily notes into a Zimbra email.</h1>
              <p className="lead">Type rough keywords, get a formal report prepared in Zimbra.</p>
              <DownloadButton />
            </div>
            <HeroArt />
          </div>
        </section>

        <section className="how container" id="how" data-nav="how">
          <h2>Rough lines in, full sentences out.</h2>
          <Pairs pairs={PAIRS} />
          <p className="aside">Real output from the local model. Pick a line to write it again.</p>
        </section>

        <section className="wait" data-nav="how">
          <div className="container wait-grid">
            <div className="wait-copy">
              <h2>It waits in Zimbra until you press Send.</h2>
              <p>The app opens Zimbra in Chrome, fills in the recipients, subject and body, then stops. Nothing in the app can press Send.</p>
            </div>
            <ZimbraRail />
          </div>
        </section>

        <section className="privacy container" id="privacy" data-nav="privacy">
          <div className="privacy-copy">
            <h2>Your notes stay on your PC.</h2>
            <ul className="facts">
              <li><Laptop size={20} aria-hidden="true" />A local model on your computer writes the report.</li>
              <li><ShieldCheck size={20} aria-hidden="true" />If it fails, the app asks before any cloud service sees your notes.</li>
              <li><Lock size={20} aria-hidden="true" />Emails and links become placeholders first.</li>
              <li><KeyRound size={20} aria-hidden="true" />Cloud keys are stored encrypted by Windows.</li>
            </ul>
            <Redact />
          </div>
          <Shot className="shot-consent" src="/screens/consent.png" alt="Dialog asking before notes are sent to a cloud service, showing an email replaced with [EMAIL_1]" w="420" h="570" />
        </section>

        <section className="setup" id="setup" data-nav="setup">
          <div className="container setup-grid">
            <h2>Set up in four steps.</h2>
            <Steps>
              <li style={{ "--i": 0 }}><span>Install <a href="https://www.google.com/chrome/">Google Chrome</a> and <a href="https://ollama.com/download">Ollama</a>.</span></li>
              <li style={{ "--i": 1 }}><span>In a terminal, run <CopyCommand text={`ollama pull ${MODEL}`} /></span></li>
              <li style={{ "--i": 2 }}><span>Run the installer and sign in to Zimbra. If Windows warns, pick More info, Run anyway.</span></li>
              <li style={{ "--i": 3 }}><span>Set recipients, subject and date format in Settings, your report in Templates.</span></li>
            </Steps>
          </div>
        </section>

        <section className="faq container" data-nav="setup">
          <h2>Common questions.</h2>
          <div className="faq-list">
            <details>
              <summary>Is my Zimbra password stored?</summary>
              <p>No. You sign in inside Chrome, and the app reuses that session.</p>
            </details>
            <details>
              <summary>Do I need to sign in to the app?</summary>
              <p>No. Daily Digest has no account. You only sign in to Zimbra inside Chrome, and a cloud API key is optional.</p>
            </details>
            <details>
              <summary>Do schedules send by themselves?</summary>
              <p>No. A schedule only prepares the email, and a missed one waits for you.</p>
            </details>
            <details>
              <summary>Does it work on Linux or Mac?</summary>
              <p>Not yet. Linux and Mac support is coming soon. For now, it needs Windows 10 or 11 with Chrome installed.</p>
            </details>
            <details>
              <summary>Where do I get a Gemini or Groq API key?</summary>
              <p>It is optional, only for the cloud fallback. Create a free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a> for Gemini or at the <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">Groq Console</a>, then paste it in Settings. Windows stores it encrypted.</p>
            </details>
            <details>
              <summary>Need support or found a bug?</summary>
              <p>Email <a href="mailto:markjustine.work@gmail.com">markjustine.work@gmail.com</a>.</p>
            </details>
          </div>
        </section>

        <section className="close" data-nav="">
          <div className="container close-grid">
            <div>
              <h2>Write today’s report in a minute.</h2>
              <DownloadButton />
              <Support />
            </div>
            <Shot src="/screens/notes.png" alt="Daily Digest with rough notes typed under Today's Work, Blockers and Tomorrow" w="1440" h="900" />
          </div>
        </section>
      </main>

      <Footer home />
    </>
  );
}
