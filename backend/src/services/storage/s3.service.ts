import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../config/env.js';

const s3Client = new S3Client({
  region: env.AWS_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export function getStorageBucketName() {
  return env.S3_BUCKET_NAME;
}

export async function uploadObject(params: {
  key: string;
  body: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
}) {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: getStorageBucketName(),
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      Metadata: params.metadata,
    })
  );
}

export async function deleteObject(key: string) {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: getStorageBucketName(),
      Key: key,
    })
  );
}

export async function createSignedGetUrl(key: string, expiresInSeconds = env.S3_SIGNED_URL_TTL_SECONDS) {
  return getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: getStorageBucketName(),
      Key: key,
    }),
    { expiresIn: expiresInSeconds }
  );
}

export async function createSignedPutUrl(params: { key: string; contentType: string; expiresInSeconds?: number }) {
  return getSignedUrl(
    s3Client,
    new PutObjectCommand({
      Bucket: getStorageBucketName(),
      Key: params.key,
      ContentType: params.contentType,
    }),
    { expiresIn: params.expiresInSeconds ?? env.S3_SIGNED_URL_TTL_SECONDS }
  );
}