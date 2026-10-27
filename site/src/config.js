// What the download buttons point at. Change VERSION and SIZE when a new installer is published.
// /api/download (site/api/download.js) redirects to the latest release's installer in the private repo;
// set VITE_DOWNLOAD_URL in Vercel only to send the buttons somewhere else.
export const VERSION = "1.2.2";
export const SIZE = "116 MB";
export const DOWNLOAD_URL = import.meta.env.VITE_DOWNLOAD_URL || "/api/download";
export const MODEL = "qwen2.5:3b-instruct";
// "Buy me a coffee" link in the closing section and footer. VITE_DONATE_URL in Vercel overrides it;
// set it to an empty value there to hide the link.
export const DONATE_URL = import.meta.env.VITE_DONATE_URL ?? "https://buymeacoffee.com/usm1runckc";
