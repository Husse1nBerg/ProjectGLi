import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { estimateResale } from "./resale.js";
import { findCarImages } from "./carImage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const REQUIRED = ["makeModel", "year", "buyingPrice", "currentMileage", "expectedMileageAtSale", "ownershipYears"];

app.post("/api/estimate-resale", async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured on server" });
  }
  const missing = REQUIRED.filter((k) => req.body?.[k] === undefined || req.body?.[k] === "");
  if (missing.length) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` });
  }
  try {
    const estimate = await estimateResale(req.body);
    res.json(estimate);
  } catch (err) {
    console.error("estimate-resale failed:", err?.message || err);
    res.status(502).json({ error: "Resale estimation failed. Enter values manually." });
  }
});

app.post("/api/car-image", async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured on server" });
  }
  try {
    const images = await findCarImages(req.body || {});
    res.json({ images });
  } catch (err) {
    console.error("car-image failed:", err?.message || err);
    res.status(502).json({ error: "Image lookup failed." });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Serve built client in production (after `npm run build`).
const clientDist = path.resolve(__dirname, "../../client/dist");
app.use(express.static(clientDist));
// SPA fallback: any non-API GET serves index.html. Express 5 dropped the bare
// "*" route string, so use a final middleware instead of app.get("*").
app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => console.log(`HELOC server on http://localhost:${PORT}`));
