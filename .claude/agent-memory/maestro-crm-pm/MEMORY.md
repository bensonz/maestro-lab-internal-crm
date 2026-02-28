# Maestro CRM PM Memory

## Key Architecture Facts
- 11 Prisma models, 6 backend services, 8 backend data files, 9 server actions
- 16 test files, 233 tests (all backend -- no frontend/component tests)
- mock-data.ts: 853 lines, mock-actions.ts: 238 lines (38 stub functions)
- Auth guard: `_require-agent.ts` (any logged-in user) and `_require-admin.ts` (ADMIN/BACKOFFICE only)

## Critical Discrepancy: Agent Management CRUD
- Agent Management page (`agent-management/page.tsx`) fetches REAL data from DB
- BUT `create-user-dialog.tsx` and `edit-user-dialog.tsx` INSIDE agent-management import from `@/lib/mock-actions`
- The REAL server actions exist at `@/app/actions/user-management.ts` (createUser, updateUser, toggleUserActive, resetUserPassword)
- Login Management page wired correctly: its dialogs import from `@/app/actions/user-management`
- This means creating/editing users from Agent Management page is a no-op silently

## Mock vs Real Summary (Feb 2026)
### Fully Real DB: commissions, login-management, agent-management (read), agent-detail (read+edit), new-client, agent-application
### Partially Real: agent dashboard (earnings real, pipeline/KPIs mock), agent clients (DB first, mock fallback), agent earnings (allocations real, KPIs mock), sales-interaction (drafts+todos+devices real, combined with mock lists), agent todo-list (real todos merged with mock), agent-detail-view (inline edit real via user-management actions)
### Pure Mock Shells: backoffice overview, client-management, client-settlement, fund-allocation, partners, profit-sharing, reports, phone-tracking, backoffice todo-list, agent team, agent settings, agent client detail ([id]/page.tsx), notification-dropdown

## Schema Coverage Gaps
- QuarterlySettlement model exists but no UI surfaces it (profit-sharing page is mock)
- No Notification model in schema -- notification-dropdown uses mock getNotifications()
- No Partner model -- partners page is pure mock
- No FundMovement model -- fund-allocation page is pure mock
- Client model is minimal (no detailed fields) -- most data lives in ClientDraft

## Patterns to Follow
- Real server actions: `@/app/actions/*.ts` (9 files)
- Mock stubs: `@/lib/mock-actions.ts` (no-op returns)
- Data layer: `@/backend/data/*.ts` (Prisma queries)
- Services: `@/backend/services/*.ts` (business logic)
