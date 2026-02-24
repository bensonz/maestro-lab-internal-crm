# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current State: Phase 2 — Bonus & Commission System (Partially Wired)

The backend has a fully functional **commission system** with real DB queries wired into key UI pages. Some pages still fall back to mock data for non-commission fields (KPIs, client pipeline, etc.).

### What's Live (backed by database)

- **Prisma schema** with 9 models: `User`, `AgentApplication`, `EventLog`, `Client`, `ClientDraft`, `BonusPool`, `BonusAllocation`, `PromotionLog`, `QuarterlySettlement`
- **Agent Application form** on login page ("Apply as Agent" tab) — uploads both ID + Address Proof documents
- **Application review** in backoffice Agent Management ("Pending Applications" tab) — shows both documents
- **Agent Directory** in backoffice Agent Management ("Agent Directory" tab) — queries real User table, star-level-based filter, toggleable table/tree view (tree shows upline→subordinate hierarchy with expand/collapse, ancestor-preserving search). Agent names have **HoverCard** showing Zelle, state, and performance snapshot (total earned, this month, new clients this month) from real DB data.
- **Login Management** page (`/backoffice/login-management`) — full CRUD for all users from DB
- **User management** server actions (create, update, toggle, reset password, inline field edit with audit trail)
- **Commission system** — $400 fixed bonus pool per approved client, star-level-based distribution up hierarchy
- **Client management** server actions (create, approve → triggers star level recalc + bonus pool)
- **Commission payment** server actions (mark paid, bulk mark paid)
- **Leadership promotion** system (ED/SED/MD/CMO tiers with eligibility checks)
- **Quarterly settlement** calculation for leadership-tier agents
- **Backoffice Commissions page** — real bonus pools, pending payouts, leaderboard, mark-paid actions
- **Agent Dashboard** — real earnings + star level from DB (pipeline/KPIs still mock)
- **Agent Earnings page** — real allocation history from DB (hierarchy/KPIs still mock)
- **Agent Clients page** — real clients from DB if available, falls back to mock
- **Agent Detail page** (backoffice) — real agent profile, earnings, hierarchy from DB; inline-editable fields with audit trail (activity timeline from EventLog). Agent name in header is plain text (no hover card — hover card lives on the Agent Management list page instead).
- **Agent New Client page** — 4-step intake form with drafts panel, risk assessment, auto-save, and submission to real Client record
- **Client draft** server actions (create, save, submit, delete) — auth-guarded, ownership-checked
- **Search API** (simplified — searches Users only)
- **NextAuth v5** credentials-based authentication with JWT sessions

### What's Partially Wired (real DB + mock fallbacks)

These pages fetch real commission/earnings data from DB but still use mock data for some fields:
- Agent dashboard — earnings/star level real, pipeline stats mock
- Agent earnings — transaction history real, KPIs/hierarchy mock
- Agent clients — DB clients + drafts from real DB, falls back to mock if empty
- Backoffice sales interaction — Team directory sidebar uses real agents from DB (grouped by display tier); In Progress section uses real ClientDraft records (DRAFT + SUBMITTED with PENDING client, 4 steps); Review button opens read-only 4-step dialog with Approve Client on Step 4 for submitted drafts; verification/post-approval still mock

### Draft/Client Lifecycle & Separation

**Full lifecycle:**
```
ClientDraft (DRAFT) → Agent submits → ClientDraft (SUBMITTED) + Client (PENDING)
                                                                      ↓
                                               Backoffice approves → Client (APPROVED)
                                                                      + star level recalc
                                                                      + $400 bonus pool
```

- **Agent "My Clients" page** — Shows in-progress `ClientDraft` records grouped by step (1-4) at the top, with clickable links back to `/agent/new-client?draft=<id>`. Approved/submitted clients appear in status groups below. PENDING clients are filtered out (they exist as drafts).
- **Backoffice "Sales Interaction" page** — In Progress section shows both `DRAFT` and `SUBMITTED` (pending approval) drafts in 4 step-based sub-stages via `getAllDraftsForBackoffice()`. Each row has a **Review** button (Eye icon) that opens a read-only 4-step dialog:
  - Steps 1-3: navigate with Next/Back buttons, inspect all draft fields
  - Step 4 (Contract): for **SUBMITTED** drafts → **"Approve Client"** button that calls `approveClient(resultClientId)` to promote `Client (PENDING → APPROVED)`, trigger star recalc + bonus pool, and refresh the page. For **DRAFT** entries → shows "Awaiting agent submission" text.
  - Falls back to mock data if DB unavailable.
- **Backoffice "Client Management" page** — Intended to show only APPROVED clients (currently mock). Client detail view has: Contact column (Gmail label, Gmail Password field, Personal Phone), sportsbook platform credentials (Login/Password from DB), risk factor badges in header (De-banked, Criminal Record, Address Mismatch, PayPal Used, ID Expiring, PIN Issue).

### What's Mock (UI shell only)

Remaining pages use static mock data from `src/lib/mock-data.ts` and no-op stubs from `src/lib/mock-actions.ts`:
- Agent team, todos, settings
- Backoffice overview, client management UI, settlements UI, fund allocation, partners, profit sharing, reports, phone tracking, action hub

