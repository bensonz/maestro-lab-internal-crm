# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current State: Phase 1 — Agent Application Flow

The backend has been wiped and rebuilt with a minimal schema. Most pages still render using mock data (`src/lib/mock-data.ts`). The first real backend flow is the **Agent Application** system, which is fully functional end-to-end.

### What's Live (backed by database)

- **Prisma schema** with 3 models: `User`, `AgentApplication`, `EventLog`
- **Agent Application form** on login page ("Apply as Agent" tab) — uploads both ID + Address Proof documents
- **Application review** in backoffice Agent Management ("Pending Applications" tab) — shows both documents
- **Agent Directory** in backoffice Agent Management ("Agent Directory" tab) — queries real User table
- **Login Management** page (`/backoffice/login-management`) — full CRUD for all users from DB
- **User management** server actions (create, update, toggle, reset password)
- **Search API** (simplified — searches Users only)
- **NextAuth v5** credentials-based authentication with JWT sessions

### What's Mock (UI shell only)

All other pages use static mock data from `src/lib/mock-data.ts` and no-op stubs from `src/lib/mock-actions.ts`:
- Agent dashboard, clients, earnings, team, todos
- Backoffice overview, sales interaction, client management, settlements, commissions, fund allocation, partners, profit sharing, reports, phone tracking, action hub

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

### Database Schema (Phase 1)

3 models in `prisma/schema.prisma`:

- **User** — All staff accounts (agents, admins, backoffice, finance). Includes hierarchy (supervisorId self-relation), profile fields, star level/tier.
- **AgentApplication** — Public application form submissions. Status: PENDING → APPROVED/REJECTED. Links to reviewer (User) and created user on approval. Stores `idDocument` and `addressDocument` upload paths.
- **EventLog** — Append-only audit trail. EventType enum covers login, application, user management events.

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

### Existing Tests (4 files, 41 tests)

- `src/test/backend/actions/agent-application.test.ts` — Validation, email uniqueness, happy path, addressDocument
- `src/test/backend/actions/application-review.test.ts` — Auth guards, approve/reject, edge cases, addressDocument copy
- `src/test/backend/actions/user-management.test.ts` — CRUD user actions, auth/role guards
- `src/test/backend/data/applications.test.ts` — Query functions, stats

---

## Page Inventory

### Agent Portal

| Route | Page File | Data Source |
|-------|-----------|-------------|
| `/agent` | `src/app/agent/page.tsx` | Mock — dashboard cockpit |
| `/agent/clients` | `src/app/agent/clients/page.tsx` | Mock — client list |
| `/agent/clients/[id]` | `src/app/agent/clients/[id]/page.tsx` | Mock — client detail |
| `/agent/earnings` | `src/app/agent/earnings/page.tsx` | Mock — earnings + KPIs |
| `/agent/team` | `src/app/agent/team/page.tsx` | Mock — hierarchy tree |
| `/agent/todo-list` | `src/app/agent/todo-list/page.tsx` | Mock — todo list |
| `/agent/settings` | `src/app/agent/settings/page.tsx` | Mock — user settings |

### Back Office

| Route | Page File | Data Source |
|-------|-----------|-------------|
| `/backoffice` | `src/app/backoffice/page.tsx` | Mock — overview |
| `/backoffice/agent-management` | page.tsx | **Real DB** — Agent Directory + Pending Applications (2 tabs) |
| `/backoffice/agent-management/[id]` | page.tsx | Mock — agent detail |
| `/backoffice/login-management` | page.tsx | **Real DB** — all users CRUD |
| `/backoffice/client-management` | page.tsx | Mock — client list |
| `/backoffice/client-settlement` | page.tsx | Mock — settlements |
| `/backoffice/commissions` | page.tsx | Mock — commissions |
| `/backoffice/fund-allocation` | page.tsx | Mock — fund movements |
| `/backoffice/partners` | page.tsx | Mock — partners |
| `/backoffice/phone-tracking` | page.tsx | Mock — phones |
| `/backoffice/profit-sharing` | page.tsx | Mock — profit sharing |
| `/backoffice/reports` | page.tsx | Mock — reports |
| `/backoffice/sales-interaction` | page.tsx | Mock — sales pipeline |
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

| Role | Email | Password | Name |
|------|-------|----------|------|
| Admin | admin@test.com | password123 | Sarah Chen |
| Admin (GM) | gm@test.com | password123 | Tom Adams |
| Agent | agent@test.com | password123 | Marcus Rivera |
| Agent | jamie.torres@example.com | approved123 | Jamie Torres (approved from application) |

### Applications

| Status | Email | Name | Notes |
|--------|-------|------|-------|
| PENDING | alex.johnson@example.com | Alex Johnson | For testing review flow |
| APPROVED | jamie.torres@example.com | Jamie Torres | Links to User, reviewed by admin |

---

## Documentation

For every task you complete, you should update the `CLAUDE.md` file to reflect the changes you made.
And if some detail document is needed, write a new file in the `docs/` directory.
