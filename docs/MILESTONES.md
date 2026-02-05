# Milestones & Roadmap

*Updated: 2026-02-05*

---

## Overview

| Phase | Target | Focus | Status |
|-------|--------|-------|--------|
| **MVP** | Week 1-2 | Core intake + platform tracking | 🔄 In Progress |
| **V1** | Week 3-4 | Transactions + settlements + hierarchy | ⏳ Planned |
| **V1.1** | Week 5-6 | Profit sharing + commissions | ⏳ Planned |
| **V2** | Future | Gmail integration + automation | 📋 Backlog |

---

## MVP (Days 1-12)

### Goals
1. Agent can submit clients and upload platform screenshots
2. Backoffice can review, approve, issue phones
3. 11-platform registration tracking
4. To-Do system with state-driven generation
5. Client moves to "approved" status

### Deliverables

#### Phase 1: Foundation (Days 1-2)
- [x] Database schema (Prisma + PostgreSQL)
- [x] NextAuth authentication
- [x] RBAC middleware
- [x] Agent portal layout (`/`)
- [x] Backoffice portal layout (`/backoffice`)
- [x] Login page

#### Phase 2: Core Intake (Days 3-6)
- [ ] New client submission form
- [ ] 11-platform registration cards
- [ ] Screenshot upload per platform
- [ ] Sales interaction review queue
- [ ] Platform verification workflow
- [ ] To-Do auto-generation

#### Phase 3: Exceptions (Days 7-8)
- [ ] 3-day deadline countdown
- [ ] Extension request/approval
- [ ] EXECUTION_DELAYED state
- [ ] Phone tracking (issue/return)
- [ ] Agent metrics (KPIs)

#### Phase 4: Basic Finance (Days 9-10)
- [ ] Fund allocation entry (append-only)
- [ ] Agent earnings view (read-only)
- [ ] Basic settlement view

#### Phase 5: Polish (Days 11-12)
- [ ] Dashboard stats (real data)
- [ ] Event timeline in client detail
- [ ] CSV export
- [ ] Deploy to Vercel

---

## V1 (Days 13-20)

### Goals
1. Full transaction system with all types
2. Real-time balance per platform
3. Agent hierarchy with supervisor relationships
4. Direct commission calculation
5. Client closure workflow

### Deliverables

#### Transaction System
- [ ] Transaction types: INTERNAL, EXTERNAL, DEPOSIT, WITHDRAWAL, ADJUSTMENT
- [ ] Transaction subtypes per type
- [ ] Append-only enforcement
- [ ] Balance calculation service

#### Agent Hierarchy
- [ ] `supervisor_id` on Agent model
- [ ] Team hierarchy view (`/agent/team`)
- [ ] Subordinate performance rollup

#### Commission System
- [ ] `CommissionRule` model
- [ ] Direct commission: +$X per approved client
- [ ] Commission payout tracking

#### Client Closure
- [ ] Closure workflow trigger
- [ ] Balance verification step
- [ ] Screenshot proof upload (`CLOSURE_PROOF`)
- [ ] `PARTNERSHIP_ENDED` status

#### Settlement Enhancement
- [ ] Platform breakdown per client
- [ ] Settlement confirmation workflow
- [ ] Detailed export (CSV/PDF)

---

## V1.1 (Days 21-30)

### Goals
1. Override commissions (hierarchy-based)
2. Profit sharing with partners
3. GM portal with god-mode access
4. Advanced reporting

### Deliverables

#### Override Commission
- [ ] Commission tiers based on hierarchy depth
- [ ] Rollup calculation when subordinate closes client
- [ ] Commission rule configuration UI

#### Profit Sharing System
- [ ] `Partner` model (traders)
- [ ] `ProfitShareRule` model (fees, splits)
- [ ] `CustomerPartnerAssignment` model
- [ ] `ProfitShareDetail` model (transaction-level)
- [ ] Partner management UI (`/gm/partners`)
- [ ] Rule configuration UI (`/gm/profit-sharing`)

#### GM Portal
- [ ] `/gm/dashboard` — god-mode overview
- [ ] `/gm/reports` — global reports
- [ ] `/gm/settlements` — all settlements
- [ ] `/gm/commissions` — rule config

#### Reporting
- [ ] Partner profit reports
- [ ] Agent commission reports
- [ ] Client lifetime value
- [ ] PDF export

---

## V2 (Future)

### Goals
1. Gmail API integration
2. Automated keyword detection
3. VIP status auto-updates
4. To-Do auto-generation from emails

### Deliverables

#### Gmail Integration
- [ ] OAuth setup with company Gmail
- [ ] Email polling service
- [ ] Keyword matching engine
- [ ] `EmailRule` and `EmailLog` models

#### Automation
- [ ] Welcome email → confirm registration
- [ ] VIP email → update platform status
- [ ] Withdrawal email → 24h follow-up To-Do
- [ ] Deposit email → reconciliation

---

## Schema Evolution

### MVP Schema (Current)
See `prisma/schema.prisma`

### V1 Additions
```prisma
// Agent hierarchy
model User {
  supervisorId  String?
  supervisor    User?   @relation("AgentHierarchy", fields: [supervisorId], references: [id])
  subordinates  User[]  @relation("AgentHierarchy")
}

// Transactions
model Transaction {
  id            String   @id @default(cuid())
  type          TransactionType
  subtype       TransactionSubtype
  amount        Decimal  @db.Decimal(12, 2)
  currency      String   @default("USD")
  clientId      String?
  platformId    String?
  fromClientId  String?
  toClientId    String?
  description   String?
  createdById   String
  createdAt     DateTime @default(now())
  // NO updatedAt — append-only
}

// Platform lifecycle
model PlatformEvent {
  id              String   @id @default(cuid())
  clientPlatformId String
  eventType       PlatformLifecycleEvent
  metadata        Json?
  createdAt       DateTime @default(now())
}
```

### V1.1 Additions
```prisma
model Partner {
  id              String   @id @default(cuid())
  name            String
  profitShareRuleId String?
  isActive        Boolean  @default(true)
}

model ProfitShareRule {
  id              String   @id @default(cuid())
  name            String
  feeConfig       Json     // { fees: [{type, amount}], order: "fees_first"|"split_first" }
  splitRatio      Json     // { company: 50, partner: 50 }
}

model CustomerPartnerAssignment {
  id              String   @id @default(cuid())
  clientId        String
  platformId      String?  // null = all platforms
  partnerId       String
  ruleOverride    String?  // override default rule
}

model ProfitShareDetail {
  id              String   @id @default(cuid())
  transactionId   String
  partnerId       String
  gross           Decimal
  fees            Json     // breakdown of deducted fees
  net             Decimal
  partnerShare    Decimal
  createdAt       DateTime @default(now())
}
```

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Platform count change (12th platform) | Schema update | Platform table is dynamic, easy to add |
| Commission rules complexity | Calculation bugs | Extensive unit tests |
| Gmail API rate limits | Missing emails | Batch processing, retry queue |
| Multi-currency | Balance calculation | V1 assumes USD only, flag for later |

---

*Last updated: 2026-02-05*
