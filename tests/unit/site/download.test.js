import { afterEach, describe, it, expect, vi } from "vitest";
import handler from "../../../site/api/download.js";

const response = () => ({
  statusCode: 200,
  headers: {},
  setHeader(name, value) { this.headers[name] = value; },
  end(body) { this.body = body; }
});

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("installer downloads", () => {
  it("rejects a versioned link without fetching an old installer", async () => {
    vi.stubEnv("GITHUB_TOKEN", "fake-test-token");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const res = response();
    await handler({ method: "GET", url: "/api/download?v=1.2.1" }, res);
    expect(res.statusCode).toBe(404);
    expect(res.body).toContain("Version-specific downloads are no longer available");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("redirects an unversioned link to the latest installer", async () => {
    vi.stubEnv("GITHUB_TOKEN", "fake-test-token");
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ assets: [{ name: "Daily Digest Setup.exe", url: "https://api.github.test/asset" }] }) })
      .mockResolvedValueOnce({ status: 302, headers: { get: () => "https://download.test/latest.exe" } });
    vi.stubGlobal("fetch", fetch);
    const res = response();
    await handler({ method: "GET", url: "/api/download" }, res);
    expect(fetch.mock.calls[0][0]).toMatch(/\/releases\/latest$/);
    expect(res.statusCode).toBe(302);
    expect(res.headers.Location).toBe("https://download.test/latest.exe");
  });
});
