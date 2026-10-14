import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { Responses } from "openai/resources/responses/responses";
import { estimateResale, extractSources, buildPrompt } from "./resale.js";
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
    { url: "https://dealer.example/car", title: "Dealer", provenance: "model-link" },
    { url: "https://www.autotrader.ca/cars/volkswagen/jetta/my_2022/ot_used", title: "AutoTrader", provenance: "model-link" },
  ]);
});

test("prefers provider citations to explanation links and filters unsafe URLs", () => {
  const response = { output: [{ type: "message", content: [{ annotations: [
    { type: "url_citation", url: "javascript:alert(1)", title: "Unsafe" },
    { type: "url_citation", url: "https://dealer.example/car", title: "Provider title" },
  ] }] }] };
  assert.deepEqual(extractSources(response, "[Other](https://other.example/car)"), [
    { url: "https://dealer.example/car", title: "Provider title", provenance: "provider-citation" },
  ]);
});

test("fallback deduplicates links, handles parentheses, and ignores unsafe links", () => {
  assert.deepEqual(extractSources({}, "[Car](https://dealer.example/car_(2022)) [Again](https://dealer.example/car_(2022)) [Bad](javascript:alert(1))"), [
    { url: "https://dealer.example/car_(2022)", title: "Car", provenance: "model-link" },
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
  assert.deepEqual(estimate.sources, [{ url: "https://example.com/car", title: "Comparable", provenance: "provider-citation" }]);
});

test("structured comparable schema and server search timestamp accompany evidence", async () => {
  process.env.OPENAI_API_KEY = "test-only";
  const started = Date.now();
  mock.method(Responses.prototype, "create", async (body) => {
    const schema = body.text.format.schema;
    assert.ok(schema.required.includes("comparables"));
    assert.deepEqual(schema.properties.comparables.items.properties.priceCAD.type, ["number", "null"]);
    assert.ok(schema.properties.comparables.items.required.includes("matchNotes"));
    return { output_text: JSON.stringify({ conservativeResale: 18000, realisticResale: 20000,
      strongResale: 22000, explanation: "Limited mileage data.", comparables: [{
        url: "https://dealer.example/car", title: "Dealer car", vehicle: "2022 Volkswagen Jetta GLI",
        priceCAD: 25000, mileageKm: null, location: "Ottawa, ON", matchNotes: "Asking price; mileage unknown.",
      }] }), output: [] };
  });
  const estimate = await estimateResale(input);
  assert.ok(Date.parse(estimate.searchedAt) >= started);
  assert.ok(Date.parse(estimate.searchedAt) <= Date.now());
  assert.deepEqual(estimate.sources[0], {
    url: "https://dealer.example/car", title: "Dealer car", provenance: "model-link",
    vehicle: "2022 Volkswagen Jetta GLI", priceCAD: 25000, mileageKm: null,
    location: "Ottawa, ON", matchNotes: "Asking price; mileage unknown.",
  });
});

test("provider citations keep their title and enrich metadata only for matching URLs", () => {
  const response = { output: [{ type: "message", content: [{ annotations: [
    { type: "url_citation", url: "https://dealer.example/car", title: "Citation title" },
  ] }] }] };
  const sources = extractSources(response, "", [
    { url: "https://dealer.example/car", title: "Model title", vehicle: "Jetta GLI", priceCAD: 25000,
      mileageKm: 42000, location: null, matchNotes: "Different model year." },
    { url: "https://other.example/car", title: "Uncited car", priceCAD: 1 },
  ]);
  assert.equal(sources.length, 1);
  assert.equal(sources[0].title, "Citation title");
  assert.equal(sources[0].priceCAD, 25000);
  assert.equal(sources[0].matchNotes, "Different model year.");
});

test("fallback metadata preserves unknowns, rejects invalid numbers and unsafe URLs", () => {
  const sources = extractSources({}, "[Dealer](https://dealer.example/car)", [
    { url: "https://dealer.example/car", title: "Duplicate", priceCAD: null, mileageKm: -100 },
    { url: "https://other.example/car", title: "Other", priceCAD: "USD 10000", vehicle: {} },
    { url: "javascript:alert(1)", title: "Unsafe" },
  ]);
  assert.equal(sources.length, 2);
  assert.equal(sources[0].title, "Dealer");
  assert.equal(sources[0].priceCAD, null);
  assert.equal(sources[0].mileageKm, null);
  assert.equal(sources[1].priceCAD, null);
  assert.equal(sources[1].vehicle, null);
});

test("excluded links are prompt data and omitted from returned evidence", () => {
  const excluded = ["https://dealer.example/car", null, "javascript:alert(1)", { url: "wrong" }];
  const prompt = buildPrompt({ ...input, excludedUrls: excluded });
  assert.match(prompt, /Do not open, fetch, cite or use these excluded sources/);
  assert.match(prompt, /https:\/\/dealer.example\/car/);
  assert.doesNotMatch(prompt, /javascript:|wrong/);
  assert.match(prompt, /unknown facts MUST be null/);
  assert.match(prompt, /Use CAD prices only/);
  assert.deepEqual(extractSources({}, "[Excluded](https://dealer.example/car)", [], excluded), []);
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
