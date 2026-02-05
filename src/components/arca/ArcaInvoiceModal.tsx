import { useState, useMemo, useCallback } from 'react';
import { Loader2, Send, X, AlertCircle, CheckCircle } from 'lucide-react';
import { useArca } from '../../context/ArcaContext';
import { CuitSelector } from './CuitSelector';
import { ComprobanteTypeSelect } from './ComprobanteTypeSelect';
import type { Invoice, Client } from '../../types/finance';
import type {
  ComprobanteType,
  IVACondition,
  EmitArcaInvoiceRequest,
  ArcaItemInput,
} from '../../types/arca';
import { formatCuit, COMPROBANTE_CONFIG } from '../../types/arca';

interface ArcaInvoiceModalProps {
  invoice: Invoice;
  client: Client;
  onClose: () => void;
  onSuccess: (cae: string, numero: number) => void;
}

export function ArcaInvoiceModal({ invoice, client, onClose, onSuccess }: ArcaInvoiceModalProps) {
  const { cuits, puntosVenta, emitInvoice } = useArca();

  const [selectedCuitId, setSelectedCuitId] = useState('');
  const [selectedPuntoVentaId, setSelectedPuntoVentaId] = useState('');
  const [selectedTipoComprobante, setSelectedTipoComprobante] = useState<ComprobanteType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ cae: string; numero: number } | null>(null);

  // Filter CUITs: only active with certificate
  const eligibleCuits = useMemo(
    () => cuits.filter(c => c.isActive && c.hasCertificate),
    [cuits]
  );

  // Selected CUIT config
  const selectedCuit = useMemo(
    () => cuits.find(c => c.id === selectedCuitId) ?? null,
    [cuits, selectedCuitId]
  );

  // Puntos de venta filtered by selected CUIT
  const filteredPuntosVenta = useMemo(
    () => puntosVenta.filter(pv => pv.organizationCuitId === selectedCuitId && pv.isActive),
    [puntosVenta, selectedCuitId]
  );

  // Determine allowed comprobante types based on IVA conditions
  const allowedComprobanteTypes = useMemo((): ComprobanteType[] => {
    if (!selectedCuit) return [];

    const clientCondicion: IVACondition | undefined =
      (client as any).condicionIva as IVACondition | undefined;

    if (selectedCuit.ivaCondition === 'monotributista') {
      // Monotributista can only emit C types
      return [11, 12, 13];
    }

    if (
      selectedCuit.ivaCondition === 'responsable_inscripto' &&
      clientCondicion === 'responsable_inscripto'
    ) {
      // RI to RI: A types
      return [1, 2, 3];
    }

    // Default: B types
    return [6, 7, 8];
  }, [selectedCuit, client]);

  // Reset dependent selections when CUIT changes
  const handleCuitChange = useCallback((id: string) => {
    setSelectedCuitId(id);
    setSelectedPuntoVentaId('');
    setSelectedTipoComprobante(null);
    setError(null);
  }, []);

  const handlePuntoVentaChange = useCallback((id: string) => {
    setSelectedPuntoVentaId(id);
    setError(null);
  }, []);

  const handleTipoComprobanteChange = useCallback((tipo: ComprobanteType) => {
    setSelectedTipoComprobante(tipo);
    setError(null);
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);

  const canSubmit =
    selectedCuitId &&
    selectedPuntoVentaId &&
    selectedTipoComprobante !== null &&
    !loading;

  const handleSubmit = async () => {
    if (!canSubmit || selectedTipoComprobante === null) return;

    setLoading(true);
    setError(null);

    try {
      const items: ArcaItemInput[] = invoice.items.map(item => ({
        invoiceItemId: item.id,
        descripcion: item.description,
        cantidad: item.quantity,
        precioUnitario: item.unitPrice,
        ivaAlicuotaId: 5, // Default 21% IVA
      }));

      const request: EmitArcaInvoiceRequest = {
        invoiceId: invoice.id,
        organizationCuitId: selectedCuitId,
        puntoVentaId: selectedPuntoVentaId,
        tipoComprobante: selectedTipoComprobante,
        items,
      };

      const result = await emitInvoice(request);

      if (result.success && result.cae && result.numeroComprobante) {
        setSuccessData({ cae: result.cae, numero: result.numeroComprobante });
      } else {
        setError(result.error || 'Error desconocido al emitir el comprobante');
      }
    } catch (err: any) {
      setError(err.message || 'Error al emitir el comprobante');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    if (successData) {
      onSuccess(successData.cae, successData.numero);
    }
  };

  // Success state
  if (successData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/50"
          onClick={handleSuccessClose}
          aria-hidden="true"
        />
        <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl animate-scale-in p-6">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Comprobante Emitido
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              El comprobante fue autorizado exitosamente por ARCA.
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">CAE</p>
              <p className="text-2xl font-mono font-bold text-gray-900 dark:text-white">
                {successData.cae}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Comprobante N.{'\u00B0'} {successData.numero}
              </p>
            </div>
            <button onClick={handleSuccessClose} className="btn-primary w-full">
              Aceptar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-xl animate-scale-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Emitir Factura Electr{'\u00F3'}nica
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {/* Step 1: CUIT Emisor */}
          <div>
            <label className="label">1. CUIT Emisor</label>
            <CuitSelector
              value={selectedCuitId}
              onChange={handleCuitChange}
              cuits={eligibleCuits}
              className="w-full"
            />
            {eligibleCuits.length === 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                No hay CUITs activos con certificado configurado.
              </p>
            )}
          </div>

          {/* Step 2: Punto de Venta */}
          <div>
            <label className="label">2. Punto de Venta</label>
            <select
              value={selectedPuntoVentaId}
              onChange={(e) => handlePuntoVentaChange(e.target.value)}
              className="input w-full"
              disabled={!selectedCuitId}
            >
              <option value="">Seleccionar punto de venta...</option>
              {filteredPuntosVenta.map(pv => (
                <option key={pv.id} value={pv.id}>
                  {String(pv.numero).padStart(5, '0')}
                  {pv.description ? ` - ${pv.description}` : ''}
                  {pv.isDefault ? ' (predeterminado)' : ''}
                </option>
              ))}
            </select>
            {selectedCuitId && filteredPuntosVenta.length === 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                No hay puntos de venta activos para este CUIT.
              </p>
            )}
          </div>

          {/* Step 3: Tipo de Comprobante */}
          <div>
            <label className="label">3. Tipo de Comprobante</label>
            <ComprobanteTypeSelect
              value={selectedTipoComprobante}
              onChange={handleTipoComprobanteChange}
              allowedTypes={allowedComprobanteTypes}
            />
            {selectedCuit && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {selectedCuit.ivaCondition === 'monotributista'
                  ? 'Monotributista: solo comprobantes tipo C'
                  : allowedComprobanteTypes.some(t => COMPROBANTE_CONFIG[t].letra === 'A')
                    ? 'Responsable Inscripto a Responsable Inscripto: comprobantes tipo A'
                    : 'Comprobantes tipo B'}
              </p>
            )}
          </div>

          {/* Summary */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              Resumen
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Cliente</span>
                <p className="font-medium text-gray-900 dark:text-white">{client.name}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">CUIT Cliente</span>
                <p className="font-medium text-gray-900 dark:text-white font-mono">
                  {client.cuit ? formatCuit(client.cuit) : 'Sin CUIT'}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500 dark:text-gray-400">Total</span>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(invoice.total)}
                </p>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="btn-primary"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Emitiendo...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Emitir a ARCA
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
