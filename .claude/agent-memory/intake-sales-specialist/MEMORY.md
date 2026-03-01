# Intake & Sales Specialist Memory

## Current State (Feb 2026)

### New Client Intake
- Fully wired to real DB — all 4 steps functional
- Auto-save, credential generation, risk scoring all working
- Device reservation gate operational
- OCR modals are mock (mock-extract-id.ts) — real OCR not yet integrated

### Sales Interaction
- Phase 0 fix applied: removed mock data concatenation (MOCK_INTAKE_CLIENTS, MOCK_VERIFICATION_TASKS)
- Queue shows ONLY real DB drafts + todos now
- Still imports: MOCK_SALES_HIERARCHY (error fallback), MOCK_LIFECYCLE_CLIENTS (lifecycle tab)
- post-approval-list.tsx is fully mock — needs wiring to real approved clients
- Activity Timeline: real EventLog entries (56 in seed data)

### Known Remaining Mock Data
- `MOCK_LIFECYCLE_CLIENTS` in `sales-interaction-view.tsx` — lifecycle tab
- `MOCK_SALES_HIERARCHY` in `sales-interaction-view.tsx` — fallback only
- `post-approval-list.tsx` — entire component uses mock data

### Key Architecture Notes
- formDataRef pattern: prevents stale closures in auto-save callbacks
- highestStepRef: tracks max step reached, DB `step` field = highest ever
- Credentials saved immediately (bypass debounce) to prevent data loss
- Device gate uses deviceEverAssigned to prevent re-blocking after return
