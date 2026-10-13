import { expect, it } from "vitest";
import type { CarInput } from "../types";
import { calculateHeloc } from "./heloc";
import { saleSettlement, sensitivityBaseline, sensitivityResult } from "./sale";

const input: CarInput = { makeModel: "Ford Focus", year: 2017, trim: "RS", transmission: "Manual", buyingPrice: 30000, currentMileage: 50000, yearlyMileage: 15000, ownershipYears: 2, interestRate: 5, contributors: [], aiNotes: "" };

it("keeps interest-only principal outstanding and does not count settlement twice", () => {
  const result = calculateHeloc(input, 25000);
  const sale = saleSettlement(result);
  expect(sale.principal).toBe(34492.5);
  expect(sale.proceedsApplied).toBe(25000);
  expect(sale.additionalCash).toBe(9492.5);
  expect(sale.excessProceeds).toBe(0);
  expect(result.totalOwnershipCost).toBeCloseTo(sale.additionalCash + result.monthlyInterest * result.months);
});

it("returns excess proceeds only after clearing all principal", () => {
  expect(saleSettlement({ totalPurchaseCost: 30000, resaleValue: 35000 })).toEqual({ principal: 30000, proceedsApplied: 30000, additionalCash: 0, excessProceeds: 5000 });
});

it("starts at the exact existing baseline and isolates rate changes", () => {
  const baseline = calculateHeloc(input, 25000);
  expect(sensitivityResult(input, 25000, sensitivityBaseline(input))).toEqual(baseline);
  const changed = sensitivityResult(input, 25000, { ...sensitivityBaseline(input), interestRate: 7 });
  expect(changed.resaleValue).toBe(25000);
  expect(changed.totalOwnershipCost - baseline.totalOwnershipCost).toBeCloseTo(baseline.totalPurchaseCost * .02 * 2);
});

it("reprices duration using the depreciation curve and applies resale changes once", () => {
  const changed = sensitivityResult(input, 25000, { interestRate: 5, resaleChange: -20, ownershipYears: 3 });
  expect(changed.resaleValue).toBeCloseTo(25000 * .85 * .8, 0);
  expect(changed.expectedMileageAtSale).toBe(95000);
  expect(changed.months).toBe(36);
});

it("rejects nonfinite and out-of-range controls", () => {
  for (const patch of [{ interestRate: NaN }, { interestRate: -1 }, { resaleChange: 101 }, { ownershipYears: 0 }, { ownershipYears: Infinity }]) {
    expect(() => sensitivityResult(input, 25000, { ...sensitivityBaseline(input), ...patch })).toThrow(RangeError);
  }
});
