import type { ResaleEstimate, Scenario } from "../types";
import { formatCAD } from "../lib/format";

interface Props {
  estimate: ResaleEstimate | null;
  scenario: Scenario;
  resaleValue: number;
  loading: boolean;
  error: string | null;
  onEstimate: () => void;
  onScenario: (s: Scenario) => void;
  onResaleEdit: (value: number) => void;
}

const scenarios: { key: Scenario; label: string; field: keyof ResaleEstimate }[] = [
  { key: "conservative", label: "Conservative", field: "conservativeResale" },
  { key: "realistic", label: "Realistic", field: "realisticResale" },
  { key: "strong", label: "Strong market", field: "strongResale" },
];

export default function ResalePanel(props: Props) {
  const { estimate, scenario, resaleValue, loading, error, onEstimate, onScenario, onResaleEdit } = props;
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

      {estimate && (
        <div className="grid grid-cols-3 gap-2">
          {scenarios.map((s) => (
            <button
              key={s.key}
              onClick={() => onScenario(s.key)}
              className={`rounded-lg border px-3 py-2 text-sm ${
                scenario === s.key ? "border-indigo-600 bg-indigo-50 font-semibold" : "border-slate-300"
              }`}
            >
              <div>{s.label}</div>
              <div className="text-xs text-slate-500">{formatCAD(estimate[s.field] as number)}</div>
            </button>
          ))}
        </div>
      )}

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
    </div>
  );
}
