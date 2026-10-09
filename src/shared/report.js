import { formatDate } from "./time.js";

export const VARIABLES = ["date", "name", "role", "tasks", "topics", "weekly_plans", "blockers", "tomorrow"];
export const DEFAULT_TEMPLATE = `TASK TODAY

{tasks}

PLANS FOR THE WEEK

{weekly_plans}

TOPICS

{topics}

BLOCKERS

{blockers}

Regards,
{name}
{role}`;

export const EMPTY_NOTES = { work: "", topics: "", progress: "", blockers: "", tomorrow: "" };
export const SAMPLE_NOTES = {
  work: "worked on hibernate\ncriteria query\nfixed duplicate result\ncontinued office repository",
  topics: "criteria api projections\nhql vs criteria",
  progress: "still having issue with embedded id",
  blockers: "",
  tomorrow: "tomorrow continue repository\nfinish embedded id mapping"
};

const dict = { hibernate: "Hibernate", criteria: "Criteria", api: "API", hql: "HQL", jdbc: "JDBC", sql: "SQL", java: "Java", id: "ID", crud: "CRUD", office: "Office", spring: "Spring", postgresql: "PostgreSQL", vs: "vs." };
const verbs = /^(worked|fixed|continued|studied|implemented|investigating|reviewed|learned|wrote|created|updated|tested|finish|continue|start|review|write|refactor|refactored|attended|set up|added)\b/i;

export function polish(line, kind) {
  let s = line.trim().replace(/^[-•*]\s*/, "");
  if (!s) return null;
  s = s.replace(/^tomorrow\s+/i, "");
  s = s.replace(/criteria query/i, "criteria API queries").replace(/duplicate result\b/i, "duplicate query results");
  const rules = [
    [/^continue (.+)/i, "continue work on the $1"],
    [/^continued (.+)/i, "continued work on the $1"],
    [/^still having (an )?issues? with (.+)/i, "investigating an issue with the $2"],
    [/^finish (.+)/i, "finish the $1"]
  ];
  for (const [re, rep] of rules) { if (re.test(s)) { s = s.replace(re, rep); break; } }
  if (!verbs.test(s)) s = (kind === "topics" ? "studied " : kind === "plans" ? "continue work on " : "worked on ") + s;
  s = s.split(" ").map(w => dict[w.toLowerCase()] || w).join(" ").replace(/API API/g, "API");
  s = s.charAt(0).toUpperCase() + s.slice(1);
  if (!/[.!?]$/.test(s)) s += ".";
  return s;
}

export const lines = (text, kind) => (text || "").split(/\r?\n/).map(l => polish(l, kind)).filter(Boolean);

export function buildVars(n, user, date, dateFormat) {
  const plans = lines(n.tomorrow, "plans");
  return {
    date: formatDate(date, dateFormat), name: user.name, role: user.role,
    tasks: [
      ...lines(n.work, "tasks"),
      ...lines(n.progress, "progress").map(s => s.startsWith("Investigating") || s.startsWith("Continued") ? s : "Still working on: " + s.charAt(0).toLowerCase() + s.slice(1))
    ],
    topics: lines(n.topics, "topics"),
    weekly_plans: plans, tomorrow: plans,
    blockers: lines(n.blockers, "tasks")
  };
}

export function render(template, vars) {
  const blocks = [];
  let cur = null;
  template.split(/\r?\n/).forEach(raw => {
    const l = raw.trim();
    if (!l || /^[─-]{3,}$/.test(l)) return;
    const v = l.match(/^\{(\w+)\}$/);
    if (v && Array.isArray(vars[v[1]])) { if (cur) cur.items.push(...vars[v[1]]); return; }
    if (!/[{}]/.test(l) && l === l.toUpperCase() && /[A-Z]/.test(l)) { cur = { type: "section", title: l, items: [] }; blocks.push(cur); return; }
    cur = null;
    blocks.push({ type: "text", text: l.replace(/\{(\w+)\}/g, (m, k) => Array.isArray(vars[k]) ? vars[k].join(", ") : (vars[k] ?? m)) });
  });
  return blocks.filter(b => b.type !== "section" || b.items.length);
}

export const subjectFor = (tpl, date, dateFormat) => tpl.replace("{date}", formatDate(date, dateFormat));
export const hasNotes = n => Object.values(n).some(v => String(v).trim());

export function blocksToText(blocks) {
  const out = [];
  let prevText = false;
  for (const b of blocks) {
    if (b.type === "section") {
      if (out.length) out.push("");
      out.push(b.title, ...b.items.map(i => "- " + i));
      prevText = false;
    } else {
      if (out.length && !prevText) out.push("");
      out.push(b.text);
      prevText = true;
    }
  }
  return out.join("\n");
}
