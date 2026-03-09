# CLAUDE.md

## 1. Quick Reference

```bash
docker compose up -d                       # Start PostgreSQL
pnpm dev                                   # Dev server (localhost:3000)
pnpm build                                 # Production build
pnpm lint                                  # ESLint
pnpm test                                  # Vitest watch mode
pnpm test:run                              # Tests once (CI)
pnpm db:migrate --name <desc>              # Create + apply migration
npx prisma generate                        # Regenerate Prisma client
npx tsx prisma/seed.ts                     # Seed DB (idempotent)
```

**Local setup:** `docker compose up -d` → `npx prisma migrate dev` → `npx prisma generate` → `npx tsx prisma/seed.ts` → `pnpm dev`

**Path alias:** `@/*` → `./src/*` | **Env:** `DATABASE_URL` (`.env` local, Neon on Vercel), `AUTH_SECRET` (32+ chars)

---

## 2. Architecture

CRM for client onboarding across sports betting platforms. Two portals:
- **Agent Portal** (`/agent/*`) — field agents manage client onboarding
- **Back Office** (`/backoffice/*`) — staff oversee agents, clients, finances

**Roles:** `AGENT`, `BACKOFFICE`, `ADMIN`, `FINANCE` (UserRole enum)

**Next.js App Router:** Server components for data, `'use client'` pushed down. Every action needs feedback: toast, inline errors, loading states.

---

## 3. Database

### 13 Prisma Models (`prisma/schema.prisma`)

- **User** — staff accounts with hierarchy (supervisorId), star level/tier, leadershipTier (NONE/ED/SED/MD/CMO)
- **AgentApplication** — PENDING → APPROVED/REJECTED. Stores idDocument + addressDocument
- **ClientRecord** — unified model: DRAFT → SUBMITTED → APPROVED → REJECTED → CLOSED. 4-step intake form data, risk flags, platformData (Json), generatedCredentials (Json), document paths, `approvedAt` timestamp. Links to closer (User). Replaces the old Client + ClientDraft dual-model pattern.
- **BonusPool** — $400 per approved client. `clientRecordId` FK. Has many BonusAllocation[]
- **BonusAllocation** — DIRECT / STAR_SLICE / BACKFILL. Status: PENDING → PAID
- **PromotionLog** — immutable star level + leadership tier change audit
- **QuarterlySettlement** — DRAFT → APPROVED → PAID. Unique per [leaderId, year, quarter]
- **PhoneAssignment** — SIGNED_OUT → RETURNED. `clientRecordId` FK. Tracks phone, carrier, deviceId, dueBackAt (3-day window). OVERDUE computed at view time
- **Todo** — PENDING → COMPLETED/CANCELLED. `clientRecordId` FK (single unified FK). issueCategory (9 predefined), dueDate (default 3 days), metadata (Json), source (MANUAL/EMAIL_AUTO)
- **FundAllocation** — records every fund allocation with platform, amount (Decimal 12,2), direction (DEPOSIT/WITHDRAWAL), confirmationStatus (UNCONFIRMED/CONFIRMED/DISCREPANCY), confirmedAmount, confirmedBy, discrepancyNotes, optional `clientRecordId` FK
- **GmailIntegration** — stores OAuth tokens for Gmail API inbox connection, historyId for incremental sync
- **ProcessedEmail** — dedup + audit trail for processed emails. gmailMessageId (unique), detectionType, links to todoId + fundAllocationId
- **EventLog** — append-only audit trail for all system events. EventType includes `FUND_ALLOCATED`, `GMAIL_SYNCED`, `EMAIL_TODO_CREATED`, `FUND_CONFIRMED`, `FUND_DISCREPANCY_FLAGGED`, `STEP_ADVANCED`
- **SystemConfig** — key-value store for dynamic system configuration. `key` (PK), `value` (String), `category`, `updatedAt`, `updatedById`. 25 configurable values across 4 categories, in-memory cache with 60s TTL

### Prisma 7 Setup

- **CLI config:** `prisma.config.ts` reads `DATABASE_URL` via `dotenv/config`
- **Runtime:** `src/backend/prisma/client.ts` — `pg.Pool` → `PrismaPg` adapter → `PrismaClient({ adapter })`. Returns proxy when no DATABASE_URL (build-safe)
- **Schema:** only `provider = "postgresql"` — no URL
- `pg` + `@prisma/adapter-pg` in `serverExternalPackages` in `next.config.ts`
- **Docker:** PostgreSQL 16 Alpine — `crm`/`crm_dev_password`/`crm_db` on port 5432
- **Production:** Neon PostgreSQL via Vercel. Deploy migrations: `DATABASE_URL="<neon-url>" pnpm db:migrate:deploy`

