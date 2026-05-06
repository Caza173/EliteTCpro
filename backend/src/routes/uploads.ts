import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { assetUploadMiddleware, imageUploadMiddleware } from '../middleware/upload.js';
import { deleteStoredObject, generateSignedUploadUrl, getStoredObjectSignedUrl, storeUploadedFile } from '../services/storage/index.js';

const router = Router();

const temporaryUploadSchema = z.object({
  namespace: z.string().default('temporary'),
  file_name: z.string().optional(),
});

const deleteUploadSchema = z.object({
  object_key: z.string().min(1),
});

const signedUploadSchema = z.object({
  object_key: z.string().min(1),
  content_type: z.string().min(1),
  expires_in_seconds: z.coerce.number().int().min(60).max(604800).optional(),
});

router.post('/temporary', assetUploadMiddleware.single('file'), async (request, response) => {
  const payload = temporaryUploadSchema.parse(request.body ?? {});
  const file = request.file;

  if (!file) {
    return response.status(400).json({ error: 'File upload is required' });
  }

  const stored = await storeUploadedFile({
    namespace: payload.namespace,
    originalFileName: payload.file_name ?? file.originalname,
    mimeType: file.mimetype,
    buffer: file.buffer,
  });

  return response.status(201).json({
    upload: {
      object_key: stored.key,
      signed_url: stored.signedUrl,
      file_name: payload.file_name ?? file.originalname,
      content_type: file.mimetype,
      size_bytes: file.size,
    },
  });
});

router.post('/images', imageUploadMiddleware.single('file'), async (request, response) => {
  const payload = temporaryUploadSchema.parse(request.body ?? {});
  const file = request.file;

  if (!file) {
    return response.status(400).json({ error: 'File upload is required' });
  }

  const stored = await storeUploadedFile({
    namespace: payload.namespace,
    originalFileName: payload.file_name ?? file.originalname,
    mimeType: file.mimetype,
    buffer: file.buffer,
  });

  return response.status(201).json({
    upload: {
      object_key: stored.key,
      signed_url: stored.signedUrl,
      file_name: payload.file_name ?? file.originalname,
      content_type: file.mimetype,
      size_bytes: file.size,
    },
  });
});

router.get('/signed-url', requireAuth, async (request, response) => {
  const objectKey = typeof request.query.object_key === 'string' ? request.query.object_key : null;
  if (!objectKey) {
    return response.status(400).json({ error: 'object_key is required' });
  }

  return response.json({ signed_url: await getStoredObjectSignedUrl(objectKey) });
});

router.post('/presign-upload', requireAuth, async (request, response) => {
  const payload = signedUploadSchema.parse(request.body ?? {});
  return response.json({
    object_key: payload.object_key,
    signed_upload_url: await generateSignedUploadUrl({
      storageKey: payload.object_key,
      mimeType: payload.content_type,
      expiresInSeconds: payload.expires_in_seconds,
    }),
  });
});

router.delete('/', requireAuth, async (request, response) => {
  const payload = deleteUploadSchema.parse(request.body ?? {});
  await deleteStoredObject(payload.object_key);
  return response.status(204).send();
});

export default router;