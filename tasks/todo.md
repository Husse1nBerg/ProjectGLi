# Task: Ownership planning improvements (items 3–7)
Date: 2026-10-13
Status: implemented and verified; publishing to main

## Current plan
- [x] Show outstanding HELOC principal, sale proceeds, cash shortfall and surplus without double counting depreciation.
- [x] Return comparable vehicle details and search date; display unknowns and allow exclusion with explicit re-estimation.
- [x] Add independent rate/resale/duration sensitivity controls with clear assumptions.
- [x] Reopen/update saved scenarios, compare assumptions, export CSV and share calculations via URL.
- [x] Preserve drafts and previous results, prevent stale search responses, add retry/cancel and manual fallback.
- [ ] Verify regression tests, app interactions and production build, then publish to the existing main branch.

## Assumptions
- Existing interest-only financing, Quebec purchase tax, CAD, and financing/depreciation scope remain unchanged.
- Sharing includes vehicle inputs and contribution names; estimates/evidence are not copied into the URL.
- Exclusion requires a fresh server estimate; unknown comparable attributes must never be invented.

## Current verification
- Full server/client suite and production build passed. Final App rerun passed 7 interactions after the share-link usability change; total coverage is 22 server + 81 client tests.
- Isolated Chrome smoke test passed desktop and 390px mobile: no page errors or horizontal overflow. Verified shared-link import and refresh, save/update/reopen, CSV download, retry, exclusions, and sensitivity controls. API replies were mocked in this browser test.
- Review fixes: validate restored evidence, consume imported share hash so draft edits survive refresh, cancel in-flight searches when selecting offline curve or editing resale.
- Screenshots and smoke script are temporary test artifacts, not included in the repository.

## Previous completed work

## Plan
- [x] Replace generic lead photos with year/model/trim-matched file search and reject competition cars.
- [x] Remove unchecked generic render fallback; test no-match behavior and Ford Focus RS regression.
- [x] Verify tests, build, and real provider lookup.
- [x] Trace photo and resale request paths and recent changes.
- [x] Reproduce provider/API failures and add regression tests.
- [x] Fix confirmed photo bugs in shared logic and both deployment adapters.
- [x] Add listing error classification, bounded requests, and required search.
- [x] Run regression tests, full tests, and production build.
- [x] Identify and resolve production listing failure from the Render error log.
- [x] Reproduce and fix missing sources when links appear only in the explanation.
- [x] Verify source-list regression tests and production build.

## Results
- Vehicle lookup now searches Commons file titles and requires year, make/model, and trim tokens. Google results use the same title filter; rally/WRC/racing results are rejected.
- Removed unchecked generic render fallback. Misspellings or unmatched vehicles produce no-match feedback rather than unrelated photos. Photo labels are not a guarantee of exact model-year identity; colour may differ.
- Live 2017 Ford Focus RS lookup returned six labeled photos. First result downloaded successfully (179,821 bytes) and was visually inspected: road-going Focus RS.
- Latest validation: 18 server + 52 client tests pass; production build and diff whitespace check pass.
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
