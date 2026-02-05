# Backoffice Portal Pages

*Route prefix: `/backoffice`*
*Access: BACKOFFICE, ADMIN roles*

> 📖 **Reference:** See [PRD.md](../PRD.md) for state machines, to-do generation rules, and EventLog requirements.

---

## 1. Dashboard (Overview)

**Route:** `/backoffice`
**Screenshot:** *(not captured)*

### Purpose
Operations command center — queue status, alerts, quick actions.

### UI Elements
| Element | Type | Description |
|---------|------|-------------|
| Queue stats | Cards | Pending review, In execution, Overdue, Ready to approve |
| Alerts | List | Critical items needing attention |
| Quick actions | Buttons | New Phone, View All To-Dos |
| Recent activity | Feed | Latest system events |

### Interactions

*Dashboard is primarily informational with navigation links.*

---

## 2. Sales Interaction

**Route:** `/backoffice/sales-interaction`
**Screenshot:** `backoffice-02-sales-interaction.jpg`

### Purpose
Central hub for client intake — review applications, issue phones, manage verification queue.

### UI Elements
| Section | Elements |
|---------|----------|
| **Header stats** | Clients: 156, Agents: 11, Active Apps: 10, Pending: 4 |
| **Team Directory** | Hierarchical agent list (MD → SE → ED → Agents by tier) with client counts |
| **New Client Intake** | Queue of pending clients with status, assigned agent, days elapsed |
| **Active Client Verification** | Platform-specific verification tasks |

### Team Directory Hierarchy
- Managing Director (MD)
- Senior Executive (SE)
- Executive Director (ED)
- 4★ Agents, 3★ Agents, 2★ Agents, 1★ Agents

### New Client Intake Statuses
- `Needs More Info` (orange)
- `Pending EdgeBoost` (gray)
- `Ready to Approve` (green)
- `Follow-up` (blue)

### Interactions

#### 2.1 Click Agent in Directory
- **Type:** UI filter
- **Action:** Filter intake queue to show only that agent's clients
- **Backend:** None

#### 2.2 Click Client Row (New Client Intake)
- **Type:** Navigation/Modal
- **Action:** Open client detail drawer
- **Backend:** `GET /api/admin/clients/[id]` (fetch full details)

#### 2.3 Approve Client
- **Type:** Backend operation
- **UI:** "Approve" button on client row or detail drawer
- **Preconditions:** 
  - Client status is `READY_FOR_APPROVAL`
  - All 11 platforms must be `VERIFIED`
- **Backend:**
  ```
  POST /api/admin/clients/[id]/approve
  ```
- **Effects:**
  1. Update `Client.intakeStatus` → `APPROVED`
  2. Create `EventLog` entry (type: `APPROVAL`)
  3. Update `AgentMetrics` (increment `approvedClients`, recalc `successRate`)
  4. Create commission `Earning` record for agent (per `CommissionRule`)
  5. Create override `Earning` records for agent's supervisors (per hierarchy)
  6. Complete `FINAL_APPROVAL` to-do
  7. Remove from intake queue, add to Client Management
- **No Silent Failure:** If any step fails, roll back and show error

#### 2.4 Request More Info
- **Type:** Backend operation
- **UI:** Button → modal with reason/instructions input
- **Backend:**
  ```
  POST /api/admin/clients/[id]/request-info
  Body: { reason: string, platformId?: string }
  ```
- **Effects:**
  1. Update `Client.intakeStatus` → `NEEDS_MORE_INFO`
  2. Create `ToDo` for agent (type: `PROVIDE_INFO`)
  3. Create `EventLog` entry
  4. If platform-specific: Update `ClientPlatform.status` → `NEEDS_MORE_INFO`

#### 2.5 Issue Phone
- **Type:** Backend operation
- **UI:** Button → modal to select phone number
- **Preconditions:** Client status is `PENDING`
- **Backend:**
  ```
  POST /api/admin/clients/[id]/issue-phone
  Body: { phoneNumber: string, deviceId?: string }
  ```
