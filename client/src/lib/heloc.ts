import type { CarInput, HelocResult } from "../types";

export const TAX_RATE = 0.14975; // GST 5% + QST 9.975% (Quebec)
export const HELOC_RATE = 0.0445; // fixed annual HELOC interest
export const CURVE_ANNUAL_RATE = 0.15; // time-based declining-balance depreciation per year
export const CURVE_AVG_ANNUAL_KM = 15000; // "average driver" baseline for the mileage adjustment
export const CURVE_MILEAGE_SENSITIVITY = 0.004; // fraction of price gained/lost per 1000 km vs average
const CURVE_MILEAGE_FACTOR_MIN = 0.6;
const CURVE_MILEAGE_FACTOR_MAX = 1.4;

export function mileageAtSale(current: number, yearly: number, years: number): number {
  return current + yearly * years;
}

/**
 * Deterministic "classic" resale estimate, mileage-aware.
 *
 *   resale = price * (1 - CURVE_ANNUAL_RATE)^years * mileageFactor
 *   mileageFactor = 1 + (avgKmDriven - yourKmDriven) / 1000 * CURVE_MILEAGE_SENSITIVITY
 *
 * The time term is pure age depreciation; the mileage factor is exactly 1 at the
 * average-driver baseline (so no double counting) and rewards below-average use.
 * Clamped so the factor stays sane and resale never exceeds the purchase price.
 * Independent of the AI estimate — a formula baseline to sanity-check against.
 */
export function curveResale(buyingPrice: number, years: number, yearlyMileage: number): number {
  const timeFactor = (1 - CURVE_ANNUAL_RATE) ** years;
  const kmDelta = (CURVE_AVG_ANNUAL_KM - yearlyMileage) * years; // +ve = below average = premium
  const rawMileageFactor = 1 + (kmDelta / 1000) * CURVE_MILEAGE_SENSITIVITY;
  const mileageFactor = Math.min(CURVE_MILEAGE_FACTOR_MAX, Math.max(CURVE_MILEAGE_FACTOR_MIN, rawMileageFactor));
  const resale = buyingPrice * timeFactor * mileageFactor;
  return Math.round(Math.min(buyingPrice, Math.max(0, resale)));
}

export function calculateHeloc(input: CarInput, resaleValue: number): HelocResult {
  const months = input.ownershipYears * 12;
  const tax = input.buyingPrice * TAX_RATE;
  const totalPurchaseCost = input.buyingPrice + tax;
  const depreciationLoss = totalPurchaseCost - resaleValue;
  const monthlyDepreciation = months > 0 ? depreciationLoss / months : 0;
  const monthlyInterest = (totalPurchaseCost * HELOC_RATE) / 12;
  const totalMonthlyCost = monthlyDepreciation + monthlyInterest;
  const yearlyCost = totalMonthlyCost * 12;
  const totalOwnershipCost = totalMonthlyCost * months;

  const overContribution = input.husseinMonthly > totalMonthlyCost;
  const husseinMonthly = input.husseinMonthly;
  const abedMonthly = Math.max(0, totalMonthlyCost - husseinMonthly);

  return {
    tax,
    totalPurchaseCost,
    expectedMileageAtSale: mileageAtSale(input.currentMileage, input.yearlyMileage, input.ownershipYears),
    resaleValue,
    depreciationLoss,
    monthlyDepreciation,
    monthlyInterest,
    totalMonthlyCost,
    yearlyCost,
    totalOwnershipCost,
    husseinMonthly,
    abedMonthly,
    husseinTotal: husseinMonthly * months,
    abedTotal: abedMonthly * months,
    overContribution,
    months,
  };
}
