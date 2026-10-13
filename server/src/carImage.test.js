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

const input = { makeModel: "Volkswagen Jetta", year: 2022, trim: "GLI" };

function commonsFetch() {
  globalThis.fetch = async (url, options) => {
    assert.ok(options.signal instanceof AbortSignal, "provider requests need a timeout");
    return {
      ok: true,
      json: async () => ({ query: { pages: [{
        title: "File:2022 Volkswagen Jetta GLI.jpg",
        imageinfo: [{ mime: "image/jpeg", thumburl: "https://upload.wikimedia.org/thumb.jpg", url: "https://upload.wikimedia.org/original.jpg" }],
      }] } }),
    };
  };
}

test("keyless image lookup returns a matching thumbnail", async () => {
  commonsFetch();
  assert.deepEqual(await findCarImages(input), [
    "https://upload.wikimedia.org/thumb.jpg",
  ]);
});

test("Vercel image endpoint works without an OpenAI API key", async () => {
  commonsFetch();
  const response = {
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await handler({ method: "POST", body: input }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.images.length, 1);
});

test("an unavailable Google provider falls back to matching Commons photos", async () => {
  process.env.GOOGLE_API_KEY = "test-key";
  process.env.GOOGLE_CSE_ID = "test-engine";
  commonsFetch();
  const wiki = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    if (url.includes("googleapis.com")) {
      assert.ok(options.signal instanceof AbortSignal);
      throw new DOMException("Timed out", "TimeoutError");
    }
    return wiki(url, options);
  };
  assert.equal((await findCarImages(input)).length, 1);
});

test("image lookup returns no candidates when providers are unavailable", async () => {
  globalThis.fetch = async () => { throw new Error("offline"); };
  assert.deepEqual(await findCarImages(input), []);
});

test("irrelevant Google results do not bypass vehicle matching", async () => {
  process.env.GOOGLE_API_KEY = "test-key";
  process.env.GOOGLE_CSE_ID = "test-engine";
  commonsFetch();
  const commons = globalThis.fetch;
  globalThis.fetch = async (url, options) => url.includes("googleapis.com")
    ? { ok: true, json: async () => ({ items: [
      { title: "2022 Volkswagen Jetta GLI rally car", mime: "image/jpeg", link: "https://example.com/rally.jpg" },
      { title: "2022 Volkswagen Jetta", mime: "image/jpeg", link: "https://example.com/generic.jpg" },
    ] }) }
    : commons(url, options);
  assert.deepEqual(await findCarImages(input), ["https://upload.wikimedia.org/thumb.jpg"]);
});

test("matching Google result retains precedence over Commons", async () => {
  process.env.GOOGLE_API_KEY = "test-key";
  process.env.GOOGLE_CSE_ID = "test-engine";
  globalThis.fetch = async (url) => {
    assert.ok(url.includes("googleapis.com"));
    return { ok: true, json: async () => ({ items: [
      { title: "2022 Volkswagen Jetta GLI", mime: "image/jpeg", link: "https://example.com/correct.jpg" },
    ] }) };
  };
  assert.deepEqual(await findCarImages(input), ["https://example.com/correct.jpg"]);
});
