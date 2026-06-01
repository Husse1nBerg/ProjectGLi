// Find real vehicle photos. Order of preference:
//   1. Google Custom Search (colour/year accurate) — only if GOOGLE_API_KEY + GOOGLE_CSE_ID set.
//   2. Wikipedia/Wikimedia lead image (keyless, free, no watermark) — generic colour/year.
// Returns [] if nothing found; the client then falls back to the imagin render.

const GOOGLE_ENDPOINT = "https://www.googleapis.com/customsearch/v1";
const UA = "HELOC-Car-Calculator/1.0 (personal project)";

export function buildImageQuery(input) {
  const { makeModel, year, trim, color } = input || {};
  return [color, year, makeModel, trim].filter(Boolean).join(" ").trim();
}

async function findViaGoogle(input) {
  const key = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CSE_ID;
  if (!key || !cx) return [];
  const q = buildImageQuery(input);
  if (!q) return [];
  try {
    const params = new URLSearchParams({
      key, cx, q, searchType: "image", num: "6", safe: "active", imgSize: "large",
    });
    const res = await fetch(`${GOOGLE_ENDPOINT}?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];
    return items
      .filter(
        (it) =>
          typeof it.link === "string" &&
          it.link.startsWith("https://") &&
          ((it.mime || "").startsWith("image/") || /\.(jpg|jpeg|png|webp)(\?|$)/i.test(it.link))
      )
      .map((it) => it.link)
      .slice(0, 6);
  } catch {
    return [];
  }
}

async function findViaWikipedia(input) {
  const term = (input?.makeModel || "").trim();
  if (!term) return [];
  try {
    // Resolve the best-matching article title.
    const osUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&limit=1&namespace=0&format=json&search=${encodeURIComponent(term)}`;
    const osRes = await fetch(osUrl, { headers: { "User-Agent": UA } });
    if (!osRes.ok) return [];
    const os = await osRes.json();
    const title = Array.isArray(os) && Array.isArray(os[1]) ? os[1][0] : null;
    if (!title) return [];

    // Fetch that article's lead image.
    const sumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const sumRes = await fetch(sumUrl, { headers: { "User-Agent": UA } });
    if (!sumRes.ok) return [];
    const sum = await sumRes.json();
    const img = sum?.originalimage?.source || sum?.thumbnail?.source;
    return typeof img === "string" && img.startsWith("https://") ? [img] : [];
  } catch {
    return [];
  }
}

export async function findCarImages(input) {
  const google = await findViaGoogle(input);
  if (google.length) return google;
  return findViaWikipedia(input);
}
