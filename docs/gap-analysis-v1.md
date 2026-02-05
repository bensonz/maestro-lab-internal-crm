# Gap Analysis: PRD vs Supplementary Requirements

*2026-02-05*

---

## Summary

The supplementary requirements significantly expand the scope. Key additions:
1. **12-platform model** (was 4)
2. **Hierarchical agent commissions** (was undefined)
3. **Gmail API integration** (new)
4. **Profit sharing engine** (new)
5. **Customer closure workflow** (new)
6. **Screenshot-based verification** (expanded)

---

## 1. Platform Count — MAJOR EXPANSION

| PRD | Supplementary |
|-----|---------------|
| 4 platforms: Bank, PayPal, EdgeBoost, Sportsbook | **12 platforms**: 8 sports betting + 3 financial + 1 other |

**Impact:**
- Database schema needs `Platform` table with configurable list
- Customer balance tracking per platform × customer (potentially 12× more records)
- Platform registration workflow × 12
- Email monitoring × 12 platform types

**Action Required:**
- Define exact platform list
- Redesign `ClientPlatform` to be fully dynamic
- Add platform configuration admin UI

---

## 2. Agent Commission System — NEW DETAIL

| PRD | Supplementary |
|-----|---------------|
| "Commission calculation — Per client? Percentage? Formula?" (open question) | +300/customer + tiered override bonuses based on hierarchy level |

**Impact:**
- Need `AgentHierarchy` table (tree structure)
- Commission calculation engine with:
  - Direct commission: flat per customer
  - Override commission: % or flat based on depth in tree
- Real-time earnings calculation

**Action Required:**
- Design hierarchy data model (adjacency list or nested set)
- Define commission rules table
- Build calculation service

---

## 3. Gmail API Integration — ENTIRELY NEW

| PRD | Supplementary |
|-----|---------------|
| *(Not mentioned)* | Full Gmail monitoring: keyword detection, VIP alerts, registration verification, withdrawal reconciliation |

**Impact:**
- New integration layer
- Email parsing service with keyword rules
- To-do generation from emails
- Platform status updates triggered by emails
- 24-hour follow-up task generation

**New Tables Needed:**
- `EmailRule` (keywords, actions)
- `EmailLog` (parsed emails, matched rules)
- Link to existing `ToDo` system

**Action Required:**
- Gmail API OAuth setup
- Email polling/webhook architecture
- Keyword matching engine
- Define all trigger → action mappings

---

## 4. Profit Sharing System — ENTIRELY NEW

| PRD | Supplementary |
|-----|---------------|
| *(Not mentioned)* | Complex partner (trader) profit sharing with configurable fees and split ratios |

**Impact:**
- New subsystem for General Manager
- Multiple fee types before split
- Per-partner, per-customer, per-platform rules
- Full audit trail of profit calculations

**New Tables Needed:**
- `Partner` (traders)
- `ProfitShareRule` (fee types, split ratios)
- `CustomerPartnerAssignment` (customer × platform → partner)
- `ProfitShareDetail` (transaction-level breakdown)

**Action Required:**
- Design flexible rule engine
- Build admin UI for rule configuration
- Settlement integration

---

## 5. Customer Lifecycle — EXPANDED

| PRD | Supplementary |
|-----|---------------|
| Simple: PENDING → APPROVED flow | 11-stage lifecycle per platform with VIP tracking, limitation tracking, closure workflow |

**New States:**
1. Successfully registered
2. Initial deposit
3. Second deposit
4. VIP invitation
5. Third deposit
6. Account limited
7. Further limitation
8. Platform verification required
9. Initial withdrawal
10. Second withdrawal
11. Closure audit

**Impact:**
- `ClientPlatform.status` needs richer enum or separate `PlatformLifecycleEvent` table
- Status changes triggered by:
  - Manual backoffice action
  - Email detection (Gmail API)
  - Financial transactions

