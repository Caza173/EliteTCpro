import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../../config/env.js';

type StoreUploadedFileInput = {
  ownerId: string;
  transactionId: string;
  originalFileName: string;
  mimeType: string;
  buffer: Buffer;
};

type StoredObject = {
  key: string;
  url: string;
};

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, '-');
}

function buildStorageKey(ownerId: string, transactionId: string, fileName: string) {
  const suffix = crypto.randomBytes(6).toString('hex');
  return path.posix.join(ownerId, transactionId, `${Date.now()}-${suffix}-${sanitizeFileName(fileName)}`);
}

function buildPublicUrl(key: string) {
  const normalizedKey = key.split(path.sep).join('/');
  if (env.STORAGE_PUBLIC_BASE_URL) {
    return `${env.STORAGE_PUBLIC_BASE_URL.replace(/\/$/, '')}/${normalizedKey}`;
  }

  if (env.STORAGE_DRIVER === 's3' && env.S3_ENDPOINT && env.S3_BUCKET) {
    return `${env.S3_ENDPOINT.replace(/\/$/, '')}/${env.S3_BUCKET}/${normalizedKey}`;
  }

  return `http://localhost:${env.PORT}/uploads/${normalizedKey}`;
}

function getS3Client() {
  return new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials:
      env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
        ? {
            accessKeyId: env.S3_ACCESS_KEY_ID,
            secretAccessKey: env.S3_SECRET_ACCESS_KEY,
          }
        : undefined,
  });
}

async function storeLocally(key: string, buffer: Buffer) {
  const fullPath = path.resolve(process.cwd(), env.STORAGE_LOCAL_ROOT, key);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);
}

async function deleteLocally(key: string) {
  const fullPath = path.resolve(process.cwd(), env.STORAGE_LOCAL_ROOT, key);
  await fs.rm(fullPath, { force: true });
}

export async function storeUploadedFile(input: StoreUploadedFileInput): Promise<StoredObject> {
  const key = buildStorageKey(input.ownerId, input.transactionId, input.originalFileName);

  if (env.STORAGE_DRIVER === 's3') {
    if (!env.S3_BUCKET) {
      throw new Error('S3_BUCKET is required when STORAGE_DRIVER is s3');
    }

    const client = getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: input.buffer,
        ContentType: input.mimeType,
      })
    );
  } else {
    await storeLocally(key, input.buffer);
  }

  return {
    key,
    url: buildPublicUrl(key),
  };
}

export async function deleteStoredObject(key: string) {
  if (env.STORAGE_DRIVER === 's3') {
    if (!env.S3_BUCKET) {
      return;
    }

    const client = getS3Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
      })
    );
    return;
  }

  await deleteLocally(key);
}