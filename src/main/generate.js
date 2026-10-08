import { buildVars, render } from "../shared/report.js";
import { fromISODate } from "../shared/time.js";

export const MODEL_IDS = { flash: "gemini-flash-latest", pro: "gemini-pro-latest" };
const ENDPOINT = id => `https://generativelanguage.googleapis.com/v1beta/models/${id}:generateContent`;

const PROMPT = `You turn rough daily work notes into short report bullets for a manager.
Rules:
- One sentence per item, ending with a period.
- Work done: past tense ("Worked on ...", "Fixed ..."). Study topics: "Studied ...". Plans: imperative ("Continue work on ...").
- Fix capitalisation of technical names (Hibernate, HQL, API, SQL, JDBC, ID).
- Never invent facts. Never merge unrelated items. Skip empty input.
Return ONLY JSON with exactly these keys, each an array of strings:
{"tasks":[],"topics":[],"weekly_plans":[],"blockers":[]}
- tasks: from "Today's Work" plus anything under "Still Working On" (phrase those as "Still working on: ...", or "Investigating ..." / "Continued ...").
- topics: from "Topics / Lessons".
- weekly_plans: from "Tomorrow".
- blockers: from "Blockers".

Notes:
`;

const labels = { work: "Today's Work", topics: "Topics / Lessons", progress: "Still Working On", blockers: "Blockers", tomorrow: "Tomorrow" };
const notesText = n => Object.keys(labels).map(k => `${labels[k]}:\n${(n[k] || "").trim() || "(none)"}`).join("\n\n");

function parseReply(text) {
  const cleaned = String(text).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let obj;
  try { obj = JSON.parse(cleaned); } catch { throw new Error("Gemini returned an unexpected response: not valid JSON"); }
  const out = {};
  for (const k of ["tasks", "topics", "weekly_plans", "blockers"]) {
    const v = obj?.[k] ?? [];
    if (!Array.isArray(v) || v.some(x => typeof x !== "string")) throw new Error(`Gemini returned an unexpected response: "${k}" must be a list of text`);
    out[k] = v.map(x => x.trim()).filter(Boolean);
  }
  if (!Object.values(out).some(a => a.length)) throw new Error("Gemini returned an unexpected response: no items");
  return out;
}

export function createGenerator({ getKey, fetchImpl = fetch }) {
  async function call(model, text) {
    const key = getKey();
    if (!key) throw new Error("No API key saved.");
    let res;
    try {
      res = await fetchImpl(ENDPOINT(MODEL_IDS[model] || MODEL_IDS.flash), {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ parts: [{ text }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.2 } }),
        signal: AbortSignal.timeout(30000)
      });
    } catch (e) { throw new Error(String(e.message || e)); }
    const raw = await res.text();
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${raw.slice(0, 200)}`);
    let body;
    try { body = JSON.parse(raw); } catch { throw new Error("Gemini returned an unexpected response: not valid JSON"); }
    const reply = body?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof reply !== "string") throw new Error("Gemini returned an unexpected response: empty");
    return reply;
  }

  return {
    async generate({ notes, template, profile, date, model }) {
      const d = fromISODate(date);
      const local = buildVars(notes, profile, d);
      if (!getKey()) return render(template, local);
      const ai = parseReply(await call(model, PROMPT + notesText(notes)));
      return render(template, { ...local, ...ai, tomorrow: ai.weekly_plans });
    },
    async testConnection(model) {
      if (!getKey()) throw new Error("No API key saved.");
      await call(model, 'Reply with the single word "ok".');
      return true;
    }
  };
}
