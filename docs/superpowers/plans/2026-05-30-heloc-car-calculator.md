# HELOC Car Ownership Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack web app that computes the true cost of owning a car financed by a HELOC (depreciation + interest carrying cost), split between two payers, with AI-estimated Quebec resale value.

**Architecture:** Two-package monorepo. `client/` (React + Vite + TypeScript + Tailwind) holds the UI and all deterministic HELOC math client-side and persists saved cars to `localStorage`. `server/` (Express + OpenAI SDK) is a thin proxy exposing one endpoint, `POST /api/estimate-resale`, that calls the OpenAI Responses API with the `web_search` tool to look up real Quebec/Canadian used-car values. The `OPENAI_API_KEY` lives only in gitignored `server/.env`, never reaches the browser. In dev, Vite proxies `/api` → Express.

**Tech Stack:** React 18, Vite 6, TypeScript, Tailwind CSS v4, Vitest (calc unit tests), Node 24, Express 5, openai (npm), dotenv, cors, concurrently.

**Constants:** Quebec combined tax (GST 5% + QST 9.975%) = **14.975%** (`0.14975`). HELOC rate = **4.45%** (`0.0445`).

**Modeling assumption (interest):** Monthly interest = `totalPurchaseCost × 0.0445 / 12`. This models an interest-only HELOC where the full balance stays outstanding for the entire ownership period (principal recovered at sale). Total interest over the period = `totalPurchaseCost × 0.0445 × years`.

**All monetary results MUST be presented in tables** (the results dashboard breakdown and the multi-car comparison are both `<table>` elements), with CAD formatting and kilometres for mileage.

---

## File Structure

```
ProjectGLi/
├── .gitignore
├── package.json                 # root: scripts to run client+server via concurrently
├── README.md
├── docs/superpowers/plans/2026-05-30-heloc-car-calculator.md
├── server/
│   ├── package.json
│   ├── .env                     # gitignored — holds OPENAI_API_KEY
│   ├── .env.example
│   └── src/
│       ├── index.js             # Express app, /api/estimate-resale route, static serve
│       └── resale.js            # OpenAI Responses API call + JSON extraction/validation
└── client/
    ├── package.json
    ├── index.html
    ├── vite.config.ts           # React + Tailwind plugins, /api proxy to :3001
    ├── tsconfig.json
    ├── tsconfig.node.json
    └── src/
        ├── main.tsx
        ├── App.tsx              # state orchestration, wires components together
        ├── index.css           # Tailwind import
        ├── types.ts            # CarInput, ResaleEstimate, HelocResult, SavedCar
        ├── api.ts              # fetchResaleEstimate() client for /api/estimate-resale
        ├── lib/
        │   ├── heloc.ts        # pure calc engine
        │   ├── heloc.test.ts   # vitest unit tests
        │   ├── format.ts       # formatCAD(), formatKm()
        │   ├── format.test.ts
        │   ├── storage.ts      # localStorage CRUD for saved cars
        │   └── storage.test.ts
        └── components/
            ├── InputForm.tsx       # vehicle + financing inputs, validation
            ├── ResalePanel.tsx     # estimate button, loading, 3 editable scenarios
            ├── ResultsDashboard.tsx# results TABLE + headline cards
            └── ComparisonTable.tsx # saved cars side-by-side TABLE
```

---

## Task 0: Root scaffold, gitignore, secret handling

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `server/.env`
- Create: `server/.env.example`

- [ ] **Step 1: Create `.gitignore`**

```gitignore
node_modules/
dist/
.env
*.local
.DS_Store
server/.env
client/dist/
```

- [ ] **Step 2: Create `server/.env.example`**

```bash
# Copy to server/.env and fill in. server/.env is gitignored — never commit it.
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o
PORT=3001
```

- [ ] **Step 3: Create `server/.env` with the real key**

```bash
OPENAI_API_KEY=<paste-your-real-key-here>
OPENAI_MODEL=gpt-4o
PORT=3001
```

> NOTE: This key was shared in plaintext and should be rotated at platform.openai.com after the build. `.gitignore` lists `server/.env` so it is never committed.

- [ ] **Step 4: Create root `package.json`**

