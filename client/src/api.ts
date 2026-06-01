import type { CarInput, ResaleEstimate } from "./types";
import { mileageAtSale } from "./lib/heloc";

export async function fetchResaleEstimate(input: CarInput): Promise<ResaleEstimate> {
  const body = {
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
  const res = await fetch("/api/estimate-resale", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

/** Find real candidate photo URLs of the exact vehicle (color-aware) via OpenAI web search. */
export async function fetchCarImages(query: {
  makeModel: string;
  year: number;
  trim: string;
  color: string;
}): Promise<string[]> {
  const res = await fetch("/api/car-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  const data = await res.json();
  return Array.isArray(data.images) ? data.images : [];
}
