import assert from "node:assert/strict";
import { test } from "node:test";
import { resaleError } from "./resaleError.js";

test("distinguishes exhausted quota from temporary rate limits", () => {
  assert.equal(resaleError({ status: 429, code: "insufficient_quota" }).code, "AI_QUOTA_EXCEEDED");
  assert.equal(resaleError({ status: 429 }).code, "AI_RATE_LIMITED");
});

test("reports actionable provider failures without exposing raw messages", () => {
  for (const [error, code, status] of [
    [{ status: 401 }, "AI_ACCESS_ERROR", 503],
    [{ status: 403 }, "AI_ACCESS_ERROR", 503],
    [{ status: 400 }, "AI_REQUEST_REJECTED", 502],
    [{ status: 404 }, "AI_REQUEST_REJECTED", 502],
    [{ name: "APIConnectionTimeoutError" }, "AI_TIMEOUT", 504],
    [{}, "AI_ESTIMATE_FAILED", 502],
  ]) {
    const result = resaleError({ ...error, message: "private provider details" });
    assert.equal(result.code, code);
    assert.equal(result.status, status);
    assert.ok(!result.error.includes("private provider details"));
  }
});
