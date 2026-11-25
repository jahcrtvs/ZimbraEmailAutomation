import { buildVars, render, noteItems, EMPTY_NOTES } from "../shared/report.js";
import { builtInDraft } from "../shared/slides.js";
import { fromISODate } from "../shared/time.js";
import { sanitizeNotes, restore } from "../shared/sanitize.js";
import { PROVIDER_NAMES, isCloudModel, isLoopbackUrl } from "../shared/ai.js";
import { PROMPT, LOCAL_PROMPT, notesText, parseReply, exampleExchange, SECTION_KEYS } from "./reply.js";
import { runLocal, localStatus, warmUp } from "./localai.js";
import { applyChecks } from "./check.js";
import { pickExamples } from "./examples.js";
import { SLIDE_KEYS, SLIDE_SCHEMA, SORT_PROMPT, LOCAL_SORT_PROMPT, deckText, factsOf, checkItems } from "./slidesort.js";

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

const KEEP_PLACEHOLDERS = `- Keep any text in square brackets, such as [EMAIL_1] or [NAME_2], exactly as written.\n`;

const termsFor =(profile, ai) => [
  profile?.name, ...String(profile?.name || "").split(/\s+/), ...String(ai.privacyTerms || "").split(/[,\n]/)
].filter(Boolean);

