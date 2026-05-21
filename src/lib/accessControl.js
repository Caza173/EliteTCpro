/**
 * accessControl.js
 * Centralized ownership and access control helpers.
 * Used by frontend and shared with backend logic patterns.
 */

const ADMIN_ROLES = new Set(['admin', 'owner', 'super_admin']);

export function getUserId(user) {
  return user?.id || user?._id || user?.data?.id || null;
}

export function getUserEmail(user) {
  return user?.email || user?.data?.email || null;
}

export function isSuperAdmin(user) {
  if (!user) return false;
  const role = user.role || user.data?.role;
  return ADMIN_ROLES.has(role) || user.data?.permissions?.includes?.('super_admin') || false;
}

export function canAccessTransaction(user, tx) {
  if (!user || !tx) return false;
  if (isSuperAdmin(user)) return true;

  const userId = getUserId(user);
  const email = getUserEmail(user);

  if (userId) {
    if (tx.owner_user_id === userId) return true;
    if (tx.owner_id === userId) return true;
    if (tx.created_by === userId) return true;
    if (tx.assigned_tc_id === userId) return true;
  }
  if (email) {
    if (tx.agent_email === email) return true;
    if (tx.created_by === email) return true;
    if (tx.created_by_email === email) return true;
  }
  return false;
}

export function requireTransactionAccess(user, tx) {
  if (!canAccessTransaction(user, tx)) {
    throw new Error('ACCESS_DENIED');
  }
  return true;
}

/**
 * Stamps all ownership fields onto a data object before creating a record.
 * Throws if user id is missing.
 */
export function stampOwnership(data, user) {
  const userId = getUserId(user);
  const email = getUserEmail(user);

  if (!userId) {
    throw new Error('Missing authenticated user id. Cannot create owner-isolated record.');
  }

  return {
    ...data,
    owner_user_id: data.owner_user_id || userId,
    created_by_email: data.created_by_email || email,
  };
}