import type { ResaleEstimate } from "../types";
import { formatCAD0, formatKm } from "../lib/format";

interface Props {
  estimate: ResaleEstimate;
  excludedUrls: string[];
  onExcludedUrlsChange: (urls: string[]) => void;
}

function safeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

export default function EvidencePanel({ estimate, excludedUrls, onExcludedUrlsChange }: Props) {
  const searchedAt = estimate.searchedAt ? new Date(estimate.searchedAt) : null;
  const hasDate = searchedAt && Number.isFinite(searchedAt.getTime());
  return (
    <details className="disclosure" open>
      <summary>Resale evidence · {estimate.sources.length} sources</summary>
      <div className="body flex flex-col gap-3">
        <p className="helper">
          {hasDate ? <>Search started <time dateTime={estimate.searchedAt}>{searchedAt.toLocaleString()}</time>.</> : "Search date unavailable for this estimate."}
          {" "}Details are reported by the AI from cited sources; prices, availability and vehicle matches are not independently verified.
        </p>
        {estimate.explanation && <p className="text-xs leading-relaxed text-[var(--ice-dim)]">{estimate.explanation}</p>}
        {!estimate.sources.length && <p className="helper">No comparable sources returned. Treat this estimate as having limited supporting evidence.</p>}
        <ul className="flex flex-col gap-3">
          {estimate.sources.map((source) => {
            const excluded = excludedUrls.includes(source.url);
            const url = safeUrl(source.url);
            return (
              <li key={source.url} className="rounded border border-[var(--hairline-2)] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="src-link">{source.title}</a> : <span>{source.title}</span>}
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={excluded}
                      onChange={() => onExcludedUrlsChange(excluded
                        ? excludedUrls.filter((item) => item !== source.url)
                        : [...excludedUrls, source.url])} />
                    Exclude from next search
                  </label>
                </div>
                <p className="helper mt-1">
                  {source.provenance === "provider-citation" ? "Link from a search citation" : source.provenance === "model-link" ? "Link supplied by the AI" : "Citation origin unavailable"}
                  {excluded ? " · Marked for exclusion" : ""}
                </p>
                <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  <div><dt className="label">Vehicle / year / trim</dt><dd>{source.vehicle || "Unknown"}</dd></div>
                  <div><dt className="label">Reported price (CAD)</dt><dd>{typeof source.priceCAD === "number" && Number.isFinite(source.priceCAD) && source.priceCAD >= 0 ? `${formatCAD0(source.priceCAD)} CAD` : "Unknown"}</dd></div>
                  <div><dt className="label">Mileage</dt><dd>{typeof source.mileageKm === "number" && Number.isFinite(source.mileageKm) && source.mileageKm >= 0 ? formatKm(source.mileageKm) : "Unknown"}</dd></div>
                  <div><dt className="label">Location</dt><dd>{source.location || "Unknown"}</dd></div>
                </dl>
                <p className="mt-3 text-xs leading-relaxed text-[var(--ice-dim)]"><span className="label">Match / listing notes: </span>{source.matchNotes || "No match or listing-status details reported."}</p>
              </li>
            );
          })}
        </ul>
        <p className="helper">Exclusions apply to the next search. They do not recalculate the values in this estimate.</p>
        {excludedUrls.length > 0 && <button type="button" className="btn-ghost self-start" onClick={() => onExcludedUrlsChange([])}>Clear exclusions ({excludedUrls.length})</button>}
      </div>
    </details>
  );
}
