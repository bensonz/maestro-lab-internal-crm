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

# Database
docker compose up -d       # Start PostgreSQL (port 5432)
pnpm prisma migrate dev    # Apply migrations
pnpm prisma generate       # Regenerate Prisma client
pnpm db:seed               # Seed database (tsx prisma/seed.ts)
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

Each client is onboarded to 11 platforms (8 sports betting + 3 financial), tracked via `ClientPlatform` with individual `PlatformStatus`.

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

### Path Aliases

- `@/*` → `./src/*`

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
