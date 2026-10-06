// Vercel serverless function — Wikipedia photos, with optional Google image search.
import { findCarImages } from "../server/src/carImage.js";

export const maxDuration = 60;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  try {
    const images = await findCarImages(body);
    res.status(200).json({ images });
  } catch (err) {
    console.error("car-image failed:", err?.message || err);
    res.status(502).json({ error: "Image lookup failed." });
  }
}
