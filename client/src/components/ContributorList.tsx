import type { Contributor } from "../types";

interface Props {
  contributors: Contributor[];
  errors: Record<string, string>; // keyed by contributor id (amount error)
  onUpdate: (id: string, patch: Partial<Contributor>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}

export const MIN_CONTRIBUTORS = 2;
export const MAX_CONTRIBUTORS = 3;

// Accent colours aligned with the results breakdown tints (c1 frost, c2 gold, c3 mauve).
const DOT = ["#8aa5c2", "#d4a857", "#9b8cc4"];

let seq = 0;
export function newContributor(index: number): Contributor {
  seq += 1;
  return { id: `c${seq}`, name: `Contributor ${index}`, monthly: NaN };
}

export default function ContributorList({ contributors, errors, onUpdate, onAdd, onRemove }: Props) {
  const n = contributors.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="label">Contributors — last one pays the remainder</span>
        <button
          type="button"
          onClick={onAdd}
          disabled={n >= MAX_CONTRIBUTORS}
          className="btn-ghost disabled:opacity-40"
        >
          + Add contributor{n >= MAX_CONTRIBUTORS ? " (max 3)" : ""}
        </button>
      </div>

      {contributors.map((c, i) => {
        const isLast = i === n - 1;
        return (
          <div key={c.id} className="flex items-end gap-2">
            <span
              className="mb-3 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: DOT[i % DOT.length] }}
              aria-hidden
            />
            <label className="flex flex-1 flex-col gap-1">
              <span className="label">Name</span>
              <input
                type="text"
                value={c.name}
                onChange={(e) => onUpdate(c.id, { name: e.target.value })}
                className="field-input"
              />
            </label>

            <label className="flex w-40 flex-col gap-1">
              <span className="label">Monthly</span>
              {isLast ? (
                <div className="field-input flex items-center text-[var(--frost)]">remainder (auto)</div>
              ) : (
                <input
                  type="number"
                  value={Number.isNaN(c.monthly) ? "" : c.monthly}
                  onChange={(e) => onUpdate(c.id, { monthly: e.target.value === "" ? NaN : Number(e.target.value) })}
                  className="field-input"
                />
              )}
              {!isLast && errors[c.id] && <span className="helper err">{errors[c.id]}</span>}
            </label>

            <button
              type="button"
              onClick={() => onRemove(c.id)}
              disabled={n <= MIN_CONTRIBUTORS}
              title={n <= MIN_CONTRIBUTORS ? "At least two contributors" : "Remove"}
              className="src-link mb-3 disabled:opacity-30"
            >
              remove
            </button>
          </div>
        );
      })}
    </div>
  );
}
