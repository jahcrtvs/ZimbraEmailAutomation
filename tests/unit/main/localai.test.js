import { describe, it, expect } from "vitest";
import { runLocal, localStatus } from "../../../src/main/localai.js";

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
    expect(body.response_format).toEqual({ type: "json_object" });
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
