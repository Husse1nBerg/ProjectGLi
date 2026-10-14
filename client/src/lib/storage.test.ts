import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadSavedCars, saveCar, removeCar, STORAGE_KEY } from "./storage";
import type { SavedCar } from "../types";

const sample: SavedCar = {
  id: "a1",
  label: "2022 Toyota Corolla",
  input: {
    makeModel: "Toyota Corolla", year: 2022, trim: "LE", transmission: "", buyingPrice: 30000,
    currentMileage: 20000, yearlyMileage: 15000, ownershipYears: 2, interestRate: 4.45,
    contributors: [
      { id: "c1", name: "Alpha", monthly: 200 },
      { id: "c2", name: "Beta", monthly: NaN },
    ],
    aiNotes: "",
  },
  resaleValue: 22000,
  scenario: "realistic",
  result: {
    tax: 4492.5, totalPurchaseCost: 34492.5, expectedMileageAtSale: 50000, resaleValue: 22000,
    depreciationLoss: 12492.5, monthlyDepreciation: 520.52, monthlyInterest: 127.91,
    totalMonthlyCost: 648.43, yearlyCost: 7781.16, totalOwnershipCost: 15562.32,
    contributors: [
      { name: "Alpha", monthly: 200, total: 4800 },
      { name: "Beta", monthly: 448.43, total: 10762.32 },
    ],
    overContribution: false, months: 24,
  },
};

beforeEach(() => localStorage.clear());

describe("storage", () => {
  it("returns [] when nothing saved", () => {
    expect(loadSavedCars()).toEqual([]);
  });
  it("saves and loads a car", () => {
    saveCar(sample);
    expect(loadSavedCars()).toHaveLength(1);
    expect(loadSavedCars()[0].id).toBe("a1");
  });
  it("removes a car by id", () => {
    saveCar(sample);
    removeCar("a1");
    expect(loadSavedCars()).toEqual([]);
  });
  it("tolerates corrupt storage", () => {
    localStorage.setItem(STORAGE_KEY, "not json");
    expect(loadSavedCars()).toEqual([]);
  });
  it("updates the same saved ID instead of adding a duplicate", () => {
    saveCar(sample);
    saveCar({ ...sample, resaleValue: 24000 });
    const cars = loadSavedCars();
    expect(cars).toHaveLength(1);
    expect(cars[0].result.resaleValue).toBe(24000);
  });
  it("skips malformed saved records", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([null, { id: "bad" }, sample]));
    expect(loadSavedCars()).toHaveLength(1);
  });
  it("reports a failed save instead of pretending it persisted", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    try { expect(() => saveCar(sample)).toThrow("quota"); }
    finally { spy.mockRestore(); }
  });
  it("drops malformed optional evidence and exclusions when restoring saved cars", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ ...sample, estimate: {}, excludedUrls: {} }]));
    expect(loadSavedCars()[0].estimate).toBeNull();
    expect(loadSavedCars()[0].excludedUrls).toEqual([]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ ...sample, estimate: {
      conservativeResale: 1, realisticResale: 2, strongResale: 3, explanation: "test", sources: [null],
    } }]));
    expect(loadSavedCars()[0].estimate?.sources).toEqual([]);
  });
});
