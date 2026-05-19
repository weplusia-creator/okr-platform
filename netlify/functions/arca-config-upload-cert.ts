import { createClient } from '@supabase/supabase-js';
import type { Context, Config } from '@netlify/functions';
import forge from 'node-forge';
import { encryptData } from '../../src/lib/arca/crypto.js';

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
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

  const { data: callerData } = await adminClient.from('users').select('role, organization_id').eq('id', caller.id).single();
  if (callerData?.role !== 'admin' && callerData?.role !== 'super_admin') {
    return Response.json({ error: 'Only admins can upload ARCA certificates' }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { certContent, keyContent, cuitId } = body;

    if (!certContent || !keyContent || !cuitId) {
      return Response.json({
        error: 'Missing required fields: certContent (base64 or PEM string), keyContent (base64 or PEM string), cuitId',
      }, { status: 400 });
    }

    let certPem: string;
    let keyPem: string;

    if (certContent.includes('-----BEGIN')) {
      certPem = certContent;
    } else {
      certPem = Buffer.from(certContent, 'base64').toString('utf-8');
    }

    if (keyContent.includes('-----BEGIN')) {
      keyPem = keyContent;
    } else {
      keyPem = Buffer.from(keyContent, 'base64').toString('utf-8');
    }

    let certExpiry: Date;
    try {
      const cert = forge.pki.certificateFromPem(certPem);
      certExpiry = cert.validity.notAfter;

      if (certExpiry < new Date()) {
        return Response.json({
          error: 'Certificate is already expired',
          expiryDate: certExpiry.toISOString(),
        }, { status: 400 });
      }
    } catch (certError: any) {
      return Response.json({
        error: `Invalid certificate format: ${certError.message}`,
      }, { status: 400 });
    }

    try {
      forge.pki.privateKeyFromPem(keyPem);
    } catch (keyError: any) {
      return Response.json({
        error: `Invalid private key format: ${keyError.message}`,
      }, { status: 400 });
    }

    const certificateEncrypted = encryptData(certPem);
    const privateKeyEncrypted = encryptData(keyPem);

    const { data: cuitRecord, error: cuitFetchError } = await adminClient
      .from('organization_cuits')
      .select('id, organization_id')
      .eq('id', cuitId)
      .single();

    if (cuitFetchError || !cuitRecord) {
      return Response.json({ error: 'CUIT configuration not found' }, { status: 404 });
    }

    if (cuitRecord.organization_id !== callerData?.organization_id) {
      return Response.json({ error: 'CUIT does not belong to your organization' }, { status: 403 });
    }

    const { error: updateError } = await adminClient
      .from('organization_cuits')
      .update({
        certificate_encrypted: certificateEncrypted,
        private_key_encrypted: privateKeyEncrypted,
        certificate_expiry: certExpiry.toISOString(),
        certificate_uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', cuitId);

    if (updateError) {
      return Response.json({
        error: `Failed to store certificate: ${updateError.message}`,
      }, { status: 500 });
    }

    await adminClient
      .from('arca_tokens')
      .delete()
      .eq('organization_cuit_id', cuitId);

    return Response.json({
      success: true,
      certificateExpiry: certExpiry.toISOString(),
      message: 'Certificate and private key uploaded successfully',
    });
  } catch (err: any) {
    console.error('Certificate upload error:', err);
    return Response.json({
      error: err.message || 'Internal server error during certificate upload',
    }, { status: 500 });
  }
};

export const config: Config = {
  path: '/api/arca/config/upload-cert',
};
