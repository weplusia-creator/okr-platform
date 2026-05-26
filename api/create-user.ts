import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (req.body || {}) as any;
  const { email, password, fullName, organizationId, role: userRole, jobTitle, userType, clientId } = body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const authHeader = (req.headers['authorization'] as string | undefined);
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!serviceRoleKey) {
    return res.status(500).json({ error: 'Service role key not configured' });
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
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { data: callerData } = await adminClient.from('users').select('role').eq('id', caller.id).single();
  if (callerData?.role !== 'admin' && callerData?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only admins can create users' });
  }

  try {
    const { data: authData, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || email.split('@')[0] },
    });

    if (createErr) {
      return res.status(400).json({ error: createErr.message });
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
        return res.status(400).json({ error: `Error creating user record: ${insertErr.message}` });
      }
    } else {
      const { error: updateErr } = await adminClient.from('users').update(userData).eq('id', authUserId);
      if (updateErr) {
        return res.status(400).json({ error: `Error updating user record: ${updateErr.message}` });
      }
    }

    const { data: verify } = await adminClient.from('users').select('organization_id').eq('id', authUserId).single();
    if (!verify?.organization_id) {
      return res.status(500).json({ error: 'User created but organization_id not set. Check database triggers.' });
    }

    return res.status(200).json({ userId: authUserId, email });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}