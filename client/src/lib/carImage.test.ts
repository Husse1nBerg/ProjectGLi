import { describe, it, expect } from "vitest";
import { splitMakeModel, carImageUrl, extractColor } from "./carImage";

describe("splitMakeModel", () => {
  it("splits a simple make + model", () => {
    expect(splitMakeModel("Tesla Model 3")).toEqual({ make: "tesla", model: "model 3" });
  });
  it("normalizes single-word make aliases", () => {
    expect(splitMakeModel("VW Jetta GLI")).toEqual({ make: "volkswagen", model: "jetta gli" });
  });
  it("keeps two-word makes together", () => {
    expect(splitMakeModel("Land Rover Defender")).toEqual({ make: "land-rover", model: "defender" });
  });
  it("handles empty input", () => {
    expect(splitMakeModel("   ")).toEqual({ make: "", model: "" });
  });
});

describe("carImageUrl", () => {
  it("builds an imagin URL with make, model, and year", () => {
    const url = carImageUrl("Tesla Model 3", 2024);
    expect(url).toContain("cdn.imagin.studio/getimage");
    expect(url).toContain("make=tesla");
    expect(url).toContain("modelFamily=model+3");
    expect(url).toContain("modelYear=2024");
  });
  it("returns an empty string when there is no make", () => {
    expect(carImageUrl("", 2024)).toBe("");
  });
  it("omits the year when it is not a finite number", () => {
    expect(carImageUrl("Honda Civic", NaN)).not.toContain("modelYear");
  });
  it("adds a paintDescription when the notes mention a colour", () => {
    const url = carImageUrl("Ferrari 488", 2020, "garage kept, red, no accidents");
    expect(url).toContain("paintDescription=red");
  });
  it("has no paintDescription when no colour is mentioned", () => {
    expect(carImageUrl("Ferrari 488", 2020, "no accidents")).not.toContain("paintDescription");
  });
});

describe("extractColor", () => {
  it("finds a plain colour word", () => {
    expect(extractColor("garage kept, red, low km")).toBe("red");
  });
  it("includes a modifier before the colour", () => {
    expect(extractColor("gorgeous metallic blue paint")).toBe("metallic blue");
  });
  it("normalizes gray to grey", () => {
    expect(extractColor("nardo gray wrap")).toBe("grey");
  });
  it("returns empty when no colour is present", () => {
    expect(extractColor("winter tires, no accidents")).toBe("");
  });
});
