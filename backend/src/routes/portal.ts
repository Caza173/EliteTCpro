import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { generatePortalCodes, lookupPortalCode } from '../services/portal.js';

const router = Router();

router.post('/lookup', async (request, response) => {
  const payload = z.object({ code: z.string().min(1) }).parse(request.body ?? {});

  try {
    const result = await lookupPortalCode(payload.code);
    return response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Portal lookup failed';
    if (message.includes('Too many attempts')) {
      return response.status(429).json({ error: message });
    }
    return response.status(404).json({ error: message });
  }
});

router.post('/generate-codes', requireAuth, async (request, response) => {
  const payload = z.object({ transaction_id: z.string().uuid() }).parse(request.body ?? {});
  try {
    const result = await generatePortalCodes(request.user.id, payload.transaction_id);
    return response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Portal code generation failed';
    return response.status(404).json({ error: message });
  }
});

export default router;