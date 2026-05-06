import { and, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { serializeUser } from '../lib/serializers.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const adminRoles = new Set(['admin', 'owner', 'tc_lead']);

function asRecord(value: ReturnType<typeof serializeUser>) {
  return value as Record<string, unknown>;
}

function getUserRole(request: Parameters<typeof requireAuth>[0]) {
  const role = request.user.profile?.role;
  return typeof role === 'string' ? role : null;
}

function canManageUsers(request: Parameters<typeof requireAuth>[0]) {
  const role = getUserRole(request);
  return Boolean(role && adminRoles.has(role));
}

const updateMeSchema = z.object({
  full_name: z.string().min(1).optional(),
}).catchall(z.unknown());

const updateUserSchema = z.object({
  full_name: z.string().min(1).optional(),
}).catchall(z.unknown());

router.use(requireAuth);

router.get('/', async (request, response) => {
  const filters = request.query;
  const canListAll = canManageUsers(request);

  if (!canListAll) {
    const [user] = await db.select().from(users).where(eq(users.id, request.user.id)).limit(1);
    return response.json({ users: user ? [serializeUser(user)] : [] });
  }

  const rows = await db.select().from(users).where(eq(users.isActive, true));
  const filteredRows = rows.filter((user) => {
    return Object.entries(filters).every(([key, value]) => {
      if (typeof value !== 'string' || value.length === 0) return true;
      const serialized = asRecord(serializeUser(user));
      return String(serialized[key] ?? '') === value;
    });
  });

  return response.json({ users: filteredRows.map(serializeUser) });
});

router.get('/me', async (request, response) => {
  const [user] = await db.select().from(users).where(eq(users.id, request.user.id)).limit(1);
  return response.json({ user: user ? serializeUser(user) : null });
});

router.patch('/me', async (request, response) => {
  const payload = updateMeSchema.parse(request.body ?? {});
  const { full_name, ...profilePatch } = payload;

  const [current] = await db.select().from(users).where(eq(users.id, request.user.id)).limit(1);
  if (!current) {
    return response.status(404).json({ error: 'User not found' });
  }

  const [user] = await db
    .update(users)
    .set({
      fullName: full_name ?? current.fullName,
      profile: {
        ...current.profile,
        ...profilePatch,
      },
    })
    .where(eq(users.id, request.user.id))
    .returning();

  return response.json({ user: serializeUser(user) });
});

router.patch('/:id', async (request, response) => {
  const targetUserId = request.params.id;
  if (typeof targetUserId !== 'string') {
    return response.status(400).json({ error: 'Invalid user id' });
  }

  const isSelf = targetUserId === request.user.id;
  if (!isSelf && !canManageUsers(request)) {
    return response.status(403).json({ error: 'Forbidden' });
  }

  const payload = updateUserSchema.parse(request.body ?? {});
  const { full_name, ...profilePatch } = payload;

  const [current] = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
  if (!current) {
    return response.status(404).json({ error: 'User not found' });
  }

  const [user] = await db
    .update(users)
    .set({
      fullName: full_name ?? current.fullName,
      profile: {
        ...current.profile,
        ...profilePatch,
      },
    })
    .where(eq(users.id, targetUserId))
    .returning();

  return response.json({ user: serializeUser(user) });
});

router.delete('/:id', async (request, response) => {
  const targetUserId = request.params.id;
  if (typeof targetUserId !== 'string') {
    return response.status(400).json({ error: 'Invalid user id' });
  }

  if (!canManageUsers(request)) {
    return response.status(403).json({ error: 'Forbidden' });
  }

  const [current] = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
  if (!current || !current.isActive) {
    return response.status(404).json({ error: 'User not found' });
  }

  const [user] = await db
    .update(users)
    .set({
      isActive: false,
      profile: {
        ...current.profile,
        is_deleted: true,
      },
    })
    .where(and(eq(users.id, targetUserId), eq(users.isActive, true)))
    .returning();

  return response.status(204).send();
});

export default router;