import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { Responses } from "openai/resources/responses/responses";
import { estimateResale, extractSources } from "./resale.js";
import handler from "../../api/estimate-resale.js";

const originalKey = process.env.OPENAI_API_KEY;
afterEach(() => {
  mock.restoreAll();
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
});
const input = {
  makeModel: "Volkswagen Jetta", year: 2022, buyingPrice: 28000,
  currentMileage: 50000, expectedMileageAtSale: 80000, ownershipYears: 2,
};

test("recovers listing links from structured explanations without citation annotations", async () => {
  process.env.OPENAI_API_KEY = "test-only";
  const explanation = "Comparables: [Dealer](https://dealer.example/car) and [AutoTrader](https://www.autotrader.ca/cars/volkswagen/jetta/my_2022/ot_used).";
  mock.method(Responses.prototype, "create", async () => ({
    output_text: JSON.stringify({ conservativeResale: 20000, realisticResale: 23000, strongResale: 25000, explanation }),
    output: [{ type: "message", content: [{ type: "output_text", annotations: [] }] }],
  }));
  const estimate = await estimateResale(input);
  assert.deepEqual(estimate.sources, [
    { url: "https://dealer.example/car", title: "Dealer" },
    { url: "https://www.autotrader.ca/cars/volkswagen/jetta/my_2022/ot_used", title: "AutoTrader" },
  ]);
});

test("prefers provider citations to explanation links and filters unsafe URLs", () => {
  const response = { output: [{ type: "message", content: [{ annotations: [
    { type: "url_citation", url: "javascript:alert(1)", title: "Unsafe" },
    { type: "url_citation", url: "https://dealer.example/car", title: "Provider title" },
  ] }] }] };
  assert.deepEqual(extractSources(response, "[Other](https://other.example/car)"), [
    { url: "https://dealer.example/car", title: "Provider title" },
  ]);
});

test("fallback deduplicates links, handles parentheses, and ignores unsafe links", () => {
  assert.deepEqual(extractSources({}, "[Car](https://dealer.example/car_(2022)) [Again](https://dealer.example/car_(2022)) [Bad](javascript:alert(1))"), [
    { url: "https://dealer.example/car_(2022)", title: "Car" },
  ]);
});

test("extracts sources before the explanation display limit", async () => {
  process.env.OPENAI_API_KEY = "test-only";
  mock.method(Responses.prototype, "create", async () => ({
    output_text: JSON.stringify({ conservativeResale: 1, realisticResale: 2, strongResale: 3,
      explanation: "x".repeat(2100) + " [Dealer](https://dealer.example/car)" }),
    output: [],
  }));
  const estimate = await estimateResale(input);
  assert.equal(estimate.explanation.length, 2000);
  assert.equal(estimate.sources[0]?.url, "https://dealer.example/car");
});

test("listing estimates require search and retain provider citations", async () => {
  process.env.OPENAI_API_KEY = "test-only";
  mock.method(Responses.prototype, "create", async function (body) {
    assert.equal(body.tool_choice, "required", "a prompt alone does not require a web search");
    assert.equal(this._client.maxRetries, 0);
    assert.ok(this._client.timeout < 60000);
    return {
      output_text: JSON.stringify({ conservativeResale: 18000, realisticResale: 20000, strongResale: 22000, explanation: "Comparable vehicle." }),
      output: [{ type: "message", content: [{ annotations: [
        { type: "url_citation", url: "https://example.com/car", title: "Comparable" },
        { type: "url_citation", url: "https://example.com/car", title: "Duplicate" },
      ] }] }],
    };
  });
  const estimate = await estimateResale(input);
  assert.equal(estimate.realisticResale, 20000);
  assert.deepEqual(estimate.sources, [{ url: "https://example.com/car", title: "Comparable" }]);
});

test("serverless endpoint identifies quota failure instead of a generic 502", async () => {
  process.env.OPENAI_API_KEY = "test-only";
  mock.method(Responses.prototype, "create", async () => {
    throw Object.assign(new Error("quota exhausted"), { status: 429, code: "insufficient_quota" });
  });
  mock.method(console, "error", () => {});
  const response = {
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
  await handler({ method: "POST", body: input }, response);
  assert.equal(response.statusCode, 503);
  assert.equal(response.body.code, "AI_QUOTA_EXCEEDED");
});