export function createGenerator({ getKey, fetchImpl = fetch, sleep = realSleep, audit = { record() {} }, startLocal = async () => false }) {
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

  // Ollama is installed but not running: start it and ask once more.
  async function localReply(ai, request) {
    try { return await runLocal(request); }
    catch (e) {
      if (e.code !== "UNREACHABLE" || !(await startLocal(ai.local))) throw e;
      return runLocal(request);
    }
  }

  const cloudFor = ai => { const p = ai.fallback?.provider; return CLOUD[p] && getKey(p) ? p : null; };

  async function generate({ notes, template, profile, date, dateFormat, ai, mode = "auto", history = [], onProgress }) {
    const vars = buildVars(notes, profile, fromISODate(date), dateFormat);
    const ok = (parsed, source) => ({ status: "ok", source, note: null, blocks: render(template, { ...vars, ...parsed, tomorrow: parsed.weekly_plans }) });
    const plain = note => ({ status: "ok", source: "template", note, blocks: render(template, vars) });
    if (mode === "template") return plain("You chose not to send your notes to a cloud service.");

    let failure = null;
    if (mode === "auto") {
      try {
        const items = noteItems(notes);
        const counts = Object.fromEntries(SECTION_KEYS.map(k => [k, items[k].length]));
        // Past reports are the user's own text: show them only to a model running on this computer.
        const own = isLoopbackUrl(ai.local.baseUrl) && !isCloudModel(ai.local.model);
        // A server elsewhere gets the notes the way a cloud provider would: sanitised, or not at all.
        const s = own ? null : sanitizeNotes(notes, { terms: termsFor(profile, ai) });
        if (s?.blocked) return plain(s.blocked.replace("a cloud service", "the AI server in Settings, which is not on this computer") + " The built-in text rules were used.");
        const back = t => s ? restore(t, s.map) : t;
        const maxTokens = 80 + SECTION_KEYS.flatMap(k => items[k]).reduce((n, it) => n + 50 + Math.ceil(it.length / 3), 0);
        const request = {
          fetchImpl, local: ai.local, counts, maxTokens,
          system: s ? LOCAL_PROMPT + KEEP_PLACEHOLDERS : LOCAL_PROMPT,
          shots: exampleExchange(pickExamples({ history: own ? history : [], items })),
          text: "Notes:\n" + notesText(s ? s.notes : notes),
          onSentence: onProgress && ((section, sentence) => onProgress({ section, sentence: back(sentence) }))
        };
        const { partial, ...raw } = await localReply(ai, request);
        for (const k of Object.keys(raw)) raw[k] = raw[k].map(back);
        const { parsed, fallbacks, total } = applyChecks({ items, parsed: raw, builtIn: vars, partial: !!partial });
        if (total && fallbacks === total) return plain("The local AI's sentences could not be used, so the built-in text rules were used.");
        const note = fallbacks ? `${fallbacks} of ${total} sentences use the built-in rules because the local AI left them out or added details your notes did not mention.` : null;
        return { ...ok(parsed, "local"), note };
      } catch (e) { failure = { code: e.code || "UNKNOWN", message: e.message }; }
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

  // Sorts the text of a slide deck into a draft of the five note fields. Same order and consent rules as generate.
  // Today's Work is always written by builtInDraft: the deck cannot say what the user did with it.
  async function sortSlides({ deck, role, fileName = "", profile, ai, mode = "auto" }) {
    const builtIn = builtInDraft(deck, role, fileName);
    const plain = note => ({ status: "ok", source: "template", note, draft: builtIn });
    if (mode === "template") return plain("You chose not to send the slides to a cloud service.");

    const text = deckText(deck), facts = factsOf(deck);
    // The sanitiser works on note fields, so the deck text goes in as one of them.
    const asNotes = t => ({ ...EMPTY_NOTES, topics: t });
    const ofSlides = blocked => blocked.replace(/^Your notes/, "The slides");
    const accept = (parsed, source, back) => {
      const { items, total, dropped } = checkItems(Object.fromEntries(SLIDE_KEYS.map(k => [k, (parsed[k] || []).map(back)])), facts, deck.title);
      if (!SLIDE_KEYS.some(k => items[k].length)) return plain("The AI's items could not be used, so the built-in text rules were used.");
      const note = dropped ? `${dropped} of ${total} items were left out because they added details the slides did not mention.` : null;
      return { status: "ok", source, note, draft: { ...builtIn, ...items, topics: items.topics.length ? items.topics : builtIn.topics } };
    };

    let failure = null;
    if (mode === "auto") {
      try {
        const own = isLoopbackUrl(ai.local.baseUrl) && !isCloudModel(ai.local.model);
        const s = own ? null : sanitizeNotes(asNotes(text), { terms: termsFor(profile, ai) });
        if (s?.blocked) return plain(ofSlides(s.blocked).replace("a cloud service", "the AI server in Settings, which is not on this computer") + " The built-in text rules were used.");
        const request = {
          fetchImpl, local: ai.local, maxTokens: 600, schema: SLIDE_SCHEMA,
          parse: r => parseReply(r, "The local model", SLIDE_KEYS),
          system: s ? LOCAL_SORT_PROMPT + KEEP_PLACEHOLDERS : LOCAL_SORT_PROMPT,
          text: "Slides:\n" + (s ? s.notes.topics : text)
        };
        return accept(await localReply(ai, request), "local", t => s ? restore(t, s.map) : t);
      } catch (e) { failure = { code: e.code || "UNKNOWN", message: e.message }; }
    }

    const why = failure ? failure.message + " " : "";
    const provider = cloudFor(ai);
    if (!provider) return plain(why + "No cloud fallback is set up, so the built-in text rules were used.");
    const s = sanitizeNotes(asNotes(text), { terms: termsFor(profile, ai) });
    if (s.blocked) return plain(why + ofSlides(s.blocked) + " The built-in text rules were used.");
    const sent = s.notes.topics;
    if (mode === "auto" && !ai.fallback.auto) return { status: "needs-consent", provider, failure, preview: { text: sent, chars: sent.length } };

    const name = PROVIDER_NAMES[provider];
    try {
      audit.record({ provider, reason: failure ? failure.code : "user-requested", chars: sent.length });
      const parsed = parseReply(await call(provider, ai.geminiModel, SORT_PROMPT + sent), name, SLIDE_KEYS);
      return accept(parsed, provider, t => restore(t, s.map));
    } catch (e) {
      return plain(`${name} failed: ${e.message} The built-in text rules were used.`);
    }
  }

  return {
    generate,
    sortSlides,
    localStatus: local => localStatus({ fetchImpl, local }),
    warmUp: async local => { await startLocal(local); await warmUp({ fetchImpl, local }); },
    async testConnection(provider, geminiModel = "flash") {
      if (!CLOUD[provider]) throw new Error("Unknown provider.");
      if (!getKey(provider)) throw new Error("No API key saved.");
      await call(provider, geminiModel, 'Reply with the single word "ok" in a JSON object.');
      return true;
    }
  };
}