**Action Required:**
- Redesign platform status model
- Event-driven status transitions
- Status history tracking

---

## 6. Customer Closure Process — NEW

| PRD | Supplementary |
|-----|---------------|
| *(Not mentioned)* | Full audit workflow: check 12 platforms, withdraw remaining, screenshot proof, formal closure |

**Impact:**
- New workflow state machine
- Screenshot upload requirement
- Balance verification step
- "End partnership" trigger

**Action Required:**
- Design closure workflow
- Add to To-Do generation
- Screenshot storage for closure proof

---

## 7. Screenshot Storage — EXPANDED

| PRD | Supplementary |
|-----|---------------|
| Documents table exists | Two types: (1) Agent login verification, (2) Backoffice closure audit |

**Impact:**
- `Document.type` needs:
  - `LOGIN_VERIFICATION` (agent uploads)
  - `CLOSURE_PROOF` (backoffice uploads)
- Associate with specific platform records

**Action Required:**
- Extend document types
- Link documents to `ClientPlatform` records

---

## 8. Internal Transfers — NEW DETAIL

| PRD | Supplementary |
|-----|---------------|
| FundAllocation, Transaction tables | Two internal transfer types: (1) Client A → Client B, (2) Client A Platform X → Platform Y |

**Impact:**
- Transaction types need:
  - `INTERNAL_CLIENT_TRANSFER`
  - `INTERNAL_PLATFORM_TRANSFER`
  - `EXTERNAL_AGENT_PAYOUT`
  - `EXTERNAL_CUSTOMER_BONUS`
- Balance calculation must handle all types

**Action Required:**
- Extend transaction type enum
- Ensure balance calculation handles cross-client transfers

---

## 9. Balance Display — CLARIFIED

| PRD | Supplementary |
|-----|---------------|
| Settlement with platform breakdown | Real-time calculated balance per platform on customer detail page |

**Impact:**
- Customer detail page needs prominent balance display
- Balance = sum of all transactions per platform
- Not audited until closure

**Action Required:**
- Add balance calculation service
- Customer detail UI redesign

---

## 10. Existing PRD Open Questions — NOW Answered

| Question | Answer from Supplementary |
|----------|---------------------------|
| EdgeBoost — what is it? | One of 8 sports platforms |
| Sportsbooks — one or multiple? | **8** sports betting platforms |
| Commission calculation? | +300/customer + hierarchical overrides |
| Transaction source? | Manual entry + Gmail cross-reference |

---

## Priority Ranking

### Critical (Blocks MVP)
1. 12-platform model (schema redesign)
2. Agent hierarchy + commission engine
3. Expanded customer lifecycle states

### High (V1 Required)
4. Gmail API integration
5. Profit sharing system
6. Customer closure workflow

### Medium (V1.1)
7. VIP detection automation
8. 24-hour follow-up generation
9. Advanced reporting for GM

---

## Schema Changes Required

### New Tables
- `Platform` (configurable platform list)
- `AgentHierarchy` (or use adjacency list in `Agent`)
- `CommissionRule`
- `Partner`
- `ProfitShareRule`
- `CustomerPartnerAssignment`
- `ProfitShareDetail`
- `EmailRule`
- `EmailLog`
- `PlatformLifecycleEvent`

### Modified Tables
- `ClientPlatform` — add lifecycle state, link to platform table
- `Transaction` — add transfer subtypes
- `Document` — add closure proof type
- `Agent` — add supervisor_id for hierarchy

---

## Next Steps

1. **Clarify platform list** — Get exact 12 platform names
2. **Design hierarchy model** — Choose adjacency list vs nested set
3. **Gmail API spike** — Test OAuth + parsing feasibility
4. **Profit sharing rules** — Get concrete examples from stakeholder
5. **Update PRD_MERGED.md** — Incorporate supplementary requirements

---

*This analysis should be reviewed with stakeholder before implementation.*
