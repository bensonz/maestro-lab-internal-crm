# Agent Portal Pages

*Route prefix: `/` (root)*
*Access: AGENT role*

> 📖 **Reference:** See [PRD.md](../PRD.md) for state machines, to-do generation rules, and EventLog requirements.

---

## 1. Dashboard

**Route:** `/`
**Screenshot:** `agent-00-dashboard.jpg`

### Purpose
Agent's home page showing personal KPIs, financial overview, tasks, and client status.

### UI Elements
| Section | Elements |
|---------|----------|
| **Client Status** | Application In Progress (2), Pending Approval (2), Approved (1) |
| **Financial Overview** | Accumulated Revenue ($24,580 +12.5%), Pending Payout ($3,250), Monthly Growth (+18.2%) |
| **Today's Tasks** | Task cards with Urgent badges, Confirm/Done actions |
| **To-Dos** | Client cards showing next task, step progress, status badges |

### Interactions

#### 1.1 Click Client Status Card
- **Type:** Navigation
- **Action:** Navigate to `/clients` with status filter applied
- **Backend:** None

#### 1.2 Click Financial Card
- **Type:** Navigation
- **Action:** Navigate to `/earnings`
- **Backend:** None

#### 1.3 Confirm Task
- **Type:** Backend operation
- **UI:** "Confirm" button on task card
- **Backend:**
  ```
  PATCH /api/agent/todos/[id]
  Body: { status: 'COMPLETED' }
  ```
- **Effects:**
  1. Update `ToDo.status` → `COMPLETED`
  2. Set `completedAt`
  3. Create `EventLog` entry
  4. Refresh task list

#### 1.4 Click To-Do Client Card
- **Type:** Navigation
- **Action:** Navigate to `/clients/[id]`
- **Backend:** None

---

## 2. My Clients

**Route:** `/clients`
**Screenshot:** `agent-02-my-clients.jpg`

### Purpose
View and manage agent's own client portfolio.

### UI Elements
| Element | Type | Description |
|---------|------|-------------|
| Stats bar | Display | Total: 7, In Progress: 1, Pending Approval: 1, etc. |
| Search | Input | Filter by client name |
| Step filter | Dropdown | Filter by application step (1-5) |
| Status filter | Dropdown | All, Pending, In Progress, Approved, etc. |
| Aging filter | Dropdown | Filter by days since start |
| Sort | Dropdown | Priority, Date, Name |
| View toggle | Buttons | Grid / List view |
| Active Only | Toggle | Show only active clients |
| Client cards | Cards | Client name, next task, step progress, status badge, dates |

### Interactions

#### 2.1 Click Client Card
- **Type:** Navigation
- **Action:** Navigate to `/clients/[id]`
- **Backend:** None (navigation only)

#### 2.2 Filters (Step, Status, Aging, Sort)
- **Type:** UI only
- **Action:** Client-side filtering/sorting
- **Backend:** None

#### 2.3 New Client Button
- **Type:** Navigation
- **Action:** Navigate to `/new-client`
- **Backend:** None

---

## 3. Client Detail

**Route:** `/clients/[id]`
**Screenshot:** *(not captured)*

### Purpose
Full view of a client's application, platforms, documents, and timeline.

### UI Elements
| Element | Type | Description |
|---------|------|-------------|
| Client header | Display | Name, status badge, contact info |
| Platform cards | Cards | 11 platforms with status, balance, last activity |
| Balance summary | Display | Total across all platforms |
| Documents list | List | Uploaded screenshots, ID docs |
| Timeline | Feed | All events for this client |
| Action buttons | Buttons | Upload Screenshot, Request Extension |

### Interactions

#### 3.1 Upload Screenshot (per platform)
- **Type:** Backend operation
- **UI:** File picker dialog
- **Preconditions:** Platform status is `NOT_STARTED` or `PENDING_UPLOAD` or `NEEDS_MORE_INFO`
- **Backend:**
  ```
  POST /api/agent/clients/[id]/platforms/[platformId]/upload
  Body: { file: FormData }
  ```
