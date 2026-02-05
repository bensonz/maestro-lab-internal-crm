import { mkdir, readFile, writeFile, unlink, access } from 'fs/promises'
import { dirname, join } from 'path'
import type { StorageProvider, UploadResult } from './types'

/**
 * Local filesystem storage provider
 * Used for development. Files stored in ./uploads by default.
 */
export class LocalStorage implements StorageProvider {
  private basePath: string

  constructor(basePath: string = './uploads') {
    this.basePath = basePath
  }

  async upload(file: Buffer, path: string, contentType: string): Promise<UploadResult> {
    const fullPath = join(this.basePath, path)
    const dir = dirname(fullPath)

    // Ensure directory exists
    await mkdir(dir, { recursive: true })

    // Write file
    await writeFile(fullPath, file)

    return {
      key: path,
      url: `/uploads/${path}`, // Served via Next.js static or API route
      size: file.length,
      contentType,
    }
  }

  async download(key: string): Promise<Buffer> {
    const fullPath = join(this.basePath, key)
    return readFile(fullPath)
  }

  async delete(key: string): Promise<void> {
    const fullPath = join(this.basePath, key)
    await unlink(fullPath)
  }

  async getSignedUrl(key: string, _expiresIn?: number): Promise<string> {
    // Local storage doesn't need signed URLs, just return the path
    // In production, you'd serve via an authenticated API route
    return `/api/files/${key}`
  }

  async exists(key: string): Promise<boolean> {
    const fullPath = join(this.basePath, key)
    try {
      await access(fullPath)
      return true
    } catch {
      return false
    }
  }
}