## Commands

```bash
# Docker (local PostgreSQL)
docker compose up -d        # Start PostgreSQL container
docker compose down         # Stop PostgreSQL container

# Development
pnpm dev                    # Start Next.js dev server (localhost:3000)
pnpm build                  # Production build
pnpm lint                   # Run ESLint

# Testing
pnpm test                   # Run Vitest in watch mode
pnpm test:run               # Run tests once (CI mode)

# Database (requires DATABASE_URL + running PostgreSQL)
pnpm db:migrate             # Create/apply migrations (local dev)
pnpm db:migrate --name <description>  # Create a new migration
npx prisma generate         # Regenerate Prisma client
npx tsx prisma/seed.ts      # Seed database (pnpm db:seed also works)
```

### Local Development Setup

1. `docker compose up -d` — starts PostgreSQL (credentials in `.env`)
2. `npx prisma migrate dev` — creates/applies migrations
3. `npx prisma generate` — generates Prisma client
4. `npx tsx prisma/seed.ts` — seeds test accounts + sample application
5. `pnpm dev` — starts the app at localhost:3000

## Architecture

### Application Structure

This is a CRM for managing client onboarding across multiple sports betting platforms. Two distinct user interfaces:

- **Agent Portal** (`/agent/*`) - Field agents manage their assigned clients through the onboarding process
- **Back Office** (`/backoffice/*`) - Staff oversee all clients, agents, and financial operations

### Database Schema (Phase 2)

9 models in `prisma/schema.prisma`:

- **User** — All staff accounts (agents, admins, backoffice, finance). Includes hierarchy (supervisorId self-relation), profile fields, star level/tier, leadershipTier (NONE/ED/SED/MD/CMO).
- **AgentApplication** — Public application form submissions. Status: PENDING → APPROVED/REJECTED. Links to reviewer (User) and created user on approval. Stores `idDocument` and `addressDocument` upload paths.
- **Client** — Minimal client record. Status: PENDING → APPROVED. Links to closer (User via closerId). One optional BonusPool. Optional `fromDraft` back-link.
- **ClientDraft** — Agent-owned draft for new client intake. Status: DRAFT → SUBMITTED. 4-step form data (pre-qual, background, platforms, contract). Links to closer (User via closerId) and optional resultClient (Client). Stores risk flags, platform data (Json), document paths, Step 1 extras (dateOfBirth, address, gmailPassword, gmailScreenshot, betmgmLogin, betmgmPassword, betmgmRegScreenshot, betmgmLoginScreenshot), different-address fields (livesAtDifferentAddress, currentAddress, differentAddressDuration, differentAddressProof), Step 2 extras (ssnNumber, citizenship, missingIdType, secondAddressProof, paypalSsnLinked, paypalBrowserVerified, occupation, annualIncome, employmentStatus, maritalStatus, creditScoreRange, dependents, educationLevel, householdAwareness, familyTechSupport, financialAutonomy, digitalComfort, deviceReservationDate, sportsbookUsedBefore, sportsbookUsedList, sportsbookStatuses).
- **BonusPool** — One per approved client ($400 fixed). Tracks closer snapshot, distribution stats, has many BonusAllocation[].
- **BonusAllocation** — Individual payout line. Type: DIRECT ($200 to closer), STAR_SLICE (star pool walk), BACKFILL (remaining to highest supervisor). Status: PENDING → PAID.
- **PromotionLog** — Immutable audit of star level and leadership tier changes.
- **QuarterlySettlement** — Leadership P&L commission. Status: DRAFT → APPROVED → PAID. Unique per [leaderId, year, quarter].
- **EventLog** — Append-only audit trail. EventType enum covers login, application, user management, commission, leadership, and client draft events.

### User Roles

Four roles defined in `UserRole` enum: `AGENT`, `BACKOFFICE`, `ADMIN`, `FINANCE`

### Agent Application Flow

1. Applicant fills out multi-step form on login page (`/login` → "Apply as Agent" tab)
2. Form validates with Zod (`src/lib/validations/agent-application.ts`)
3. `submitAgentApplication()` server action — **public, no auth required**:
   - Validates fields, checks email uniqueness (User + AgentApplication tables)
   - Hashes password with bcrypt, creates AgentApplication record
   - Logs APPLICATION_SUBMITTED event
4. Admin/Backoffice reviews in Agent Management → Pending Applications tab
5. `approveApplication()` — Creates User from application data, links resultUserId
6. `rejectApplication()` — Updates status with reason

**Form Step Layout (3 steps):**
- **Step 1 — Account**: Email, password/confirm (2 rows)
- **Step 2 — Identity**: ID document upload, first/last name, gender/DOB/phone, legal status/ID expiry, address (5 rows)
- **Step 3 — Details**: Address proof upload, city/state/zip, zelle/referred by (3 rows)

