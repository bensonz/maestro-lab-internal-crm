'use server'

import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'

export type DraftActionState = {
  success?: boolean
  message?: string
}

export async function saveDraft(
  prevState: DraftActionState,
  formData: FormData,
): Promise<DraftActionState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, message: 'You must be logged in to save a draft' }
  }

  // Collect all form data as object
  const formDataObj: Record<string, string> = {}
  formData.forEach((value, key) => {
    formDataObj[key] = value.toString()
  })

  // Check if updating existing draft
  const draftId = formData.get('draftId') as string | null

  try {
    if (draftId) {
      await prisma.applicationDraft.update({
        where: { id: draftId, agentId: session.user.id },
        data: { formData: formDataObj },
      })
    } else {
      await prisma.applicationDraft.create({
        data: {
          formData: formDataObj,
          agentId: session.user.id,
        },
      })
    }

    return { success: true, message: 'Draft saved successfully' }
  } catch {
    return { success: false, message: 'Failed to save draft' }
  }
}

export async function deleteDraft(
  draftId: string,
): Promise<{ success: boolean }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false }
  }

  try {
    await prisma.applicationDraft.delete({
      where: { id: draftId, agentId: session.user.id },
    })
    return { success: true }
  } catch {
    return { success: false }
  }
}
