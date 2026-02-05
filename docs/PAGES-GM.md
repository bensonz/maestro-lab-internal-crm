# GM Portal Pages (V1.1)

*Route prefix: `/gm`*
*Access: ADMIN role with GM flag*

> 📌 **Note:** GM portal is planned for V1.1. This document defines requirements.

---

## Overview

The General Manager has "god-mode" access:
- All backoffice pages with elevated permissions
- Profit sharing configuration
- Partner management
- Commission rule management
- Global reporting

---

## 1. Dashboard

**Route:** `/gm`

### Purpose
Executive overview — all KPIs, system health, profit summary.

### UI Elements
| Section | Elements |
|---------|----------|
| **System Health** | Active agents, Active clients, Pending tasks, Overdue count |
| **Financial Summary** | Total AUM, This month revenue, Pending settlements |
| **Profit Summary** | Company share, Partner shares (by partner) |
| **Alerts** | Critical items requiring GM attention |
| **Quick Links** | All backoffice pages |

### Interactions

*Dashboard is primarily informational with navigation.*

---

## 2. Profit Sharing

**Route:** `/gm/profit-sharing`

### Purpose
Configure profit sharing rules and view current assignments.

### UI Elements
| Section | Elements |
|---------|----------|
| **Active Rules** | List of profit share rules with name, fee structure, split ratio |
| **Rule Builder** | Form to create/edit rules |
| **Assignment Overview** | Clients assigned to each rule |

### Interactions

#### 2.1 Create Rule
- **Type:** Backend operation
- **UI:** "+ New Rule" → modal form
- **Fields:**
  - Name
  - Fee configuration (add multiple fees: type, amount)
  - Order of operations: "Fees first" or "Split first"
  - Split ratio (Company %, Partner %)
- **Backend:**
  ```
  POST /api/gm/profit-share-rules
  Body: {
    name: string,
    feeConfig: { fees: [{ type: string, amount: number }], order: 'fees_first' | 'split_first' },
    splitRatio: { company: number, partner: number }
  }
  ```
- **Effects:**
  1. Create `ProfitShareRule` record
  2. Available for assignment

#### 2.2 Edit Rule
- **Type:** Backend operation
- **UI:** Edit button on rule row
- **Backend:**
  ```
  PATCH /api/gm/profit-share-rules/[id]
  Body: { ...updates }
  ```
- **Effects:**
  1. Update rule
  2. Does NOT retroactively change existing `ProfitShareDetail` records

#### 2.3 Delete Rule
- **Type:** Backend operation
- **Preconditions:** Rule not assigned to any active clients
- **Backend:**
  ```
  DELETE /api/gm/profit-share-rules/[id]
  ```

#### 2.4 View Rule Usage
- **Type:** UI modal
- **Action:** Click rule → show list of clients/partners using this rule
- **Backend:** `GET /api/gm/profit-share-rules/[id]/usage`

---

## 3. Partners

**Route:** `/gm/partners`

### Purpose
Manage external partners (traders) and their profit sharing assignments.

### UI Elements
| Section | Elements |
|---------|----------|
| **Partner List** | Name, default rule, active status, total clients, total share |
| **Partner Detail** | Profile, assigned clients, earnings history |
| **Assignment Manager** | Bulk assign clients to partners |

### Interactions

#### 3.1 Create Partner
- **Type:** Backend operation
- **UI:** "+ New Partner" → modal
- **Fields:** Name, Contact info, Default profit share rule
- **Backend:**
  ```
  POST /api/gm/partners
  Body: {
    name: string,
    contactEmail?: string,
    contactPhone?: string,
    profitShareRuleId: string
  }
  ```
- **Effects:**
  1. Create `Partner` record
  2. Available for client assignment

#### 3.2 Edit Partner
- **Type:** Backend operation
- **Backend:**
  ```
  PATCH /api/gm/partners/[id]
  Body: { name?, profitShareRuleId?, isActive? }
  ```

#### 3.3 Deactivate Partner
- **Type:** Backend operation
- **UI:** Toggle in row
- **Backend:**
  ```
  PATCH /api/gm/partners/[id]
  Body: { isActive: false }
  ```
- **Effects:**
  1. Partner won't receive new assignments
  2. Existing assignments continue

#### 3.4 Assign Client to Partner
- **Type:** Backend operation
- **UI:** Assignment modal (select client, select platforms, select partner)
- **Backend:**
  ```
  POST /api/gm/partner-assignments
  Body: {
    clientId: string,
    platformId?: string,  // null = all platforms
    partnerId: string,
    ruleOverride?: string  // optional rule override
  }
  ```
