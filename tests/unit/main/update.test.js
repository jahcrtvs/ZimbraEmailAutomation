import { describe, it, expect } from "vitest";
import { createUpdateChecker } from "../../../src/main/update.js";
import { compareVersions } from "../../../src/shared/version.js";

const reply = body => async () => ({ ok: true, json: async () => body });
const checker = (version, fetchImpl) => createUpdateChecker({ baseUrl: "https://site.test", version, fetchImpl });

describe("compareVersions", () => {
  it("compares numerically, not as text", () => {
    expect(compareVersions("1.2.10", "1.2.9")).toBe(1);
    expect(compareVersions("1.2.2", "v1.2.2")).toBe(0);
    expect(compareVersions("1.9.0", "1.10.0")).toBe(-1);
  });
  it("returns null for anything that is not a version", () => {
    expect(compareVersions("1.2.2", null)).toBeNull();
    expect(compareVersions("abc", "1.0.0")).toBeNull();
  });
});

describe("update checker", () => {
  it("is ok when up to date", async () => {
    expect((await checker("1.2.2", reply({ latest: "1.2.2", min: "0.0.0" })).check()).state).toBe("ok");
  });
  it("offers a newer version without forcing it", async () => {
    const r = await checker("1.2.2", reply({ latest: "1.2.3", min: "1.0.0" })).check();
    expect(r).toMatchObject({ state: "optional", latest: "1.2.3", current: "1.2.2" });
  });
  it("requires an update below the minimum", async () => {
    const r = await checker("1.2.2", reply({ latest: "1.3.0", min: "1.3.0" })).check();
    expect(r).toMatchObject({ state: "required", latest: "1.3.0" });
  });
  it("still requires an update when latest is unknown", async () => {
    expect((await checker("1.2.2", reply({ latest: null, min: "1.2.3" })).check()).state).toBe("required");
  });
  it("lets the user in when the check fails", async () => {
    expect((await checker("1.2.2", async () => { throw new Error("offline"); }).check()).state).toBe("ok");
    expect((await checker("1.2.2", async () => ({ ok: false })).check()).state).toBe("ok");
    expect((await checker("1.2.2", reply({ latest: "garbage", min: "garbage" })).check()).state).toBe("ok");
  });
  it("points the download at the website", () => {
    expect(checker("1.2.2", reply({})).downloadUrl).toBe("https://site.test/api/download");
  });
});
