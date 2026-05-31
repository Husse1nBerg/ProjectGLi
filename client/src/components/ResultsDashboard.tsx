import type { HelocResult, EquityRow } from "../types";
import { formatCAD, formatKm } from "../lib/format";

interface Props {
  result: HelocResult;
  equityRows: EquityRow[];
  onSave: () => void;
}

// Contributor accent slots, aligned with ContributorList dots: c1 frost, c2 gold, c3 mauve.
const ACCENTS = ["c1", "c2", "c3"];
const cname = (name: string, i: number) => name.trim() || `Contributor ${i + 1}`;

export default function ResultsDashboard({ result, equityRows, onSave }: Props) {
  const carRows: { label: string; value: string; strong?: boolean }[] = [
    { label: "Purchase price (before tax)", value: formatCAD(result.totalPurchaseCost - result.tax) },
    { label: "Sales tax (14.975%)", value: formatCAD(result.tax) },
    { label: "Total purchase cost", value: formatCAD(result.totalPurchaseCost) },
    { label: "Projected mileage at sale", value: formatKm(result.expectedMileageAtSale) },
    { label: "Estimated resale value", value: formatCAD(result.resaleValue) },
    { label: "Depreciation loss", value: formatCAD(result.depreciationLoss) },
    { label: "Monthly depreciation", value: formatCAD(result.monthlyDepreciation) },
    { label: "Monthly interest", value: formatCAD(result.monthlyInterest) },
    { label: "Total monthly cost", value: formatCAD(result.totalMonthlyCost), strong: true },
    { label: "Yearly cost", value: formatCAD(result.yearlyCost) },
    { label: `Total ${result.months / 12}-year cost`, value: formatCAD(result.totalOwnershipCost), strong: true },
  ];

  return (
    <div className="flex flex-col gap-6">
      {result.overContribution && (
        <p className="warn">
          ⚠ The entered shares exceed the total monthly cost. The last contributor's share is clamped to $0.00.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Total monthly" value={formatCAD(result.totalMonthlyCost)} />
        {result.contributors.map((c, i) => (
          <Card key={i} title={`${cname(c.name, i)} / month`} value={formatCAD(c.monthly)} accent={ACCENTS[i % ACCENTS.length]} />
        ))}
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th style={{ textAlign: "right" }}>Value</th>
          </tr>
        </thead>
        <tbody>
          {carRows.map((row) => (
            <tr key={row.label} className={row.strong ? "row-strong" : ""}>
              <td>{row.label}</td>
              <td className="num">{row.value}</td>
            </tr>
          ))}
          {result.contributors.map((c, i) => (
            <tr key={`m-${i}`} className={`row-${ACCENTS[i % ACCENTS.length]}`}>
              <td>{cname(c.name, i)} monthly share</td>
              <td className="num">{formatCAD(c.monthly)}</td>
            </tr>
          ))}
          {result.contributors.map((c, i) => (
            <tr key={`t-${i}`}>
              <td>{cname(c.name, i)} total contribution</td>
              <td className="num">{formatCAD(c.total)}</td>
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
              back as equity (or a shortfall), split by each contributor's share of total contributions.
            </p>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th style={{ textAlign: "right" }}>Resale</th>
                  <th style={{ textAlign: "right" }}>Equity returned</th>
                  {result.contributors.map((c, i) => (
                    <th key={i} style={{ textAlign: "right" }}>{cname(c.name, i)}</th>
                  ))}
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
                      {row.contributorEquity.map((e, i) => (
                        <td key={i} className={`num ${sign}`}>{formatCAD(e)}</td>
                      ))}
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

function Card({ title, value, accent }: { title: string; value: string; accent?: string }) {
  return (
    <div className={`stat ${accent ? `accent-${accent}` : ""}`}>
      <div className="s-title">{title}</div>
      <div className="s-amount">{value}</div>
    </div>
  );
}
