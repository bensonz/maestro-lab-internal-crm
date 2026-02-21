// ============================================================
// Static mock data for the UI shell. Every page imports from here
// instead of fetching from the database.
// ============================================================

import type { PriorityAction, IntakeClient, VerificationTask, PostApprovalClient, HierarchyAgent, HierarchyNode, AgentKPIs, ActionHubStats, PnlStatus, FundAlert, PendingAction, EnhancedAgentTasks, ActiveAgent, AgentDetailData, SettlementClient } from '@/types/backend-types'

// ─── Session ───────────────────────────────────────────────

export const MOCK_SESSION = {
  user: {
    id: 'user-agent-1',
    name: 'Marcus Rivera',
    email: 'agent@test.com',
    role: 'AGENT' as const,
  },
}

export const MOCK_BACKOFFICE_SESSION = {
  user: {
    id: 'user-admin-1',
    name: 'Sarah Chen',
    email: 'admin@test.com',
    role: 'ADMIN' as const,
  },
}

// ─── Agent Dashboard ──────────────────────────────────────

export const MOCK_DASHBOARD_STATS = {
  totalClients: 24,
  activeClients: 18,
  completedThisMonth: 3,
  pendingTasks: 7,
  earnings: 4800,
  pendingPayout: 600,
  thisMonthEarnings: 1200,
  earningsChange: 15.5,
  inProgressCount: 12,
  pendingApprovalCount: 3,
  approvedCount: 8,
  lastApprovedAt: new Date('2026-02-15'),
}

export const MOCK_TIER_INFO = {
  id: 'user-agent-1',
  name: 'Marcus Rivera',
  starLevel: 2,
  tier: '2-star',
  supervisorId: 'user-supervisor-1',
  supervisor: { id: 'user-supervisor-1', name: 'James Park', starLevel: 4, tier: '4-star' },
  approvedCount: 8,
  currentThreshold: { level: 2, tier: '2-star', min: 5 },
  nextThreshold: { level: 3, tier: '3-star', min: 15 },
  clientsToNextTier: 7,
}

export const MOCK_CLIENT_STATS = {
  total: 24,
  inProgress: 12,
  pendingApproval: 3,
  verificationNeeded: 2,
  approved: 8,
  rejected: 1,
  aborted: 0,
  phoneIssued: 4,
  inExecution: 6,
  readyForApproval: 3,
  pending: 2,
}

export const MOCK_PRIORITY_ACTIONS: PriorityAction[] = [
  { type: 'overdue', title: 'Upload DraftKings screenshot', clientName: 'John Smith', clientId: 'client-1', link: '/agent/todo-list', createdAt: new Date('2026-02-17') },
  { type: 'due-today', title: 'Complete FanDuel registration', clientName: 'Maria Garcia', clientId: 'client-2', link: '/agent/todo-list', createdAt: new Date('2026-02-19') },
  { type: 'needs-info', title: 'Provide additional ID info', clientName: 'David Lee', clientId: 'client-3', link: '/agent/clients/client-3', createdAt: new Date('2026-02-18') },
  { type: 'deadline-approaching', title: 'Execution deadline in 2 days', clientName: 'Sarah Wilson', clientId: 'client-4', link: '/agent/clients/client-4', createdAt: new Date('2026-02-18') },
]

export const MOCK_KPIS: AgentKPIs = {
  totalClients: 24,
  approvedClients: 8,
  rejectedClients: 1,
  inProgressClients: 12,
  delayedClients: 2,
  successRate: 88.9,
  delayRate: 8.3,
  extensionRate: 12.5,
  avgDaysToInitiate: 1.5,
  avgDaysToConvert: 14.2,
  pendingTodos: 7,
  overdueTodos: 1,
}

export const MOCK_RANKING = {
  percentile: 82,
  myRank: 4,
  totalMembers: 22,
  speed: 78,
  stability: 91,
  influence: 65,
}

// ─── Agent Clients ────────────────────────────────────────

export const MOCK_AGENT_CLIENTS = [
  { id: 'client-1', name: 'John Smith', intakeStatus: 'IN_EXECUTION' as const, status: 'In Execution', statusColor: 'blue', nextTask: 'Upload DraftKings screenshot', step: 5, totalSteps: 11, progress: 45, lastUpdated: '2 hours ago', updatedAt: '2026-02-19T10:00:00Z', deadline: '2026-02-25' },
  { id: 'client-2', name: 'Maria Garcia', intakeStatus: 'IN_EXECUTION' as const, status: 'In Execution', statusColor: 'blue', nextTask: 'Complete FanDuel registration', step: 3, totalSteps: 11, progress: 27, lastUpdated: '1 day ago', updatedAt: '2026-02-18T14:00:00Z', deadline: '2026-02-28' },
  { id: 'client-3', name: 'David Lee', intakeStatus: 'NEEDS_MORE_INFO' as const, status: 'Needs More Info', statusColor: 'yellow', nextTask: 'Provide additional ID info', step: 2, totalSteps: 11, progress: 18, lastUpdated: '3 hours ago', updatedAt: '2026-02-19T08:00:00Z', deadline: '2026-02-22' },
  { id: 'client-4', name: 'Sarah Wilson', intakeStatus: 'PHONE_ISSUED' as const, status: 'Phone Issued', statusColor: 'green', nextTask: 'Begin platform registrations', step: 1, totalSteps: 11, progress: 9, lastUpdated: '5 hours ago', updatedAt: '2026-02-19T06:00:00Z', deadline: '2026-02-21' },
  { id: 'client-5', name: 'James Brown', intakeStatus: 'READY_FOR_APPROVAL' as const, status: 'Ready for Approval', statusColor: 'purple', nextTask: null, step: 11, totalSteps: 11, progress: 100, lastUpdated: '1 day ago', updatedAt: '2026-02-18T16:00:00Z', deadline: null },
  { id: 'client-6', name: 'Emily Davis', intakeStatus: 'APPROVED' as const, status: 'Approved', statusColor: 'green', nextTask: null, step: 11, totalSteps: 11, progress: 100, lastUpdated: '3 days ago', updatedAt: '2026-02-16T12:00:00Z', deadline: null },
  { id: 'client-7', name: 'Robert Taylor', intakeStatus: 'PENDING' as const, status: 'Pending', statusColor: 'gray', nextTask: 'Waiting for phone assignment', step: 0, totalSteps: 11, progress: 0, lastUpdated: '4 days ago', updatedAt: '2026-02-15T09:00:00Z', deadline: null },
  { id: 'client-8', name: 'Lisa Anderson', intakeStatus: 'IN_EXECUTION' as const, status: 'In Execution', statusColor: 'blue', nextTask: 'Upload BetMGM screenshot', step: 7, totalSteps: 11, progress: 64, lastUpdated: '6 hours ago', updatedAt: '2026-02-19T05:00:00Z', deadline: '2026-02-26' },
]

