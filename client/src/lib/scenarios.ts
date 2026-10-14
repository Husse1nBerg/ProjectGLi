import type { CarInput, SavedCar, Scenario } from "../types";

export interface ScenarioSnapshot { input: CarInput; resaleValue: number; scenario: Scenario }
const scenarios: Scenario[] = ["conservative", "realistic", "strong", "curve"];
const numeric = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : NaN;
const text = (value: unknown) => typeof value === "string" ? value : "";

/** Null represents an unfinished numeric field in JSON drafts and old saved cars. */
export function readSnapshot(value: unknown, allowIncomplete = false): ScenarioSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (!raw.input || typeof raw.input !== "object") return null;
  const source = raw.input as Record<string, unknown>;
  if (!Array.isArray(source.contributors) || source.contributors.length < 2 || source.contributors.length > 3) return null;
  if (source.contributors.some((c) => !c || typeof c !== "object")) return null;
  const input: CarInput = {
    makeModel: text(source.makeModel), trim: text(source.trim), transmission: text(source.transmission), aiNotes: text(source.aiNotes),
    year: numeric(source.year), buyingPrice: numeric(source.buyingPrice), currentMileage: numeric(source.currentMileage),
    yearlyMileage: numeric(source.yearlyMileage), ownershipYears: numeric(source.ownershipYears), interestRate: numeric(source.interestRate),
    contributors: source.contributors.map((c, i) => ({ id: text(c.id) || `restored-${i}`, name: text(c.name), monthly: numeric(c.monthly) })),
  };
  const resaleValue = numeric(raw.resaleValue);
  if (!allowIncomplete && (
    !input.makeModel.trim() || !Number.isInteger(input.year) || input.year < 1886 || input.year > 2100 ||
    !Number.isFinite(input.buyingPrice) || input.buyingPrice <= 0 ||
    !Number.isFinite(input.ownershipYears) || input.ownershipYears <= 0 ||
    !Number.isFinite(input.currentMileage) || input.currentMileage < 0 ||
    !Number.isFinite(input.yearlyMileage) || input.yearlyMileage < 0 ||
    !Number.isFinite(resaleValue) || resaleValue < 0 ||
    input.contributors.slice(0, -1).some((c) => !Number.isFinite(c.monthly) || c.monthly < 0)
  )) return null;
  return { input, resaleValue, scenario: scenarios.includes(raw.scenario as Scenario) ? raw.scenario as Scenario : "realistic" };
}

export function scenarioLink(snapshot: ScenarioSnapshot, baseUrl: string): string {
  const url = new URL(baseUrl);
  url.hash = `scenario=${encodeURIComponent(JSON.stringify({ version: 1, input: snapshot.input, resaleValue: snapshot.resaleValue, scenario: snapshot.scenario }))}`;
  return url.href;
}

export function readSharedScenario(hash: string): ScenarioSnapshot | null {
  if (!hash.startsWith("#scenario=") || hash.length > 30000) return null;
  try {
    const value = JSON.parse(decodeURIComponent(hash.slice(10)));
    return value.version === 1 ? readSnapshot(value) : null;
  } catch { return null; }
}

/** Quote cells and neutralize spreadsheet formula prefixes in user-entered text. */
function csvCell(value: string | number): string {
  const safe = typeof value === "string" && /^[\s]*[=+@-]/.test(value) ? `'${value}` : String(value);
  return `"${safe.replace(/"/g, '""')}"`;
}

export function comparisonCsv(cars: SavedCar[]): string {
  const rows: (string | number)[][] = [[
    "Vehicle", "Trim", "Ownership years", "Annual HELOC rate (%)", "Purchase price (CAD)",
    "Purchase including tax (CAD)", "Resale (CAD)", "Monthly cost (CAD)", "Total cost (CAD)",
    "Principal at sale (CAD)", "Cash needed after sale (CAD)", "Saved at",
  ]];
  for (const car of cars) rows.push([
    car.label, car.input.trim, car.input.ownershipYears,
    Number.isFinite(car.input.interestRate) && car.input.interestRate >= 0 ? car.input.interestRate : 4.45,
    car.input.buyingPrice, car.result.totalPurchaseCost, car.resaleValue, car.result.totalMonthlyCost,
    car.result.totalOwnershipCost, car.result.totalPurchaseCost,
    Math.max(0, car.result.totalPurchaseCost - car.resaleValue), car.savedAt || "",
  ]);
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
