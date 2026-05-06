import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { transactions } from '../db/schema.js';
import { serializeTransaction } from '../lib/serializers.js';

const requestLog = new Map<string, number[]>();

function isRateLimited(code: string) {
  const now = Date.now();
  const entries = (requestLog.get(code) || []).filter((timestamp) => now - timestamp < 60 * 60 * 1000);
  if (entries.length >= 20) {
    return true;
  }

  entries.push(now);
  requestLog.set(code, entries);
  return false;
}

function generateCode(prefix: string) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = `${prefix}-`;
  for (let index = 0; index < 6; index += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export async function generatePortalCodes(userId: string, transactionId: string) {
  const [transaction] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.ownerId, userId)))
    .limit(1);

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  const serialized = serializeTransaction(transaction) as Record<string, unknown>;
  const agentCode = typeof serialized.agent_code === 'string' ? serialized.agent_code : generateCode('AGT');
  const clientCode = typeof serialized.client_code === 'string'
    ? serialized.client_code
    : typeof serialized.client_access_code === 'string'
      ? serialized.client_access_code
      : generateCode('CLT');

  const [updated] = await db
    .update(transactions)
    .set({
      data: {
        ...transaction.data,
        agent_code: agentCode,
        client_code: clientCode,
        client_access_code: clientCode,
      },
    })
    .where(eq(transactions.id, transactionId))
    .returning();

  return {
    transaction: serializeTransaction(updated),
    agent_code: agentCode,
    client_code: clientCode,
  };
}

export async function lookupPortalCode(code: string) {
  const normalizedCode = code.trim().toUpperCase();
  if (isRateLimited(normalizedCode)) {
    throw new Error('Too many attempts. Please try again later.');
  }

  const rows = await db.select().from(transactions);
  const transactionsList = rows.map((row) => serializeTransaction(row) as Record<string, unknown>);
  const agentTransaction = transactionsList.find((transaction) => String(transaction.agent_code || '').trim().toUpperCase() === normalizedCode);
  if (agentTransaction) {
    return {
      role: 'agent',
      transaction: agentTransaction,
    };
  }

  const clientTransaction = transactionsList.find((transaction) => {
    const clientCode = String(transaction.client_code || '').trim().toUpperCase();
    const legacyCode = String(transaction.client_access_code || '').trim().toUpperCase();
    return clientCode === normalizedCode || legacyCode === normalizedCode;
  });

  if (!clientTransaction) {
    throw new Error('No transaction found for this code. Please check and try again.');
  }

  return {
    role: 'client',
    transaction: clientTransaction,
  };
}