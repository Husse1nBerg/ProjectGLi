// Find real vehicle photos via the Google Custom Search JSON API (image search).
// Returns real, hot-linkable image URLs. Requires GOOGLE_API_KEY + GOOGLE_CSE_ID;
// if they are not configured it returns [] so the client falls back to the imagin render.

const GOOGLE_ENDPOINT = "https://www.googleapis.com/customsearch/v1";

export function buildImageQuery(input) {
  const { makeModel, year, trim, color } = input || {};
  return [color, year, makeModel, trim].filter(Boolean).join(" ").trim();
}

export async function findCarImages(input) {
  const key = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CSE_ID;
  if (!key || !cx) return []; // not configured → client uses the imagin fallback

  const q = buildImageQuery(input);
  if (!q) return [];

  const params = new URLSearchParams({
    key,
    cx,
    q,
    searchType: "image",
    num: "6",
    safe: "active",
    imgSize: "large",
  });

  const res = await fetch(`${GOOGLE_ENDPOINT}?${params.toString()}`);
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Google CSE ${res.status}: ${detail.slice(0, 200)}`);
  }
  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];
  return items
    .filter(
      (it) =>
        typeof it.link === "string" &&
        it.link.startsWith("https://") && // https only (avoids mixed-content blocks)
        ((it.mime || "").startsWith("image/") || /\.(jpg|jpeg|png|webp)(\?|$)/i.test(it.link))
    )
    .map((it) => it.link)
    .slice(0, 6);
}
