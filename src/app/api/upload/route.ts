import { auth } from '@/backend/auth'
import { getStorage } from '@/backend/storage'
import { NextRequest, NextResponse } from 'next/server'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const POST = auth(async (req) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const type = formData.get('type') as string | null
  const entity = formData.get('entity') as string | null
  const entityId = formData.get('entityId') as string | null
  const platformCode = formData.get('platformCode') as string | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type. Allowed: JPG, PNG, WebP.' },
      { status: 400 },
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'File too large. Maximum size is 5MB.' },
      { status: 400 },
    )
  }

  // Build storage path
  const ext = file.name.split('.').pop() ?? 'jpg'
  const timestamp = Date.now()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const folder = entity ?? 'general'
  const subFolder = type ?? 'file'
  const prefix = [entityId, platformCode].filter(Boolean).join('/')
  const storagePath = prefix
    ? `uploads/${folder}/${prefix}/${subFolder}/${timestamp}-${safeName}`
    : `uploads/${folder}/${subFolder}/${timestamp}-${safeName}`

  const storage = getStorage()
  const buffer = Buffer.from(await file.arrayBuffer())
  const result = await storage.upload(buffer, storagePath, file.type)

  return NextResponse.json({ url: result.url, path: result.key, ext })
}) as unknown as (req: NextRequest) => Promise<Response>
