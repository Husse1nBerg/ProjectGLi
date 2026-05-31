import type { SavedCar } from "../types";
import { formatCAD } from "../lib/format";

interface Props {
  cars: SavedCar[];
  onRemove: (id: string) => void;
}

export default function ComparisonTable({ cars, onRemove }: Props) {
  if (cars.length === 0) {
    return <p className="text-sm text-slate-500">No saved cars yet. Save a calculation to compare here.</p>;
  }

  const metrics: { label: string; get: (c: SavedCar) => string }[] = [
    { label: "Total purchase cost", get: (c) => formatCAD(c.result.totalPurchaseCost) },
    { label: "Resale value", get: (c) => formatCAD(c.result.resaleValue) },
    { label: "Depreciation loss", get: (c) => formatCAD(c.result.depreciationLoss) },
    { label: "Total monthly cost", get: (c) => formatCAD(c.result.totalMonthlyCost) },
    { label: "Yearly cost", get: (c) => formatCAD(c.result.yearlyCost) },
    { label: "Total ownership cost", get: (c) => formatCAD(c.result.totalOwnershipCost) },
    { label: "Hussein / month", get: (c) => formatCAD(c.result.husseinMonthly) },
    { label: "Abed / month", get: (c) => formatCAD(c.result.abedMonthly) },
  ];

  return (
    <table className="w-full border-collapse overflow-hidden rounded-lg border border-slate-200 text-sm">
      <thead>
        <tr className="bg-slate-100 text-left">
          <th className="px-4 py-2 font-semibold">Metric</th>
          {cars.map((c) => (
            <th key={c.id} className="px-4 py-2 font-semibold">
              <div className="flex items-center justify-between gap-2">
                <span>{c.label}</span>
                <button onClick={() => onRemove(c.id)} className="text-xs text-red-600 hover:underline">remove</button>
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {metrics.map((m) => (
          <tr key={m.label} className="border-t border-slate-100">
            <td className="px-4 py-2 text-slate-600">{m.label}</td>
            {cars.map((c) => (
              <td key={c.id} className="px-4 py-2 text-right tabular-nums">{m.get(c)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
