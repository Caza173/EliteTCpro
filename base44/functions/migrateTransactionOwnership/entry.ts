/**
 * migrateTransactionOwnership
 * 
 * One-time migration: finds all Transaction records where created_by is stored
 * as an email address (instead of a user UUID), looks up the user by email,
 * and replaces created_by with the correct user.id.
 * 
 * Admin-only. Run once via the dashboard Functions panel.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'owner' && user.email !== 'nhcazateam@gmail.com')) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all transactions
    const allTx = await base44.asServiceRole.entities.Transaction.list('-created_date', 1000);
    console.log(`[migrate] Total transactions: ${allTx.length}`);

    // Fetch all users for email → id lookup
    const allUsers = await base44.asServiceRole.entities.User.list();
    const emailToId = {};
    for (const u of allUsers) {
      if (u.email) emailToId[u.email.toLowerCase()] = u.id;
    }
    console.log(`[migrate] Total users loaded: ${allUsers.length}`);

    // Find transactions where created_by looks like an email (contains @)
    const needsMigration = allTx.filter(tx => tx.created_by && tx.created_by.includes('@'));
    console.log(`[migrate] Transactions needing migration: ${needsMigration.length}`);

    const results = { migrated: [], skipped: [], notFound: [] };

    for (const tx of needsMigration) {
      const email = tx.created_by.toLowerCase();
      const userId = emailToId[email];

      if (!userId) {
        console.warn(`[migrate] No user found for email: ${tx.created_by} (tx: ${tx.id})`);
        results.notFound.push({ id: tx.id, address: tx.address, created_by: tx.created_by });
        continue;
      }

      await base44.asServiceRole.entities.Transaction.update(tx.id, { created_by: userId });
      console.log(`[migrate] Updated tx ${tx.id} (${tx.address}): ${tx.created_by} → ${userId}`);
      results.migrated.push({ id: tx.id, address: tx.address, from: tx.created_by, to: userId });
    }

    console.log(`[migrate] Done. Migrated: ${results.migrated.length}, Not found: ${results.notFound.length}`);

    return Response.json({
      success: true,
      total: allTx.length,
      neededMigration: needsMigration.length,
      migrated: results.migrated.length,
      notFound: results.notFound.length,
      details: results,
    });

  } catch (error) {
    console.error('[migrate] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});