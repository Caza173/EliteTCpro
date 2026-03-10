import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    // Use service role to check what's in the DB
    const transactions = await base44.asServiceRole.entities.Transaction.list();
    const brokerages = await base44.asServiceRole.entities.Brokerage.list();
    const users = await base44.asServiceRole.entities.User.list();
    
    const user = users.find(u => u.email === 'nhcazateam@gmail.com');
    
    return Response.json({
        transaction_count: transactions.length,
        brokerage_count: brokerages.length,
        user_data: user ? user.data : null,
        user_role: user ? user.role : null,
        sample_transaction_brokerage_id: transactions[0]?.brokerage_id,
        user_brokerage_id: user?.data?.brokerage_id
    });
});