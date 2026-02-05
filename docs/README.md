# CRM Project Documentation

*Last updated: 2026-02-05*

---

## Document Index

| Document | Description |
|----------|-------------|
| **[PRD.md](../PRD.md)** | **📌 Source of Truth** — Product Requirements Document |
| [PRD_MERGED.md](../PRD_MERGED.md) | Legacy merged PRD (reference only) |
| [MILESTONES.md](./MILESTONES.md) | Roadmap: MVP → V1 → V1.1 → V2 |
| [PAGES.md](./PAGES.md) | Page overview with routes and screenshots |
| [PAGES-AGENT.md](./PAGES-AGENT.md) | Agent portal — detailed interactions |
| [PAGES-BACKOFFICE.md](./PAGES-BACKOFFICE.md) | Backoffice portal — detailed interactions |
| [PAGES-GM.md](./PAGES-GM.md) | GM portal (V1.1) — requirements |
| [supplementary-requirements-v1.md](./supplementary-requirements-v1.md) | Additional stakeholder requirements |
| [gap-analysis-v1.md](./gap-analysis-v1.md) | PRD vs supplementary comparison |

---

## Quick Reference

### Routes

| Portal | Prefix | Pages |
|--------|--------|-------|
| Agent | `/` | 7 pages |
| Backoffice | `/backoffice` | 9 pages |
| GM | `/gm` | 5 pages (V1.1) |
| Auth | `/login` | 1 page |

### Platforms (11 Confirmed)

**Sports (8):** DK, FD, MGM, CZR, FAN, BB, BR, 365

**Financial (3):** BNK, PP, EB

See [PRD.md](../PRD.md) for full platform names and codes.

### Key States

**Client Intake:**
`PENDING` → `PHONE_ISSUED` → `IN_EXECUTION` → `READY_FOR_APPROVAL` → `APPROVED`

**Platform Registration:**
`NOT_STARTED` → `PENDING_UPLOAD` → `PENDING_REVIEW` → `VERIFIED`

**Platform Lifecycle:**
`REGISTERED` → `INITIAL_DEPOSIT` → `VIP_INVITED` → `LIMITED` → `CLOSED`

---

## Screenshots

Located in `/screenshots/`:
- `agent-01-earnings.jpg`
- `agent-02-my-clients.jpg`
- `agent-03-new-client.jpg`
- `backoffice-01-fund-allocation.jpg`
- `backoffice-02-sales-interaction.jpg`
- `backoffice-03-client-management.jpg`
- `backoffice-04-agent-management.jpg`
- `backoffice-05-phone-tracking.jpg`
- `backoffice-06-client-settlement.jpg`
- `backoffice-07-todo-list.jpg`

---

## Tech Stack

- **Framework:** Next.js 16.1.6 (Turbopack)
- **Database:** PostgreSQL + Prisma 7
- **Auth:** NextAuth.js
- **UI:** Tailwind + shadcn/ui
- **Theme:** Dark slate with emerald accents

---

## Implementation Status

| Component | Status |
|-----------|--------|
| Auth + RBAC | ✅ Done |
| Agent portal layout | ✅ Done |
| Backoffice portal layout | ✅ Done |
| Client intake flow | 🔄 In Progress |
| Platform tracking | ⏳ Planned |
| Transaction system | ⏳ Planned |
| Settlement | ⏳ Planned |
| Commission engine | ⏳ Planned (V1) |
| Profit sharing | ⏳ Planned (V1.1) |
| Gmail integration | 📋 Backlog (V2) |

---

## Interaction Documentation

Each page document (PAGES-*.md) includes:
1. **Route** — URL path
2. **Screenshot** — Reference image
3. **UI Elements** — All components on the page
4. **Interactions** — Each user action that triggers backend operations

### Interaction Format
```
#### X.Y Action Name
- **Type:** Backend operation | UI only | Navigation
- **UI:** Button/form description
- **Backend:** API endpoint + payload
- **Effects:** List of database/state changes
```

---

## Open Items

See [PRD_MERGED.md#14-open-questions](../PRD_MERGED.md) for pending decisions.