---

## 4. Key Patterns

**Auth:** NextAuth v5 beta, credentials provider. `const session = await auth(); if (!session?.user) return { success: false, error: 'Not authenticated' }`

**Types:** `@/types` for Prisma enums. `@/types/backend-types` for complex UI types.

**UI:** shadcn/ui (new-york) in `@/components/ui/`. Icons: `lucide-react`. Platforms: `@/lib/platforms` (11 platforms; financial order: PayPal, Online Banking, EdgeBoost).

**Uploads:** `@/components/upload-dropzone` → `UploadDropzone` + `ScreenshotThumbnail` (size: `'sm'` 32px, `'md'` 64px).

**SectionCard:** All intake form steps use collapsible cards — `card-terminal !p-0`, header `border-b px-4 py-3 text-sm font-medium` with `CollapsibleTrigger`, content `space-y-4 p-4`. Collapsed by default. Each step defines local `SectionCard`.

**Form Fields:** Use `Field`/`FieldLabel`/`FieldError` from `@/components/ui/field`, not raw Label+Input.

**Tailwind v4:** Use underscores for spaces in arbitrary values: `grid-cols-[1fr_120px]` not `grid-cols-[1fr,120px]`.

**Test IDs:** `data-testid` on all interactive elements, kebab-case: `submit-client-form`, `client-row-{id}`.

---

## 5. Current State (Phase 2)

### Live (real DB)
Agent Application + review, Agent Directory (table/tree, HoverCard), Login Management (CRUD), Commission system ($400 pool, star distribution), Client records (CRUD, auth-guarded, unified ClientRecord model), Phone assignments (assign/return/re-issue), Agent Dashboard (earnings/star), Agent Earnings (allocations), Agent Clients, Agent Detail (inline-edit + audit), New Client (4-step intake), Commissions page, Search API, NextAuth v5, **Backoffice Operational Cockpit** (signal bar, fund war room with 8 sportsbook platform cards + bank $250 alert + EdgeBoost tracker, agent activity with ranking/metrics/low-success, onboarding bottleneck with step pipeline/devices/unused accounts — all real DB, information-only, drill-down), **Backoffice Action Hub** (daily rundown, overdue devices, pending todos, fund allocations, activity feed), **FundAllocation** (record/track/confirm allocations, clientRecordId linkage), **Auto-todo on client approval** (Collect Debit Card Information, 7-day due), **Gmail Integration** (auto-detect emails, create todos, match funds), **Fund Confirmation** (UNCONFIRMED/CONFIRMED/DISCREPANCY workflow), **STEP_ADVANCED event logging** (auto-logged on step changes and device assignment), **System Config** (dynamic key-value settings, 25 values across 4 categories, admin-only UI at Rules Registry > System Config tab, getConfig() with 60s cache, wired to cockpit/phone-assignments/client-records/gmail)

### Partially Wired (DB + mock fallbacks)
- Agent dashboard — earnings real, pipeline mock
- Agent earnings — transactions real, KPIs mock
- Agent clients — DB first, falls back to mock
- Sales interaction — real drafts + todos + device actions alongside mock data; post-approval mock
- Agent Action Hub — real todos merged with mock

### Mock (UI shell only)
Agent team/todos/settings. Client management UI, settlements, fund allocation page, partners, profit sharing, reports, phone tracking. Mock data: `src/lib/mock-data.ts`, stubs: `src/lib/mock-actions.ts`.

---

## 6. Business Logic

### Client Record Lifecycle

```
ClientRecord (DRAFT) → submit → ClientRecord (SUBMITTED)
                                    → backoffice approves → ClientRecord (APPROVED) + star recalc + $400 pool
```
Single unified model. Agent "My Clients" shows records grouped by step (1-4) at top, approved/submitted below. Client management page shows only APPROVED records.

**Auto-todo on approval:** When a client is approved, a "Collect Debit Card Information" todo is auto-created with 7-day due date, assigned to the closer agent. Once debit card info is confirmed, PayPal should be issued.

