import type { ResaleEstimate, Scenario } from "../types";
import { formatCAD } from "../lib/format";

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
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm ${
        active ? "border-indigo-600 bg-indigo-50 font-semibold" : "border-slate-300"
      }`}
    >
      <div>{label}</div>
      <div className="text-xs text-slate-500">{Number.isNaN(value) ? "—" : formatCAD(value)}</div>
      {hint && <div className="text-[10px] uppercase tracking-wide text-slate-400">{hint}</div>}
    </button>
  );
}

export default function ResalePanel(props: Props) {
  const { estimate, scenario, resaleValue, curveValue, loading, error, onEstimate, onScenario, onResaleEdit } = props;
  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={onEstimate}
        disabled={loading}
        className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? "Searching Quebec listings…" : "Estimate resale value (AI)"}
      </button>

      {error && <p className="text-sm text-red-600">{error} You can type a resale value below.</p>}

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

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">Resale value (editable)</span>
        <input
          type="number"
          value={Number.isNaN(resaleValue) ? "" : resaleValue}
          onChange={(e) => onResaleEdit(e.target.value === "" ? NaN : Number(e.target.value))}
          className="rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      {estimate?.explanation && (
        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{estimate.explanation}</p>
      )}

      {estimate && estimate.sources.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-700">Sources (live listings the AI used)</span>
          <ul className="flex flex-col gap-1">
            {estimate.sources.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:underline"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
