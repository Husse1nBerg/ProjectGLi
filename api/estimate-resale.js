// Vercel serverless function — mirrors the Express /api/estimate-resale route.
// Reuses the shared resale logic so the AI behaviour is identical across hosts.
import { estimateResale } from "../server/src/resale.js";

// The OpenAI web_search call takes ~15-20s; raise the function timeout well above that.
export const maxDuration = 60;

const REQUIRED = ["makeModel", "year", "buyingPrice", "currentMileage", "expectedMileageAtSale", "ownershipYears"];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured on server" });
  }
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const missing = REQUIRED.filter((k) => body[k] === undefined || body[k] === "");
  if (missing.length) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` });
  }
  try {
    const estimate = await estimateResale(body);
    res.status(200).json(estimate);
  } catch (err) {
    console.error("estimate-resale failed:", err?.message || err);
    res.status(502).json({ error: "Resale estimation failed. Enter values manually." });
  }
}
