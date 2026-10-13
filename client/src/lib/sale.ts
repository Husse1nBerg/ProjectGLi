import type { CarInput, HelocResult } from "../types";
import { calculateHeloc, curveResale, HELOC_RATE } from "./heloc";

/** Interest-only financing: the depreciation allowance does not repay principal.
 * FCAC: https://www.canada.ca/en/financial-consumer-agency/services/loans/loans-lines-credit.html
 */
export function saleSettlement(result: Pick<HelocResult, "totalPurchaseCost" | "resaleValue">) {
  const principal = result.totalPurchaseCost;
  const proceeds = result.resaleValue;
  return {
    principal,
    proceedsApplied: Math.min(principal, proceeds),
    additionalCash: Math.max(0, principal - proceeds),
    excessProceeds: Math.max(0, proceeds - principal),
  };
}

export interface SensitivitySettings {
  interestRate: number;
  resaleChange: number;
  ownershipYears: number;
}

export function sensitivityBaseline(input: CarInput): SensitivitySettings {
  return {
    interestRate: Number.isFinite(input.interestRate) && input.interestRate >= 0 ? input.interestRate : HELOC_RATE * 100,
    resaleChange: 0,
    ownershipYears: input.ownershipYears,
  };
}

export function sensitivityResult(input: CarInput, resaleValue: number, settings: SensitivitySettings) {
  if (!Number.isFinite(settings.interestRate) || settings.interestRate < 0 || settings.interestRate > 100
    || !Number.isFinite(settings.resaleChange) || settings.resaleChange < -100 || settings.resaleChange > 100
    || !Number.isFinite(settings.ownershipYears) || settings.ownershipYears < 1 / 12 || settings.ownershipYears > 30) {
    throw new RangeError("Use a rate from 0–100%, resale change from −100–100%, and ownership from 1 month–30 years.");
  }
  // A normalized price avoids rounding small purchase prices down to a zero denominator.
  const reference = curveResale(1_000_000, input.ownershipYears, input.yearlyMileage);
  const adjusted = curveResale(1_000_000, settings.ownershipYears, input.yearlyMileage);
  const durationFactor = settings.ownershipYears === input.ownershipYears ? 1 : adjusted / Math.max(1, reference);
  const scenarioResale = Math.max(0, resaleValue * durationFactor * (1 + settings.resaleChange / 100));
  return calculateHeloc({ ...input, interestRate: settings.interestRate, ownershipYears: settings.ownershipYears }, scenarioResale);
}
