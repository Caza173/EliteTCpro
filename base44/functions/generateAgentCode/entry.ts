import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/I/1 ambiguity
  let code = 'AGT-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { agent_id } = body;

  if (!agent_id) {
    return Response.json({ error: 'agent_id is required' }, { status: 400 });
  }

  // Generate a unique code (check for collisions)
  const allAgents = await base44.asServiceRole.entities.Agent.list();
  let code;
  let attempts = 0;
  do {
    code = makeCode();
    attempts++;
  } while (allAgents.some(a => a.reference_code === code) && attempts < 20);

  await base44.asServiceRole.entities.Agent.update(agent_id, { reference_code: code });

  return Response.json({ code });
});