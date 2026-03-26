import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Only admins can run migrations
    if (user.role !== 'admin' && user.role !== 'owner') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all contingencies
    const contingencies = await base44.asServiceRole.entities.Contingency.filter({});
    
    let updated = 0;
    const errors = [];

    for (const c of contingencies) {
      try {
        // Set default values for new fields
        const updates: any = {};
        
        // Inspection types should default to timed events
        if (c.contingency_type === 'Inspection' && c.is_all_day == null) {
          updates.is_all_day = false;
        } else if (c.is_all_day == null) {
          updates.is_all_day = true;
        }

        // If there's a scheduled_time, copy it to due_time
        if (c.scheduled_time && !c.due_time) {
          updates.due_time = c.scheduled_time;
        }

        if (Object.keys(updates).length > 0) {
          await base44.asServiceRole.entities.Contingency.update(c.id, updates);
          updated++;
        }
      } catch (err) {
        errors.push({ id: c.id, error: err.message });
      }
    }

    return Response.json({
      success: true,
      updated,
      errors,
      message: `Updated ${updated} contingency records with new field defaults.`,
    });
  } catch (error) {
    console.error('migrateContingencies error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});