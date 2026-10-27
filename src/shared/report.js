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

const dict = {
  hibernate: "Hibernate", criteria: "Criteria", api: "API", hql: "HQL", jdbc: "JDBC", sql: "SQL", java: "Java", id: "ID", crud: "CRUD", office: "Office", spring: "Spring", postgresql: "PostgreSQL", vs: "vs.",
  aws: "AWS", git: "Git", github: "GitHub", docker: "Docker", react: "React", javascript: "JavaScript", typescript: "TypeScript", html: "HTML", css: "CSS", json: "JSON", jpa: "JPA", mvc: "MVC", junit: "JUnit",
  linux: "Linux", mysql: "MySQL", ui: "UI", ux: "UX", ai: "AI", oop: "OOP", i: "I",
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday"
};

// Verbs a note may start with, recognised in base, past and -ing form, so a note that already
// says what was done keeps its own verb (in the tense its section needs) instead of getting
// "Worked on" or "Continue work on" stuck in front of it.
const VERBS = "add analyse analyze apply assist attend begin build check clean commit complete configure continue create debug deploy design develop discuss do document explore finalize finish fix help implement improve install integrate investigate join learn make meet merge migrate optimize plan practice practise prepare present pull push read refactor research resolve review revise rewrite run set start study submit support take test train update watch work write".split(" ");
// Also common nouns: as the first word of a done-today note they are read as a verb only in past or -ing form.
const NOUNISH = new Set("build check commit design document help meet plan practice present pull push read research review run set study support test train update watch work".split(" "));
const STUDY = new Set("attend discuss explore learn practice practise read research review study watch".split(" "));
const IRREGULAR = { begin: "began", build: "built", do: "did", make: "made", meet: "met", read: "read", rewrite: "rewrote", run: "ran", set: "set", take: "took", write: "wrote" };
const DOUBLE = new Set(["begin", "commit", "debug", "plan", "run", "set", "submit"]);
const pastOf = v => IRREGULAR[v] || (DOUBLE.has(v) ? v + v.slice(-1) + "ed" : v.endsWith("e") ? v + "d" : /[^aeiou]y$/.test(v) ? v.slice(0, -1) + "ied" : v + "ed");
const ingOf = v => DOUBLE.has(v) ? v + v.slice(-1) + "ing" : /[^e]e$/.test(v) ? v.slice(0, -1) + "ing" : v + "ing";
const FORMS = new Map([["learnt", { base: "learn", form: "past" }]]);
for (const v of VERBS) {
  FORMS.set(pastOf(v), { base: v, form: "past" });
  FORMS.set(ingOf(v), { base: v, form: "ing" });
  FORMS.set(v, { base: v, form: "base" });
}

// The verb a note starts with, in the form its section needs, or null to add a lead-in.
function leadVerb(word, kind) {
  const f = FORMS.get(word.toLowerCase());
  if (!f) return null;
  if (kind === "plans") return f.base;
  if (kind === "progress") return ingOf(f.base);
  if (kind === "topics") return STUDY.has(f.base) ? pastOf(f.base) : null;
  if (f.form === "base" && NOUNISH.has(f.base)) return null;
  return pastOf(f.base);
}
const LEAD_IN = { tasks: "worked on ", topics: "studied ", plans: "continue work on ", progress: "", blockers: "" };
// After "continue" a bare thing gets "work on the", but "continue studying X" or "continue with X" stays as written.
const bareObject = rest => !FORMS.has(rest.split(" ")[0].toLowerCase()) && !/^(?:on|with|to|the|a|an|my|our|work)\b/i.test(rest);

export function polish(line, kind) {
  let s = line.trim().replace(/^[-•*]\s*/, "");
  if (!s) return null;
  s = s.replace(/^tomorrow\s+/i, "");
  s = s.replace(/criteria query/i, "criteria API queries").replace(/duplicate result\b/i, "duplicate query results");
  const rules = [
    [/^continue (.+)/i, "continue work on the $1", m => bareObject(m[1])],
    [/^continued (.+)/i, "continued work on the $1", m => bareObject(m[1])],
    [/^still having (an )?issues? with (.+)/i, "investigating an issue with the $2", () => true],
    [/^finish (.+)/i, "finish the $1", m => bareObject(m[1])]
  ];
  for (const [re, rep, when] of rules) { const m = s.match(re); if (m && when(m)) { s = s.replace(re, rep); break; } }
  const [first, ...rest] = s.split(" ");
  const verb = leadVerb(first, kind);
  s = verb ? [verb, ...rest].join(" ") : (LEAD_IN[kind] ?? "") + s;
  s = s.split(" ").map(w => dict[w.toLowerCase()] || w).join(" ").replace(/API API/g, "API");
  s = s.charAt(0).toUpperCase() + s.slice(1);
  if (!/[.!?]$/.test(s)) s += ".";
  return s;
}

export const lines = (text, kind) => (text || "").split(/\r?\n/).map(l => polish(l, kind)).filter(Boolean);

const itemLines = text => (text || "").split(/\r?\n/).map(l => l.trim().replace(/^[-•*]\s*/, "")).filter(Boolean);
// The raw items behind buildVars: item N here becomes sentence N there.
export const noteItems = n => ({
  tasks: [...itemLines(n.work), ...itemLines(n.progress)],
  topics: itemLines(n.topics),
  weekly_plans: itemLines(n.tomorrow),
  blockers: itemLines(n.blockers)
});

export function buildVars(n, user, date, dateFormat) {
  const plans = lines(n.tomorrow, "plans");
  return {
    date: formatDate(date, dateFormat), name: user.name, role: user.role,
    tasks: [
      ...lines(n.work, "tasks"),
      ...lines(n.progress, "progress").map(s => /^(?:Investigating|Continu)/.test(s) ? s : "Still working on: " + s.charAt(0).toLowerCase() + s.slice(1))
    ],
    topics: lines(n.topics, "topics"),
    weekly_plans: plans, tomorrow: plans,
    blockers: lines(n.blockers, "blockers")
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
    const text = l.replace(/\{(\w+)\}/g, (m, k) => Array.isArray(vars[k]) ? vars[k].join(", ") : (vars[k] ?? m)).trim();
    // A variable left empty, such as a name not yet set in Settings, leaves no blank line.
    if (text) blocks.push({ type: "text", text });
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
