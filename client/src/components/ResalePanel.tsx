import type { ResaleEstimate, Scenario } from "../types";
import { formatCAD0 } from "../lib/format";

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
  const { estimate, scenario, resaleValue, curveValue, loading, error, onEstimate, onScenario, onResaleEdit } = props;
  return (
    <div className="flex flex-col gap-5">
      <button onClick={onEstimate} disabled={loading} className="btn-primary">
        {loading ? "Searching Quebec listings…" : "Estimate resale value (AI)"}
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
        <span className="label">Resale value (editable)</span>
        <input
          type="number"
          value={Number.isNaN(resaleValue) ? "" : resaleValue}
          onChange={(e) => onResaleEdit(e.target.value === "" ? NaN : Number(e.target.value))}
          className="field-input"
        />
      </label>

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
