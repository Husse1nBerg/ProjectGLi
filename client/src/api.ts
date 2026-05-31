import type { CarInput, ResaleEstimate } from "./types";
import { mileageAtSale } from "./lib/heloc";

export async function fetchResaleEstimate(input: CarInput): Promise<ResaleEstimate> {
  const body = {
    makeModel: input.makeModel,
    year: input.year,
    trim: input.trim,
    buyingPrice: input.buyingPrice,
    currentMileage: input.currentMileage,
    expectedMileageAtSale: mileageAtSale(input.currentMileage, input.yearlyMileage, input.ownershipYears),
    ownershipYears: input.ownershipYears,
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
