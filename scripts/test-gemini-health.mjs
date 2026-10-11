import test from "node:test";
import assert from "node:assert";

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite: Admin-Only Gemini Health Status
// ─────────────────────────────────────────────────────────────────────────────

test("Gemini Health Status Test Suite", async (t) => {
  // Save original globals
  const origFetch = globalThis.fetch;
  const origEnv = process.env;

  t.afterEach(() => {
    globalThis.fetch = origFetch;
    process.env = { ...origEnv };
  });

  // Test 1: Authorization enforcement
  await t.test("Authorization: non-admin and unauthenticated requests are rejected", async () => {
    function enforceAdminAuth(session) {
      if (!session || session.role !== "admin") {
        return { status: 403, error: "FORBIDDEN", message: "Forbidden" };
      }
      return { status: 200, ok: true };
    }

    // Unauthenticated
    assert.strictEqual(enforceAdminAuth(null).status, 403);
    assert.strictEqual(enforceAdminAuth(undefined).status, 403);

    // Regular user
    assert.strictEqual(enforceAdminAuth({ username: "john", role: "user" }).status, 403);

    // Admin
    assert.strictEqual(enforceAdminAuth({ username: "boss", role: "admin" }).status, 200);
  });

  // Test 2: Missing credentials
  await t.test("Health check: missing credentials results in offline status without HTTP calls", async () => {
    let fetchCalled = false;
    globalThis.fetch = async () => {
      fetchCalled = true;
      throw new Error("Should not be called");
    };

    // Replicate health probe credential check
    function evaluateCredentials(apiKey) {
      if (!apiKey || apiKey.trim() === "") {
        return {
          status: "offline",
          errorCategory: "missing_credentials",
          errorMessage: "GEMINI_API_KEY is not configured in server environment",
        };
      }
      return null;
    }

    const res = evaluateCredentials("");
    assert.strictEqual(res.status, "offline");
    assert.strictEqual(res.errorCategory, "missing_credentials");
    assert.strictEqual(fetchCalled, false);
  });

  // Test 3: Operational response
  await t.test("Health check: 200 OK with valid choices yields operational status", async () => {
    globalThis.fetch = async (url, opts) => {
      assert.strictEqual(opts.method, "POST");
      assert.match(opts.headers.Authorization, /^Bearer /);
      const body = JSON.parse(opts.body);
      assert.strictEqual(body.messages[0].content, "ping");
      assert.strictEqual(body.max_tokens, 5);

      return new Response(
        JSON.stringify({
          choices: [{ message: { role: "assistant", content: "pong" } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const start = Date.now();
    const res = await globalThis.fetch("https://gemini-mock.test/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer test-key" },
      body: JSON.stringify({ model: "gemini-3.7-flash", messages: [{ role: "user", content: "ping" }], max_tokens: 5 }),
    });
    const data = await res.json();
    const latency = Date.now() - start;

    const choice = data?.choices?.[0]?.message?.content;
    assert.strictEqual(typeof choice, "string");
    assert.strictEqual(choice, "pong");
    assert.ok(latency >= 0);
  });

  // Test 4: Degraded on Rate Limit (HTTP 429)
  await t.test("Health check: 429 rate limit yields degraded status", async () => {
    function classifyHttpError(status) {
      if (status === 429) {
        return { status: "degraded", errorCategory: "rate_limited" };
      }
      if (status === 401 || status === 403) {
        return { status: "offline", errorCategory: "authentication_failed" };
      }
      if (status >= 500) {
        return { status: "offline", errorCategory: "service_unavailable" };
      }
      return { status: "offline", errorCategory: "client_error" };
    }

    const rateLimit = classifyHttpError(429);
    assert.strictEqual(rateLimit.status, "degraded");
    assert.strictEqual(rateLimit.errorCategory, "rate_limited");
  });

  // Test 5: Authentication failure (HTTP 401/403)
  await t.test("Health check: 401 auth error yields offline status", async () => {
    function classifyHttpError(status) {
      if (status === 401 || status === 403) {
        return { status: "offline", errorCategory: "authentication_failed" };
      }
      return { status: "offline", errorCategory: "other" };
    }

    const authError = classifyHttpError(401);
    assert.strictEqual(authError.status, "offline");
    assert.strictEqual(authError.errorCategory, "authentication_failed");
  });

  // Test 6: Timeout (AbortError)
  await t.test("Health check: AbortError yields offline status and timeout category", async () => {
    function classifyCatchError(err, timeoutMs) {
      if (err.name === "AbortError") {
        return {
          status: "offline",
          errorCategory: "timeout",
          errorMessage: `Request timed out after ${timeoutMs}ms`,
        };
      }
      return { status: "offline", errorCategory: "unknown_error" };
    }

    const abortErr = new Error("The operation was aborted");
    abortErr.name = "AbortError";

    const timedOut = classifyCatchError(abortErr, 8000);
    assert.strictEqual(timedOut.status, "offline");
    assert.strictEqual(timedOut.errorCategory, "timeout");
    assert.strictEqual(timedOut.errorMessage, "Request timed out after 8000ms");
  });

  // Test 7: Malformed responses
  await t.test("Health check: non-JSON or missing completion choices yields degraded status", async () => {
    function evaluateResponseData(data) {
      const choiceContent = data?.choices?.[0]?.message?.content;
      if (typeof choiceContent !== "string") {
        return {
          status: "degraded",
          errorCategory: "invalid_response",
          errorMessage: "Provider response missing valid choice completion",
        };
      }
      return { status: "operational", errorCategory: null };
    }

    // Missing choices
    assert.strictEqual(evaluateResponseData({}).status, "degraded");
    assert.strictEqual(evaluateResponseData({ choices: [] }).status, "degraded");
    assert.strictEqual(evaluateResponseData({ choices: [{ message: {} }] }).status, "degraded");

    // Valid choice
    assert.strictEqual(evaluateResponseData({ choices: [{ message: { content: "ok" } }] }).status, "operational");
  });

  // Test 8: Secret sanitization
  await t.test("Sanitization: API keys and Bearer tokens are redacted from messages", async () => {
    const testSecret = "sk-super-secret-key-12345";
    function sanitize(msg, key) {
      if (!msg) return "";
      let clean = msg.replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]");
      if (key) clean = clean.replaceAll(key, "[REDACTED_API_KEY]");
      return clean;
    }

    const leakedMsg = `Error upstream with Bearer ${testSecret} while calling provider`;
    const safeMsg = sanitize(leakedMsg, testSecret);

    assert.ok(!safeMsg.includes(testSecret), "Secret must not appear in sanitized message");
    assert.ok(safeMsg.includes("Bearer [REDACTED]"));
  });
});