### Commission ($400 pool per approved client)
- $200 direct to closer, $200 star pool = 4×$50 slices up hierarchy
- **Star pool walk:** each agent takes min(starLevel, remaining) slices. Remaining → backfill to highest-star supervisor. Still remaining → recycled
- Closer participates in both direct AND star pool

### Star Levels & Leadership

```
Rookie (0★) → 1★ → 2★ → 3★ → 4★ → ED → SED → MD → CMO
```
Thresholds: 0★: 1-2 | 1★: 3-6 | 2★: 7-12 | 3★: 13-20 | 4★: 21+

Leadership = promotions **beyond** 4★ (ED=5th, SED=6th, MD=7th, CMO=8th). Still `starLevel: 4` in DB but `leadershipTier` distinguishes. **Never display as "4-Star"** — always show leadership title. Use `getAgentDisplayTier()` from `commission-constants.ts`. Old tier names (`rising`, `veteran`, `senior`, `Elite`, `Starter`) are dead.

### Risk Scoring (`src/lib/risk-score.ts`)
Negative scoring from 0: Missing IDs (+10 if none, -10 each), ID expiry (<75d: -20, 75-99d: -10), PayPal used: -10, De-banked: -30, Criminal: -30. Assessment questions scored via lookup tables. Bank info flags + multiple addresses + BetMGM mismatch + credential mismatches = informational (0 pts). Thresholds: 0 to +10 = low (green), -1 to -29 = medium (amber), ≤-30 = high (red). Range: +10 to -158.

---

## 7. Feature: Agent Application

3-step form on `/login` "Apply as Agent" tab. `submitAgentApplication()` is public (no auth). Validates with Zod, checks email uniqueness, hashes password, creates AgentApplication. Admin/Backoffice reviews in Agent Management → Pending Applications. Activity timeline (color-coded: blue=submitted, green=approved, red=rejected, yellow=reverted).

**Key files:** `src/app/login/_components/application-form.tsx`, `src/app/actions/agent-application.ts`, `src/app/actions/application-review.ts`, `src/lib/validations/agent-application.ts`

---

## 8. Feature: Client Record / New Client

4-step intake form at `/agent/new-client`. 3-panel layout: drafts (w-56), form (full-width), risk panel (w-56).

**Steps:**
1. **Pre-Qual** — ID upload (OCR auto-fill), Gmail (deterministic suggestion via `stableHash(name+DOB)`), BetMGM verification (screenshots + OCR). Different-address flow with checkbox
2. **Background** — SSN/citizenship/missing IDs/criminal, banks/de-banked/PayPal/sportsbook history, demographics + 4 risk assessment questions. **Device Reservation Gate:** "Request for Device" saves reservation, agent blocked on Step 2 until backoffice assigns device (auto-advances to Step 3)
3. **Platforms** — Device Info Banner (phone, Gmail, countdown) + 11 platform registrations (3 financial + 8 sportsbook). Bank card: special 2-row layout with OCR auto-detect, PIN default 2580
4. **Contract** — document upload + submission checklist

**Auto-save:** 500ms debounced. `step` in DB = highest step ever reached (via `highestStepRef`). `formDataRef` pattern avoids stale closures.

**Generated Credentials:** Stored in `generatedCredentials` Json field. Generated at form init (`ensureStep3Credentials`), Step 1 credentials via `useEffect` when name+DOB available. Immediately saved to DB (bypasses debounce). Step components only read, never generate. Key file: `credential-generators.ts`.

**Key files:** `src/app/agent/new-client/_components/client-form.tsx` (state/save/nav), `step1-prequal.tsx`, `step2-background.tsx`, `step3-platforms.tsx`, `step3-platform-card.tsx`, `step4-contract.tsx`, `risk-panel.tsx`, `src/app/actions/client-records.ts`, `src/backend/data/client-records.ts`

---

## 9. Feature: Sales Interaction

Backoffice hub at `/backoffice/sales-interaction`. Queue/Review tab toggle.

**In Progress rows:** Client name + Agent link + badge (PHONE ISSUED/RETURNED only) | Days since update | Actions: Review (always), Assign Device (reservation exists, no device), Mark Returned (active device), Re-issue (returned device), Approve (step-4 submitted). All real DB data.

**Device lifecycle:** Integrated into rows by activity, not step. Assign auto-advances record to step 3. Re-issue preserves original dueBackAt. Badges show phone number on hover.

