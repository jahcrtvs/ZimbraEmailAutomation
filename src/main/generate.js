import { buildVars, render } from "../shared/report.js";
import { fromISODate } from "../shared/time.js";

export const MODEL_IDS = { flash: "gemini-3.7-flash", pro: "gemini-pro-latest" };
// Unverified against Groq's current model list.
export const GROQ_MODEL = "openai/gpt-oss-120b";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const ENDPOINT =id => `https://generativelanguage.googleapis.com/v1beta/models/${id}:generateContent`;

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

function parseReply(text, name = "Gemini") {
  const cleaned = String(text).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let obj;
  try { obj = JSON.parse(cleaned); } catch { throw new Error(`${name} returned an unexpected response: not valid JSON`); }
  const out = {};
  for (const k of ["tasks", "topics", "weekly_plans", "blockers"]) {
    const v = obj?.[k] ?? [];
    if (!Array.isArray(v) || v.some(x => typeof x !== "string")) throw new Error(`${name} returned an unexpected response: "${k}" must be a list of text`);
    out[k] = v.map(x => x.trim()).filter(Boolean);
  }
  if (!Object.values(out).some(a => a.length)) throw new Error(`${name} returned an unexpected response: no items`);
  return out;
}

const RETRY_STATUS = new Set([429, 500, 503]);
const RETRY_WAITS = [1000, 3000];
const realSleep = ms => new Promise(r => setTimeout(r, ms));

const PROVIDERS = {
  gemini: {
    name: "Gemini",
    request: (key, model, text) => ({
      url: ENDPOINT(MODEL_IDS[model] || MODEL_IDS.flash),
      headers: { "x-goog-api-key": key },
      body: { contents: [{ parts: [{ text }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.2 } }
    }),
    reply: body => body?.candidates?.[0]?.content?.parts?.[0]?.text
  },
  groq: {
    name: "Groq",
    request: (key, _model, text) => ({
      url: GROQ_ENDPOINT,
      headers: { Authorization: `Bearer ${key}` },
      body: { model: GROQ_MODEL, messages: [{ role: "user", content: text }], temperature: 0.2, response_format: { type: "json_object" } }
    }),
    reply: body => body?.choices?.[0]?.message?.content
  }
};

export function createGenerator({ getKey, fetchImpl = fetch, sleep = realSleep }) {
  const providerOf = p => (PROVIDERS[p] ? p : "gemini");

  async function attempt(provider, key, model, text) {
    const P = PROVIDERS[provider];
    const req = P.request(key, model, text);
    let res;
    try {
      res = await fetchImpl(req.url, {
        method: "POST",
        headers: { "content-type": "application/json", ...req.headers },
        body: JSON.stringify(req.body),
        signal: AbortSignal.timeout(30000)
      });
    } catch (e) { throw Object.assign(new Error(String(e.message || e)), { transient: true }); }
    const raw = await res.text();
    if (!res.ok) throw Object.assign(new Error(`${res.status} ${res.statusText}: ${raw.slice(0, 200)}`), { transient: RETRY_STATUS.has(res.status) });
    let body;
    try { body = JSON.parse(raw); } catch { throw new Error(`${P.name} returned an unexpected response: not valid JSON`); }
    const reply = P.reply(body);
    if (typeof reply !== "string") throw new Error(`${P.name} returned an unexpected response: empty`);
    return reply;
  }

  async function call(provider, model, text) {
    const key = getKey(provider);
    if (!key) throw new Error("No API key saved.");
    for (let i = 0; ; i++) {
      try { return await attempt(provider, key, model, text); }
      catch (e) {
        if (!e.transient || i >= RETRY_WAITS.length) throw e;
        await sleep(RETRY_WAITS[i]);
      }
    }
  }

  return {
    async generate({ notes, template, profile, date, model, provider }) {
      const prov = providerOf(provider);
      const d = fromISODate(date);
      const local = buildVars(notes, profile, d);
      if (!getKey(prov)) return render(template, local);
      const ai = parseReply(await call(prov, model, PROMPT + notesText(notes)), PROVIDERS[prov].name);
      return render(template, { ...local, ...ai, tomorrow: ai.weekly_plans });
    },
    async testConnection(model, provider) {
      const prov = providerOf(provider);
      if (!getKey(prov)) throw new Error("No API key saved.");
      await call(prov, model, 'Reply with the single word "ok" in a JSON object.');
      return true;
    }
  };
}
