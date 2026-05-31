import type { CarInput } from "../types";

interface Props {
  input: CarInput;
  onChange: (next: CarInput) => void;
  errors: Partial<Record<keyof CarInput, string>>;
}

const numericFields: (keyof CarInput)[] = [
  "year", "buyingPrice", "currentMileage", "yearlyMileage", "ownershipYears",
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
    <label className="flex flex-col gap-2">
      <span className="label">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type={type}
          value={Number.isNaN(input[key] as number) ? "" : String(input[key])}
          onChange={(e) => set(key, e.target.value)}
          className="field-input"
        />
        {suffix && <span className="suffix">{suffix}</span>}
      </div>
      {errors[key] && <span className="helper err">{errors[key]}</span>}
    </label>
  );

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {field("makeModel", "Make / Model", "text")}
      {field("trim", "Trim", "text")}
      {field("year", "Year", "number")}
      {field("buyingPrice", "Buying price (before tax)", "number", "CAD")}
      {field("currentMileage", "Current mileage", "number", "km")}
      {field("yearlyMileage", "Yearly mileage", "number", "km/yr")}
      {field("ownershipYears", "Ownership period", "number", "years")}
    </div>
  );
}
