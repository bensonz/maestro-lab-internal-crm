'use server'

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { getStorage } from '@/backend/storage'
import { ToDoStatus, PlatformStatus, EventType, UserRole } from '@/types'
import { revalidatePath } from 'next/cache'
import { notifyRole } from '@/backend/services/notifications'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILES = 5

export interface AIDetection {
  path: string
  contentType: string
  confidence: number
  extracted: Record<string, string>
}

// Mock AI detection - returns fake results based on filename patterns
function mockAIDetection(
  filename: string,
  platformType?: string,
): Omit<AIDetection, 'path'> {
  // Simulate different content types based on filename hints
  const lowerName = filename.toLowerCase()

  if (lowerName.includes('login') || lowerName.includes('credential')) {
    return {
      contentType: 'Online Banking Login',
      confidence: 0.94,
      extracted: {
        platform:
          platformType === 'BANK' ? 'Chase Bank' : platformType || 'Unknown',
        username: 'sjohnson_ops',
        password: 'securepass123',
      },
    }
  }

  if (lowerName.includes('balance') || lowerName.includes('dashboard')) {
    return {
      contentType: 'Balance Screenshot',
      confidence: 0.91,
      extracted: {
        platform: platformType || 'PayPal',
        balance: '$1,234.56',
      },
    }
  }

  if (lowerName.includes('address') || lowerName.includes('verification')) {
    return {
      contentType: 'Address Verification',
      confidence: 0.88,
      extracted: {
        platform: platformType || 'Edgeboost',
        address: '123 Main St, Austin, TX 78701',
      },
    }
  }

  // Default: platform registration
  return {
    contentType: 'Platform Registration',
    confidence: 0.85,
    extracted: {
      platform: platformType || 'Unknown Platform',
      email: 'sarah.j.0101@company-ops.com',
      username: 'sjohnson_ops',
    },
  }
}

