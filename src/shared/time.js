export const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
export const fmt = d => `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
export const fmtShort = d => `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;

export function parseTime(str) {
  const m = /^\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*$/i.exec(str || "");
  if (!m) return null;
  const hour12 = +m[1], min = +m[2];
  if (hour12 < 1 || hour12 > 12 || min > 59) return null;
  return { h: (hour12 % 12) + (m[3].toUpperCase() === "PM" ? 12 : 0), m: min };
}

const pad = n => String(n).padStart(2, "0");
export const toISODate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromISODate = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };

export function dueAt(isoDate, time) {
  const t = parseTime(time);
  if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate || "")) return null;
  const d = fromISODate(isoDate);
  d.setHours(t.h, t.m, 0, 0);
  return d;
}

export function formatTime(d) {
  const h = d.getHours();
  return `${h % 12 || 12}:${pad(d.getMinutes())} ${h >= 12 ? "PM" : "AM"}`;
}

export function dayLabel(d, today) {
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const b = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((a - b) / 864e5);
  return diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : fmtShort(d);
}

export const isValidEmail = s => /^\S+@\S+\.\S+$/.test(s || "");
// A recipient field may hold several addresses separated by commas, semicolons or spaces.
export const parseEmails = s => String(s || "").split(/[,;\s]+/).filter(Boolean);
export const isValidRecipients = s => { const l = parseEmails(s); return l.length > 0 && l.every(isValidEmail); };
