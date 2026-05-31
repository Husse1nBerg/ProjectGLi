# Lessons

## Don't assume a bug while driving the app with automation
- **2026-05-31:** During a chrome-devtools simulation a contributor row appeared "missing." I diagnosed a stale-closure bug, but the user had simply clicked *remove* on a contributor while my automated fills were running. The calc was correct.
- **Pattern:** When the user may be interacting with the same live session, a "missing"/changed element can be their action, not a defect. Verify the actual state (and confirm with the user) before claiming a bug or refactoring to "fix" it.
- **Still:** functional `setState` updates for list edits are the right pattern regardless, so the refactor stayed.