// ─── Agent Client Detail ─────────────────────────────────

export const MOCK_CLIENT_DETAIL = {
  id: 'client-1',
  firstName: 'John',
  lastName: 'Smith',
  middleName: null,
  name: 'John Smith',
  email: 'john.smith@email.com',
  phone: '(555) 123-4567',
  address: '123 Main St',
  city: 'Springfield',
  state: 'IL',
  zipCode: '62701',
  country: 'US',
  secondaryAddress: null,
  dateOfBirth: '1990-05-15',
  status: 'In Execution',
  statusColor: 'blue',
  intakeStatus: 'IN_EXECUTION' as const,
  deadline: new Date('2026-02-25'),
  deadlineExtensions: 0,
  applicationNotes: 'Standard onboarding',
  complianceReview: null,
  complianceStatus: null,
  questionnaire: {},
  agent: { id: 'user-agent-1', name: 'Marcus Rivera', email: 'agent@test.com' },
  platforms: [
    { id: 'cp-1', platformType: 'DRAFTKINGS' as const, status: 'PENDING_UPLOAD' as const, statusLabel: 'Pending Upload', statusColor: 'yellow', username: null, accountId: null, screenshots: [], reviewNotes: null, updatedAt: new Date('2026-02-19') },
    { id: 'cp-2', platformType: 'FANDUEL' as const, status: 'VERIFIED' as const, statusLabel: 'Verified', statusColor: 'green', username: 'jsmith_fd', accountId: 'FD-123456', screenshots: ['/uploads/fd-screenshot.png'], reviewNotes: 'Looks good', updatedAt: new Date('2026-02-18') },
    { id: 'cp-3', platformType: 'BETMGM' as const, status: 'NOT_STARTED' as const, statusLabel: 'Not Started', statusColor: 'gray', username: null, accountId: null, screenshots: [], reviewNotes: null, updatedAt: new Date('2026-02-17') },
    { id: 'cp-4', platformType: 'CAESARS' as const, status: 'VERIFIED' as const, statusLabel: 'Verified', statusColor: 'green', username: 'jsmith_czr', accountId: 'CZR-789', screenshots: ['/uploads/czr-screenshot.png'], reviewNotes: null, updatedAt: new Date('2026-02-17') },
  ],
  toDos: [
    { id: 'todo-1', title: 'Upload DraftKings screenshot', description: 'Take a screenshot of the DraftKings registration page', type: 'UPLOAD_SCREENSHOT' as const, status: 'PENDING' as const, priority: 1, dueDate: new Date('2026-02-20'), platformType: 'DRAFTKINGS' as const, stepNumber: 5, extensionsUsed: 0, maxExtensions: 3, screenshots: [], metadata: null, createdAt: new Date('2026-02-17') },
    { id: 'todo-2', title: 'Complete BetMGM registration', description: null, type: 'EXECUTION' as const, status: 'PENDING' as const, priority: 0, dueDate: new Date('2026-02-22'), platformType: 'BETMGM' as const, stepNumber: 7, extensionsUsed: 0, maxExtensions: 3, screenshots: [], metadata: null, createdAt: new Date('2026-02-18') },
  ],
  eventLogs: [
    { id: 'ev-1', eventType: 'STATUS_CHANGE' as const, description: 'Status changed to IN_EXECUTION', metadata: null, oldValue: 'PHONE_ISSUED', newValue: 'IN_EXECUTION', userName: 'Sarah Chen', createdAt: new Date('2026-02-15') },
    { id: 'ev-2', eventType: 'PLATFORM_UPLOAD' as const, description: 'FanDuel screenshot uploaded', metadata: null, oldValue: null, newValue: null, userName: 'Marcus Rivera', createdAt: new Date('2026-02-18') },
  ],
  phoneAssignment: { phoneNumber: '(555) 987-6543', deviceId: 'DEV-001', issuedAt: new Date('2026-02-14'), signedOutAt: null, returnedAt: null },
  pendingExtensionRequest: null,
  extensionRequestCount: 0,
  createdAt: new Date('2026-02-10'),
  updatedAt: new Date('2026-02-19'),
  statusChangedAt: new Date('2026-02-15'),
  closedAt: null,
  closureReason: null,
  closureProof: [],
  closedBy: null,
}

// ─── Agent Earnings ───────────────────────────────────────

export const MOCK_EARNINGS = {
  totalEarnings: 4800,
  pendingPayout: 600,
  thisMonth: 1200,
  recentTransactions: [
    { id: 'txn-1', client: 'Emily Davis', description: 'Direct bonus — client approved', amount: 200, status: 'paid', date: 'Feb 16, 2026', rawDate: '2026-02-16' },
    { id: 'txn-2', client: 'Emily Davis', description: 'Star pool slice (2 slices)', amount: 100, status: 'paid', date: 'Feb 16, 2026', rawDate: '2026-02-16' },
    { id: 'txn-3', client: 'Michael Chen', description: 'Direct bonus — client approved', amount: 200, status: 'pending', date: 'Feb 12, 2026', rawDate: '2026-02-12' },
    { id: 'txn-4', client: 'Anna Torres', description: 'Direct bonus — client approved', amount: 200, status: 'paid', date: 'Feb 5, 2026', rawDate: '2026-02-05' },
    { id: 'txn-5', client: 'Anna Torres', description: 'Star pool slice (2 slices)', amount: 100, status: 'paid', date: 'Feb 5, 2026', rawDate: '2026-02-05' },
  ],
  commission: { totalEarned: 4800, pending: 600, paid: 4200, directBonuses: 3200, starSlices: 1600 },
  overrides: { overrideTotal: 400, ownTotal: 4400 },
}

// ─── Agent Hierarchy / Team ───────────────────────────────

const mockAgent: HierarchyAgent = {
  id: 'user-agent-1',
  name: 'Marcus Rivera',
  email: 'agent@test.com',
  avatar: null,
  tier: '2-star',
  starLevel: 2,
  isActive: true,
  role: 'AGENT',
  totalClients: 24,
  approvedClients: 8,
  successRate: 88.9,
}

