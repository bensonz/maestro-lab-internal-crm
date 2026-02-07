import { LocalStorage } from './local'
import { VercelBlobStorage } from './vercel-blob'
import type { StorageProvider, StorageConfig, StorageProviderType } from './types'

export type { StorageProvider, UploadResult, StorageConfig, StorageProviderType } from './types'

/**
 * Get storage configuration from environment
 */
function getStorageConfig(): StorageConfig {
  const provider = (process.env.STORAGE_PROVIDER || 'local') as StorageProviderType

  return {
    provider,
    localPath: process.env.STORAGE_LOCAL_PATH || './uploads',
    bucket: process.env.STORAGE_BUCKET,
    region: process.env.STORAGE_REGION || 'us-east-1',
    endpoint: process.env.STORAGE_ENDPOINT,
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
  }
}

/**
 * Create storage provider based on configuration
 */
function createStorageProvider(config: StorageConfig): StorageProvider {
  switch (config.provider) {
    case 'local':
      return new LocalStorage(config.localPath)

    case 'vercel-blob':
      return new VercelBlobStorage()

    case 's3':
    case 'r2':
      // TODO: Implement S3Storage when needed
      // return new S3Storage(config)
      throw new Error(`Storage provider "${config.provider}" not yet implemented.`)

    default:
      throw new Error(`Unknown storage provider: ${config.provider}`)
  }
}

// Singleton instance
let storageInstance: StorageProvider | null = null

/**
 * Get the storage provider instance (singleton)
 */
export function getStorage(): StorageProvider {
  if (!storageInstance) {
    const config = getStorageConfig()
    storageInstance = createStorageProvider(config)
  }
  return storageInstance
}

/**
 * Helper to generate storage paths
 */
export function getStoragePath(
  entity: 'clients' | 'agents' | 'users',
  entityId: string,
  type: 'id-documents' | 'login-verification' | 'closure-proof' | 'avatars',
  filename: string,
  platformCode?: string
): string {
  const timestamp = Date.now()
  const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_')

  if (platformCode) {
    return `${entity}/${entityId}/platforms/${platformCode}/${type}/${timestamp}-${safeName}`
  }
  return `${entity}/${entityId}/${type}/${timestamp}-${safeName}`
}
