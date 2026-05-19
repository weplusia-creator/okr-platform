import { createClient } from '@supabase/supabase-js';
import type { Context, Config } from '@netlify/functions';

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const body = await req.json().catch(() => ({}));
  const { userId } = body;

  if (!userId) {
    return Response.json({ error: 'userId is required' }, { status: 400 });
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!serviceRoleKey) {
    return Response.json({ error: 'Service role key not configured' }, { status: 500 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const anonClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || '', {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const token = authHeader.replace('Bearer ', '');
  const { data: { user: caller }, error: authErr } = await anonClient.auth.getUser(token);
  if (authErr || !caller) {
    return Response.json({ error: 'Invalid token' }, { status: 401 });
  }

  const { data: callerData } = await adminClient.from('users').select('role').eq('id', caller.id).single();
  if (callerData?.role !== 'admin' && callerData?.role !== 'super_admin') {
    return Response.json({ error: 'Only admins can delete users' }, { status: 403 });
  }

  if (userId === caller.id) {
    return Response.json({ error: 'No podés eliminarte a vos mismo' }, { status: 400 });
  }

  try {
    await adminClient.from('users').delete().eq('id', userId);

    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteErr) {
      return Response.json({ error: deleteErr.message }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};

export const config: Config = {
  path: '/api/delete-user',
};
