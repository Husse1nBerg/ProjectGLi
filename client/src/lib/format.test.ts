import { describe, it, expect } from "vitest";
import { formatCAD, formatKm } from "./format";

describe("formatCAD", () => {
  it("formats whole dollars in CAD", () => {
    expect(formatCAD(34492.5)).toBe("$34,492.50");
  });
  it("formats zero", () => {
    expect(formatCAD(0)).toBe("$0.00");
  });
});

describe("formatKm", () => {
  it("formats kilometres with a km suffix", () => {
    expect(formatKm(50000)).toBe("50,000 km");
  });
});
