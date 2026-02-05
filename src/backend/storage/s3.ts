/**
 * S3/R2 Storage Provider (Stub)
 * 
 * Implement when ready to migrate to cloud storage.
 * Works with AWS S3, Cloudflare R2, or any S3-compatible storage.
 * 
 * Required env vars:
 *   STORAGE_PROVIDER=s3 (or r2)
 *   STORAGE_BUCKET=your-bucket-name
 *   STORAGE_REGION=us-east-1
 *   STORAGE_ENDPOINT=https://xxx.r2.cloudflarestorage.com (for R2)
 *   STORAGE_ACCESS_KEY_ID=xxx
 *   STORAGE_SECRET_ACCESS_KEY=xxx
 */

import type { StorageProvider, UploadResult, StorageConfig } from './types'

export class S3Storage implements StorageProvider {
  // private client: S3Client
  // private bucket: string

  constructor(_config: StorageConfig) {
    // TODO: Initialize S3 client
    // import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
    // import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
    //
    // this.bucket = config.bucket!
    // this.client = new S3Client({
    //   region: config.region,
    //   endpoint: config.endpoint, // For R2 or other S3-compatible
    //   credentials: {
    //     accessKeyId: config.accessKeyId!,
    //     secretAccessKey: config.secretAccessKey!,
    //   },
    // })
    throw new Error('S3Storage not implemented. Install @aws-sdk/client-s3 and implement.')
  }

  async upload(_file: Buffer, _path: string, _contentType: string): Promise<UploadResult> {
    // const command = new PutObjectCommand({
    //   Bucket: this.bucket,
    //   Key: path,
    //   Body: file,
    //   ContentType: contentType,
    // })
    // await this.client.send(command)
    // return { key: path, url: `https://${this.bucket}.s3.amazonaws.com/${path}`, size: file.length, contentType }
    throw new Error('Not implemented')
  }

  async download(_key: string): Promise<Buffer> {
    // const command = new GetObjectCommand({ Bucket: this.bucket, Key: key })
    // const response = await this.client.send(command)
    // return Buffer.from(await response.Body!.transformToByteArray())
    throw new Error('Not implemented')
  }

  async delete(_key: string): Promise<void> {
    // const command = new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
    // await this.client.send(command)
    throw new Error('Not implemented')
  }

  async getSignedUrl(_key: string, _expiresIn: number = 3600): Promise<string> {
    // const command = new GetObjectCommand({ Bucket: this.bucket, Key: key })
    // return getSignedUrl(this.client, command, { expiresIn })
    throw new Error('Not implemented')
  }

  async exists(_key: string): Promise<boolean> {
    // try {
    //   await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }))
    //   return true
    // } catch { return false }
    throw new Error('Not implemented')
  }
}
