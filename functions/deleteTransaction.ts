import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const allowedRoles = ['admin', 'owner', 'tc_lead', 'tc'];
    if (!allowedRoles.includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { transaction_id } = await req.json();
    if (!transaction_id) return Response.json({ error: 'transaction_id required' }, { status: 400 });

    const appId = Deno.env.get('BASE44_APP_ID');
    const serviceToken = req.headers.get('Authorization');

    const res = await fetch(
      `https://api.base44.com/api/apps/${appId}/entities/Transaction/${transaction_id}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': serviceToken,
          'X-App-Id': appId,
        },
      }
    );

    if (!res.ok && res.status !== 404) {
      const body = await res.text();
      return Response.json({ error: `Delete failed: ${body}` }, { status: res.status });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});