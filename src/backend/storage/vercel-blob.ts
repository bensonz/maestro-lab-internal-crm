import { put, del, head } from '@vercel/blob'
import type { StorageProvider, UploadResult } from './types'

/**
 * Vercel Blob storage provider.
 * Requires BLOB_READ_WRITE_TOKEN env var.
 */
export class VercelBlobStorage implements StorageProvider {
  async upload(file: Buffer, path: string, contentType: string): Promise<UploadResult> {
    const blob = await put(path, file, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
    })

    return {
      key: path,
      url: blob.url,
      size: file.byteLength,
      contentType,
    }
  }

  async download(key: string): Promise<Buffer> {
    // Vercel Blob doesn't have a direct download SDK method — fetch the URL
    const metadata = await head(key)
    const response = await fetch(metadata.url)
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  async delete(key: string): Promise<void> {
    await del(key)
  }

  async getSignedUrl(key: string, _expiresIn?: number): Promise<string> {
    // Vercel Blob public URLs don't expire — just return the URL
    const metadata = await head(key)
    return metadata.url
  }

  async exists(key: string): Promise<boolean> {
    try {
      await head(key)
      return true
    } catch {
      return false
    }
  }
}