**Key files:**
- `src/app/login/page.tsx` — Sign In + Apply tabs
- `src/app/login/_components/application-form.tsx` — Multi-step form (3 steps)
- `src/app/actions/agent-application.ts` — Submit action (public)
- `src/app/actions/application-review.ts` — Approve/reject actions (admin/backoffice)
- `src/app/actions/user-management.ts` — CRUD user actions (admin)
- `src/lib/validations/agent-application.ts` — Zod schemas (full + per-step)
- `src/backend/data/applications.ts` — Application queries
- `src/backend/data/users.ts` — User queries
- `src/app/backoffice/agent-management/_components/application-review-list.tsx` — Review UI
- `src/app/backoffice/agent-management/_components/approve-application-dialog.tsx`
- `src/app/backoffice/agent-management/_components/reject-application-dialog.tsx`
- `src/app/api/upload/public/route.ts` — Public upload for ID documents
- `src/app/api/agents/search/route.ts` — Public agent name search (for referral autocomplete)
- `src/app/backoffice/login-management/page.tsx` — Login Management page (server component)
- `src/app/backoffice/login-management/_components/login-management-view.tsx` — Users table + search
- `src/app/backoffice/login-management/_components/create-user-dialog.tsx` — Create user (real actions)
- `src/app/backoffice/login-management/_components/edit-user-dialog.tsx` — Edit/toggle/reset (real actions)
- `src/app/backoffice/agent-management/[id]/page.tsx` — Agent detail server component (fetches user, earnings, timeline)
- `src/app/backoffice/agent-management/[id]/_components/agent-detail-view.tsx` — Agent detail client view with inline-editable fields
- `src/app/backoffice/agent-management/[id]/_components/editable-field.tsx` — Inline edit component (pencil icon, save/cancel, async onSave)
- `src/backend/data/event-logs.ts` — `getAgentTimeline()` query (merges own + about events, deduped, sorted, limit 50); `getApplicationTimeline()` query for application activity feed

### Application Activity Timeline

The "Pending Applications" tab in Agent Management includes an **Activity Timeline** at the bottom showing all application-related events from the EventLog table. Events are color-coded by action type:
- **Submitted** (blue) — `APPLICATION_SUBMITTED` events
- **Approved** (green) — `APPLICATION_APPROVED` events
- **Rejected** (red) — `APPLICATION_REJECTED` events
- **Reverted** (yellow) — `APPLICATION_REJECTED` events with `metadata.action = 'revert_to_pending'`

Each entry shows: action icon, action label, event description, date, time, and actor name. The timeline is fetched server-side via `getApplicationTimeline()` and passed through `AgentList` → `ApplicationReviewList`.

### Agent Management Page — UX Features

**Agent Name HoverCard:** Hovering over an agent's name (in both table and tree views) shows a popover with:
- Zelle account info
- State (extracted from address via regex)
- Performance snapshot: Total Earned ($XK), This Month earned, New Clients this month
- Data sourced from real DB: `allocations` (amounts + dates) and `closedClients` (dates) joined in `getAllAgents()` query, computed server-side in the page component

**Clickable Summary Cards (left sidebar):**
- **Total Agents** card → switches to table/ranking view
- **Total Teams** card → switches to tree view
- **New Agents (Month)** card → toggles filter for agents created this month (uses `createdAt` field)
- Active card shows a colored ring indicator

**Team Filter (tree view):** Clicking the subordinate count badge on a tree node filters the list to that agent's team (agent + all descendants). Click again to clear.

**Key files:**
- `src/app/backoffice/agent-management/page.tsx` — Server component, computes per-agent earnings/client stats
- `src/app/backoffice/agent-management/_components/agent-list.tsx` — Client component, HoverCard in table view, clickable stat cards, new agent filter
- `src/app/backoffice/agent-management/_components/agent-tree-view.tsx` — Tree view with HoverCard + team filter

### Agent Detail Page — Editable Fields

Admin and Backoffice users can inline-edit agent profile fields. Each edit creates an `EventLog` entry with `USER_UPDATED` type, old/new values in metadata, and a descriptive message.

**Editable fields:** `companyPhone`, `carrier`, `personalEmail`, `personalPhone`, `zelle`, `address`, `loginAccount`, `idNumber`, `citizenship`

**Read-only fields:** Name, Gender/Age, ID Expiry, SSN, Start Date, Company Email, Login Email

**Server action:** `updateAgentField(agentId, field, oldValue, newValue)` in `src/app/actions/user-management.ts`
- Auth: ADMIN + BACKOFFICE only
- Whitelisted fields mapped to Prisma User columns
- Creates EventLog with description like `"Updated Company Phone: 917-979-2293 → 917-898-2222"`
- Metadata: `{ updatedUserId, field, oldValue, newValue }`

**Activity Timeline:** `getAgentTimeline(agentId)` in `src/backend/data/event-logs.ts`
- Merges: events by agent (userId = agentId) + events about agent (metadata.updatedUserId = agentId)
- Deduplicates by event ID, sorts newest first, limit 50
- Returns `{ date, event, type, actor }[]` — actor shown as "Feb 20, 2026 · by Sarah Chen"

### Client Draft / New Client Flow

Agents create new clients through a 4-step intake form at `/agent/new-client`.

