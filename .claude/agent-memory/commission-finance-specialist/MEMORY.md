# Commission & Finance Specialist Memory

## Current State (Feb 2026)

### Fully Wired
- $400 bonus pool creation on client approval
- Star pool distribution algorithm (4x$50 slices, hierarchy walk, backfill)
- Star level calculation (thresholds: 0-2, 3-6, 7-12, 13-20, 21+)
- Leadership promotions (ED/SED/MD/CMO)
- Commissions page (backoffice) — real data
- AllocationLine.createdAt added for time-based filtering (Phase 1)

### Partially Wired
- Agent Earnings — allocations real, KPIs mock (MOCK_KPIS, MOCK_HIERARCHY)
- Agent Dashboard — thisMonthEarnings computed from real data (Phase 1)
- Agent Detail — performance metrics computed from real data (Phase 1)

### Fully Mock
- Settlement view (727 lines) — needs QuarterlySettlement UI
- Fund allocation view (555 lines) — needs new FundMovement model
- Profit sharing view (864 lines) — needs partner + profit rules

### Test Coverage
73 tests across 7 files — the most tested domain in the codebase.
