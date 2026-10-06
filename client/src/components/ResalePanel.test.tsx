import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ResalePanel from "./ResalePanel";
import { fetchCarImages } from "../api";

vi.mock("../api", () => ({ fetchCarImages: vi.fn() }));

let container: HTMLDivElement;
let root: Root;
const props = {
  estimate: null, scenario: "curve" as const, resaleValue: 20000, curveValue: 20000,
  loading: false, error: null, onEstimate: vi.fn(), onScenario: vi.fn(),
  onResaleEdit: vi.fn(), transmission: "", aiNotes: "",
  onTransmissionChange: vi.fn(), onNotesChange: vi.fn(),
  makeModel: "Volkswagen Jetta", year: 2022, trim: "GLI",
};

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.mocked(fetchCarImages).mockReset();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(<ResalePanel {...props} />));
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function clickFetch() {
  const button = [...container.querySelectorAll("button")]
    .find((element) => element.textContent === "Fetch vehicle image");
  button!.click();
}

it("clears a previously loaded photo when the vehicle changes", async () => {
  vi.mocked(fetchCarImages).mockResolvedValue(["https://example.com/jetta.jpg"]);
  await act(async () => clickFetch());
  expect(container.querySelector("img")?.src).toContain("jetta.jpg");
  act(() => root.render(<ResalePanel {...props} makeModel="Honda Civic" />));
  expect(container.querySelector("img")).toBeNull();
});

it("ignores an old vehicle lookup that finishes after switching vehicles", async () => {
  let resolve!: (images: string[]) => void;
  vi.mocked(fetchCarImages).mockImplementation(() => new Promise((done) => { resolve = done; }));
  act(() => clickFetch());
  act(() => root.render(<ResalePanel {...props} makeModel="Honda Civic" />));
  await act(async () => resolve(["https://example.com/jetta.jpg"]));
  expect(container.querySelector("img")).toBeNull();
  expect(container.textContent).toContain("Fetch vehicle image");
});
