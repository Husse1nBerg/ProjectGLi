import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { findCarImages } from "./carImage.js";

const originalFetch = globalThis.fetch;
const input = { makeModel: "Ford Focus", year: 2017, trim: "RS" };
afterEach(() => { globalThis.fetch = originalFetch; });

function photo(title, id) {
  return { title, imageinfo: [{ mime: "image/jpeg",
    thumburl: `https://upload.wikimedia.org/${id}-960.jpg`,
    url: `https://upload.wikimedia.org/${id}.jpg` }] };
}
function commonsFetch(pages) {
  globalThis.fetch = async (url, options) => {
    assert.ok(options.signal instanceof AbortSignal);
    const parsed = new URL(url);
    assert.equal(parsed.hostname, "commons.wikimedia.org");
    assert.equal(parsed.searchParams.get("gsrnamespace"), "6");
    assert.match(parsed.searchParams.get("gsrsearch"), /2017.*ford.*focus.*rs/i);
    return { ok: true, json: async () => ({ query: { pages } }) };
  };
}

test("keyless lookup rejects rally cars, wrong years and generic/wrong trims", async () => {
  commonsFetch([
    photo("File:2017 Ford Focus RS WRC rally car.jpg", "rally"),
    photo("File:2016 Ford Focus RS.jpg", "wrong-year"),
    photo("File:2017 Ford Focus ST.jpg", "wrong-trim"),
    photo("File:2017 Ford Focus.jpg", "generic"),
    photo("File:2017 Ford Focus RS.jpg", "correct"),
  ]);
  assert.deepEqual(await findCarImages(input), ["https://upload.wikimedia.org/correct-960.jpg"]);
});

test("trim embedded in make/model is also required", async () => {
  commonsFetch([photo("File:2017 Ford Focus.jpg", "generic"), photo("File:2017 Ford Focus RS.jpg", "correct")]);
  assert.deepEqual(await findCarImages({ ...input, makeModel: "Ford Focus RS", trim: "" }), [
    "https://upload.wikimedia.org/correct-960.jpg",
  ]);
});

test("returns no image rather than guessing for a misspelled model", async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ query: { pages: [photo("File:2017 Ford Focus RS.jpg", "correct")] } }) });
  assert.deepEqual(await findCarImages({ ...input, makeModel: "Ford Fpcus" }), []);
});

test("requires a year and model before searching", async () => {
  let requests = 0;
  globalThis.fetch = async () => { requests++; throw new Error("unexpected fetch"); };
  for (const query of [{ makeModel: "Ford Focus" }, { year: 2017 }, { ...input, year: null }]) {
    assert.deepEqual(await findCarImages(query), []);
  }
  assert.equal(requests, 0);
});
