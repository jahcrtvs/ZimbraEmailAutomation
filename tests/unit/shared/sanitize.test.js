import { describe, it, expect } from "vitest";
import { sanitizeNotes, restore, MAX_CLOUD_CHARS } from "../../../src/shared/sanitize.js";
import { SAMPLE_NOTES } from "../../../src/shared/report.js";

const notes = over => ({ work: "", topics: "", progress: "", blockers: "", tomorrow: "", ...over });

describe("sanitizeNotes", () => {
  it("replaces emails, links, IPs, phones and tokens, and restores them", () => {
    const token = "a1".repeat(20);
    const n = notes({ work: "emailed boss@corp.example about https://git.corp.example/repo/pull/4\nserver 10.1.2.3 down\ncalled 0917 123 4567", blockers: "key id " + token });
    const r = sanitizeNotes(n);
    expect(r.blocked).toBeNull();
    const all = Object.values(r.notes).join("\n");
    for (const raw of ["boss@corp.example", "git.corp.example", "10.1.2.3", "0917 123 4567", token]) expect(all).not.toContain(raw);
    for (const ph of ["[EMAIL_1]", "[URL_1]", "[IP_1]", "[PHONE_1]", "[TOKEN_1]"]) expect(all).toContain(ph);
    expect(restore(r.notes.work, r.map)).toBe(n.work);
    expect(restore(r.notes.blockers, r.map)).toBe(n.blockers);
  });
  it("gives the same text the same placeholder and different text a new one", () => {
    const r = sanitizeNotes(notes({ work: "boss@corp.example, boss@corp.example and other@corp.example" }));
    expect(r.notes.work).toBe("[EMAIL_1], [EMAIL_1] and [EMAIL_2]");
  });
  it("leaves dates, times and versions alone", () => {
    const n = notes({ work: "deployed on 2026-10-09 10:30 with Spring Boot 3.2.1 and Java 21" });
    expect(sanitizeNotes(n).notes.work).toBe(n.work);
  });
  it("leaves ordinary notes unchanged", () => {
    const r = sanitizeNotes(SAMPLE_NOTES);
    expect(r.blocked).toBeNull();
    expect(r.notes).toEqual(SAMPLE_NOTES);
    expect(r.map).toEqual([]);
  });
  it("hides the given words as whole words, ignoring case", () => {
    const r = sanitizeNotes(notes({ work: "Mark asked cruz to bookmark the page" }), { terms: ["Mark Anton Cruz", "Mark", "Cruz", "ab"] });
    expect(r.notes.work).toBe("[NAME_1] asked [NAME_2] to bookmark the page");
    expect(restore(r.notes.work, r.map)).toBe("Mark asked cruz to bookmark the page");
  });
  it("blocks anything that looks like a secret", () => {
    const fakes = ["gsk_" + "a".repeat(30), "AIza" + "B".repeat(35), "sk-" + "c".repeat(24), "ghp_" + "d".repeat(30), "AKIA" + "E".repeat(16),
      "-----BEGIN RSA PRIVATE KEY-----", "Bearer " + "f".repeat(30), "password: hunter2", "api_key=abc123", "postgres://admin:hunter2@db.local/app"];
    for (const s of fakes) {
      const r = sanitizeNotes(notes({ work: "tried " + s + " today" }));
      expect(r.blocked, s).toMatch(/will not be sent/);
      expect(r.notes).toBeUndefined();
    }
  });
  it("does not treat the word password on its own as a secret", () => {
    expect(sanitizeNotes(notes({ work: "fixed the password reset flow" })).blocked).toBeNull();
  });
  it("blocks notes over the length cap and allows exactly the cap", () => {
    expect(MAX_CLOUD_CHARS).toBe(8000);
    expect(sanitizeNotes(notes({ work: "x".repeat(8000) })).blocked).toBeNull();
    expect(sanitizeNotes(notes({ work: "x".repeat(8001) })).blocked).toMatch(/longer than 8000/);
  });
});

describe("restore", () => {
  const map = [{ placeholder: "[EMAIL_1]", original: "boss@corp.example" }];
  it("matches placeholders case-insensitively and leaves unknown ones alone", () => {
    expect(restore("Emailed [email_1] and [EMAIL_9].", map)).toBe("Emailed boss@corp.example and [EMAIL_9].");
  });
  it("inserts originals literally, including $ sequences", () => {
    expect(restore("x [NAME_1] y", [{ placeholder: "[NAME_1]", original: "a$&b" }])).toBe("x a$&b y");
  });
  it("does nothing when a placeholder is missing from the text", () => {
    expect(restore("Nothing to restore.", map)).toBe("Nothing to restore.");
  });
});
