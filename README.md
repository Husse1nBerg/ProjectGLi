# TRY IT HERE: 
https://heloc-car-calculator.onrender.com/


# HELOC Car Ownership Calculator

Calculates the true monthly/yearly cost of owning a car financed with a HELOC,
counting only **depreciation + interest carrying cost** (no insurance, gas,
maintenance, repairs, registration, or tires). Splits the cost between up to 3 payers
and estimates resale value via the OpenAI web-search API.

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

## Resale estimation

Two independent ways to set the resale value:

- **AI (web search):** the server calls the OpenAI Responses API with the `web_search`
  tool, which looks up live Quebec/Canadian listings. Output is enforced with a strict
  **JSON schema** (structured outputs), and the real **source URLs** the model cited are
  extracted from the response and shown as clickable links so you can verify the comps.
- **Classic depreciation curve (mileage-aware):** a deterministic, offline baseline —
  `resale = price × (1 − 0.15)^years × mileageFactor`, where the mileage factor rewards
  below-average use: `1 + (avgKmDriven − yourKmDriven)/1000 × 0.4%`, with an average-driver
  baseline of **15,000 km/yr**. At average mileage the factor is exactly 1 (no double
  counting). Tunable constants (`CURVE_ANNUAL_RATE`, `CURVE_AVG_ANNUAL_KM`,
  `CURVE_MILEAGE_SENSITIVITY`) live in `client/src/lib/heloc.ts`. Always available, no API call.

Every scenario value (conservative / realistic / strong / curve) is editable — the
estimates are starting points; your number wins.

## Usage

1. Enter make/model, year, trim, buying price, mileage, yearly km, ownership years,
   and Hussein's monthly contribution.
2. Click **Estimate resale value (AI)** — or pick the **Depreciation curve** scenario,
   or just type a resale value manually.
3. Switch between conservative / realistic / strong / curve scenarios; edit any value.
   Review the cited source listings under the AI explanation.
4. Review the results table and save cars to the comparison table.
