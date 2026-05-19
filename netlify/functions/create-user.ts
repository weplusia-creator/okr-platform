import { createClient } from '@supabase/supabase-js';
import type { Context, Config } from '@netlify/functions';

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const body = await req.json().catch(() => ({}));
  const { email, password, fullName, organizationId, role: userRole, jobTitle, userType, clientId } = body;

  if (!email || !password) {
    return Response.json({ error: 'Email and password are required' }, { status: 400 });
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
    return Response.json({ error: 'Only admins can create users' }, { status: 403 });
  }

  try {
    const { data: authData, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || email.split('@')[0] },
    });

    if (createErr) {
      return Response.json({ error: createErr.message }, { status: 400 });
    }

    const authUserId = authData.user.id;
    const assignedRole = userRole || 'member';
    const userData = {
      organization_id: organizationId,
      full_name: fullName || email.split('@')[0],
      role: assignedRole,
      job_title: jobTitle || null,
      user_type: userType || 'consultant',
      client_id: clientId || null,
    };

    await new Promise(r => setTimeout(r, 500));

    const { data: existing } = await adminClient.from('users').select('id').eq('id', authUserId).maybeSingle();

    if (!existing) {
      const { error: insertErr } = await adminClient.from('users').insert({
        id: authUserId,
        email,
        ...userData,
      });
      if (insertErr) {
        return Response.json({ error: `Error creating user record: ${insertErr.message}` }, { status: 400 });
      }
    } else {
      const { error: updateErr } = await adminClient.from('users').update(userData).eq('id', authUserId);
      if (updateErr) {
        return Response.json({ error: `Error updating user record: ${updateErr.message}` }, { status: 400 });
      }
    }

    const { data: verify } = await adminClient.from('users').select('organization_id').eq('id', authUserId).single();
    if (!verify?.organization_id) {
      return Response.json({ error: 'User created but organization_id not set. Check database triggers.' }, { status: 500 });
    }

    return Response.json({ userId: authUserId, email });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};

export const config: Config = {
  path: '/api/create-user',
};
