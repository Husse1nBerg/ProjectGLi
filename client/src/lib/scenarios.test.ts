import { describe, expect, it } from "vitest";
import { comparisonCsv, readSharedScenario, readSnapshot, scenarioLink, type ScenarioSnapshot } from "./scenarios";
import { calculateHeloc } from "./heloc";

const snapshot: ScenarioSnapshot = { input: {
  makeModel: "Ford Focus", year: 2017, trim: "RS", transmission: "Manual", buyingPrice: 30000,
  currentMileage: 70000, yearlyMileage: 15000, ownershipYears: 2, interestRate: NaN, aiNotes: "Été & hiver",
  contributors: [{ id: "1", name: "A", monthly: 200 }, { id: "2", name: "B", monthly: NaN }],
}, resaleValue: 22000, scenario: "realistic" };

describe("scenario sharing", () => {
  it("round-trips unicode and unfinished optional numbers without sending inputs to a server", () => {
    const link = new URL(scenarioLink(snapshot, "https://example.com/#old"));
    expect(link.search).toBe("");
    expect(readSharedScenario(link.hash)).toEqual(snapshot);
  });
  it("rejects malformed and invalid shared inputs", () => {
    expect(readSharedScenario("#scenario=%broken")).toBeNull();
    expect(readSharedScenario("#scenario=" + encodeURIComponent('{"version":9}'))).toBeNull();
    expect(readSnapshot({ ...snapshot, resaleValue: -1 })).toBeNull();
    expect(readSnapshot({ ...snapshot, input: { ...snapshot.input, contributors: [] } })).toBeNull();
  });
  it("recovers blank inputs in drafts without treating JSON null as zero", () => {
    const draft = readSnapshot(JSON.parse(JSON.stringify({ ...snapshot, resaleValue: NaN,
      input: { ...snapshot.input, buyingPrice: NaN } })), true);
    expect(draft?.input.buyingPrice).toBeNaN();
    expect(draft?.resaleValue).toBeNaN();
  });
  it("exports assumptions and loan shortfall and neutralizes spreadsheet formulas", () => {
    const csv = comparisonCsv([{ ...snapshot, id: "a", label: '=HYPERLINK("bad")',
      result: calculateHeloc(snapshot.input, snapshot.resaleValue) }]);
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
    expect(csv).toContain("Cash needed after sale (CAD)");
    expect(csv).toContain('"4.45"');
    expect(csv).toContain('"12492.5"');
  });
});