- **Effects:**
  1. Update `Client.intakeStatus` → `PHONE_ISSUED` → auto-transition to `IN_EXECUTION`
  2. Create/update `PhoneAssignment` record
  3. Set `Client.executionDeadline` = now + 3 days
  4. Create 11× `ToDo` items for agent (type: `PLATFORM_UPLOAD`, due: 3 days)
  5. Create `EventLog` entry (type: `PHONE_ISSUED`)
  6. Create `EventLog` entry (type: `STATUS_CHANGE`, PHONE_ISSUED → IN_EXECUTION)
- **Deadline Tracking:** System will auto-check deadline and trigger `DEADLINE_MISSED` events

#### 2.6 Verify Platform (Active Client Verification)
- **Type:** Backend operation
- **UI:** Eye icon on verification row → opens review modal
- **Preconditions:** Platform status is `PENDING_REVIEW`
- **Backend:**
  ```
  PATCH /api/admin/clients/[clientId]/platforms/[platformId]
  Body: { status: 'VERIFIED', reviewNotes?: string }
  ```
- **Effects:**
  1. Update `ClientPlatform.status` → `VERIFIED`
  2. Set `reviewedBy`, `reviewedAt`
  3. Create `EventLog` entry (type: `PLATFORM_STATUS_CHANGE`, old: PENDING_REVIEW, new: VERIFIED)
  4. Complete `PLATFORM_REVIEW` to-do
  5. **Check all platforms:** If all 11 are `VERIFIED`:
     - Update `Client.intakeStatus` → `READY_FOR_APPROVAL`
     - Create `ToDo` for backoffice (type: `FINAL_APPROVAL`, due: 1 day)
     - Create `EventLog` entry (type: `STATUS_CHANGE`)

#### 2.7 Reject Platform
- **Type:** Backend operation
- **UI:** Reject option in review modal
- **Backend:**
  ```
  PATCH /api/admin/clients/[clientId]/platforms/[platformId]
  Body: { status: 'REJECTED', reviewNotes: string }
  ```
- **Effects:**
  1. Update `ClientPlatform.status` → `REJECTED`
  2. Create `EventLog` entry (type: `PLATFORM_STATUS_CHANGE`)
  3. Complete `PLATFORM_REVIEW` to-do
  4. **Block approval:** Client cannot reach `READY_FOR_APPROVAL` with any rejected platform
  5. Create `ToDo` for backoffice (type: `REJECTION_DECISION`) to handle manually

#### 2.8 Approve Extension Request
- **Type:** Backend operation
- **UI:** Action in to-do or client detail
- **Preconditions:** `EXTENSION_DECISION` to-do exists, `extensionCount < 2`
- **Backend:**
  ```
  POST /api/admin/clients/[id]/approve-extension
  ```
- **Effects:**
  1. Set `Client.executionDeadline` = now + 3 days
  2. Increment `Client.deadlineExtensions`
  3. Create `EventLog` entry (type: `DEADLINE_EXTENDED`)
  4. Complete `EXTENSION_DECISION` to-do
  5. Reset agent's overdue platform to-dos to new deadline

#### 2.9 Handle Deadline Miss
- **Type:** System-triggered + manual resolution
- **UI:** Alert in dashboard, to-do in queue
- **Trigger:** System detects `executionDeadline` passed with incomplete platforms
- **Auto Effects:**
  1. Increment `AgentMetrics.delayCount`
  2. Create `EventLog` entry (type: `DEADLINE_MISSED`)
  3. If 1st miss: Create `DEADLINE_REVIEW` to-do for backoffice
  4. If 2nd miss: Update `Client.intakeStatus` → `EXECUTION_DELAYED`
- **Manual Resolution Options:**
  - Grant extension (see 2.8)
  - Contact agent
  - Reassign client
  - Reject application

#### 2.10 Handle EdgeBoost Pending
- **Type:** Manual verification
- **UI:** Platform shows `PENDING_EXTERNAL` status
- **Note:** System never auto-approves EdgeBoost
- **Backend:**
  ```
  PATCH /api/admin/clients/[clientId]/platforms/EDGEBOOST
  Body: { status: 'VERIFIED', externalId?: string }
  ```
