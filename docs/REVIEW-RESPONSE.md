# Review Response

*2026-02-05*

---

## Summary

| Issue | Valid? | Action |
|-------|--------|--------|
| Platform count inconsistent | ✅ Valid | Fix: Standardize to 11 platforms |
| Gmail integration timing | ⚠️ Partially valid | Clarify: Manual MVP, automated V2 |
| Commission math conflicts | ✅ Valid | Fix: Lock to single schedule |
| Exception handling gaps | ✅ Valid | Fix: Add state machine to page specs |
| Profit sharing data flow | ✅ Valid | Fix: Add to V1.1 spec |
| PRD_MERGED.md missing | ❌ Invalid | File exists at `/PRD_MERGED.md` |
| Open questions unanswered | ✅ Valid | Awaiting stakeholder input |
| Screenshot coverage gaps | ✅ Valid | Known limitation (happy path only) |

---

## Detailed Responses

### 1. Platform Count Inconsistent

**Valid: YES — needs fix**

The source of confusion:
- `more-details.md` (raw stakeholder input): "12 platforms" and "8 sports + 3 financial" 
- Our interpretation: 8 + 3 = 11 (we noted "12th TBD")

**Resolution:**
- **Confirmed count: 11 platforms**
- Sports (8): DraftKings, FanDuel, BetMGM, Caesars, Fanatics, Bally Bet, BetRivers, Bet365
- Financial (3): Bank, PayPal, EdgeBoost

**Action:** Update all docs to say "11 platforms" consistently. Remove "12" references. The original Chinese doc said "12" but the itemized list only has 11 — stakeholder confirmed this list is complete.

**Abbreviations for UI pills:**
| Platform | Code |
|----------|------|
| DraftKings | DK |
| FanDuel | FD |
| BetMGM | MGM |
| Caesars | CZR |
| Fanatics | FAN |
| Bally Bet | BB |
| BetRivers | BR |
| Bet365 | 365 |
| Bank | BNK |
| PayPal | PP |
| EdgeBoost | EB |

---

### 2. Gmail Integration Timing

**Valid: PARTIALLY — needs clarification, not necessarily a blocker**

The reviewer conflates two things:
1. **Gmail API automation** (keyword detection, auto-status-updates) → correctly deferred to V2
2. **Manual verification workflows** (24h follow-ups, registration checks) → included in MVP

**Clarification (confirmed by stakeholder):**
- MVP/V1: Backoffice **manually** monitors email, manually triggers to-dos
- V2: Gmail API automates keyword detection and to-do generation

The 24h follow-up to-dos mentioned in requirements are **not dependent on Gmail API** — they're generated when backoffice records a withdrawal. The Gmail integration just automates the "check if withdrawal email arrived" step.

**Action:** Add explicit note in MILESTONES.md distinguishing manual workflows (MVP) from automated workflows (V2).

---

### 3. Commission Math Conflicts

**Valid: YES — keep variable**

Three different numbers in docs:
- `more-details.md`: $200/client base
- `supplementary-requirements-v1.md`: $300/client base  
- `PAGES-GM.md`: $200-$350 tiered by agent level

**Resolution:** Commission structure is intentionally variable — exact numbers TBD. The system should support configurable commission rules, not hardcoded values.

**Action:** 
1. Remove all hardcoded commission amounts from docs
2. Design `CommissionRule` table to be fully configurable (base amount, tier multipliers, override percentages)
3. GM UI allows setting/adjusting all commission parameters
4. Document that commission math is "configurable" not "fixed"

---

### 4. Exception Handling / State Machine Gaps

**Valid: YES — needs fix**

The page specs (PAGES-AGENT.md, PAGES-BACKOFFICE.md) focus on happy-path interactions but don't spell out:
- 3-day deadline triggers
- Overdue state transitions
- EdgeBoost blocking behavior
- To-do auto-generation rules

**Action:** Add new doc `STATE-TRANSITIONS.md` covering:
- Client intake state machine (with triggers)
- Platform registration state machine
- To-do generation rules (what event → what to-do)
- Deadline/overdue handling

This already exists partially in PRD_MERGED.md sections 4-5, but should be extracted into a dedicated spec for engineers.

