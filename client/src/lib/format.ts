const cad = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  currencyDisplay: "narrowSymbol",
});

const km = new Intl.NumberFormat("en-CA");

export function formatCAD(value: number): string {
  return cad.format(value);
}

export function formatKm(value: number): string {
  return `${km.format(value)} km`;
}
