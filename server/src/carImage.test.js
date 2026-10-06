import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { findCarImages } from "./carImage.js";
import handler from "../../api/car-image.js";

const originalFetch = globalThis.fetch;
const keys = ["OPENAI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_CSE_ID"];
let environment;
beforeEach(() => {
  environment = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  keys.forEach((key) => delete process.env[key]);
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of keys) {
    if (environment[key] === undefined) delete process.env[key];
    else process.env[key] = environment[key];
  }
});

function wikipediaFetch() {
  globalThis.fetch = async (url, options) => {
    assert.ok(options.signal instanceof AbortSignal, "provider requests need a timeout");
    return {
      ok: true,
      json: async () => url.includes("opensearch")
        ? ["Volkswagen Jetta", ["Volkswagen Jetta"]]
        : {
            thumbnail: { source: "https://upload.wikimedia.org/thumb.jpg" },
            originalimage: { source: "https://upload.wikimedia.org/original.jpg" },
          },
    };
  };
}

test("keyless image lookup returns thumbnail and original fallback", async () => {
  wikipediaFetch();
  assert.deepEqual(await findCarImages({ makeModel: "Volkswagen Jetta" }), [
    "https://upload.wikimedia.org/thumb.jpg",
    "https://upload.wikimedia.org/original.jpg",
  ]);
});

test("Vercel image endpoint works without an OpenAI API key", async () => {
  wikipediaFetch();
  const response = {
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await handler({ method: "POST", body: { makeModel: "Volkswagen Jetta" } }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.images.length, 2);
});

test("an unavailable Google provider falls back to Wikipedia", async () => {
  process.env.GOOGLE_API_KEY = "test-key";
  process.env.GOOGLE_CSE_ID = "test-engine";
  wikipediaFetch();
  const wiki = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    if (url.includes("googleapis.com")) {
      assert.ok(options.signal instanceof AbortSignal);
      throw new DOMException("Timed out", "TimeoutError");
    }
    return wiki(url, options);
  };
  assert.equal((await findCarImages({ makeModel: "Volkswagen Jetta" })).length, 2);
});

test("image lookup returns no candidates when providers are unavailable", async () => {
  globalThis.fetch = async () => { throw new Error("offline"); };
  assert.deepEqual(await findCarImages({ makeModel: "Volkswagen Jetta" }), []);
});