const mockSupervisor: HierarchyAgent = {
  id: 'user-supervisor-1',
  name: 'James Park',
  email: 'james@test.com',
  avatar: null,
  tier: '4-star',
  starLevel: 4,
  isActive: true,
  role: 'AGENT',
  totalClients: 45,
  approvedClients: 38,
  successRate: 84.4,
}

const mockSubordinate1: HierarchyAgent = {
  id: 'user-sub-1',
  name: 'Alex Kim',
  email: 'alex@test.com',
  avatar: null,
  tier: '1-star',
  starLevel: 1,
  isActive: true,
  role: 'AGENT',
  totalClients: 8,
  approvedClients: 3,
  successRate: 75.0,
}

const mockSubordinate2: HierarchyAgent = {
  id: 'user-sub-2',
  name: 'Jamie Torres',
  email: 'jamie@test.com',
  avatar: null,
  tier: 'rookie',
  starLevel: 0,
  isActive: true,
  role: 'AGENT',
  totalClients: 4,
  approvedClients: 1,
  successRate: 50.0,
}

export const MOCK_HIERARCHY = {
  agent: mockAgent,
  supervisorChain: [mockSupervisor],
  subordinateTree: {
    ...mockAgent,
    subordinates: [
      { ...mockSubordinate1, subordinates: [] },
      { ...mockSubordinate2, subordinates: [] },
    ],
  } as HierarchyNode,
  teamSize: 3,
}

export const MOCK_TEAM_ROLLUP = {
  totalAgents: 3,
  activeAgents: 3,
  totalClients: 36,
  approvedClients: 12,
  teamSuccessRate: 76.5,
  tierBreakdown: { rookie: 2, '2-star': 1 },
}

// ─── Agent Todo List ──────────────────────────────────────

export const MOCK_TODO_DATA = {
  todaysTasks: 3,
  thisWeek: 7,
  overdue: 1,
  completedToday: 2,
  pendingTasks: [
    { id: 'todo-1', task: 'Upload DraftKings screenshot', description: 'Take a screenshot of the DraftKings registration page', client: 'John Smith', clientId: 'client-1', due: 'Today', dueDate: '2026-02-19', overdue: false, stepNumber: 5, createdAt: '2026-02-17T10:00:00Z', extensionsUsed: 0, maxExtensions: 3, createdByName: 'Sarah Chen', metadata: null },
    { id: 'todo-2', task: 'Complete BetMGM registration', description: 'Register the client on BetMGM platform', client: 'John Smith', clientId: 'client-1', due: 'In 3 days', dueDate: '2026-02-22', overdue: false, stepNumber: 7, createdAt: '2026-02-18T09:00:00Z', extensionsUsed: 0, maxExtensions: 3, createdByName: 'Sarah Chen', metadata: null },
    { id: 'todo-3', task: 'Upload FanDuel screenshot', description: 'Upload a screenshot of the FanDuel account', client: 'Maria Garcia', clientId: 'client-2', due: 'Today', dueDate: '2026-02-19', overdue: false, stepNumber: 3, createdAt: '2026-02-16T14:00:00Z', extensionsUsed: 1, maxExtensions: 3, createdByName: 'Sarah Chen', metadata: null },
    { id: 'todo-4', task: 'Provide additional ID info', description: 'Client needs to re-submit their ID document', client: 'David Lee', clientId: 'client-3', due: 'Overdue', dueDate: '2026-02-17', overdue: true, stepNumber: 2, createdAt: '2026-02-14T11:00:00Z', extensionsUsed: 0, maxExtensions: 3, createdByName: 'Sarah Chen', metadata: null },
  ],
}

export const MOCK_TEAM_MEMBERS = [
  { id: 'user-sub-1', name: 'Alex Kim', currentStep: 'Platform Registrations', totalSteps: 11, completedSteps: 6, isOneStepAway: false, totalClients: 8 },
  { id: 'user-sub-2', name: 'Jamie Torres', currentStep: 'Phone Issued', totalSteps: 11, completedSteps: 2, isOneStepAway: false, totalClients: 4 },
]

// ─── Backoffice Overview ──────────────────────────────────

export const MOCK_OVERVIEW_STATS = {
  pendingReviews: 5,
  approvedToday: 2,
  urgentActions: 3,
  activeClients: 47,
  pendingExtensions: 2,
  delayedClients: 1,
}

export const MOCK_PRIORITY_TASKS = [
  { id: 'pt-1', title: 'Review John Smith screenshots', type: 'screenshot_review', clientName: 'John Smith', clientId: 'client-1', isUrgent: true },
  { id: 'pt-2', title: 'Approve Sarah Wilson extension', type: 'extension_request', clientName: 'Sarah Wilson', clientId: 'client-4', isUrgent: false },
  { id: 'pt-3', title: 'Review James Brown for approval', type: 'client_approval', clientName: 'James Brown', clientId: 'client-5', isUrgent: true },
]

export const MOCK_REMINDERS = [
  { message: 'P&L reconciliation due today', timeLabel: 'Today', isOverdue: true },
  { message: '2 extension requests pending review', timeLabel: '1 day ago', isOverdue: false },
]

export const MOCK_RECENT_ACTIVITY = [
  { id: 'act-1', title: 'Emily Davis approved', subtitle: 'by Sarah Chen', timestamp: new Date('2026-02-16T12:00:00Z') },
  { id: 'act-2', title: 'John Smith moved to IN_EXECUTION', subtitle: 'by Sarah Chen', timestamp: new Date('2026-02-15T14:00:00Z') },
  { id: 'act-3', title: 'Maria Garcia phone issued', subtitle: 'by Sarah Chen', timestamp: new Date('2026-02-14T10:00:00Z') },
  { id: 'act-4', title: 'New client Robert Taylor created', subtitle: 'by Marcus Rivera', timestamp: new Date('2026-02-15T09:00:00Z') },
]

// ─── Backoffice Agent Management ──────────────────────────

export const MOCK_AGENTS = [
  { id: 'user-agent-1', name: 'Marcus Rivera', tier: '2-star', phone: '(555) 100-0001', start: 'Jan 2026', clients: 24, working: 12, successRate: 88.9, delayRate: 8.3, avgDaysToConvert: 14.2 },
  { id: 'user-supervisor-1', name: 'James Park', tier: '4-star', phone: '(555) 100-0002', start: 'Mar 2025', clients: 45, working: 8, successRate: 84.4, delayRate: 6.1, avgDaysToConvert: 12.1 },
  { id: 'user-sub-1', name: 'Alex Kim', tier: 'rookie', phone: '(555) 100-0003', start: 'Dec 2025', clients: 8, working: 5, successRate: 75.0, delayRate: 12.0, avgDaysToConvert: 18.5 },
  { id: 'user-sub-2', name: 'Jamie Torres', tier: 'rookie', phone: '(555) 100-0004', start: 'Jan 2026', clients: 4, working: 3, successRate: 50.0, delayRate: 25.0, avgDaysToConvert: null },
]

