'use server'

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { UserRole, EventType } from '@/types'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'

const ALLOWED_ROLES = new Set<UserRole>([UserRole.ADMIN, UserRole.BACKOFFICE])
const ALL_ROLES = new Set<UserRole>([UserRole.AGENT, UserRole.BACKOFFICE, UserRole.ADMIN, UserRole.FINANCE])

export async function createUser(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (!currentUser || !ALLOWED_ROLES.has(currentUser.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  const name = formData.get('name') as string | null
  const email = formData.get('email') as string | null
  const password = formData.get('password') as string | null
  const role = formData.get('role') as UserRole | null
  const phone = formData.get('phone') as string | null

  if (!name || !name.trim()) {
    return { success: false, error: 'Name is required' }
  }
  if (!email || !email.trim()) {
    return { success: false, error: 'Email is required' }
  }
  if (!password || password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' }
  }
  if (!role || !ALL_ROLES.has(role)) {
    return { success: false, error: 'Invalid role' }
  }

  // BACKOFFICE users can only create AGENT accounts
  if (currentUser.role === UserRole.BACKOFFICE && role !== UserRole.AGENT) {
    return { success: false, error: 'Backoffice users can only create Agent accounts' }
  }

  // Check email uniqueness
  const existing = await prisma.user.findUnique({ where: { email: email.trim() } })
  if (existing) {
    return { success: false, error: 'Email is already in use' }
  }

  const passwordHash = bcrypt.hashSync(password, 10)

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim(),
      passwordHash,
      role,
      phone: phone?.trim() || null,
    },
  })

  // Create AgentMetrics if role is AGENT
  if (role === UserRole.AGENT) {
    await prisma.agentMetrics.create({
      data: { agentId: user.id },
    })
  }

  await prisma.eventLog.create({
    data: {
      eventType: EventType.USER_CREATED,
      description: `Created user account: ${user.email} (${role})`,
      userId: session.user.id,
    },
  })

  revalidatePath('/backoffice/agent-management')
  return { success: true }
}

export async function updateUser(
  userId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (!currentUser || !ALLOWED_ROLES.has(currentUser.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true },
  })
  if (!targetUser) {
    return { success: false, error: 'User not found' }
  }

  const name = formData.get('name') as string | null
  const email = formData.get('email') as string | null
  const role = formData.get('role') as UserRole | null
  const phone = formData.get('phone') as string | null

  if (!name || !name.trim()) {
    return { success: false, error: 'Name is required' }
  }
  if (!email || !email.trim()) {
    return { success: false, error: 'Email is required' }
  }

  // Check email uniqueness (exclude current user)
  if (email.trim() !== targetUser.email) {
    const existing = await prisma.user.findUnique({ where: { email: email.trim() } })
    if (existing) {
      return { success: false, error: 'Email is already in use' }
    }
  }

  // Role change validation
  if (role && role !== targetUser.role) {
    if (!ALL_ROLES.has(role)) {
      return { success: false, error: 'Invalid role' }
    }
    // Cannot change own role
    if (userId === session.user.id) {
      return { success: false, error: 'Cannot change your own role' }
    }
    // BACKOFFICE can only set AGENT role
    if (currentUser.role === UserRole.BACKOFFICE && role !== UserRole.AGENT) {
      return { success: false, error: 'Backoffice users can only assign Agent role' }
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: name.trim(),
      email: email.trim(),
      role: role || undefined,
      phone: phone?.trim() || null,
    },
  })

  await prisma.eventLog.create({
    data: {
      eventType: EventType.USER_UPDATED,
      description: `Updated user account: ${email}`,
      userId: session.user.id,
    },
  })

  revalidatePath('/backoffice/agent-management')
  return { success: true }
}

export async function toggleUserActive(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (!currentUser || currentUser.role !== UserRole.ADMIN) {
    return { success: false, error: 'Only admins can toggle user status' }
  }

  if (userId === session.user.id) {
    return { success: false, error: 'Cannot deactivate yourself' }
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isActive: true, email: true },
  })
  if (!targetUser) {
    return { success: false, error: 'User not found' }
  }

  const newStatus = !targetUser.isActive

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: newStatus },
  })

  await prisma.eventLog.create({
    data: {
      eventType: EventType.USER_DEACTIVATED,
      description: `${newStatus ? 'Activated' : 'Deactivated'} user: ${targetUser.email}`,
      userId: session.user.id,
    },
  })

  revalidatePath('/backoffice/agent-management')
  return { success: true }
}

export async function resetUserPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (!currentUser || !ALLOWED_ROLES.has(currentUser.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  if (newPassword.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' }
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true },
  })
  if (!targetUser) {
    return { success: false, error: 'User not found' }
  }

  // BACKOFFICE can only reset AGENT passwords
  if (currentUser.role === UserRole.BACKOFFICE && targetUser.role !== UserRole.AGENT) {
    return { success: false, error: 'Backoffice users can only reset Agent passwords' }
  }

  const passwordHash = bcrypt.hashSync(newPassword, 10)

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  })

  revalidatePath('/backoffice/agent-management')
  return { success: true }
}
