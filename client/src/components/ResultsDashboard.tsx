import type { HelocResult } from "../types";
import { formatCAD, formatKm } from "../lib/format";

interface Props {
  result: HelocResult;
  onSave: () => void;
}

export default function ResultsDashboard({ result, onSave }: Props) {
  const rows: { label: string; value: string; strong?: boolean }[] = [
    { label: "Purchase price (before tax)", value: formatCAD(result.totalPurchaseCost - result.tax) },
    { label: "Quebec tax (14.975%)", value: formatCAD(result.tax) },
    { label: "Total purchase cost", value: formatCAD(result.totalPurchaseCost) },
    { label: "Projected mileage at sale", value: formatKm(result.expectedMileageAtSale) },
    { label: "Estimated resale value", value: formatCAD(result.resaleValue) },
    { label: "Depreciation loss", value: formatCAD(result.depreciationLoss) },
    { label: "Monthly depreciation", value: formatCAD(result.monthlyDepreciation) },
    { label: "Monthly HELOC interest", value: formatCAD(result.monthlyInterest) },
    { label: "Total monthly cost", value: formatCAD(result.totalMonthlyCost), strong: true },
    { label: "Yearly cost", value: formatCAD(result.yearlyCost) },
    { label: `Total ${result.months / 12}-year cost`, value: formatCAD(result.totalOwnershipCost), strong: true },
    { label: "Hussein monthly share", value: formatCAD(result.husseinMonthly) },
    { label: "Abed monthly share", value: formatCAD(result.abedMonthly) },
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
        <Card title="Hussein / month" value={formatCAD(result.husseinMonthly)} />
        <Card title="Abed / month" value={formatCAD(result.abedMonthly)} />
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
            <tr key={row.label} className={`border-t border-slate-100 ${row.strong ? "bg-indigo-50 font-semibold" : ""}`}>
              <td className="px-4 py-2">{row.label}</td>
              <td className="px-4 py-2 text-right tabular-nums">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={onSave} className="self-start rounded-lg border border-indigo-600 px-4 py-2 font-medium text-indigo-700 hover:bg-indigo-50">
        Save to comparison
      </button>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
    </div>
  );
}
