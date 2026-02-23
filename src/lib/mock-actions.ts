/* eslint-disable @typescript-eslint/no-unused-vars */
// ============================================================
// No-op stubs for every server action imported by UI components.
// All mutations are no-ops that return { success: true, error: undefined as string | undefined }.
// ============================================================

type ActionResult = { success: boolean; error?: string; [key: string]: unknown }

// --- notifications ---
export async function getNotifications() {
  return { notifications: [] as { id: string; type: string; title: string; message: string; link: string | null; isRead: boolean; readAt: Date | null; createdAt: Date }[], unreadCount: 0 }
}
export async function markNotificationRead(id: string) {
  return { success: true, error: undefined as string | undefined }
}
export async function markAllNotificationsRead() {
  return { success: true, error: undefined as string | undefined }
}

// --- todos ---
export async function uploadToDoScreenshots(
  todoId: string,
  formData: FormData,
) {
  return { success: true, error: undefined as string | undefined, paths: [] as string[], detections: null as import('@/types/backend-types').AIDetection[] | null }
}
export async function confirmToDoUpload(todoId: string, detections?: unknown) {
  return { success: true, error: undefined as string | undefined }
}
export async function requestToDoExtension(
  todoId: string,
  reason?: string,
) {
  return { success: true, error: undefined as string | undefined, newDueDate: new Date(Date.now() + 3 * 86400000).toISOString() }
}
export async function nudgeTeamMember(agentId: string) {
  return { success: true, error: undefined as string | undefined }
}

// --- backoffice ---
export async function approveClientIntake(clientId: string) {
  return { success: true, error: undefined as string | undefined }
}
export async function rejectClientIntake(
  clientId: string,
  reason?: string,
) {
  return { success: true, error: undefined as string | undefined }
}
export async function updatePlatformStatus(
  platformId: string,
  status: string,
  notes?: string,
) {
  return { success: true, error: undefined as string | undefined }
}

// --- extensions ---
export async function requestDeadlineExtension(
  clientId: string,
  reason: string,
  days?: number,
) {
  return { success: true, error: undefined as string | undefined }
}
export async function approveExtensionRequest(
  requestId: string,
  notes?: string,
) {
  return { success: true, error: undefined as string | undefined }
}
export async function rejectExtensionRequest(
  requestId: string,
  notes?: string,
) {
  return { success: true, error: undefined as string | undefined }
}

// --- user-management ---
export async function createUser(data: FormData | Record<string, unknown>) {
  return { success: true, error: undefined as string | undefined }
}
export async function updateUser(
  userId: string,
  data: FormData | Record<string, unknown>,
) {
  return { success: true, error: undefined as string | undefined }
}
export async function resetUserPassword(
  userId: string,
  newPassword: string,
) {
  return { success: true, error: undefined as string | undefined }
}
export async function toggleUserActive(userId: string) {
  return { success: true, error: undefined as string | undefined }
}

// --- commission ---
export async function markAllocationPaid(allocationId: string) {
  return { success: true, error: undefined as string | undefined }
}
export async function bulkMarkPaid(allocationIds: string[]) {
  return { success: true, error: undefined as string | undefined, updated: allocationIds.length }
}

// --- settlements ---
export async function confirmSettlement(
  data: string | { movementId: string; notes?: string },
  notes?: string,
) {
  return { success: true, error: undefined as string | undefined }
}
export async function rejectSettlement(
  data: string | { movementId: string; notes?: string },
  notes?: string,
) {
  return { success: true, error: undefined as string | undefined }
}

// --- fund-movements ---
export async function recordFundMovement(data: Record<string, unknown>) {
  return { success: true, error: undefined as string | undefined }
}

// --- partners ---
export async function createPartner(data: Record<string, unknown>) {
  return { success: true, error: undefined as string | undefined }
}
export async function updatePartner(
  partnerId: string,
  data: Record<string, unknown>,
) {
  return { success: true, error: undefined as string | undefined }
}
export async function deletePartner(partnerId: string) {
  return { success: true, error: undefined as string | undefined }
}
export async function assignClientToPartner(
  data: { clientId: string; partnerId: string | null } | string,
  partnerId?: string,
) {
  return { success: true, error: undefined as string | undefined }
}

// --- action-hub ---
export async function completeTodoAsBackoffice(todoId: string) {
  return { success: true, error: undefined as string | undefined }
}
export async function createBackofficeTodo(data: Record<string, unknown>) {
  return { success: true, error: undefined as string | undefined }
}
export async function markDailyPnlComplete(notes?: string) {
  return { success: true, error: undefined as string | undefined, alreadyCompleted: false }
}

// --- status ---
export async function checkOverdueClients() {
  return { success: true, error: undefined as string | undefined, count: 0, marked: 0 }
}
export async function resumeExecution(clientId: string, days?: number) {
  return { success: true, error: undefined as string | undefined }
}
export async function changeClientStatus(
  clientId: string,
  status: string,
  reason?: string,
) {
  return { success: true, error: undefined as string | undefined }
}
export async function startExecution(clientId: string) {
  return { success: true, error: undefined as string | undefined }
}

// --- profit-sharing ---
export async function createProfitShareRule(data: Record<string, unknown>) {
  return { success: true, error: undefined as string | undefined }
}
export async function deactivateRule(ruleId: string) {
  return { success: true, error: undefined as string | undefined }
}
export async function markProfitSharePaid(detailId: string) {
  return { success: true, error: undefined as string | undefined }
}
export async function bulkMarkProfitSharePaid(detailIds: string[]) {
  return { success: true, error: undefined as string | undefined, updated: detailIds.length }
}
export async function createDistributionPeriod(
  data: Record<string, unknown>,
) {
  return { success: true, error: undefined as string | undefined }
}

// --- phones ---
export async function assignPhone(clientId: string, phoneNumber?: string, deviceId?: string, notes?: string) {
  return { success: true, error: undefined as string | undefined }
}
export async function signOutPhone(assignmentId: string) {
  return { success: true, error: undefined as string | undefined }
}
export async function returnPhone(assignmentId: string) {
  return { success: true, error: undefined as string | undefined }
}

// --- closure ---
export async function closeClientAction(data: Record<string, unknown>) {
  return { success: true, error: undefined as string | undefined }
}
export async function checkBalancesAction(clientId: string) {
  return { success: true, error: undefined as string | undefined, balances: [] as unknown[], breakdown: {} as Record<string, { balance: number }>, allZero: true }
}

// --- platforms ---
export async function approvePlatformScreenshot(
  clientId: string,
  platformType?: string,
  notes?: string,
) {
  return { success: true, error: undefined as string | undefined }
}
export async function rejectPlatformScreenshot(
  clientId: string,
  platformType?: string,
  notes?: string,
) {
  return { success: true, error: undefined as string | undefined }
}
export async function requestMoreInfo(
  clientId: string,
  platformType?: string,
  notes?: string,
) {
  return { success: true, error: undefined as string | undefined }
}

// Backwards-compat aliases used by some components
export const approveScreenshot = approvePlatformScreenshot
export const rejectScreenshot = rejectPlatformScreenshot
