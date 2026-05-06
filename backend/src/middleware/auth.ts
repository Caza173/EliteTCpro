import { and, eq } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { verifyAccessToken } from '../lib/jwt.js';

function getBearerToken(request: Request) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice('Bearer '.length).trim();
}

export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  try {
    const token = getBearerToken(request);

    if (!token) {
      return response.status(401).json({ error: 'Authentication required' });
    }

    const payload = await verifyAccessToken(token);
    const userId = payload.sub;

    if (typeof userId !== 'string') {
      return response.status(401).json({ error: 'Invalid token' });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.isActive, true)))
      .limit(1);

    if (!user) {
      return response.status(401).json({ error: 'User not found' });
    }

    request.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      profile: user.profile,
    };

    return next();
  } catch {
    return response.status(401).json({ error: 'Invalid or expired token' });
  }
}