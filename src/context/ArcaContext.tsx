import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { supabase, getAccessTokenFresh } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type {
  OrganizationCuit,
  PuntoDeVenta,
  ArcaInvoice,
  ArcaInvoiceStatus,
  EmitArcaInvoiceRequest,
  EmitArcaInvoiceResponse,
} from '../types/arca';

interface ArcaContextType {
  // CUITs
  cuits: OrganizationCuit[];
  loadingCuits: boolean;
  fetchCuits: () => Promise<void>;
  addCuit: (data: Omit<OrganizationCuit, 'id' | 'organizationId' | 'hasCertificate' | 'certificateExpiry' | 'createdAt' | 'updatedAt'>) => Promise<OrganizationCuit | null>;
  updateCuit: (id: string, data: Partial<OrganizationCuit>) => Promise<void>;
  deleteCuit: (id: string) => Promise<void>;

  // Puntos de Venta
  puntosVenta: PuntoDeVenta[];
  loadingPuntosVenta: boolean;
  fetchPuntosVenta: () => Promise<void>;
  addPuntoVenta: (cuitId: string, numero: number, description?: string) => Promise<PuntoDeVenta | null>;
  deletePuntoVenta: (id: string) => Promise<void>;
  setDefaultPuntoVenta: (id: string) => Promise<void>;

  // ARCA Invoices
  arcaInvoices: ArcaInvoice[];
  loadingArcaInvoices: boolean;
  fetchArcaInvoices: () => Promise<void>;
  emitInvoice: (request: EmitArcaInvoiceRequest) => Promise<EmitArcaInvoiceResponse>;
  retryInvoice: (arcaInvoiceId: string) => Promise<EmitArcaInvoiceResponse>;

  // Certificate upload (calls API route)
  uploadCertificate: (cuitId: string, certFile: File, keyFile: File) => Promise<boolean>;

  loading: boolean;
  error: string | null;
}

const ArcaContext = createContext<ArcaContextType | undefined>(undefined);

