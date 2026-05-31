const cad = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  currencyDisplay: "narrowSymbol",
});

const cad0 = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const km = new Intl.NumberFormat("en-CA");

export function formatCAD(value: number): string {
  return cad.format(value);
}

/** Whole-dollar CAD (no cents) — for compact spaces like scenario tiles. */
export function formatCAD0(value: number): string {
  return cad0.format(value);
}

export function formatKm(value: number): string {
  return `${km.format(value)} km`;
}