- **Effects:**
  1. Create `CustomerPartnerAssignment` record
  2. Future transactions for this client-platform will use this partner's rules

#### 3.5 View Partner Earnings
- **Type:** Backend fetch
- **UI:** Click partner → earnings tab
- **Backend:**
  ```
  GET /api/gm/partners/[id]/earnings?from=DATE&to=DATE
  Response: {
    total: number,
    byClient: [...],
    byPlatform: [...],
    transactions: [...]
  }
  ```

---

## 4. Reports

**Route:** `/gm/reports`

### Purpose
Global reporting and audit logs.

### UI Elements
| Section | Elements |
|---------|----------|
| **Report Types** | Partner Profit, Agent Commission, Client Lifetime Value, Transaction Volume |
| **Date Range** | From/To date pickers |
| **Filters** | Partner, Agent, Platform |
| **Export** | CSV, PDF buttons |
| **Audit Log** | All system events with actor, timestamp, details |

### Report Types

#### Partner Profit Report
Shows per-partner:
- Gross revenue
- Fees deducted (by type)
- Net after fees
- Partner share
- Company share

#### Agent Commission Report
Shows per-agent:
- Direct commissions earned
- Override commissions earned
- Total earned
- Payout status

#### Client Lifetime Value
Shows per-client:
- Total deposits
- Total withdrawals
- Net profit
- Bonuses paid
- Platform breakdown

#### Transaction Volume
Shows:
- Daily/weekly/monthly transaction counts
- By type (internal, external, deposit, withdrawal)
- By platform

### Interactions

#### 4.1 Generate Report
- **Type:** Backend operation
- **UI:** Select report type, date range, filters → "Generate"
- **Backend:**
  ```
  GET /api/gm/reports/[type]?from=DATE&to=DATE&partner=X&agent=Y
  ```

#### 4.2 Export Report
- **Type:** Backend operation
- **UI:** Export button
- **Backend:**
  ```
  GET /api/gm/reports/[type]/export?format=csv|pdf&...filters
  ```
- **Effects:** Download file

#### 4.3 View Audit Log
- **Type:** Backend fetch with pagination
- **Backend:**
  ```
  GET /api/gm/audit-log?from=DATE&to=DATE&actor=X&eventType=Y&limit=50&offset=0
  ```

---

## 5. Commissions

**Route:** `/gm/commissions`

### Purpose
Configure agent commission rules.

### UI Elements
| Section | Elements |
|---------|----------|
| **Direct Commission Rules** | Per client acquisition rates by agent tier |
| **Override Commission Rules** | Hierarchy-based override percentages |
| **Simulation** | Test commission calculation |

### Commission Rule Types

#### Direct Commission
| Tier | Rate |
|------|------|
| 1★ | $200/client |
| 2★ | $250/client |
| 3★ | $300/client |
| 4★ | $350/client |

#### Override Commission (Example)
| Depth | Rate |
|-------|------|
| L+1 (direct report) | 10% of direct's commission |
| L+2 | 5% of direct's commission |
| L+3 | 2% of direct's commission |

### Interactions

#### 5.1 Update Direct Commission Rate
- **Type:** Backend operation
- **UI:** Edit rate per tier
- **Backend:**
  ```
  PATCH /api/gm/commission-rules/direct
  Body: {
    rules: [
      { tier: '1★', amount: 200 },
      { tier: '2★', amount: 250 },
      ...
    ]
  }
  ```
- **Effects:**
  1. Update `CommissionRule` records
  2. Applies to future client approvals only

#### 5.2 Update Override Commission Rate
- **Type:** Backend operation
- **UI:** Edit override percentages
- **Backend:**
  ```
  PATCH /api/gm/commission-rules/override
  Body: {
    rules: [
      { depth: 1, percentage: 10 },
      { depth: 2, percentage: 5 },
      { depth: 3, percentage: 2 }
    ]
  }
  ```

#### 5.3 Simulate Commission
- **Type:** Backend calculation (no persistence)
- **UI:** Select agent, enter scenario → show calculated amounts
- **Backend:**
  ```
  POST /api/gm/commission-rules/simulate
  Body: {
    agentId: string,
    scenario: 'new_client' | 'subordinate_client',
    subordinateId?: string
  }
  Response: {
    directCommission: number,
    overrideCommission: number,
    breakdown: [...]
  }
  ```

---

## Access Control

GM has access to all backoffice pages plus:
- `/gm/*` routes
- Elevated permissions on backoffice actions:
  - Can edit/delete most records
  - Can override restrictions
  - Can view all data (no isolation)

---

*Last updated: 2026-02-05*
