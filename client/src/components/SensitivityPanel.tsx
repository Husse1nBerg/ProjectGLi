import { useState } from "react";
import type { CarInput } from "../types";
import { calculateHeloc } from "../lib/heloc";
import { formatCAD } from "../lib/format";
import { saleSettlement, sensitivityBaseline, sensitivityResult } from "../lib/sale";

interface Props { input: CarInput; resaleValue: number }

export default function SensitivityPanel(props: Props) {
  // Remount controls when any baseline input changes, including loading a saved vehicle.
  return <Controls key={JSON.stringify([props.input, props.resaleValue])} {...props} />;
}

function Controls({ input, resaleValue }: Props) {
  const defaults = sensitivityBaseline(input);
  const [rate, setRate] = useState(String(defaults.interestRate));
  const [resale, setResale] = useState("0");
  const [years, setYears] = useState(String(defaults.ownershipYears));
  const baseline = calculateHeloc(input, resaleValue);
  let changed = null;
  try {
    changed = sensitivityResult(input, resaleValue, {
      interestRate: rate.trim() ? Number(rate) : NaN,
      resaleChange: resale.trim() ? Number(resale) : NaN,
      ownershipYears: years.trim() ? Number(years) : NaN,
    });
  } catch { /* Show validation below instead of misleading numeric results. */ }
  const rows = changed ? [
    ["Estimated resale", baseline.resaleValue, changed.resaleValue],
    ["Monthly cost", baseline.totalMonthlyCost, changed.totalMonthlyCost],
    ["Total ownership cost", baseline.totalOwnershipCost, changed.totalOwnershipCost],
    ["Cash needed to clear debt at sale", saleSettlement(baseline).additionalCash, saleSettlement(changed).additionalCash],
  ] as const : [];

  return <section aria-labelledby="sensitivity-heading" className="flex flex-col gap-4">
    <h3 id="sensitivity-heading" className="font-semibold">What if your plans change?</h3>
    <p className="text-xs leading-relaxed text-[var(--ice-dim)]">
      Explore a different rate, resale price, or sale date without changing your saved baseline.
      The selected rate applies throughout ownership. Changing duration adjusts resale approximately using
      the existing age and mileage depreciation curve; this is not a new market or AI quote.
      Resale change applies after that adjustment.
    </p>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <label><span className="label">Annual rate (%)</span><input className="field-input" aria-label="What-if annual rate" type="number" min="0" max="100" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} /></label>
      <label><span className="label">Resale change (%)</span><input className="field-input" aria-label="What-if resale change" type="number" min="-100" max="100" step="1" value={resale} onChange={(e) => setResale(e.target.value)} /></label>
      <label><span className="label">Ownership (years)</span><input className="field-input" aria-label="What-if ownership years" type="number" min={1 / 12} max="30" step="any" value={years} onChange={(e) => setYears(e.target.value)} /></label>
    </div>
    {!changed ? <p role="alert" className="warn">Enter a rate from 0–100%, resale change from −100–100%, and ownership from 1 month–30 years.</p> :
      <div className="overflow-x-auto"><table className="data-table">
        <thead><tr><th>Metric</th><th>Baseline</th><th>What if</th><th>Change</th></tr></thead>
        <tbody>{rows.map(([label, before, after]) => <tr key={label}><td>{label}</td><td className="num">{formatCAD(before)}</td><td className="num">{formatCAD(after)}</td><td className="num">{after > before ? "+" : ""}{formatCAD(after - before)}</td></tr>)}</tbody>
      </table></div>}
    <button className="btn-ghost self-start" onClick={() => { setRate(String(defaults.interestRate)); setResale("0"); setYears(String(defaults.ownershipYears)); }}>Reset what-if</button>
  </section>;
}
