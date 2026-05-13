/**
 * Ownership Resolver — Canonical Single Source of Truth
 * 
 * Every access to transaction data must flow through this layer.
 * No bypasses. No frontend-only filtering. No RLS-reliance alone.
 * 
 * Backend enforces ownership BEFORE returning any data.
 */

/**
 * Resolve transaction ownership by ID.
 * Throws if transaction not found.
 */
export async function resolveTransactionOwnership(transactionId, base44) {
  if (!transactionId) throw new Error("transactionId required");
  if (!base44) throw new Error("base44 client required");

  try {
    // Use service role to fetch, then validate owner
    const results = await base44.asServiceRole.entities.Transaction.filter({ id: transactionId });
    const transaction = results[0];

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    return {
      transactionId: transaction.id,
      ownerUserId: transaction.created_by,
      ownerEmail: transaction.agent_email || null, // denormalized, verify by created_by
      transaction,
    };
  } catch (err) {
    throw new Error(`Failed to resolve ownership for tx=${transactionId}: ${err.message}`);
  }
}

/**
 * Verify a user owns a transaction.
 * Throws 403 if no ownership.
 */
export async function assertTransactionOwnership(transactionId, userId, base44) {
  if (!userId) throw new Error("userId required");

  const ownership = await resolveTransactionOwnership(transactionId, base44);

  // Owner or super admin
  if (ownership.ownerUserId !== userId) {
    console.warn(`[ownership] DENIED user=${userId} attempted access to tx=${transactionId} owned by=${ownership.ownerUserId}`);
    throw new Error("Forbidden: You do not own this transaction");
  }

  return ownership;
}

/**
 * Fetch a single transaction IF user owns it.
 * Returns null if not found or not owned.
 */
export async function getTransactionForUser(transactionId, userId, base44) {
  if (!transactionId || !userId) return null;

  try {
    const ownership = await resolveTransactionOwnership(transactionId, base44);
    if (ownership.ownerUserId === userId) {
      return ownership.transaction;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * List all transactions owned by user.
 * Filters via created_by only.
 */
export async function getUserTransactions(userId, base44, options = {}) {
  if (!userId) throw new Error("userId required");

  const { status = null, sort = "-created_date", limit = 200 } = options;

  try {
    let query = { created_by: userId };
    if (status) query.status = status;

    const transactions = await base44.asServiceRole.entities.Transaction.filter(query, sort, limit);
    return transactions || [];
  } catch (err) {
    console.error(`[ownership] getUserTransactions failed for user=${userId}:`, err.message);
    return [];
  }
}