---

### 5. Profit Sharing Data Flow

**Valid: YES — needs spec**

PAGES-GM.md has UI skeleton but lacks:
- How transactions feed into profit share calculations
- Settlement integration
- Payout triggering

**Action:** Add `PROFIT-SHARING-SPEC.md` in V1.1 phase with:
- Calculation flow diagram
- Transaction → ProfitShareDetail creation
- Settlement integration points
- Payout workflow

---

### 6. PRD_MERGED.md Missing

**Valid: NO — file exists**

The file exists at `/PRD_MERGED.md` (project root, not in `/docs/`).

**Action:** Fix README.md path reference from `PRD_MERGED.md` to `../PRD_MERGED.md` (relative to docs folder).

---

### 7. Open Questions Unanswered

**Valid: YES — awaiting stakeholder**

These require stakeholder input, not documentation fixes:
- ~~Platform list~~ → Resolved (11 platforms confirmed)
- Screenshot retention policy → Need decision
- Gmail polling cadence → Deferred to V2
- Commission tiers → Need exact numbers
- Multi-currency → Need decision (assume USD-only for MVP?)
- Timezone handling → Need decision

**Action:** Create `DECISIONS-NEEDED.md` tracker and escalate to stakeholder.

---

### 8. Screenshot Coverage Gaps

**Valid: YES — known limitation**

Missing screenshots for:
- Gmail monitoring UI (V2, not designed yet)
- VIP alerts (V2)
- Closure audit flow (not built in Lovable yet)
- GM dashboards (V1.1, not built yet)
- Exception/error states

**Action:** Note in PAGES.md that current screenshots are happy-path only. Exception UX to be designed during implementation.

---

## Immediate Fixes

1. **Platform count:** Standardize to 11 everywhere
2. **README path:** Fix PRD_MERGED.md reference
3. **Commission:** Lock to $200 base, remove speculative tiers
4. **Gmail clarity:** Add manual vs automated distinction to milestones

## New Docs Needed

1. `STATE-TRANSITIONS.md` — Full state machine spec
2. `PROFIT-SHARING-SPEC.md` — Data flow spec (V1.1)
3. `DECISIONS-NEEDED.md` — Stakeholder decision tracker

---

## Note: Audit Logging

Existing `EventLog` table covers audit needs. Current EventType enum is client-lifecycle focused:

```
APPLICATION_SUBMITTED, PHONE_ISSUED, PHONE_RETURNED, PLATFORM_UPLOAD,
PLATFORM_STATUS_CHANGE, TODO_CREATED, TODO_COMPLETED, STATUS_CHANGE,
DEADLINE_EXTENDED, DEADLINE_MISSED, APPROVAL, REJECTION, COMMENT, KPI_IMPACT
```

**Action:** Expand `EventType` enum as needed during implementation to cover:
- `LOGIN` / `LOGOUT`
- `TRANSACTION_CREATED`
- `SETTLEMENT_CREATED`
- `CONFIG_CHANGED`
- `EXPORT`
- `USER_CREATED` / `USER_UPDATED`

No new table required.

---

## Actions Completed

### 1. ✅ Single Merged PRD Created
- Created `/PRD.md` as canonical source of truth
- Includes: platforms (11), state machines, to-do generation rules, EventLog requirements
- All other docs reference PRD.md
- Gmail scope clarified: manual MVP, automated V2

### 2. ✅ State Machine Added to Page Specs
- Updated `PAGES-AGENT.md` and `PAGES-BACKOFFICE.md` with:
  - State transition preconditions
  - To-do generation rules (what triggers, who assigned, due date)
  - EventLog types per action
  - Exception handling (deadline miss, EdgeBoost pending, extension approval)

### 3. ✅ Gmail Scope Documented
- MVP/V1: Manual monitoring by backoffice
- V2: Automated keyword detection, VIP updates
- Deviation noted in PRD.md Section 11

### 4. ✅ EventLog Types Expanded
- Added to schema: LOGIN, LOGOUT, TRANSACTION_CREATED, SETTLEMENT_CREATED, CONFIG_CHANGED, EXPORT, USER_CREATED, USER_UPDATED

---

*Ready for development green-light.*
