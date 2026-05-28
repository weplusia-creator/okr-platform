import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  FileText,
  Eye,
  Send,
  CheckCircle2,
  XCircle,
  Search,
  MoreVertical,
  Copy,
  Trash2,
  Edit2,
} from 'lucide-react';
import { useProposals } from '../../context/ProposalContext';
import { parseLocalDate } from '../../utils/helpers';
import { PROPOSAL_STATUS_CONFIG } from '../../types/proposals';
import type { ProposalStatus } from '../../types/proposals';

import { confirmDialog } from '../../components/ui/confirm';
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount);

export function ProposalsDashboard() {
  const navigate = useNavigate();
  const { proposals, loading, deleteProposal, duplicateProposal, getStats } = useProposals();

  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const stats = useMemo(() => getStats(), [proposals, getStats]);

  // Filter proposals
  const filteredProposals = useMemo(() => {
    return proposals.filter((proposal) => {
      // Status filter
      if (statusFilter !== 'all' && proposal.status !== statusFilter) {
        return false;
      }
      // Search filter by client name
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const clientName = proposal.clientName?.toLowerCase() || '';
        const clientCompany = proposal.clientCompany?.toLowerCase() || '';
        if (!clientName.includes(query) && !clientCompany.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [proposals, statusFilter, searchQuery]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  const handleDuplicate = async (id: string) => {
    setOpenMenuId(null);
    const duplicated = await duplicateProposal(id);
    if (duplicated) {
      navigate(`/proposals/${duplicated.id}/edit`);
    }
  };

  const handleDelete = async (id: string) => {
    setOpenMenuId(null);
    if ((await confirmDialog({ message: '¿Estas seguro de eliminar esta propuesta?', danger: true }))) {
      await deleteProposal(id);
    }
  };

  const formatDate = (dateStr: string) => {
    return parseLocalDate(dateStr).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Propuestas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gestiona tus propuestas comerciales
          </p>
        </div>
        <button
          onClick={() => navigate('/proposals/new')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nueva Propuesta
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalProposals}</p>
            </div>
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
              <FileText className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Enviadas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.sentCount}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Send className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Vistas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.viewedCount}</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
              <Eye className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Aceptadas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.acceptedCount}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Valor total</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalValue)}</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
              <FileText className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProposalStatus | 'all')}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="sent">Enviada</option>
          <option value="viewed">Vista</option>
          <option value="accepted">Aceptada</option>
          <option value="rejected">Rechazada</option>
        </select>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
        {filteredProposals.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {proposals.length === 0
                ? 'No hay propuestas creadas'
                : 'No se encontraron propuestas con los filtros aplicados'}
            </p>
            {proposals.length === 0 && (
              <button
                onClick={() => navigate('/proposals/new')}
                className="btn-primary"
              >
                Crear primera propuesta
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Numero</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Titulo</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Cliente</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Monto</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Estado</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Fecha</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProposals.map((proposal) => {
                  const statusConfig = PROPOSAL_STATUS_CONFIG[proposal.status];
                  const isDraft = proposal.status === 'draft';

                  return (
                    <tr
                      key={proposal.id}
                      className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                          {proposal.proposalNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => navigate(`/proposals/${proposal.id}`)}
                          className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-left"
                        >
                          {proposal.title}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-gray-900 dark:text-white">{proposal.clientName}</p>
                        {proposal.clientCompany && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{proposal.clientCompany}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(proposal.totalAmount)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${statusConfig.bgClass}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                        {formatDate(proposal.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/proposals/${proposal.id}`)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            title="Ver"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Actions Menu */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === proposal.id ? null : proposal.id);
                              }}
                              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openMenuId === proposal.id && (
                              <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                                {isDraft && (
                                  <button
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      navigate(`/proposals/${proposal.id}/edit`);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                  >
                                    <Edit2 className="w-4 h-4" /> Editar
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDuplicate(proposal.id)}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                >
                                  <Copy className="w-4 h-4" /> Duplicar
                                </button>
                                {isDraft && (
                                  <button
                                    onClick={() => handleDelete(proposal.id)}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-4 h-4" /> Eliminar
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
