import crypto from 'node:crypto';
import path from 'node:path';
import { createSignedGetUrl, createSignedPutUrl, deleteObject, uploadObject } from './s3.service.js';

const STORAGE_KEY_PREFIXES = [
  'documents',
  'profiles',
  'commission-statements',
  'workflow-templates',
  'pdf-templates',
  'brokerages',
  'contracts',
  'purchase-agreements',
  'intake',
  'temporary',
] as const;

type StoreUploadedFileInput = {
  ownerId?: string;
  transactionId?: string;
  namespace?: string;
  originalFileName: string;
  mimeType: string;
  buffer: Buffer;
};

type StoredObject = {
  key: string;
  storageKey: string;
  signedUrl: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
};

type GenerateSignedUploadUrlInput = {
  storageKey: string;
  mimeType: string;
  expiresInSeconds?: number;
};

function isSupportedPrefix(segment: string) {
  return STORAGE_KEY_PREFIXES.includes(segment as (typeof STORAGE_KEY_PREFIXES)[number]);
}

export function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, '-');
}

function normalizeNamespace(namespace: string | undefined) {
  const normalized = (namespace || 'documents').replace(/^\/+|\/+$/g, '');
  if (!normalized) {
    return 'documents';
  }

  return normalized
    .split('/')
    .map((segment) => segment.replace(/[^a-zA-Z0-9._-]+/g, '-'))
    .filter(Boolean)
    .join('/');
}

export function normalizeMimeType(mimeType: string | undefined, fileName: string) {
  if (mimeType && mimeType !== 'application/octet-stream') {
    return mimeType;
  }

  const extension = path.extname(fileName).toLowerCase();
  switch (extension) {
    case '.pdf':
      return 'application/pdf';
    case '.doc':
      return 'application/msword';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.txt':
      return 'text/plain';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    case '.gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}

function clampExpirationWindow(expiresInSeconds: number | undefined) {
  if (!expiresInSeconds) {
    return undefined;
  }

  return Math.max(60, Math.min(604800, expiresInSeconds));
}

export function validateStorageKey(key: string) {
  if (!key || typeof key !== 'string') {
    throw new Error('Storage key is required');
  }

  if (key.startsWith('/') || key.includes('..') || key.includes('\\')) {
    throw new Error('Invalid storage key format');
  }

  const segments = key.split('/').filter(Boolean);
  if (segments.length < 2 || !isSupportedPrefix(segments[0])) {
    throw new Error('Unsupported storage key prefix');
  }

  return key;
}

export function resolveStorageKey(value: unknown) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed.includes('://')) {
    try {
      return validateStorageKey(trimmed);
    } catch {
      return null;
    }
  }

  try {
    const url = new URL(trimmed);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const namespaceIndex = pathSegments.findIndex((segment) => isSupportedPrefix(segment));
    if (namespaceIndex === -1) {
      return null;
    }

    return validateStorageKey(pathSegments.slice(namespaceIndex).join('/'));
  } catch {
    return null;
  }
}

export function buildStorageKey(ownerId: string | undefined, transactionId: string | undefined, namespace: string | undefined, fileName: string) {
  const suffix = crypto.randomBytes(6).toString('hex');
  const keyPrefix = normalizeNamespace(namespace);
  const ownerSegment = ownerId ? ownerId : 'anonymous';
  const transactionSegment = transactionId ? transactionId : 'unassigned';
  return validateStorageKey(path.posix.join(keyPrefix, ownerSegment, transactionSegment, `${Date.now()}-${suffix}-${sanitizeFileName(fileName)}`));
}

export async function storeUploadedFile(input: StoreUploadedFileInput): Promise<StoredObject> {
  const key = buildStorageKey(input.ownerId, input.transactionId, input.namespace, input.originalFileName);
  const mimeType = normalizeMimeType(input.mimeType, input.originalFileName);
  await uploadObject({
    key,
    body: input.buffer,
    contentType: mimeType,
    metadata: input.ownerId
      ? {
          owner_user_id: input.ownerId,
          transaction_id: input.transactionId ?? 'unassigned',
        }
      : undefined,
  });

  return {
    key,
    storageKey: key,
    signedUrl: await createSignedGetUrl(key),
    originalFilename: input.originalFileName,
    mimeType,
    sizeBytes: input.buffer.byteLength,
  };
}

export async function deleteStoredObject(key: string) {
  await deleteObject(validateStorageKey(key));
}

export async function generateSignedDownloadUrl(key: string, expiresInSeconds?: number) {
  return createSignedGetUrl(validateStorageKey(key), clampExpirationWindow(expiresInSeconds));
}

export async function generateSignedUploadUrl(input: GenerateSignedUploadUrlInput) {
  return createSignedPutUrl({
    key: validateStorageKey(input.storageKey),
    contentType: normalizeMimeType(input.mimeType, input.storageKey),
    expiresInSeconds: clampExpirationWindow(input.expiresInSeconds),
  });
}

export async function getStoredObjectSignedUrl(key: string, expiresInSeconds?: number) {
  return generateSignedDownloadUrl(key, expiresInSeconds);
}