- **Effects:** Same as 2.6 (Verify Platform)
- **Alert:** If pending > 7 days, system generates backoffice alert

---

## 3. Client Management

**Route:** `/backoffice/client-management`
**Screenshot:** `backoffice-03-client-management.jpg`

### Purpose
Manage approved/active clients — view balances, track lifecycle, initiate closure.

### UI Elements
| Element | Type | Description |
|---------|------|-------------|
| Stats cards | Display | Total: 156, Active: 89, Closed: 52, Further Verification: 15 |
| Platform filter | Dropdown | Filter by platform |
| Status filter | Dropdown | Filter by client status |
| Sort toggle | Button | Sort by Funds |
| Client list | Table | Name, Phone/Email, Start date, Funds total, Platform pills (with status colors) |

### Platform Pills Legend
- **DK** = DraftKings
- **FD** = FanDuel
- **MGM** = BetMGM
- **CZR** = Caesars
- **FAN** = Fanatics
- **BB** = Bally Bet
- **BR** = BetRivers
- **365** = Bet365
- **BNK** = Bank
- **PP** = PayPal
- **EB** = EdgeBoost

### Platform Status Colors
- 🟢 Green = Active/Verified
- 🟡 Yellow = Limited
- 🔴 Red = Needs attention
- ⚫ Gray = Not started/Inactive

### Interactions

#### 3.1 Click Client Row
- **Type:** Navigation
- **Action:** Navigate to `/backoffice/client-management/[id]`
- **Backend:** None

#### 3.2 Click Platform Pill
- **Type:** UI modal
- **Action:** Open platform quick-view modal (balance, status, recent transactions)
- **Backend:** `GET /api/admin/clients/[id]/platforms/[platformId]`

#### 3.3 Filters (Platform, Status)
- **Type:** UI + Backend
- **Action:** Server-side filtering for large datasets
- **Backend:** `GET /api/admin/clients?platform=X&status=Y`

---

## 4. Client Detail (Backoffice)

**Route:** `/backoffice/client-management/[id]`
**Screenshot:** *(not captured)*

### Purpose
Full client view with backoffice actions — transactions, closure workflow.

### UI Elements
| Section | Elements |
|---------|----------|
| **Header** | Client name, status, agent, total balance |
| **Platform Balances** | 11 cards showing balance per platform |
| **Transaction History** | All transactions for this client |
| **Documents** | Screenshots, closure proofs |
| **Timeline** | Full event history |
| **Actions** | Record Transaction, Initiate Closure |

### Interactions

#### 4.1 Record Transaction
- **Type:** Backend operation
- **UI:** Button → modal with transaction form
- **Fields:** Type, Subtype, Amount, From Platform, To Platform, Notes
- **Backend:**
  ```
  POST /api/admin/transactions
  Body: {
    type: 'INTERNAL' | 'EXTERNAL' | 'DEPOSIT' | 'WITHDRAWAL',
    subtype: string,
    amount: number,
    clientId: string,
    platformId?: string,
    fromClientId?: string,
    toClientId?: string,
    description?: string
  }
  ```
- **Effects:**
  1. Validate: Check sufficient balance for withdrawals/transfers
  2. Create `Transaction` record (append-only)
  3. Create `EventLog` entry
  4. Recalculate affected platform balances
  5. Refresh UI

#### 4.2 Initiate Closure
- **Type:** Backend operation
- **UI:** Button → confirmation with checklist
- **Preconditions:** User confirms they will check all platforms
- **Backend:**
  ```
  POST /api/admin/clients/[id]/initiate-closure
  ```
- **Effects:**
  1. Update `Client.intakeStatus` → `PENDING_CLOSURE`
  2. Create `ToDo` items for each platform (type: `CLOSURE_AUDIT`)
  3. Create `EventLog` entry

