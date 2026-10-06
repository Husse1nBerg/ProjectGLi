# Task: Repair vehicle photos and listing estimates
Date: 2026-10-06
Status: fixes verified; publishing to main for Render deployment

## Plan
- [x] Trace photo and resale request paths and recent changes.
- [x] Reproduce provider/API failures and add regression tests.
- [x] Fix confirmed photo bugs in shared logic and both deployment adapters.
- [x] Add listing error classification, bounded requests, and required search.
- [x] Run regression tests, full tests, and production build.
- [x] Identify and resolve production listing failure from the Render error log.
- [x] Reproduce and fix missing sources when links appear only in the explanation.
- [x] Verify source-list regression tests and production build.

## Results
- Photo routes incorrectly required an OpenAI key for keyless Wikipedia lookups; removed both guards.
- Reproduced stale Jetta photo relabeled Honda after vehicle changes, including in-flight responses. Both regressions fixed.
- Prefer Wikipedia thumbnails and time out upstream photo providers after eight seconds.
- Production Jetta photo endpoint returned HTTP 200; its 3,154,705-byte JPEG also returned HTTP 200. No live photo outage reproduced for this input.
- Production listing POST returned HTTP 502 twice; warmed request took 18.69 seconds. Both responses hid the underlying provider error.
- Added safe error classifications for quota, rate limits, access, request rejection, and timeout. Require web search explicitly; cap OpenAI requests at 50 seconds with no retries.
- Validation: 12 server tests + 49 client tests pass; production build and diff whitespace check pass.
- User provided OpenAI 429 no-credits error and replenished credits. Live retest returned HTTP 200 with estimates; image JPEG returned HTTP 200.
- Live estimate included Markdown listing links but an empty sources array. Added annotation-first extraction with Markdown fallback, URL validation, deduplication, and extraction before explanation truncation. Four new regression tests failed before the fix.
- User authorized publishing the tested fixes to the existing main branch so Render can deploy them.
