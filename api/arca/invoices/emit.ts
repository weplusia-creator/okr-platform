import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { WSAAClient } from '../../../src/lib/arca/wsaa.js';
import { WSFEV1Client } from '../../../src/lib/arca/wsfev1.js';
import type { FECAERequestParams, IVADetail } from '../../../src/lib/arca/wsfev1.js';
import { decryptData } from '../../../src/lib/arca/crypto.js';

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
    return res.status(403).json({ error: 'Only admins can emit invoices via ARCA' });
  }

  // --- Parse request body ---
  const {
    invoiceId,
    organizationCuitId,
    puntoVentaId,
    tipoComprobante,
    items,
  } = req.body;

  if (!invoiceId || !organizationCuitId || !puntoVentaId || !tipoComprobante) {
    return res.status(400).json({
      error: 'Missing required fields: invoiceId, organizationCuitId, puntoVentaId, tipoComprobante',
    });
  }

  try {
    // --- MOCK MODE ---
    if (process.env.ARCA_MOCK === 'true') {
      const mockCae = '71234567890123';
      const mockCaeVto = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, '');
      const mockNumero = Math.floor(Math.random() * 99999) + 1;

      // Update invoice with mock data
      await adminClient
        .from('invoices')
        .update({
          arca_status: 'approved',
          arca_cae: mockCae,
          arca_cae_vencimiento: mockCaeVto,
          arca_numero_comprobante: mockNumero,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      // Store in arca_invoices
      await adminClient.from('arca_invoices').insert({
        invoice_id: invoiceId,
        organization_cuit_id: organizationCuitId,
        punto_venta: puntoVentaId,
        tipo_comprobante: tipoComprobante,
        numero_comprobante: mockNumero,
        cae: mockCae,
        cae_vencimiento: mockCaeVto,
        status: 'approved',
        request_xml: '<mock>true</mock>',
        response_xml: '<mock>true</mock>',
        created_at: new Date().toISOString(),
      });

      return res.status(200).json({
        success: true,
        mock: true,
        cae: mockCae,
        caeVencimiento: mockCaeVto,
        numeroComprobante: mockNumero,
      });
    }

    // --- Fetch CUIT configuration ---
    const { data: cuitConfig, error: cuitError } = await adminClient
      .from('organization_cuits')
      .select('*')
      .eq('id', organizationCuitId)
      .single();

    if (cuitError || !cuitConfig) {
      return res.status(404).json({ error: 'CUIT configuration not found' });
    }

    // Validate certificate exists
    if (!cuitConfig.certificate_encrypted || !cuitConfig.private_key_encrypted) {
      return res.status(400).json({
        error: 'No se encontró certificado para este CUIT. Subí el certificado y la clave privada desde la configuración de ARCA.',
      });
    }

    // Decrypt certificate and key
    const certificate = decryptData(cuitConfig.certificate_encrypted);
    const privateKey = decryptData(cuitConfig.private_key_encrypted);
    const cuit = cuitConfig.cuit;
    const environment = cuitConfig.environment || 'testing';

    // --- Check/refresh WSAA token ---
    let wsaaToken: string;
    let wsaaSign: string;

    const { data: existingToken } = await adminClient
      .from('arca_tokens')
      .select('*')
      .eq('organization_cuit_id', organizationCuitId)
      .eq('service', 'wsfe')
      .single();

    const now = new Date();
    const isTokenValid =
      existingToken &&
      existingToken.expiration_time &&
      new Date(existingToken.expiration_time) > now;

    if (isTokenValid && existingToken) {
      wsaaToken = existingToken.token;
      wsaaSign = existingToken.sign;
    } else {
      // Request new token from WSAA
      const wsaaClient = new WSAAClient(certificate, privateKey, environment);
      const newToken = await wsaaClient.getToken('wsfe');

      wsaaToken = newToken.token;
      wsaaSign = newToken.sign;

      // Upsert token in database
      if (existingToken) {
        await adminClient
          .from('arca_tokens')
          .update({
            token: newToken.token,
            sign: newToken.sign,
            generation_time: newToken.generationTime,
            expiration_time: newToken.expirationTime,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingToken.id);
      } else {
        await adminClient.from('arca_tokens').insert({
          organization_cuit_id: organizationCuitId,
          service: 'wsfe',
          token: newToken.token,
          sign: newToken.sign,
          generation_time: newToken.generationTime,
          expiration_time: newToken.expirationTime,
        });
      }
    }

    // --- Fetch invoice data ---
    const { data: invoice, error: invoiceError } = await adminClient
      .from('invoices')
      .select('*, invoice_items(*), clients(*)')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // --- Get ultimo autorizado ---
    const wsfev1 = new WSFEV1Client(wsaaToken, wsaaSign, cuit, environment);
    const ultimoAutorizado = await wsfev1.getUltimoAutorizado(puntoVentaId, tipoComprobante);
    const nuevoNumero = ultimoAutorizado + 1;

    // --- Build invoice parameters ---
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    // Determine document type and number from client
    const client = invoice.clients;
    let docTipo = 99; // Consumidor Final by default
    let docNro = '0';
    if (client?.cuit) {
      docTipo = 80; // CUIT
      docNro = client.cuit.replace(/-/g, '');
    }

    // Calculate IVA details from items
    const ivaDetails: IVADetail[] = [];
    const invoiceItems = items || invoice.invoice_items || [];
    let impNeto = 0;
    let impIVA = 0;

    for (const item of invoiceItems) {
      const baseImp = item.unit_price * item.quantity;
      const ivaRate = item.iva_rate || 21;
      const ivaImporte = baseImp * (ivaRate / 100);

      // Map rate to ARCA IVA ID
      let ivaId = 5; // 21% default
      if (ivaRate === 10.5) ivaId = 4;
      else if (ivaRate === 27) ivaId = 6;
      else if (ivaRate === 5) ivaId = 8;
      else if (ivaRate === 2.5) ivaId = 9;
      else if (ivaRate === 0) ivaId = 3;

      // Aggregate by IVA ID
      const existing = ivaDetails.find((d) => d.id === ivaId);
      if (existing) {
        existing.baseImp += baseImp;
        existing.importe += ivaImporte;
      } else {
        ivaDetails.push({ id: ivaId, baseImp, importe: ivaImporte });
      }

      impNeto += baseImp;
      impIVA += ivaImporte;
    }

    const impTotal = impNeto + impIVA;

    const fecaeParams: FECAERequestParams = {
      puntoVenta: puntoVentaId,
      tipoComprobante,
      concepto: 2, // Servicios by default
      docTipo,
      docNro,
      cbteDesde: nuevoNumero,
      cbteHasta: nuevoNumero,
      cbteFecha: today,
      impTotal: Math.round(impTotal * 100) / 100,
      impTotConc: 0,
      impNeto: Math.round(impNeto * 100) / 100,
      impOpEx: 0,
      impTrib: 0,
      impIVA: Math.round(impIVA * 100) / 100,
      ivaDetails: ivaDetails.map((d) => ({
        ...d,
        baseImp: Math.round(d.baseImp * 100) / 100,
        importe: Math.round(d.importe * 100) / 100,
      })),
      fchServDesde: today,
      fchServHasta: today,
      fchVtoPago: today,
    };

    // --- Emit invoice ---
    const fecaeResponse = await wsfev1.emitInvoice(fecaeParams);

    // --- Store result in arca_invoices ---
    await adminClient.from('arca_invoices').insert({
      invoice_id: invoiceId,
      organization_cuit_id: organizationCuitId,
      punto_venta: puntoVentaId,
      tipo_comprobante: tipoComprobante,
      numero_comprobante: fecaeResponse.numeroComprobante,
      cae: fecaeResponse.cae,
      cae_vencimiento: fecaeResponse.caeVencimiento,
      status: fecaeResponse.success ? 'approved' : 'rejected',
      error_code: fecaeResponse.errorCode,
      error_message: fecaeResponse.errorMessage,
      observations: fecaeResponse.observations,
      request_xml: fecaeResponse.requestXml,
      response_xml: fecaeResponse.responseXml,
      created_at: new Date().toISOString(),
    });

    // --- Update invoices table ---
    const updateData: Record<string, any> = {
      arca_status: fecaeResponse.success ? 'approved' : 'rejected',
      updated_at: new Date().toISOString(),
    };

    if (fecaeResponse.success) {
      updateData.arca_cae = fecaeResponse.cae;
      updateData.arca_cae_vencimiento = fecaeResponse.caeVencimiento;
      updateData.arca_numero_comprobante = fecaeResponse.numeroComprobante;
    }

    await adminClient
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId);

    // --- Return result ---
    return res.status(200).json({
      success: fecaeResponse.success,
      cae: fecaeResponse.cae,
      caeVencimiento: fecaeResponse.caeVencimiento,
      numeroComprobante: fecaeResponse.numeroComprobante,
      errorCode: fecaeResponse.errorCode,
      errorMessage: fecaeResponse.errorMessage,
      observations: fecaeResponse.observations,
    });
  } catch (err: any) {
    console.error('ARCA invoice emission error:', err);
    return res.status(500).json({
      error: err.message || 'Internal server error during ARCA invoice emission',
    });
  }
}
