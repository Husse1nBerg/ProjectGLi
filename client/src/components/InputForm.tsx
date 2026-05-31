import type { CarInput } from "../types";

interface Props {
  input: CarInput;
  onChange: (next: CarInput) => void;
  errors: Partial<Record<keyof CarInput, string>>;
}

const numericFields: (keyof CarInput)[] = [
  "year", "buyingPrice", "currentMileage", "yearlyMileage", "ownershipYears", "husseinMonthly",
];

export default function InputForm({ input, onChange, errors }: Props) {
  const set = (key: keyof CarInput, value: string) => {
    const next = { ...input };
    if (numericFields.includes(key)) {
      (next[key] as number) = value === "" ? NaN : Number(value);
    } else {
      (next[key] as string) = value;
    }
    onChange(next);
  };

  const field = (
    key: keyof CarInput,
    label: string,
    type: "text" | "number",
    suffix?: string
  ) => (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type={type}
          value={Number.isNaN(input[key] as number) ? "" : String(input[key])}
          onChange={(e) => set(key, e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
        />
        {suffix && <span className="text-sm text-slate-500">{suffix}</span>}
      </div>
      {errors[key] && <span className="text-xs text-red-600">{errors[key]}</span>}
    </label>
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {field("makeModel", "Make / Model", "text")}
      {field("trim", "Trim", "text")}
      {field("year", "Year", "number")}
      {field("buyingPrice", "Buying price (before tax)", "number", "CAD")}
      {field("currentMileage", "Current mileage", "number", "km")}
      {field("yearlyMileage", "Yearly mileage", "number", "km/yr")}
      {field("ownershipYears", "Ownership period", "number", "years")}
      {field("husseinMonthly", "Hussein monthly contribution", "number", "CAD")}
    </div>
  );
}
