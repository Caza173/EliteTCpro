/**
 * manageTeam — Create teams, add/remove members, list teams for current user.
 *
 * Actions:
 *   list_my_teams        — Get all teams the current user belongs to (or all if super admin)
 *   list_all_teams       — Super admin only: all teams
 *   create_team          — Create a new team + optionally add members
 *   add_member           — Add a user to a team
 *   remove_member        — Remove a user from a team
 *   update_member_role   — Change a member's role
 *   get_team_members     — Get all members of a team
 *   delete_team          — Super admin only
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUPER_ADMIN_EMAIL = 'nhcazateam@gmail.com';

function isSuperAdmin(user) {
  return user.email === SUPER_ADMIN_EMAIL || user.role === 'admin' || user.role === 'owner';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // ── LIST MY TEAMS ──────────────────────────────────────────────────────────
    if (action === 'list_my_teams') {
      if (isSuperAdmin(user)) {
        const teams = await base44.asServiceRole.entities.Team.filter({ is_active: true });
        return Response.json({ teams });
      }
      // Get memberships for this user
      const memberships = await base44.asServiceRole.entities.TeamMember.filter({ user_id: user.id });
      if (!memberships.length) return Response.json({ teams: [] });
      const teamIds = [...new Set(memberships.map(m => m.team_id))];
      const allTeams = await base44.asServiceRole.entities.Team.filter({ is_active: true });
      const teams = allTeams.filter(t => teamIds.includes(t.id));
      return Response.json({ teams, memberships });
    }

    // ── LIST ALL TEAMS (super admin) ───────────────────────────────────────────
    if (action === 'list_all_teams') {
      if (!isSuperAdmin(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const teams = await base44.asServiceRole.entities.Team.list();
      return Response.json({ teams });
    }

    // ── CREATE TEAM ────────────────────────────────────────────────────────────
    if (action === 'create_team') {
      if (!isSuperAdmin(user)) return Response.json({ error: 'Only admins can create teams' }, { status: 403 });
      const { name, description, members = [] } = body;
      if (!name) return Response.json({ error: 'name is required' }, { status: 400 });

      const team = await base44.asServiceRole.entities.Team.create({
        name,
        description: description || null,
        brokerage_id: user.data?.brokerage_id || null,
        created_by: user.id,
        is_active: true,
      });

      // Add creator as team_admin
      await base44.asServiceRole.entities.TeamMember.create({
        team_id: team.id,
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name || user.email,
        role: 'team_admin',
        is_primary: true,
        added_by: user.email,
      });

      // Add additional members
      for (const m of members) {
        if (m.user_id === user.id) continue; // already added as admin
        await base44.asServiceRole.entities.TeamMember.create({
          team_id: team.id,
          user_id: m.user_id,
          user_email: m.user_email,
          user_name: m.user_name || m.user_email,
          role: m.role || 'tc',
          is_primary: false,
          added_by: user.email,
        });
      }

      return Response.json({ team });
    }

    // ── ADD MEMBER ─────────────────────────────────────────────────────────────
    if (action === 'add_member') {
      const { team_id, user_id: targetUserId, user_email: targetEmail, user_name: targetName, role: memberRole } = body;
      if (!team_id || !targetUserId) return Response.json({ error: 'team_id and user_id required' }, { status: 400 });

      // Check permission: must be super admin or team_admin of this team
      if (!isSuperAdmin(user)) {
        const myMembership = await base44.asServiceRole.entities.TeamMember.filter({ team_id, user_id: user.id });
        if (!myMembership.length || myMembership[0].role !== 'team_admin') {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      // Check not already a member
      const existing = await base44.asServiceRole.entities.TeamMember.filter({ team_id, user_id: targetUserId });
      if (existing.length) return Response.json({ error: 'User is already a member of this team' }, { status: 409 });

      const member = await base44.asServiceRole.entities.TeamMember.create({
        team_id,
        user_id: targetUserId,
        user_email: targetEmail,
        user_name: targetName || targetEmail,
        role: memberRole || 'tc',
        is_primary: false,
        added_by: user.email,
      });

      return Response.json({ member });
    }

    // ── REMOVE MEMBER ──────────────────────────────────────────────────────────
    if (action === 'remove_member') {
      const { team_id, member_id } = body;
      if (!team_id || !member_id) return Response.json({ error: 'team_id and member_id required' }, { status: 400 });

      if (!isSuperAdmin(user)) {
        const myMembership = await base44.asServiceRole.entities.TeamMember.filter({ team_id, user_id: user.id });
        if (!myMembership.length || myMembership[0].role !== 'team_admin') {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      await base44.asServiceRole.entities.TeamMember.delete(member_id);
      return Response.json({ success: true });
    }

    // ── UPDATE MEMBER ROLE ─────────────────────────────────────────────────────
    if (action === 'update_member_role') {
      const { team_id, member_id, role: newRole } = body;
      if (!team_id || !member_id || !newRole) return Response.json({ error: 'team_id, member_id, role required' }, { status: 400 });

      if (!isSuperAdmin(user)) {
        const myMembership = await base44.asServiceRole.entities.TeamMember.filter({ team_id, user_id: user.id });
        if (!myMembership.length || myMembership[0].role !== 'team_admin') {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      await base44.asServiceRole.entities.TeamMember.update(member_id, { role: newRole });
      return Response.json({ success: true });
    }

    // ── GET TEAM MEMBERS ───────────────────────────────────────────────────────
    if (action === 'get_team_members') {
      const { team_id } = body;
      if (!team_id) return Response.json({ error: 'team_id required' }, { status: 400 });
      const members = await base44.asServiceRole.entities.TeamMember.filter({ team_id });
      return Response.json({ members });
    }

    // ── DELETE TEAM ────────────────────────────────────────────────────────────
    if (action === 'delete_team') {
      if (!isSuperAdmin(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const { team_id } = body;
      await base44.asServiceRole.entities.Team.update(team_id, { is_active: false });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('manageTeam error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});