# Todo Rules Registry

All todo rules for the CRM. Most rules define a condition derived from existing DB state (computed at query time). Additionally, the `Todo` model stores explicit backoffice-assigned todos created via the Assign To-Do dialog.

## How to Add Rules

As you build/review each page, identify any state that should surface as a todo. Add it here with:

- **ID**: Unique rule identifier (e.g., `DEVICE_OVERDUE`)
- **Trigger**: DB query condition that produces the todo
- **Owner**: Who sees it — `agent`, `backoffice`, or `both`
- **Priority**: `urgent` (red), `warning` (amber), `info` (blue)
- **Message template**: What the todo says
- **Source page**: Where this rule was identified
- **Action**: What the user should do / where it links

---

## Rules

### DEVICE_ASSIGNED

| Field | Value |
|-------|-------|
| **Trigger** | Fires immediately when `assignAndSignOutDevice()` server action succeeds (event-driven, not computed) |
| **Owner** | `agent` |
| **Priority** | `urgent` |
| **Agent message** | "A device has been assigned for {clientName} — come pick it up. Due back in 3 days." |
| **Source page** | Sales Interaction (In Progress) |
| **Action (agent)** | Link to `/agent/new-client?draft={draftId}` (Step 3 unlocked) |
| **Notes** | This is a **push notification**, not a computed todo. Triggered by the `assignAndSignOutDevice` action. The agent needs to physically pick up the device from the office. Once picked up, they proceed with Step 3 platform registrations. Consider also logging a `DEVICE_ASSIGNED_NOTIFICATION` event in EventLog for audit trail. |

### DEVICE_OVERDUE

| Field | Value |
|-------|-------|
| **Trigger** | `PhoneAssignment` where `status = SIGNED_OUT` AND `dueBackAt < now()` |
| **Owner** | `both` |
| **Priority** | `urgent` |
| **Agent message** | "Device #{phoneNumber} is overdue — return it or contact your supervisor" |
| **Backoffice message** | "Device #{phoneNumber} overdue for {agentName} — follow up with agent" |
| **Source page** | Sales Interaction (In Progress) |
| **Action (agent)** | Link to `/agent/clients` or the active draft |
| **Action (backoffice)** | Link to Sales Interaction row or Agent Detail page |
| **Notes** | `dueBackAt` is set to 3 days after sign-out. OVERDUE is already computed at view time in the sales interaction page — this rule formalizes it as a todo. |

### DEVICE_PENDING_ASSIGN

| Field | Value |
|-------|-------|
| **Trigger** | `ClientDraft` where `deviceReservationDate IS NOT NULL` AND no `PhoneAssignment` exists for that draft (neither SIGNED_OUT nor RETURNED) |
| **Owner** | `backoffice` |
| **Priority** | `warning` |
| **Backoffice message** | "Device requested for {clientName} (agent: {agentName}) — assign a device so agent can proceed to Step 3" |
| **Source page** | Sales Interaction (In Progress, Step 2) |
| **Action** | Open Device Assign dialog on Sales Interaction page |
| **Notes** | Agent is blocked on Step 2 until backoffice assigns. The longer this sits, the more the agent's pipeline stalls. Shows as `canAssignPhone = true` in the UI. |

### DRAFT_STALE

| Field | Value |
|-------|-------|
| **Trigger** | `ClientDraft` where `status = DRAFT` AND `updatedAt < now() - 7 days` |
| **Owner** | `both` |
| **Priority** | `warning` (7-14 days), `urgent` (14+ days) |
| **Agent message** | "Draft for {clientName} hasn't been updated in {days} days — continue or delete it" |
| **Backoffice message** | "Draft for {clientName} by {agentName} stale for {days} days — follow up with agent" |
| **Source page** | Sales Interaction (In Progress, all steps) |
| **Action (agent)** | Link to `/agent/new-client?draft={draftId}` |
| **Action (backoffice)** | Link to Sales Interaction row or Agent Detail page |
| **Notes** | Threshold: 7 days no update. Escalates to urgent at 14 days. Uses `updatedAt` field. |

