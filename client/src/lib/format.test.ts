import { describe, it, expect } from "vitest";
import { formatCAD, formatCAD0, formatKm } from "./format";

describe("formatCAD", () => {
  it("formats whole dollars in CAD", () => {
    expect(formatCAD(34492.5)).toBe("$34,492.50");
  });
  it("formats zero", () => {
    expect(formatCAD(0)).toBe("$0.00");
  });
});

describe("formatCAD0", () => {
  it("formats whole dollars with no cents", () => {
    expect(formatCAD0(20000)).toBe("$20,000");
  });
  it("rounds fractional values to the nearest dollar", () => {
    expect(formatCAD0(23651.6)).toBe("$23,652");
  });
});

describe("formatKm", () => {
  it("formats kilometres with a km suffix", () => {
    expect(formatKm(50000)).toBe("50,000 km");
  });
});
