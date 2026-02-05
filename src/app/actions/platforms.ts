'use server'

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { getStorage } from '@/lib/storage'
import { PlatformStatus, EventType, PlatformType } from '@/types'
import { revalidatePath } from 'next/cache'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function uploadPlatformScreenshot(
  clientId: string,
  platformType: PlatformType,
  formData: FormData
): Promise<{ success: boolean; error?: string; path?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  const file = formData.get('file') as File
  if (!file) {
    return { success: false, error: 'No file provided' }
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { success: false, error: 'Invalid file type. Please upload JPG, PNG, or WebP.' }
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: 'File too large. Maximum size is 5MB.' }
  }

  // Verify agent owns this client
  const client = await prisma.client.findFirst({
    where: { id: clientId, agentId: session.user.id },
    select: { id: true },
  })

  if (!client) {
    return { success: false, error: 'Client not found' }
  }

  try {
    // Get storage provider
    const storage = getStorage()

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg'
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const filepath = `uploads/clients/${clientId}/platforms/${platformType}/${filename}`

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer())
    await storage.save(filepath, buffer)

    // Update ClientPlatform
    await prisma.clientPlatform.update({
      where: {
        clientId_platformType: { clientId, platformType },
      },
      data: {
        screenshots: { push: filepath },
        status: PlatformStatus.PENDING_REVIEW,
      },
    })

    // Log event
    await prisma.eventLog.create({
      data: {
        eventType: EventType.PLATFORM_UPLOAD,
        description: `Screenshot uploaded for ${platformType}`,
        clientId,
        userId: session.user.id,
        metadata: { platformType, path: filepath },
      },
    })

    revalidatePath(`/agent/clients/${clientId}`)

    return { success: true, path: filepath }
  } catch (error) {
    console.error('Upload error:', error)
    return { success: false, error: 'Failed to upload screenshot' }
  }
}

export async function deletePlatformScreenshot(
  clientId: string,
  platformType: PlatformType,
  screenshotPath: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  // Verify agent owns this client
  const client = await prisma.client.findFirst({
    where: { id: clientId, agentId: session.user.id },
    select: { id: true },
  })

  if (!client) {
    return { success: false, error: 'Client not found' }
  }

  try {
    // Get current platform data
    const platform = await prisma.clientPlatform.findUnique({
      where: {
        clientId_platformType: { clientId, platformType },
      },
      select: { screenshots: true },
    })

    if (!platform) {
      return { success: false, error: 'Platform not found' }
    }

    // Remove screenshot from array
    const updatedScreenshots = platform.screenshots.filter((s) => s !== screenshotPath)

    // Update platform
    await prisma.clientPlatform.update({
      where: {
        clientId_platformType: { clientId, platformType },
      },
      data: {
        screenshots: updatedScreenshots,
        // If no screenshots left, revert to PENDING_UPLOAD
        status:
          updatedScreenshots.length === 0
            ? PlatformStatus.PENDING_UPLOAD
            : PlatformStatus.PENDING_REVIEW,
      },
    })

    // Delete file from storage
    const storage = getStorage()
    await storage.delete(screenshotPath)

    // Log event
    await prisma.eventLog.create({
      data: {
        eventType: EventType.PLATFORM_UPLOAD,
        description: `Screenshot deleted for ${platformType}`,
        clientId,
        userId: session.user.id,
        metadata: { platformType, path: screenshotPath, action: 'delete' },
      },
    })

    revalidatePath(`/agent/clients/${clientId}`)

    return { success: true }
  } catch (error) {
    console.error('Delete error:', error)
    return { success: false, error: 'Failed to delete screenshot' }
  }
}