### STEP4_AWAITING_APPROVAL

| Field | Value |
|-------|-------|
| **Trigger** | `ClientDraft` where `status = SUBMITTED` AND linked `Client.status = PENDING` |
| **Owner** | `backoffice` |
| **Priority** | `warning` |
| **Backoffice message** | "Client {clientName} submitted by {agentName} — review and approve" |
| **Source page** | Sales Interaction (In Progress, Step 4) |
| **Action** | Open Review dialog → Approve Client |
| **Notes** | Shows as step-4 with `resultClientId` set. This is the primary backoffice workflow action. |

### STEP4_LONG_WAIT

| Field | Value |
|-------|-------|
| **Trigger** | `ClientDraft` where `status = SUBMITTED` AND linked `Client.status = PENDING` AND `updatedAt < now() - 3 days` |
| **Owner** | `both` |
| **Priority** | `urgent` |
| **Agent message** | "Your client {clientName} has been waiting for approval for {days} days" |
| **Backoffice message** | "Client {clientName} by {agentName} waiting {days} days for approval — escalate or approve" |
| **Source page** | Sales Interaction (In Progress, Step 4) |
| **Action (agent)** | Informational (agent can't approve, but should know status) |
| **Action (backoffice)** | Open Review dialog → Approve Client |
| **Notes** | Escalation of STEP4_AWAITING_APPROVAL. 3-day threshold since submission should trigger urgency. |

### VERIFICATION_TASK_PENDING

| Field | Value |
|-------|-------|
| **Trigger** | `VerificationTask` where `status = Pending` |
| **Owner** | `both` |
| **Priority** | `warning` |
| **Agent message** | "{task} needed for {clientName} on {platformLabel}" |
| **Backoffice message** | "{task} pending for {clientName} ({agentName}) on {platformLabel}" |
| **Source page** | Sales Interaction (Verification Needed) |
| **Action (agent)** | Link to client detail or upload page |
| **Action (backoffice)** | Open Document Review modal |
| **Notes** | Currently mock data. Will need a real VerificationTask model or derive from platform screenshot status in ClientDraft. |

### VERIFICATION_DEADLINE_APPROACHING

| Field | Value |
|-------|-------|
| **Trigger** | `VerificationTask` where `status = Pending` AND `deadline < now() + 2 days` |
| **Owner** | `both` |
| **Priority** | `urgent` |
| **Agent message** | "Deadline approaching: {task} for {clientName} on {platformLabel} due {deadlineLabel}" |
| **Backoffice message** | "Deadline approaching: {task} for {clientName} ({agentName}) on {platformLabel} due {deadlineLabel}" |
| **Source page** | Sales Interaction (Verification Needed) |
| **Action (agent)** | Link to client detail or upload page |
| **Action (backoffice)** | Open Document Review modal |
| **Notes** | Currently mock data. Fires when deadline is within 2 days (or already past). Supersedes VERIFICATION_TASK_PENDING for the same task. |

### POST_APPROVAL_LIMITED

| Field | Value |
|-------|-------|
| **Trigger** | Approved `Client` with one or more platforms in LIMITED status |
| **Owner** | `both` |
| **Priority** | `info` |
| **Agent message** | "{clientName} has {count} LIMITED platform(s): {platformNames} — follow up" |
| **Backoffice message** | "{clientName} ({agentName}) has {count} LIMITED platform(s): {platformNames}" |
| **Source page** | Sales Interaction (Verification Needed → Post-Approval) |
| **Action (agent)** | Link to client detail |
| **Action (backoffice)** | Link to Client Management detail page |
| **Notes** | Currently mock data. Will need platform status tracking on approved clients. `pendingVerificationTodos` count indicates outstanding work. |

### PHONE_ISSUED_NO_PROGRESS

| Field | Value |
|-------|-------|
| **Trigger** | `PhoneAssignment` where `status = SIGNED_OUT` AND linked `ClientDraft.step = 3` AND `platformProgress.verified = 0` AND `signedOutAt < now() - 2 days` |
| **Owner** | `both` |
| **Priority** | `warning` |
| **Agent message** | "Device issued {days} days ago for {clientName} but no platforms registered yet — start registrations" |
| **Backoffice message** | "Device issued {days} days ago for {clientName} ({agentName}) with 0 platform progress — follow up" |
| **Source page** | Sales Interaction (In Progress, Step 3) |
| **Action (agent)** | Link to `/agent/new-client?draft={draftId}` (Step 3) |
| **Action (backoffice)** | Link to Sales Interaction row or Agent Detail page |
| **Notes** | Device has a 3-day window (`dueBackAt`). If 2 days pass with zero platform registrations, the agent likely needs help or a reminder. Complements DEVICE_OVERDUE — this fires *before* the device is overdue. |

### TODO_ASSIGNED

| Field | Value |
|-------|-------|
| **Trigger** | Backoffice creates a todo via `assignTodo()` server action — stored in `Todo` model (DB-backed, not computed) |
| **Owner** | `both` |
| **Priority** | `warning` |
| **Agent message** | "{issueCategory} — {clientName} · Due {dueDate}" |
| **Backoffice message** | "{issueCategory} — {clientName} · Assigned to {agentName} · Due {dueDate}" |
| **Source page** | Sales Interaction ("+  Assign To-Do" button) |
| **Action (agent)** | Shows in Agent Action Hub (`/agent/todo-list`) as a maintenance task |
| **Action (backoffice)** | Shows in Sales Interaction → Verification Needed section as a verification task row |
| **Issue categories** | "Re-Open Bank Account / Schedule with Client", "Contact Bank", "Contact PayPal", "Platforms Verification" |
| **Notes** | Unlike other rules, this is an explicit DB record (Todo model), not a computed rule from other tables. Status: PENDING → COMPLETED/CANCELLED. Default due date: 3 days from creation. Creates `TODO_ASSIGNED` EventLog entry. |

---

## Pages Reviewed

Track which pages have been audited for todo rules.

- [ ] Agent Dashboard (`/agent`)
- [ ] Agent Clients (`/agent/clients`)
- [ ] Agent New Client (`/agent/new-client`)
- [ ] Agent Earnings (`/agent/earnings`)
- [ ] Agent Team (`/agent/team`)
- [ ] Agent Settings (`/agent/settings`)
- [ ] Backoffice Overview (`/backoffice`)
- [ ] Backoffice Agent Management (`/backoffice/agent-management`)
- [x] **Backoffice Sales Interaction** (`/backoffice/sales-interaction`) — DEVICE_ASSIGNED, DEVICE_OVERDUE, DEVICE_PENDING_ASSIGN, DRAFT_STALE, STEP4_AWAITING_APPROVAL, STEP4_LONG_WAIT, VERIFICATION_TASK_PENDING, VERIFICATION_DEADLINE_APPROACHING, POST_APPROVAL_LIMITED, PHONE_ISSUED_NO_PROGRESS, TODO_ASSIGNED
- [ ] Backoffice Client Management (`/backoffice/client-management`)
- [ ] Backoffice Commissions (`/backoffice/commissions`)
- [ ] Backoffice Settlements (`/backoffice/client-settlement`)
- [ ] Backoffice Phone Tracking (`/backoffice/phone-tracking`)
- [ ] Backoffice Fund Allocation (`/backoffice/fund-allocation`)
- [ ] Backoffice Reports (`/backoffice/reports`)
- [ ] Backoffice Login Management (`/backoffice/login-management`)
- [ ] Backoffice Action Hub / Todo List (`/backoffice/todo-list`)
