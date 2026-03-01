# Backoffice Ops Specialist Memory

## Current State (Feb 2026)

### Backoffice Overview — FULLY MOCK
All components use mock data. First page backoffice sees.

### Agent Dashboard — PARTIALLY WIRED
- Earnings card: REAL (total earned, pending, thisMonth from allocations)
- Star progress: REAL
- Do Now section: uses MOCK_PRIORITY_ACTIONS
- Pipeline/scorecard: uses MOCK_CLIENT_STATS, MOCK_KPIs, MOCK_RANKING

### Agent Todo — PARTIALLY WIRED (Phase 1)
- Real DB todos (mock merging removed in Phase 1)
- Still uses MOCK_AGENT_CLIENTS, MOCK_EARNINGS, MOCK_TEAM_MEMBERS

### Backoffice Action Hub — FULLY MOCK
- agent-task-overview.tsx is 420 lines of mock data

### Reports — FULLY MOCK
- reports-view.tsx is 480 lines of mock data

### Agent Team — FULLY MOCK
### Agent Settings — FULLY MOCK

### Available Data Sources (all real)
- ClientDraft: draft counts by step, by agent
- Client: approved count, monthly trends
- BonusPool/Allocation: earnings, payouts
- Todo: pending/overdue counts, by agent
- PhoneAssignment: active devices, overdue
- EventLog: activity timeline
- User: hierarchy, star levels
