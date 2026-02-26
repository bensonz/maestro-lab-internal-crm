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

### 11 Prisma Models (`prisma/schema.prisma`)

- **User** — staff accounts with hierarchy (supervisorId), star level/tier, leadershipTier (NONE/ED/SED/MD/CMO)
- **AgentApplication** — PENDING → APPROVED/REJECTED. Stores idDocument + addressDocument
- **Client** — PENDING → APPROVED. Links to closer (User). Optional BonusPool + fromDraft
- **ClientDraft** — DRAFT → SUBMITTED. 4-step form data, risk flags, platformData (Json), generatedCredentials (Json), document paths. Many Step 1/2 field columns
- **BonusPool** — $400 per approved client. Has many BonusAllocation[]
- **BonusAllocation** — DIRECT / STAR_SLICE / BACKFILL. Status: PENDING → PAID
- **PromotionLog** — immutable star level + leadership tier change audit
- **QuarterlySettlement** — DRAFT → APPROVED → PAID. Unique per [leaderId, year, quarter]
- **PhoneAssignment** — SIGNED_OUT → RETURNED. Tracks phone, carrier, deviceId, dueBackAt (3-day window). OVERDUE computed at view time
- **Todo** — PENDING → COMPLETED/CANCELLED. issueCategory (4 predefined), dueDate (default 3 days), metadata (Json)
- **EventLog** — append-only audit trail for all system events

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
Agent Application + review, Agent Directory (table/tree, HoverCard), Login Management (CRUD), Commission system ($400 pool, star distribution), Client drafts (CRUD, auth-guarded), Phone assignments (assign/return/re-issue), Agent Dashboard (earnings/star), Agent Earnings (allocations), Agent Clients, Agent Detail (inline-edit + audit), New Client (4-step intake), Commissions page, Search API, NextAuth v5

### Partially Wired (DB + mock fallbacks)
- Agent dashboard — earnings real, pipeline mock
- Agent earnings — transactions real, KPIs mock
- Agent clients — DB first, falls back to mock
- Sales interaction — real drafts + todos + device actions alongside mock data; post-approval mock
- Agent Action Hub — real todos merged with mock

### Mock (UI shell only)
Agent team/todos/settings. Backoffice overview, client management UI, settlements, fund allocation, partners, profit sharing, reports, phone tracking, action hub. Mock data: `src/lib/mock-data.ts`, stubs: `src/lib/mock-actions.ts`.

---

## 6. Business Logic

### Draft/Client Lifecycle

```
ClientDraft (DRAFT) → submit → ClientDraft (SUBMITTED) + Client (PENDING)
                                    → backoffice approves → Client (APPROVED) + star recalc + $400 pool
```
Agent "My Clients" shows drafts grouped by step (1-4) at top, approved/submitted below. PENDING filtered (exist as drafts).

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

## 8. Feature: Client Draft / New Client

4-step intake form at `/agent/new-client`. 3-panel layout: drafts (w-56), form (full-width), risk panel (w-56).

**Steps:**
1. **Pre-Qual** — ID upload (OCR auto-fill), Gmail (deterministic suggestion via `stableHash(name+DOB)`), BetMGM verification (screenshots + OCR). Different-address flow with checkbox
2. **Background** — SSN/citizenship/missing IDs/criminal, banks/de-banked/PayPal/sportsbook history, demographics + 4 risk assessment questions. **Device Reservation Gate:** "Request for Device" saves reservation, agent blocked on Step 2 until backoffice assigns device (auto-advances to Step 3)
3. **Platforms** — Device Info Banner (phone, Gmail, countdown) + 11 platform registrations (3 financial + 8 sportsbook). Bank card: special 2-row layout with OCR auto-detect, PIN default 2580
4. **Contract** — document upload + submission checklist

**Auto-save:** 500ms debounced. `step` in DB = highest step ever reached (via `highestStepRef`). `formDataRef` pattern avoids stale closures.

**Generated Credentials:** Stored in `generatedCredentials` Json field. Generated at form init (`ensureStep3Credentials`), Step 1 credentials via `useEffect` when name+DOB available. Immediately saved to DB (bypasses debounce). Step components only read, never generate. Key file: `credential-generators.ts`.

**Key files:** `src/app/agent/new-client/_components/client-form.tsx` (state/save/nav), `step1-prequal.tsx`, `step2-background.tsx`, `step3-platforms.tsx`, `step3-platform-card.tsx`, `step4-contract.tsx`, `risk-panel.tsx`, `src/app/actions/client-drafts.ts`, `src/backend/data/client-drafts.ts`

---

## 9. Feature: Sales Interaction

Backoffice hub at `/backoffice/sales-interaction`. Queue/Review tab toggle.

**In Progress rows:** Client name + Agent link + badge (PHONE ISSUED/RETURNED only) | Days since update | Actions: Review (always), Assign Device (reservation exists, no device), Mark Returned (active device), Re-issue (returned device), Approve (step-4 submitted). Real DB drafts alongside mock data.

**Device lifecycle:** Integrated into rows by activity, not step. Assign auto-advances draft to step 3. Re-issue preserves original dueBackAt. Badges show phone number on hover.

**Review dialog:** 4-step read-only, Approve on Step 4. Step 3 shows credential fill status (green=both, amber=partial, dim=empty).

**Todo system:** Done → `completeTodo()` (COMPLETED + event). Revert → `revertTodo()` (back to PENDING + event). Assign dialog: client picker, 4 issue categories, default 3-day due.

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

**16 files, 233 tests:** Agent Application (5 files, 57), Commission (7 files, 73), Client Draft (2 files, 55), Phone Assignment (1 file, 22), Todo (1 file, 16)

---

## 12. Seed Data

See `prisma/seed.ts` for full details. All passwords: `password123` (except Jamie Torres: `approved123`).

**Key accounts:** admin@test.com (Admin), backoffice@test.com (Backoffice), agent@test.com (Marcus Rivera, 2★)

**Hierarchy:**
- James Park (ED) → Marcus Rivera (2★) → Jamie Torres, Carlos Mendez, Aisha Williams; Lisa Wang (3★) → Derek Nguyen, Priya Sharma
- Rachel Kim (SED) → Tony Russo (2★) → Sofia Reyes; Kevin Okafor
- Victor Hayes (CMO) → Diana Foster (MD) → Ryan Mitchell (4★)

**Sample data:** 3 clients (2 APPROVED w/ bonus pools, 1 PENDING), 1 draft (Sarah Martinez, step 2), 1 phone assignment (SIGNED_OUT), 1 todo (Contact Bank, PENDING)

---

## 13. Documentation

Update `CLAUDE.md` after every task. Write detail docs to `docs/` directory when needed.
