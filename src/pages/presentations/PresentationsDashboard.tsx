import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Presentation,
  MoreVertical,
  Eye,
  Copy,
  Trash2,
  Link2,
  SlidersHorizontal,
} from 'lucide-react';
import { usePresentations } from '../../context/PresentationContext';
import { PRESENTATION_STATUS_CONFIG } from '../../types/presentations';
import type { PresentationStatus } from '../../types/presentations';

export function PresentationsDashboard() {
  const navigate = useNavigate();
  const { presentations, loading, deletePresentation, duplicatePresentation } = usePresentations();
  const [filterStatus, setFilterStatus] = useState<PresentationStatus | 'all'>('all');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const filtered = filterStatus === 'all'
    ? presentations
    : presentations.filter((p) => p.status === filterStatus);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleDuplicate = async (id: string) => {
    setMenuOpen(null);
    await duplicatePresentation(id);
  };

  const handleDelete = async (id: string) => {
    setMenuOpen(null);
    if (!confirm('Eliminar esta presentacion?')) return;
    await deletePresentation(id);
  };

  const handleCopyLink = (token: string) => {
    setMenuOpen(null);
    const url = `${window.location.origin}/pres/${token}`;
    navigator.clipboard.writeText(url);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#3100E2]/10 dark:bg-[#3100E2]/20 flex items-center justify-center">
            <Presentation className="w-5 h-5 text-[#3100E2]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Presentaciones</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{presentations.length} presentaciones</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/presentations/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#D4FC59] text-[#231F1F] rounded-lg font-semibold hover:bg-[#c5ed4a] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva presentacion
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <SlidersHorizontal className="w-4 h-4 text-gray-400" />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="text-sm px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          <option value="all">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="published">Publicada</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Presentation className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">No hay presentaciones</p>
          <button
            onClick={() => navigate('/presentations/new')}
            className="text-[#3100E2] hover:underline font-medium"
          >
            Crear la primera
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Titulo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Autor</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((pres) => {
                const statusCfg = PRESENTATION_STATUS_CONFIG[pres.status];
                return (
                  <tr
                    key={pres.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/presentations/${pres.id}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{pres.title}</p>
                      {pres.subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{pres.subtitle}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {pres.author || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {pres.clientName || pres.clientCompany || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.bgClass}`}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(pres.createdAt)}
                    </td>
                    <td className="px-4 py-3 relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setMenuOpen(menuOpen === pres.id ? null : pres.id)}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                      {menuOpen === pres.id && (
                        <div className="absolute right-4 top-10 z-20 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1">
                          <button
                            onClick={() => { setMenuOpen(null); navigate(`/presentations/${pres.id}`); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <Eye className="w-4 h-4" /> Ver
                          </button>
                          {pres.status === 'published' && (
                            <button
                              onClick={() => handleCopyLink(pres.shareToken)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              <Link2 className="w-4 h-4" /> Copiar link
                            </button>
                          )}
                          <button
                            onClick={() => handleDuplicate(pres.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <Copy className="w-4 h-4" /> Duplicar
                          </button>
                          {pres.status === 'draft' && (
                            <button
                              onClick={() => handleDelete(pres.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="w-4 h-4" /> Eliminar
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
