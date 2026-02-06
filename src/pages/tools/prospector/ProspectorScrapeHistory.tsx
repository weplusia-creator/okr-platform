import { Link } from 'react-router-dom';
import { ArrowLeft, Globe, Search, Linkedin, Clock, Loader2 } from 'lucide-react';
import { useProspector } from '../../../context/ProspectorContext';
import type { ProspectSource } from '../../../types/prospector';

const JOB_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  url_scrape: { label: 'URL Scrape', icon: <Globe className="w-4 h-4" />, color: 'text-cyan-400' },
  web_search: { label: 'Web Search', icon: <Search className="w-4 h-4" />, color: 'text-indigo-400' },
  linkedin: { label: 'LinkedIn', icon: <Linkedin className="w-4 h-4" />, color: 'text-sky-400' },
  manual: { label: 'Manual', icon: <Clock className="w-4 h-4" />, color: 'text-gray-400' },
};

export function ProspectorScrapeHistory() {
  const { scrapeJobs, loading } = useProspector();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary-300" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/tools/prospector" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Historial de Scraping</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {scrapeJobs.length} extracciones realizadas
          </p>
        </div>
      </div>

      {scrapeJobs.length === 0 ? (
        <div className="card p-12 text-center">
          <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Sin historial
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Cuando extraigas prospectos, el historial aparecera aqui.
          </p>
          <Link to="/tools/prospector/scrape" className="btn-primary inline-flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Ir al Generador
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Tipo
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Fuente
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Encontrados
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Importados
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {scrapeJobs.map(job => {
                  const config = JOB_TYPE_CONFIG[job.jobType] || JOB_TYPE_CONFIG.manual;
                  return (
                    <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-2 ${config.color}`}>
                          {config.icon}
                          <span className="text-sm font-medium">{config.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                        {job.inputUrl || job.inputQuery || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {job.prospectsFound}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-green-600 dark:text-green-400">
                        {job.prospectsImported}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${
                          job.status === 'completed'
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}>
                          {job.status === 'completed' ? 'OK' : 'Error'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(job.createdAt).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
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
