import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (req.body || {}) as any;
  const { email, password, fullName, organizationId, role: userRole, jobTitle, userType, clientId } = body;

  // Password is now OPTIONAL — when omitted (preferred) Supabase
  // sends an invite email with a magic link and the user sets their
  // own password on first login.
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
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
    // Prefer the invite flow: Supabase generates a one-time link, emails
    // it to the user, and the user sets their own password on first
    // landing. Fallback to createUser if a password was explicitly
    // provided (e.g. for tests).
    let authUserId: string;
    let inviteSent = false;

    if (password) {
      // Legacy path — explicit password, no email sent.
      const { data: authData, error: createErr } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName || email.split('@')[0] },
      });
      if (createErr) return res.status(400).json({ error: createErr.message });
      authUserId = authData.user.id;
    } else {
      // Preferred path — invite email with magic link.
      // redirectTo points the email's "Accept invitation" button at
      // your app, which then asks the user to set their password.
      const appUrl =
        process.env.APP_URL ||
        process.env.VITE_APP_URL ||
        'https://www.wauconsultora.com';

      const { data: invited, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName || email.split('@')[0] },
        redirectTo: `${appUrl}/login?invited=1`,
      });
      if (inviteErr) {
        // The most common failure is "user already exists" — fall back
        // to looking up the existing auth user so we can attach the
        // app row to them.
        if (/already.*registered|already.*exists/i.test(inviteErr.message)) {
          const { data: existingUser } = await adminClient.auth.admin.listUsers();
          const found = existingUser.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
          if (!found) return res.status(400).json({ error: inviteErr.message });
          authUserId = found.id;
        } else {
          return res.status(400).json({ error: inviteErr.message });
        }
      } else if (invited?.user) {
        authUserId = invited.user.id;
        inviteSent = true;
      } else {
        return res.status(500).json({ error: 'Invite did not return a user' });
      }
    }
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

    return res.status(200).json({ userId: authUserId, email, inviteSent });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}