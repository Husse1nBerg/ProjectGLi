import { useState } from "react";
import type { ResaleEstimate, Scenario } from "../types";
import { formatCAD0 } from "../lib/format";
import { carImageUrl } from "../lib/carImage";

interface Props {
  estimate: ResaleEstimate | null;
  scenario: Scenario;
  resaleValue: number;
  curveValue: number;
  loading: boolean;
  error: string | null;
  onEstimate: () => void;
  onScenario: (s: Scenario) => void;
  onResaleEdit: (value: number) => void;
  transmission: string;
  aiNotes: string;
  onTransmissionChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  makeModel: string;
  year: number;
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
}) {
  const { active, label, value, hint, onClick } = props;
  return (
    <button onClick={onClick} className={`scenario ${active ? "sel" : ""}`}>
      <div className="s-label">{label}</div>
      <div className="s-value">{Number.isNaN(value) ? "—" : formatCAD0(value)}</div>
      {hint && <div className="s-hint">{hint}</div>}
    </button>
  );
}

export default function ResalePanel(props: Props) {
  const {
    estimate, scenario, resaleValue, curveValue, loading, error,
    onEstimate, onScenario, onResaleEdit,
    transmission, aiNotes, onTransmissionChange, onNotesChange,
    makeModel, year,
  } = props;

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  function fetchImage() {
    const url = carImageUrl(makeModel, year, aiNotes);
    if (!url) return;
    setImageError(false);
    setImageUrl(url);
  }

  return (
    <div className="flex flex-col gap-5">
      <button onClick={onEstimate} disabled={loading} className="btn-primary">
        {loading ? "Searching listings…" : "Estimate resale value (AI)"}
      </button>

      {error && (
        <p className="helper err">
          {error} You can type a resale value below.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {estimate &&
          aiScenarios.map((s) => (
            <ScenarioButton
              key={s.key}
              active={scenario === s.key}
              label={s.label}
              value={estimate[s.field] as number}
              onClick={() => onScenario(s.key)}
            />
          ))}
        <ScenarioButton
          active={scenario === "curve"}
          label="Depreciation curve"
          value={curveValue}
          hint="15%/yr · mileage-adj"
          onClick={() => onScenario("curve")}
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
              disabled={!makeModel.trim()}
              className="btn-ghost self-start disabled:opacity-40"
            >
              {imageUrl ? "Refresh vehicle image" : "Fetch vehicle image"}
            </button>
            <span className="helper">Mention a colour above (e.g. "red") and refresh — the render updates to match.</span>
            {imageUrl && !imageError && (
              <figure className="overflow-hidden rounded border border-[var(--hairline-2)] bg-[var(--ink-2)]">
                <img
                  src={imageUrl}
                  alt={`${makeModel} ${Number.isFinite(year) ? year : ""}`.trim()}
                  onError={() => setImageError(true)}
                  className="w-full"
                />
                <figcaption className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--frost-deep)]">
                  {makeModel} {Number.isFinite(year) ? `· ${year}` : ""} — rendered preview
                </figcaption>
              </figure>
            )}
            {imageError && <span className="helper err">No image found for that model.</span>}
          </div>
        </div>
      </details>

      {estimate && (estimate.explanation || estimate.sources.length > 0) && (
        <details className="disclosure">
          <summary>
            AI reasoning &amp; sources{estimate.sources.length > 0 ? ` (${estimate.sources.length} listings)` : ""}
          </summary>
          <div className="body flex flex-col gap-3">
            {estimate.explanation && (
              <p className="text-xs leading-relaxed text-[var(--ice-dim)]">{estimate.explanation}</p>
            )}
            {estimate.sources.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="label">Sources — live listings</span>
                <ul className="flex flex-col gap-1.5">
                  {estimate.sources.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="src-link">
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