- **Effects:**
  1. Upload file to storage (S3/local)
  2. Create `Document` record (type: `LOGIN_VERIFICATION`)
  3. Update `ClientPlatform.status` → `PENDING_REVIEW`
  4. Create `ToDo` for backoffice (type: `PLATFORM_REVIEW`, due: 1 day)
  5. Complete agent's `PLATFORM_UPLOAD` to-do for this platform
  6. Create `EventLog` entry (type: `PLATFORM_UPLOAD`)
  7. Refresh platform card UI

#### 3.2 Request Deadline Extension
- **Type:** Backend operation
- **UI:** Confirmation dialog with reason input
- **Preconditions:** Client is `IN_EXECUTION` and deadline not yet extended twice
- **Backend:**
  ```
  POST /api/agent/clients/[id]/request-extension
  Body: { reason: string }
  ```
- **Effects:**
  1. Create `ToDo` for backoffice (type: `EXTENSION_DECISION`, due: 1 day)
  2. Create `EventLog` entry (type: `STATUS_CHANGE`, metadata: {reason})
  3. Update UI to show "Extension Requested" badge
- **State:** No state change until backoffice approves

#### 3.3 Click Platform Card (view details)
- **Type:** UI only (modal)
- **Action:** Open modal with platform details, screenshots, history
- **Backend:** None

#### 3.4 View Document
- **Type:** UI only
- **Action:** Open document viewer/lightbox
- **Backend:** None (cached URL)

---

## 4. New Client

**Route:** `/new-client`
**Screenshot:** `agent-03-new-client.jpg`

### Purpose
Submit a new client application with all required information.

