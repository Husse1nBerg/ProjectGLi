import { useEffect, useMemo, useState } from "react";
import type { CarInput, HelocResult, ResaleEstimate, SavedCar, Scenario } from "./types";
import { calculateHeloc, curveResale } from "./lib/heloc";
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
  buyingPrice: NaN,
  currentMileage: NaN,
  yearlyMileage: 15000,
  ownershipYears: 2,
  husseinMonthly: NaN,
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

  const curveValue = isValid ? curveResale(input.buyingPrice, input.ownershipYears) : NaN;

  const result: HelocResult | null = useMemo(() => {
    if (!isValid || Number.isNaN(resaleValue)) return null;
    return calculateHeloc(input, resaleValue);
  }, [input, resaleValue, isValid]);

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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">HELOC Car Ownership Calculator</h1>
          <p className="mt-1 text-slate-600">
            True cost of owning a car financed by a HELOC at 4.45% — depreciation + interest carrying cost only.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Vehicle & financing</h2>
            <InputForm input={input} onChange={setInput} errors={errors} />
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Resale value</h2>
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
            />
          </section>
        </div>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Results</h2>
          {result ? (
            <ResultsDashboard result={result} onSave={handleSave} />
          ) : (
            <p className="text-sm text-slate-500">
              Enter valid vehicle details and a resale value (estimate or manual) to see results.
            </p>
          )}
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Comparison</h2>
          <ComparisonTable cars={savedCars} onRemove={handleRemove} />
        </section>

        <footer className="mt-8 text-center text-xs text-slate-400">
          Financing/depreciation only — excludes insurance, gas, maintenance, repairs, registration, tires.
        </footer>
      </div>
    </div>
  );
}