export function ArcaProvider({ children }: { children: ReactNode }) {
  const { organization, session } = useAuth();
  const [cuits, setCuits] = useState<OrganizationCuit[]>([]);
  const [puntosVenta, setPuntosVenta] = useState<PuntoDeVenta[]>([]);
  const [arcaInvoices, setArcaInvoices] = useState<ArcaInvoice[]>([]);
  const [loadingCuits, setLoadingCuits] = useState(false);
  const [loadingPuntosVenta, setLoadingPuntosVenta] = useState(false);
  const [loadingArcaInvoices, setLoadingArcaInvoices] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===== CUITs =====
  const fetchCuits = useCallback(async () => {
    if (!organization?.id) return;
    setLoadingCuits(true);
    try {
      const { data, error: err } = await supabase
        .from('organization_cuits')
        .select('*')
        .eq('organization_id', organization.id)
        .order('is_primary', { ascending: false });

      if (err) throw err;

      setCuits((data || []).map((c: any) => ({
        id: c.id,
        organizationId: c.organization_id,
        cuit: c.cuit,
        businessName: c.business_name,
        fantasyName: c.fantasy_name ?? null,
        ivaCondition: c.iva_condition,
        grossIncomeNumber: c.gross_income_number ?? null,
        activityStartDate: c.activity_start_date ?? null,
        address: c.address ?? null,
        hasCertificate: !!(c.certificate_encrypted && c.private_key_encrypted),
        certificateExpiry: c.certificate_expiry ?? null,
        isPrimary: c.is_primary,
        isActive: c.is_active,
        environment: c.environment,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })));
    } catch (err) {
      console.error('Error fetching CUITs:', err);
      setError('Error al cargar CUITs');
    } finally {
      setLoadingCuits(false);
    }
  }, [organization?.id]);

  const addCuit = useCallback(async (
    data: Omit<OrganizationCuit, 'id' | 'organizationId' | 'hasCertificate' | 'certificateExpiry' | 'createdAt' | 'updatedAt'>
  ): Promise<OrganizationCuit | null> => {
    if (!organization?.id) {
      setError('No se encontró la organización');
      return null;
    }
    try {
      // Insert without .select().single() to avoid RLS read-back issues
      const { error: insertErr } = await supabase
        .from('organization_cuits')
        .insert({
          organization_id: organization.id,
          cuit: data.cuit,
          business_name: data.businessName,
          fantasy_name: data.fantasyName,
          iva_condition: data.ivaCondition,
          gross_income_number: data.grossIncomeNumber,
          activity_start_date: data.activityStartDate,
          address: data.address,
          is_primary: data.isPrimary,
          is_active: data.isActive,
          environment: data.environment,
        });

      if (insertErr) {
        console.error('Supabase addCuit insert error:', insertErr);
        throw new Error(insertErr.message || JSON.stringify(insertErr));
      }

      // Refresh the full list to get the new row
      await fetchCuits();

      // Return the newly added cuit from the refreshed state
      return cuits.find(c => c.cuit === data.cuit) ?? ({} as OrganizationCuit);
    } catch (err: any) {
      console.error('Error adding CUIT:', err);
      setError(err.message || 'Error al crear CUIT');
      return null;
    }
  }, [organization?.id, fetchCuits, cuits]);

  const updateCuit = useCallback(async (id: string, data: Partial<OrganizationCuit>) => {
    try {
      const row: Record<string, unknown> = {};
      if (data.cuit !== undefined) row.cuit = data.cuit;
      if (data.businessName !== undefined) row.business_name = data.businessName;
      if (data.fantasyName !== undefined) row.fantasy_name = data.fantasyName;
      if (data.ivaCondition !== undefined) row.iva_condition = data.ivaCondition;
      if (data.grossIncomeNumber !== undefined) row.gross_income_number = data.grossIncomeNumber;
      if (data.activityStartDate !== undefined) row.activity_start_date = data.activityStartDate;
      if (data.address !== undefined) row.address = data.address;
      if (data.isPrimary !== undefined) row.is_primary = data.isPrimary;
      if (data.isActive !== undefined) row.is_active = data.isActive;
      if (data.environment !== undefined) row.environment = data.environment;

      if (Object.keys(row).length === 0) return;

      const { error: err } = await supabase
        .from('organization_cuits')
        .update(row)
        .eq('id', id);

      if (err) throw err;

      setCuits(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    } catch (err) {
      console.error('Error updating CUIT:', err);
      setError('Error al actualizar CUIT');
    }
  }, []);

  const deleteCuit = useCallback(async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('organization_cuits')
        .delete()
        .eq('id', id);

      if (err) throw err;

      setCuits(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting CUIT:', err);
      setError('Error al eliminar CUIT');
    }
  }, []);

  // ===== PUNTOS DE VENTA =====
  const fetchPuntosVenta = useCallback(async () => {
    if (!organization?.id) return;
    setLoadingPuntosVenta(true);
    try {
      // Fetch puntos de venta for all CUITs belonging to this organization
      const { data: cuitRows } = await supabase
        .from('organization_cuits')
        .select('id')
        .eq('organization_id', organization.id);

      const cuitIds = (cuitRows || []).map(c => c.id);
      if (cuitIds.length === 0) {
        setPuntosVenta([]);
        setLoadingPuntosVenta(false);
        return;
      }

      const { data, error: err } = await supabase
        .from('arca_puntos_venta')
        .select('*')
        .in('organization_cuit_id', cuitIds)
        .order('numero');

      if (err) throw err;

      setPuntosVenta((data || []).map((p: any) => ({
        id: p.id,
        organizationCuitId: p.organization_cuit_id,
        numero: p.numero,
        description: p.description ?? null,
        isActive: p.is_active,
        isDefault: p.is_default,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })));
    } catch (err) {
      console.error('Error fetching puntos de venta:', err);
      setError('Error al cargar puntos de venta');
    } finally {
      setLoadingPuntosVenta(false);
    }
  }, [organization?.id]);

  const addPuntoVenta = useCallback(async (
    cuitId: string,
    numero: number,
    description?: string
  ): Promise<PuntoDeVenta | null> => {
    try {
      const { data, error: err } = await supabase
        .from('arca_puntos_venta')
        .insert({
          organization_cuit_id: cuitId,
          numero,
          description: description ?? null,
          is_active: true,
          is_default: false,
        })
        .select()
        .single();

      if (err) throw err;

      const d = data as any;
      const newPV: PuntoDeVenta = {
        id: d.id,
        organizationCuitId: d.organization_cuit_id,
        numero: d.numero,
        description: d.description ?? null,
        isActive: d.is_active,
        isDefault: d.is_default,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      };

      setPuntosVenta(prev => [...prev, newPV].sort((a, b) => a.numero - b.numero));
      return newPV;
    } catch (err) {
      console.error('Error adding punto de venta:', err);
      setError('Error al crear punto de venta');
      return null;
    }
  }, []);

  const deletePuntoVenta = useCallback(async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('arca_puntos_venta')
        .delete()
        .eq('id', id);

      if (err) throw err;

      setPuntosVenta(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting punto de venta:', err);
      setError('Error al eliminar punto de venta');
    }
  }, []);

  const setDefaultPuntoVenta = useCallback(async (id: string) => {
    try {
      const target = puntosVenta.find(p => p.id === id);
      if (!target) return;

      // Unset current default for the same CUIT
      const siblingIds = puntosVenta
        .filter(p => p.organizationCuitId === target.organizationCuitId && p.isDefault)
        .map(p => p.id);

      if (siblingIds.length > 0) {
        const { error: unsetErr } = await supabase
          .from('arca_puntos_venta')
          .update({ is_default: false })
          .in('id', siblingIds);

        if (unsetErr) throw unsetErr;
      }

      // Set the new default
      const { error: setErr } = await supabase
        .from('arca_puntos_venta')
        .update({ is_default: true })
        .eq('id', id);

      if (setErr) throw setErr;

      setPuntosVenta(prev =>
        prev.map(p => {
          if (p.organizationCuitId === target.organizationCuitId) {
            return { ...p, isDefault: p.id === id };
          }
          return p;
        })
      );
    } catch (err) {
      console.error('Error setting default punto de venta:', err);
      setError('Error al establecer punto de venta por defecto');
    }
  }, [puntosVenta]);

  // ===== ARCA INVOICES =====
  const fetchArcaInvoices = useCallback(async () => {
    if (!organization?.id) return;
    setLoadingArcaInvoices(true);
    try {
      const { data: cuitRows } = await supabase
        .from('organization_cuits')
        .select('id')
        .eq('organization_id', organization.id);

      const cuitIds = (cuitRows || []).map(c => c.id);
      if (cuitIds.length === 0) {
        setArcaInvoices([]);
        setLoadingArcaInvoices(false);
        return;
      }

      const { data, error: err } = await supabase
        .from('arca_invoices')
        .select('*')
        .in('organization_cuit_id', cuitIds)
        .order('created_at', { ascending: false });

      if (err) throw err;

      setArcaInvoices((data || []).map((inv: any) => ({
        id: inv.id,
        invoiceId: inv.invoice_id ?? null,
        organizationCuitId: inv.organization_cuit_id,
        puntoVentaId: inv.punto_venta_id,
        tipoComprobante: inv.tipo_comprobante,
        tipoComprobanteName: inv.tipo_comprobante_name ?? null,
        receptorCuit: inv.receptor_cuit,
        receptorTipoDoc: inv.receptor_tipo_doc,
        receptorCondicionIva: inv.receptor_condicion_iva ?? null,
        numeroComprobante: inv.numero_comprobante ?? null,
        cae: inv.cae ?? null,
        caeVencimiento: inv.cae_vencimiento ?? null,
        status: inv.status as ArcaInvoiceStatus,
        errorCode: inv.error_code ?? null,
        errorMessage: inv.error_message ?? null,
        observations: inv.observations ?? null,
        retryCount: inv.retry_count ?? 0,
        lastAttemptAt: inv.last_attempt_at ?? null,
        createdAt: inv.created_at,
        updatedAt: inv.updated_at,
      })));
    } catch (err) {
      console.error('Error fetching ARCA invoices:', err);
      setError('Error al cargar comprobantes ARCA');
    } finally {
      setLoadingArcaInvoices(false);
    }
  }, [organization?.id]);

  const emitInvoice = useCallback(async (request: EmitArcaInvoiceRequest): Promise<EmitArcaInvoiceResponse> => {
    if (!session?.access_token) {
      return { success: false, arcaInvoiceId: '', error: 'No autenticado' };
    }
    try {
      const res = await fetch('/api/arca/invoices/emit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(request),
      });

      const result: EmitArcaInvoiceResponse = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Error al emitir comprobante');
      }

      // Refresh the invoices list after emission
      await fetchArcaInvoices();

      return result;
    } catch (err: any) {
      console.error('Error emitting ARCA invoice:', err);
      setError('Error al emitir comprobante ARCA');
      return {
        success: false,
        arcaInvoiceId: '',
        error: err.message || 'Error desconocido',
      };
    }
  }, [session?.access_token, fetchArcaInvoices]);

  const retryInvoice = useCallback(async (arcaInvoiceId: string): Promise<EmitArcaInvoiceResponse> => {
    if (!session?.access_token) {
      return { success: false, arcaInvoiceId: '', error: 'No autenticado' };
    }
    try {
      const res = await fetch('/api/arca/invoices/emit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ arcaInvoiceId, retry: true }),
      });

      const result: EmitArcaInvoiceResponse = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Error al reintentar comprobante');
      }

      // Refresh the invoices list after retry
      await fetchArcaInvoices();

      return result;
    } catch (err: any) {
      console.error('Error retrying ARCA invoice:', err);
      setError('Error al reintentar comprobante ARCA');
      return {
        success: false,
        arcaInvoiceId,
        error: err.message || 'Error desconocido',
      };
    }
  }, [session?.access_token, fetchArcaInvoices]);

  // ===== CERTIFICATE UPLOAD =====
  const uploadCertificate = useCallback(async (
    cuitId: string,
    certFile: File,
    keyFile: File
  ): Promise<boolean> => {
    try {
      const certContent = await certFile.text();
      const keyContent = await keyFile.text();

      if (!certContent || !keyContent) {
        throw new Error('No se pudo leer el contenido de los archivos');
      }

      const accessToken = await getAccessTokenFresh();
      if (!accessToken) {
        throw new Error('No hay sesión activa. Recargá la página.');
      }

      const response = await fetch('/api/arca/config/upload-cert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          cuitId,
          certContent,
          keyContent,
        }),
      });

      const text = await response.text();
      let result: any;
      try {
        result = JSON.parse(text);
      } catch {
        console.error('upload-cert response not JSON:', text.substring(0, 200));
        throw new Error('Error del servidor al subir certificado. Revisá la consola (F12).');
      }

      if (!response.ok) {
        throw new Error(result.error || 'Error al subir certificado');
      }

      await fetchCuits();
      return true;
    } catch (err: any) {
      console.error('Error uploading certificate:', err);
      throw err;
    }
  }, [fetchCuits]);

  // Load initial data
  useEffect(() => {
    if (organization?.id) {
      fetchCuits();
      fetchPuntosVenta();
      fetchArcaInvoices();
    }
  }, [organization?.id, fetchCuits, fetchPuntosVenta, fetchArcaInvoices]);

  const loading = loadingCuits || loadingPuntosVenta || loadingArcaInvoices;

  const value: ArcaContextType = {
    cuits,
    loadingCuits,
    fetchCuits,
    addCuit,
    updateCuit,
    deleteCuit,
    puntosVenta,
    loadingPuntosVenta,
    fetchPuntosVenta,
    addPuntoVenta,
    deletePuntoVenta,
    setDefaultPuntoVenta,
    arcaInvoices,
    loadingArcaInvoices,
    fetchArcaInvoices,
    emitInvoice,
    retryInvoice,
    uploadCertificate,
    loading,
    error,
  };

  return <ArcaContext.Provider value={value}>{children}</ArcaContext.Provider>;
}

export function useArca() {
  const context = useContext(ArcaContext);
  if (context === undefined) {
    throw new Error('useArca must be used within an ArcaProvider');
  }
  return context;
}