**Review dialog:** 4-step read-only, Approve on Step 4. Step 3 shows credential fill status (green=both, amber=partial, dim=empty).

**Todo system:** Done → `completeTodo()` (COMPLETED + event). Revert → `revertTodo()` (back to PENDING + event). Assign dialog: client picker, 5 issue categories (Re-Open Bank, Contact Bank, Contact PayPal, Platforms Verification, Collect Debit Card Information), default 3-day due.

**Key files:** `sales-interaction-view.tsx`, `client-intake-list.tsx`, `draft-review-dialog.tsx`, `device-assign-dialog.tsx`, `assign-todo-dialog.tsx`, `src/app/actions/phone-assignments.ts`, `src/app/actions/todos.ts`

---

## 10. Feature: Agent Management

**HoverCard:** On agent name (table + tree) — Zelle, state, performance (total earned, this month, new clients). Real DB data.

**Summary cards:** Total Agents → table view, Total Teams → tree view, New Agents (Month) → filter toggle. Team filter: click subordinate count badge on tree node.

**Agent Detail editable fields:** `companyPhone`, `carrier`, `personalEmail`, `personalPhone`, `zelle`, `address`, `loginAccount`, `idNumber`, `citizenship`. Read-only: Name, Gender/Age, ID Expiry, SSN, Start Date, Company/Login Email. Each edit → EventLog with old/new values. `getAgentTimeline()` merges own + about events, deduped, limit 50.

**Key files:** `agent-management/page.tsx`, `agent-list.tsx`, `agent-tree-view.tsx`, `[id]/page.tsx`, `agent-detail-view.tsx`, `editable-field.tsx`

---

## 11. Testing

**Setup:** Vitest + @testing-library/react + jest-dom. Config: `vitest.config.ts` (jsdom, globals). Tests: `src/test/` mirroring source.

```typescript
// Standard mock pattern
const { mockPrisma } = vi.hoisted(() => ({ mockPrisma: { user: { findUnique: vi.fn() } } }))
vi.mock('@/backend/prisma/client', () => ({ default: mockPrisma }))
const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }))
vi.mock('@/backend/auth', () => ({ auth: mockAuth }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
```

**20 files, 292 tests:** Agent Application (5 files, 57), Commission (7 files, 73), Client Records (2 files, 55), Phone Assignment (1 file, 22), Todo (1 file, ~18), Fund Confirmations (1 file, ~8), Gmail Detectors (1 file, ~21), Gmail Matcher (1 file, ~8), Risk Score (1 file, 38), Address Utils (1 file, 17)

---

## 12. Feature: Gmail Auto-Detection + Fund Confirmation

### Gmail Integration
Business Gmail inbox connected via Google OAuth. Cron syncs every 5 minutes (`vercel.json`). 5 detectors auto-classify emails:

| Detector | Source | Auto-Creates | Fund Match? |
|----------|--------|-------------|-------------|
| VIP | Sportsbook "VIP"/"elevated" emails | Todo: "VIP Account — Reply Required" | No |
| Verification | Platform "verify"/"action needed" | Todo: "Account Verification — Send to Client" | No |
| Fund Deposit | "deposit confirmed" + $ amount | Todo: "Confirm Fund Deposit" | Yes |
| Fund Withdrawal | "withdrawal processed" + $ | Todo: "Confirm Fund Withdrawal" | Yes |
| PayPal | PayPal transfer notifications | Todo: "Confirm Fund Deposit/Withdrawal" | Yes |

**Client identification:** `ClientRecord.assignedGmail` ↔ email "to" address. Todo assigned to closer agent.

**Fund matching:** Same platform + direction + amount within 5% + 48h window → auto-confirm. 5-25% mismatch → flag discrepancy. No match → manual review todo.

**Key files:** `src/lib/gmail/` (types, client, sync, processor, matcher, detectors/), `src/app/actions/gmail-settings.ts`, `src/app/api/cron/gmail-sync/route.ts`, `src/app/api/gmail/callback/route.ts`, `src/app/backoffice/settings/gmail/`

**Setup:** See `docs/gmail-setup.md`. Requires `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REDIRECT_URI`, `CRON_SECRET` env vars.

### Fund Confirmation
FundAllocation now tracks: `confirmationStatus` (UNCONFIRMED → CONFIRMED/DISCREPANCY), `confirmedAt`, `confirmedBy`, `confirmedAmount`, `discrepancyNotes`.

