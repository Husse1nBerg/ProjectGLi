// Keep provider credentials and raw errors out of public responses.
export function resaleError(err) {
  const code = err?.code || err?.error?.code;
  if (code === "insufficient_quota") {
    return { status: 503, code: "AI_QUOTA_EXCEEDED", error: "Listing search is unavailable because the AI account has no remaining API quota. The site owner needs to check API billing and limits." };
  }
  if (err?.status === 401 || err?.status === 403) {
    return { status: 503, code: "AI_ACCESS_ERROR", error: "Listing search cannot access the AI service. The site owner needs to check the server API key and permissions." };
  }
  if (err?.status === 429) {
    return { status: 503, code: "AI_RATE_LIMITED", error: "Listing search is temporarily rate limited. Please try again shortly." };
  }
  if (["APIConnectionTimeoutError", "TimeoutError", "AbortError"].includes(err?.name)) {
    return { status: 504, code: "AI_TIMEOUT", error: "Listing search took too long. Please try again." };
  }
  if (err?.status === 400 || err?.status === 404 || err?.status === 422) {
    return { status: 502, code: "AI_REQUEST_REJECTED", error: "The AI service rejected the listing-search request. The site owner needs to check the configured model and server logs." };
  }
  return { status: 502, code: "AI_ESTIMATE_FAILED", error: "Listing search could not produce an estimate. Please try again." };
}
