import { describe, it, expect } from "vitest";
import { TAX_RATE, HELOC_RATE, mileageAtSale, calculateHeloc } from "./heloc";
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
