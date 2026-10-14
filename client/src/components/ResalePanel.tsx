import { useEffect, useRef, useState } from "react";
import type { ResaleEstimate, Scenario } from "../types";
import { formatCAD0 } from "../lib/format";
import { extractColor } from "../lib/carImage";
import { fetchCarImages } from "../api";

interface Props {
  estimate: ResaleEstimate | null;
  scenario: Scenario;
  resaleValue: number;
  curveValue: number;
  loading: boolean;
  error: string | null;
  onEstimate: () => void;
  onCancel?: () => void;
  estimateStale?: boolean;
  onScenario: (s: Scenario) => void;
  onResaleEdit: (value: number) => void;
  transmission: string;
  aiNotes: string;
  onTransmissionChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  makeModel: string;
  year: number;
  trim: string;
}

const aiScenarios: { key: Scenario; label: string; field: keyof ResaleEstimate }[] = [
  { key: "conservative", label: "Conservative", field: "conservativeResale" },
  { key: "realistic", label: "Realistic", field: "realisticResale" },
  { key: "strong", label: "Strong market", field: "strongResale" },
];

function ScenarioButton(props: {
  active: boolean;
  label: string;
  value: number;
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const { active, label, value, hint, onClick } = props;
  return (
    <button onClick={onClick} disabled={props.disabled} className={`scenario ${active ? "sel" : ""} disabled:opacity-40`}>
      <div className="s-label">{label}</div>
      <div className="s-value">{Number.isNaN(value) ? "—" : formatCAD0(value)}</div>
      {hint && <div className="s-hint">{hint}</div>}
    </button>
  );
}

export default function ResalePanel(props: Props) {
  const {
    estimate, scenario, resaleValue, curveValue, loading, error,
    onEstimate, onScenario, onResaleEdit, onCancel, estimateStale = false,
    transmission, aiNotes, onTransmissionChange, onNotesChange,
    makeModel, year, trim,
  } = props;

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const candidates = useRef<string[]>([]);
  const candIdx = useRef(0);
  const imageRequest = useRef(0);
  const color = extractColor(aiNotes);

  useEffect(() => {
    candidates.current = [];
    candIdx.current = 0;
    setImageUrl(null);
    setImageError(false);
    setImgLoading(false);
    // Invalidate lookups for the previous vehicle, including on unmount.
    return () => { imageRequest.current += 1; };
  }, [makeModel, year, trim, color]);

  function show(list: string[]) {
    candidates.current = list;
    candIdx.current = 0;
    if (list.length) {
      setImageError(false);
      setImageUrl(list[0]);
    } else {
      setImageUrl(null);
      setImageError(true);
    }
  }

  async function fetchImage() {
    if (!makeModel.trim()) return;
    const request = ++imageRequest.current;
    setImgLoading(true);
    setImageError(false);
    setImageUrl(null);
    try {
      const imgs = await fetchCarImages({ makeModel, year, trim, color });
      if (request !== imageRequest.current) return;
      show(imgs);
    } catch {
      if (request !== imageRequest.current) return;
      show([]);
    } finally {
      if (request === imageRequest.current) setImgLoading(false);
    }
  }

  // Advance to the next candidate when an image URL fails to load.
  function handleImgError() {
    const next = candIdx.current + 1;
    if (next < candidates.current.length) {
      candIdx.current = next;
      setImageUrl(candidates.current[next]);
    } else {
      setImageUrl(null);
      setImageError(true);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <button onClick={onEstimate} disabled={loading} className="btn-primary">
        {loading ? "Searching listings…" : error ? "Retry listing search" : "Estimate resale value (AI)"}
      </button>
      {loading && onCancel && <button className="btn-ghost self-start" onClick={onCancel}>Cancel search</button>}

      {error && (
        <p role="alert" className="helper err">
          {error} You can type a resale value below or use the depreciation curve without an AI search.
        </p>
      )}
      {estimateStale && <p role="status" className="warn">Vehicle details changed since this estimate. The existing resale value is retained as your assumption; search again for matching evidence.</p>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {estimate &&
          aiScenarios.map((s) => (
            <ScenarioButton
              key={s.key}
              active={scenario === s.key}
              label={s.label}
              value={estimate[s.field] as number}
              onClick={() => onScenario(s.key)}
              disabled={estimateStale}
            />
          ))}
        <ScenarioButton
          active={scenario === "curve"}
          label="Depreciation curve"
          value={curveValue}
          hint="15%/yr · mileage-adj"
          onClick={() => onScenario("curve")}
          disabled={!Number.isFinite(curveValue)}
        />
      </div>

      <label className="flex flex-col gap-2">
        <span className="label">Transmission / powertrain</span>
        <select
          value={transmission}
          onChange={(e) => onTransmissionChange(e.target.value)}
          className="field-input field-select"
        >
          <option value="">Unspecified</option>
          <option value="Automatic">Automatic</option>
          <option value="Manual">Manual</option>
          <option value="DSG / dual-clutch">DSG / dual-clutch</option>
          <option value="CVT">CVT</option>
          <option value="Hybrid">Hybrid</option>
          <option value="Plug-in hybrid (PHEV)">Plug-in hybrid (PHEV)</option>
          <option value="Electric (EV)">Electric (EV)</option>
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="label">Resale value (editable)</span>
        <input
          type="number"
          min="0"
          value={Number.isNaN(resaleValue) ? "" : resaleValue}
          onChange={(e) => onResaleEdit(e.target.value === "" ? NaN : Number(e.target.value))}
          className="field-input"
        />
      </label>

      <details className="disclosure">
        <summary>Add details for the AI estimate</summary>
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            value={aiNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={3}
            placeholder="e.g. no accidents, winter tires included, Autobahn package, recent brakes — anything that sharpens the comp search"
            className="field-input resize-y"
          />
          <span className="helper">Sent to the AI to refine its comp search. The depreciation curve ignores it.</span>

          <div className="mt-1 flex flex-col gap-2">
            <button
              type="button"
              onClick={fetchImage}
              disabled={!makeModel.trim() || imgLoading}
              className="btn-ghost self-start disabled:opacity-40"
            >
              {imgLoading ? "Finding image…" : imageUrl ? "Refresh vehicle image" : "Fetch vehicle image"}
            </button>
            <span className="helper">Photos are matched by year, make, model and trim in their labels. Labels may be inaccurate; colour may differ.</span>
            {imageUrl && !imageError && (
              <figure className="overflow-hidden rounded border border-[var(--hairline-2)] bg-[var(--ink-2)]">
                <img
                  src={imageUrl}
                  alt={`Photo labelled ${[year, makeModel, trim].filter(Boolean).join(" ")}`}
                  onError={handleImgError}
                  className="w-full"
                />
                <figcaption className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--frost-deep)]">
                  Photo label match: {makeModel} {Number.isFinite(year) ? `· ${year}` : ""} {trim ? `· ${trim}` : ""}
                </figcaption>
              </figure>
            )}
            {imageError && <span className="helper err">No matching photo available for this year, model and trim.</span>}
          </div>
        </div>
      </details>

    </div>
  );
}
