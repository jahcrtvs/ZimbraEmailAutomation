import { VERSION, DOWNLOADS_PAGE, DONATE_URL } from "./config.js";

// One footer for every page. On the home page the links scroll; elsewhere they go back to it.
export default function Footer({ home = false }) {
  const to = id => (home ? "" : "/") + id;
  return (
    <footer className="foot container">
      <div className="foot-top">
        <div className="foot-brand">
          <a className="mark" href={to("#top")}><img src="/icon.png" alt="" width="24" height="24" />Daily Digest</a>
          <p>Turn daily notes into a Zimbra email. Free for Windows.</p>
        </div>
        <nav className="foot-col" aria-label="Product">
          <h2>Product</h2>
          <a href={DOWNLOADS_PAGE}>Downloads</a>
          <a href={to("#setup")}>Setup</a>
          <a href={to("#privacy")}>Privacy</a>
          <a href="/policy">Code signing and privacy policy</a>
        </nav>
        {DONATE_URL && (
          <div className="foot-col">
            <h2>Support</h2>
            <a href={DONATE_URL} target="_blank" rel="noopener noreferrer">Buy me a coffee</a>
          </div>
        )}
      </div>
      <div className="foot-bottom">
        <span>Developed by Jah Dela Cruz</span>
        <span>Version {VERSION}</span>
      </div>
    </footer>
  );
}
