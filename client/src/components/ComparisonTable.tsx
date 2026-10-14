import type { SavedCar } from "../types";
import { formatCAD } from "../lib/format";

interface Props {
  cars: SavedCar[];
  onRemove: (id: string) => void;
  onOpen: (car: SavedCar) => void;
  onShare: (car: SavedCar) => void;
}

export default function ComparisonTable({ cars, onRemove, onOpen, onShare }: Props) {
  if (cars.length === 0) {
    return <p className="helper">No saved cars yet. Save a calculation to compare here.</p>;
  }

  const metrics: { label: string; get: (c: SavedCar) => string }[] = [
    { label: "Ownership period", get: (c) => `${c.input.ownershipYears} years` },
    { label: "HELOC rate", get: (c) => `${Number.isFinite(c.input.interestRate) && c.input.interestRate >= 0 ? c.input.interestRate : 4.45}%` },
    { label: "Projected mileage at sale", get: (c) => `${c.result.expectedMileageAtSale.toLocaleString()} km` },
    { label: "Total purchase cost", get: (c) => formatCAD(c.result.totalPurchaseCost) },
    { label: "Resale value", get: (c) => formatCAD(c.result.resaleValue) },
    { label: "Depreciation loss", get: (c) => formatCAD(c.result.depreciationLoss) },
    { label: "Total monthly cost", get: (c) => formatCAD(c.result.totalMonthlyCost) },
    { label: "Yearly cost", get: (c) => formatCAD(c.result.yearlyCost) },
    { label: "Total ownership cost", get: (c) => formatCAD(c.result.totalOwnershipCost) },
    { label: "Principal outstanding at sale", get: (c) => formatCAD(c.result.totalPurchaseCost) },
    { label: "Cash needed after sale", get: (c) => formatCAD(Math.max(0, c.result.totalPurchaseCost - c.resaleValue)) },
  ];

  return (
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Saved car comparisons">
    <table className="data-table">
      <thead>
        <tr>
          <th>Metric</th>
          {cars.map((c) => (
            <th key={c.id} style={{ textAlign: "right" }}>
              <div className="flex flex-col items-end gap-2 min-w-44">
                <span>{c.label}</span>
                <button onClick={() => onOpen(c)} className="src-link" aria-label={`Open ${c.label}`}>Open / edit</button>
                <button onClick={() => onShare(c)} className="src-link" aria-label={`Share ${c.label}`}>Share</button>
                <button onClick={() => onRemove(c.id)} className="src-link" aria-label={`Remove ${c.label}`}>
                  remove
                </button>
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {metrics.map((m) => (
          <tr key={m.label}>
            <td>{m.label}</td>
            {cars.map((c) => (
              <td key={c.id} className="num">
                {m.get(c)}
              </td>
            ))}
          </tr>
        ))}
        <tr>
          <td>Monthly split</td>
          {cars.map((c) => (
            <td key={c.id} className="num">
              <div className="flex flex-col items-end gap-0.5">
                {c.result.contributors.map((p, i) => (
                  <span key={i} className="text-[var(--ice-dim)]">
                    {(p.name.trim() || `Contributor ${i + 1}`)}: {formatCAD(p.monthly)}
                  </span>
                ))}
              </div>
            </td>
          ))}
        </tr>
      </tbody>
    </table>
    </div>
  );
}
