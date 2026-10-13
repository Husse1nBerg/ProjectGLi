// Match photo labels to the requested year, make/model and trim. Never use a
// generic article's lead image or an unchecked render as a substitute.

const GOOGLE_ENDPOINT = "https://www.googleapis.com/customsearch/v1";
const UA = "HELOC-Car-Calculator/1.0 (personal project)";
// Keep the entire fallback chain within the serverless request budget.
const PROVIDER_TIMEOUT_MS = 8000;
const COMPETITION = /\b(rally|rallycross|wrc|race|racing|competition|diecast|toy|replica)\b/i;

function words(text) {
  return String(text || "").normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "")
    .match(/[\p{L}\p{N}]+/gu) || [];
}

function vehicleWords(input) {
  const model = words(input?.makeModel);
  const aliases = { vw: "volkswagen", chevy: "chevrolet", merc: "mercedes" };
  if (aliases[model[0]]) model[0] = aliases[model[0]];
  return [...new Set([String(input.year), ...model, ...words(input.trim)])];
}

function matchesVehicle(title, input) {
  if (typeof title !== "string" || COMPETITION.test(title.replace(/_/g, " "))) return false;
  const tokens = new Set(words(title));
  return vehicleWords(input).every((word) => tokens.has(word));
}

function httpsUrl(value) {
  try { return typeof value === "string" && new URL(value).protocol === "https:"; }
  catch { return false; }
}

export function buildImageQuery(input) {
  return [...vehicleWords(input), ...words(input.color), "-rally", "-wrc", "-racing"].join(" ");
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
    const res = await fetch(`${GOOGLE_ENDPOINT}?${params.toString()}`, {
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];
    return items
      .filter(
        (it) =>
          typeof it.link === "string" &&
          httpsUrl(it.link) &&
          matchesVehicle(it.title, input) &&
          ((it.mime || "").startsWith("image/") || /\.(jpg|jpeg|png|webp)(\?|$)/i.test(it.link))
      )
      .map((it) => it.link)
      .slice(0, 6);
  } catch {
    return [];
  }
}

async function findViaCommons(input) {
  try {
    // Search individual files, not articles. Colour is optional; identity is not.
    const params = new URLSearchParams({
      action: "query", format: "json", formatversion: "2", generator: "search",
      gsrsearch: buildImageQuery({ ...input, color: "" }), gsrnamespace: "6", gsrlimit: "12",
      prop: "imageinfo", iiprop: "url|mime", iiurlwidth: "960",
    });
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const pages = Array.isArray(data.query?.pages) ? data.query.pages : [];
    const colors = words(input.color);
    const candidates = pages.filter((page) => matchesVehicle(page.title, input));
    // Prefer matching colour labels without rejecting otherwise suitable photos.
    candidates.sort((a, b) => {
      const score = (page) => colors.filter((word) => words(page.title).includes(word)).length;
      return score(b) - score(a) || (a.index || 0) - (b.index || 0);
    });
    return [...new Set(candidates.flatMap((page) => {
      const info = page.imageinfo?.[0];
      if (!/^image\/(jpeg|png|webp)$/.test(info?.mime || "")) return [];
      const url = info.thumburl || info.url;
      return httpsUrl(url) ? [url] : [];
    }))].slice(0, 6);
  } catch {
    return [];
  }
}

export async function findCarImages(input) {
  if (!Number.isInteger(input?.year) || input.year < 1886 || input.year > 2100 || words(input.makeModel).length < 2) return [];
  const google = await findViaGoogle(input);
  if (google.length) return google;
  return findViaCommons(input);
}
