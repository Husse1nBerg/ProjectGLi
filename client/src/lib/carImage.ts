// Build a car-render image URL from the free imagin.studio CDN for the exact
// make/model/year. No API key needed (public demo customer). Returns "" if no model.

// Two-word brands that must not be split on the first space.
const TWO_WORD_MAKES: Record<string, string> = {
  "land rover": "land-rover",
  "alfa romeo": "alfa-romeo",
  "aston martin": "aston-martin",
};

// Single-word make aliases → imagin brand slug.
const MAKE_ALIASES: Record<string, string> = {
  vw: "volkswagen",
  chevy: "chevrolet",
  merc: "mercedes-benz",
  mercedes: "mercedes-benz",
  benz: "mercedes-benz",
  bimmer: "bmw",
  vauxhall: "opel",
};

/** Split a free-text "make model trim" string into an imagin make slug + model family. */
export function splitMakeModel(makeModel: string): { make: string; model: string } {
  const text = makeModel.trim().toLowerCase();
  if (!text) return { make: "", model: "" };

  for (const [phrase, slug] of Object.entries(TWO_WORD_MAKES)) {
    if (text.startsWith(phrase)) {
      return { make: slug, model: text.slice(phrase.length).trim() };
    }
  }
  const parts = text.split(/\s+/);
  const rawMake = parts[0];
  return { make: MAKE_ALIASES[rawMake] || rawMake, model: parts.slice(1).join(" ") };
}

// Set VITE_IMAGIN_CUSTOMER (a free imagin.studio developer key) to get watermark-free
// renders; otherwise the public demo key is used (works, but watermarked).
const IMAGIN_CUSTOMER =
  (import.meta.env?.VITE_IMAGIN_CUSTOMER as string | undefined) || "hrjavascript-mastery";

const COLORS = [
  "black", "white", "silver", "grey", "gray", "red", "blue", "green",
  "yellow", "orange", "brown", "beige", "gold", "purple", "bronze",
];
const MODIFIERS = ["metallic", "matte", "pearl", "dark", "light"];

/** Pull a colour phrase out of free-text notes (e.g. "red", "metallic blue"). "" if none. */
export function extractColor(notes: string): string {
  if (!notes) return "";
  const words = notes.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  const idx = words.findIndex((w) => COLORS.includes(w));
  if (idx === -1) return "";
  const prev = words[idx - 1];
  const color = words[idx] === "gray" ? "grey" : words[idx];
  return prev && MODIFIERS.includes(prev) ? `${prev} ${color}` : color;
}

/**
 * Build the imagin render URL for the exact make/model/year. If the notes mention a
 * colour, it is passed as paintDescription so the render matches (e.g. a red Ferrari).
 */
export function carImageUrl(makeModel: string, year: number, notes = ""): string {
  const { make, model } = splitMakeModel(makeModel);
  if (!make) return "";
  const params = new URLSearchParams({
    customer: IMAGIN_CUSTOMER,
    make,
    modelFamily: model,
    zoomType: "fullscreen",
    angle: "23",
  });
  if (Number.isFinite(year)) params.set("modelYear", String(year));
  const color = extractColor(notes);
  if (color) params.set("paintDescription", color);
  return `https://cdn.imagin.studio/getimage?${params.toString()}`;
}
