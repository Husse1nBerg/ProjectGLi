import { describe, it, expect } from "vitest";
import { TAX_RATE, HELOC_RATE, CURVE_ANNUAL_RATE, CURVE_AVG_ANNUAL_KM, mileageAtSale, calculateHeloc, curveResale } from "./heloc";
import type { CarInput } from "../types";

const base: CarInput = {
  makeModel: "Toyota Corolla",
  year: 2022,
  trim: "LE",
  buyingPrice: 30000,
  currentMileage: 20000,
  yearlyMileage: 15000,
  ownershipYears: 2,
  husseinMonthly: 200,
};

describe("constants", () => {
  it("uses Quebec tax and HELOC rates", () => {
    expect(TAX_RATE).toBe(0.14975);
    expect(HELOC_RATE).toBe(0.0445);
  });
  it("uses a 15%/yr classic depreciation rate", () => {
    expect(CURVE_ANNUAL_RATE).toBe(0.15);
  });
  it("uses a 15,000 km/yr average-driver baseline", () => {
    expect(CURVE_AVG_ANNUAL_KM).toBe(15000);
  });
});

describe("curveResale", () => {
  it("equals pure time depreciation at the average mileage", () => {
    // factor = 1 at avg km; 30000 * 0.85^2
    expect(curveResale(30000, 2, CURVE_AVG_ANNUAL_KM)).toBe(21675);
  });
  it("applies a premium for below-average mileage", () => {
    // 8000 km/yr vs 15000 avg over 2 yrs => +14000 km under => +5.6%
    expect(curveResale(30000, 2, 8000)).toBe(22889);
  });
  it("applies a discount for above-average mileage", () => {
    expect(curveResale(30000, 2, 25000)).toBeLessThan(curveResale(30000, 2, CURVE_AVG_ANNUAL_KM));
  });
  it("never exceeds the pre-tax purchase price", () => {
    expect(curveResale(30000, 2, 0)).toBeLessThanOrEqual(30000);
  });
  it("returns the full price for a zero-year hold", () => {
    expect(curveResale(30000, 0, 8000)).toBe(30000);
  });
});

describe("mileageAtSale", () => {
  it("adds yearly mileage over ownership years", () => {
    expect(mileageAtSale(20000, 15000, 2)).toBe(50000);
  });
});

describe("calculateHeloc", () => {
  const r = calculateHeloc(base, 22000);

  it("computes Quebec tax on the buying price", () => {
    expect(r.tax).toBeCloseTo(4492.5, 2); // 30000 * 0.14975
  });
  it("computes total purchase cost", () => {
    expect(r.totalPurchaseCost).toBeCloseTo(34492.5, 2);
  });
  it("computes depreciation loss vs resale", () => {
    expect(r.depreciationLoss).toBeCloseTo(12492.5, 2); // 34492.5 - 22000
  });
  it("computes monthly depreciation over the period", () => {
    expect(r.monthlyDepreciation).toBeCloseTo(520.52, 2); // 12492.5 / 24
  });
  it("computes monthly interest on full balance", () => {
    expect(r.monthlyInterest).toBeCloseTo(127.91, 2); // 34492.5 * 0.0445 / 12
  });
  it("computes total monthly cost", () => {
    expect(r.totalMonthlyCost).toBeCloseTo(648.43, 2);
  });
  it("computes yearly and total ownership cost", () => {
    expect(r.yearlyCost).toBeCloseTo(7781.166, 2);
    expect(r.totalOwnershipCost).toBeCloseTo(15562.332, 2);
  });
  it("splits payments: Abed pays the remainder", () => {
    expect(r.husseinMonthly).toBe(200);
    expect(r.abedMonthly).toBeCloseTo(448.43, 2);
    expect(r.husseinTotal).toBeCloseTo(4800, 2);
    expect(r.abedTotal).toBeCloseTo(10762.332, 2);
  });
  it("flags over-contribution and clamps Abed to >= 0", () => {
    const over = calculateHeloc({ ...base, husseinMonthly: 5000 }, 22000);
    expect(over.overContribution).toBe(true);
    expect(over.abedMonthly).toBe(0);
    expect(over.abedTotal).toBe(0);
  });
  it("handles resale above purchase cost (a gain) without crashing", () => {
    const gain = calculateHeloc(base, 40000);
    expect(gain.depreciationLoss).toBeCloseTo(-5507.5, 2);
  });
});