export async function uploadToDoScreenshots(
  todoId: string,
  formData: FormData,
): Promise<{
  success: boolean
  error?: string
  detections?: AIDetection[]
}> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  // Get the To-Do and verify ownership
  const todo = await prisma.toDo.findFirst({
    where: { id: todoId },
    include: {
      client: {
        select: { id: true, agentId: true },
      },
    },
  })

  if (!todo || todo.client?.agentId !== session.user.id) {
    return { success: false, error: 'To-Do not found' }
  }

  // Get all files from formData
  const files: File[] = []
  for (const [key, value] of formData.entries()) {
    if (key === 'files' && value instanceof File) {
      files.push(value)
    }
  }

  if (files.length === 0) {
    return { success: false, error: 'No files provided' }
  }

  if (files.length > MAX_FILES) {
    return { success: false, error: `Maximum ${MAX_FILES} files allowed` }
  }

  // Validate all files
  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        success: false,
        error: `Invalid file type: ${file.name}. Please upload JPG, PNG, or WebP.`,
      }
    }
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File too large: ${file.name}. Maximum size is 5MB.`,
      }
    }
  }

  try {
    const storage = getStorage()
    const detections: AIDetection[] = []

    for (const file of files) {
      // Generate unique filename
      const ext = file.name.split('.').pop() || 'jpg'
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const filepath = `uploads/todos/${todoId}/${filename}`

      // Save file
      const buffer = Buffer.from(await file.arrayBuffer())
      const result = await storage.upload(buffer, filepath, file.type)

      // Mock AI detection
      const detection = mockAIDetection(
        file.name,
        todo.platformType || undefined,
      )
      detections.push({
        path: result.url,
        ...detection,
      })
    }

    return { success: true, detections }
  } catch (error) {
    console.error('Upload error:', error)
    return { success: false, error: 'Failed to upload screenshots' }
  }
}

export async function confirmToDoUpload(
  todoId: string,
  detections: AIDetection[],
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  // Get the To-Do and verify ownership
  const todo = await prisma.toDo.findFirst({
    where: { id: todoId },
    include: {
      client: {
        select: { id: true, agentId: true },
      },
    },
  })

  if (!todo || todo.client?.agentId !== session.user.id) {
    return { success: false, error: 'To-Do not found' }
  }

  if (!todo.clientId) {
    return { success: false, error: 'To-Do not associated with a client' }
  }

  try {
    // Extract screenshot paths
    const screenshotPaths = detections.map((d) => d.path)

    // Update To-Do with screenshots and mark as completed
    await prisma.toDo.update({
      where: { id: todoId },
      data: {
        screenshots: screenshotPaths,
        status: ToDoStatus.COMPLETED,
        completedAt: new Date(),
        metadata: {
          ...((todo.metadata as Record<string, unknown>) || {}),
          aiDetections: detections.map((d) => ({
            path: d.path,
            contentType: d.contentType,
            confidence: d.confidence,
            extracted: d.extracted,
          })),
        },
      },
    })

    // If linked to a platform, update platform status and add screenshots
    if (todo.platformType) {
      const platform = await prisma.clientPlatform.findUnique({
        where: {
          clientId_platformType: {
            clientId: todo.clientId,
            platformType: todo.platformType,
          },
        },
      })

      if (platform) {
        // Extract username from detections if available
        const usernameDetection = detections.find((d) => d.extracted.username)

        await prisma.clientPlatform.update({
          where: {
            clientId_platformType: {
              clientId: todo.clientId,
              platformType: todo.platformType,
            },
          },
          data: {
            screenshots: [...platform.screenshots, ...screenshotPaths],
            status: PlatformStatus.PENDING_REVIEW,
            username:
              usernameDetection?.extracted.username || platform.username,
          },
        })
      }
    }

    // Log event
    await prisma.eventLog.create({
      data: {
        eventType: EventType.TODO_COMPLETED,
        description: `To-Do completed: ${todo.title}`,
        clientId: todo.clientId,
        userId: session.user.id,
        metadata: {
          todoId,
          screenshotCount: screenshotPaths.length,
          platformType: todo.platformType,
        },
      },
    })

    try {
      await notifyRole({
        role: [UserRole.ADMIN, UserRole.BACKOFFICE],
        type: EventType.TODO_COMPLETED,
        title: 'Task completed',
        message: `Task completed: ${todo.title}`,
        link: '/backoffice/todo-list',
        clientId: todo.clientId ?? undefined,
      })
    } catch {
      // Notification failure should not block the main action
    }

    revalidatePath(`/agent/clients/${todo.clientId}`)

    return { success: true }
  } catch (error) {
    console.error('Confirm upload error:', error)
    return { success: false, error: 'Failed to confirm upload' }
  }
}

export async function requestToDoExtension(
  todoId: string,
): Promise<{ success: boolean; error?: string; newDueDate?: Date }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  // Get the To-Do and verify ownership
  const todo = await prisma.toDo.findFirst({
    where: { id: todoId },
    include: {
      client: {
        select: { id: true, agentId: true },
      },
    },
  })

  if (!todo || todo.client?.agentId !== session.user.id) {
    return { success: false, error: 'To-Do not found' }
  }

  // Check if extensions are available
  if (todo.extensionsUsed >= todo.maxExtensions) {
    return { success: false, error: 'No extensions remaining' }
  }

  // Calculate new due date (3 days from current due date or now)
  const baseDate = todo.dueDate || new Date()
  const newDueDate = new Date(baseDate)
  newDueDate.setDate(newDueDate.getDate() + 3)

  try {
    await prisma.toDo.update({
      where: { id: todoId },
      data: {
        dueDate: newDueDate,
        extensionsUsed: todo.extensionsUsed + 1,
      },
    })

    // Log event
    if (todo.clientId) {
      await prisma.eventLog.create({
        data: {
          eventType: EventType.DEADLINE_MISSED, // Using existing event type
          description: `Extension requested for: ${todo.title} (${todo.extensionsUsed + 1}/${todo.maxExtensions} used)`,
          clientId: todo.clientId,
          userId: session.user.id,
          metadata: {
            todoId,
            extensionsUsed: todo.extensionsUsed + 1,
            maxExtensions: todo.maxExtensions,
            newDueDate: newDueDate.toISOString(),
          },
        },
      })

      revalidatePath(`/agent/clients/${todo.clientId}`)
    }

    return { success: true, newDueDate }
  } catch (error) {
    console.error('Extension error:', error)
    return { success: false, error: 'Failed to extend deadline' }
  }
}
