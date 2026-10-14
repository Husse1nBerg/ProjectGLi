import { useEffect, useMemo, useRef, useState } from "react";
import type { CarInput, HelocResult, ResaleEstimate, SavedCar, Scenario } from "./types";
import { calculateHeloc, curveResale, buildEquityRows } from "./lib/heloc";
import { loadDraft, loadSavedCars, saveCar, removeCar, saveDraft } from "./lib/storage";
import { comparisonCsv, readSharedScenario, scenarioLink } from "./lib/scenarios";
import { fetchResaleEstimate, resaleInputKey } from "./api";
import InputForm from "./components/InputForm";
import ContributorList, { newContributor, MIN_CONTRIBUTORS, MAX_CONTRIBUTORS } from "./components/ContributorList";
import type { Contributor } from "./types";
import ResalePanel from "./components/ResalePanel";
import ResultsDashboard from "./components/ResultsDashboard";
import ComparisonTable from "./components/ComparisonTable";
import SensitivityPanel from "./components/SensitivityPanel";
import EvidencePanel from "./components/EvidencePanel";

const defaultInput: CarInput = {
  makeModel: "",
  year: 2022,
  trim: "",
  transmission: "",
  buyingPrice: NaN,
  currentMileage: NaN,
  yearlyMileage: 15000,
  ownershipYears: 2,
  interestRate: 4.45,
  contributors: [newContributor(1), newContributor(2)],
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
    if (!Number.isFinite(v) || v <= 0) errors[k] = "Must be > 0";
  }
  const nonNeg: (keyof CarInput)[] = ["currentMileage", "yearlyMileage"];
  for (const k of nonNeg) {
    const v = input[k] as number;
    if (!Number.isFinite(v) || v < 0) errors[k] = "Must be ≥ 0";
  }
  if (!Number.isInteger(input.year) || input.year < 1886 || input.year > 2100) errors.year = "Enter a valid model year";
  return errors;
}

// The last contributor pays the remainder, so only the entered ones need a valid amount.
function validateContributors(input: CarInput): Record<string, string> {
  const errors: Record<string, string> = {};
  input.contributors.slice(0, -1).forEach((c) => {
    if (!Number.isFinite(c.monthly) || c.monthly < 0) errors[c.id] = "Must be ≥ 0";
  });
  return errors;
}