export const MOCK_USERS = [
  { id: 'user-admin-1', name: 'Sarah Chen', email: 'admin@test.com', role: 'ADMIN', phone: '(555) 200-0001', isActive: true, createdAt: '2025-01-01', clientCount: 0 },
  { id: 'user-agent-1', name: 'Marcus Rivera', email: 'agent@test.com', role: 'AGENT', phone: '(555) 100-0001', isActive: true, createdAt: '2026-01-10', clientCount: 24 },
  { id: 'user-supervisor-1', name: 'James Park', email: 'james@test.com', role: 'AGENT', phone: '(555) 100-0002', isActive: true, createdAt: '2025-03-15', clientCount: 45 },
  { id: 'user-sub-1', name: 'Alex Kim', email: 'alex@test.com', role: 'AGENT', phone: '(555) 100-0003', isActive: true, createdAt: '2025-12-01', clientCount: 8 },
  { id: 'user-gm', name: 'Tom Adams', email: 'gm@test.com', role: 'ADMIN', phone: '(555) 200-0002', isActive: true, createdAt: '2025-01-01', clientCount: 0 },
]

export const MOCK_AGENT_STATS = {
  totalAgents: 4,
  initiatedApps: 81,
  newClientsMonth: 12,
  avgDaysToOpen: 1.8,
}

export const MOCK_AGENT_DETAIL: AgentDetailData = {
  id: 'user-agent-1',
  name: 'Marcus Rivera',
  gender: 'Male',
  age: 28,
  idNumber: 'DL-12345678',
  idExpiry: '2028-05-15',
  ssn: '***-**-1234',
  citizenship: 'US',
  startDate: 'Jan 10, 2026',
  tier: '2-star',
  stars: 2,
  companyPhone: '(555) 100-0001',
  carrier: 'T-Mobile',
  companyEmail: 'agent@test.com',
  personalEmail: 'marcus.r@personal.com',
  personalPhone: '(555) 300-0001',
  zelle: 'marcus.zelle@email.com',
  address: '456 Oak Ave, Chicago, IL 60601',
  loginAccount: 'mrivera',
  loginEmail: 'agent@test.com',
  totalClients: 24,
  totalEarned: 4800,
  thisMonthEarned: 1200,
  newClientsThisMonth: 5,
  newClientsGrowth: 25,
  avgDaysToInitiate: 1.5,
  avgDaysToConvert: 14.2,
  successRate: 88.9,
  referralRate: 15.0,
  extensionRate: 12.5,
  resubmissionRate: 8.0,
  avgAccountsPerClient: 7.2,
  clientsInProgress: 12,
  avgDailyTodos: 3.5,
  delayRate: 8.3,
  monthlyClients: [
    { month: 'Sep 2025', count: 2 },
    { month: 'Oct 2025', count: 3 },
    { month: 'Nov 2025', count: 4 },
    { month: 'Dec 2025', count: 3 },
    { month: 'Jan 2026', count: 7 },
    { month: 'Feb 2026', count: 5 },
  ],
  supervisor: { id: 'user-supervisor-1', name: 'James Park' },
  directReports: [
    { id: 'user-sub-1', name: 'Alex Kim' },
    { id: 'user-sub-2', name: 'Jamie Torres' },
  ],
  timeline: [
    { date: '2026-02-16', event: 'Emily Davis approved', type: 'success' },
    { date: '2026-02-15', event: 'John Smith moved to execution', type: 'info' },
    { date: '2026-02-14', event: 'Deadline extension requested for David Lee', type: 'warning' },
    { date: '2026-02-10', event: 'New client John Smith onboarded', type: 'info' },
  ],
  idDocumentUrl: undefined,
}

// ─── Backoffice Client Management ─────────────────────────

export const MOCK_SERVER_CLIENTS = [
  {
    id: 'client-1', name: 'John Smith', phone: '(555) 123-4567', email: 'john.smith@email.com', start: 'Feb 10, 2026', funds: '$2,450',
    platforms: ['DRAFTKINGS', 'FANDUEL', 'CAESARS'], activePlatforms: ['FANDUEL', 'CAESARS'], intakeStatus: 'IN_EXECUTION',
    agent: 'Marcus Rivera', address: '123 Main St', city: 'Springfield', state: 'IL', zipCode: '62701', country: 'US',
    idDocument: null, questionnaire: null,
    platformDetails: [
      { platformType: 'DRAFTKINGS', status: 'PENDING_UPLOAD', screenshots: [], username: null, reviewedBy: null, reviewedAt: null, reviewNotes: null },
      { platformType: 'FANDUEL', status: 'VERIFIED', screenshots: ['/uploads/fd-screenshot.png'], username: 'jsmith_fd', reviewedBy: 'Sarah Chen', reviewedAt: '2026-02-18', reviewNotes: 'Looks good' },
      { platformType: 'CAESARS', status: 'VERIFIED', screenshots: ['/uploads/czr-screenshot.png'], username: 'jsmith_czr', reviewedBy: null, reviewedAt: null, reviewNotes: null },
    ],
    transactions: [
      { id: 'txn-c1-1', type: 'DEPOSIT', amount: 1500, description: 'Initial deposit to FanDuel', date: '2026-02-15', platformType: 'FANDUEL' },
      { id: 'txn-c1-2', type: 'DEPOSIT', amount: 950, description: 'Deposit to Caesars', date: '2026-02-16', platformType: 'CAESARS' },
    ],
    eventLogs: [
      { id: 'ev-c1-1', eventType: 'STATUS_CHANGE', description: 'Status changed to IN_EXECUTION', userName: 'Sarah Chen', createdAt: '2026-02-15T10:00:00Z' },
    ],
  },
  {
    id: 'client-5', name: 'James Brown', phone: '(555) 123-4571', email: 'james.b@email.com', start: 'Jan 28, 2026', funds: '$5,200',
    platforms: ['DRAFTKINGS', 'FANDUEL', 'BETMGM', 'CAESARS', 'FANATICS', 'BETRIVERS', 'BALLYBET', 'BET365', 'BANK', 'PAYPAL', 'EDGEBOOST'],
    activePlatforms: ['DRAFTKINGS', 'FANDUEL', 'BETMGM', 'CAESARS', 'FANATICS', 'BETRIVERS', 'BALLYBET', 'BET365', 'BANK', 'PAYPAL', 'EDGEBOOST'],
    intakeStatus: 'READY_FOR_APPROVAL', agent: 'Marcus Rivera', address: '789 Pine Rd', city: 'Austin', state: 'TX', zipCode: '73301', country: 'US',
    idDocument: null, questionnaire: null, platformDetails: [], transactions: [], eventLogs: [],
  },
  {
    id: 'client-6', name: 'Emily Davis', phone: '(555) 123-4572', email: 'emily.d@email.com', start: 'Jan 15, 2026', funds: '$8,100',
    platforms: ['DRAFTKINGS', 'FANDUEL', 'BETMGM', 'CAESARS', 'FANATICS', 'BETRIVERS', 'BALLYBET', 'BET365', 'BANK', 'PAYPAL', 'EDGEBOOST'],
    activePlatforms: ['DRAFTKINGS', 'FANDUEL', 'BETMGM', 'CAESARS', 'FANATICS', 'BETRIVERS', 'BALLYBET', 'BET365', 'BANK', 'PAYPAL', 'EDGEBOOST'],
    intakeStatus: 'APPROVED', agent: 'Marcus Rivera', address: '321 Elm St', city: 'Denver', state: 'CO', zipCode: '80201', country: 'US',
    idDocument: null, questionnaire: null, platformDetails: [], transactions: [], eventLogs: [],
  },
]

