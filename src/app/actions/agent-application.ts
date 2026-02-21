'use server'

import { hash } from 'bcryptjs'
import prisma from '@/backend/prisma/client'
import { agentApplicationSchema } from '@/lib/validations/agent-application'

export async function submitAgentApplication(formData: FormData) {
  const raw = {
    firstName: formData.get('firstName') as string,
    lastName: formData.get('lastName') as string,
    email: formData.get('email') as string,
    phone: formData.get('phone') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
    gender: (formData.get('gender') as string) || undefined,
    dateOfBirth: (formData.get('dateOfBirth') as string) || undefined,
    citizenship: (formData.get('citizenship') as string) || undefined,
    address: (formData.get('address') as string) || undefined,
    city: (formData.get('city') as string) || undefined,
    state: (formData.get('state') as string) || undefined,
    zipCode: (formData.get('zipCode') as string) || undefined,
    idExpiry: (formData.get('idExpiry') as string) || undefined,
    zelle: (formData.get('zelle') as string) || undefined,
    referredByName: (formData.get('referredByName') as string) || undefined,
  }

  const idDocumentPath = (formData.get('idDocument') as string) || undefined
  const addressDocumentPath = (formData.get('addressDocument') as string) || undefined

  // Validate
  const parsed = agentApplicationSchema.safeParse(raw)
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors
    return { success: false, errors }
  }

  const data = parsed.data

  // Check email uniqueness against User table
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  })
  if (existingUser) {
    return {
      success: false,
      errors: { email: ['An account with this email already exists'] },
    }
  }

  // Check email uniqueness against pending applications
  const existingApp = await prisma.agentApplication.findFirst({
    where: { email: data.email, status: 'PENDING' },
  })
  if (existingApp) {
    return {
      success: false,
      errors: { email: ['A pending application with this email already exists'] },
    }
  }

  // Hash password
  const hashedPassword = await hash(data.password, 12)

  // Create application
  const application = await prisma.agentApplication.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      password: hashedPassword,
      gender: data.gender || null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      citizenship: data.citizenship || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zipCode: data.zipCode || null,
      country: 'US',
      idDocument: idDocumentPath || null,
      addressDocument: addressDocumentPath || null,
      idExpiry: data.idExpiry ? new Date(data.idExpiry) : null,
      zelle: data.zelle || null,
      referredByName: data.referredByName || null,
    },
  })

  // Log event
  await prisma.eventLog.create({
    data: {
      eventType: 'APPLICATION_SUBMITTED',
      description: `Agent application submitted by ${data.firstName} ${data.lastName}`,
      metadata: { applicationId: application.id, email: data.email },
    },
  })

  return { success: true, applicationId: application.id }
}
