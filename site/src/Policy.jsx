import { ArrowLeft } from "lucide-react";
import Footer from "./Footer.jsx";

const REPO = "https://github.com/jahcrtvs/ZimbraEmailAutomation";

export default function Policy() {
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="nav-wrap">
        <div className="nav container">
          <a className="mark" href="/"><img src="/icon.png" alt="" width="28" height="28" />Daily Digest</a>
          <a className="btn btn-sm btn-ghost dl-back" href="/"><ArrowLeft size={16} aria-hidden="true" />Back to home</a>
        </div>
      </header>
      <main id="main" className="container dl pol">
        <h1>Code signing and privacy</h1>

        <section id="code-signing">
          <h2>Code signing policy</h2>
          <p>Daily Digest is free software under the <a href={REPO + "/blob/main/LICENSE"}>GNU General Public License v3.0</a>. Its source code is public at <a href={REPO}>{REPO.replace("https://", "")}</a>.</p>
          <p><strong>Status:</strong> a request for free code signing from SignPath Foundation is pending. Until it is approved, the Windows installer is not signed.</p>
          <p>Once approved, the installer is signed with a certificate from SignPath Foundation, using the free code signing service of SignPath.io. Signing happens only for builds made from the public repository by the GitHub Actions workflow <code>.github/workflows/release.yml</code>, when a version tag is pushed. Nobody signs files by hand.</p>
          <p>Roles: Jah Dela Cruz is the only author, reviewer and approver of signing requests.</p>
        </section>

        <section id="privacy-policy">
          <h2>Privacy policy</h2>
          <p>Daily Digest has no accounts, no analytics and no tracking. The author collects no data about you or your use of the app. The app sends information to another system only when you ask it to, or when you set it up to do so:</p>
          <ul>
            <li><strong>Your Zimbra server.</strong> The app opens the Zimbra address you enter in Settings, in its own Chrome window, and fills in a new message. It never presses Send, and it never sees or stores your Zimbra password.</li>
            <li><strong>Your own computer.</strong> The local AI (Ollama) runs on your PC. Your notes go only to the server address in Settings.</li>
            <li><strong>Groq or Gemini, only if you turn on the cloud fallback.</strong> If the local AI fails, the app asks first (or sends automatically, if you chose that). It sends your notes with emails, links, phone numbers, names and your hidden words replaced by placeholders. Your API key is encrypted by Windows and never shown again.</li>
            <li><strong>This website.</strong> On launch and every 4 hours, the app asks <code>/api/version</code> for the newest version number. The request carries no personal data and no version. If it fails, the app opens normally. The website is hosted on Vercel, which keeps standard server logs.</li>
          </ul>
          <p>Your history, schedule, template and settings are stored only on your computer, in the app's user-data folder. Uninstalling the app does not delete them; you can delete that folder yourself.</p>
          <p>Questions: open an issue at <a href={REPO + "/issues"}>{REPO.replace("https://", "")}/issues</a>.</p>
        </section>
      </main>
      <Footer />
    </>
  );
}