export const MOCK_CLIENT_MANAGEMENT_STATS = {
  total: 47,
  active: 38,
  closed: 6,
  furtherVerification: 3,
}

// ─── Backoffice Sales Interaction ─────────────────────────

export const MOCK_SALES_STATS = {
  totalClients: 47,
  inProgress: 28,
  pendingApproval: 5,
  verificationNeeded: 4,
}

export const MOCK_SALES_HIERARCHY = [
  {
    level: '4-Star',
    agents: [
      { id: 'user-supervisor-1', name: 'James Park', level: '4-Star', stars: 4, clientCount: 45 },
    ],
  },
  {
    level: '2-Star',
    agents: [
      { id: 'user-agent-1', name: 'Marcus Rivera', level: '2-Star', stars: 2, clientCount: 24 },
    ],
  },
  {
    level: 'Rookie',
    agents: [
      { id: 'user-sub-1', name: 'Alex Kim', level: 'Rookie', stars: 1, clientCount: 8 },
      { id: 'user-sub-2', name: 'Jamie Torres', level: 'Rookie', stars: 0, clientCount: 4 },
    ],
  },
]

export const MOCK_INTAKE_CLIENTS: IntakeClient[] = [
  {
    id: 'client-7', name: 'Robert Taylor', status: 'PENDING', statusType: 'ready', statusColor: 'gray', agentId: 'user-agent-1', agentName: 'Marcus Rivera',
    days: 4, daysLabel: '4d', canApprove: false, canAssignPhone: true, subStage: 'waiting-for-phone',
    executionDeadline: null, deadlineExtensions: 0, pendingExtensionRequest: null,
    platformProgress: { verified: 0, total: 11 }, exceptionStates: [], rejectedPlatforms: [],
  },
  {
    id: 'client-4', name: 'Sarah Wilson', status: 'PHONE_ISSUED', statusType: 'ready', statusColor: 'green', agentId: 'user-agent-1', agentName: 'Marcus Rivera',
    days: 5, daysLabel: '5d', canApprove: false, canAssignPhone: false, subStage: 'phone-issued',
    executionDeadline: new Date('2026-02-21'), deadlineExtensions: 0, pendingExtensionRequest: null,
    platformProgress: { verified: 0, total: 11 }, exceptionStates: [{ type: 'deadline-approaching', label: 'Deadline in 2 days' }], rejectedPlatforms: [],
  },
  {
    id: 'client-1', name: 'John Smith', status: 'IN_EXECUTION', statusType: 'pending_platform', statusColor: 'blue', agentId: 'user-agent-1', agentName: 'Marcus Rivera',
    days: 9, daysLabel: '9d', canApprove: false, canAssignPhone: false, subStage: 'platform-registrations',
    executionDeadline: new Date('2026-02-25'), deadlineExtensions: 0, pendingExtensionRequest: null,
    platformProgress: { verified: 2, total: 11 }, exceptionStates: [], rejectedPlatforms: [],
  },
  {
    id: 'client-8', name: 'Lisa Anderson', status: 'IN_EXECUTION', statusType: 'pending_platform', statusColor: 'blue', agentId: 'user-agent-1', agentName: 'Marcus Rivera',
    days: 7, daysLabel: '7d', canApprove: false, canAssignPhone: false, subStage: 'platform-registrations',
    executionDeadline: new Date('2026-02-26'), deadlineExtensions: 0, pendingExtensionRequest: null,
    platformProgress: { verified: 7, total: 11 }, exceptionStates: [], rejectedPlatforms: [],
  },
  {
    id: 'client-5', name: 'James Brown', status: 'READY_FOR_APPROVAL', statusType: 'ready', statusColor: 'purple', agentId: 'user-agent-1', agentName: 'Marcus Rivera',
    days: 22, daysLabel: '22d', canApprove: true, canAssignPhone: false, subStage: 'pending-approval',
    executionDeadline: null, deadlineExtensions: 0, pendingExtensionRequest: null,
    platformProgress: { verified: 11, total: 11 }, exceptionStates: [], rejectedPlatforms: [],
  },
  {
    id: 'client-3', name: 'David Lee', status: 'NEEDS_MORE_INFO', statusType: 'needs_info', statusColor: 'yellow', agentId: 'user-agent-1', agentName: 'Marcus Rivera',
    days: 11, daysLabel: '11d', canApprove: false, canAssignPhone: false, subStage: 'verification-needed',
    executionDeadline: new Date('2026-02-22'), deadlineExtensions: 0, pendingExtensionRequest: null,
    platformProgress: { verified: 1, total: 11 }, exceptionStates: [{ type: 'needs-more-info', label: 'Needs additional ID' }], rejectedPlatforms: [],
  },
]