- **Action Hub:** Filter tabs (All/Unconfirmed/Confirmed/Discrepancy), "Confirm" button on unconfirmed rows, confirmation dialog, unconfirmed count in header KPIs + daily rundown
- **Actions:** `confirmFundAllocation()`, `flagDiscrepancy()` in `src/app/actions/fund-confirmations.ts`

### Todo Categories (9 total)
1. Re-Open Bank Account / Schedule with Client
2. Contact Bank
3. Contact PayPal
4. Platforms Verification
5. Collect Debit Card Information
6. VIP Account — Reply Required *(new)*
7. Account Verification — Send to Client *(new)*
8. Confirm Fund Deposit *(new)*
9. Confirm Fund Withdrawal *(new)*

`assignTodo()` accepts `{ clientRecordId }` — required. Auto-created email todos have `source: 'EMAIL_AUTO'` and show a mail icon in the Action Hub.

---

## 13. Seed Data

See `prisma/seed.ts` for full details. All passwords: `password123` (except Jamie Torres: `approved123`).

**Key accounts:** admin@test.com (Admin), backoffice@test.com (Backoffice), agent@test.com (Marcus Rivera, 2★)

**Hierarchy:**
- James Park (ED) → Marcus Rivera (2★) → Jamie Torres, Carlos Mendez, Aisha Williams; Lisa Wang (3★) → Derek Nguyen, Priya Sharma
- Rachel Kim (SED) → Tony Russo (2★) → Sofia Reyes; Kevin Okafor
- Victor Hayes (CMO) → Diana Foster (MD) → Ryan Mitchell (4★)

**Sample data:** 3 client records (2 APPROVED w/ bonus pools, 1 SUBMITTED), 5 draft records (Sarah Martinez step 3, Michael Thompson step 2, Jennifer Rodriguez step 1, Andrew Park step 2, Lisa Nguyen step 1), phone assignments, 1 todo (Contact Bank, PENDING), 6 fund allocations (2 confirmed, 1 discrepancy, 3 unconfirmed), 30+ transactions across sportsbook/bank/EdgeBoost platforms (with recent BANK deposits for overnight alert, partial and complete EdgeBoost 4x deposits)

---

## 14. Feature: Backoffice Operational Cockpit

Dense, information-first dashboard at `/backoffice`. Zero action buttons — drill-down only. Self-interpreting: every number has context (comparisons, thresholds, suggestions). Anomaly-first: healthy items collapsed, problems expanded.

**Layout:**
1. **Signal Bar** — green/amber/red status based on overdue devices, overdue todos, unconfirmed funds
2. **Fund War Room** (full-width, large) — Row 1: 8 sportsbook platform cards horizontal (DK, FD, MGM, FAN, CZR, BB, BR, 365) showing balance vs $100K target, account count, below-$5K accounts, today's deposits/withdrawals. Row 2: Bank $250 Overnight Alert + EdgeBoost Onboarding Tracker (4x$250 deposit dots). Row 3: Smart Insights (collapsible, collapsed by default)
3. **Two-column:** Onboarding Bottleneck (left) | Agent Activity (right) — vertically expanding
   - **Onboarding Bottleneck** — Step Pipeline (stacked bar + per-step details with stuck count/avg days), Devices (waiting/out/total/need), Unused Accounts ($0 balance post-approval), Insights (collapsed)
   - **Agent Activity** — Agent Ranking (Most Clients, Speed Champion, Month's Most, Month's Fastest), Team Metrics (active/total, avg days, end-to-end, zero-success), Low Success Agents (<85%), Insights (collapsed)

**Data layer:** `src/backend/data/cockpit.ts` — single `getCockpitData()` running 16 parallel Prisma queries. Computes per-platform balances from Transaction model (clientRecordId + platformType), bank overnight alerts from recent BANK deposits, EdgeBoost 4x tracking, agent rankings, step dwell times from STEP_ADVANCED events, stuck client detection, unused accounts.

**Schema additions:** `STEP_ADVANCED` EventType (logged on step changes + device assignment auto-advance), `clientRecordId` optional FK on FundAllocation.