**Steps (all use `card-terminal` SectionCard pattern — collapsible cards, collapsed by default):**
1. **Pre-Qual** — 3 collapsible SectionCards:
   - **ID Document**: Upload dropzone with OCR auto-detection modal (mock), auto-fills first/last name, DOB, address, ID expiry. Fields: first/last name*, DOB (with computed age), ID expiry, address, ID number. **Different-address flow**: checkbox "Client currently lives at a different address" → reveals sub-section with Current Living Address, Duration, Proof selects; also auto-sets `multipleAddresses` risk flag and DB `addressMismatch` field
   - **Company Gmail**: Gmail address, Gmail password (type=password), Gmail registration screenshot upload with OCR detection (detects email address, auto-fills Gmail field)
   - **BetMGM Verification**: BetMGM login email + password input fields, Registration screenshot (OCR detects "deposit" word to confirm registration), Login credentials screenshot (OCR detects credentials + deposit options), Phone number
   - All upload areas have hover tooltips (what to upload / what NOT to upload)
   - All 3 screenshot uploads (Gmail, BetMGM reg, BetMGM login) trigger OCR detection with modals
   - BetMGM detection auto-fills credential fields and sets `betmgmCheckPassed` when deposit detected
   - `email` field still in schema but not displayed in Step 1 UI