export const MOCK_VERIFICATION_TASKS: VerificationTask[] = [
  {
    id: 'vt-1', clientId: 'client-3', clientName: 'David Lee', platformType: 'DRAFTKINGS' as const, platformLabel: 'DraftKings',
    task: 'Re-upload ID document', agentId: 'user-agent-1', agentName: 'Marcus Rivera',
    deadline: new Date('2026-02-22'), daysUntilDue: 3, deadlineLabel: 'In 3 days', clientDeadline: new Date('2026-02-22'),
    status: 'Pending', screenshots: [],
  },
  {
    id: 'vt-2', clientId: 'client-2', clientName: 'Maria Garcia', platformType: 'BETMGM' as const, platformLabel: 'BetMGM',
    task: 'Upload verification screenshot', agentId: 'user-agent-1', agentName: 'Marcus Rivera',
    deadline: new Date('2026-02-20'), daysUntilDue: 1, deadlineLabel: 'Tomorrow', clientDeadline: new Date('2026-02-28'),
    status: 'Pending', screenshots: [],
  },
]

export const MOCK_POST_APPROVAL_CLIENTS: PostApprovalClient[] = [
  {
    id: 'client-6', name: 'Emily Davis', agentId: 'user-agent-1', agentName: 'Marcus Rivera',
    approvedAt: new Date('2026-02-16'), daysSinceApproval: 3,
    limitedPlatforms: [{ platformType: 'BET365' as const, name: 'Bet365' }],
    pendingVerificationTodos: 1,
  },
]

export const MOCK_LIFECYCLE_CLIENTS = MOCK_SERVER_CLIENTS

// ─── Backoffice Settlement ────────────────────────────────

export const MOCK_SETTLEMENT_CLIENTS: SettlementClient[] = [
  {
    id: 'client-1', name: 'John Smith', totalDeposited: 2450, totalWithdrawn: 0, netBalance: 2450,
    platforms: [
      { name: 'FanDuel', abbrev: 'FD', category: 'sports', deposited: 1500, withdrawn: 0 },
      { name: 'Caesars', abbrev: 'CZR', category: 'sports', deposited: 950, withdrawn: 0 },
    ],
    recentTransactions: [
      { id: 'txn-s1', date: '2026-02-15', type: 'deposit', amount: 1500, platform: 'FanDuel', status: 'completed', settlementStatus: 'PENDING_REVIEW', reviewedBy: null, reviewedAt: null, reviewNotes: null },
      { id: 'txn-s2', date: '2026-02-16', type: 'deposit', amount: 950, platform: 'Caesars', status: 'completed', settlementStatus: 'CONFIRMED', reviewedBy: 'Sarah Chen', reviewedAt: '2026-02-17', reviewNotes: 'Confirmed' },
    ],
    settlementCounts: { pendingReview: 1, confirmed: 1, rejected: 0 },
  },
  {
    id: 'client-6', name: 'Emily Davis', totalDeposited: 8100, totalWithdrawn: 1200, netBalance: 6900,
    platforms: [
      { name: 'DraftKings', abbrev: 'DK', category: 'sports', deposited: 3000, withdrawn: 500 },
      { name: 'FanDuel', abbrev: 'FD', category: 'sports', deposited: 2500, withdrawn: 400 },
      { name: 'BetMGM', abbrev: 'MGM', category: 'sports', deposited: 2600, withdrawn: 300 },
    ],
    recentTransactions: [],
    settlementCounts: { pendingReview: 0, confirmed: 5, rejected: 0 },
  },
]

// ─── Backoffice Commission Overview ───────────────────────

export const MOCK_COMMISSION_OVERVIEW = {
  totalPools: 8,
  totalDistributed: 3200,
  totalRecycled: 200,
  totalPending: 600,
  tierBreakdown: [
    { tier: 'rookie', count: 2 },
    { tier: '1-star', count: 1 },
    { tier: '2-star', count: 2 },
    { tier: '3-star', count: 2 },
    { tier: '4-star', count: 1 },
  ],
  recentPools: [
    {
      id: 'pool-1',
      clientName: 'Emily Davis',
      closerName: 'Marcus Rivera',
      closerStarLevel: 2,
      distributedSlices: 4,
      recycledSlices: 0,
      status: 'distributed',
      createdAt: '2026-02-16',
      allocations: [
        { id: 'alloc-p1', agentName: 'Marcus Rivera', agentStarLevel: 2, type: 'direct', slices: 0, amount: 200, status: 'paid' },
        { id: 'alloc-p2', agentName: 'Marcus Rivera', agentStarLevel: 2, type: 'star_slice', slices: 2, amount: 100, status: 'paid' },
        { id: 'alloc-p3', agentName: 'James Park', agentStarLevel: 4, type: 'star_slice', slices: 2, amount: 100, status: 'paid' },
      ],
    },
  ],
  pendingPayouts: [
    { id: 'alloc-1', agentId: 'user-agent-1', agentName: 'Marcus Rivera', agentStarLevel: 2, clientName: 'Michael Chen', type: 'direct', slices: 0, amount: 200, createdAt: '2026-02-12' },
  ],
  leaderboard: [
    { agentId: 'user-supervisor-1', name: 'James Park', starLevel: 4, tier: '4-star', totalEarned: 9600 },
    { agentId: 'user-agent-1', name: 'Marcus Rivera', starLevel: 2, tier: '2-star', totalEarned: 4800 },
    { agentId: 'user-sub-1', name: 'Alex Kim', starLevel: 1, tier: '1-star', totalEarned: 600 },
  ],
}

// ─── Backoffice Fund Allocation ───────────────────────────

export const MOCK_FUND_CLIENTS = [
  { id: 'client-1', name: 'John Smith' },
  { id: 'client-2', name: 'Maria Garcia' },
  { id: 'client-5', name: 'James Brown' },
  { id: 'client-6', name: 'Emily Davis' },
  { id: 'client-8', name: 'Lisa Anderson' },
]

export const MOCK_FUND_MOVEMENTS = [
  { id: 'fm-1', type: 'internal', flowType: 'same_client', fromClientName: 'Emily Davis', toClientName: 'Emily Davis', fromPlatform: 'Bank', toPlatform: 'DraftKings', amount: 500, fee: null, method: 'transfer', status: 'completed', recordedByName: 'Sarah Chen', createdAt: '2026-02-15T10:00:00Z' },
  { id: 'fm-2', type: 'external', flowType: 'external', fromClientName: 'John Smith', toClientName: '', fromPlatform: 'FanDuel', toPlatform: 'External', amount: 200, fee: 5, method: 'zelle', status: 'completed', recordedByName: 'Sarah Chen', createdAt: '2026-02-16T14:00:00Z' },
]

export const MOCK_FUND_STATS = {
  externalTotal: 32500,
  internalDeposits: 12500,
  pendingCount: 2,
}

