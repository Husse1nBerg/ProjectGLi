import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import EvidencePanel from "./EvidencePanel";
import type { ResaleEstimate } from "../types";

let container: HTMLDivElement;
let root: Root;
const estimate: ResaleEstimate = {
  conservativeResale: 18000, realisticResale: 20000, strongResale: 22000,
  explanation: "A different model year makes this a weak comparison.",
  searchedAt: "2026-10-13T12:00:00.000Z",
  sources: [{ url: "https://dealer.example/car", title: "Dealer listing",
    vehicle: "2022 Volkswagen Jetta GLI", priceCAD: 25000, mileageKm: null,
    location: "Ottawa", matchNotes: "Asking price; availability unknown.", provenance: "provider-citation" }],
};

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

it("shows comparable evidence, uncertainty and search time", () => {
  act(() => root.render(<EvidencePanel estimate={estimate} excludedUrls={[]} onExcludedUrlsChange={vi.fn()} />));
  expect(container.textContent).toContain("2022 Volkswagen Jetta GLI");
  expect(container.textContent).toContain("$25,000 CAD");
  expect(container.textContent).toContain("Unknown");
  expect(container.textContent).toContain("Asking price; availability unknown.");
  expect(container.textContent).toContain("not independently verified");
  expect(container.querySelector("time")?.dateTime).toBe(estimate.searchedAt);
  expect(container.querySelector("a")?.href).toBe(estimate.sources[0].url);
});

it("supports legacy sources without inventing comparable facts or a search date", () => {
  const legacy = { ...estimate, searchedAt: undefined, sources: [{ url: "https://dealer.example/car", title: "Legacy citation" }] };
  act(() => root.render(<EvidencePanel estimate={legacy} excludedUrls={[]} onExcludedUrlsChange={vi.fn()} />));
  expect(container.textContent).toContain("Search date unavailable");
  expect(container.querySelectorAll("dd")).toHaveLength(4);
  expect([...container.querySelectorAll("dd")].every((item) => item.textContent === "Unknown")).toBe(true);
  expect(container.textContent).toContain("Citation origin unavailable");
});

it("marks exclusions for a future search and allows restoring all sources", () => {
  const change = vi.fn();
  act(() => root.render(<EvidencePanel estimate={estimate} excludedUrls={[]} onExcludedUrlsChange={change} />));
  act(() => container.querySelector("input")!.click());
  expect(change).toHaveBeenLastCalledWith([estimate.sources[0].url]);
  expect(container.textContent).toContain("They do not recalculate");
  act(() => root.render(<EvidencePanel estimate={estimate} excludedUrls={[estimate.sources[0].url]} onExcludedUrlsChange={change} />));
  expect(container.querySelector("input")?.checked).toBe(true);
  act(() => container.querySelector("button")!.click());
  expect(change).toHaveBeenLastCalledWith([]);
});

it("shows missing evidence and ignores malformed dates", () => {
  act(() => root.render(<EvidencePanel estimate={{ ...estimate, searchedAt: "invalid", sources: [] }} excludedUrls={[]} onExcludedUrlsChange={vi.fn()} />));
  expect(container.textContent).toContain("No comparable sources returned");
  expect(container.textContent).toContain("Search date unavailable");
});
