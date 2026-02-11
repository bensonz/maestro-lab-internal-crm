# Open Questions

## 2026-02-11: BetMGM Rejected — Should Phase 1 Submit Be Allowed?

**Status:** RESOLVED (2026-02-11)

**Context:** When an agent marks BetMGM as "Failed" during pre-qualification, the Submit button is still enabled. Submitting creates a client record with `intakeStatus: PENDING` and BetMGM platform = `REJECTED`. However:
- No notification is sent to backoffice (by design — nothing to review)
- Phase 2 is gated behind BetMGM verification, so it never unlocks
- The client is stuck in PENDING forever — a zombie record

**Question:** Can a client proceed without BetMGM, or is BetMGM a hard gate for onboarding?

**Option A — Hard gate:** Block Phase 1 submit when BetMGM = failed. Show "Client cannot be onboarded without BetMGM." No record created.

**Option B — Soft gate:** Allow submit, skip BetMGM, notify backoffice anyway. Client proceeds through remaining platforms. Only makes sense if BetMGM isn't required.

**Current behavior:** Submit allowed but client is a dead end. Worst of both worlds.

**Resolution:** BetMGM is a hard gate, but with a retry mechanism. Agent ALWAYS uploads screenshots (success or failure proof). Backoffice reviews and can: approve, permanent reject, or reject with "retry in 24h". See `docs/prompts/betmgm-review-flow-redesign.md` for full design.
