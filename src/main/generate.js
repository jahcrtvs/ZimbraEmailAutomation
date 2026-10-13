import { buildVars, render } from "../shared/report.js";
import { fromISODate } from "../shared/time.js";
import { sanitizeNotes, restore } from "../shared/sanitize.js";
import { PROVIDER_NAMES } from "../shared/ai.js";
import { PROMPT, notesText, parseReply } from "./reply.js";
import { runLocal, localStatus } from "./localai.js";

export const MODEL_IDS = { flash: "gemini-3.7-flash", pro: "gemini-pro-latest" };
// Unverified against Groq's current model list.
export const GROQ_MODEL = "openai/gpt-oss-120b";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const ENDPOINT = id => `https://generativelanguage.googleapis.com/v1beta/models/${id}:generateContent`;

const RETRY_STATUS = new Set([429, 500, 503]);
const RETRY_WAITS = [1000, 3000];
const realSleep = ms => new Promise(r => setTimeout(r, ms));

const CLOUD = {
  gemini: {
    request: (key, model, text) => ({
      url: ENDPOINT(MODEL_IDS[model] || MODEL_IDS.flash),
      headers: { "x-goog-api-key": key },
      body: { contents: [{ parts: [{ text }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.2 } }
    }),
    reply: body => body?.candidates?.[0]?.content?.parts?.[0]?.text
  },
  groq: {
    request: (key, _model, text) => ({
      url: GROQ_ENDPOINT,
      headers: { Authorization: `Bearer ${key}` },
      body: { model: GROQ_MODEL, messages: [{ role: "user", content: text }], temperature: 0.2, response_format: { type: "json_object" } }
    }),
    reply: body => body?.choices?.[0]?.message?.content
  }
};

const termsFor = (profile, ai) => [
  profile?.name, ...String(profile?.name || "").split(/\s+/), ...String(ai.privacyTerms || "").split(/[,\n]/)
].filter(Boolean);

export function createGenerator({ getKey, fetchImpl = fetch, sleep = realSleep, audit = { record() {} } }) {
  async function attempt(provider, key, model, text) {
    const P = CLOUD[provider], name = PROVIDER_NAMES[provider];
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
    try { body = JSON.parse(raw); } catch { throw new Error(`${name} returned an unexpected response: not valid JSON`); }
    const reply = P.reply(body);
    if (typeof reply !== "string") throw new Error(`${name} returned an unexpected response: empty`);
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

  const cloudFor = ai => { const p = ai.fallback?.provider; return CLOUD[p] && getKey(p) ? p : null; };

  async function generate({ notes, template, profile, date, dateFormat, ai, mode = "auto" }) {
    const vars = buildVars(notes, profile, fromISODate(date), dateFormat);
    const ok = (parsed, source) => ({ status: "ok", source, note: null, blocks: render(template, { ...vars, ...parsed, tomorrow: parsed.weekly_plans }) });
    const plain = note => ({ status: "ok", source: "template", note, blocks: render(template, vars) });
    if (mode === "template") return plain("You chose not to send your notes to a cloud service.");

    let failure = null;
    if (mode === "auto") {
      try { return ok(await runLocal({ fetchImpl, local: ai.local, text: PROMPT + notesText(notes) }), "local"); }
      catch (e) { failure = { code: e.code || "UNKNOWN", message: e.message }; }
    }
    const why = failure ? failure.message + " " : "";
    const provider = cloudFor(ai);
    if (!provider) return plain(why + "No cloud fallback is set up, so the built-in text rules were used.");

    const s = sanitizeNotes(notes, { terms: termsFor(profile, ai) });
    if (s.blocked) return plain(why + s.blocked + " The built-in text rules were used.");
    const text = notesText(s.notes);
    if (mode === "auto" && !ai.fallback.auto) return { status: "needs-consent", provider, failure, preview: { text, chars: text.length } };

    const name = PROVIDER_NAMES[provider];
    try {
      audit.record({ provider, reason: failure ? failure.code : "user-requested", chars: text.length });
      const parsed = parseReply(await call(provider, ai.geminiModel, PROMPT + text), name);
      for (const k of Object.keys(parsed)) parsed[k] = parsed[k].map(x => restore(x, s.map));
      return ok(parsed, provider);
    } catch (e) {
      return plain(`${name} failed: ${e.message} The built-in text rules were used.`);
    }
  }

  return {
    generate,
    localStatus: local => localStatus({ fetchImpl, local }),
    async testConnection(provider, geminiModel = "flash") {
      if (!CLOUD[provider]) throw new Error("Unknown provider.");
      if (!getKey(provider)) throw new Error("No API key saved.");
      await call(provider, geminiModel, 'Reply with the single word "ok" in a JSON object.');
      return true;
    }
  };
}
