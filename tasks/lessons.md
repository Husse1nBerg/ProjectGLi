# Lessons

## Verify whether a code defect explains the production failure
- **2026-10-06:** An obsolete OpenAI-key guard broke keyless image deployments, but the deployed image API and its returned JPEG succeeded. Treat the guard as a confirmed latent bug, not the cause of the reported live outage. Keep production evidence distinct from regression-test findings.

## Don't assume a bug while driving the app with automation
- **2026-05-31:** During a chrome-devtools simulation a contributor row appeared "missing." I diagnosed a stale-closure bug, but the user had simply clicked *remove* on a contributor while my automated fills were running. The calc was correct.
- **Pattern:** When the user may be interacting with the same live session, a "missing"/changed element can be their action, not a defect. Verify the actual state (and confirm with the user) before claiming a bug or refactoring to "fix" it.
- **Still:** functional `setState` updates for list edits are the right pattern regardless, so the refactor stayed.
