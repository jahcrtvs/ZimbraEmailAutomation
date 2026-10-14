import { pullCommand, isCloudModel, isLoopbackUrl } from "../shared/ai.js";
import { parseReply, SECTION_KEYS } from "./reply.js";
import { createSentenceScanner } from "./jsonStream.js";

export const LOCAL_TIMEOUT_MS = 120000;
export const KEEP_ALIVE = "30m";
const STATUS_TIMEOUT_MS = 5000;

const fail = (code, message) => Object.assign(new Error(message), { code });
const base = u => String(u || "").trim().replace(/\/+$/, "");
const timedOut = e => e?.name === "TimeoutError" || e?.name === "AbortError";

// With counts, each array must hold exactly one sentence per note item, so sentence N is item N.
export function replySchema(counts) {
  const arr = k => counts ? { type: "array", items: { type: "string" }, minItems: counts[k], maxItems: counts[k] } : { type: "array", items: { type: "string" } };
  return { type: "object", properties: Object.fromEntries(SECTION_KEYS.map(k => [k, arr(k)])), required: SECTION_KEYS, additionalProperties: false };
}

async function readStream(res, onSentence) {
  const scanner = createSentenceScanner(onSentence);
  const reader = res.body.getReader(), dec = new TextDecoder();
  let pending = "", text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      pending += dec.decode(value, { stream: true });
      let nl;
      while ((nl = pending.indexOf("\n")) >= 0) {
        const line = pending.slice(0, nl).trim();
        pending = pending.slice(nl + 1);
        if (!line.startsWith("data:") || line.slice(5).trim() === "[DONE]") continue;
        let delta;
        try { delta = JSON.parse(line.slice(5)).choices?.[0]?.delta?.content; } catch { continue; }
        if (typeof delta === "string") { text += delta; scanner.push(delta); }
      }
    }
  } catch (e) {
    throw Object.assign(timedOut(e) ? fail("TIMEOUT", "The local model took too long to answer.") : fail("STREAM", "The connection to the local AI server dropped."), { partial: scanner.result() });
  }
  return text;
}

async function attempt(fetchImpl, local, { system, shots = [], text, counts, onSentence }) {
  const total = counts ? SECTION_KEYS.reduce((n, k) => n + counts[k], 0) : 0;
  const body = {
    model: local.model,
    messages: [...(system ? [{ role: "system", content: system }] : []), ...shots, { role: "user", content: text }],
    temperature: 0.2,
    max_tokens: counts ? 80 + 45 * total : 1024,
    keep_alive: KEEP_ALIVE,
    response_format: { type: "json_schema", json_schema: { name: "digest", strict: true, schema: replySchema(counts) } }
  };
  if (onSentence) body.stream = true;
  let res;
  try {
    res = await fetchImpl(base(local.baseUrl) + "/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(LOCAL_TIMEOUT_MS)
    });
  } catch (e) {
    if (timedOut(e)) throw fail("TIMEOUT", "The local model took too long to answer.");
    throw fail("UNREACHABLE", `Could not reach the local AI server at ${local.baseUrl}.`);
  }
  if (!res.ok) {
    const raw = await res.text();
    if (res.status === 404 && /not found|pull/i.test(raw)) throw fail("MODEL_MISSING", `The model "${local.model}" is not installed. Run: ${pullCommand(local.model)}`);
    if (res.status === 400) throw fail("SERVER", "The local AI server rejected the request (400). Update Ollama to the latest version.");
    throw fail("SERVER", `The local AI server answered ${res.status} ${res.statusText}.`);
  }
  if (onSentence) return readStream(res, onSentence);
  const raw = await res.text();
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw fail("BAD_REPLY", "The local AI server sent something that is not JSON."); }
  const reply = parsed?.choices?.[0]?.message?.content;
  if (typeof reply !== "string") throw fail("BAD_REPLY", "The local model returned an empty reply.");
  return reply;
}

const hasSentences = r => SECTION_KEYS.some(k => r[k].length);

export async function runLocal({ fetchImpl = fetch, local, text, system, shots, counts, onSentence }) {
  for (let i = 0; i < 2; i++) {
    let reply;
    try { reply = await attempt(fetchImpl, local, { system, shots, text, counts, onSentence: i === 0 ? onSentence : undefined }); }
    catch (e) {
      if (e.partial && hasSentences(e.partial)) return { ...e.partial, partial: true };
      throw e;
    }
    try { return parseReply(reply, "The local model"); } catch { /* ask once more, without streaming */ }
  }
  throw fail("BAD_REPLY", "The local model did not return a usable reply.");
}

// Loads the model into memory ahead of the first report. Best effort: never throws.
export async function warmUp({ fetchImpl = fetch, local }) {
  if (isCloudModel(local?.model) || !isLoopbackUrl(local?.baseUrl)) return;
  try {
    await fetchImpl(base(local.baseUrl) + "/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: local.model, messages: [{ role: "user", content: "ok" }], max_tokens: 1, keep_alive: KEEP_ALIVE }),
      signal: AbortSignal.timeout(LOCAL_TIMEOUT_MS)
    });
  } catch { /* the first real report will load the model instead */ }
}

export async function localStatus({ fetchImpl = fetch, local }) {
  let res;
  try { res = await fetchImpl(base(local.baseUrl) + "/models", { signal: AbortSignal.timeout(STATUS_TIMEOUT_MS) }); }
  catch { return { state: "no-server", detail: `Nothing is answering at ${local.baseUrl}. Install Ollama from https://ollama.com/download and make sure it is running.` }; }
  if (!res.ok) return { state: "no-server", detail: `The server at ${local.baseUrl} answered ${res.status}. Check the address in Settings.` };
  let ids = [];
  try { ids = (JSON.parse(await res.text()).data || []).map(m => m.id); } catch { /* treated as no models */ }
  const want = String(local.model || "").trim();
  if (ids.some(id => id === want || (!want.includes(":") && id === want + ":latest"))) return { state: "ready" };
  return { state: "no-model", detail: `The model "${want}" is not installed.`, command: pullCommand(want) };
}
