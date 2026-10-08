import { toISODate, fromISODate, fmt } from "@shared/time.js";

export const itemFromDisk = i => ({ id: i.id, date: fromISODate(i.date), time: i.time, to: i.recipient, subject: i.subject, status: i.status, blocks: i.blocks, createdAt: i.createdAt });
export const itemToDisk = i => ({ id: i.id, date: toISODate(i.date), time: i.time, recipient: i.to, subject: i.subject, status: i.status, blocks: i.blocks, createdAt: i.createdAt || new Date().toISOString() });
export const historyFromDisk = h => { const d = fromISODate(h.date); return { id: h.id, date: d, dateLabel: fmt(d), time: h.time, to: h.recipient, status: h.status, notes: h.notes, blocks: h.blocks }; };
export const historyToDisk = h => ({ id: h.id, date: toISODate(h.date), time: h.time, recipient: h.to, status: h.status, notes: h.notes, blocks: h.blocks });
