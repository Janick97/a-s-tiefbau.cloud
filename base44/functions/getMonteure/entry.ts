import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Service role erlaubt User.list() auch für nicht-Admins
    const users = await base44.asServiceRole.entities.User.list();
    const monteure = users
      .filter(u => u.position === 'Monteur')
      .map(u => ({ id: u.id, full_name: u.full_name, email: u.email }));

    return Response.json({ monteure });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});