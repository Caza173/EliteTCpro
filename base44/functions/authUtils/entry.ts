/**
 * authUtils.js — Centralized backend security helpers
 *
 * Import pattern (NO local imports in Deno functions):
 *   Copy the helpers you need inline — OR invoke this as a utility if supported.
 *
 * Usage (copy into each function):
 *   import { requireAuth, requireOwnership, requireAdminRole, requireInternalSecret } from './authUtils.js';
 *
 * NOTE: Because Base44 Deno functions cannot import local files, this module
 * documents the canonical patterns. Each function inlines these helpers.
 * This file serves as the single source of truth for the security model.
 */

// ── Pattern 1: User authentication ───────────────────────────────────────────
// const user = await base44.auth.me();
// if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

// ── Pattern 2: Admin role check ───────────────────────────────────────────────
// const ADMIN_ROLES = ['admin', 'owner', 'super_admin'];
// const isAdmin = ADMIN_ROLES.includes(user.role);
// if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

// ── Pattern 3: Ownership check ────────────────────────────────────────────────
// const isOwner = resource.owner_user_id === user.id || resource.created_by === user.id;
// if (!isAdmin && !isOwner) return Response.json({ error: 'Forbidden' }, { status: 403 });

// ── Pattern 4: Internal automation secret ────────────────────────────────────
// const INTERNAL_SECRET = Deno.env.get('INTERNAL_AUTOMATION_SECRET');
// const authHeader = req.headers.get('x-internal-secret');
// if (INTERNAL_SECRET && authHeader !== INTERNAL_SECRET)
//   return Response.json({ error: 'Unauthorized' }, { status: 401 });

// ── Pattern 5: Webhook token validation ──────────────────────────────────────
// const WEBHOOK_SECRET = Deno.env.get('SOME_WEBHOOK_SECRET');
// const sig = req.headers.get('x-webhook-signature');
// if (WEBHOOK_SECRET && sig !== WEBHOOK_SECRET)
//   return Response.json({ error: 'Unauthorized' }, { status: 401 });

// ── Security rules ────────────────────────────────────────────────────────────
// 1. NEVER bypass auth with hardcoded emails — use roles only
// 2. NEVER trust client-supplied owner_user_id — always stamp from auth
// 3. NEVER use asServiceRole to fetch then skip ownership check
// 4. ALWAYS strip owner_user_id / created_by from client request bodies
// 5. ALWAYS validate the resource exists before checking ownership
// 6. External webhooks MUST validate a shared secret from env vars

export const ADMIN_ROLES = ['admin', 'owner', 'super_admin'];