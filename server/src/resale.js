import OpenAI from "openai";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o";

// Strict JSON schema the model is forced to satisfy (OpenAI structured outputs).
const RESALE_SCHEMA = {
  type: "object",
  properties: {
    conservativeResale: { type: "number" },
    realisticResale: { type: "number" },
    strongResale: { type: "number" },
    explanation: { type: "string" },
  },
  required: ["conservativeResale", "realisticResale", "strongResale", "explanation"],
  additionalProperties: false,
};

/** Extract the first JSON object found in a string. Returns null if none/invalid. */
export function extractJson(text) {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** Validate and coerce the model's resale payload into the response contract. */
export function normalizeEstimate(obj) {
  if (!obj) throw new Error("No JSON returned from model");
  const num = (v) => {
    const n = typeof v === "string" ? Number(v.replace(/[^0-9.]/g, "")) : Number(v);
    if (!Number.isFinite(n) || n < 0) throw new Error("Invalid resale number");
    return Math.round(n);
  };
  return {
    conservativeResale: num(obj.conservativeResale),
    realisticResale: num(obj.realisticResale),
    strongResale: num(obj.strongResale),
    explanation: String(obj.explanation || "").slice(0, 2000),
    sources: [],
  };
}

/** Pull the real url_citation annotations the web_search tool attached to the output. */
export function extractSources(response) {
  const sources = [];
  const seen = new Set();
  for (const item of response?.output ?? []) {
    if (item.type !== "message") continue;
    for (const part of item.content ?? []) {
      for (const ann of part.annotations ?? []) {
        if (ann.type === "url_citation" && ann.url && !seen.has(ann.url)) {
          seen.add(ann.url);
          sources.push({ url: ann.url, title: ann.title || ann.url });
        }
      }
    }
  }
  return sources;
}

export function buildPrompt(input) {
  const { makeModel, year, trim, transmission, buyingPrice, currentMileage, expectedMileageAtSale, ownershipYears, notes } = input;
  const vehicle = [year, makeModel, trim, transmission ? `${transmission} transmission` : ""]
    .filter(Boolean)
    .join(" ");
  const lines = [
    `You are a Quebec used-car pricing analyst. You MUST use web search to find current`,
    `Quebec/Canadian used-car listings (AutoTrader.ca, Kijiji Autos, etc.) for comparable`,
    `vehicles, then reason about the depreciation curve from those comps.`,
    ``,
    `Vehicle: ${vehicle}`,
    `Bought today for CAD ${buyingPrice} (before tax), current odometer ${currentMileage} km.`,
    `Owner keeps it ${ownershipYears} year(s); projected odometer at sale ≈ ${expectedMileageAtSale} km.`,
  ];
  if (notes && String(notes).trim()) {
    lines.push(`Additional details from the owner (factor these into comp selection): ${String(notes).trim()}`);
  }
  lines.push(
    ``,
    `Match comps on transmission and trim where possible — they materially affect resale.`,
    `Estimate the resale value in CAD at the END of the ownership period for three market`,
    `scenarios (conservative, realistic, strong). In the explanation, cite the specific`,
    `comparable listings (model, mileage, transmission, price) you found.`
  );
  return lines.join("\n");
}

export async function estimateResale(input) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: MODEL,
    tools: [{ type: "web_search_preview" }],
    input: buildPrompt(input),
    text: {
      format: {
        type: "json_schema",
        name: "resale_estimate",
        strict: true,
        schema: RESALE_SCHEMA,
      },
    },
  });
  const estimate = normalizeEstimate(extractJson(response.output_text));
  estimate.sources = extractSources(response);
  return estimate;
}
