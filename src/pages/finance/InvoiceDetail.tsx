import { useNavigate, useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import {
  ArrowLeft,
  Edit2,
  Printer,
  CheckCircle,
  Calendar,
  FileText,
  Building2,
  Mail,
  Phone,
  X,
  Shield,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useArca } from '../../context/ArcaContext';
import { ArcaInvoiceModal } from '../../components/arca/ArcaInvoiceModal';
import { CaeDisplay } from '../../components/arca/CaeDisplay';
import { ArcaStatusBadge } from '../../components/arca/ArcaStatusBadge';
import type { InvoiceStatus } from '../../types/finance';
import type { ArcaInvoiceStatus } from '../../types/arca';
import { todayLocalISO, parseLocalDate } from '../../utils/helpers';

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; class: string }> = {
  draft: { label: 'Borrador', class: 'badge-gray' },
  issued: { label: 'Emitida', class: 'badge-primary' },
  paid: { label: 'Pagada', class: 'badge-success' },
  overdue: { label: 'Vencida', class: 'badge-warning' },
  cancelled: { label: 'Cancelada', class: 'badge-danger' },
};

export function InvoiceDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { invoices, clients, markInvoiceAsPaid, updateInvoice } = useFinance();
  const { arcaInvoices, cuits, puntosVenta } = useArca();
  const [payModal, setPayModal] = useState(false);
  const [paidDate, setPaidDate] = useState(todayLocalISO());
  const [arcaModal, setArcaModal] = useState(false);

  const invoice = invoices.find(i => i.id === id);
  const client = invoice ? clients.find(c => c.id === invoice.clientId) : null;
  const arcaInvoice = invoice ? arcaInvoices.find(ai => ai.invoiceId === invoice.id) : null;
  const arcaCuit = arcaInvoice ? cuits.find(c => c.id === arcaInvoice.organizationCuitId) : null;
  const arcaPv = arcaInvoice ? puntosVenta.find(pv => pv.id === arcaInvoice.puntoVentaId) : null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return parseLocalDate(date).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleMarkAsPaid = async () => {
    if (invoice) {
      await markInvoiceAsPaid(invoice.id, paidDate);
      setPayModal(false);
    }
  };

  const handleCancel = async () => {
    if (invoice && window.confirm('¿Estás seguro de que deseas cancelar esta factura?')) {
      await updateInvoice(invoice.id, { status: 'cancelled' });
    }
  };

  const handleIssue = async () => {
    if (invoice) {
      await updateInvoice(invoice.id, { status: 'issued' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Factura no encontrada</p>
        <button
          onClick={() => navigate('/finance/invoices')}
          className="btn-primary mt-4"
        >
          Volver a facturas
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/finance/invoices')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {invoice.invoiceNumber}
            </h1>
            <span className={`badge ${STATUS_CONFIG[invoice.status].class}`}>
              {STATUS_CONFIG[invoice.status].label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {invoice.status === 'draft' && (
            <>
              <button onClick={handleIssue} className="btn-primary">
                Emitir factura
              </button>
              <Link
                to={`/finance/invoices/${id}/edit`}
                className="btn-secondary"
              >
                <Edit2 className="w-5 h-5" />
                Editar
              </Link>
            </>
          )}
          {(invoice.status === 'issued' || invoice.status === 'overdue') && (
            <>
              <button
                onClick={() => {
                  setPayModal(true);
                  setPaidDate(todayLocalISO());
                }}
                className="btn-primary"
              >
                <CheckCircle className="w-5 h-5" />
                Marcar como pagada
              </button>
              <button onClick={handleCancel} className="btn-secondary text-danger-600">
                <X className="w-5 h-5" />
                Cancelar
              </button>
            </>
          )}
          {/* ARCA emission button - show for issued/paid invoices without CAE */}
          {(invoice.status === 'issued' || invoice.status === 'paid') && !invoice.cae && client && (
            <button
              onClick={() => setArcaModal(true)}
              className="btn-secondary"
            >
              <Shield className="w-5 h-5" />
              Emitir a ARCA
            </button>
          )}
          <button onClick={handlePrint} className="btn-secondary">
            <Printer className="w-5 h-5" />
            Imprimir
          </button>
        </div>
      </div>

      {/* ARCA Status */}
      {invoice.arcaStatus && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Estado ARCA:</span>
          <ArcaStatusBadge status={invoice.arcaStatus as ArcaInvoiceStatus} />
        </div>
      )}

      {/* Invoice Content */}
      <div className="card p-8 print:shadow-none print:p-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 pb-8 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              FACTURA
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {invoice.invoiceNumber}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">Fecha de emisión</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {formatDate(invoice.issueDate)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Fecha de vencimiento</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {formatDate(invoice.dueDate)}
            </p>
            {invoice.paidDate && (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Fecha de pago</p>
                <p className="font-medium text-success-600">
                  {formatDate(invoice.paidDate)}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Client Info */}
        {client && (
          <div className="mb-8">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Facturar a:</p>
            <div className="p-4 bg-gray-50 dark:bg-[#3d3839] rounded-lg">
              <p className="font-semibold text-gray-900 dark:text-white text-lg">
                <button onClick={() => navigate(`/projects/clients/${client.id}`)} className="hover:text-primary-600 transition-colors">
                  {client.name}
                </button>
              </p>
              {client.company && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mt-1">
                  <Building2 className="w-4 h-4" />
                  {client.company}
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mt-1">
                  <Mail className="w-4 h-4" />
                  {client.email}
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mt-1">
                  <Phone className="w-4 h-4" />
                  {client.phone}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Descripción
                </th>
                <th className="text-right py-3 text-sm font-medium text-gray-500 dark:text-gray-400 w-24">
                  Cantidad
                </th>
                <th className="text-right py-3 text-sm font-medium text-gray-500 dark:text-gray-400 w-32">
                  Precio unit.
                </th>
                <th className="text-right py-3 text-sm font-medium text-gray-500 dark:text-gray-400 w-32">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {invoice.items.map(item => (
                <tr key={item.id}>
                  <td className="py-4 text-gray-900 dark:text-white">
                    {item.description}
                  </td>
                  <td className="py-4 text-right text-gray-600 dark:text-gray-400">
                    {item.quantity}
                  </td>
                  <td className="py-4 text-right text-gray-600 dark:text-gray-400">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="py-4 text-right font-medium text-gray-900 dark:text-white">
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Subtotal</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.tax > 0 && (
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Impuestos</span>
                <span>{formatCurrency(invoice.tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-2">
              <span>Total</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Notas:</p>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {invoice.notes}
            </p>
          </div>
        )}
      </div>

      {/* CAE Display */}
      {invoice.cae && arcaInvoice && arcaCuit && arcaPv && (
        <CaeDisplay
          cae={invoice.cae}
          caeVencimiento={invoice.caeVencimiento || ''}
          cuit={arcaCuit.cuit}
          puntoVenta={arcaPv.numero}
          tipoComprobante={arcaInvoice.tipoComprobante}
          numeroComprobante={arcaInvoice.numeroComprobante || 0}
          total={invoice.total}
          fecha={invoice.issueDate}
        />
      )}

      {/* ARCA Invoice Modal */}
      {arcaModal && client && (
        <ArcaInvoiceModal
          invoice={invoice}
          client={client}
          onClose={() => setArcaModal(false)}
          onSuccess={() => {
            setArcaModal(false);
            // Refresh will happen via context
          }}
        />
      )}

      {/* Pay Modal */}
      {payModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:hidden">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Marcar como pagada
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Registrar el pago de {formatCurrency(invoice.total)}
            </p>
            <div className="mb-4">
              <label className="label">Fecha de pago</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setPayModal(false)} className="btn-secondary">
                Cancelar
              </button>
              <button onClick={handleMarkAsPaid} className="btn-primary">
                <CheckCircle className="w-5 h-5" />
                Confirmar pago
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
