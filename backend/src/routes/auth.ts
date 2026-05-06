import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { serializeUser } from '../lib/serializers.js';
import { signAccessToken } from '../lib/jwt.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/register', async (request, response) => {
  const payload = registerSchema.parse(request.body ?? {});
  const email = payload.email.toLowerCase().trim();
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (existing[0]) {
    return response.status(409).json({ error: 'User already exists' });
  }

  const passwordHash = await bcrypt.hash(payload.password, 12);
  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      fullName: payload.full_name ?? null,
    })
    .returning();

  const token = await signAccessToken(user.id, user.email);
  return response.status(201).json({ token, user: serializeUser(user) });
});

router.post('/login', async (request, response) => {
  const payload = loginSchema.parse(request.body ?? {});
  const email = payload.email.toLowerCase().trim();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    return response.status(401).json({ error: 'Invalid credentials' });
  }

  const isValid = await bcrypt.compare(payload.password, user.passwordHash);
  if (!isValid) {
    return response.status(401).json({ error: 'Invalid credentials' });
  }

  const token = await signAccessToken(user.id, user.email);
  return response.json({ token, user: serializeUser(user) });
});

router.get('/me', requireAuth, async (request, response) => {
  const [user] = await db.select().from(users).where(eq(users.id, request.user.id)).limit(1);
  return response.json({ user: user ? serializeUser(user) : null });
});

export default router;