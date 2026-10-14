import type { CarInput, ResaleEstimate } from "./types";
import { mileageAtSale } from "./lib/heloc";

function resaleBody(input: CarInput) {
  return {
    makeModel: input.makeModel,
    year: input.year,
    trim: input.trim,
    transmission: input.transmission,
    buyingPrice: input.buyingPrice,
    currentMileage: input.currentMileage,
    expectedMileageAtSale: mileageAtSale(input.currentMileage, input.yearlyMileage, input.ownershipYears),
    ownershipYears: input.ownershipYears,
    notes: input.aiNotes,
  };
}

export function resaleInputKey(input: CarInput): string { return JSON.stringify(resaleBody(input)); }

async function requestJson(url: string, body: unknown, signal?: AbortSignal) {
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) cancel();
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 65000);
  try {
    const res = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body), signal: controller.signal,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || `The search service is unavailable (${res.status}). Please retry.`);
    if (!data || typeof data !== "object") throw new Error("The search returned an unreadable response. Please retry.");
    return data;
  } catch (error) {
    if (timedOut) throw new Error("The search timed out. Your inputs are preserved; please retry.");
    if (error instanceof TypeError) throw new Error("Cannot reach the search service. Check your connection and retry.");
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
}

export async function fetchResaleEstimate(input: CarInput, excludedUrls: string[] = [], signal?: AbortSignal): Promise<ResaleEstimate> {
  const data = await requestJson("/api/estimate-resale", { ...resaleBody(input), excludedUrls }, signal);
  if (![data.conservativeResale, data.realisticResale, data.strongResale].every((v) => typeof v === "number" && Number.isFinite(v) && v >= 0) ||
      typeof data.explanation !== "string" || !Array.isArray(data.sources)) {
    throw new Error("The search returned an incomplete estimate. Your previous values are unchanged; please retry.");
  }
  data.sources = data.sources.filter((source: { url?: unknown; title?: unknown } | null) =>
    source && typeof source.url === "string" && /^https?:\/\//i.test(source.url) && typeof source.title === "string");
  return data;
}

/** Find year/model/trim-labeled photos through Commons or optional Google search. */
export async function fetchCarImages(query: {
  makeModel: string;
  year: number;
  trim: string;
  color: string;
}): Promise<string[]> {
  const data = await requestJson("/api/car-image", query);
  return Array.isArray(data.images) ? data.images : [];
}
