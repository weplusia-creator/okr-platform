import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import forge from 'node-forge';
import { encryptData } from '../../../src/lib/arca/crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // --- Auth validation (same pattern as create-user.ts) ---
  const authHeader = req.headers.authorization;
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

  const { data: callerData } = await adminClient.from('users').select('role, organization_id').eq('id', caller.id).single();
  if (callerData?.role !== 'admin' && callerData?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Only admins can upload ARCA certificates' });
  }

  try {
    // --- Parse request body ---
    // Expects JSON with base64-encoded certificate and key content
    const { certContent, keyContent, cuitId } = req.body;

    if (!certContent || !keyContent || !cuitId) {
      return res.status(400).json({
        error: 'Missing required fields: certContent (base64 or PEM string), keyContent (base64 or PEM string), cuitId',
      });
    }

    // Decode content - support both raw PEM and base64-encoded PEM
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

    // --- Validate certificate format ---
    let certExpiry: Date;
    try {
      const cert = forge.pki.certificateFromPem(certPem);
      certExpiry = cert.validity.notAfter;

      // Check if certificate is already expired
      if (certExpiry < new Date()) {
        return res.status(400).json({
          error: 'Certificate is already expired',
          expiryDate: certExpiry.toISOString(),
        });
      }
    } catch (certError: any) {
      return res.status(400).json({
        error: `Invalid certificate format: ${certError.message}`,
      });
    }

    // --- Validate private key format ---
    try {
      forge.pki.privateKeyFromPem(keyPem);
    } catch (keyError: any) {
      return res.status(400).json({
        error: `Invalid private key format: ${keyError.message}`,
      });
    }

    // --- Encrypt certificate and key ---
    const certificateEncrypted = encryptData(certPem);
    const privateKeyEncrypted = encryptData(keyPem);

    // --- Verify the CUIT record exists and belongs to caller's organization ---
    const { data: cuitRecord, error: cuitFetchError } = await adminClient
      .from('organization_cuits')
      .select('id, organization_id')
      .eq('id', cuitId)
      .single();

    if (cuitFetchError || !cuitRecord) {
      return res.status(404).json({ error: 'CUIT configuration not found' });
    }

    // Verify the CUIT belongs to the caller's organization
    if (cuitRecord.organization_id !== callerData?.organization_id) {
      return res.status(403).json({ error: 'CUIT does not belong to your organization' });
    }

    // --- Store encrypted certificate and key ---
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
      return res.status(500).json({
        error: `Failed to store certificate: ${updateError.message}`,
      });
    }

    // --- Invalidate any existing WSAA tokens for this CUIT (force re-auth) ---
    await adminClient
      .from('arca_tokens')
      .delete()
      .eq('organization_cuit_id', cuitId);

    return res.status(200).json({
      success: true,
      certificateExpiry: certExpiry.toISOString(),
      message: 'Certificate and private key uploaded successfully',
    });
  } catch (err: any) {
    console.error('Certificate upload error:', err);
    return res.status(500).json({
      error: err.message || 'Internal server error during certificate upload',
    });
  }
}
