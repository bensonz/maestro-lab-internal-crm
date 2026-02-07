# Maestro L.A.B — Internal CRM

Internal CRM for managing sports betting client onboarding, agent performance, fund allocation, and settlements.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Server Components)
- **Database:** PostgreSQL via Prisma 7
- **Auth:** NextAuth v5 (Credentials provider, RBAC)
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Fonts:** Inter + JetBrains Mono
- **Deployment:** Vercel (Postgres via Neon, Blob storage)

## Portals

| Portal | Path | Roles | Description |
|--------|------|-------|-------------|
| Agent | `/agent/*` | AGENT | Client onboarding, uploads, earnings, todos |
| Backoffice | `/backoffice/*` | ADMIN, GM | Operations, agent management, settlements, fund allocation |
| Login | `/login` | All | Credentials-based authentication |

## Getting Started

### Prerequisites

- Node.js 24+ (via nvm)
- Docker (for local PostgreSQL)
- pnpm

### Setup

```bash
# Install dependencies
pnpm install

# Start local PostgreSQL
docker compose up -d

# Push schema to database
pnpm prisma db push

# Seed test accounts
pnpm prisma db seed

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Test Accounts

| Email | Password | Role |
|-------|----------|------|
| agent@test.com | password123 | AGENT |
| admin@test.com | password123 | ADMIN |
| gm@test.com | password123 | GM |

## Project Structure

```
src/
├── app/
│   ├── agent/              # Agent portal pages
│   │   ├── clients/        # Client list + detail
│   │   ├── earnings/       # Earnings & performance
│   │   ├── new-client/     # Intake form
│   │   ├── settings/       # Profile settings
│   │   └── todo-list/      # Task management
│   ├── backoffice/         # Backoffice portal pages
│   │   ├── agent-management/
│   │   ├── client-management/
│   │   ├── client-settlement/
│   │   ├── fund-allocation/
│   │   ├── phone-tracking/
│   │   ├── sales-interaction/
│   │   └── todo-list/
│   ├── api/                # API routes (CSV export, etc.)
│   └── login/
├── backend/
│   ├── auth.ts             # NextAuth configuration
│   ├── data/               # Data access layer (Prisma queries)
│   ├── services/           # Business logic (KPIs, transitions)
│   └── storage/            # File storage abstraction (local, Vercel Blob, S3, R2)
├── components/             # Shared UI components
│   ├── ui/                 # shadcn/ui primitives
│   └── app-sidebar/        # Navigation sidebars
├── test/                   # Vitest test suites
└── types/                  # Shared TypeScript types
```

## Key Features

- **Client Onboarding:** Multi-step intake form with ID scanning, compliance checks, and draft saving
- **Platform Management:** 11 platform registration tracking (PayPal, Bank, Edgeboost + 8 sportsbooks)
- **To-Do System:** Auto-generated tasks with deadlines, extensions, and screenshot uploads
- **Fund Allocation:** Internal/external fund movements between clients and platforms
- **Agent KPIs:** Success rate, delay rate, extension rate, avg days to convert
- **Settlement Tracking:** Per-client deposit/withdrawal breakdown by platform
- **Phone Tracking:** Company phone number issuance and lifecycle management
- **CSV Export:** Clients, agents, and settlements exportable as CSV

## Environment Variables

### Required (Production)

```env
DATABASE_URL=           # PostgreSQL connection string (auto-set on Vercel)
AUTH_SECRET=            # NextAuth secret
AUTH_URL=               # Production URL (e.g., https://your-app.vercel.app)
STORAGE_PROVIDER=       # "vercel-blob" for production, "local" for dev
BLOB_READ_WRITE_TOKEN=  # Vercel Blob token (auto-set on Vercel)
```

### Local Development

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/crm_db
AUTH_SECRET=dev-secret
```

## Scripts

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm test:run     # Run Vitest tests
pnpm prisma db push    # Push schema changes
pnpm prisma db seed    # Seed test data
pnpm prisma studio     # Open Prisma Studio
```

## Deployment

Deployed on Vercel with:
- **Database:** Vercel Postgres (Neon) — `DATABASE_URL` auto-configured
- **Storage:** Vercel Blob — set `STORAGE_PROVIDER=vercel-blob`
- **Auth:** Set `AUTH_URL` and `AUTH_SECRET` in Vercel env vars

## License

Private — Maestro L.A.B internal use only.
