import type { CarInput, HelocResult } from "../types";

export const TAX_RATE = 0.14975; // GST 5% + QST 9.975% (Quebec)
export const HELOC_RATE = 0.0445; // fixed annual HELOC interest
export const CURVE_ANNUAL_RATE = 0.15; // classic declining-balance depreciation per year

export function mileageAtSale(current: number, yearly: number, years: number): number {
  return current + yearly * years;
}

/**
 * Deterministic "classic" resale estimate: declining-balance depreciation
 * applied to the pre-tax purchase price. resale = price * (1 - rate)^years.
 * Independent of the AI estimate — a formula baseline to sanity-check against.
 */
export function curveResale(buyingPrice: number, years: number): number {
  return Math.round(buyingPrice * (1 - CURVE_ANNUAL_RATE) ** years);
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
