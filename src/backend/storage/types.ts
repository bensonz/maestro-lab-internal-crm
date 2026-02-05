/**
 * Storage Provider Abstraction
 * 
 * Allows easy migration from local filesystem to cloud storage (S3, R2, GCS).
 * MVP uses LocalStorage, production switches via STORAGE_PROVIDER env var.
 */

export interface UploadResult {
  /** Storage key (used for download/delete) */
  key: string
  /** Public or signed URL for access */
  url: string
  /** File size in bytes */
  size: number
  /** Content type */
  contentType: string
}

export interface StorageProvider {
  /**
   * Upload a file to storage
   * @param file - File buffer
   * @param path - Destination path (e.g., "clients/abc123/documents/file.jpg")
   * @param contentType - MIME type
   */
  upload(file: Buffer, path: string, contentType: string): Promise<UploadResult>

  /**
   * Download a file from storage
   * @param key - Storage key from upload result
   */
  download(key: string): Promise<Buffer>

  /**
   * Delete a file from storage
   * @param key - Storage key from upload result
   */
  delete(key: string): Promise<void>

  /**
   * Get a signed/temporary URL for private file access
   * @param key - Storage key
   * @param expiresIn - Expiration in seconds (default: 3600)
   */
  getSignedUrl(key: string, expiresIn?: number): Promise<string>

  /**
   * Check if a file exists
   * @param key - Storage key
   */
  exists(key: string): Promise<boolean>
}

/** Supported storage providers */
export type StorageProviderType = 'local' | 's3' | 'r2'

/** Storage configuration from environment */
export interface StorageConfig {
  provider: StorageProviderType
  // Local
  localPath?: string
  // S3/R2
  bucket?: string
  region?: string
  endpoint?: string
  accessKeyId?: string
  secretAccessKey?: string
}
