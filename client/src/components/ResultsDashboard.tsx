import type { HelocResult, EquityRow } from "../types";
import { formatCAD, formatKm } from "../lib/format";

interface Props {
  result: HelocResult;
  equityRows: EquityRow[];
  onSave: () => void;
}

type Tint = "strong" | "hussein" | "abed";

function tintClass(tint?: Tint): string {
  if (tint === "strong") return "bg-indigo-50 font-semibold";
  if (tint === "hussein") return "bg-sky-50 font-medium";
  if (tint === "abed") return "bg-emerald-50 font-medium";
  return "";
}

export default function ResultsDashboard({ result, equityRows, onSave }: Props) {
  const rows: { label: string; value: string; tint?: Tint }[] = [
    { label: "Purchase price (before tax)", value: formatCAD(result.totalPurchaseCost - result.tax) },
    { label: "Quebec tax (14.975%)", value: formatCAD(result.tax) },
    { label: "Total purchase cost", value: formatCAD(result.totalPurchaseCost) },
    { label: "Projected mileage at sale", value: formatKm(result.expectedMileageAtSale) },
    { label: "Estimated resale value", value: formatCAD(result.resaleValue) },
    { label: "Depreciation loss", value: formatCAD(result.depreciationLoss) },
    { label: "Monthly depreciation", value: formatCAD(result.monthlyDepreciation) },
    { label: "Monthly HELOC interest", value: formatCAD(result.monthlyInterest) },
    { label: "Total monthly cost", value: formatCAD(result.totalMonthlyCost), tint: "strong" },
    { label: "Yearly cost", value: formatCAD(result.yearlyCost) },
    { label: `Total ${result.months / 12}-year cost`, value: formatCAD(result.totalOwnershipCost), tint: "strong" },
    { label: "Hussein monthly share", value: formatCAD(result.husseinMonthly), tint: "hussein" },
    { label: "Abed monthly share", value: formatCAD(result.abedMonthly), tint: "abed" },
    { label: "Hussein total contribution", value: formatCAD(result.husseinTotal) },
    { label: "Abed total contribution", value: formatCAD(result.abedTotal) },
  ];

  return (
    <div className="flex flex-col gap-4">
      {result.overContribution && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          ⚠ Hussein's monthly contribution exceeds the total monthly cost. Abed's share is clamped to $0.00.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card title="Total monthly" value={formatCAD(result.totalMonthlyCost)} />
        <Card title="Hussein / month" value={formatCAD(result.husseinMonthly)} accent="sky" />
        <Card title="Abed / month" value={formatCAD(result.abedMonthly)} accent="emerald" />
      </div>

      <table className="w-full border-collapse overflow-hidden rounded-lg border border-slate-200 text-sm">
        <thead>
          <tr className="bg-slate-100 text-left">
            <th className="px-4 py-2 font-semibold">Metric</th>
            <th className="px-4 py-2 text-right font-semibold">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className={`border-t border-slate-100 ${tintClass(row.tint)}`}>
              <td className="px-4 py-2">{row.label}</td>
              <td className="px-4 py-2 text-right tabular-nums">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {equityRows.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-slate-800">Equity if you sell at a different price</h3>
          <p className="text-xs text-slate-500">
            The split above breaks even at the assumed resale of{" "}
            <span className="font-medium">{formatCAD(result.resaleValue)}</span> — it covers depreciation + interest
            with nothing left over. If the car actually sells for one of these prices, the difference comes back as
            equity (or a shortfall), split by each payer's share of total contributions.
          </p>
          <table className="w-full border-collapse overflow-hidden rounded-lg border border-slate-200 text-sm">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="px-4 py-2 font-semibold">Scenario</th>
                <th className="px-4 py-2 text-right font-semibold">Resale</th>
                <th className="px-4 py-2 text-right font-semibold">Equity returned</th>
                <th className="px-4 py-2 text-right font-semibold">Hussein</th>
                <th className="px-4 py-2 text-right font-semibold">Abed</th>
              </tr>
            </thead>
            <tbody>
              {equityRows.map((row) => {
                const sign = row.equity > 0 ? "text-emerald-700" : row.equity < 0 ? "text-red-600" : "text-slate-500";
                return (
                  <tr key={row.label} className="border-t border-slate-100">
                    <td className="px-4 py-2">{row.label}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatCAD(row.resale)}</td>
                    <td className={`px-4 py-2 text-right font-semibold tabular-nums ${sign}`}>
                      {row.equity > 0 ? "+" : ""}
                      {formatCAD(row.equity)}
                    </td>
                    <td className={`px-4 py-2 text-right tabular-nums ${sign}`}>{formatCAD(row.husseinEquity)}</td>
                    <td className={`px-4 py-2 text-right tabular-nums ${sign}`}>{formatCAD(row.abedEquity)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <button onClick={onSave} className="self-start rounded-lg border border-indigo-600 px-4 py-2 font-medium text-indigo-700 hover:bg-indigo-50">
        Save to comparison
      </button>
    </div>
  );
}

function Card({ title, value, accent }: { title: string; value: string; accent?: "sky" | "emerald" }) {
  const border = accent === "sky" ? "border-sky-200 bg-sky-50" : accent === "emerald" ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white";
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${border}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
    </div>
  );
}
