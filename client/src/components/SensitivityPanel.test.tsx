import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { CarInput } from "../types";
import SensitivityPanel from "./SensitivityPanel";

const input: CarInput = { makeModel: "Ford Focus", year: 2017, trim: "RS", transmission: "Manual", buyingPrice: 30000, currentMileage: 50000, yearlyMileage: 15000, ownershipYears: 2, interestRate: 5, contributors: [], aiNotes: "" };
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div"); document.body.append(container);
  root = createRoot(container);
  act(() => root.render(<SensitivityPanel input={input} resaleValue={25000} />));
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

function change(label: string, value: string) {
  const field = container.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

it("updates what-if results without mutating the baseline and resets on request", () => {
  const before = container.querySelector("tbody")!.textContent;
  change("What-if annual rate", "7");
  expect(container.querySelector("tbody")!.textContent).not.toBe(before);
  expect(input.interestRate).toBe(5);
  act(() => container.querySelector<HTMLButtonElement>("button")!.click());
  expect(container.querySelector("tbody")!.textContent).toBe(before);
});

it("resets controls when switching the baseline and hides invalid results", () => {
  change("What-if resale change", "-20");
  act(() => root.render(<SensitivityPanel input={{ ...input, makeModel: "Honda Civic", interestRate: 6 }} resaleValue={22000} />));
  expect(container.querySelector<HTMLInputElement>('input[aria-label="What-if resale change"]')!.value).toBe("0");
  expect(container.querySelector<HTMLInputElement>('input[aria-label="What-if annual rate"]')!.value).toBe("6");
  change("What-if ownership years", "");
  expect(container.querySelector('[role="alert"]')).not.toBeNull();
  expect(container.querySelector("table")).toBeNull();
});
