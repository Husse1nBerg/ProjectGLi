import { describe, it, expect, beforeEach } from "vitest";
import { loadSavedCars, saveCar, removeCar, STORAGE_KEY } from "./storage";
import type { SavedCar } from "../types";

const sample: SavedCar = {
  id: "a1",
  label: "2022 Toyota Corolla",
  input: {
    makeModel: "Toyota Corolla", year: 2022, trim: "LE", transmission: "", buyingPrice: 30000,
    currentMileage: 20000, yearlyMileage: 15000, ownershipYears: 2,
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
});
