import { useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Users,
  Upload,
  Download,
  Loader2,
} from 'lucide-react';
import { useProspector } from '../../../context/ProspectorContext';
import {
  PROSPECT_STATUS_CONFIG,
  SCORE_LABEL_CONFIG,
  PROSPECT_SOURCE_CONFIG,
  type ProspectStatus,
  type ScoreLabel,
  type ProspectSource,
} from '../../../types/prospector';

interface Filters {
  search: string;
  status: ProspectStatus | 'all';
  score: ScoreLabel | 'all';
  source: ProspectSource | 'all';
  industry: string;
}

export function ProspectorList() {
  const navigate = useNavigate();
  const { prospects, loading, deleteProspect, importCSV, exportCSV } = useProspector();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'all',
    score: 'all',
    source: 'all',
    industry: '',
  });

  const filteredProspects = useMemo(() => {
    return prospects.filter((prospect) => {
      // Status filter
      if (filters.status !== 'all' && prospect.status !== filters.status) return false;

      // Score filter
      if (filters.score !== 'all' && prospect.scoreLabel !== filters.score) return false;

      // Source filter
      if (filters.source !== 'all' && prospect.source !== filters.source) return false;

      // Industry filter
      if (filters.industry) {
        const industryLower = filters.industry.toLowerCase();
        if (!(prospect.industry || '').toLowerCase().includes(industryLower)) return false;
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchCompany = prospect.companyName.toLowerCase().includes(searchLower);
        const matchContact = prospect.contactName.toLowerCase().includes(searchLower);
        const matchEmail = prospect.email?.toLowerCase().includes(searchLower);
        const matchIndustry = prospect.industry?.toLowerCase().includes(searchLower);
        if (!matchCompany && !matchContact && !matchEmail && !matchIndustry) return false;
      }

      return true;
    });
  }, [prospects, filters]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('¿Estas seguro de eliminar este prospecto?')) {
      await deleteProspect(id);
    }
  };

  const handleExport = () => {
    const csv = exportCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prospectos_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      alert('El archivo CSV esta vacio o no tiene datos.');
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const rows: Partial<Record<string, string>>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      rows.push(row);
    }

    const mapped = rows.map((row) => ({
      companyName: row.company_name || row.companyName || '',
      contactName: row.contact_name || row.contactName || '',
      contactTitle: row.contact_title || row.contactTitle || null,
      email: row.email || null,
      phone: row.phone || null,
      linkedinUrl: row.linkedin_url || row.linkedinUrl || null,
      website: row.website || null,
      industry: row.industry || null,
      companySize: row.company_size || row.companySize || null,
      country: row.country || null,
      city: row.city || null,
      estimatedValue: parseFloat(row.estimated_value || row.estimatedValue || '0') || 0,
      notes: row.notes || null,
    }));

    const result = await importCSV(mapped);
    alert(
      `Importacion completada: ${result.imported} prospectos importados.` +
        (result.errors.length > 0 ? `\n\nErrores:\n${result.errors.join('\n')}` : ''),
    );

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
      {/* Hidden CSV file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleCSVImport}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Prospectos
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {prospects.length} prospectos registrados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary"
          >
            <Upload className="w-5 h-5" />
            Importar CSV
          </button>
          <button onClick={handleExport} className="btn-secondary">
            <Download className="w-5 h-5" />
            Exportar
          </button>
          <Link to="/tools/prospector/new" className="btn-primary">
            <Plus className="w-5 h-5" />
            Nuevo
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Buscar por empresa, contacto, email, industria..."
              className="input pl-10 w-full"
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, status: e.target.value as Filters['status'] }))
            }
            className="select"
          >
            <option value="all">Todos los estados</option>
            {(Object.keys(PROSPECT_STATUS_CONFIG) as ProspectStatus[]).map((status) => (
              <option key={status} value={status}>
                {PROSPECT_STATUS_CONFIG[status].label}
              </option>
            ))}
          </select>

          <select
            value={filters.score}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, score: e.target.value as Filters['score'] }))
            }
            className="select"
          >
            <option value="all">Todos los scores</option>
            {(Object.keys(SCORE_LABEL_CONFIG) as ScoreLabel[]).map((score) => (
              <option key={score} value={score}>
                {SCORE_LABEL_CONFIG[score].label}
              </option>
            ))}
          </select>

          <select
            value={filters.source}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, source: e.target.value as Filters['source'] }))
            }
            className="select"
          >
            <option value="all">Todas las fuentes</option>
            {(Object.keys(PROSPECT_SOURCE_CONFIG) as ProspectSource[]).map((source) => (
              <option key={source} value={source}>
                {PROSPECT_SOURCE_CONFIG[source].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {filteredProspects.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {filters.search || filters.status !== 'all' || filters.score !== 'all' || filters.source !== 'all' || filters.industry
              ? 'No se encontraron prospectos'
              : 'No hay prospectos'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {filters.search || filters.status !== 'all' || filters.score !== 'all' || filters.source !== 'all' || filters.industry
              ? 'Intenta con otros filtros de busqueda'
              : 'Comienza creando tu primer prospecto'}
          </p>
          {!filters.search && filters.status === 'all' && filters.score === 'all' && filters.source === 'all' && !filters.industry && (
            <Link to="/tools/prospector/new" className="btn-primary inline-flex">
              <Plus className="w-5 h-5" />
              Nuevo Prospecto
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
                    Industria
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Fuente
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredProspects.map((prospect) => {
                  const statusConfig = PROSPECT_STATUS_CONFIG[prospect.status];
                  const scoreConfig = SCORE_LABEL_CONFIG[prospect.scoreLabel];

                  return (
                    <tr
                      key={prospect.id}
                      onClick={() => navigate(`/tools/prospector/${prospect.id}`)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                              {prospect.contactName
                                .split(' ')
                                .map((w) => w[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white block">
                              {prospect.contactName}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {prospect.companyName}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {prospect.email || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {prospect.industry || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${scoreConfig.bgClass}`}>
                          {scoreConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${statusConfig.bgClass}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${PROSPECT_SOURCE_CONFIG[prospect.source]?.bgClass || 'bg-gray-500/20 text-gray-300'}`}>
                          {PROSPECT_SOURCE_CONFIG[prospect.source]?.label || prospect.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {formatCurrency(prospect.estimatedValue)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/tools/prospector/${prospect.id}`);
                            }}
                            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                            title="Ver"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <Link
                            to={`/tools/prospector/${prospect.id}/edit`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={(e) => handleDelete(e, prospect.id)}
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
