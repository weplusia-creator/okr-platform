import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  FileText,
  Filter,
  Eye,
  Trash2,
  CheckCircle,
  Calendar,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { ArcaStatusBadge } from '../../components/arca/ArcaStatusBadge';
import { todayLocalISO, parseLocalDate } from '../../utils/helpers';
import type { Invoice, InvoiceStatus } from '../../types/finance';
import type { ArcaInvoiceStatus } from '../../types/arca';

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; class: string }> = {
  draft: { label: 'Borrador', class: 'badge-gray' },
  issued: { label: 'Emitida', class: 'badge-primary' },
  paid: { label: 'Pagada', class: 'badge-success' },
  overdue: { label: 'Vencida', class: 'badge-warning' },
  cancelled: { label: 'Cancelada', class: 'badge-danger' },
};

export function Invoices() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { invoices, clients, loadingInvoices, deleteInvoice, markInvoiceAsPaid } = useFinance();
  const { isAdmin } = useAuth();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>(
    (searchParams.get('status') as InvoiceStatus) || 'all'
  );
  const [deleteModal, setDeleteModal] = useState<Invoice | null>(null);
  const [payModal, setPayModal] = useState<Invoice | null>(null);
  const [paidDate, setPaidDate] = useState(todayLocalISO());

  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      if (statusFilter !== 'all' && invoice.status !== statusFilter) return false;

      if (search) {
        const searchLower = search.toLowerCase();
        const client = clients.find(c => c.id === invoice.clientId);
        return (
          invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
          client?.name.toLowerCase().includes(searchLower) ||
          client?.company?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [invoices, clients, statusFilter, search]);

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
      month: 'short',
      year: 'numeric',
    });
  };

  const handleDelete = async () => {
    if (deleteModal) {
      try {
        await deleteInvoice(deleteModal.id);
        setDeleteModal(null);
      } catch (err: any) {
        alert('No se pudo eliminar la factura: ' + (err?.message || 'Error desconocido'));
      }
    }
  };

  const handleMarkAsPaid = async () => {
    if (payModal) {
      try {
        await markInvoiceAsPaid(payModal.id, paidDate);
        setPayModal(null);
      } catch (err: any) {
        alert('No se pudo marcar como pagada: ' + (err?.message || 'Error desconocido'));
      }
    }
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Cliente desconocido';
  };

  if (loadingInvoices) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Facturas
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {invoices.length} facturas registradas
          </p>
        </div>
        <Link to="/finance/invoices/new" className="btn-primary">
          <Plus className="w-5 h-5" />
          Nueva factura
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por número o cliente..."
            className="input pl-10 w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'all')}
            className="input"
          >
            <option value="all">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="issued">Emitida</option>
            <option value="paid">Pagada</option>
            <option value="overdue">Vencida</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </div>
      </div>

      {/* Invoices List */}
      {filteredInvoices.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {search || statusFilter !== 'all' ? 'No se encontraron facturas' : 'No hay facturas'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {search || statusFilter !== 'all'
              ? 'Intenta con otros filtros'
              : 'Comienza creando tu primera factura'}
          </p>
          {!search && statusFilter === 'all' && (
            <Link to="/finance/invoices/new" className="btn-primary inline-flex">
              <Plus className="w-5 h-5" />
              Crear factura
            </Link>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#3d3839]">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                    Número
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                    Vencimiento
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                    ARCA
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
                {filteredInvoices.map(invoice => (
                  <tr
                    key={invoice.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/finance/invoices/${invoice.id}`}
                        className="font-medium text-primary-600 hover:text-primary-700"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">
                      <button onClick={() => navigate(`/projects/clients/${invoice.clientId}`)} className="hover:text-primary-600 transition-colors">
                        {getClientName(invoice.clientId)}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {formatDate(invoice.issueDate)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {formatDate(invoice.dueDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${STATUS_CONFIG[invoice.status].class}`}>
                        {STATUS_CONFIG[invoice.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {invoice.arcaStatus ? (
                        <ArcaStatusBadge status={invoice.arcaStatus as ArcaInvoiceStatus} />
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(invoice.total)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/finance/invoices/${invoice.id}`)}
                          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-[#252525] rounded-lg transition-colors"
                          title="Ver"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {(invoice.status === 'issued' || invoice.status === 'overdue') && (
                          <button
                            onClick={() => {
                              setPayModal(invoice);
                              setPaidDate(todayLocalISO());
                            }}
                            className="p-2 text-gray-400 hover:text-success-600 hover:bg-gray-100 dark:hover:bg-[#252525] rounded-lg transition-colors"
                            title="Marcar como pagada"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin && invoice.status === 'draft' && (
                          <button
                            onClick={() => setDeleteModal(invoice)}
                            className="p-2 text-gray-400 hover:text-danger-600 hover:bg-gray-100 dark:hover:bg-[#252525] rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Eliminar factura
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              ¿Estás seguro de que deseas eliminar la factura <strong>{deleteModal.invoiceNumber}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteModal(null)} className="btn-secondary">
                Cancelar
              </button>
              <button onClick={handleDelete} className="btn-danger">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {payModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Marcar como pagada
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Registrar el pago de la factura <strong>{payModal.invoiceNumber}</strong> por{' '}
              <strong>{formatCurrency(payModal.total)}</strong>
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
              <button onClick={() => setPayModal(null)} className="btn-secondary">
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
