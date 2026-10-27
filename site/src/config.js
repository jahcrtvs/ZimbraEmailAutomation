// What the download buttons point at. Change VERSION and SIZE when a new installer is published.
// /api/download (site/api/download.js) redirects to the latest release's installer in the private repo;
// set VITE_DOWNLOAD_URL in Vercel only to send the buttons somewhere else.
export const VERSION = "1.2.0";
export const SIZE = "116 MB";
export const DOWNLOAD_URL = import.meta.env.VITE_DOWNLOAD_URL || "/api/download";
export const MODEL = "qwen2.5:3b-instruct";