// ─── Backoffice Phone Tracking ────────────────────────────

export const MOCK_PHONE_NUMBERS = [
  { id: 'pa-1', number: '(555) 987-6543', client: 'John Smith', clientId: 'client-1', deviceId: 'DEV-001', issuedDate: 'Feb 14, 2026', issuedBy: 'Sarah Chen', status: 'active', notes: null },
  { id: 'pa-2', number: '(555) 987-6544', client: 'Maria Garcia', clientId: 'client-2', deviceId: 'DEV-002', issuedDate: 'Feb 13, 2026', issuedBy: 'Sarah Chen', status: 'active', notes: null },
  { id: 'pa-3', number: '(555) 987-6545', client: 'Lisa Anderson', clientId: 'client-8', deviceId: 'DEV-003', issuedDate: 'Feb 12, 2026', issuedBy: 'Sarah Chen', status: 'active', notes: null },
  { id: 'pa-4', number: '(555) 987-6546', client: 'Unassigned', clientId: '', deviceId: 'DEV-004', issuedDate: '', issuedBy: '', status: 'available', notes: null },
]

export const MOCK_PHONE_STATS = {
  total: 10,
  active: 3,
  pending: 1,
  suspended: 0,
}

export const MOCK_ELIGIBLE_CLIENTS = [
  { id: 'client-7', name: 'Robert Taylor', agentName: 'Marcus Rivera' },
]

// ─── Backoffice Partners ──────────────────────────────────

export const MOCK_PARTNERS_DATA = {
  partners: [
    {
      id: 'partner-1', name: 'Ace Sports Group', contactName: 'Mike Johnson', contactEmail: 'mike@acesports.com', contactPhone: '(555) 400-0001',
      company: 'Ace Sports LLC', type: 'referral', status: 'active', notes: 'Primary referral partner', createdAt: '2025-06-15',
      _count: { clients: 12, profitShareRules: 2, profitShareDetails: 8 },
      profitShareDetails: [
        { id: 'psd-1', grossAmount: 5000, feeAmount: 250, partnerAmount: 2375, companyAmount: 2375, status: 'paid', createdAt: '2026-01-31' },
      ],
    },
    {
      id: 'partner-2', name: 'BetPro Consulting', contactName: 'Lisa Park', contactEmail: 'lisa@betpro.com', contactPhone: '(555) 400-0002',
      company: 'BetPro Inc', type: 'affiliate', status: 'active', notes: null, createdAt: '2025-09-01',
      _count: { clients: 6, profitShareRules: 1, profitShareDetails: 3 },
      profitShareDetails: [],
    },
  ],
  unassignedCount: 5,
  clients: [
    { id: 'client-7', firstName: 'Robert', lastName: 'Taylor', partnerId: null },
    { id: 'client-2', firstName: 'Maria', lastName: 'Garcia', partnerId: null },
  ],
}

// ─── Backoffice Profit Sharing ────────────────────────────

export const MOCK_PROFIT_SHARING_DATA = {
  rules: [
    {
      id: 'rule-1', partnerId: 'partner-1', partner: { id: 'partner-1', name: 'Ace Sports Group' }, name: '50/50 Split', description: 'Standard 50/50 profit share',
      splitType: 'percentage', partnerPercent: 50, companyPercent: 50, fixedAmount: null,
      appliesTo: 'all', platformType: null, minAmount: null, maxAmount: null, feePercent: 5, feeFixed: null,
      status: 'active', effectiveFrom: '2025-06-15', effectiveTo: null, priority: 0,
      createdAt: '2025-06-15', _count: { details: 3 },
      details: [
        { partnerAmount: 1425, companyAmount: 1425, feeAmount: 150, status: 'paid' },
        { partnerAmount: 1425, companyAmount: 1425, feeAmount: 150, status: 'paid' },
        { partnerAmount: 950, companyAmount: 950, feeAmount: 100, status: 'pending' },
      ],
    },
  ],
  pendingPayouts: [
    { id: 'psd-2', partnerId: 'partner-1', partner: { name: 'Ace Sports Group' }, rule: { name: '50/50 Split' }, grossAmount: 3000, feeAmount: 150, partnerAmount: 1425, companyAmount: 1425, status: 'pending', createdAt: '2026-02-15' },
  ],
  totalStats: { _sum: { partnerAmount: 3800, companyAmount: 3800, feeAmount: 400, grossAmount: 8000 }, _count: 11 },
  partners: [
    { id: 'partner-1', name: 'Ace Sports Group' },
    { id: 'partner-2', name: 'BetPro Consulting' },
  ],
}

// ─── Backoffice Reports ───────────────────────────────────

export const MOCK_PARTNER_REPORT = {
  byPartner: [
    { partnerId: 'partner-1', partnerName: 'Ace Sports Group', partnerType: 'referral', grossTotal: 8000, feeTotal: 400, partnerTotal: 3800, companyTotal: 3800, transactionCount: 8, pendingAmount: 950, paidAmount: 2850 },
    { partnerId: 'partner-2', partnerName: 'BetPro Consulting', partnerType: 'investor', grossTotal: 3000, feeTotal: 150, partnerTotal: 1425, companyTotal: 1425, transactionCount: 3, pendingAmount: 0, paidAmount: 1425 },
  ],
  totals: { gross: 11000, fees: 550, partnerShare: 5225, companyShare: 5225, count: 11 },
}

export const MOCK_AGENT_REPORT = {
  byAgent: [
    { agentId: 'user-supervisor-1', agentName: 'James Park', starLevel: 4, tier: '4-Star', directTotal: 6400, starSliceTotal: 1600, backfillTotal: 800, overrideTotal: 800, totalEarned: 9600, pendingAmount: 0, paidAmount: 9600, poolCount: 12 },
    { agentId: 'user-agent-1', agentName: 'Marcus Rivera', starLevel: 2, tier: '2-Star', directTotal: 3200, starSliceTotal: 800, backfillTotal: 400, overrideTotal: 400, totalEarned: 4800, pendingAmount: 600, paidAmount: 4200, poolCount: 8 },
    { agentId: 'user-sub-1', agentName: 'Alex Kim', starLevel: 1, tier: '1-Star', directTotal: 400, starSliceTotal: 100, backfillTotal: 50, overrideTotal: 50, totalEarned: 600, pendingAmount: 200, paidAmount: 400, poolCount: 2 },
  ],
  totals: { totalEarned: 15000, totalDirect: 10000, totalOverride: 5000, totalPending: 800, count: 3 },
}

