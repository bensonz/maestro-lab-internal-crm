# UI Pages Reference

*Updated: 2026-02-05*

---

## Overview

| Portal | Route Prefix | Role Access | Page Count |
|--------|--------------|-------------|------------|
| Agent | `/` | AGENT | 7 |
| Backoffice | `/backoffice` | BACKOFFICE, ADMIN | 8 |
| GM | `/gm` | ADMIN (GM) | 5 |
| Auth | `/login` | Public | 1 |

**Total Pages:** 21

---

## Agent Portal (`/`)

### 1. Dashboard
- **Route:** `/`
- **Screenshot:** `agent-00-dashboard.jpg`
- **Purpose:** Agent's home — KPIs, to-dos, quick actions
- **See:** [PAGES-AGENT.md#dashboard](./PAGES-AGENT.md#1-dashboard)

### 2. My Clients
- **Route:** `/clients`
- **Screenshot:** `agent-02-my-clients.jpg`
- **Purpose:** List of agent's own clients with status filters
- **See:** [PAGES-AGENT.md#my-clients](./PAGES-AGENT.md#2-my-clients)

### 3. Client Detail
- **Route:** `/clients/[id]`
- **Screenshot:** *(none)*
- **Purpose:** Full client view — profile, platforms, balances, timeline
- **See:** [PAGES-AGENT.md#client-detail](./PAGES-AGENT.md#3-client-detail)

### 4. New Client
- **Route:** `/new-client`
- **Screenshot:** `agent-03-new-client.jpg`
- **Purpose:** Submit new client application
- **See:** [PAGES-AGENT.md#new-client](./PAGES-AGENT.md#4-new-client)

### 5. Earnings
- **Route:** `/earnings`
- **Screenshot:** `agent-01-earnings.jpg`
- **Purpose:** View commissions and payouts (read-only)
- **See:** [PAGES-AGENT.md#earnings](./PAGES-AGENT.md#5-earnings)

### 6. To-Do List
- **Route:** `/todo-list`
- **Screenshot:** *(similar to backoffice-07)*
- **Purpose:** Agent's assigned tasks
- **See:** [PAGES-AGENT.md#todo-list](./PAGES-AGENT.md#6-todo-list)

### 7. Settings
- **Route:** `/settings`
- **Screenshot:** *(none)*
- **Purpose:** Profile and notification preferences
- **See:** [PAGES-AGENT.md#settings](./PAGES-AGENT.md#7-settings)

---

## Backoffice Portal (`/backoffice`)

### 1. Dashboard
- **Route:** `/backoffice`
- **Screenshot:** *(none)*
- **Purpose:** Operations overview — queue counts, alerts, quick actions
- **See:** [PAGES-BACKOFFICE.md#dashboard](./PAGES-BACKOFFICE.md#1-dashboard)

### 2. Sales Interaction
- **Route:** `/backoffice/sales-interaction`
- **Screenshot:** `backoffice-02-sales-interaction.jpg`
- **Purpose:** Client intake queue — review, issue phone, approve
- **See:** [PAGES-BACKOFFICE.md#sales-interaction](./PAGES-BACKOFFICE.md#2-sales-interaction)

### 3. Client Management
- **Route:** `/backoffice/client-management`
- **Screenshot:** `backoffice-03-client-management.jpg`
- **Purpose:** Approved clients — balances, lifecycle, closure
- **See:** [PAGES-BACKOFFICE.md#client-management](./PAGES-BACKOFFICE.md#3-client-management)

### 4. Client Detail (Backoffice)
- **Route:** `/backoffice/client-management/[id]`
- **Screenshot:** *(none)*
- **Purpose:** Full client view with backoffice actions
- **See:** [PAGES-BACKOFFICE.md#client-detail](./PAGES-BACKOFFICE.md#4-client-detail)

### 5. Agent Management
- **Route:** `/backoffice/agent-management`
- **Screenshot:** `backoffice-04-agent-management.jpg`
- **Purpose:** Agent list, hierarchy, performance metrics
- **See:** [PAGES-BACKOFFICE.md#agent-management](./PAGES-BACKOFFICE.md#5-agent-management)

### 6. Fund Allocation
- **Route:** `/backoffice/fund-allocation`
- **Screenshot:** `backoffice-01-fund-allocation.jpg`
- **Purpose:** Record fund movements (append-only)
- **See:** [PAGES-BACKOFFICE.md#fund-allocation](./PAGES-BACKOFFICE.md#6-fund-allocation)

### 7. Client Settlement
- **Route:** `/backoffice/client-settlement`
- **Screenshot:** `backoffice-06-client-settlement.jpg`
- **Purpose:** Settlement records, platform breakdown, export
- **See:** [PAGES-BACKOFFICE.md#client-settlement](./PAGES-BACKOFFICE.md#7-client-settlement)

### 8. Phone Tracking
- **Route:** `/backoffice/phone-tracking`
- **Screenshot:** `backoffice-05-phone-tracking.jpg`
- **Purpose:** Phone inventory, assignment history
- **See:** [PAGES-BACKOFFICE.md#phone-tracking](./PAGES-BACKOFFICE.md#8-phone-tracking)

### 9. To-Do List
- **Route:** `/backoffice/todo-list`
- **Screenshot:** `backoffice-07-todo-list.jpg`
- **Purpose:** Global task pool with filters
- **See:** [PAGES-BACKOFFICE.md#todo-list](./PAGES-BACKOFFICE.md#9-todo-list)

---

## GM Portal (`/gm`) — V1.1

### 1. Dashboard
- **Route:** `/gm`
- **Purpose:** God-mode overview — all KPIs, system health

### 2. Profit Sharing
- **Route:** `/gm/profit-sharing`
- **Purpose:** Configure profit share rules

### 3. Partners
- **Route:** `/gm/partners`
- **Purpose:** Manage external partners (traders)

### 4. Reports
- **Route:** `/gm/reports`
- **Purpose:** Global reports, audit logs, export

### 5. Commissions
- **Route:** `/gm/commissions`
- **Purpose:** Commission rule configuration

---

## Auth

### Login
- **Route:** `/login`
- **Purpose:** Authentication entry point

---

## Screenshot Reference

| File | Page |
|------|------|
| `agent-00-dashboard.jpg` | `/` |
| `agent-01-earnings.jpg` | `/earnings` |
| `agent-02-my-clients.jpg` | `/clients` |
| `agent-03-new-client.jpg` | `/new-client` |
| `backoffice-01-fund-allocation.jpg` | `/backoffice/fund-allocation` |
| `backoffice-02-sales-interaction.jpg` | `/backoffice/sales-interaction` |
| `backoffice-03-client-management.jpg` | `/backoffice/client-management` |
| `backoffice-04-agent-management.jpg` | `/backoffice/agent-management` |
| `backoffice-05-phone-tracking.jpg` | `/backoffice/phone-tracking` |
| `backoffice-06-client-settlement.jpg` | `/backoffice/client-settlement` |
| `backoffice-07-todo-list.jpg` | `/backoffice/todo-list` |

---

*See PAGES-AGENT.md and PAGES-BACKOFFICE.md for detailed interaction specs.*