#### 4.3 Upload Closure Proof (per platform)
- **Type:** Backend operation
- **UI:** Upload button on platform card (only when `PENDING_CLOSURE`)
- **Backend:**
  ```
  POST /api/admin/clients/[id]/platforms/[platformId]/closure-proof
  Body: FormData { file, finalBalance: 0 }
  ```
- **Effects:**
  1. Upload screenshot
  2. Create `Document` (type: `CLOSURE_PROOF`)
  3. Update `ClientPlatform.lifecycleState` → `CLOSED`
  4. Complete related `ToDo`
  5. Check if all platforms closed → finalize client closure

#### 4.4 Finalize Closure
- **Type:** Backend operation (auto-triggered or manual)
- **Preconditions:** All 11 platforms have closure proof
- **Backend:**
  ```
  POST /api/admin/clients/[id]/finalize-closure
  ```
- **Effects:**
  1. Update `Client.intakeStatus` → `PARTNERSHIP_ENDED`
  2. Generate final settlement report
  3. Create `EventLog` entry
  4. Archive client (remove from active list)

#### 4.5 Update Platform Lifecycle
- **Type:** Backend operation
- **UI:** Dropdown on platform card
- **Backend:**
  ```
  PATCH /api/admin/clients/[id]/platforms/[platformId]/lifecycle
  Body: { lifecycleState: 'LIMITED' | 'VIP_INVITED' | etc. }
  ```
- **Effects:**
  1. Create `PlatformEvent` record
  2. Update `ClientPlatform.lifecycleState`
  3. Create `EventLog` entry

---

## 5. Agent Management

**Route:** `/backoffice/agent-management`
**Screenshot:** `backoffice-04-agent-management.jpg`

### Purpose
View and manage sales agents — performance, hierarchy, activity.

### UI Elements
| Element | Type | Description |
|---------|------|-------------|
| Stats cards | Display | Total Agents: 11, Initiated Apps: 78, New Clients (Month): 68 (+19%), Avg Days to Open: 12.5 |
| Tier filter | Tabs | All, MD, SE, ED, 4★, 3★, 2★, 1★ |
| Agent list | Table | Name, tier badge, phone, start date, clients, earned, month earnings, working days |

### Interactions

#### 5.1 Click Agent Row
- **Type:** Navigation/Modal
- **Action:** Open agent detail modal or navigate to detail page
- **Backend:** `GET /api/admin/agents/[id]`

#### 5.2 Filter by Tier
- **Type:** UI only
- **Action:** Client-side filtering
- **Backend:** None

#### 5.3 View Agent Detail (Modal)
- **Type:** Read-only display
- **Shows:** Full profile, hierarchy (supervisor + subordinates), performance history, recent activity
- **Backend:** None (data already fetched)

#### 5.4 Update Agent Tier (Future)
- **Type:** Backend operation
- **UI:** Edit button → tier dropdown
- **Backend:**
  ```
  PATCH /api/admin/agents/[id]
  Body: { tier: '4★' | '3★' | '2★' | '1★' }
  ```
- **Effects:**
  1. Update `Agent.tier`
  2. Create `EventLog` entry
  3. Recalculate commission rules

---

## 6. Fund Allocation

**Route:** `/backoffice/fund-allocation`
**Screenshot:** `backoffice-01-fund-allocation.jpg`

### Purpose
Record fund movements between platforms and clients.

### UI Elements
| Section | Elements |
|---------|----------|
| **Platform Balances** | Bank, PayPal, EdgeBoost totals + 8 sportsbook totals |
| **Today's Stats** | External (Today), Int. Deposits (Today), Int. Withdrawals (Today), Pending Review |
| **New Fund Allocation** | Form: Internal/External toggle, A→A/A→B toggle, Client, Amount, From/To Platform, Notes |
| **Fund Movements** | Recent transactions with filters (All/External/Internal, 1D/7D) |

### Platform Balance Display
Shows current totals:
- Bank: $-15,000 (negative = we owe)
- PayPal: $-20,000
- EdgeBoost: $0
- DraftKings: $15,000
- FanDuel: $0
- BetMGM: $0
- Caesars: $20,000
- Fanatics: $0
- Bally Bet: $0
- BetRivers: $0
- Bet365: $0

