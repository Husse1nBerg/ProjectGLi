import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "./App";
import { fetchResaleEstimate } from "./api";
import { DRAFT_KEY, loadSavedCars } from "./lib/storage";
import { scenarioLink, type ScenarioSnapshot } from "./lib/scenarios";
import type { ResaleEstimate } from "./types";

vi.mock("./api", async (original) => ({ ...await original<typeof import("./api")>(), fetchResaleEstimate: vi.fn() }));
const draft: ScenarioSnapshot = { input: {
  makeModel: "Ford Focus", year: 2017, trim: "RS", transmission: "Manual", buyingPrice: 30000,
  currentMileage: 50000, yearlyMileage: 15000, ownershipYears: 2, interestRate: 4.45, aiNotes: "",
  contributors: [{ id: "one", name: "A", monthly: 200 }, { id: "two", name: "B", monthly: NaN }],
}, resaleValue: 22000, scenario: "realistic" };
const estimate: ResaleEstimate = { conservativeResale: 20000, realisticResale: 23000, strongResale: 25000,
  explanation: "Comparable cars", searchedAt: "2026-10-13T12:00:00Z", sources: [{ url: "https://example.com/car", title: "Example car" }] };
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.mocked(fetchResaleEstimate).mockReset();
  localStorage.clear();
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  history.replaceState({}, "", "/");
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function mount() { act(() => root.render(<App />)); }
function field(label: string) {
  const wrapper = [...container.querySelectorAll("label")].find((el) => el.textContent?.startsWith(label));
  const input = wrapper?.querySelector("input");
  if (!input) throw new Error(`Missing field ${label}`);
  return input;
}
function edit(label: string, value: string) {
  act(() => {
    const input = field(label);
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function click(label: string) {
  const button = [...container.querySelectorAll("button")].find((el) => el.textContent === label);
  if (!button) throw new Error(`Missing button ${label}`);
  await act(async () => button.click());
}

it("restores inputs, updates an existing comparison, and reopens a saved calculation", async () => {
  mount();
  expect(field("Make / Model").value).toBe("Ford Focus");
  await click("Save to comparison");
  edit("Buying price", "32000");
  await click("Update saved comparison");
  expect(loadSavedCars()).toHaveLength(1);
  expect(loadSavedCars()[0].input.buyingPrice).toBe(32000);
  edit("Buying price", "35000");
  await click("Open / edit");
  expect(field("Buying price").value).toBe("32000");
  await click("Save as new comparison");
  expect(loadSavedCars()).toHaveLength(2);
});

it("preserves inputs and results after failure, then retries with excluded sources", async () => {
  mount();
  vi.mocked(fetchResaleEstimate).mockRejectedValueOnce(new Error("Service unavailable"));
  await click("Estimate resale value (AI)");
  expect(container.textContent).toContain("Service unavailable");
  expect(field("Resale value").value).toBe("22000");
  vi.mocked(fetchResaleEstimate).mockResolvedValue(estimate);
  await click("Retry listing search");
  expect(field("Resale value").value).toBe("23000");
  const exclude = container.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  act(() => exclude.click());
  expect(field("Resale value").value).toBe("23000");
  await click("Re-estimate without excluded sources");
  expect(vi.mocked(fetchResaleEstimate).mock.calls.at(-1)?.[1]).toEqual(["https://example.com/car"]);
});

it("late search results cannot overwrite a manual resale edit", async () => {
  let finish!: (value: ResaleEstimate) => void;
  vi.mocked(fetchResaleEstimate).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  mount();
  await click("Estimate resale value (AI)");
  edit("Resale value", "19500");
  await act(async () => finish(estimate));
  expect(field("Resale value").value).toBe("19500");
  expect(container.textContent).not.toContain("Searching listings…");
});

it("restores a shared scenario and flags stale evidence after changing vehicles", async () => {
  history.replaceState({}, "", scenarioLink({ ...draft, resaleValue: 21000 }, window.location.href));
  mount();
  expect(field("Resale value").value).toBe("21000");
  expect(window.location.hash).toBe("");
  vi.mocked(fetchResaleEstimate).mockResolvedValue(estimate);
  await click("Estimate resale value (AI)");
  edit("Make / Model", "Honda Civic");
  expect(container.textContent).toContain("Vehicle details changed since this estimate");
  expect(field("Resale value").value).toBe("23000");
});

it("selecting the offline curve prevents a pending AI estimate from replacing it", async () => {
  let finish!: (value: ResaleEstimate) => void;
  vi.mocked(fetchResaleEstimate).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  mount();
  await click("Estimate resale value (AI)");
  const curve = [...container.querySelectorAll("button")].find((button) => button.textContent?.startsWith("Depreciation curve"))!;
  act(() => curve.click());
  const chosen = field("Resale value").value;
  await act(async () => finish(estimate));
  expect(field("Resale value").value).toBe(chosen);
  expect(chosen).not.toBe("23000");
});

it("keeps working when browser storage cannot be written", async () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
  mount();
  expect(container.textContent).toContain("Browser storage is unavailable");
  await click("Save to comparison");
  expect(container.textContent).toContain("Could not save");
  expect(field("Resale value").value).toBe("22000");
});

it("shows a share link and brings it into view without including AI evidence", async () => {
  mount();
  vi.mocked(fetchResaleEstimate).mockResolvedValue(estimate);
  await click("Estimate resale value (AI)");
  await click("Share calculation");
  const link = container.querySelector<HTMLInputElement>('input[aria-label="Share calculation link"]')!.value;
  const data = JSON.parse(decodeURIComponent(new URL(link).hash.slice(10)));
  expect(data.input.makeModel).toBe("Ford Focus");
  expect(data).not.toHaveProperty("estimate");
  expect(data).not.toHaveProperty("sources");
  expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
});
