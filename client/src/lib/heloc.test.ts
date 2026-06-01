import { describe, it, expect } from "vitest";
import { TAX_RATE, HELOC_RATE, CURVE_ANNUAL_RATE, CURVE_AVG_ANNUAL_KM, mileageAtSale, calculateHeloc, curveResale, buildEquityRows } from "./heloc";
import type { CarInput } from "../types";

const base: CarInput = {
  makeModel: "Toyota Corolla",
  year: 2022,
  trim: "LE",
  transmission: "",
  buyingPrice: 30000,
  currentMileage: 20000,
  yearlyMileage: 15000,
  ownershipYears: 2,
  interestRate: 4.45,
  contributors: [
    { id: "c1", name: "Alpha", monthly: 200 },
    { id: "c2", name: "Beta", monthly: NaN }, // last = remainder
  ],
  aiNotes: "",
};

describe("constants", () => {
  it("uses combined sales tax and HELOC rates", () => {
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
    expect(curveResale(30000, 2, CURVE_AVG_ANNUAL_KM)).toBe(21675);
  });
  it("applies a premium for below-average mileage", () => {
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

describe("calculateHeloc — cost", () => {
  const r = calculateHeloc(base, 22000);

  it("computes sales tax on the buying price", () => {
    expect(r.tax).toBeCloseTo(4492.5, 2); // 30000 * 0.14975
  });
  it("computes total purchase cost", () => {
    expect(r.totalPurchaseCost).toBeCloseTo(34492.5, 2);
  });
  it("computes depreciation loss vs resale", () => {
    expect(r.depreciationLoss).toBeCloseTo(12492.5, 2);
  });
  it("computes monthly depreciation, interest, total", () => {
    expect(r.monthlyDepreciation).toBeCloseTo(520.52, 2);
    expect(r.monthlyInterest).toBeCloseTo(127.91, 2);
    expect(r.totalMonthlyCost).toBeCloseTo(648.43, 2);
  });
  it("uses an overridden interest rate when provided", () => {
    const r6 = calculateHeloc({ ...base, interestRate: 6 }, 22000);
    expect(r6.monthlyInterest).toBeCloseTo((34492.5 * 0.06) / 12, 2); // 172.46
  });
  it("falls back to 4.45% when the rate is blank/invalid", () => {
    const rNan = calculateHeloc({ ...base, interestRate: NaN }, 22000);
    expect(rNan.monthlyInterest).toBeCloseTo(127.91, 2);
  });
  it("computes yearly and total ownership cost", () => {
    expect(r.yearlyCost).toBeCloseTo(7781.166, 2);
    expect(r.totalOwnershipCost).toBeCloseTo(15562.332, 2);
  });
  it("handles resale above purchase cost (a gain) without crashing", () => {
    expect(calculateHeloc(base, 40000).depreciationLoss).toBeCloseTo(-5507.5, 2);
  });
});

describe("calculateHeloc — contributor split", () => {
  it("the last contributor pays the remainder", () => {
    const r = calculateHeloc(base, 22000);
    expect(r.contributors).toHaveLength(2);
    expect(r.contributors[0]).toMatchObject({ name: "Alpha", monthly: 200 });
    expect(r.contributors[0].total).toBeCloseTo(4800, 2);
    expect(r.contributors[1].name).toBe("Beta");
    expect(r.contributors[1].monthly).toBeCloseTo(448.43, 2);
    expect(r.contributors[1].total).toBeCloseTo(10762.332, 2);
  });

  it("supports three contributors; last absorbs the remainder", () => {
    const r = calculateHeloc(
      { ...base, contributors: [
        { id: "a", name: "A", monthly: 200 },
        { id: "b", name: "B", monthly: 100 },
        { id: "c", name: "C", monthly: NaN },
      ] },
      22000
    );
    expect(r.contributors.map((c) => c.monthly.toFixed(2))).toEqual(["200.00", "100.00", "348.43"]);
    const sum = r.contributors.reduce((s, c) => s + c.monthly, 0);
    expect(sum).toBeCloseTo(r.totalMonthlyCost, 6);
  });

  it("flags over-contribution and clamps the remainder to >= 0", () => {
    const over = calculateHeloc(
      { ...base, contributors: [{ id: "a", name: "A", monthly: 5000 }, { id: "b", name: "B", monthly: NaN }] },
      22000
    );
    expect(over.overContribution).toBe(true);
    expect(over.contributors[1].monthly).toBe(0);
    expect(over.contributors[1].total).toBe(0);
  });

  it("treats an empty (NaN) entered amount as 0", () => {
    const r = calculateHeloc(
      { ...base, contributors: [{ id: "a", name: "A", monthly: NaN }, { id: "b", name: "B", monthly: NaN }] },
      22000
    );
    expect(r.contributors[0].monthly).toBe(0);
    expect(r.contributors[1].monthly).toBeCloseTo(r.totalMonthlyCost, 6);
  });
});

describe("buildEquityRows", () => {
  const baseline = calculateHeloc(base, 22000);

  it("returns equity = resale minus the break-even baseline", () => {
    const [strong] = buildEquityRows(baseline, [{ label: "Strong", resale: 28000 }]);
    expect(strong.equity).toBe(6000);
  });

  it("shows a negative equity (shortfall) when selling below the baseline", () => {
    const [weak] = buildEquityRows(baseline, [{ label: "Weak", resale: 18000 }]);
    expect(weak.equity).toBe(-4000);
    expect(weak.contributorEquity[0]).toBeLessThan(0);
  });

  it("splits equity in proportion to each payer's total contribution", () => {
    const [strong] = buildEquityRows(baseline, [{ label: "Strong", resale: 28000 }]);
    const total = baseline.contributors.reduce((s, c) => s + c.total, 0);
    expect(strong.contributorEquity[0]).toBeCloseTo(6000 * (baseline.contributors[0].total / total), 6);
    expect(strong.contributorEquity.reduce((s, e) => s + e, 0)).toBeCloseTo(6000, 6);
    expect(strong.contributorEquity).toHaveLength(baseline.contributors.length);
  });

  it("filters out non-finite reference prices", () => {
    const rows = buildEquityRows(baseline, [{ label: "n/a", resale: NaN }, { label: "ok", resale: 25000 }]);
    expect(rows).toHaveLength(1);
    expect(rows[0].label).toBe("ok");
  });
});