### Interactions

#### 6.1 Toggle Internal/External
- **Type:** UI only
- **Action:** Changes form fields
- **Backend:** None

#### 6.2 Toggle A→A / A→B
- **Type:** UI only
- **Action:** 
  - A→A: Same client, platform-to-platform
  - A→B: Different clients
- **Backend:** None

#### 6.3 Record Allocation (Submit)
- **Type:** Backend operation
- **UI:** "Record Allocation" button
- **Validation:**
  - Required: Client, Amount, From Platform, To Platform
  - Balance check: Source must have sufficient funds (for internal)
- **Backend:**
  ```
  POST /api/admin/fund-allocations
  Body: {
    type: 'INTERNAL' | 'EXTERNAL',
    subtype: 'CLIENT_TO_CLIENT' | 'PLATFORM_TO_PLATFORM' | 'AGENT_PAYOUT' | 'CUSTOMER_BONUS',
    clientId: string,
    toClientId?: string,  // for A→B
    fromPlatformId: string,
    toPlatformId: string,
    amount: number,
    notes?: string
  }
  ```
- **Effects:**
  1. **Validation:** Check non-negative balance rule
  2. Create `Transaction` record (append-only)
  3. Create `EventLog` entry
  4. Update platform balance display
  5. Add to Fund Movements list
  6. Clear form

#### 6.4 View All Details (Platform Balances)
- **Type:** Navigation
- **Action:** Navigate to detailed platform breakdown page
- **Backend:** None

#### 6.5 Click Fund Movement Row
- **Type:** UI modal
- **Action:** Show transaction detail (client, platforms, amount, who recorded, timestamp)
- **Backend:** None (already loaded)

#### 6.6 Filter Fund Movements
- **Type:** UI only
- **Action:** Filter by All/External/Internal and time range (1D/7D)
- **Backend:** None (client-side filter)

---

## 7. Client Settlement

**Route:** `/backoffice/client-settlement`
**Screenshot:** `backoffice-06-client-settlement.jpg`

### Purpose
View deposits, withdrawals, and platform breakdowns per client.

### UI Elements
| Element | Type | Description |
|---------|------|-------------|
| Client search | Input | Filter client list |
| Client list | Cards | Name, total deposits (+$X), total withdrawals (-$Y) |
| Settlement detail | Panel | Platform breakdown, transaction history (when client selected) |

### Interactions

#### 7.1 Search Clients
- **Type:** UI only
- **Action:** Filter client list
- **Backend:** None (or server-side if list is large)

#### 7.2 Select Client
- **Type:** Backend fetch
- **UI:** Click client card → load detail panel
- **Backend:**
  ```
  GET /api/admin/settlements/[clientId]
  Response: {
    client: {...},
    platformBreakdown: [
      { platform: 'DRAFTKINGS', deposits: X, withdrawals: Y, balance: Z },
      ...
    ],
    transactions: [...],
    totals: { deposits, withdrawals, net }
  }
  ```

#### 7.3 Export Settlement
- **Type:** Backend operation
- **UI:** Export button (CSV/PDF)
- **Backend:**
  ```
  GET /api/admin/settlements/[clientId]/export?format=csv
  ```
- **Effects:**
  1. Generate report
  2. Download file

---

## 8. Phone Tracking

**Route:** `/backoffice/phone-tracking`
**Screenshot:** `backoffice-05-phone-tracking.jpg`

### Purpose
Track company phone inventory and assignments.

### UI Elements
| Element | Type | Description |
|---------|------|-------------|
| Stats cards | Display | Total Issued: 8, Active: 5, Pending: 1, Suspended: 1 |
| Search | Input | Search by phone, client, ID |
| Status filter | Dropdown | All Status |
| Carrier filter | Dropdown | All Carriers |
| Phone list | Table | Phone Number, Client, Carrier, Issued Date, Issued By, Status, Notes |
| Export | Button | Export list |

