import { describe, it, expect } from "vitest";
import { runLocal, localStatus, warmUp, KEEP_ALIVE } from "../../../src/main/localai.js";

const local = { baseUrl: "http://localhost:11434/v1/", model: "qwen2.5:3b-instruct" };
const res = (body, status = 200, statusText = "OK") => ({ ok: status < 400, status, statusText, text: async () => typeof body === "string" ? body : JSON.stringify(body) });
const chat = content => res({ choices: [{ message: { content: typeof content === "string" ? content : JSON.stringify(content) } }] });
const good = { tasks: ["Did A."], topics: [], weekly_plans: [], blockers: [] };
const seq = (...items) => {
  const calls = []; let i = 0;
  const f = async (url, init) => { calls.push({ url, init }); const x = items[Math.min(i++, items.length - 1)]; if (x instanceof Error) throw x; return x; };
  f.calls = calls; return f;
};

describe("runLocal", () => {
  it("posts to chat/completions without a key, asking for JSON, and trims the trailing slash", async () => {
    const f = seq(chat(good));
    const out = await runLocal({ fetchImpl: f, local, text: "PROMPT" });
    expect(out.tasks).toEqual(["Did A."]);
    const { url, init } = f.calls[0];
    expect(url).toBe("http://localhost:11434/v1/chat/completions");
    expect(Object.keys(init.headers).map(k => k.toLowerCase())).not.toContain("authorization");
    const body = JSON.parse(init.body);
    expect(body.model).toBe("qwen2.5:3b-instruct");
    expect(body.temperature).toBe(0.2);
    expect(body.response_format.type).toBe("json_schema");
    expect(body.messages).toEqual([{ role: "user", content: "PROMPT" }]);
  });
  it("accepts JSON in a code fence or surrounded by prose", async () => {
    const fenced = await runLocal({ fetchImpl: seq(chat('```json\n{"tasks":["X."],"topics":[],"weekly_plans":[],"blockers":[]}\n```')), local, text: "t" });
    expect(fenced.tasks).toEqual(["X."]);
    const prose = await runLocal({ fetchImpl: seq(chat('Here you go: {"tasks":["Y."],"topics":[],"weekly_plans":[],"blockers":[]} Hope that helps!')), local, text: "t" });
    expect(prose.tasks).toEqual(["Y."]);
  });
  it("asks once more when the reply is not usable, then succeeds", async () => {
    const f = seq(chat("nope"), chat(good));
    expect((await runLocal({ fetchImpl: f, local, text: "t" })).tasks).toEqual(["Did A."]);
    expect(f.calls).toHaveLength(2);
  });
  it("fails with BAD_REPLY after two unusable replies, including an empty result", async () => {
    for (const bad of ["not json", { tasks: [], topics: [], weekly_plans: [], blockers: [] }, { tasks: "text" }]) {
      const f = seq(chat(bad));
      await expect(runLocal({ fetchImpl: f, local, text: "t" })).rejects.toMatchObject({ code: "BAD_REPLY" });
      expect(f.calls).toHaveLength(2);
    }
  });
  it("classifies an unreachable server", async () => {
    const f = seq(new TypeError("fetch failed"));
    await expect(runLocal({ fetchImpl: f, local, text: "t" })).rejects.toMatchObject({ code: "UNREACHABLE", message: expect.stringContaining("http://localhost:11434/v1/") });
    expect(f.calls).toHaveLength(1);
  });
  it("classifies a timeout", async () => {
    const e = Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });
    await expect(runLocal({ fetchImpl: seq(e), local, text: "t" })).rejects.toMatchObject({ code: "TIMEOUT" });
  });
  it("classifies a missing model and tells the user how to install it", async () => {
    const f = seq(res('model "qwen2.5:3b-instruct" not found, try pulling it first', 404, "Not Found"));
    await expect(runLocal({ fetchImpl: f, local, text: "t" })).rejects.toMatchObject({ code: "MODEL_MISSING", message: expect.stringContaining("ollama pull qwen2.5:3b-instruct") });
  });
  it("classifies other HTTP errors as SERVER without retrying", async () => {
    const f = seq(res("boom", 500, "Internal Server Error"));
    await expect(runLocal({ fetchImpl: f, local, text: "t" })).rejects.toMatchObject({ code: "SERVER", message: expect.stringContaining("500") });
    expect(f.calls).toHaveLength(1);
  });
});

