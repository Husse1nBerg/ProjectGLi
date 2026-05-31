import type { CarInput, HelocResult, EquityRow } from "../types";

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

/**
 * Equity upside/downside vs the break-even assumption.
 *
 * The monthly split is sized to break even at `baseline.resaleValue` (it covers
 * depreciation + interest exactly, leaving no equity). If the car actually sells
 * for a different price, the difference is equity returned (or a shortfall),
 * split between the two payers in proportion to what each contributed.
 */
export function buildEquityRows(
  baseline: HelocResult,
  refs: { label: string; resale: number }[]
): EquityRow[] {
  const totalContrib = baseline.contributors.reduce((s, c) => s + c.total, 0);
  const n = baseline.contributors.length;
  const shares = baseline.contributors.map((c) => (totalContrib > 0 ? c.total / totalContrib : 1 / n));
  return refs
    .filter((r) => Number.isFinite(r.resale))
    .map((r) => {
      const equity = r.resale - baseline.resaleValue;
      return {
        label: r.label,
        resale: r.resale,
        equity,
        contributorEquity: shares.map((s) => equity * s),
      };
    });
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

  // First N-1 contributors enter explicit monthly amounts; the LAST pays the remainder.
  const list = input.contributors;
  const n = list.length;
  const amount = (c: { monthly: number }) => (Number.isNaN(c.monthly) ? 0 : c.monthly);
  const enteredSum = list.slice(0, Math.max(0, n - 1)).reduce((s, c) => s + amount(c), 0);
  const remainder = Math.max(0, totalMonthlyCost - enteredSum);
  const overContribution = enteredSum > totalMonthlyCost + 1e-6;

  const contributors = list.map((c, i) => {
    const monthly = i < n - 1 ? amount(c) : remainder;
    return { name: c.name, monthly, total: monthly * months };
  });

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
    contributors,
    overContribution,
    months,
  };
}