### Phone Statuses
- 🟢 Active — Currently in use
- 🟡 Pending — Awaiting activation/assignment
- 🔴 Suspended — Temporarily disabled
- ⚫ Inactive — Returned/decommissioned

### Interactions

#### 8.1 Click Phone Row
- **Type:** UI modal
- **Action:** Show phone detail and history
- **Backend:** `GET /api/admin/phones/[id]/history`

#### 8.2 Add New Phone
- **Type:** Backend operation
- **UI:** "+ Add" button → modal form
- **Backend:**
  ```
  POST /api/admin/phones
  Body: { phoneNumber: string, carrier: string, deviceId?: string }
  ```
- **Effects:**
  1. Create `PhoneAssignment` record (unassigned)
  2. Show in list as "Pending"

#### 8.3 Update Phone Status
- **Type:** Backend operation
- **UI:** Status dropdown in row or detail modal
- **Backend:**
  ```
  PATCH /api/admin/phones/[id]
  Body: { status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE' }
  ```
- **Effects:**
  1. Update `PhoneAssignment.status`
  2. Create `EventLog` entry
  3. If suspending: May trigger client status change

#### 8.4 Return Phone
- **Type:** Backend operation
- **UI:** "Return" action in row
- **Backend:**
  ```
  POST /api/admin/phones/[id]/return
  ```
- **Effects:**
  1. Set `PhoneAssignment.returnedAt`
  2. Clear `clientId` association
  3. Update status → `INACTIVE`
  4. Create `EventLog` entry
  5. Update related client's phone status

#### 8.5 Export
- **Type:** Backend operation
- **UI:** Export button
- **Backend:** `GET /api/admin/phones/export?format=csv`

---

## 9. To-Do List

**Route:** `/backoffice/todo-list`
**Screenshot:** `backoffice-07-todo-list.jpg`

### Purpose
Global task view across all agents and clients.

### UI Elements
| Element | Type | Description |
|---------|------|-------------|
| Stats cards | Display | Today's Tasks: 6, 3-Day Tasks: 9, 7-Day Tasks: 10, Overdue: 1 |
| Category tabs | Tabs | All Tasks, Transaction (3), Sales Interaction (4), Manager Assigned (2), Other (1) |
| Search | Input | Search tasks, clients, agents |
| Task groups | Accordions | Grouped by agent with task count |
| Task items | List | Task title, client name, time remaining/overdue |

### Task Time Display
- Green: > 24h remaining
- Yellow: < 24h remaining
- Red: Overdue

### Interactions

#### 9.1 Click Task
- **Type:** UI modal
- **Action:** Open task detail with client context and action buttons
- **Backend:** None

#### 9.2 Complete Task
- **Type:** Backend operation
- **UI:** Checkbox or "Complete" button
- **Backend:**
  ```
  PATCH /api/admin/todos/[id]
  Body: { status: 'COMPLETED' }
  ```
- **Effects:**
  1. Update `ToDo.status`
  2. Set `completedAt`
  3. Create `EventLog` entry

#### 9.3 Reassign Task
- **Type:** Backend operation
- **UI:** Dropdown in task detail
- **Backend:**
  ```
  PATCH /api/admin/todos/[id]
  Body: { assignedToId: newAgentId }
  ```
- **Effects:**
  1. Update `ToDo.assignedToId`
  2. Create `EventLog` entry
  3. Notify new assignee

#### 9.4 Create Task
- **Type:** Backend operation
- **UI:** "+ Add Task" button → modal
- **Backend:**
  ```
  POST /api/admin/todos
  Body: {
    title: string,
    description?: string,
    type: ToDoType,
    assignedToId: string,
    clientId?: string,
    dueDate: Date,
    priority?: number
  }
  ```
- **Effects:**
  1. Create `ToDo` record
  2. Create `EventLog` entry
  3. Notify assignee

#### 9.5 Filter by Category
- **Type:** UI only
- **Action:** Tab switching
- **Backend:** None

#### 9.6 Expand/Collapse Agent Group
- **Type:** UI only
- **Action:** Accordion toggle
- **Backend:** None

---

*Last updated: 2026-02-05*
