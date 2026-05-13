/**
 * Centralized Transaction Access Layer
 * 
 * All transaction queries MUST route through this layer.
 * No exceptions. No direct Transaction.list() calls.
 * 
 * Enforces:
 * - User owns transaction
 * - Ownership is verified server-side
 * - RLS is enforced via Entity filters
 * - Logging for audit trail
 */

import {
  resolveTransactionOwnership,
  assertTransactionOwnership,
  getTransactionForUser,
  getUserTransactions,
} from "./ownershipResolver.js";

/**
 * Safe: Get a transaction, verify ownership
 * Throws if not owned.
 */
export async function fetchOwnedTransaction(transactionId, user, base44) {
  if (!user?.id) throw new Error("Unauthorized");
  try {
    return await assertTransactionOwnership(transactionId, user.id, base44);
  } catch (err) {
    console.warn(`[transactionAccess] Ownership check failed for user=${user.email} tx=${transactionId}`);
    throw new Error("Forbidden");
  }
}

/**
 * Safe: Get all transactions for user
 */
export async function fetchUserTransactions(user, base44, options = {}) {
  if (!user?.id) throw new Error("Unauthorized");
  return getUserTransactions(user.id, base44, options);
}

/**
 * Safe: Get transaction if owned, null otherwise
 */
export async function fetchTransactionIfOwned(transactionId, user, base44) {
  if (!user?.id) return null;
  return getTransactionForUser(transactionId, user.id, base44);
}

/**
 * Safe: Fetch child entity (task, document, etc) only if user owns parent transaction
 */
export async function fetchOwnedChild(childEntityName, childId, user, base44) {
  if (!user?.id) throw new Error("Unauthorized");

  try {
    const child = await base44.entities[childEntityName].filter({ id: childId });
    if (!child.length) return null;

    const record = child[0];
    const transactionId = record.transaction_id;

    // Verify ownership via parent transaction
    const tx = await getTransactionForUser(transactionId, user.id, base44);
    if (!tx) {
      console.warn(`[transactionAccess] Denied access to ${childEntityName}=${childId} (user=${user.email} does not own parent tx=${transactionId})`);
      throw new Error("Forbidden");
    }

    return record;
  } catch (err) {
    console.error(`[transactionAccess] Failed to fetch owned child:`, err.message);
    throw err;
  }
}

/**
 * Safe: Update a field on user's transaction
 * Re-verifies ownership before mutation.
 */
export async function updateOwnedTransaction(transactionId, user, base44, updateData) {
  if (!user?.id) throw new Error("Unauthorized");

  // Re-verify ownership before any write
  await assertTransactionOwnership(transactionId, user.id, base44);

  try {
    const updated = await base44.entities.Transaction.update(transactionId, updateData);
    console.log(`[transactionAccess] Updated tx=${transactionId} by user=${user.email}`);
    return updated;
  } catch (err) {
    console.error(`[transactionAccess] Update failed for tx=${transactionId}:`, err.message);
    throw err;
  }
}

/**
 * Safe: Delete a transaction owned by user
 * Re-verifies ownership before deletion.
 */
export async function deleteOwnedTransaction(transactionId, user, base44) {
  if (!user?.id) throw new Error("Unauthorized");

  // Re-verify ownership before deletion
  await assertTransactionOwnership(transactionId, user.id, base44);

  try {
    await base44.entities.Transaction.delete(transactionId);
    console.log(`[transactionAccess] Deleted tx=${transactionId} by user=${user.email}`);
    return { success: true };
  } catch (err) {
    console.error(`[transactionAccess] Delete failed for tx=${transactionId}:`, err.message);
    throw err;
  }
}