import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, fullName, organizationId, role: userRole, jobTitle, userType } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Verify the request comes from an authenticated admin
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!serviceRoleKey) {
    return res.status(500).json({ error: 'Service role key not configured' });
  }

  // Admin client with service role key (bypasses RLS and rate limits)
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify the caller is an authenticated admin
  const anonClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || '', {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const token = authHeader.replace('Bearer ', '');
  const { data: { user: caller }, error: authErr } = await anonClient.auth.getUser(token);
  if (authErr || !caller) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Check caller is admin
  const { data: callerData } = await adminClient.from('users').select('role').eq('id', caller.id).single();
  if (callerData?.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create users' });
  }

  try {
    // Create auth user using admin API (no rate limit)
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

    // Check if users row exists (trigger may have created it)
    const { data: existing } = await adminClient.from('users').select('id').eq('id', authUserId).maybeSingle();

    const assignedRole = userRole || 'member';
    if (!existing) {
      await adminClient.from('users').insert({
        id: authUserId,
        email,
        full_name: fullName || email.split('@')[0],
        organization_id: organizationId,
        role: assignedRole,
        job_title: jobTitle || null,
        user_type: userType || 'consultant',
      });
    } else {
      // Update organization_id in case trigger created the row without it
      await adminClient.from('users').update({
        organization_id: organizationId,
        full_name: fullName || email.split('@')[0],
        role: assignedRole,
        job_title: jobTitle || null,
        user_type: userType || 'consultant',
      }).eq('id', authUserId);
    }

    return res.status(200).json({ userId: authUserId, email });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
