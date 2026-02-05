import fs from 'fs/promises'
import path from 'path'

export interface StorageProvider {
  save(filepath: string, data: Buffer): Promise<void>
  read(filepath: string): Promise<Buffer>
  delete(filepath: string): Promise<void>
  exists(filepath: string): Promise<boolean>
  getUrl(filepath: string): string
}

class LocalStorageProvider implements StorageProvider {
  private basePath: string

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath
  }

  private getFullPath(filepath: string): string {
    return path.join(this.basePath, 'public', filepath)
  }

  async save(filepath: string, data: Buffer): Promise<void> {
    const fullPath = this.getFullPath(filepath)
    const dir = path.dirname(fullPath)

    // Create directory if it doesn't exist
    await fs.mkdir(dir, { recursive: true })

    // Write file
    await fs.writeFile(fullPath, data)
  }

  async read(filepath: string): Promise<Buffer> {
    const fullPath = this.getFullPath(filepath)
    return fs.readFile(fullPath)
  }

  async delete(filepath: string): Promise<void> {
    const fullPath = this.getFullPath(filepath)
    try {
      await fs.unlink(fullPath)
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }
  }

  async exists(filepath: string): Promise<boolean> {
    const fullPath = this.getFullPath(filepath)
    try {
      await fs.access(fullPath)
      return true
    } catch {
      return false
    }
  }

  getUrl(filepath: string): string {
    // For local storage, files are served from /public
    return `/${filepath}`
  }
}

// Singleton instance
let storageInstance: StorageProvider | null = null

export function getStorage(): StorageProvider {
  if (!storageInstance) {
    storageInstance = new LocalStorageProvider()
  }
  return storageInstance
}
