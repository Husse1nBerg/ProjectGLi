import { useEffect, useMemo, useState } from "react";
import type { CarInput, HelocResult, ResaleEstimate, SavedCar, Scenario } from "./types";
import { calculateHeloc, curveResale, buildEquityRows } from "./lib/heloc";
import { loadSavedCars, saveCar, removeCar } from "./lib/storage";
import { fetchResaleEstimate } from "./api";
import InputForm from "./components/InputForm";
import ResalePanel from "./components/ResalePanel";
import ResultsDashboard from "./components/ResultsDashboard";
import ComparisonTable from "./components/ComparisonTable";

const defaultInput: CarInput = {
  makeModel: "",
  year: 2022,
  trim: "",
  transmission: "",
  buyingPrice: NaN,
  currentMileage: NaN,
  yearlyMileage: 15000,
  ownershipYears: 2,
  husseinMonthly: NaN,
  aiNotes: "",
};

const scenarioField: Record<Exclude<Scenario, "curve">, keyof ResaleEstimate> = {
  conservative: "conservativeResale",
  realistic: "realisticResale",
  strong: "strongResale",
};

function validate(input: CarInput): Partial<Record<keyof CarInput, string>> {
  const errors: Partial<Record<keyof CarInput, string>> = {};
  if (!input.makeModel.trim()) errors.makeModel = "Required";
  const positive: (keyof CarInput)[] = ["buyingPrice", "ownershipYears"];
  for (const k of positive) {
    const v = input[k] as number;
    if (Number.isNaN(v) || v <= 0) errors[k] = "Must be > 0";
  }
  const nonNeg: (keyof CarInput)[] = ["currentMileage", "yearlyMileage", "husseinMonthly"];
  for (const k of nonNeg) {
    const v = input[k] as number;
    if (Number.isNaN(v) || v < 0) errors[k] = "Must be ≥ 0";
  }
  return errors;
}

let idCounter = 0;

export default function App() {
  const [input, setInput] = useState<CarInput>(defaultInput);
  const [estimate, setEstimate] = useState<ResaleEstimate | null>(null);
  const [scenario, setScenario] = useState<Scenario>("realistic");
  const [resaleValue, setResaleValue] = useState<number>(NaN);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCars, setSavedCars] = useState<SavedCar[]>([]);

  useEffect(() => setSavedCars(loadSavedCars()), []);

  const errors = validate(input);
  const isValid = Object.keys(errors).length === 0;

  const curveValue = isValid ? curveResale(input.buyingPrice, input.ownershipYears, input.yearlyMileage) : NaN;

  const result: HelocResult | null = useMemo(() => {
    if (!isValid || Number.isNaN(resaleValue)) return null;
    return calculateHeloc(input, resaleValue);
  }, [input, resaleValue, isValid]);

  const equityRows = useMemo(() => {
    if (!result) return [];
    const refs: { label: string; resale: number }[] = [];
    if (estimate) {
      refs.push({ label: "Conservative", resale: estimate.conservativeResale });
      refs.push({ label: "Realistic", resale: estimate.realisticResale });
      refs.push({ label: "Strong market", resale: estimate.strongResale });
    }
    if (!Number.isNaN(curveValue)) refs.push({ label: "Depreciation curve", resale: curveValue });
    return buildEquityRows(result, refs);
  }, [result, estimate, curveValue]);

  async function handleEstimate() {
    if (!isValid) {
      setError("Fix the input errors before estimating.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const est = await fetchResaleEstimate(input);
      setEstimate(est);
      setScenario("realistic");
      setResaleValue(est.realisticResale);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Estimation failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleScenario(s: Scenario) {
    setScenario(s);
    if (s === "curve") {
      setResaleValue(curveValue);
    } else if (estimate) {
      setResaleValue(estimate[scenarioField[s]] as number);
    }
  }

  function handleSave() {
    if (!result) return;
    const car: SavedCar = {
      id: `car-${++idCounter}-${result.totalPurchaseCost}`,
      label: `${input.year} ${input.makeModel}`.trim() || "Car",
      input,
      resaleValue,
      scenario,
      result,
    };
    setSavedCars(saveCar(car));
  }

  function handleRemove(id: string) {
    setSavedCars(removeCar(id));
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <header className="mb-12">
          <div className="eyebrow">
            <span className="line" />
            Personal finance · Quebec
          </div>
          <h1 className="h-display mt-5">
            HELOC <em>Car</em> Ownership Calculator
          </h1>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="panel">
            <div className="section-title mb-6">
              <span className="num">01</span> Vehicle &amp; financing
            </div>
            <InputForm input={input} onChange={setInput} errors={errors} />
          </section>

          <section className="panel">
            <div className="section-title mb-6">
              <span className="num">02</span> Resale value
            </div>
            <ResalePanel
              estimate={estimate}
              scenario={scenario}
              resaleValue={resaleValue}
              curveValue={curveValue}
              loading={loading}
              error={error}
              onEstimate={handleEstimate}
              onScenario={handleScenario}
              onResaleEdit={setResaleValue}
              transmission={input.transmission}
              aiNotes={input.aiNotes}
              onTransmissionChange={(t) => setInput({ ...input, transmission: t })}
              onNotesChange={(n) => setInput({ ...input, aiNotes: n })}
            />
          </section>
        </div>

        <section className="panel mt-6">
          <div className="section-title mb-6">
            <span className="num">03</span> Results
          </div>
          {result ? (
            <ResultsDashboard result={result} equityRows={equityRows} onSave={handleSave} />
          ) : (
            <p className="helper">
              Enter valid vehicle details and a resale value (estimate or manual) to see results.
            </p>
          )}
        </section>

        <section className="panel mt-6">
          <div className="section-title mb-6">
            <span className="num">04</span> Comparison
          </div>
          <ComparisonTable cars={savedCars} onRemove={handleRemove} />
        </section>

        <footer className="mt-10 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--frost-deep)]">
          Financing / depreciation only — excludes insurance, gas, maintenance, repairs, registration, tires.
        </footer>
      </div>
    </div>
  );
}