```json
{
  "name": "heloc-car-calculator",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "concurrently -n server,client -c blue,green \"npm:dev:server\" \"npm:dev:client\"",
    "dev:server": "npm --prefix server run dev",
    "dev:client": "npm --prefix client run dev",
    "install:all": "npm install && npm --prefix server install && npm --prefix client install",
    "build": "npm --prefix client run build",
    "test": "npm --prefix client run test"
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

- [ ] **Step 5: Verify gitignore protects the secret**

Run: `cd "C:/Users/HusseinBayoun/projects/ProjectGLi" && git check-ignore server/.env`
Expected: prints `server/.env` (confirms it is ignored).

- [ ] **Step 6: Commit**

```bash
git add .gitignore package.json server/.env.example
git commit -m "chore: root scaffold, gitignore, env template"
```

(Note: `server/.env` is intentionally NOT staged — it is ignored.)

---

## Task 1: Server scaffold

**Files:**
- Create: `server/package.json`

- [ ] **Step 1: Create `server/package.json`**

```json
{
  "name": "heloc-server",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "node --watch --env-file=.env src/index.js",
    "start": "node --env-file=.env src/index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^5.0.1",
    "openai": "^4.77.0"
  }
}
```

- [ ] **Step 2: Install server deps**

Run: `cd "C:/Users/HusseinBayoun/projects/ProjectGLi/server" && npm install`
Expected: creates `server/node_modules`, exits 0.

- [ ] **Step 3: Commit**

```bash
git add server/package.json server/package-lock.json
git commit -m "chore(server): scaffold express + openai deps"
```

---

## Task 2: Resale estimation module + endpoint

**Files:**
- Create: `server/src/resale.js`
- Create: `server/src/index.js`

- [ ] **Step 1: Create `server/src/resale.js`**

```js
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
```

> NOTE on tool name: the Responses API web-search tool type is `web_search_preview` (widely available) — if the deployed account has GA `web_search`, change the string in one place. Either way, failure falls back to manual entry on the client.

- [ ] **Step 2: Create `server/src/index.js`**

```js
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { estimateResale } from "./resale.js";

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

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Serve built client in production (after `npm run build`).
const clientDist = path.resolve(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));

