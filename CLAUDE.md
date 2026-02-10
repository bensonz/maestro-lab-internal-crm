# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev                    # Start Next.js dev server (localhost:3000)
pnpm build                  # Production build
pnpm lint                   # Run ESLint

# Testing
pnpm test                   # Run Vitest in watch mode
pnpm test:run               # Run tests once (CI mode)
pnpm test src/lib/platforms.test.ts  # Run specific test file

# Database (local)
docker compose up -d       # Start PostgreSQL (port 5432)
pnpm prisma migrate dev    # Apply migrations
pnpm prisma generate       # Regenerate Prisma client
pnpm db:seed               # Seed database (tsx prisma/seed.ts)

# Database (production — Neon)
DATABASE_URL="<neon-url>" pnpm prisma db push       # Push schema changes
DATABASE_URL="<neon-url>" pnpm prisma studio         # Browse production data
DATABASE_URL="<neon-url>" pnpm prisma migrate deploy # Apply migrations (when using migrate workflow)
```

## Architecture

### Application Structure

This is a CRM for managing client onboarding across multiple sports betting platforms. Two distinct user interfaces:

- **Agent Portal** (`/agent/*`) - Field agents manage their assigned clients through the onboarding process
- **Back Office** (`/backoffice/*`) - Staff oversee all clients, agents, and financial operations

### User Roles

Four roles defined in `UserRole` enum: `AGENT`, `BACKOFFICE`, `ADMIN`, `FINANCE`

### Client Lifecycle

Clients progress through `IntakeStatus` states:
`PENDING` → `PHONE_ISSUED` → `IN_EXECUTION` → `READY_FOR_APPROVAL` → `APPROVED/REJECTED`
`APPROVED` → `PARTNERSHIP_ENDED` (terminal — closure workflow)

Each client is onboarded to 11 platforms (8 sports betting + 3 financial), tracked via `ClientPlatform` with individual `PlatformStatus`.

### Client Onboarding (2-Phase Workflow)

Client onboarding at `/agent/new-client` uses a 2-phase workflow:

**Phase 1: Pre-qualification** — Three sub-steps:
1. **ID Verification** (Step 1.1) — Agent uploads client ID (with OCR extraction), confirms extracted data
2. **Gmail Account** (Step 1.2) — Agent enters company-created Gmail/password
3. **BetMGM Registration Check** (Step 1.3) — Agent records BetMGM registration result (success/failed); if success, uploads login + deposit page screenshots

Submitting creates the Client record with `prequalCompleted: true` and 11 ClientPlatform records. BetMGM status = `REJECTED` if failed, `PENDING_REVIEW` if success. Screenshots stored on `ClientPlatform.screenshots`. The page stays (no redirect) and starts polling for BetMGM verification.

**Phase 2: Full Application** — Unlocked only after BetMGM is verified (backoffice manual review via `verifyBetmgmManual()`). Agent fills Basic Info, Address, and Compliance sections (6 groups: Banking, PayPal, Platform History, Criminal/Legal, Risk Assessment, Language). Submit updates the existing Client and redirects to `/agent/clients`.

**Layout:** Fixed sidebar (`w-56`) for Pipeline | Form (center, full-width) | Risk Panel (right, resizable). Pipeline sidebar is not resizable; form + risk panel use a 2-panel `ResizablePanelGroup`.

**Key files:**
- `src/app/actions/prequal.ts` — `submitPrequalification()`, `updateGmailCredentials()`
- `src/app/actions/betmgm-verification.ts` — `verifyBetmgmManual()` (backoffice), `checkBetmgmStatus()` (agent polling)
- `src/lib/validations/prequal.ts` — Zod schema for Phase 1 data (includes betmgmResult + screenshot URL fields)
- `src/app/api/upload/route.ts` — File upload API endpoint (POST, accepts FormData with file/entity/entityId/type/platformCode)
- `src/app/agent/new-client/_components/client-form.tsx` — Main form orchestrator; returns `{ form, riskPanel }` object
- `src/app/agent/new-client/_components/new-client-page-client.tsx` — Client wrapper that destructures ClientForm output into layout
- `src/app/agent/new-client/_components/gmail-section.tsx` — Gmail/password inputs (standalone)
- `src/app/agent/new-client/_components/betmgm-check-section.tsx` — BetMGM success/fail + 2 screenshot uploads
- `src/app/agent/new-client/_components/compliance-groups.tsx` — 6 collapsible groups with 10+ questions, exports `ComplianceData` interface + `EMPTY_COMPLIANCE_DATA`
- `src/app/agent/new-client/_components/risk-panel.tsx` — Always-visible right sidebar with 8 compliance rules, risk factors, compliance summary
- `src/app/agent/new-client/_components/new-client-layout.tsx` — Fixed sidebar + 2-panel resizable layout (Form | Risk Panel)
- `src/app/agent/new-client/_components/pipeline-panel.tsx` — Phase-based pipeline sidebar (Phase 4→1, collapsible sections, names only)
- `src/lib/client-phase.ts` — `getClientPhase()` utility + `PHASE_COUNT`, `PHASE_SHORT_LABELS` constants
- `src/app/agent/new-client/_components/phase-header.tsx` — Visual phase label divider
- `src/app/agent/new-client/_components/phase-gate.tsx` — Locked/unlocked divider between phases

**Schema additions:** `Client.gmailAccount`, `Client.gmailPassword`, `Client.prequalCompleted`, `Client.riskFlags` (Json); `ApplicationDraft.clientId`, `ApplicationDraft.phase`

**ClientForm return pattern:** `ClientForm` returns `{ form: JSX, riskPanel: JSX }` instead of JSX directly, allowing the layout to place form and risk panel in separate resizable panels. The `NewClientPageClient` wrapper handles this destructuring.

**Risk Panel:** Always-visible right sidebar with 8 compliance rules (ID expiry, PayPal previously used, platforms used, own bank pin [backoffice], company money [backoffice], debanked, multiple PayPal, 8+ platforms). Two rules (#4, #5) are backoffice-only placeholders. Risk level computed as HIGH/MEDIUM/LOW based on compliance data.

**Override Tracking:** When agent manually edits AI-extracted ID fields, changes are tracked in `overriddenFields` and displayed in the risk panel.

**ID Expiration Check:** During ID upload, if the ID expiry date is within 75 days a warning is shown. If expired (<=0 days), Phase 1 submission is blocked.

**BetMGM Polling:** After Phase 1 submit, the client page polls `checkBetmgmStatus()` every 15 seconds. When verified, a toast notification appears and Phase 2 unlocks.

**Phase 2 URL:** `?client=<clientId>` — page.tsx fetches Client + BetMGM status and passes to ClientForm.

### Key Patterns

**Authentication**: NextAuth v5 beta with credentials provider. Session includes `user.id` and `user.role`. Auth check pattern:

```typescript
const session = await auth();
if (!session?.user) redirect("/login");
```

**Database Access**: Prisma client singleton at `@/lib/prisma/client`. Always import from there, not `@prisma/client` directly.

**Type Exports**: Use `@/types` for Prisma model types and enums - it re-exports from `@prisma/client` plus UI-specific types.

**Storage Abstraction**: `@/lib/storage` provides `StorageProvider` interface. Currently local filesystem only. Use `getStorage()` for singleton access.

**Platform Utilities**: `@/lib/platforms` provides metadata (names, abbreviations, categories) for the 11 supported platforms.

**CSV Export**: `@/backend/utils/csv` provides `generateCSV()` and `csvResponse()`. Export API routes at `/api/export/{clients,settlements,agents}` require ADMIN or BACKOFFICE role. Pages use the `ExportCSVButton` client component for download triggers.

**UI Components**: shadcn/ui (new-york style) in `@/components/ui/`. Icons from `lucide-react`.

**Form Fields**: Use `Field` component from `@/components/ui/field` instead of raw `Label` + `Input` combinations. The Field component provides consistent spacing, error handling, and accessibility.

```tsx
// Prefer this:
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

<Field>
  <FieldLabel htmlFor="email">Email</FieldLabel>
  <Input id="email" name="email" />
  <FieldError>{errors?.email}</FieldError>
</Field>

// Instead of:
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" name="email" />
  {errors?.email && <p className="text-destructive">{errors.email}</p>}
</div>
```

### Test IDs

Add `data-testid` attributes to all interactive and significant UI elements for automated testing. Use descriptive kebab-case names:

```tsx
// Buttons & actions
<Button data-testid="submit-client-form">Submit</Button>
<Button data-testid="approve-extension-btn">Approve</Button>

// Inputs & forms
<Input data-testid="client-first-name" />
<form data-testid="new-client-form">

// Cards, sections & containers
<Card data-testid="client-card-{clientId}">
<div data-testid="deadline-countdown">
<div data-testid="extension-request-dialog">

// Table rows
<tr data-testid="client-row-{clientId}">
```

This enables reliable UI automation. Always add `data-testid` to: buttons, form inputs, modals/dialogs, cards, table rows, nav links, and status badges.

### Commission System

`src/backend/services/commission.ts` — Core commission logic:
- `createBonusPool(clientId)` — Creates $400 pool when client is approved, distributes immediately
- `distributeStarPool(poolId)` — Walks hierarchy upward, assigns $50 slices capped by star level
- `recalculateStarLevel(agentId)` — Updates agent tier based on approved client count
- `getAgentCommissionSummary(agentId)` — Query for UI: total earned, pending, paid

Key rules:
- $200 direct bonus always goes to closer
- $200 star pool = 4 slices × $50, distributed up hierarchy
- Each agent takes min(starLevel, remainingSlices)
- Leftover slices → backfill to highest-star ancestor, then recycle to company
- Star levels frozen at distribution time (immutable)
- Leadership (5★+) uses separate `LeadershipPayout` model (P&L revenue share)

### Transaction System

`src/backend/services/transaction.ts` — Append-only financial ledger:
- `recordTransaction(data)` — Single entry point for creating transactions (never use prisma.transaction.create directly)
- `recordTransactionFromFundMovement(fm, userId)` — Converts FundMovement into 1-2 Transaction entries
- `recordCommissionTransaction(allocation, userId)` — Records commission payouts
- `getClientBalance(clientId, platform?)` — Calculates balance from transaction history
- `getClientBalanceBreakdown(clientId)` — Per-platform balance breakdown
- `reverseTransaction(id, reason, userId)` — Creates offsetting ADJUSTMENT (never deletes)
- `getTransactionHistory(filters)` — Paginated query with type/platform/date filters

Key rules:
- Transactions are NEVER updated or deleted (append-only)
- To reverse: mark original as "reversed" + create ADJUSTMENT entry
- Every FundMovement automatically creates matching Transaction(s) via hook in `src/app/actions/fund-movements.ts`
- TransactionType enum: DEPOSIT, WITHDRAWAL, INTERNAL_TRANSFER, COMMISSION_PAYOUT, FEE, ADJUSTMENT

### Team Hierarchy

`src/backend/data/hierarchy.ts` — Agent hierarchy queries:
- `getAgentHierarchy(agentId)` — Returns supervisor chain (upward) + subordinate tree (downward)
- `getTeamRollup(agentId)` — Aggregates metrics across entire subordinate tree
- `getAllSubordinateIds(agentId)` — BFS to get all descendant agent IDs

Team page at `/agent/team` shows supervisor chain, expandable subordinate tree, and team stats.

### Client Closure

`src/backend/services/closure.ts` — Partnership end workflow:
- `verifyZeroBalances(clientId)` — Checks all platform balances are zero via transaction ledger
- `closeClient(data)` — Validates status + balances, updates to PARTNERSHIP_ENDED, logs event, cancels open todos
- `getClosureDetails(clientId)` — Query for closure info display

Server action at `src/app/actions/closure.ts` — ADMIN/BACKOFFICE only. Admin can skip balance check.
PARTNERSHIP_ENDED is a terminal state reachable only from APPROVED.

### Path Aliases

- `@/*` → `./src/*`

---

## Testing Requirements

**Every feature must include test files.** When implementing a new feature, write tests alongside the production code.

### Test Setup

- **Framework**: Vitest + @testing-library/react + @testing-library/jest-dom
- **Config**: `vitest.config.ts` (jsdom environment, globals enabled)
- **Setup file**: `src/test/setup.ts`
- **Test location**: `src/test/` directory, mirroring source structure

### What to Test

For **server actions** (`src/app/actions/*.ts`):
- Auth guard (unauthenticated → error)
- Role authorization (wrong role → error)
- Validation (missing/invalid inputs → error)
- Happy path (correct inputs → success + side effects)
- Edge cases (duplicate, not found, invalid state transitions)

For **service functions** (`src/backend/services/*.ts`):
- Core business logic
- State transitions (valid + invalid)
- Edge cases

For **data queries** (`src/backend/data/*.ts`):
- Test with mocked Prisma client
- Verify correct query parameters

For **React components** (when they contain significant logic):
- Rendering with various props
- User interactions (clicks, form submissions)
- Conditional rendering based on state

### Test Conventions

```typescript
// File naming: mirror the source path
// src/app/actions/phones.ts → src/test/backend/actions/phones.test.ts
// src/backend/services/status-transition.ts → src/test/backend/services/status-transition.test.ts

// Mock pattern for auth
vi.mock('@/backend/auth', () => ({ auth: vi.fn() }))

// Mock pattern for Prisma
vi.mock('@/backend/prisma/client', () => ({
  default: {
    client: { findUnique: vi.fn(), update: vi.fn() },
    // ... mock each model used
  },
}))

// Mock pattern for next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`) }),
}))

// Mock pattern for next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))
```

### Running Tests

```bash
pnpm test              # Watch mode
pnpm test:run          # Single run (CI)
pnpm test src/test/backend/actions/phones.test.ts  # Specific file
```

### Existing Tests (Reference)

- `src/test/backend/actions/clients.test.ts` — createClient, saveDraft, deleteDraft actions
- `src/test/backend/actions/prequal.test.ts` — submitPrequalification, updateGmailCredentials, BetMGM screenshot handling
- `src/test/backend/actions/betmgm-verification.test.ts` — verifyBetmgmManual, checkBetmgmStatus actions
- `src/test/backend/actions/upload.test.ts` — Upload API route validation, storage integration
- `src/test/backend/validations/client.test.ts` — client form validation
- `src/test/backend/validations/prequal.test.ts` — prequal form validation, BetMGM conditional screenshot requirements
- `src/test/backend/lib/platforms.test.ts` — platform utilities
- `src/test/backend/utils/csv.test.ts` — CSV generation utility (escaping, BOM, edge cases)
- `src/test/backend/services/commission.test.ts` — Commission distribution algorithm, star level calculation
- `src/test/backend/data/agent-detail.test.ts` — Agent detail data query
- `src/test/backend/services/transaction.test.ts` — Transaction ledger: record, balance, reversal, history
- `src/test/backend/data/hierarchy.test.ts` — Team hierarchy: supervisor chain, subordinate tree, rollup
- `src/test/backend/services/closure.test.ts` — Client closure: balance verification, close client, auth/role guards

---

## Next.js Best Practices (App Router)

### Data Fetching

- **Server Components by default** — fetch data directly in components, no `useEffect`
- **Server Actions for mutations** — `'use server'` functions, form actions
- **No API routes for internal data** — only for external webhooks/third-party integrations
- **Parallel fetching** — `Promise.all()` or multiple awaits in same component

### Component Architecture

- **Server Components** — data fetching, heavy deps, SEO content
- **Client Components** — interactivity, hooks, browser APIs
- **`'use client'`** — only at the boundary, push it down as far as possible
- **Composition pattern** — pass Server Components as children to Client Components

### File Structure

```
app/
├── (portal)/               # Route groups for shared layouts
│   ├── layout.tsx
│   └── clients/
│       ├── page.tsx        # Server Component (default)
│       └── _components/    # Co-located components
├── actions/                # Server Actions (centralized)
│   └── clients.ts          # 'use server' functions
└── lib/                    # Shared utilities
```

### Forms

- **Server Actions** over API routes
- **`useActionState`** (React 19) for form state + pending
- **`useFormStatus`** for submit button states
- **Progressive enhancement** — forms work without JS

### Validation

- **Zod** for schema validation
- **Validate on server** — never trust client
- **Return typed errors** from Server Actions

### Caching & Revalidation

- **`revalidatePath()`** / **`revalidateTag()`** after mutations
- **`unstable_cache()`** for expensive operations
- **Avoid over-caching** — Next.js 15 is less aggressive by default

### Auth

- **Middleware** for route protection
- **Server-side session checks** in layouts/pages
- **Don't expose sensitive data** in Client Components

---

## Production Deployment

**Live site:** https://maestro-lab-internal-crm.vercel.app (Vercel, private access only)

**Database:** Neon PostgreSQL (auto-provisioned by Vercel)

### Schema Changes

After modifying `prisma/schema.prisma`, the production database must be updated. Since the site is currently private/dev-only, use `db push`:

```bash
DATABASE_URL="<neon-url>" pnpm prisma db push
```

**Important:** Every schema change (new columns, enums, relations) requires syncing production. If you forget, the deployed app will get Prisma errors like `The column (not available) does not exist in the current database`, which NextAuth surfaces as `error=Configuration` on login.

When the app goes to real production with user data, switch to `prisma migrate dev` locally + `prisma migrate deploy` in CI/CD to get proper migration history and rollback safety.

### Environment Variables (Vercel)

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Auto-set by Neon integration |
| `AUTH_SECRET` | Yes | Must be 32+ characters (`openssl rand -base64 32`) |
| `STORAGE_PROVIDER` | Yes | `vercel-blob` for production |
| `BLOB_READ_WRITE_TOKEN` | Yes | Auto-set by Vercel Blob integration |

Do NOT set `AUTH_URL` on Vercel — NextAuth v5 auto-detects from `VERCEL_URL`.

---

## Tailwind CSS v4 Notes

This project uses **Tailwind CSS v4** (`@tailwindcss/postcss` v4). Key differences from v3:

### Arbitrary Value Syntax

In arbitrary values, **use underscores `_` to represent spaces**, not commas.

```tsx
// CORRECT (Tailwind v4) — underscores become spaces in CSS output
<div className="grid grid-cols-[1fr_120px_100px_140px_40px]" />
// → grid-template-columns: 1fr 120px 100px 140px 40px;

// WRONG (Tailwind v3 syntax) — commas produce invalid CSS, grid silently fails
<div className="grid grid-cols-[1fr,120px,100px,140px,40px]" />
// → grid-template-columns: 1fr,120px,100px,140px,40px; ← INVALID
```

This applies to all arbitrary CSS values: `grid-cols-[...]`, `grid-rows-[...]`, `translate-[...]`, etc.

The card component (`src/components/ui/card.tsx`) already uses correct v4 syntax as reference:
```
grid-cols-[1fr_auto]
grid-rows-[auto_auto]
```

---

## Current Violations to Fix

### 1. API Route for Internal Data ❌

`src/app/api/agent/dashboard/route.ts` — fetches dashboard data via API route.

**Fix:** Delete this route. Fetch directly in Server Component or use Server Action.

### 2. Excessive `'use client'` at Page Level ❌

Almost all pages are marked `'use client'`:

- All `/backoffice/*` pages including layout
- `/agent/new-client/page.tsx`
- `/login/page.tsx`

**Fix:** Make pages Server Components by default. Extract interactive parts into `_components/` client components.

### 3. Hardcoded Mock Data in Pages ❌

`/agent/clients/page.tsx` and `/backoffice/page.tsx` use hardcoded arrays instead of fetching from DB.

**Fix:** Fetch real data in Server Components using Prisma directly.

### 4. No Server Actions Directory ❌

No `src/app/actions/` directory for mutations.

**Fix:** Create `src/app/actions/` with domain-grouped server action files (e.g., `clients.ts`, `platforms.ts`).

### 5. Backoffice Layout is Client Component ❌

`/backoffice/layout.tsx` is `'use client'` — makes all children client components by default.

**Fix:** Make layout a Server Component. Only wrap interactive sidebar in client boundary.

---

## Test Accounts (Seed Data)

| Role       | Email          | Password    |
| ---------- | -------------- | ----------- |
| Agent      | agent@test.com | password123 |
| Backoffice | admin@test.com | password123 |
| GM         | gm@test.com    | password123 |

---

## Documentation

For every task you complete, you should update the `CLAUDE.md` file to reflect the changes you made.
And if some detail document is needed, write a new file in the `docs/` directory.
