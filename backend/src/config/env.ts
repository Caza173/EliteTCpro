import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  AWS_REGION: z.string().default('us-east-1'),
  S3_BUCKET_NAME: z.string().min(1, 'S3_BUCKET_NAME is required'),
  S3_ENDPOINT: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS_ACCESS_KEY_ID is required'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS_SECRET_ACCESS_KEY is required'),
  S3_FORCE_PATH_STYLE: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((value) => value === 'true'),
  S3_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(604800).default(900),
  SIGNATURE_PROVIDER: z.enum(['internal', 'dropbox_sign', 'docusign']).default('internal'),
  EMAIL_PROVIDER: z.enum(['log', 'smtp', 'ses']).default('log'),
  EMAIL_FROM_EMAIL: z.string().email().optional(),
  EMAIL_FROM_NAME: z.string().default('EliteTC'),
  EMAIL_RETRY_ATTEMPTS: z.coerce.number().int().min(1).max(5).default(3),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
});

export const env = envSchema.parse(process.env);