**Cockpit types:** `CockpitData`, `CockpitSignalData`, `CockpitFundWarRoom`, `CockpitWarRoomPlatform`, `CockpitWarRoomAccount`, `CockpitBankOvernightAlert`, `CockpitEdgeBoostProgress`, `CockpitSmartInsight`, `CockpitAgentActivity`, `CockpitLowSuccessAgent`, `CockpitOnboardingBottleneck`, `CockpitStepPipeline`, `CockpitUnusedAccount` — all in `src/types/backend-types.ts`.

**Key files:** `src/app/backoffice/page.tsx`, `src/backend/data/cockpit.ts`, `src/app/backoffice/_components/cockpit-signal.tsx`, `fund-war-room.tsx`, `agent-activity.tsx`, `onboarding-bottleneck.tsx`

**Constants:** Now dynamic via SystemConfig (see Section 15). Defaults: SPORTSBOOK_TARGET=$100K, MIN_ACCOUNT_TARGET=$5K, BANK_OVERNIGHT_THRESHOLD=$250 (24h), EDGEBOOST_TOTAL_TARGET=$1K (4 deposits), STALE_AGENT_DAYS=7, ATTENTION_SUCCESS_THRESHOLD=85%, STUCK_NO_PROGRESS_DAYS=5, STUCK_DEVICE_WAIT_DAYS=1

---

## 15. Feature: System Configuration

Dynamic key-value settings page at `/backoffice/rules-registry?tab=config`. ADMIN-only. Replaces all hardcoded business constants.

### Database
`SystemConfig` model — `key` (PK), `value` (String), `category`, `updatedAt`, `updatedById`.

### Config Registry (`src/lib/config-defaults.ts`)
25 values across 4 categories:

| Category | Keys |
|----------|------|
| Cockpit / Dashboard (10) | SPORTSBOOK_TARGET, MIN_ACCOUNT_TARGET, BANK_OVERNIGHT_THRESHOLD, BANK_OVERNIGHT_HOURS, EDGEBOOST_TOTAL_TARGET, EDGEBOOST_DEPOSIT_COUNT, STALE_AGENT_DAYS, ATTENTION_SUCCESS_THRESHOLD, STUCK_NO_PROGRESS_DAYS, STUCK_DEVICE_WAIT_DAYS |
| Commission (4) | BONUS_POOL_TOTAL, DIRECT_BONUS, STAR_POOL_TOTAL, SLICE_VALUE |
| Risk Scoring (5) | RISK_THRESHOLD_LOW_MAX, RISK_THRESHOLD_HIGH, RISK_PENALTY_DEBANKED, RISK_PENALTY_CRIMINAL, RISK_PENALTY_PAYPAL |
| Operations (6) | PHONE_DUE_BACK_DAYS, AUTO_TODO_DUE_DAYS, FUND_MATCH_WINDOW_HOURS, FUND_EXACT_MATCH_TOLERANCE, FUND_DISCREPANCY_THRESHOLD, EMAIL_TODO_DUE_DAYS |

### Data Layer (`src/backend/data/config.ts`)
- `getConfig(key, defaultValue)` — reads from DB with 60s in-memory cache, returns typed value
- `invalidateConfigCache()` — called after admin saves
- `getAllConfigValues()` — returns all stored values for UI

### Consumers (Phase 1 — wired)
- `cockpit.ts` — 10 cockpit constants loaded via `Promise.all` at top of `getCockpitData()`
- `phone-assignments.ts` — `PHONE_DUE_BACK_DAYS`
- `client-records.ts` — `AUTO_TODO_DUE_DAYS`
- `gmail/matcher.ts` — `FUND_MATCH_WINDOW_HOURS`, `FUND_EXACT_MATCH_TOLERANCE`, `FUND_DISCREPANCY_THRESHOLD`
- `gmail/processor.ts` — `EMAIL_TODO_DUE_DAYS`

**Deferred to Phase 2:** Commission constants (73 tests), risk-score.ts (sync function).

### UI
Rules Registry page (`/backoffice/rules-registry`) now has tabs: "Rules" (existing) + "System Config" (ADMIN only). Config view shows collapsible category cards, number inputs with min/max validation, "modified" badges, save per category with toast feedback, reset-to-default buttons.

**Key files:** `src/lib/config-defaults.ts`, `src/backend/data/config.ts`, `src/app/actions/system-config.ts`, `rules-registry/page.tsx`, `_components/registry-tabs.tsx`, `_components/system-config-view.tsx`

---

## 16. Documentation

Update `CLAUDE.md` after every task. Write detail docs to `docs/` directory when needed.
