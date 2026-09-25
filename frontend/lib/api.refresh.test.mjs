/**
 * Client-side proof for the transparent 401 → refresh → retry flow.
 *
 * Runs with zero dependencies: `node --test lib/api.refresh.test.mjs`
 * (wired as `npm test`). The real `lib/api.js` is loaded via a data: URL
 * import (the package is CommonJS-typed, so a direct relative import of its
 * ESM syntax would fail) with a stubbed global fetch.
 *
 * Proves `api()` itself — not hand-rolled refresh calls:
 *  1. expired token → 401 → ONE automatic /refresh → retry → 200
 *  2. three concurrent expired-token calls → still ONE /refresh, all succeed
 *  3. dead refresh → ApiError 401 and the in-memory token is cleared
 */
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
process.env.NEXT_PUBLIC_API_URL = "http://api.test";

let apiModule;
before(async () => {
  const src = readFileSync(path.join(here, "api.js"), "utf8");
  apiModule = await import(
    `data:text/javascript;base64,${Buffer.from(src).toString("base64")}`
  );
});

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => (String(name).toLowerCase() === "content-type" ? "application/json" : "") },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

/** Install a scripted fetch stub; returns the call log. */
function stubFetch(script) {
  const calls = [];
  globalThis.fetch = async (url, opts = {}) => {
    calls.push({ url, opts });
    return script(url, opts, calls);
  };
  return calls;
}

const getAuth = (opts) => (opts.headers || {}).Authorization || "";

describe("api() transparent refresh", () => {
  it("expired token → auto refresh → retry succeeds with exactly one /refresh", async () => {
    const { api, setAuthToken, getAuthToken } = apiModule;
    setAuthToken("expired-token");
    const calls = stubFetch((url, opts) => {
      if (url.endsWith("/api/v1/auth/refresh")) {
        return jsonResponse(200, { data: { access_token: "fresh-token" } });
      }
      if (getAuth(opts) === "Bearer fresh-token") {
        return jsonResponse(200, { data: { id: "u1", email: "a@x.com" } });
      }
      return jsonResponse(401, { error: { code: "UNAUTHORIZED", message: "Token expired" } });
    });

    const me = await api("/api/v1/auth/me");
    assert.equal(me.email, "a@x.com");
    assert.equal(getAuthToken(), "fresh-token");
    assert.equal(calls.filter((c) => c.url.endsWith("/api/v1/auth/refresh")).length, 1);
    assert.equal(calls.filter((c) => c.url.endsWith("/api/v1/auth/me")).length, 2);
  });

  it("three concurrent 401s share a single in-flight refresh", async () => {
    const { api } = apiModule;
    const { setAuthToken } = apiModule;
    setAuthToken("expired-token");
    // Small delay on /refresh so all three callers overlap in-flight.
    const calls = stubFetch(async (url, opts) => {
      if (url.endsWith("/api/v1/auth/refresh")) {
        await new Promise((r) => setTimeout(r, 20));
        return jsonResponse(200, { data: { access_token: "fresh-token" } });
      }
      if (getAuth(opts) === "Bearer fresh-token") {
        return jsonResponse(200, { data: { ok: true } });
      }
      return jsonResponse(401, { error: { code: "UNAUTHORIZED", message: "Token expired" } });
    });

    const results = await Promise.all([
      api("/api/v1/auth/me"),
      api("/api/v1/projects"),
      api("/api/v1/assigned"),
    ]);
    assert.deepEqual(results, [{ ok: true }, { ok: true }, { ok: true }]);
    assert.equal(
      calls.filter((c) => c.url.endsWith("/api/v1/auth/refresh")).length,
      1,
      "expected exactly one shared /refresh call"
    );
  });

  it("dead refresh → 401 error and token cleared (no loop)", async () => {
    const { api, setAuthToken, getAuthToken, ApiError } = apiModule;
    setAuthToken("expired-token");
    const calls = stubFetch((url) => {
      if (url.endsWith("/api/v1/auth/refresh")) {
        return jsonResponse(401, { error: { code: "UNAUTHORIZED", message: "Invalid refresh token" } });
      }
      return jsonResponse(401, { error: { code: "UNAUTHORIZED", message: "Token expired" } });
    });

    await assert.rejects(() => api("/api/v1/auth/me"), (err) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 401);
      return true;
    });
    assert.equal(getAuthToken(), null);
    assert.equal(calls.filter((c) => c.url.endsWith("/api/v1/auth/refresh")).length, 1);
  });
});
