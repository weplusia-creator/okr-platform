import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Users,
  Building2,
  Mail,
  Phone,
  Edit2,
  Trash2,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useProjects } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import type { Client } from '../../types/finance';

import { toast } from '../../components/ui/toast';
function getFaviconUrl(website: string | null): string | null {
  if (!website) return null;
  try {
    const domain = new URL(website).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return null;
  }
}

export function Clients() {
  const navigate = useNavigate();
  const { clients, loadingClients, deleteClient, getClientInvoices } = useFinance();
  const { projects, fetchAllPayments } = useProjects();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [deleteModal, setDeleteModal] = useState<Client | null>(null);
  const [allPayments, setAllPayments] = useState<any[]>([]);

  useEffect(() => {
    fetchAllPayments().then(setAllPayments);
  }, [fetchAllPayments]);

  const filteredClients = clients.filter(client => {
    const searchLower = search.toLowerCase();
    return (
      client.name.toLowerCase().includes(searchLower) ||
      client.company?.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower)
    );
  });

  const getClientBalance = (clientId: string) => {
    // Facturas
    const invoices = getClientInvoices(clientId);
    const invoicePending = invoices
      .filter(i => i.status === 'issued' || i.status === 'overdue')
      .reduce((sum, i) => sum + i.total, 0);
    const invoiceTotal = invoices.reduce((sum, i) => sum + i.total, 0);

    // Cuotas de proyectos del cliente
    const clientProjectIds = projects.filter(p => p.clientId === clientId).map(p => p.id);
    const clientPayments = allPayments.filter(p => clientProjectIds.includes(p.projectId));
    const paymentsPaid = clientPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
    const paymentsPending = clientPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);

    const totalProject = clientPayments.reduce((sum, p) => sum + p.amount, 0);
    const total = invoiceTotal + totalProject;
    const pending = invoicePending + paymentsPending;
    const paid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0) + paymentsPaid;

    return { pending, paid, total, count: invoices.length + clientPayments.length };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleDelete = async () => {
    if (deleteModal) {
      try {
        await deleteClient(deleteModal.id);
        setDeleteModal(null);
      } catch (err: any) {
        toast.error('No se pudo eliminar el cliente: ' + (err?.message || 'Error desconocido'));
      }
    }
  };

  if (loadingClients) {
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
            Clientes
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {clients.length} clientes registrados
          </p>
        </div>
        <Link to="/projects/clients/new" className="btn-primary">
          <Plus className="w-5 h-5" />
          Nuevo cliente
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, empresa o email..."
          className="input pl-10 w-full md:w-96"
        />
      </div>

      {/* Clients List */}
      {filteredClients.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {search ? 'No se encontraron clientes' : 'No hay clientes'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {search
              ? 'Intenta con otros términos de búsqueda'
              : 'Comienza agregando tu primer cliente'}
          </p>
          {!search && (
            <Link to="/projects/clients/new" className="btn-primary inline-flex">
              <Plus className="w-5 h-5" />
              Agregar cliente
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredClients.map(client => {
            const balance = getClientBalance(client.id);
            return (
              <div
                key={client.id}
                className="card p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => navigate(`/projects/clients/${client.id}`)}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {getFaviconUrl(client.website) ? (
                        <img
                          src={getFaviconUrl(client.website)!}
                          alt=""
                          className="w-10 h-10 rounded-full object-contain bg-white border border-gray-200 dark:border-gray-700 p-1"
                          onError={(e) => {
                            const el = e.target as HTMLImageElement;
                            el.style.display = 'none';
                            el.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center ${getFaviconUrl(client.website) ? 'hidden' : ''}`}>
                        <span className="text-primary-600 font-semibold">
                          {client.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {client.name}
                        </h3>
                        {client.company && (
                          <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                            <Users className="w-3 h-3" />
                            Responsable: {client.company}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                      {client.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {client.email}
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {client.phone}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {balance.count} facturas
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="mb-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Monto total</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(balance.total)}
                      </p>
                      {balance.pending > 0 && (
                        <p className="text-xs text-warning-600">
                          Pendiente: {formatCurrency(balance.pending)}
                        </p>
                      )}
                      {balance.paid > 0 && (
                        <p className="text-xs text-success-600">
                          Cobrado: {formatCurrency(balance.paid)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/projects/clients/${client.id}/edit`)}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => setDeleteModal(client)}
                          className="p-2 text-gray-400 hover:text-danger-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/projects/clients/${client.id}`)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        title="Ver detalles"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Eliminar cliente
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              ¿Estás seguro de que deseas eliminar a <strong>{deleteModal.name}</strong>?
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="btn-danger"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