export default function App() {
  const [initial] = useState(() => readSharedScenario(window.location.hash) || loadDraft());
  const [input, setInput] = useState<CarInput>(initial?.input || defaultInput);
  const [estimate, setEstimate] = useState<ResaleEstimate | null>(null);
  const [scenario, setScenario] = useState<Scenario>(initial?.scenario || "realistic");
  const [resaleValue, setResaleValue] = useState<number>(initial?.resaleValue ?? NaN);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCars, setSavedCars] = useState<SavedCar[]>(loadSavedCars);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [excludedUrls, setExcludedUrls] = useState<string[]>([]);
  const [estimateInputKey, setEstimateInputKey] = useState("");
  const [notice, setNotice] = useState(() => window.location.hash.startsWith("#scenario=")
    ? readSharedScenario(window.location.hash) ? "Shared calculation loaded. Its resale value is an assumption; search for current evidence when needed." : "This shared calculation could not be read. Your saved draft is still available."
    : initial ? "Your last inputs and resale value have been restored." : "");
  const [draftError, setDraftError] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const activeSearch = useRef<AbortController | null>(null);
  const inputKey = resaleInputKey(input);
  const estimateStale = Boolean(estimate && estimateInputKey !== inputKey);

  useEffect(() => {
    try { saveDraft({ input, resaleValue, scenario }); setDraftError(""); }
    catch { setDraftError("Browser storage is unavailable. Keep this tab open or export/share your calculation to preserve it."); }
  }, [input, resaleValue, scenario]);

  useEffect(() => {
    // Import once: refreshing after an edit must restore the new draft, not the original link.
    if (readSharedScenario(window.location.hash)) {
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    }
  }, []);

  // Late results must never overwrite a different vehicle or a manual edit.
  useEffect(() => {
    if (activeSearch.current) {
      activeSearch.current.abort(); activeSearch.current = null; setLoading(false);
      setError("Search cancelled because the vehicle details changed. Retry with the updated inputs.");
    }
  }, [inputKey]);
  useEffect(() => () => activeSearch.current?.abort(), []);

  const errors = validate(input);
  const contributorErrors = validateContributors(input);
  const isValid = Object.keys(errors).length === 0 && Object.keys(contributorErrors).length === 0;

  const curveValue = isValid ? curveResale(input.buyingPrice, input.ownershipYears, input.yearlyMileage) : NaN;

  const result: HelocResult | null = useMemo(() => {
    if (!isValid || !Number.isFinite(resaleValue) || resaleValue < 0) return null;
    return calculateHeloc(input, resaleValue);
  }, [input, resaleValue, isValid]);

  const equityRows = useMemo(() => {
    if (!result) return [];
    const refs: { label: string; resale: number }[] = [];
    if (estimate && !estimateStale) {
      refs.push({ label: "Conservative", resale: estimate.conservativeResale });
      refs.push({ label: "Realistic", resale: estimate.realisticResale });
      refs.push({ label: "Strong market", resale: estimate.strongResale });
    }
    if (!Number.isNaN(curveValue)) refs.push({ label: "Depreciation curve", resale: curveValue });
    return buildEquityRows(result, refs);
  }, [result, estimate, curveValue, estimateStale]);

  async function handleEstimate() {
    if (Object.keys(errors).length > 0) {
      setError("Fix the input errors before estimating.");
      return;
    }
    setLoading(true);
    setError(null);
    activeSearch.current?.abort();
    const controller = new AbortController();
    activeSearch.current = controller;
    try {
      const est = await fetchResaleEstimate(input, excludedUrls, controller.signal);
      if (controller.signal.aborted || activeSearch.current !== controller) return;
      setEstimate(est);
      setEstimateInputKey(inputKey);
      setScenario("realistic");
      setResaleValue(est.realisticResale);
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Estimation failed.");
    } finally {
      if (activeSearch.current === controller) { activeSearch.current = null; setLoading(false); }
    }
  }

  function handleScenario(s: Scenario) {
    cancelSearch();
    setScenario(s);
    if (s === "curve") {
      setResaleValue(curveValue);
    } else if (estimate && !estimateStale) {
      setResaleValue(estimate[scenarioField[s]] as number);
    }
  }

  function handleSave(asNew = false) {
    if (!result) return;
    const car: SavedCar = {
      id: !asNew && editingId ? editingId : crypto.randomUUID(),
      label: [input.year, input.makeModel, input.trim].filter(Boolean).join(" "),
      input,
      resaleValue,
      scenario,
      result,
      estimate, excludedUrls, estimateInputKey, savedAt: new Date().toISOString(),
    };
    try {
      setSavedCars(saveCar(car)); setEditingId(car.id);
      setNotice(asNew || !editingId ? "Calculation saved to comparison." : "Saved calculation updated.");
    } catch { setNotice("Could not save to browser storage. Your current calculation is still here; try exporting or sharing it."); }
  }

  function handleRemove(id: string) {
    try { setSavedCars(removeCar(id)); if (editingId === id) setEditingId(null); }
    catch { setNotice("Could not remove this saved calculation from browser storage. Please retry."); }
  }

  function cancelSearch() {
    activeSearch.current?.abort(); activeSearch.current = null; setLoading(false);
  }

  function handleOpen(car: SavedCar) {
    cancelSearch(); setInput(structuredClone(car.input)); setResaleValue(car.resaleValue);
    setScenario(car.scenario); setEstimate(car.estimate || null);
    setEstimateInputKey(car.estimateInputKey || ""); setExcludedUrls(car.excludedUrls || []);
    setEditingId(car.id); setError(null); setShareUrl("");
    setNotice(`Opened ${car.label}. Save to update it, or save as a new comparison.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleShare(car?: SavedCar) {
    const snapshot = car || { input, resaleValue, scenario };
    setShareUrl(scenarioLink(snapshot, window.location.href));
    setNotice("Share link ready below. It includes vehicle details, notes, resale assumptions and contributor names; it does not include AI evidence.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleExport() {
    const url = URL.createObjectURL(new Blob(["\uFEFF", comparisonCsv(savedCars)], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "heloc-comparisons.csv";
    anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Contributor edits use functional updates so each operation applies to the latest state.
  function updateContributor(id: string, patch: Partial<Contributor>) {
    setInput((prev) => ({
      ...prev,
      contributors: prev.contributors.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }
  function addContributor() {
    setInput((prev) =>
      prev.contributors.length >= MAX_CONTRIBUTORS
        ? prev
        : { ...prev, contributors: [...prev.contributors, newContributor(prev.contributors.length + 1)] }
    );
  }
  function removeContributor(id: string) {
    setInput((prev) =>
      prev.contributors.length <= MIN_CONTRIBUTORS
        ? prev
        : { ...prev, contributors: prev.contributors.filter((c) => c.id !== id) }
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <header className="mb-12">
          <div className="eyebrow">
            <span className="line" />
            Created by Hussein Bayoun
          </div>
          <h1 className="h-display mt-5">
            HELOC <em>Car</em> Ownership Calculator
          </h1>
        </header>

        {notice && <p role="status" className="helper mb-4">{notice}</p>}
        {draftError && <p role="alert" className="warn mb-4">{draftError}</p>}
        {shareUrl && <label className="flex flex-col gap-2 mb-5">
          <span className="label">Share this calculation — select and copy the link</span>
          <input aria-label="Share calculation link" className="field-input" readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
        </label>}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="panel">
            <div className="section-title mb-6">
              <span className="num">01</span> Vehicle &amp; financing
            </div>
            <InputForm input={input} onChange={setInput} errors={errors} />
            <div className="my-6 h-px bg-[var(--hairline)]" />
            <ContributorList
              contributors={input.contributors}
              errors={contributorErrors}
              onUpdate={updateContributor}
              onAdd={addContributor}
              onRemove={removeContributor}
            />
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
              onCancel={() => { cancelSearch(); setError("Search cancelled. Your inputs and previous resale value are unchanged."); }}
              estimateStale={estimateStale}
              onScenario={handleScenario}
              onResaleEdit={(value) => { cancelSearch(); setResaleValue(value); }}
              transmission={input.transmission}
              aiNotes={input.aiNotes}
              onTransmissionChange={(t) => setInput({ ...input, transmission: t })}
              onNotesChange={(n) => setInput({ ...input, aiNotes: n })}
              makeModel={input.makeModel}
              year={input.year}
              trim={input.trim}
            />
            {estimate && <div className="mt-5">
              <EvidencePanel estimate={estimate} excludedUrls={excludedUrls} onExcludedUrlsChange={(urls) => {
                cancelSearch(); setExcludedUrls(urls);
              }} />
              {excludedUrls.length > 0 && <button className="btn-ghost mt-3" disabled={loading} onClick={handleEstimate}>
                Re-estimate without excluded sources
              </button>}
            </div>}
          </section>
        </div>

        <section className="panel mt-6">
          <div className="section-title mb-6">
            <span className="num">03</span> Results
          </div>
          {result ? (
            <>
              <ResultsDashboard result={result} equityRows={equityRows} onSave={() => handleSave()} saveLabel={editingId ? "Update saved comparison" : "Save to comparison"} />
              <div className="mt-3 flex flex-wrap gap-3">
                {editingId && <button className="btn-ghost" onClick={() => handleSave(true)}>Save as new comparison</button>}
                <button className="btn-ghost" onClick={() => handleShare()}>Share calculation</button>
              </div>
              <div className="mt-6"><SensitivityPanel input={input} resaleValue={resaleValue} /></div>
            </>
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
          {savedCars.length > 0 && <button className="btn-ghost mb-4" onClick={handleExport}>Export comparisons (CSV)</button>}
          <ComparisonTable cars={savedCars} onRemove={handleRemove} onOpen={handleOpen} onShare={handleShare} />
        </section>

        <footer className="mt-10 flex flex-col items-center gap-2 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--frost-deep)]">
          <span>Financing / depreciation only — excludes insurance, gas, maintenance, repairs, registration, tires.</span>
          <span className="tracking-[0.3em] text-[var(--frost)]">© Hussein Bayoun — all rights reserved</span>
        </footer>
      </div>
    </div>
  );
}
