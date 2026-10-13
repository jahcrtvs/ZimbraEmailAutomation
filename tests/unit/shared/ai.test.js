import { describe, it, expect } from "vitest";
import { DEFAULT_LOCAL, isCloudModel, isLoopbackUrl, pullCommand } from "../../../src/shared/ai.js";

describe("ai helpers", () => {
  it("defaults to Ollama and a small instruct model", () => {
    expect(DEFAULT_LOCAL).toEqual({ baseUrl: "http://localhost:11434/v1", model: "qwen2.5:3b-instruct" });
  });
  it("flags Ollama cloud models written either way", () => {
    expect(isCloudModel("gpt-oss:120b-cloud")).toBe(true);
    expect(isCloudModel(" glm-5.3-flash:cloud ")).toBe(true);
    expect(isCloudModel("qwen2.5:3b-instruct")).toBe(false);
    expect(isCloudModel("")).toBe(false);
  });
  it("recognises loopback addresses only", () => {
    for (const u of ["http://localhost:11434/v1", "http://127.0.0.1:11434", "http://[::1]:11434/v1"]) expect(isLoopbackUrl(u)).toBe(true);
    for (const u of ["http://192.168.1.5:11434/v1", "http://localhost.evil.example", "https://api.example.com", "not a url", ""]) expect(isLoopbackUrl(u)).toBe(false);
  });
  it("builds the pull command", () => {
    expect(pullCommand(" qwen2.5:3b-instruct ")).toBe("ollama pull qwen2.5:3b-instruct");
  });
});
