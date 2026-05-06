import multer from 'multer';

const documentMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const imageMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/gif',
]);

function createUploadMiddleware(allowedMimeTypes: Set<string>, maxFileSizeInBytes: number) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxFileSizeInBytes },
    fileFilter: (_request, file, callback) => {
      if (!allowedMimeTypes.has(file.mimetype)) {
        callback(new Error(`Unsupported file type: ${file.mimetype || 'unknown'}`));
        return;
      }

      callback(null, true);
    },
  });
}

export const documentUploadMiddleware = createUploadMiddleware(documentMimeTypes, 25 * 1024 * 1024);
export const imageUploadMiddleware = createUploadMiddleware(imageMimeTypes, 10 * 1024 * 1024);
export const assetUploadMiddleware = createUploadMiddleware(new Set([...documentMimeTypes, ...imageMimeTypes]), 25 * 1024 * 1024);