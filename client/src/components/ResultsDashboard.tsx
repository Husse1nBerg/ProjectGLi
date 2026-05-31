import type { HelocResult, EquityRow } from "../types";
import { formatCAD, formatKm } from "../lib/format";

interface Props {
  result: HelocResult;
  equityRows: EquityRow[];
  onSave: () => void;
}

type Tint = "strong" | "hussein" | "abed";

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
    <div className="flex flex-col gap-6">
      {result.overContribution && (
        <p className="warn">
          ⚠ Hussein's monthly contribution exceeds the total monthly cost. Abed's share is clamped to $0.00.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card title="Total monthly" value={formatCAD(result.totalMonthlyCost)} />
        <Card title="Hussein / month" value={formatCAD(result.husseinMonthly)} accent="hussein" />
        <Card title="Abed / month" value={formatCAD(result.abedMonthly)} accent="abed" />
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th style={{ textAlign: "right" }}>Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className={row.tint ? `row-${row.tint}` : ""}>
              <td>{row.label}</td>
              <td className="num">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {equityRows.length > 0 && (
        <details className="disclosure">
          <summary>Equity if you sell at a different price</summary>
          <div className="mt-3 flex flex-col gap-3">
          <p className="text-xs leading-relaxed text-[var(--ice-dim)]">
            The split above breaks even at the assumed resale of{" "}
            <span className="text-[var(--ice)]">{formatCAD(result.resaleValue)}</span> — it covers depreciation +
            interest with nothing left over. If the car actually sells for one of these prices, the difference comes
            back as equity (or a shortfall), split by each payer's share of total contributions.
          </p>
          <table className="data-table">
            <thead>
              <tr>
                <th>Scenario</th>
                <th style={{ textAlign: "right" }}>Resale</th>
                <th style={{ textAlign: "right" }}>Equity returned</th>
                <th style={{ textAlign: "right" }}>Hussein</th>
                <th style={{ textAlign: "right" }}>Abed</th>
              </tr>
            </thead>
            <tbody>
              {equityRows.map((row) => {
                const sign = row.equity > 0 ? "eq-pos" : row.equity < 0 ? "eq-neg" : "eq-zero";
                return (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td className="num">{formatCAD(row.resale)}</td>
                    <td className={`num ${sign}`} style={{ fontWeight: 600 }}>
                      {row.equity > 0 ? "+" : ""}
                      {formatCAD(row.equity)}
                    </td>
                    <td className={`num ${sign}`}>{formatCAD(row.husseinEquity)}</td>
                    <td className={`num ${sign}`}>{formatCAD(row.abedEquity)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </details>
      )}

      <button onClick={onSave} className="btn-ghost self-start">
        Save to comparison
      </button>
    </div>
  );
}

function Card({ title, value, accent }: { title: string; value: string; accent?: "hussein" | "abed" }) {
  return (
    <div className={`stat ${accent ? `accent-${accent}` : ""}`}>
      <div className="s-title">{title}</div>
      <div className="s-amount">{value}</div>
    </div>
  );
}
