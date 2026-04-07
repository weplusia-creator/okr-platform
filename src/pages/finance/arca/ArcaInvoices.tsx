import { useState, useMemo, useEffect } from 'react';
import { FileText, RefreshCw, CheckCircle, Loader2, Search, Filter } from 'lucide-react';
import { useArca } from '../../../context/ArcaContext';
import { ArcaStatusBadge } from '../../../components/arca/ArcaStatusBadge';
import type { ArcaInvoiceStatus, ArcaInvoice } from '../../../types/arca';
import { COMPROBANTE_CONFIG, formatCuit } from '../../../types/arca';
import { ArcaTabs } from '../../../components/arca/ArcaTabs';
import { parseLocalDate } from '../../../utils/helpers';

const STATUS_FILTER_OPTIONS: { value: ArcaInvoiceStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'authorized', label: 'Autorizado' },
  { value: 'rejected', label: 'Rechazado' },
  { value: 'error', label: 'Error' },
];

function formatComprobanteNumero(puntoVenta: number | null, numero: number | null): string {
  if (puntoVenta == null || numero == null) return '-';
  const pv = String(puntoVenta).padStart(5, '0');
  const num = String(numero).padStart(8, '0');
  return `${pv}-${num}`;
}

export function ArcaInvoices() {
  const {
    arcaInvoices,
    puntosVenta,
    loadingArcaInvoices,
    fetchArcaInvoices,
    retryInvoice,
  } = useArca();

  const [statusFilter, setStatusFilter] = useState<ArcaInvoiceStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    fetchArcaInvoices();
  }, [fetchArcaInvoices]);

  // Resolve punto de venta numero for an invoice
  const getPuntoVentaNumero = (invoice: ArcaInvoice): number | null => {
    const pv = puntosVenta.find(p => p.id === invoice.puntoVentaId);
    return pv?.numero ?? null;
  };

  const filteredInvoices = useMemo(() => {
    return arcaInvoices.filter(inv => {
      // Status filter
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const pvNumero = getPuntoVentaNumero(inv);
        const fullNumber = formatComprobanteNumero(pvNumero, inv.numeroComprobante);
        const tipoLabel = COMPROBANTE_CONFIG[inv.tipoComprobante]?.label ?? '';

        return (
          fullNumber.includes(searchLower) ||
          (inv.cae && inv.cae.includes(searchLower)) ||
          tipoLabel.toLowerCase().includes(searchLower) ||
          inv.receptorCuit.includes(searchLower)
        );
      }
      return true;
    });
  }, [arcaInvoices, statusFilter, search, puntosVenta]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);

  const formatDate = (date: string) =>
    parseLocalDate(date).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const getLetraBadgeClass = (letra: string): string => {
    switch (letra) {
      case 'A':
        return 'badge-primary';
      case 'B':
        return 'badge-success';
      case 'C':
        return 'badge-warning';
      default:
        return 'badge-gray';
    }
  };

  const handleRetry = async (arcaInvoiceId: string) => {
    setRetrying(arcaInvoiceId);
    try {
      await retryInvoice(arcaInvoiceId);
    } finally {
      setRetrying(null);
    }
  };

  if (loadingArcaInvoices) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ArcaTabs />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Facturas Electr{'\u00F3'}nicas
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {arcaInvoices.length} comprobantes emitidos a ARCA
          </p>
        </div>
        <button
          onClick={() => fetchArcaInvoices()}
          className="btn-secondary"
          title="Actualizar lista"
        >
          <RefreshCw className="w-5 h-5" />
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por n{'\u00FA'}mero, CAE o CUIT..."
            className="input pl-10 w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ArcaInvoiceStatus | 'all')}
            className="input"
          >
            {STATUS_FILTER_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      {filteredInvoices.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {search || statusFilter !== 'all'
              ? 'No se encontraron comprobantes'
              : 'No hay comprobantes electr\u00F3nicos'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {search || statusFilter !== 'all'
              ? 'Intenta con otros filtros de b\u00FAsqueda'
              : 'Los comprobantes emitidos a ARCA aparecer\u00E1n aqu\u00ED'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#3d3839]">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                    N{'\u00FA'}mero
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                    CAE
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                    Vto. CAE
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                    Total
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredInvoices.map(inv => {
                  const config = COMPROBANTE_CONFIG[inv.tipoComprobante];
                  const pvNumero = getPuntoVentaNumero(inv);

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-gray-50 dark:hover:bg-[#3d3839] transition-colors"
                    >
                      {/* Tipo */}
                      <td className="px-4 py-3">
                        <span className={`badge ${getLetraBadgeClass(config?.letra ?? '')}`}>
                          {config?.label ?? `Tipo ${inv.tipoComprobante}`}
                        </span>
                      </td>

                      {/* Numero */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                          {formatComprobanteNumero(pvNumero, inv.numeroComprobante)}
                        </span>
                      </td>

                      {/* CAE */}
                      <td className="px-4 py-3">
                        {inv.cae ? (
                          <span className="font-mono text-sm text-gray-900 dark:text-white">
                            {inv.cae}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>

                      {/* Vto. CAE */}
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {inv.caeVencimiento ? formatDate(inv.caeVencimiento) : '-'}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3">
                        <ArcaStatusBadge status={inv.status} />
                      </td>

                      {/* Total - computed from items not available here, show receptor CUIT instead or leave placeholder */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                          {formatCuit(inv.receptorCuit)}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {(inv.status === 'rejected' || inv.status === 'error') && (
                            <button
                              onClick={() => handleRetry(inv.id)}
                              disabled={retrying === inv.id}
                              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              title="Reintentar emisi\u00F3n"
                            >
                              {retrying === inv.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          {inv.status === 'authorized' && (
                            <span
                              className="p-2 text-green-500"
                              title="Comprobante autorizado"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
