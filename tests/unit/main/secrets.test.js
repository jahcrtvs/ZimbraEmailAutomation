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
  it("ignores an empty key", () => {
    const s = createSecrets(dir, fakeSafe());
    s.setKey("   ");
    expect(s.hasKey()).toBe(false);
  });
});
