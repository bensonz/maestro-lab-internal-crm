'use server'

import { hash } from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import prisma from '@/backend/prisma/client'
import { auth } from '@/backend/auth'

export async function createUser(formData: FormData) {
  const session = await auth()
  if (!session?.user) {
    return { success: false, error: 'Not authenticated' }
  }
  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Not authorized' }
  }

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const role = formData.get('role') as string
  const phone = (formData.get('phone') as string) || null
  const supervisorId = (formData.get('supervisorId') as string) || null

  if (!name || !email || !password || !role) {
    return { success: false, error: 'Name, email, password, and role are required' }
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return { success: false, error: 'A user with this email already exists' }
  }

  const passwordHash = await hash(password, 12)

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: role as 'AGENT' | 'BACKOFFICE' | 'ADMIN' | 'FINANCE',
      phone,
      supervisorId,
    },
  })

  await prisma.eventLog.create({
    data: {
      eventType: 'USER_CREATED',
      description: `User ${name} (${role}) created by ${session.user.name}`,
      userId: session.user.id,
      metadata: { createdUserId: user.id, email, role },
    },
  })

  revalidatePath('/backoffice/agent-management')
  revalidatePath('/backoffice/login-management')
  return { success: true, userId: user.id }
}

export async function updateUser(userId: string, formData: FormData) {
  const session = await auth()
  if (!session?.user) {
    return { success: false, error: 'Not authenticated' }
  }
  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Not authorized' }
  }

  const name = (formData.get('name') as string) || undefined
  const email = (formData.get('email') as string) || undefined
  const role = (formData.get('role') as string) || undefined
  const phone = formData.get('phone') as string | null
  const supervisorId = formData.get('supervisorId') as string | null

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return { success: false, error: 'User not found' }
  }

  // Check email uniqueness if changed
  if (email && email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return { success: false, error: 'A user with this email already exists' }
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name && { name }),
      ...(email && { email }),
      ...(role && { role: role as 'AGENT' | 'BACKOFFICE' | 'ADMIN' | 'FINANCE' }),
      ...(phone !== undefined && { phone }),
      ...(supervisorId !== undefined && { supervisorId }),
    },
  })

  await prisma.eventLog.create({
    data: {
      eventType: 'USER_UPDATED',
      description: `User ${user.name} updated by ${session.user.name}`,
      userId: session.user.id,
      metadata: { updatedUserId: userId },
    },
  })

  revalidatePath('/backoffice/agent-management')
  revalidatePath('/backoffice/login-management')
  return { success: true }
}

export async function toggleUserActive(userId: string) {
  const session = await auth()
  if (!session?.user) {
    return { success: false, error: 'Not authenticated' }
  }
  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Not authorized' }
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return { success: false, error: 'User not found' }
  }

  const newStatus = !user.isActive

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: newStatus },
  })

  await prisma.eventLog.create({
    data: {
      eventType: newStatus ? 'USER_UPDATED' : 'USER_DEACTIVATED',
      description: `User ${user.name} ${newStatus ? 'activated' : 'deactivated'} by ${session.user.name}`,
      userId: session.user.id,
      metadata: { targetUserId: userId, newStatus },
    },
  })

  revalidatePath('/backoffice/agent-management')
  revalidatePath('/backoffice/login-management')
  return { success: true, isActive: newStatus }
}

// Whitelist of fields editable via inline editing on agent detail page.
// Maps UI field key → Prisma User column name.
const EDITABLE_AGENT_FIELDS: Record<string, string> = {
  companyPhone: 'companyPhone',
  carrier: 'carrier',
  personalEmail: 'personalEmail',
  personalPhone: 'personalPhone',
  zelle: 'zelle',
  address: 'address',
  loginAccount: 'loginAccount',
  idNumber: 'idNumber',
  citizenship: 'citizenship',
}

// Human-readable labels for event log descriptions
const FIELD_LABELS: Record<string, string> = {
  companyPhone: 'Company Phone',
  carrier: 'Carrier',
  personalEmail: 'Personal Email',
  personalPhone: 'Personal Phone',
  zelle: 'Zelle',
  address: 'Address',
  loginAccount: 'Login Account',
  idNumber: 'ID Number',
  citizenship: 'Citizenship',
}

export async function updateAgentField(
  agentId: string,
  field: string,
  oldValue: string,
  newValue: string,
) {
  const session = await auth()
  if (!session?.user) {
    return { success: false, error: 'Not authenticated' }
  }
  if (session.user.role !== 'ADMIN' && session.user.role !== 'BACKOFFICE') {
    return { success: false, error: 'Not authorized' }
  }

  const dbColumn = EDITABLE_AGENT_FIELDS[field]
  if (!dbColumn) {
    return { success: false, error: `Field "${field}" is not editable` }
  }

  const user = await prisma.user.findUnique({ where: { id: agentId } })
  if (!user) {
    return { success: false, error: 'Agent not found' }
  }

  const trimmed = newValue.trim()

  await prisma.user.update({
    where: { id: agentId },
    data: { [dbColumn]: trimmed || null },
  })

  const label = FIELD_LABELS[field] ?? field
  await prisma.eventLog.create({
    data: {
      eventType: 'USER_UPDATED',
      description: `Updated ${label}: ${oldValue || '\u2014'} \u2192 ${trimmed || '\u2014'}`,
      userId: session.user.id,
      metadata: { updatedUserId: agentId, field, oldValue, newValue: trimmed },
    },
  })

  revalidatePath(`/backoffice/agent-management/${agentId}`)
  revalidatePath('/backoffice/agent-management')
  return { success: true }
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const session = await auth()
  if (!session?.user) {
    return { success: false, error: 'Not authenticated' }
  }
  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Not authorized' }
  }

  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' }
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return { success: false, error: 'User not found' }
  }

  const passwordHash = await hash(newPassword, 12)
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  })

  revalidatePath('/backoffice/agent-management')
  revalidatePath('/backoffice/login-management')
  return { success: true }
}
