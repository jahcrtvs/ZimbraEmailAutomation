import { pullCommand } from "../shared/ai.js";
import { parseReply } from "./reply.js";

export const LOCAL_TIMEOUT_MS = 120000;
const STATUS_TIMEOUT_MS = 5000;

const fail = (code, message) => Object.assign(new Error(message), { code });
const base = u => String(u || "").trim().replace(/\/+$/, "");

async function attempt(fetchImpl, local, text) {
  let res;
  try {
    res = await fetchImpl(base(local.baseUrl) + "/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: local.model, messages: [{ role: "user", content: text }], temperature: 0.2, response_format: { type: "json_object" } }),
      signal: AbortSignal.timeout(LOCAL_TIMEOUT_MS)
    });
  } catch (e) {
    if (e?.name === "TimeoutError" || e?.name === "AbortError") throw fail("TIMEOUT", "The local model took too long to answer.");
    throw fail("UNREACHABLE", `Could not reach the local AI server at ${local.baseUrl}.`);
  }
  const raw = await res.text();
  if (!res.ok) {
    if (res.status === 404 && /not found|pull/i.test(raw)) throw fail("MODEL_MISSING", `The model "${local.model}" is not installed. Run: ${pullCommand(local.model)}`);
    throw fail("SERVER", `The local AI server answered ${res.status} ${res.statusText}.`);
  }
  let body;
  try { body = JSON.parse(raw); } catch { throw fail("BAD_REPLY", "The local AI server sent something that is not JSON."); }
  const reply = body?.choices?.[0]?.message?.content;
  if (typeof reply !== "string") throw fail("BAD_REPLY", "The local model returned an empty reply.");
  return reply;
}

export async function runLocal({ fetchImpl = fetch, local, text }) {
  for (let i = 0; i < 2; i++) {
    const reply = await attempt(fetchImpl, local, text);
    try { return parseReply(reply, "The local model"); } catch { /* ask once more */ }
  }
  throw fail("BAD_REPLY", "The local model did not return a usable reply.");
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
