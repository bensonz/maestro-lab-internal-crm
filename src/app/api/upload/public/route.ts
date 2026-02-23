import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPG, PNG, and WebP files are allowed' },
        { status: 400 },
      )
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File must be under 5MB' },
        { status: 400 },
      )
    }

    // Stub: return a mock URL. Replace with real storage (S3, Vercel Blob, etc.) later.
    const mockUrl = `/uploads/${Date.now()}-${file.name}`

    return NextResponse.json({ url: mockUrl })
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