2. **Background** — 3 SectionCards:
   - **Identity & Document**: SSN upload + OCR detection, SSN Number field, Citizenship dropdown, Missing ID Type (multi-select: Passport, State ID, Driver's License), Secondary Address Proof (conditional on `livesAtDifferentAddress`), Criminal Record — separated by `border-t`
   - **Platforms History**: Banks Opened/De-banked multi-check dropdowns (de-banked has tooltip definition), PayPal conditional flow (Yes → SSN linked? → browser verified? → guidance; No → create new account guidance), Sportsbook History (Yes/No → multi-select 8 sportsbooks → per-sportsbook status: Lost money/Won money/IDK)
   - **Client Background**: Demographics (occupation, annual income, employment status, marital status, credit score, dependents, education level) + 4 Risk Assessment Questions (Household Awareness & Support, Family Available for Account Setup, Financial Decision Autonomy, Online Account Management Comfort)
   - **Device Reservation Gate**: After Step 2, "Next" button becomes "Request for Device" (disabled until reservation date selected). Warning box explains the 3-day device return window.
3. **Platforms** — 2 SectionCards: Financial Platforms, Sportsbook Platforms (platform-by-platform registration for all 11 platforms)
4. **Contract** — 2 SectionCards: Contract Document, Submission Checklist

**Layout:** 3-panel — left drafts panel (w-56), center form (full-width, no max-w constraint), right risk assessment panel (w-56). Step indicator is centered at `max-w-2xl` while form content stretches full width.

**Auto-save:** 500ms debounced save on field changes. Flushes before step navigation or submission.

**Risk Assessment:** Pure function `calculateRiskScore()` uses **negative scoring** (deductions from 0):
- **Missing IDs**: 0 missing = +10 bonus, each missing type = -10 (max -30 for 3 missing)
- **ID expiry** 2-tier: <75 days → -20, 75-99 days → -10, >=100 or null → 0
- **Boolean flags**: PayPal previously used: -10, De-banked: -30, Criminal record: -30
- **Multiple addresses**: informational only (0 points) — auto-set when `livesAtDifferentAddress` is true in Step 1
- **Risk Assessment Questions** (scored via lookup tables):
  - Household Awareness: supportive=0, neutral=-3, not_aware=-8, n/a=0
  - Family Tech Support: willing=0, uninvolved=-5, no=-10, prefer_not=-15
  - Financial Autonomy: independent=0, shared=-5, dependent=-15
  - Digital Comfort: all values=0 (informational only)
- **Thresholds**: 0 to +10 = low (green), -1 to -29 = medium (amber), -30 or below = high (red)
- **Score range**: Best possible = +10 (all IDs present, no flags), Worst possible = -158 (all flags active)
- Risk panel displays days remaining for ID expiry (e.g., "ID Expiring in 45D") and assessment question values

**Inner-Step Progress (Step 1):** 5 items — ID document uploaded, Gmail filled, Gmail screenshot uploaded, at least one BetMGM screenshot uploaded, BetMGM check passed

**Submission:** Validates required fields (firstName, lastName, contractDocument), creates a real `Client` record (PENDING status), marks draft as SUBMITTED.

**Key files:**
- `src/app/agent/new-client/page.tsx` — Server component: auth, load drafts + selected draft
- `src/app/agent/new-client/_components/new-client-view.tsx` — Client: 3-panel layout orchestrator
- `src/app/agent/new-client/_components/drafts-panel.tsx` — Left panel: draft list + create/delete (no title/subtitle, no file icons, sidebar conventions matched with other pages)
- `src/app/agent/new-client/_components/step-indicator.tsx` — 4-step progress indicator
- `src/app/agent/new-client/_components/client-form.tsx` — Form state, auto-save, step navigation
- `src/app/agent/new-client/_components/step1-prequal.tsx` — Step 1 fields (3 collapsible SectionCards: ID, Gmail, BetMGM, with uploads + OCR detection + different-address flow)
- `src/app/agent/new-client/_components/mock-extract-id.ts` — Mock OCR extraction for ID, Gmail, BetMGM screenshots, SSN documents, and address proof
- `src/app/agent/new-client/_components/id-detection-modal.tsx` — ID field confirmation dialog with checkboxes
- `src/app/agent/new-client/_components/gmail-detection-modal.tsx` — Gmail email detection dialog
- `src/app/agent/new-client/_components/betmgm-detection-modal.tsx` — BetMGM detection dialog (credentials + deposit detection)
- `src/app/agent/new-client/_components/ssn-detection-modal.tsx` — SSN number detection confirmation dialog
- `src/app/agent/new-client/_components/address-detection-modal.tsx` — Address proof detection confirmation dialog
- `src/app/agent/new-client/_components/step2-background.tsx` — Step 2: 3 SectionCards (Identity & Document with SSN/address proof/missing ID/criminal record, Platforms History with bank/de-banked multi-check + PayPal conditional + sportsbook multi-select with per-book status, Client Background with demographics + 4 risk assessment questions) with upload + OCR detection
- `src/app/agent/new-client/_components/step3-platforms.tsx` — Step 3: 2 SectionCards (Financial Platforms, Sportsbook Platforms)
- `src/app/agent/new-client/_components/step3-platform-card.tsx` — Individual platform card
- `src/app/agent/new-client/_components/step4-contract.tsx` — Step 4: 2 SectionCards (Contract Document, Submission Checklist)
- `src/app/agent/new-client/_components/risk-panel.tsx` — Right panel: risk score + flags
- `src/app/actions/client-drafts.ts` — CRUD server actions (create, save, submit, delete, getFullDraft with role-based auth)
- `src/app/backoffice/sales-interaction/_components/draft-review-dialog.tsx` — 4-step read-only review dialog with Approve Client button for submitted drafts (uses `useReducer` for state, calls `approveClient`)
- `src/app/backoffice/sales-interaction/_components/client-intake-list.tsx` — Intake row list with Review button (Eye icon), threads `onReviewDraft` with `resultClientId`
- `src/backend/data/client-drafts.ts` — Draft queries (by closer, by ID, ownership check, getAllDrafts, getAllDraftsForBackoffice — fetches DRAFT + SUBMITTED with PENDING client)
- `src/lib/validations/client-draft.ts` — Zod per-step + submit schemas
- `src/lib/risk-score.ts` — Pure negative risk score calculation (missing IDs, ID expiry, boolean flags, assessment question weights)

### Bonus & Commission System

**$400 fixed bonus pool per approved client:**
- $200 direct bonus to the closer
- $200 star pool split into 4 slices ($50 each), distributed up the hierarchy

**Star Pool Distribution Algorithm:**
1. Build chain: [closer, ...supervisors up the hierarchy]
2. Walk the chain: each agent takes min(starLevel, remaining) slices → type `STAR_SLICE`
3. If remaining > 0: find highest-star supervisor (not closer) for backfill
4. Backfill = min(supervisor.starLevel - alreadyTaken, remaining) → type `BACKFILL`
5. Any still remaining → recycled (no one receives them)

The closer participates in both the $200 direct AND the star pool walk.

**Progression Ladder** (linear — each level is a distinct rank):

```
Rookie (0★) → 1★ → 2★ → 3★ → 4★ → ED → SED → MD → CMO
```

**Star Level Thresholds** (defined in `src/lib/commission-constants.ts`):
- 0★ Rookie: 1-2 clients | 1★: 3-6 | 2★: 7-12 | 3★: 13-20 | 4★: 21+

**Leadership Tiers** — promotions **beyond** 4-Star, not equivalent to it. ED is effectively the 5th level, SED the 6th, etc. Each requires minimum approved clients + qualified 4★ subordinates. Each has a promotion bonus and quarterly P&L commission percentage.
- ED: 30 clients + 2 subs with 4★ | SED: 50 clients + 4 subs | MD: 100 clients + 6 subs | CMO: 200 clients + 10 subs
- An ED/SED/MD/CMO agent still has `starLevel: 4` in DB (since they passed the 21-client threshold), but the `leadershipTier` field distinguishes them. **Never display them as "4-Star"** — always show their leadership title.

**Unified Tier/Level Naming Convention:**
- Star levels: `Rookie`, `1-Star`, `2-Star`, `3-Star`, `4-Star` (display labels from `STAR_THRESHOLDS`)
- DB `tier` field stores: `rookie`, `1-star`, `2-star`, `3-star`, `4-star` (via `getTierForStarLevel()`)
- Leadership tiers: `Executive Director`, `Senior Executive Director`, `Managing Director`, `Chief Marketing Officer`
- Use `getAgentDisplayTier(starLevel, leadershipTier)` from `commission-constants.ts` for all UI display — shows leadership tier label when applicable, otherwise star level label
- Old tier names (`rising`, `veteran`, `senior`, `Elite`, `Starter`) are **dead** — do not use

**Key files:**
- `src/lib/commission-constants.ts` — Star thresholds, bonus pool amounts, leadership tier config, `getAgentDisplayTier()` helper
- `src/backend/services/star-pool-distribution.ts` — Pure distribution algorithm
- `src/backend/services/star-level.ts` — Star level calculation + recalculation
- `src/backend/services/bonus-pool.ts` — Bonus pool creation orchestrator
- `src/backend/services/leadership.ts` — Leadership eligibility, promotion, team discovery
- `src/backend/services/quarterly-settlement.ts` — Quarterly P&L settlement calculation
- `src/backend/data/bonus-pools.ts` — Commission queries (overview, earnings, supervisor chain, leaderboard)
- `src/backend/data/clients.ts` — Client queries (count, by closer, by ID)
- `src/app/actions/clients.ts` — Create/approve client (approve triggers star recalc + bonus pool)
- `src/app/actions/commission.ts` — Mark allocation paid, bulk mark paid
- `src/app/actions/leadership.ts` — Check+promote leadership, quarterly settlement CRUD
- `src/types/index.ts` — Commission enums (ClientStatus, BonusPoolStatus, AllocationType, etc.)
- `src/types/backend-types.ts` — Commission data interfaces (CommissionOverviewData, AgentEarningsData, etc.), IntakeClient (includes `resultClientId` for submitted drafts)

### Key Patterns

**Authentication**: NextAuth v5 beta with credentials provider. Session includes `user.id` and `user.role`. Auth check pattern:

```typescript
const session = await auth();
if (!session?.user) return { success: false, error: 'Not authenticated' }
```

**Database Access**: Prisma 7 with `@prisma/adapter-pg` driver adapter. Client singleton at `@/backend/prisma/client` creates a `pg.Pool` from `DATABASE_URL` and passes it via `PrismaPg` adapter. Gracefully returns a proxy when DATABASE_URL is not set (allows build without DB). `pg` and `@prisma/adapter-pg` are listed in `serverExternalPackages` in `next.config.ts`. CLI config lives in `prisma.config.ts` (not in the schema).

**Type Exports**: Use `@/types` for Prisma model types and enums. Use `@/types/backend-types` for complex types used by UI components.

**Platform Utilities**: `@/lib/platforms` provides metadata for the 11 supported platforms.

**UI Components**: shadcn/ui (new-york style) in `@/components/ui/`. Icons from `lucide-react`.

**SectionCard Pattern**: All 4 steps of the new client intake form use a consistent `SectionCard` component pattern:
- Wrapper: `card-terminal !p-0` (uses `--card` background, not `bg-muted` which is too grey)
- Header: `border-b border-border px-4 py-3 text-sm font-medium` with `CollapsibleTrigger`
- Content: `space-y-4 p-4` inside `CollapsibleContent`
- Collapsed by default, chevron rotates on open/close
- Each step file defines its own local `SectionCard` component

**Form Fields**: Use `Field` component from `@/components/ui/field` instead of raw `Label` + `Input` combinations.

```tsx
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

<Field>
  <FieldLabel htmlFor="email">Email</FieldLabel>
  <Input id="email" name="email" />
  <FieldError>{errors?.email}</FieldError>
</Field>
```

### Test IDs

Add `data-testid` attributes to all interactive and significant UI elements for automated testing. Use descriptive kebab-case names:

```tsx
<Button data-testid="submit-client-form">Submit</Button>
<Input data-testid="client-first-name" />
<Card data-testid="client-card-{clientId}">
<tr data-testid="client-row-{clientId}">
```

### Path Aliases

- `@/*` → `./src/*`

---

## Testing

### Test Setup

- **Framework**: Vitest + @testing-library/react + @testing-library/jest-dom
- **Config**: `vitest.config.ts` (jsdom environment, globals enabled)
- **Setup file**: `src/test/setup.ts`
- **Test location**: `src/test/` directory, mirroring source structure

### Test Conventions

```typescript
// Use vi.hoisted() for mock objects referenced in vi.mock factories
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: { findUnique: vi.fn(), create: vi.fn() },
  },
}))
vi.mock('@/backend/prisma/client', () => ({ default: mockPrisma }))

// Mock auth
const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }))
vi.mock('@/backend/auth', () => ({ auth: mockAuth }))

// Mock next/cache
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
```

### Existing Tests (15 files, 194 tests)

**Phase 1 — Agent Application (5 files, 57 tests):**
- `src/test/backend/actions/agent-application.test.ts` — Validation, email uniqueness, happy path, addressDocument
- `src/test/backend/actions/application-review.test.ts` — Auth guards, approve/reject, edge cases, addressDocument copy
- `src/test/backend/actions/user-management.test.ts` — CRUD user actions, auth/role guards, updateAgentField (whitelist, audit trail, trim/null)
- `src/test/backend/data/applications.test.ts` — Query functions, stats
- `src/test/backend/data/event-logs.test.ts` — Timeline query: merge/dedup, sort, actor, type mapping, limit 50

**Phase 2 — Commission System (7 files, 73 tests):**
- `src/test/backend/services/star-pool-distribution.test.ts` — All 4 spec scenarios + edge cases (pure, no mocks)
- `src/test/backend/services/star-level.test.ts` — Threshold boundary tests, recalculation with mocks
- `src/test/backend/services/bonus-pool.test.ts` — Orchestrator with mocked Prisma + supervisor chain
- `src/test/backend/services/leadership.test.ts` — Eligibility checks, promotion, team independence (BFS)
- `src/test/backend/actions/clients.test.ts` — Create/approve client, auth guards, integration chain
- `src/test/backend/actions/commission.test.ts` — Mark paid, bulk mark paid, auth guards
- `src/test/backend/actions/leadership.test.ts` — Promote, quarterly settlement, approve/pay settlement

**Client Draft (2 files, 54 tests):**
- `src/test/backend/actions/client-drafts.test.ts` — CRUD actions, auth guards, ownership checks, submit validation, new Step 1 field allowlist
- `src/test/lib/risk-score.test.ts` — Negative scoring: missing ID bonus/penalty, 2-tier ID expiry boundaries, boolean flag weights, assessment question weights (household/family/autonomy/digital), multipleAddresses exclusion, max worst -158

---

## Page Inventory

### Agent Portal

| Route | Page File | Data Source |
|-------|-----------|-------------|
| `/agent` | `src/app/agent/page.tsx` | **Real DB** — earnings/star level; Mock — pipeline/KPIs |
| `/agent/clients` | `src/app/agent/clients/page.tsx` | **Real DB** — client list + drafts grouped by step (fallback mock if empty) |
| `/agent/new-client` | `src/app/agent/new-client/page.tsx` | **Real DB** — 4-step intake form with drafts + risk panel |
| `/agent/clients/[id]` | `src/app/agent/clients/[id]/page.tsx` | Mock — client detail |
| `/agent/earnings` | `src/app/agent/earnings/page.tsx` | **Real DB** — allocations; Mock — KPIs/hierarchy |
| `/agent/team` | `src/app/agent/team/page.tsx` | Mock — hierarchy tree |
| `/agent/todo-list` | `src/app/agent/todo-list/page.tsx` | Mock — todo list |
| `/agent/settings` | `src/app/agent/settings/page.tsx` | Mock — user settings (full-width layout) |

### Back Office

| Route | Page File | Data Source |
|-------|-----------|-------------|
| `/backoffice` | `src/app/backoffice/page.tsx` | Mock — overview |
| `/backoffice/agent-management` | page.tsx | **Real DB** — Agent Directory (star-level filter, table/tree view toggle) + Pending Applications |
| `/backoffice/agent-management/[id]` | page.tsx | **Real DB** — agent profile, earnings, hierarchy |
| `/backoffice/login-management` | page.tsx | **Real DB** — all users CRUD |
| `/backoffice/client-management` | page.tsx | Mock — client list |
| `/backoffice/client-settlement` | page.tsx | Mock — settlements |
| `/backoffice/commissions` | page.tsx | **Real DB** — bonus pools, payouts, leaderboard, mark-paid actions |
| `/backoffice/fund-allocation` | page.tsx | Mock — fund movements |
| `/backoffice/partners` | page.tsx | Mock — partners |
| `/backoffice/phone-tracking` | page.tsx | Mock — phones |
| `/backoffice/profit-sharing` | page.tsx | Mock — profit sharing |
| `/backoffice/reports` | page.tsx | Mock — reports |
| `/backoffice/sales-interaction` | page.tsx | **Real DB** — Team directory (agents by tier) + ClientDraft (DRAFT + SUBMITTED, 4 steps) + Review dialog with Approve; Mock — verification, post-approval |
| `/backoffice/todo-list` | page.tsx | Mock — action hub |

### Auth

| Route | File | Notes |
|-------|------|-------|
| `/login` | `src/app/login/page.tsx` | **Real auth** + Apply tab |
| `/api/auth/[...nextauth]` | route.ts | NextAuth v5 handlers |

---

## Next.js Best Practices (App Router)

### Component Architecture

- **Server Components** — data fetching, layout, SEO content
- **Client Components** — interactivity, hooks, browser APIs
- **`'use client'`** — only at the boundary, push it down as far as possible
- **Composition pattern** — pass Server Components as children to Client Components

### Action-Responsive UI

Every user action must provide feedback:
- **Toast notification** — immediate feedback via `toast.success()` / `toast.error()`
- **Inline error messages** — persistent error text near the control
- **Loading states** — disable buttons and show spinners during async operations

---

## Tailwind CSS v4 Notes

This project uses **Tailwind CSS v4** (`@tailwindcss/postcss` v4).

### Arbitrary Value Syntax

In arbitrary values, **use underscores `_` to represent spaces**, not commas.

```tsx
// CORRECT (Tailwind v4)
<div className="grid grid-cols-[1fr_120px_100px_140px_40px]" />

// WRONG (Tailwind v3 syntax)
<div className="grid grid-cols-[1fr,120px,100px,140px,40px]" />
```

---

## Database Infrastructure

### Local Development (Docker)

`docker-compose.yml` runs PostgreSQL 16 Alpine with:
- **User**: `crm` / **Password**: `crm_dev_password` / **DB**: `crm_db`
- Port `5432` exposed to host
- Persistent volume `crm_pgdata`
- Health check via `pg_isready`

`.env` contains `DATABASE_URL=postgresql://crm:crm_dev_password@127.0.0.1:5432/crm_db`

### Prisma 7 Architecture

Prisma 7 separates CLI config from runtime config:

- **CLI** (migrate, generate): `prisma.config.ts` reads `DATABASE_URL` via `dotenv/config` and passes it to `defineConfig({ datasource: { url } })`
- **Runtime** (queries): `src/backend/prisma/client.ts` creates a `pg.Pool` from `DATABASE_URL` env var, wraps it in `PrismaPg` driver adapter, and passes to `new PrismaClient({ adapter })`
- **Schema** (`prisma/schema.prisma`): Only declares `provider = "postgresql"` — no URL in the schema

The seed script (`prisma/seed.ts`) uses the same adapter pattern and is idempotent (safe to re-run).

### Production Deployment

**Database:** Neon PostgreSQL (auto-provisioned by Vercel)

```bash
pnpm db:migrate --name <description>  # Local: creates + applies migration
DATABASE_URL="<neon-url>" pnpm db:migrate:deploy  # Production: applies pending migrations
```

### Environment Variables

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Local: set in `.env`. Vercel: auto-set by Neon integration |
| `AUTH_SECRET` | Yes | Must be 32+ characters |

---

## Test Accounts (Seed Data)

### Users

| Role | Email | Password | Name | Star Level | Leadership | Supervisor |
|------|-------|----------|------|------------|------------|------------|
| Admin | admin@test.com | password123 | Sarah Chen | — | — | — |
| Admin (GM) | gm@test.com | password123 | Tom Adams | — | — | — |
| Backoffice | backoffice@test.com | password123 | Nina Patel | — | — | — |
| Finance | finance@test.com | password123 | David Chen | — | — | — |
| Agent | victor.hayes@test.com | password123 | Victor Hayes | 4★ | CMO | — |
| Agent | diana.foster@test.com | password123 | Diana Foster | 4★ | MD | Victor Hayes |
| Agent | rachel.kim@test.com | password123 | Rachel Kim | 4★ | SED | — |
| Agent | james.park@test.com | password123 | James Park | 4★ | ED | — |
| Agent | ryan.mitchell@test.com | password123 | Ryan Mitchell | 4★ | — | Diana Foster |
| Agent | lisa.wang@test.com | password123 | Lisa Wang | 3★ | — | James Park |
| Agent | agent@test.com | password123 | Marcus Rivera | 2★ | — | James Park |
| Agent | tony.russo@test.com | password123 | Tony Russo | 2★ | — | Rachel Kim |
| Agent | derek.nguyen@test.com | password123 | Derek Nguyen | 1★ | — | Lisa Wang |
| Agent | carlos.mendez@test.com | password123 | Carlos Mendez | 1★ | — | Marcus Rivera |
| Agent | kevin.okafor@test.com | password123 | Kevin Okafor | 1★ | — | Rachel Kim |
| Agent | priya.sharma@test.com | password123 | Priya Sharma | 0★ | — | Lisa Wang |
| Agent | aisha.williams@test.com | password123 | Aisha Williams | 0★ | — | Marcus Rivera |
| Agent | sofia.reyes@test.com | password123 | Sofia Reyes | 0★ | — | Tony Russo |
| Agent | jamie.torres@example.com | approved123 | Jamie Torres | 0★ | — | Marcus Rivera |

Note: Leadership agents (ED/SED/MD/CMO) have `starLevel: 4` in DB (they passed the 21-client threshold) but display as their leadership title, not "4-Star". The progression is: Rookie → 1★ → 2★ → 3★ → 4★ → ED → SED → MD → CMO.

**Hierarchy (Branch 1):** James Park (ED) → Marcus Rivera (2★) → Jamie Torres (Rookie), Carlos Mendez (1★), Aisha Williams (Rookie)
                                           → Lisa Wang (3★) → Derek Nguyen (1★), Priya Sharma (Rookie)
**Hierarchy (Branch 2):** Rachel Kim (SED) → Tony Russo (2★) → Sofia Reyes (Rookie)
                                            → Kevin Okafor (1★)
**Hierarchy (Branch 3):** Victor Hayes (CMO) → Diana Foster (MD) → Ryan Mitchell (4★)

### Applications

| Status | Email | Name | Notes |
|--------|-------|------|-------|
| PENDING | alex.johnson@example.com | Alex Johnson | For testing review flow |
| APPROVED | jamie.torres@example.com | Jamie Torres | Links to User, reviewed by admin |

### Sample Clients & Bonus Pools

| Client | Status | Closer | Bonus Pool | Notes |
|--------|--------|--------|------------|-------|
| David Wilson | APPROVED | Marcus Rivera (2★) | $400 distributed, all PAID | Star pool: Marcus 2 slices + James 2 slices |
| Emily Chen | APPROVED | Jamie Torres (0★) | $400 distributed, all PENDING | Star pool: Marcus 2 slices + James 2 slices |
| Robert Kim | PENDING | Marcus Rivera | No pool yet | Pending approval |

### Sample Client Drafts

| Draft | Status | Step | Closer | Notes |
|-------|--------|------|--------|-------|
| Sarah Martinez | DRAFT | 2 | Marcus Rivera | Partially filled (name, email, phone, ID doc) |

---

## Documentation

For every task you complete, you should update the `CLAUDE.md` file to reflect the changes you made.
And if some detail document is needed, write a new file in the `docs/` directory.
