// ARCA - Agencia de Recaudación y Control Aduanero (Facturación Electrónica Argentina)

// ---------------------------------------------------------------------------
// IVA Condition (Condición frente al IVA)
// ---------------------------------------------------------------------------

export type IVACondition =
  | 'responsable_inscripto'
  | 'monotributista'
  | 'exento'
  | 'consumidor_final'
  | 'no_responsable';

export const IVA_CONDITION_CONFIG: Record<
  IVACondition,
  { id: IVACondition; label: string; code: number }
> = {
  responsable_inscripto: {
    id: 'responsable_inscripto',
    label: 'IVA Responsable Inscripto',
    code: 1,
  },
  monotributista: {
    id: 'monotributista',
    label: 'Responsable Monotributo',
    code: 6,
  },
  exento: {
    id: 'exento',
    label: 'IVA Sujeto Exento',
    code: 4,
  },
  consumidor_final: {
    id: 'consumidor_final',
    label: 'Consumidor Final',
    code: 5,
  },
  no_responsable: {
    id: 'no_responsable',
    label: 'IVA No Responsable',
    code: 99,
  },
};

// ---------------------------------------------------------------------------
// Tipo de Documento del Receptor
// ---------------------------------------------------------------------------

export type DocumentoTipo = 80 | 86 | 96 | 99;

export const DOCUMENTO_TIPO_CONFIG: Record<
  DocumentoTipo,
  { id: DocumentoTipo; label: string; code: number }
> = {
  80: { id: 80, label: 'CUIT', code: 80 },
  86: { id: 86, label: 'CUIL', code: 86 },
  96: { id: 96, label: 'DNI', code: 96 },
  99: { id: 99, label: 'Sin Identificar', code: 99 },
};

// ---------------------------------------------------------------------------
// Tipo de Comprobante
// ---------------------------------------------------------------------------

export type ComprobanteType = 1 | 2 | 3 | 6 | 7 | 8 | 11 | 12 | 13;

export const COMPROBANTE_CONFIG: Record<
  ComprobanteType,
  { id: ComprobanteType; label: string; letra: string; isCredit: boolean; isDebit: boolean }
> = {
  1:  { id: 1,  label: 'Factura A',         letra: 'A', isCredit: false, isDebit: false },
  2:  { id: 2,  label: 'Nota de Débito A',  letra: 'A', isCredit: false, isDebit: true },
  3:  { id: 3,  label: 'Nota de Crédito A', letra: 'A', isCredit: true,  isDebit: false },
  6:  { id: 6,  label: 'Factura B',         letra: 'B', isCredit: false, isDebit: false },
  7:  { id: 7,  label: 'Nota de Débito B',  letra: 'B', isCredit: false, isDebit: true },
  8:  { id: 8,  label: 'Nota de Crédito B', letra: 'B', isCredit: true,  isDebit: false },
  11: { id: 11, label: 'Factura C',         letra: 'C', isCredit: false, isDebit: false },
  12: { id: 12, label: 'Nota de Débito C',  letra: 'C', isCredit: false, isDebit: true },
  13: { id: 13, label: 'Nota de Crédito C', letra: 'C', isCredit: true,  isDebit: false },
};

// ---------------------------------------------------------------------------
// Alícuotas de IVA
// ---------------------------------------------------------------------------

export type IVAAlicuota = 3 | 4 | 5 | 6 | 8 | 9;

export const IVA_ALICUOTA_CONFIG: Record<
  IVAAlicuota,
  { id: IVAAlicuota; rate: number; label: string }
> = {
  3: { id: 3, rate: 0,    label: '0%' },
  4: { id: 4, rate: 10.5, label: '10,5%' },
  5: { id: 5, rate: 21,   label: '21%' },
  6: { id: 6, rate: 27,   label: '27%' },
  8: { id: 8, rate: 5,    label: '5%' },
  9: { id: 9, rate: 2.5,  label: '2,5%' },
};

