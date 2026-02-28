# Gmail Automation Specialist Memory

## Current State (Feb 2026)

### Status: NOT YET BUILT
This is a new feature. No Gmail integration exists yet.

### Existing Infrastructure to Build On
- Todo system: createTodo(), completeTodo(), revertTodo() — all real, tested (16 tests)
- Platform definitions: src/lib/platforms.ts — 11 platforms (3 financial + 8 sportsbook)
- EventLog: append-only audit trail, working
- Client model: links to closer (agent), has firstName/lastName

### Schema Additions Needed
- GmailConnection model (OAuth tokens, sync state)
- FundMovement model (amount, direction, platform, client link)
- EmailDetectionLog model (deduplication, audit)

### Key Design Decisions (TBD)
- Polling vs Push (Gmail Pub/Sub) — start with polling
- Token storage approach — new model vs User extension
- Email retention policy — store minimal data
- Detection rule format — registry pattern
