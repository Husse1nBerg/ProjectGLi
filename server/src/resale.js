import OpenAI from "openai";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o";

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
  };
}

export function buildPrompt(input) {
  const { makeModel, year, trim, buyingPrice, currentMileage, expectedMileageAtSale, ownershipYears } = input;
  return [
    `You are a Quebec used-car pricing analyst. Search current Quebec/Canadian used-car listings`,
    `(AutoTrader.ca, Kijiji Autos, etc.) and reason about the depreciation curve.`,
    ``,
    `Vehicle: ${year} ${makeModel} ${trim || ""}`.trim(),
    `Bought today for CAD ${buyingPrice} (before tax), current odometer ${currentMileage} km.`,
    `Owner keeps it ${ownershipYears} year(s); projected odometer at sale ≈ ${expectedMileageAtSale} km.`,
    ``,
    `Estimate the resale value in CAD at the END of the ownership period for three market scenarios.`,
    `Respond with ONLY a JSON object, no markdown, in exactly this shape:`,
    `{"conservativeResale": <number>, "realisticResale": <number>, "strongResale": <number>, "explanation": "<2-4 sentences citing what you found>"}`,
  ].join("\n");
}

export async function estimateResale(input) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: MODEL,
    tools: [{ type: "web_search_preview" }],
    input: buildPrompt(input),
  });
  const text = response.output_text;
  return normalizeEstimate(extractJson(text));
}
