import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createSecrets } from "../../../src/main/secrets.js";

const fakeSafe = (available = true) => ({
  isEncryptionAvailable: () => available,
  encryptString: s => Buffer.from(s).reverse(),
  decryptString: b => Buffer.from(b).reverse().toString()
});
let dir;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "dd-sec-")); });

describe("secrets", () => {
  it("round-trips and stores nothing in plaintext", () => {
    const s = createSecrets(dir, fakeSafe());
    expect(s.hasKey()).toBe(false);
    s.setKey("  AIza-secret ");
    expect(s.hasKey()).toBe(true);
    expect(s.getKey()).toBe("AIza-secret");
    expect(fs.readFileSync(path.join(dir, "gemini.key"), "utf8")).not.toContain("AIza-secret");
  });
  it("clears the key", () => {
    const s = createSecrets(dir, fakeSafe());
    s.setKey("k"); s.clearKey();
    expect(s.hasKey()).toBe(false);
    expect(s.getKey()).toBeNull();
  });
  it("refuses to store when encryption is unavailable", () => {
    expect(() => createSecrets(dir, fakeSafe(false)).setKey("k")).toThrow(/encryption/i);
  });
  it("returns null for an undecryptable file instead of throwing", () => {
    const safe = fakeSafe();
    safe.decryptString = () => { throw new Error("bad"); };
    fs.writeFileSync(path.join(dir, "gemini.key"), "junk");
    expect(createSecrets(dir, safe).getKey()).toBeNull();
  });
  it("stores each provider's key separately and independently", () => {
    const s = createSecrets(dir, fakeSafe());
    s.setKey("gem-key");
    expect(s.hasKey("groq")).toBe(false);
    s.setKey("groq-key", "groq");
    expect(s.getKey("groq")).toBe("groq-key");
    expect(s.getKey("gemini")).toBe("gem-key");
    expect(s.getKey()).toBe("gem-key");
    expect(fs.existsSync(path.join(dir, "groq.key"))).toBe(true);
    expect(fs.readFileSync(path.join(dir, "groq.key"), "utf8")).not.toContain("groq-key");
    s.clearKey("groq");
    expect(s.hasKey("groq")).toBe(false);
    expect(s.hasKey("gemini")).toBe(true);
  });
  it("rejects unknown providers", () => {
    const s = createSecrets(dir, fakeSafe());
    expect(() => s.setKey("k", "../evil")).toThrow(/provider/i);
    expect(() => s.getKey("openai")).toThrow(/provider/i);
  });
  it("ignores an empty key", () => {
    const s = createSecrets(dir, fakeSafe());
    s.setKey("   ");
    expect(s.hasKey()).toBe(false);
  });
});
