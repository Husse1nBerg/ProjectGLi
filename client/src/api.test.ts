import { afterEach, expect, it, vi } from "vitest";
import { fetchResaleEstimate } from "./api";
import type { CarInput } from "./types";

const input = { makeModel: "Ford Focus", year: 2017, buyingPrice: 30000, currentMileage: 50000,
  yearlyMileage: 15000, ownershipYears: 2 } as CarInput;
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it("sends excluded listing URLs and projected mileage with the request", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ conservativeResale: 1,
    realisticResale: 2, strongResale: 3, explanation: "Test", sources: [] })));
  vi.stubGlobal("fetch", fetcher);
  await fetchResaleEstimate(input, ["https://example.com/excluded"]);
  const body = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(body.excludedUrls).toEqual(["https://example.com/excluded"]);
  expect(body.expectedMileageAtSale).toBe(80000);
});

it("handles non-JSON service failures and invalid successful responses", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("offline", { status: 502 })));
  await expect(fetchResaleEstimate(input)).rejects.toThrow("unavailable (502)");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"sources":[]}')));
  await expect(fetchResaleEstimate(input)).rejects.toThrow("incomplete estimate");
});

it("ends stalled searches with an actionable timeout", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  })));
  const pending = expect(fetchResaleEstimate(input)).rejects.toThrow("timed out");
  await vi.advanceTimersByTimeAsync(65000);
  await pending;
});