app.listen(PORT, () => console.log(`HELOC server on http://localhost:${PORT}`));
```

- [ ] **Step 3: Smoke-test the server boots and validates**

Run:
```bash
cd "C:/Users/HusseinBayoun/projects/ProjectGLi/server" && node --env-file=.env src/index.js &
sleep 2
curl -s http://localhost:3001/api/health
curl -s -X POST http://localhost:3001/api/estimate-resale -H "Content-Type: application/json" -d "{}"
kill %1
```
Expected: health prints `{"ok":true}`; empty POST prints a 400 `{"error":"Missing fields: ...}`.

- [ ] **Step 4: Commit**

```bash
git add server/src/resale.js server/src/index.js
git commit -m "feat(server): /api/estimate-resale via OpenAI web search"
```

---

## Task 3: Client scaffold (Vite + React + TS + Tailwind v4)

**Files:**
- Create: `client/package.json`, `client/index.html`, `client/vite.config.ts`, `client/tsconfig.json`, `client/tsconfig.node.json`, `client/src/main.tsx`, `client/src/index.css`, `client/src/App.tsx` (placeholder)

- [ ] **Step 1: Create `client/package.json`**

```json
{
  "name": "heloc-client",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.6.3",
    "vite": "^6.0.3",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Create `client/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>HELOC Car Ownership Calculator</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Create `client/vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:3001" },
  },
});
```

- [ ] **Step 4: Create `client/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "types": ["vitest/globals"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 5: Create `client/tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 6: Create `client/src/index.css`**

```css
@import "tailwindcss";
```

- [ ] **Step 7: Create `client/src/main.tsx`**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 8: Create placeholder `client/src/App.tsx`**

```tsx
export default function App() {
  return <div className="p-8 text-2xl font-bold">HELOC Calculator</div>;
}
```

- [ ] **Step 9: Install client deps and verify dev build compiles**

Run:
```bash
cd "C:/Users/HusseinBayoun/projects/ProjectGLi/client" && npm install && npm run build
```
Expected: `client/dist/` is produced, exit 0.

- [ ] **Step 10: Commit**

```bash
git add client/package.json client/package-lock.json client/index.html client/vite.config.ts client/tsconfig.json client/tsconfig.node.json client/src/index.css client/src/main.tsx client/src/App.tsx
git commit -m "chore(client): vite + react + ts + tailwind scaffold"
```

---

## Task 4: Shared types

**Files:**
- Create: `client/src/types.ts`

- [ ] **Step 1: Create `client/src/types.ts`**

```ts
export interface CarInput {
  makeModel: string;
  year: number;
  trim: string;
  buyingPrice: number;      // before tax, CAD
  currentMileage: number;   // km
  yearlyMileage: number;    // km per year
  ownershipYears: number;
  husseinMonthly: number;   // CAD Hussein contributes per month
}

export type Scenario = "conservative" | "realistic" | "strong";

export interface ResaleEstimate {
  conservativeResale: number;
  realisticResale: number;
  strongResale: number;
  explanation: string;
}

export interface HelocResult {
  tax: number;
  totalPurchaseCost: number;
  expectedMileageAtSale: number;
  resaleValue: number;
  depreciationLoss: number;
  monthlyDepreciation: number;
  monthlyInterest: number;
  totalMonthlyCost: number;
  yearlyCost: number;
  totalOwnershipCost: number;
  husseinMonthly: number;
  abedMonthly: number;
  husseinTotal: number;
  abedTotal: number;
  overContribution: boolean; // husseinMonthly > totalMonthlyCost
  months: number;
}

export interface SavedCar {
  id: string;
  label: string;
  input: CarInput;
  resaleValue: number;
  scenario: Scenario;
  result: HelocResult;
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/types.ts
git commit -m "feat(client): shared domain types"
```

---

## Task 5: HELOC calc engine (TDD)

**Files:**
- Create: `client/src/lib/heloc.ts`
- Test: `client/src/lib/heloc.test.ts`

- [ ] **Step 1: Write failing tests `client/src/lib/heloc.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { TAX_RATE, HELOC_RATE, mileageAtSale, calculateHeloc } from "./heloc";
import type { CarInput } from "../types";

const base: CarInput = {
  makeModel: "Toyota Corolla",
  year: 2022,
  trim: "LE",
  buyingPrice: 30000,
  currentMileage: 20000,
  yearlyMileage: 15000,
  ownershipYears: 2,
  husseinMonthly: 200,
};

describe("constants", () => {
  it("uses Quebec tax and HELOC rates", () => {
    expect(TAX_RATE).toBe(0.14975);
    expect(HELOC_RATE).toBe(0.0445);
  });
});

describe("mileageAtSale", () => {
  it("adds yearly mileage over ownership years", () => {
    expect(mileageAtSale(20000, 15000, 2)).toBe(50000);
  });
});

describe("calculateHeloc", () => {
  const r = calculateHeloc(base, 22000);

  it("computes Quebec tax on the buying price", () => {
    expect(r.tax).toBeCloseTo(4492.5, 2); // 30000 * 0.14975
  });
  it("computes total purchase cost", () => {
    expect(r.totalPurchaseCost).toBeCloseTo(34492.5, 2);
  });
  it("computes depreciation loss vs resale", () => {
    expect(r.depreciationLoss).toBeCloseTo(12492.5, 2); // 34492.5 - 22000
  });
  it("computes monthly depreciation over the period", () => {
    expect(r.monthlyDepreciation).toBeCloseTo(520.52, 2); // 12492.5 / 24
  });
  it("computes monthly interest on full balance", () => {
    expect(r.monthlyInterest).toBeCloseTo(127.91, 2); // 34492.5 * 0.0445 / 12
  });
  it("computes total monthly cost", () => {
    expect(r.totalMonthlyCost).toBeCloseTo(648.43, 2);
  });
  it("computes yearly and total ownership cost", () => {
    expect(r.yearlyCost).toBeCloseTo(7781.16, 2);
    expect(r.totalOwnershipCost).toBeCloseTo(15562.32, 2);
  });
  it("splits payments: Abed pays the remainder", () => {
    expect(r.husseinMonthly).toBe(200);
    expect(r.abedMonthly).toBeCloseTo(448.43, 2);
    expect(r.husseinTotal).toBeCloseTo(4800, 2);
    expect(r.abedTotal).toBeCloseTo(10762.32, 2);
  });
  it("flags over-contribution and clamps Abed to >= 0", () => {
    const over = calculateHeloc({ ...base, husseinMonthly: 5000 }, 22000);
    expect(over.overContribution).toBe(true);
    expect(over.abedMonthly).toBe(0);
    expect(over.abedTotal).toBe(0);
  });
  it("handles resale above purchase cost (a gain) without crashing", () => {
    const gain = calculateHeloc(base, 40000);
    expect(gain.depreciationLoss).toBeCloseTo(-5507.5, 2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "C:/Users/HusseinBayoun/projects/ProjectGLi/client" && npx vitest run src/lib/heloc.test.ts`
Expected: FAIL — cannot resolve `./heloc`.

- [ ] **Step 3: Implement `client/src/lib/heloc.ts`**

```ts
import type { CarInput, HelocResult } from "../types";

export const TAX_RATE = 0.14975; // GST 5% + QST 9.975% (Quebec)
export const HELOC_RATE = 0.0445; // fixed annual HELOC interest

export function mileageAtSale(current: number, yearly: number, years: number): number {
  return current + yearly * years;
}

export function calculateHeloc(input: CarInput, resaleValue: number): HelocResult {
  const months = input.ownershipYears * 12;
  const tax = input.buyingPrice * TAX_RATE;
  const totalPurchaseCost = input.buyingPrice + tax;
  const depreciationLoss = totalPurchaseCost - resaleValue;
  const monthlyDepreciation = months > 0 ? depreciationLoss / months : 0;
  const monthlyInterest = (totalPurchaseCost * HELOC_RATE) / 12;
  const totalMonthlyCost = monthlyDepreciation + monthlyInterest;
  const yearlyCost = totalMonthlyCost * 12;
  const totalOwnershipCost = totalMonthlyCost * months;

  const overContribution = input.husseinMonthly > totalMonthlyCost;
  const husseinMonthly = input.husseinMonthly;
  const abedMonthly = Math.max(0, totalMonthlyCost - husseinMonthly);

  return {
    tax,
    totalPurchaseCost,
    expectedMileageAtSale: mileageAtSale(input.currentMileage, input.yearlyMileage, input.ownershipYears),
    resaleValue,
    depreciationLoss,
    monthlyDepreciation,
    monthlyInterest,
    totalMonthlyCost,
    yearlyCost,
    totalOwnershipCost,
    husseinMonthly,
    abedMonthly,
    husseinTotal: husseinMonthly * months,
    abedTotal: abedMonthly * months,
    overContribution,
    months,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd "C:/Users/HusseinBayoun/projects/ProjectGLi/client" && npx vitest run src/lib/heloc.test.ts`
Expected: PASS (all assertions green).

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/heloc.ts client/src/lib/heloc.test.ts
git commit -m "feat(client): HELOC calc engine with unit tests"
```

---

## Task 6: Formatting helpers (TDD)

**Files:**
- Create: `client/src/lib/format.ts`
- Test: `client/src/lib/format.test.ts`

- [ ] **Step 1: Write failing tests `client/src/lib/format.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { formatCAD, formatKm } from "./format";

describe("formatCAD", () => {
  it("formats whole dollars in CAD", () => {
    expect(formatCAD(34492.5)).toBe("$34,492.50");
  });
  it("formats zero", () => {
    expect(formatCAD(0)).toBe("$0.00");
  });
});

describe("formatKm", () => {
  it("formats kilometres with a km suffix", () => {
    expect(formatKm(50000)).toBe("50,000 km");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "C:/Users/HusseinBayoun/projects/ProjectGLi/client" && npx vitest run src/lib/format.test.ts`
Expected: FAIL — cannot resolve `./format`.

- [ ] **Step 3: Implement `client/src/lib/format.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd "C:/Users/HusseinBayoun/projects/ProjectGLi/client" && npx vitest run src/lib/format.test.ts`
Expected: PASS. (If `narrowSymbol` yields `CA$`, adjust the test expectation to match the Node ICU output — confirm actual before finalizing.)

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/format.ts client/src/lib/format.test.ts
git commit -m "feat(client): CAD/km formatting helpers"
```

---

## Task 7: localStorage persistence (TDD)

**Files:**
- Create: `client/src/lib/storage.ts`
- Test: `client/src/lib/storage.test.ts`

- [ ] **Step 1: Write failing tests `client/src/lib/storage.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { loadSavedCars, saveCar, removeCar, STORAGE_KEY } from "./storage";
import type { SavedCar } from "../types";

const sample: SavedCar = {
  id: "a1",
  label: "2022 Toyota Corolla",
  input: {
    makeModel: "Toyota Corolla", year: 2022, trim: "LE", buyingPrice: 30000,
    currentMileage: 20000, yearlyMileage: 15000, ownershipYears: 2, husseinMonthly: 200,
  },
  resaleValue: 22000,
  scenario: "realistic",
  result: {
    tax: 4492.5, totalPurchaseCost: 34492.5, expectedMileageAtSale: 50000, resaleValue: 22000,
    depreciationLoss: 12492.5, monthlyDepreciation: 520.52, monthlyInterest: 127.91,
    totalMonthlyCost: 648.43, yearlyCost: 7781.16, totalOwnershipCost: 15562.32,
    husseinMonthly: 200, abedMonthly: 448.43, husseinTotal: 4800, abedTotal: 10762.32,
    overContribution: false, months: 24,
  },
};

beforeEach(() => localStorage.clear());

describe("storage", () => {
  it("returns [] when nothing saved", () => {
    expect(loadSavedCars()).toEqual([]);
  });
  it("saves and loads a car", () => {
    saveCar(sample);
    expect(loadSavedCars()).toHaveLength(1);
    expect(loadSavedCars()[0].id).toBe("a1");
  });
  it("removes a car by id", () => {
    saveCar(sample);
    removeCar("a1");
    expect(loadSavedCars()).toEqual([]);
  });
  it("tolerates corrupt storage", () => {
    localStorage.setItem(STORAGE_KEY, "not json");
    expect(loadSavedCars()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "C:/Users/HusseinBayoun/projects/ProjectGLi/client" && npx vitest run src/lib/storage.test.ts --environment jsdom`
Expected: FAIL — cannot resolve `./storage` (and jsdom needed). Add `jsdom` dev dep next step.

- [ ] **Step 3: Add jsdom and configure vitest environment**

Run: `cd "C:/Users/HusseinBayoun/projects/ProjectGLi/client" && npm install -D jsdom`

Create `client/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
  },
});
```

- [ ] **Step 4: Implement `client/src/lib/storage.ts`**

```ts
import type { SavedCar } from "../types";

export const STORAGE_KEY = "heloc.savedCars.v1";

export function loadSavedCars(): SavedCar[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(cars: SavedCar[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cars));
}

export function saveCar(car: SavedCar): SavedCar[] {
  const cars = loadSavedCars().filter((c) => c.id !== car.id);
  cars.push(car);
  persist(cars);
  return cars;
}

export function removeCar(id: string): SavedCar[] {
  const cars = loadSavedCars().filter((c) => c.id !== id);
  persist(cars);
  return cars;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd "C:/Users/HusseinBayoun/projects/ProjectGLi/client" && npx vitest run src/lib/storage.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add client/src/lib/storage.ts client/src/lib/storage.test.ts client/vitest.config.ts client/package.json client/package-lock.json
git commit -m "feat(client): localStorage persistence for saved cars"
```

---

## Task 8: API client

**Files:**
- Create: `client/src/api.ts`

- [ ] **Step 1: Create `client/src/api.ts`**

```ts
import type { CarInput, ResaleEstimate } from "./types";
import { mileageAtSale } from "./lib/heloc";

export async function fetchResaleEstimate(input: CarInput): Promise<ResaleEstimate> {
  const body = {
    makeModel: input.makeModel,
    year: input.year,
    trim: input.trim,
    buyingPrice: input.buyingPrice,
    currentMileage: input.currentMileage,
    expectedMileageAtSale: mileageAtSale(input.currentMileage, input.yearlyMileage, input.ownershipYears),
    ownershipYears: input.ownershipYears,
  };
  const res = await fetch("/api/estimate-resale", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/api.ts
git commit -m "feat(client): resale estimate API client"
```

---

## Task 9: InputForm component

**Files:**
- Create: `client/src/components/InputForm.tsx`

- [ ] **Step 1: Create `client/src/components/InputForm.tsx`**

```tsx
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
```

- [ ] **Step 2: Verify it type-checks**

Run: `cd "C:/Users/HusseinBayoun/projects/ProjectGLi/client" && npx tsc -b --noEmit`
Expected: exit 0 (no type errors).

- [ ] **Step 3: Commit**

```bash
git add client/src/components/InputForm.tsx
git commit -m "feat(client): vehicle + financing input form"
```

---

## Task 10: ResalePanel component

**Files:**
- Create: `client/src/components/ResalePanel.tsx`

- [ ] **Step 1: Create `client/src/components/ResalePanel.tsx`**

```tsx
import type { ResaleEstimate, Scenario } from "../types";
import { formatCAD } from "../lib/format";

interface Props {
  estimate: ResaleEstimate | null;
  scenario: Scenario;
  resaleValue: number;
  loading: boolean;
  error: string | null;
  onEstimate: () => void;
  onScenario: (s: Scenario) => void;
  onResaleEdit: (value: number) => void;
}

const scenarios: { key: Scenario; label: string; field: keyof ResaleEstimate }[] = [
  { key: "conservative", label: "Conservative", field: "conservativeResale" },
  { key: "realistic", label: "Realistic", field: "realisticResale" },
  { key: "strong", label: "Strong market", field: "strongResale" },
];

export default function ResalePanel(props: Props) {
  const { estimate, scenario, resaleValue, loading, error, onEstimate, onScenario, onResaleEdit } = props;
  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={onEstimate}
        disabled={loading}
        className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? "Searching Quebec listings…" : "Estimate resale value (AI)"}
      </button>

      {error && <p className="text-sm text-red-600">{error} You can type a resale value below.</p>}

      {estimate && (
        <div className="grid grid-cols-3 gap-2">
          {scenarios.map((s) => (
            <button
              key={s.key}
              onClick={() => onScenario(s.key)}
              className={`rounded-lg border px-3 py-2 text-sm ${
                scenario === s.key ? "border-indigo-600 bg-indigo-50 font-semibold" : "border-slate-300"
              }`}
            >
              <div>{s.label}</div>
              <div className="text-xs text-slate-500">{formatCAD(estimate[s.field] as number)}</div>
            </button>
          ))}
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">Resale value (editable)</span>
        <input
          type="number"
          value={Number.isNaN(resaleValue) ? "" : resaleValue}
          onChange={(e) => onResaleEdit(e.target.value === "" ? NaN : Number(e.target.value))}
          className="rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>

      {estimate?.explanation && (
        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{estimate.explanation}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `cd "C:/Users/HusseinBayoun/projects/ProjectGLi/client" && npx tsc -b --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/ResalePanel.tsx
git commit -m "feat(client): resale panel with editable AI scenarios"
```

---

## Task 11: ResultsDashboard component (RESULTS TABLE)

**Files:**
- Create: `client/src/components/ResultsDashboard.tsx`

- [ ] **Step 1: Create `client/src/components/ResultsDashboard.tsx`**

```tsx
import type { HelocResult } from "../types";
import { formatCAD, formatKm } from "../lib/format";

interface Props {
  result: HelocResult;
  onSave: () => void;
}

export default function ResultsDashboard({ result, onSave }: Props) {
  const rows: { label: string; value: string; strong?: boolean }[] = [
    { label: "Purchase price (before tax)", value: formatCAD(result.totalPurchaseCost - result.tax) },
    { label: "Quebec tax (14.975%)", value: formatCAD(result.tax) },
    { label: "Total purchase cost", value: formatCAD(result.totalPurchaseCost) },
    { label: "Projected mileage at sale", value: formatKm(result.expectedMileageAtSale) },
    { label: "Estimated resale value", value: formatCAD(result.resaleValue) },
    { label: "Depreciation loss", value: formatCAD(result.depreciationLoss) },
    { label: "Monthly depreciation", value: formatCAD(result.monthlyDepreciation) },
    { label: "Monthly HELOC interest", value: formatCAD(result.monthlyInterest) },
    { label: "Total monthly cost", value: formatCAD(result.totalMonthlyCost), strong: true },
    { label: "Yearly cost", value: formatCAD(result.yearlyCost) },
    { label: `Total ${result.months / 12}-year cost`, value: formatCAD(result.totalOwnershipCost), strong: true },
    { label: "Hussein monthly share", value: formatCAD(result.husseinMonthly) },
    { label: "Abed monthly share", value: formatCAD(result.abedMonthly) },
    { label: "Hussein total contribution", value: formatCAD(result.husseinTotal) },
    { label: "Abed total contribution", value: formatCAD(result.abedTotal) },
  ];

  return (
    <div className="flex flex-col gap-4">
      {result.overContribution && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          ⚠ Hussein's monthly contribution exceeds the total monthly cost. Abed's share is clamped to $0.00.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card title="Total monthly" value={formatCAD(result.totalMonthlyCost)} />
        <Card title="Hussein / month" value={formatCAD(result.husseinMonthly)} />
        <Card title="Abed / month" value={formatCAD(result.abedMonthly)} />
      </div>

      <table className="w-full border-collapse overflow-hidden rounded-lg border border-slate-200 text-sm">
        <thead>
          <tr className="bg-slate-100 text-left">
            <th className="px-4 py-2 font-semibold">Metric</th>
            <th className="px-4 py-2 text-right font-semibold">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className={`border-t border-slate-100 ${row.strong ? "bg-indigo-50 font-semibold" : ""}`}>
              <td className="px-4 py-2">{row.label}</td>
              <td className="px-4 py-2 text-right tabular-nums">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={onSave} className="self-start rounded-lg border border-indigo-600 px-4 py-2 font-medium text-indigo-700 hover:bg-indigo-50">
        Save to comparison
      </button>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `cd "C:/Users/HusseinBayoun/projects/ProjectGLi/client" && npx tsc -b --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/ResultsDashboard.tsx
git commit -m "feat(client): results dashboard table + headline cards"
```

---

## Task 12: ComparisonTable component (COMPARISON TABLE)

**Files:**
- Create: `client/src/components/ComparisonTable.tsx`

- [ ] **Step 1: Create `client/src/components/ComparisonTable.tsx`**

```tsx
import type { SavedCar } from "../types";
import { formatCAD } from "../lib/format";

interface Props {
  cars: SavedCar[];
  onRemove: (id: string) => void;
}

export default function ComparisonTable({ cars, onRemove }: Props) {
  if (cars.length === 0) {
    return <p className="text-sm text-slate-500">No saved cars yet. Save a calculation to compare here.</p>;
  }

  const metrics: { label: string; get: (c: SavedCar) => string }[] = [
    { label: "Total purchase cost", get: (c) => formatCAD(c.result.totalPurchaseCost) },
    { label: "Resale value", get: (c) => formatCAD(c.result.resaleValue) },
    { label: "Depreciation loss", get: (c) => formatCAD(c.result.depreciationLoss) },
    { label: "Total monthly cost", get: (c) => formatCAD(c.result.totalMonthlyCost) },
    { label: "Yearly cost", get: (c) => formatCAD(c.result.yearlyCost) },
    { label: "Total ownership cost", get: (c) => formatCAD(c.result.totalOwnershipCost) },
    { label: "Hussein / month", get: (c) => formatCAD(c.result.husseinMonthly) },
    { label: "Abed / month", get: (c) => formatCAD(c.result.abedMonthly) },
  ];

  return (
    <table className="w-full border-collapse overflow-hidden rounded-lg border border-slate-200 text-sm">
      <thead>
        <tr className="bg-slate-100 text-left">
          <th className="px-4 py-2 font-semibold">Metric</th>
          {cars.map((c) => (
            <th key={c.id} className="px-4 py-2 font-semibold">
              <div className="flex items-center justify-between gap-2">
                <span>{c.label}</span>
                <button onClick={() => onRemove(c.id)} className="text-xs text-red-600 hover:underline">remove</button>
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {metrics.map((m) => (
          <tr key={m.label} className="border-t border-slate-100">
            <td className="px-4 py-2 text-slate-600">{m.label}</td>
            {cars.map((c) => (
              <td key={c.id} className="px-4 py-2 text-right tabular-nums">{m.get(c)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `cd "C:/Users/HusseinBayoun/projects/ProjectGLi/client" && npx tsc -b --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/ComparisonTable.tsx
git commit -m "feat(client): side-by-side comparison table"
```

---

## Task 13: App orchestration

**Files:**
- Modify: `client/src/App.tsx` (replace placeholder)

- [ ] **Step 1: Replace `client/src/App.tsx`**

```tsx
import { useEffect, useMemo, useState } from "react";
import type { CarInput, HelocResult, ResaleEstimate, SavedCar, Scenario } from "./types";
import { calculateHeloc } from "./lib/heloc";
import { loadSavedCars, saveCar, removeCar } from "./lib/storage";
import { fetchResaleEstimate } from "./api";
import InputForm from "./components/InputForm";
import ResalePanel from "./components/ResalePanel";
import ResultsDashboard from "./components/ResultsDashboard";
import ComparisonTable from "./components/ComparisonTable";

const defaultInput: CarInput = {
  makeModel: "",
  year: 2022,
  trim: "",
  buyingPrice: NaN,
  currentMileage: NaN,
  yearlyMileage: 15000,
  ownershipYears: 2,
  husseinMonthly: NaN,
};

const scenarioField: Record<Scenario, keyof ResaleEstimate> = {
  conservative: "conservativeResale",
  realistic: "realisticResale",
  strong: "strongResale",
};

function validate(input: CarInput): Partial<Record<keyof CarInput, string>> {
  const errors: Partial<Record<keyof CarInput, string>> = {};
  if (!input.makeModel.trim()) errors.makeModel = "Required";
  const positive: (keyof CarInput)[] = ["buyingPrice", "ownershipYears"];
  for (const k of positive) {
    const v = input[k] as number;
    if (Number.isNaN(v) || v <= 0) errors[k] = "Must be > 0";
  }
  const nonNeg: (keyof CarInput)[] = ["currentMileage", "yearlyMileage", "husseinMonthly"];
  for (const k of nonNeg) {
    const v = input[k] as number;
    if (Number.isNaN(v) || v < 0) errors[k] = "Must be ≥ 0";
  }
  return errors;
}

let idCounter = 0;

export default function App() {
  const [input, setInput] = useState<CarInput>(defaultInput);
  const [estimate, setEstimate] = useState<ResaleEstimate | null>(null);
  const [scenario, setScenario] = useState<Scenario>("realistic");
  const [resaleValue, setResaleValue] = useState<number>(NaN);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCars, setSavedCars] = useState<SavedCar[]>([]);

  useEffect(() => setSavedCars(loadSavedCars()), []);

  const errors = validate(input);
  const isValid = Object.keys(errors).length === 0;

  const result: HelocResult | null = useMemo(() => {
    if (!isValid || Number.isNaN(resaleValue)) return null;
    return calculateHeloc(input, resaleValue);
  }, [input, resaleValue, isValid]);

  async function handleEstimate() {
    if (!isValid) {
      setError("Fix the input errors before estimating.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const est = await fetchResaleEstimate(input);
      setEstimate(est);
      setScenario("realistic");
      setResaleValue(est.realisticResale);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Estimation failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleScenario(s: Scenario) {
    setScenario(s);
    if (estimate) setResaleValue(estimate[scenarioField[s]] as number);
  }

  function handleSave() {
    if (!result) return;
    const car: SavedCar = {
      id: `car-${++idCounter}-${result.totalPurchaseCost}`,
      label: `${input.year} ${input.makeModel}`.trim() || "Car",
      input,
      resaleValue,
      scenario,
      result,
    };
    setSavedCars(saveCar(car));
  }

  function handleRemove(id: string) {
    setSavedCars(removeCar(id));
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">HELOC Car Ownership Calculator</h1>
          <p className="mt-1 text-slate-600">
            True cost of owning a car financed by a HELOC at 4.45% — depreciation + interest carrying cost only.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Vehicle & financing</h2>
            <InputForm input={input} onChange={setInput} errors={errors} />
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Resale value</h2>
            <ResalePanel
              estimate={estimate}
              scenario={scenario}
              resaleValue={resaleValue}
              loading={loading}
              error={error}
              onEstimate={handleEstimate}
              onScenario={handleScenario}
              onResaleEdit={setResaleValue}
            />
          </section>
        </div>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Results</h2>
          {result ? (
            <ResultsDashboard result={result} onSave={handleSave} />
          ) : (
            <p className="text-sm text-slate-500">
              Enter valid vehicle details and a resale value (estimate or manual) to see results.
            </p>
          )}
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Comparison</h2>
          <ComparisonTable cars={savedCars} onRemove={handleRemove} />
        </section>

        <footer className="mt-8 text-center text-xs text-slate-400">
          Financing/depreciation only — excludes insurance, gas, maintenance, repairs, registration, tires.
        </footer>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify full type-check + production build**

Run: `cd "C:/Users/HusseinBayoun/projects/ProjectGLi/client" && npm run build`
Expected: `client/dist/` produced, exit 0.

- [ ] **Step 3: Commit**

```bash
git add client/src/App.tsx
git commit -m "feat(client): wire up app orchestration and layout"
```

---

## Task 14: README + final verification

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create `README.md`**

````markdown
# HELOC Car Ownership Calculator

Calculates the true monthly/yearly cost of owning a car financed with a HELOC,
counting only **depreciation + interest carrying cost** (no insurance, gas,
maintenance, repairs, registration, or tires). Splits the cost between two payers
(Hussein / Abed) and estimates Quebec resale value via the OpenAI web-search API.

## Financial model

- Quebec tax: **14.975%** (GST 5% + QST 9.975%) applied to the buying price.
- HELOC rate: fixed **4.45%**, interest-only on the full balance for the whole period.
- Total purchase cost = buying price + tax.
- Depreciation loss = total purchase cost − resale value.
- Monthly cost = depreciation loss / months + (total purchase cost × 4.45% / 12).
- Abed monthly = total monthly − Hussein monthly (clamped at $0; warns if Hussein over-pays).

## Setup

```bash
npm run install:all          # installs root, server, and client deps
cp server/.env.example server/.env   # then put your OPENAI_API_KEY in server/.env
```

`server/.env` is gitignored — never commit your key.

## Run (development)

```bash
npm run dev                  # starts Express (:3001) + Vite (:5173) together
```

Open http://localhost:5173. The Vite dev server proxies `/api` to the Express server.

## Test

```bash
npm test                     # runs the client calc/format/storage unit tests
```

## Build (production)

```bash
npm run build                # builds client to client/dist
npm --prefix server start    # Express serves the built client + API on :3001
```

## Usage

1. Enter make/model, year, trim, buying price, mileage, yearly km, ownership years,
   and Hussein's monthly contribution.
2. Click **Estimate resale value (AI)** — or type a resale value manually.
3. Switch between conservative / realistic / strong-market scenarios; edit any value.
4. Review the results table and save cars to the comparison table.
````

- [ ] **Step 2: Run the full test suite**

Run: `cd "C:/Users/HusseinBayoun/projects/ProjectGLi/client" && npm test`
Expected: all heloc/format/storage tests PASS.

- [ ] **Step 3: End-to-end manual smoke (both servers)**

Run: `cd "C:/Users/HusseinBayoun/projects/ProjectGLi" && npm run install:all >/dev/null 2>&1; npm run dev` (in a background terminal), then load http://localhost:5173, fill the form, click estimate, confirm the results table renders and a saved car appears in the comparison table. Stop the servers when done.

- [ ] **Step 4: Confirm the secret never got committed**

Run: `cd "C:/Users/HusseinBayoun/projects/ProjectGLi" && git log --all -p -- server/.env | head -5`
Expected: empty output (the file was never tracked).

- [ ] **Step 5: Commit + push**

```bash
git add README.md docs/superpowers/plans/2026-05-30-heloc-car-calculator.md
git commit -m "docs: README and implementation plan"
git push -u origin main
```

---

## Self-Review

**Spec coverage:**
- True monthly/yearly/total cost, both payers' shares + totals → Tasks 5, 11. ✅
- Quebec 14.975% tax, 4.45% HELOC → Task 5 constants + tests. ✅
- Payment split + over-contribution warning → Tasks 5 (clamp/flag), 11 (banner). ✅
- All required inputs (make/model, year, trim, price, mileage, yearly mileage, years, Hussein contribution) → Task 4 types + Task 9 form. ✅
- AI resale (conservative/realistic/strong + explanation), default realistic, switchable, editable → Tasks 2, 10, 13. ✅
- Mileage = current + yearly × years → Task 5 `mileageAtSale` + Task 8 API mapping. ✅
- Backend `POST /api/estimate-resale` with exact request/response contract → Task 2. ✅
- Key in env, gitignored, never in frontend → Task 0 (.env + .gitignore), Task 2 (server-only). ✅
- Loading state, error handling, numeric validation → Tasks 9, 10, 13. ✅
- Results in TABLE + comparison TABLE, CAD + km → Tasks 11, 12. ✅
- Save/compare multiple cars (localStorage) → Tasks 7, 12, 13. ✅
- README → Task 14. ✅
- Excludes insurance/gas/etc. → footer note Task 13, README. ✅

**Placeholder scan:** No TBD/TODO; all code blocks complete. ✅

**Type consistency:** `CarInput`/`HelocResult`/`ResaleEstimate`/`SavedCar` defined in Task 4 and used consistently; `mileageAtSale`, `calculateHeloc`, `formatCAD`, `formatKm`, `loadSavedCars`/`saveCar`/`removeCar`, `fetchResaleEstimate` signatures match across tasks. ✅

**Risk note:** OpenAI Responses web-search tool type string (`web_search_preview` vs `web_search`) may differ by account — isolated to one line in `server/src/resale.js`; manual-entry fallback covers any API failure.