export const MOCK_LTV_REPORT = {
  clients: [
    { clientId: 'client-6', clientName: 'Emily Davis', agentName: 'Marcus Rivera', partnerName: null, daysSinceCreated: 35, totalDeposited: 8100, totalWithdrawn: 1200, netFlow: 6900, commissionCost: 400, ltv: 6500, monthlyLTV: 5571 },
    { clientId: 'client-5', clientName: 'James Brown', agentName: 'Marcus Rivera', partnerName: 'Ace Sports Group', daysSinceCreated: 20, totalDeposited: 5200, totalWithdrawn: 0, netFlow: 5200, commissionCost: 0, ltv: 5200, monthlyLTV: 7800 },
  ],
  totals: { totalLTV: 11700, avgLTV: 5850, totalDeposited: 13300, totalWithdrawn: 1200, totalCommissionCost: 400, clientCount: 2 },
}

// ─── Backoffice Action Hub ────────────────────────────────

export const MOCK_ACTION_HUB_STATS: ActionHubStats = {
  pnlCompleted: false,
  pendingActions: 5,
  overdueCount: 1,
  fundAlertsCount: 2,
  pendingSettlements: 3,
  transfersToday: 1,
}

export const MOCK_PNL_STATUS: PnlStatus = {
  completed: false,
  completedBy: null,
  completedAtFormatted: null,
}

export const MOCK_FUND_ALERTS: FundAlert[] = [
  { clientId: 'client-1', clientName: 'John Smith', issue: 'shortfall', platformType: 'DRAFTKINGS', balance: -150, description: 'DraftKings balance below threshold' },
  { clientId: 'client-6', clientName: 'Emily Davis', issue: 'surplus', platformType: 'FANDUEL', balance: 2500, description: 'FanDuel balance exceeds $1,000' },
]

export const MOCK_PENDING_ACTIONS: PendingAction[] = [
  { id: 'pa-1', type: 'screenshot_review', title: 'Review DraftKings screenshot', clientName: 'John Smith', agentName: 'Marcus Rivera', urgency: 'high', createdAt: new Date('2026-02-18'), ageFormatted: '1d ago', link: '/backoffice/sales-interaction' },
  { id: 'pa-2', type: 'extension_request', title: 'Extension request for Sarah Wilson', clientName: 'Sarah Wilson', agentName: 'Marcus Rivera', urgency: 'normal', createdAt: new Date('2026-02-18'), ageFormatted: '1d ago', link: '/backoffice/sales-interaction' },
  { id: 'pa-3', type: 'client_approval', title: 'Review James Brown for approval', clientName: 'James Brown', agentName: 'Marcus Rivera', urgency: 'high', createdAt: new Date('2026-02-18'), ageFormatted: '1d ago', link: '/backoffice/sales-interaction' },
  { id: 'pa-4', type: 'settlement_review', title: 'Pending settlement review', clientName: 'John Smith', agentName: 'Marcus Rivera', urgency: 'critical', createdAt: new Date('2026-02-17'), ageFormatted: '2d ago', link: '/backoffice/client-settlement' },
]

export const MOCK_AGENT_TASKS: EnhancedAgentTasks[] = [
  {
    agentId: 'user-agent-1', agentName: 'Marcus Rivera',
    tasks: [
      { id: 'et-1', title: 'Upload DraftKings screenshot', client: 'John Smith', clientId: 'client-1', category: 'Upload', type: 'UPLOAD_SCREENSHOT', status: 'PENDING', dueIn: 'Today', dueDate: new Date('2026-02-19'), overdue: false },
      { id: 'et-2', title: 'Complete BetMGM registration', client: 'John Smith', clientId: 'client-1', category: 'Execution', type: 'EXECUTION', status: 'PENDING', dueIn: 'In 3 days', dueDate: new Date('2026-02-22'), overdue: false },
      { id: 'et-3', title: 'Provide additional ID', client: 'David Lee', clientId: 'client-3', category: 'Info', type: 'PROVIDE_INFO', status: 'OVERDUE', dueIn: 'Overdue', dueDate: new Date('2026-02-17'), overdue: true },
    ],
  },
  {
    agentId: 'user-sub-1', agentName: 'Alex Kim',
    tasks: [
      { id: 'et-4', title: 'Upload Caesars screenshot', client: 'New Client A', clientId: 'client-9', category: 'Upload', type: 'UPLOAD_SCREENSHOT', status: 'PENDING', dueIn: 'Tomorrow', dueDate: new Date('2026-02-20'), overdue: false },
    ],
  },
]

export const MOCK_ACTIVE_AGENTS: ActiveAgent[] = [
  { id: 'user-agent-1', name: 'Marcus Rivera' },
  { id: 'user-supervisor-1', name: 'James Park' },
  { id: 'user-sub-1', name: 'Alex Kim' },
  { id: 'user-sub-2', name: 'Jamie Torres' },
]

// ─── Notifications ────────────────────────────────────────

export const MOCK_NOTIFICATIONS = [
  { id: 'notif-1', type: 'approval', title: 'Client Approved', message: 'Emily Davis has been approved', link: '/agent/clients/client-6', isRead: false, createdAt: new Date('2026-02-16T12:00:00Z') },
  { id: 'notif-2', type: 'todo', title: 'New Task Assigned', message: 'Upload DraftKings screenshot for John Smith', link: '/agent/todo-list', isRead: false, createdAt: new Date('2026-02-17T10:00:00Z') },
  { id: 'notif-3', type: 'extension', title: 'Extension Approved', message: 'Deadline extension approved for Maria Garcia', link: '/agent/clients/client-2', isRead: true, createdAt: new Date('2026-02-15T09:00:00Z') },
]

// ─── Backoffice Extension Requests ────────────────────────

export const MOCK_EXTENSION_REQUESTS = [
  {
    id: 'ext-1', clientId: 'client-4', clientName: 'Sarah Wilson', agentName: 'Marcus Rivera',
    reason: 'Client traveling, needs extra time for platform registrations', requestedDays: 3,
    currentDeadline: '2026-02-21', status: 'PENDING', createdAt: '2026-02-18T16:00:00Z',
  },
]

// ─── Backoffice Delayed Clients ───────────────────────────

export const MOCK_DELAYED_CLIENTS = [
  {
    id: 'client-3', name: 'David Lee', agentName: 'Marcus Rivera', status: 'NEEDS_MORE_INFO',
    daysDelayed: 2, reason: 'Waiting for additional ID documentation',
  },
]
