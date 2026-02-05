import { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Loader2,
  FolderKanban,
  ChevronDown,
} from 'lucide-react';
import { useProjects } from '../../context/ProjectContext';
import { useFinance } from '../../context/FinanceContext';
import type { ProjectStatus } from '../../types/projects';
import { PROJECT_STATUS_CONFIG, getProjectDisplayName } from '../../types/projects';

interface Filters {
  status: ProjectStatus | 'all';
  clientId: string | 'all';
  search: string;
}

export function ProjectsList() {
  const navigate = useNavigate();
  const { projects, loading, updateProject } = useProjects();
  const [statusDropdown, setStatusDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStatusDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);
  const { clients } = useFinance();

  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    clientId: 'all',
    search: '',
  });

  const STATUS_SORT_ORDER: Record<string, number> = {
    in_progress: 0,
    approved: 1,
    completed: 2,
    proposal: 3,
    paused: 4,
    cancelled: 5,
  };

  const clientWebsiteMap = useMemo(() => {
    const map: Record<string, string> = {};
    clients.forEach((c) => {
      if (c.website) {
        try {
          const url = c.website.startsWith('http') ? c.website : `https://${c.website}`;
          map[c.id] = new URL(url).hostname;
        } catch {
          // ignore invalid URLs
        }
      }
    });
    return map;
  }, [clients]);

  const filteredProjects = useMemo(() => {
    return projects
      .filter((project) => {
        if (filters.status !== 'all' && project.status !== filters.status) return false;
        if (filters.clientId !== 'all' && project.clientId !== filters.clientId) return false;
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          const matchName = project.name.toLowerCase().includes(searchLower);
          const matchClient = project.clientName?.toLowerCase().includes(searchLower);
          const matchDesc = project.description?.toLowerCase().includes(searchLower);
          if (!matchName && !matchClient && !matchDesc) return false;
        }
        return true;
      })
      .sort((a, b) => (STATUS_SORT_ORDER[a.status] ?? 9) - (STATUS_SORT_ORDER[b.status] ?? 9));
  }, [projects, filters]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount);

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
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
            Proyectos
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {projects.length} proyectos registrados
          </p>
        </div>
        <Link to="/projects/new" className="btn-primary">
          <Plus className="w-5 h-5" />
          Nuevo Proyecto
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
              placeholder="Buscar por nombre, cliente..."
              className="input pl-10 w-full"
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as Filters['status'] }))}
            className="select"
          >
            <option value="all">Todos los estados</option>
            {(Object.keys(PROJECT_STATUS_CONFIG) as ProjectStatus[]).map((status) => (
              <option key={status} value={status}>
                {PROJECT_STATUS_CONFIG[status].label}
              </option>
            ))}
          </select>

          <select
            value={filters.clientId}
            onChange={(e) => setFilters((prev) => ({ ...prev, clientId: e.target.value }))}
            className="select"
          >
            <option value="all">Todos los clientes</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {filteredProjects.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderKanban className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {filters.search || filters.status !== 'all' || filters.clientId !== 'all'
              ? 'No se encontraron proyectos'
              : 'No hay proyectos'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {filters.search || filters.status !== 'all' || filters.clientId !== 'all'
              ? 'Intenta con otros filtros de busqueda'
              : 'Comienza creando tu primer proyecto'}
          </p>
          {!filters.search && filters.status === 'all' && filters.clientId === 'all' && (
            <Link to="/projects/new" className="btn-primary inline-flex">
              <Plus className="w-5 h-5" />
              Nuevo Proyecto
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
                    Cliente
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Servicio
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Responsable
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Fecha fin
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Fee mensual
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredProjects.map((project) => {
                  const statusConfig = PROJECT_STATUS_CONFIG[project.status];

                  return (
                    <tr
                      key={project.id}
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {project.clientId && clientWebsiteMap[project.clientId] ? (
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${clientWebsiteMap[project.clientId]}&sz=64`}
                              alt=""
                              className="flex-shrink-0 w-8 h-8 rounded-full object-contain bg-white"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                            />
                          ) : null}
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center ${project.clientId && clientWebsiteMap[project.clientId] ? 'hidden' : ''}`}>
                            <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                              {(project.clientName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {project.clientName || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {project.product || project.name || '-'}
                      </td>
                      <td className="px-4 py-3 relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setStatusDropdown(statusDropdown === project.id ? null : project.id); }}
                          className={`badge ${statusConfig.bgClass} inline-flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity`}
                        >
                          {statusConfig.label}
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        {statusDropdown === project.id && (
                          <div ref={dropdownRef} className="absolute z-50 mt-1 left-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[150px]">
                            {(Object.entries(PROJECT_STATUS_CONFIG) as [ProjectStatus, typeof PROJECT_STATUS_CONFIG[ProjectStatus]][]).map(([status, config]) => (
                              <button
                                key={status}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateProject(project.id, { status });
                                  setStatusDropdown(null);
                                }}
                                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${project.status === status ? 'font-semibold' : ''}`}
                              >
                                <span className={`badge ${config.bgClass} text-xs`}>{config.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {project.ownerName || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(project.estimatedEndDate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {project.monthlyFee ? formatCurrency(project.monthlyFee) : '-'}
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
