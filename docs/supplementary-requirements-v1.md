# Supplementary Requirements v1

*Source: Stakeholder notes, 2026-02-05*

---

## 1. Scale & User Roles

| Role | Count | Primary Responsibilities |
|------|-------|-------------------------|
| **Agent (Sales)** | 100-500 | Customer acquisition, relationship management, screenshot uploads for verification |
| **Backoffice Staff** | 2-5 | Financial data entry, application review, withdrawal audits, Gmail monitoring |
| **General Manager** | 1+ | Profit sharing configuration, god-mode dashboard, all permissions |

---

## 2. Customer Management

### 2.1 Core Features
- View customer profile + balances across **12 platforms** (8 sports betting + 3 financial + 1 other)
- Only approved customers appear in management view

### 2.2 Customer Onboarding Flow
- Multi-stage approval workflow with agent ↔ backoffice interaction
- Requirements before customer is "active":
  - Pass several rounds of review
  - Agent uploads login verification screenshots (successful login pages, credentials for record)
  - Screenshots stored in customer record

### 2.3 Customer Lifecycle States (per platform)
1. Successfully registered
2. Initial deposit $XXX
3. Second deposit (if any)
4. Platform invites to VIP (email trigger)
5. Third deposit (if any)
6. Account limited $XXX
7. Further limitation
8. Platform requests verification
9. Initial withdrawal (may include bonus)
10. Second withdrawal
11. Account closure → generates audit to-do

### 2.4 Customer Closure Process
1. Backoffice logs into customer's 12 platforms
2. Checks remaining balances
3. If balance exists → initiate withdrawal
4. If balance is zero (confirmed) → take screenshot as proof
5. Upload screenshot → trigger "end partnership" workflow

---

## 3. Agent Management

### 3.1 Profile Data
- Basic info
- Historical performance data
- Supervisor/subordinate hierarchy (tree structure)

### 3.2 Compensation Algorithm
- **Base commission**: +300 per new customer acquired
- **Override bonus**: When subordinate acquires customer, supervisor gets tiered bonus based on level in hierarchy
- Algorithm must be configurable

---

## 4. Financial Recording System

### 4.1 Platform Structure
Each customer has accounts on:
- **8 sports betting platforms**
- **3 financial platforms** (PayPal, bank, etc.)
- *Total: 11-12 platforms per customer*

### 4.2 Transaction Types

| Type | Description |
|------|-------------|
| **Internal Transfer (Client-to-Client)** | Customer A → Customer B |
| **Internal Transfer (Platform-to-Platform)** | Customer A Platform 1 → Customer A Platform 2 |
| **External: Agent Payout** | Salary + bonus payments to agents |
| **External: Customer Bonus** | Sign-up rewards to customer's personal wallet (external address, not internal account) |

### 4.3 Balance Tracking
- Real-time calculated balance per customer per platform
- Derived from transaction history (not audited until closure)
- Displayed on customer detail page: "PayPal: $X, Bank: $Y, Platform1: $Z..."

### 4.4 Customer Rewards
- Weekly sign-up bonuses
- Platform-specific bonuses
- Track total bonuses paid per customer

---

## 5. Gmail API Integration

### 5.1 Setup
- Company Gmail receives forwarded emails from hundreds of customer accounts
- Backoffice interface for monitoring

### 5.2 Email Monitoring Features

**Deposit/Withdrawal Alerts:**
- Sports platforms send notifications for deposits and withdrawals
- Cross-reference with internal transaction records
- Generate 24-hour follow-up to-do after withdrawal record

**Registration Verification:**
- PayPal, EdgeBoost, and 8 sports platforms send welcome emails
- Use as confirmation that registration succeeded

**Keyword Tracking:**
| Keyword | Action |
|---------|--------|
| verify | Flag for attention |
| upload ID | Flag for attention |
| deposit match | Track promotion |
| no sweat bet | Track promotion |
| VIP invitation | **Critical**: Update customer platform status |
| successful deposit | Reconciliation |
| initial withdraw | Track lifecycle |
| withdraw success | Reconciliation |

### 5.3 VIP Detection (High Priority)
- Any VIP-related email triggers status change on customer's platform record
- Must be logged and visible in customer profile

---

## 6. Profit Sharing System (General Manager)

### 6.1 Data Model

**Partner (Trader) Table:**
- Partner ID, name
- Applicable profit-sharing rule type
- Examples:
  - "Trader1: Deduct specific fees first, then 50/50"
  - "Trader3: Split 45/55 first, then deduct fixed fees"

**Customer Platform Account Table:**
- Links customer + platform + partner
- Pre-configured rules per combination
- Example: "Customer X on Platform Y → Trader2 rules apply"

**Profit Sharing Detail Table:**
- Each revenue record:
  1. Apply fee deductions (referral fee, setup fee, equipment fee, weekly fee, etc.)
  2. Calculate split per partner's ratio
- Full audit trail: partner × customer × platform × transaction

### 6.2 Configurable Elements
- Fee types and amounts (500 vs 1000, etc.)
- Split ratios per partner
- Rule assignment per customer-platform combination
- **All values configurable via admin UI, not hardcoded**

### 6.3 Fee Types (Examples)
- Referral fee (介绍费)
- Account setup fee (开户费)
- Equipment fee (设备费)
- Weekly fee (周费用)

---

## 7. Permission Hierarchy

| Role | Access Level |
|------|--------------|
| Agent | Own customers, own hierarchy, own performance |
| Backoffice | All customers, financial entry, Gmail monitoring, audit workflows |
| General Manager | **God mode**: All pages, all data, profit sharing config, partner management |

---

## 8. Key Technical Considerations

1. **Screenshot Storage**: Need file upload system with association to customer records
2. **Email Parsing**: Gmail API integration with keyword detection and webhook/polling
3. **Real-time Balance Calculation**: Derived from transaction log, not stored directly
4. **Audit vs Live Data**: Clear distinction between daily calculated balances and audited final balances
5. **Hierarchical Agent Structure**: Tree data structure for supervisor relationships
6. **Flexible Profit Sharing**: Rule engine pattern for complex fee/split calculations
7. **To-Do System**: Task generation with due dates, manual or email-triggered completion

---

## 9. Open Questions

1. What are the exact 8 sports platforms and 3 financial platforms?
2. What is the 12th platform mentioned?
3. Specific commission tiers for agent hierarchy?
4. Retention policy for screenshots?
5. Gmail polling frequency vs webhook preference?
6. Multi-currency support needed?
7. Timezone handling for global agents?