const enc = new TextEncoder();
// A streaming reply: strings become SSE deltas, an Error makes the connection fail at that point.
const sse = (...parts) => {
  const queue = parts.map(p => p instanceof Error ? p : enc.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: p } }] })}\n\n`));
  let i = 0;
  return { ok: true, status: 200, statusText: "OK", body: { getReader: () => ({ read: async () => {
    if (i >= queue.length) return { done: true };
    const x = queue[i++]; if (x instanceof Error) throw x; return { done: false, value: x };
  } }) } };
};
const counts = { tasks: 2, topics: 0, weekly_plans: 0, blockers: 0 };

describe("runLocal request shape", () => {
  it("asks for a schema-valid reply with exactly one sentence per item, a token cap and keep_alive", async () => {
    const f = seq(chat({ tasks: ["A.", "B."], topics: [], weekly_plans: [], blockers: [] }));
    await runLocal({ fetchImpl: f, local, text: "t", counts });
    const body = JSON.parse(f.calls[0].init.body);
    expect(body.response_format.type).toBe("json_schema");
    const props = body.response_format.json_schema.schema.properties;
    expect(props.tasks).toEqual({ type: "array", items: { type: "string" }, minItems: 2, maxItems: 2 });
    expect(props.topics).toMatchObject({ minItems: 0, maxItems: 0 });
    expect(body.max_tokens).toBe(80 + 45 * 2);
    expect(body.keep_alive).toBe(KEEP_ALIVE);
    expect(body.stream).toBeUndefined();
  });
  it("sends the instructions as a system message and the notes as the user message", async () => {
    const f = seq(chat(good));
    await runLocal({ fetchImpl: f, local, system: "RULES", text: "NOTES" });
    expect(JSON.parse(f.calls[0].init.body).messages).toEqual([{ role: "system", content: "RULES" }, { role: "user", content: "NOTES" }]);
  });
  it("puts example turns between the instructions and the notes", async () => {
    const f = seq(chat(good));
    const shots = [{ role: "user", content: "EX NOTES" }, { role: "assistant", content: "EX REPLY" }];
    await runLocal({ fetchImpl: f, local, system: "RULES", shots, text: "NOTES" });
    expect(JSON.parse(f.calls[0].init.body).messages).toEqual([{ role: "system", content: "RULES" }, ...shots, { role: "user", content: "NOTES" }]);
  });
  it("tells the user to update Ollama when the server rejects the request", async () => {
    const f = seq(res("bad format", 400, "Bad Request"));
    await expect(runLocal({ fetchImpl: f, local, text: "t" })).rejects.toMatchObject({ code: "SERVER", message: expect.stringContaining("Update Ollama") });
    expect(f.calls).toHaveLength(1);
  });
});

describe("runLocal streaming", () => {
  it("reports each sentence as it is written and returns the full reply", async () => {
    const seen = [];
    const f = seq(sse('{"tasks":["Did', ' A."],"topics":[],', '"weekly_plans":[],"blockers":[]}'));
    const out = await runLocal({ fetchImpl: f, local, text: "t", onSentence: (...a) => seen.push(a) });
    expect(out).toEqual({ tasks: ["Did A."], topics: [], weekly_plans: [], blockers: [] });
    expect(seen).toEqual([["tasks", "Did A.", 0]]);
    expect(JSON.parse(f.calls[0].init.body).stream).toBe(true);
  });
  it("keeps the sentences received when the connection drops, and marks the result partial", async () => {
    const f = seq(sse('{"tasks":["Did A.","Un', new Error("socket closed")));
    const out = await runLocal({ fetchImpl: f, local, text: "t", onSentence: () => {} });
    expect(out).toEqual({ tasks: ["Did A."], topics: [], weekly_plans: [], blockers: [], partial: true });
    expect(f.calls).toHaveLength(1);
  });
  it("fails with STREAM when the connection drops before any sentence", async () => {
    const f = seq(sse('{"tasks":["Un', new Error("socket closed")));
    await expect(runLocal({ fetchImpl: f, local, text: "t", onSentence: () => {} })).rejects.toMatchObject({ code: "STREAM" });
  });
  it("asks again without streaming when the streamed reply is not usable", async () => {
    const f = seq(sse("nope"), chat(good));
    const out = await runLocal({ fetchImpl: f, local, text: "t", onSentence: () => {} });
    expect(out.tasks).toEqual(["Did A."]);
    expect(JSON.parse(f.calls[1].init.body).stream).toBeUndefined();
  });
});

describe("warmUp", () => {
  it("loads the model with a one-token request that keeps it loaded", async () => {
    const f = seq(chat("ok"));
    await warmUp({ fetchImpl: f, local });
    const body = JSON.parse(f.calls[0].init.body);
    expect(body).toMatchObject({ model: "qwen2.5:3b-instruct", max_tokens: 1, keep_alive: KEEP_ALIVE });
  });
  it("does nothing for hosted models or servers that are not on this computer", async () => {
    const f = seq(chat("ok"));
    await warmUp({ fetchImpl: f, local: { ...local, model: "gpt-oss:120b-cloud" } });
    await warmUp({ fetchImpl: f, local: { ...local, baseUrl: "http://192.168.1.5:11434/v1" } });
    expect(f.calls).toHaveLength(0);
  });
  it("never throws", async () => {
    await expect(warmUp({ fetchImpl: seq(new TypeError("fetch failed")), local })).resolves.toBeUndefined();
  });
});

describe("localStatus", () => {
  it("is ready when the model is listed, and asks /models", async () => {
    const f = seq(res({ data: [{ id: "qwen2.5:3b-instruct" }] }));
    expect(await localStatus({ fetchImpl: f, local })).toEqual({ state: "ready" });
    expect(f.calls[0].url).toBe("http://localhost:11434/v1/models");
  });
  it("matches an untagged model name to its :latest install", async () => {
    const f = seq(res({ data: [{ id: "llama3:latest" }] }));
    expect(await localStatus({ fetchImpl: f, local: { ...local, model: "llama3" } })).toEqual({ state: "ready" });
  });
  it("reports a missing model with the install command", async () => {
    const r = await localStatus({ fetchImpl: seq(res({ data: [{ id: "other:1b" }] })), local });
    expect(r.state).toBe("no-model");
    expect(r.command).toBe("ollama pull qwen2.5:3b-instruct");
  });
  it("reports a server that is not running", async () => {
    const r = await localStatus({ fetchImpl: seq(new TypeError("fetch failed")), local });
    expect(r.state).toBe("no-server");
    expect(r.detail).toContain("Install Ollama");
  });
  it("reports a server that answers with an error", async () => {
    const r = await localStatus({ fetchImpl: seq(res("x", 500, "Internal Server Error")), local });
    expect(r.state).toBe("no-server");
    expect(r.detail).toContain("500");
  });
});