### UI Elements
| Section | Fields |
|---------|--------|
| **ID Upload & Verification** | File upload (Passport, State ID, Driver's License) |
| **Basic Information** | First Name, Middle Name, Last Name, Date of Birth, Phone*, Email |
| **Address Information** | Primary Address*, City, State, ZIP, Second Address checkbox |
| **Client Background & Compliance Review** | Group A-D expandable sections |
| **How do we know this client?** | Referrer name, How met, Profession, Reliability (Yes/No/Unknown), Flagged before (Yes/No/Unknown) |
| **Compliance Review Summary** | ID Verification status |

### Form Sections (Compliance Groups)
- **Group A:** Quick Assessment
- **Group B:** Identity & Documents
- **Group C:** Behavior History
- **Group D:** Authorization & Risk

### Interactions

#### 4.1 Upload ID Document
- **Type:** Backend operation
- **UI:** Drag-drop zone or file picker
- **Backend:**
  ```
  POST /api/agent/documents/upload
  Body: FormData { file, type: 'ID_DOCUMENT' }
  ```
- **Effects:**
  1. Upload to storage
  2. Return temporary URL
  3. Store URL in form state (not saved until submit)
  4. *(Future: AI verification)*

#### 4.2 Save Draft
- **Type:** Backend operation
- **UI:** "Save Draft" button
- **Backend:**
  ```
  POST /api/agent/clients/draft
  Body: { ...formData, isDraft: true }
  ```
- **Effects:**
  1. Create/update `Client` with `intakeStatus: DRAFT`
  2. Store partial data
  3. Show success toast

#### 4.3 Submit & Start Application
- **Type:** Backend operation
- **UI:** "Submit & Start Application" button
- **Validation:** Required fields: First Name, Last Name, Phone, Primary Address
- **Backend:**
  ```
  POST /api/agent/clients
  Body: { ...formData }
  ```
- **Effects:**
  1. Validate all required fields
  2. Create `Client` record (`intakeStatus: PENDING`)
  3. Create 11 `ClientPlatform` records (all `NOT_STARTED`)
  4. Create `EventLog` entry (`APPLICATION_SUBMITTED`)
  5. Create initial `ToDo` items for agent
  6. Redirect to `/clients/[newId]`

#### 4.4 Expand Compliance Group
- **Type:** UI only
- **Action:** Expand/collapse accordion section
- **Backend:** None

---

## 5. Earnings

**Route:** `/earnings`
**Screenshot:** `agent-01-earnings.jpg`

### Purpose
View commission earnings and payout history (read-only).

### UI Elements
| Element | Type | Description |
|---------|------|-------------|
| Total Earnings | Stat card | $24,580 (+12.5%) |
| Pending Payout | Stat card | $3,250 |
| This Month | Stat card | $4,140 |
| Growth | Stat card | +18.2% |
| Recent Transactions | List | Client name, date, amount, status (Paid/Pending) |

### Interactions

*All elements are read-only. No backend operations.*

#### 5.1 View Transaction Detail
- **Type:** UI only (modal)
- **Action:** Click transaction → show breakdown modal
- **Backend:** None

---

## 6. To-Do List

**Route:** `/todo-list`
**Screenshot:** *(similar to backoffice-07)*

### Purpose
View and complete assigned tasks.

### UI Elements
| Element | Type | Description |
|---------|------|-------------|
| Stats bar | Display | Today's Tasks, 3-Day, 7-Day, Overdue |
| Category tabs | Tabs | All Tasks, Transaction, Sales Interaction, etc. |
| Search | Input | Filter tasks |
| Task list | List | Task title, client name, due time, status |

### Interactions

#### 6.1 Mark Task Complete
- **Type:** Backend operation
- **UI:** Checkbox or "Complete" button on task
- **Backend:**
  ```
  PATCH /api/agent/todos/[id]
  Body: { status: 'COMPLETED' }
  ```
- **Effects:**
  1. Update `ToDo.status` → `COMPLETED`
  2. Set `ToDo.completedAt`
  3. Create `EventLog` entry
  4. *(If platform upload task)* Check if all platforms ready → update client status
  5. Update agent metrics

#### 6.2 View Task Detail
- **Type:** UI only (modal)
- **Action:** Click task → show detail modal with client link
- **Backend:** None

#### 6.3 Filter by Category
- **Type:** UI only
- **Action:** Tab switching filters list
- **Backend:** None

---

## 7. Settings

**Route:** `/settings`
**Screenshot:** *(not captured)*

### Purpose
Manage profile and notification preferences.

### UI Elements
| Section | Fields |
|---------|--------|
| **Profile** | Name, Email, Phone, Avatar upload |
| **Notifications** | Email notifications toggle, Push notifications toggle |
| **Security** | Change password |

### Interactions

#### 7.1 Update Profile
- **Type:** Backend operation
- **UI:** Form with Save button
- **Backend:**
  ```
  PATCH /api/agent/profile
  Body: { name, phone, avatar }
  ```
- **Effects:**
  1. Update `User` record
  2. Show success toast

#### 7.2 Change Password
- **Type:** Backend operation
- **UI:** Current password, New password, Confirm password
- **Backend:**
  ```
  POST /api/agent/profile/password
  Body: { currentPassword, newPassword }
  ```
- **Effects:**
  1. Verify current password
  2. Hash and update password
  3. Show success toast

#### 7.3 Toggle Notifications
- **Type:** Backend operation
- **UI:** Toggle switches
- **Backend:**
  ```
  PATCH /api/agent/profile/preferences
  Body: { emailNotifications: boolean, pushNotifications: boolean }
  ```
- **Effects:**
  1. Update user preferences
  2. Show success toast

---

## 8. Team (V1)

**Route:** `/team`
**Screenshot:** *(not built yet)*

### Purpose
View agent's position in hierarchy — supervisor and subordinates.

### UI Elements
| Element | Type | Description |
|---------|------|-------------|
| Hierarchy tree | Tree view | Visual org chart |
| Supervisor card | Card | Supervisor name, contact |
| Subordinates list | List | Direct reports with client counts |

### Interactions

*All elements are read-only for agents.*

---

*Last updated: 2026-02-05*