// ---------------------------------------------------------------------------
// Estado del Comprobante en ARCA
// ---------------------------------------------------------------------------

export type ArcaInvoiceStatus =
  | 'pending'
  | 'processing'
  | 'authorized'
  | 'rejected'
  | 'error';

export const ARCA_STATUS_CONFIG: Record<
  ArcaInvoiceStatus,
  { label: string; badgeClass: string }
> = {
  pending:    { label: 'Pendiente',   badgeClass: 'badge-gray' },
  processing: { label: 'Procesando',  badgeClass: 'badge-primary' },
  authorized: { label: 'Autorizado',  badgeClass: 'badge-success' },
  rejected:   { label: 'Rechazado',   badgeClass: 'badge-danger' },
  error:      { label: 'Error',       badgeClass: 'badge-warning' },
};

// ---------------------------------------------------------------------------
// Configuración CUIT de la Organización
// ---------------------------------------------------------------------------

export interface OrganizationCuit {
  id: string;
  organizationId: string;
  cuit: string;
  businessName: string;
  fantasyName: string | null;
  ivaCondition: IVACondition;
  grossIncomeNumber: string | null;
  activityStartDate: string | null;
  address: string | null;
  hasCertificate: boolean;
  certificateExpiry: string | null;
  isPrimary: boolean;
  isActive: boolean;
  environment: 'testing' | 'production';
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Punto de Venta
// ---------------------------------------------------------------------------

export interface PuntoDeVenta {
  id: string;
  organizationCuitId: string;
  numero: number;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Comprobante ARCA (cabecera)
// ---------------------------------------------------------------------------

export interface ArcaInvoice {
  id: string;
  invoiceId: string;
  organizationCuitId: string;
  puntoVentaId: string;
  tipoComprobante: ComprobanteType;
  tipoComprobanteName: string;
  receptorCuit: string;
  receptorTipoDoc: DocumentoTipo;
  receptorCondicionIva: IVACondition;
  numeroComprobante: number | null;
  cae: string | null;
  caeVencimiento: string | null;
  status: ArcaInvoiceStatus;
  errorCode: string | null;
  errorMessage: string | null;
  observations: string | null;
  retryCount: number;
  lastAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Relaciones opcionales (joins)
  puntoVenta?: PuntoDeVenta;
  cuitConfig?: OrganizationCuit;
}

// ---------------------------------------------------------------------------
// Ítem del Comprobante ARCA
// ---------------------------------------------------------------------------

export interface ArcaInvoiceItem {
  id: string;
  arcaInvoiceId: string;
  invoiceItemId: string;
  codigo: string | null;
  descripcion: string;
  cantidad: number;
  unidadMedida: number;
  precioUnitario: number;
  ivaAlicuotaId: IVAAlicuota;
  ivaBaseImponible: number;
  ivaImporte: number;
  subtotal: number;
}

// ---------------------------------------------------------------------------
// Request / Response para emisión de comprobantes
// ---------------------------------------------------------------------------

export interface ArcaItemInput {
  invoiceItemId?: string;
  codigo?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  ivaAlicuotaId: IVAAlicuota;
}

export interface EmitArcaInvoiceRequest {
  invoiceId: string;
  organizationCuitId: string;
  puntoVentaId: string;
  tipoComprobante: ComprobanteType;
  items: ArcaItemInput[];
}

export interface EmitArcaInvoiceResponse {
  success: boolean;
  arcaInvoiceId: string;
  cae?: string;
  caeVencimiento?: string;
  numeroComprobante?: number;
  error?: string;
  observations?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Formatea un CUIT/CUIL con guiones.
 * Entrada: "20345678901" -> Salida: "20-34567890-1"
 */
export function formatCuit(cuit: string): string {
  const clean = cuit.replace(/\D/g, '');
  if (clean.length !== 11) return cuit;
  return `${clean.slice(0, 2)}-${clean.slice(2, 10)}-${clean.slice(10)}`;
}
