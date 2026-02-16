import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Eye,
  TrendingUp,
  Trash2,
  Users,
  Filter,
  Loader2,
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import {
  LEAD_STATUS_CONFIG,
  LEAD_SOURCE_LABELS,
  type LeadStatus,
  type LeadSource,
} from '../../types/crm';

interface Filters {
  search: string;
  status: LeadStatus | 'all';
  source: LeadSource | 'all';
}

export function LeadsList() {
  const navigate = useNavigate();
  const { leads, loading, deleteLead, convertLeadToDeal } = useCRM();

  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'all',
    source: 'all',
  });

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Status filter
      if (filters.status !== 'all' && lead.status !== filters.status) return false;

      // Source filter
      if (filters.source !== 'all' && lead.source !== filters.source) return false;

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchName = lead.contactName.toLowerCase().includes(searchLower);
        const matchCompany = lead.company?.toLowerCase().includes(searchLower);
        const matchEmail = lead.email?.toLowerCase().includes(searchLower);
        if (!matchName && !matchCompany && !matchEmail) return false;
      }

      return true;
    });
  }, [leads, filters]);

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('¿Estas seguro de eliminar este lead?')) {
      await deleteLead(id);
    }
  };

  const handleConvert = async (e: React.MouseEvent, leadId: string) => {
    e.stopPropagation();
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    if (confirm(`¿Convertir "${lead.contactName}" a Deal?`)) {
      const deal = await convertLeadToDeal(leadId, {
        name: `Oportunidad - ${lead.company || lead.contactName}`,
        description: lead.needs,
        amount: 0,
      });
      if (deal) {
        navigate(`/crm/deals/${deal.id}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Leads
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {leads.length} leads registrados
          </p>
        </div>
        <Link to="/crm/leads/new" className="btn-primary">
          <Plus className="w-5 h-5" />
          Nuevo Lead
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Buscar por nombre, empresa, email..."
              className="input pl-10 w-full"
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as Filters['status'] }))}
            className="select"
          >
            <option value="all">Todos los estados</option>
            {(Object.keys(LEAD_STATUS_CONFIG) as LeadStatus[]).map((status) => (
              <option key={status} value={status}>
                {LEAD_STATUS_CONFIG[status].label}
              </option>
            ))}
          </select>

          <select
            value={filters.source}
            onChange={(e) => setFilters((prev) => ({ ...prev, source: e.target.value as Filters['source'] }))}
            className="select"
          >
            <option value="all">Todos los origenes</option>
            {(Object.keys(LEAD_SOURCE_LABELS) as LeadSource[]).map((source) => (
              <option key={source} value={source}>
                {LEAD_SOURCE_LABELS[source]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {filteredLeads.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {filters.search || filters.status !== 'all' || filters.source !== 'all'
              ? 'No se encontraron leads'
              : 'No hay leads'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {filters.search || filters.status !== 'all' || filters.source !== 'all'
              ? 'Intenta con otros filtros de busqueda'
              : 'Comienza creando tu primer lead'}
          </p>
          {!filters.search && filters.status === 'all' && filters.source === 'all' && (
            <Link to="/crm/leads/new" className="btn-primary inline-flex">
              <Plus className="w-5 h-5" />
              Nuevo Lead
            </Link>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Telefono
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Origen
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredLeads.map((lead) => {
                  const statusConfig = LEAD_STATUS_CONFIG[lead.status] || { label: lead.status, color: 'gray', bgClass: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => navigate(`/crm/leads/${lead.id}`)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                              {lead.contactName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white block">
                              {lead.contactName}
                            </span>
                            {lead.company && (
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {lead.company}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {lead.email || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {lead.phone || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {LEAD_SOURCE_LABELS[lead.source]}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${statusConfig.bgClass}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(lead.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/crm/leads/${lead.id}`);
                            }}
                            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                            title="Ver"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {!lead.convertedToDealId && (
                            <button
                              onClick={(e) => handleConvert(e, lead.id)}
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                              title="Convertir a Deal"
                            >
                              <TrendingUp className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDelete(e, lead.id)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
