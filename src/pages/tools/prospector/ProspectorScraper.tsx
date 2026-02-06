import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe,
  Search,
  Linkedin,
  Loader2,
  Check,
  AlertCircle,
  ArrowLeft,
  Download,
  ExternalLink,
} from 'lucide-react';
import { useProspector } from '../../../context/ProspectorContext';
import type { ExtractedProspect, ProspectSource } from '../../../types/prospector';

type Tab = 'url' | 'search' | 'linkedin';

export function ProspectorScraper() {
  const { scrapeUrl, searchWeb, scrapeLinkedin, importScrapedProspects } = useProspector();

  const [activeTab, setActiveTab] = useState<Tab>('url');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ExtractedProspect[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [lastSource, setLastSource] = useState<{ type: ProspectSource; url?: string; query?: string }>({ type: 'manual' });

  // URL tab state
  const [url, setUrl] = useState('');
  const [hint, setHint] = useState('');

  // Search tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIndustry, setSearchIndustry] = useState('');
  const [searchCountry, setSearchCountry] = useState('');

  // LinkedIn tab state
  const [linkedinMode, setLinkedinMode] = useState<'url' | 'search' | 'paste'>('paste');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [linkedinSearch, setLinkedinSearch] = useState('');
  const [linkedinText, setLinkedinText] = useState('');

  const resetResults = () => {
    setResults([]);
    setSelected(new Set());
    setImportResult(null);
    setError(null);
  };

  const handleScrapeUrl = useCallback(async () => {
    if (!url.trim()) return;
    resetResults();
    setLoading(true);
    setError(null);
    try {
      const prospects = await scrapeUrl(url.trim(), hint.trim() || undefined);
      setResults(prospects);
      setSelected(new Set(prospects.map((_, i) => i)));
      setLastSource({ type: 'url_scrape', url: url.trim() });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [url, hint, scrapeUrl]);

  const handleSearchWeb = useCallback(async () => {
    if (!searchQuery.trim()) return;
    resetResults();
    setLoading(true);
    setError(null);
    try {
      const prospects = await searchWeb(
        searchQuery.trim(),
        searchIndustry.trim() || undefined,
        searchCountry.trim() || undefined,
      );
      setResults(prospects);
      setSelected(new Set(prospects.map((_, i) => i)));
      setLastSource({ type: 'web_search', query: searchQuery.trim() });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, searchIndustry, searchCountry, searchWeb]);

  const handleScrapeLinkedin = useCallback(async () => {
    resetResults();
    setLoading(true);
    setError(null);
    try {
      let prospects: ExtractedProspect[];
      let sourceInfo: { type: ProspectSource; url?: string; query?: string };

      if (linkedinMode === 'paste' && linkedinText.trim()) {
        prospects = await scrapeLinkedin({ rawText: linkedinText.trim() });
        sourceInfo = { type: 'linkedin' };
      } else if (linkedinMode === 'url' && linkedinUrl.trim()) {
        prospects = await scrapeLinkedin({ url: linkedinUrl.trim() });
        sourceInfo = { type: 'linkedin', url: linkedinUrl.trim() };
      } else if (linkedinMode === 'search' && linkedinSearch.trim()) {
        prospects = await scrapeLinkedin({ searchQuery: linkedinSearch.trim() });
        sourceInfo = { type: 'linkedin', query: linkedinSearch.trim() };
      } else {
        setError('Completa al menos un campo');
        setLoading(false);
        return;
      }

      setResults(prospects);
      setSelected(new Set(prospects.map((_, i) => i)));
      setLastSource(sourceInfo);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [linkedinMode, linkedinText, linkedinUrl, linkedinSearch, scrapeLinkedin]);

  const toggleSelect = (idx: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === results.length) setSelected(new Set());
    else setSelected(new Set(results.map((_, i) => i)));
  };

  const handleImport = async () => {
    const toImport = results.filter((_, i) => selected.has(i));
    if (toImport.length === 0) return;
    setImporting(true);
    try {
      const result = await importScrapedProspects(
        toImport,
        lastSource.type,
        lastSource.url,
        lastSource.query,
      );
      setImportResult(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setImporting(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'url', label: 'Scrape URL', icon: <Globe className="w-4 h-4" /> },
    { key: 'search', label: 'Busqueda Web', icon: <Search className="w-4 h-4" /> },
    { key: 'linkedin', label: 'LinkedIn', icon: <Linkedin className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/tools/prospector" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Generador de Prospectos</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Extrae prospectos de URLs, busquedas web o LinkedIn con IA</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); resetResults(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="card p-6">
        {activeTab === 'url' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                URL a scrapear
              </label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://directorio-empresas.com/lista..."
                className="input w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Pega la URL de un directorio de empresas, pagina de industria, etc.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Hint de extraccion (opcional)
              </label>
              <input
                type="text"
                value={hint}
                onChange={e => setHint(e.target.value)}
                placeholder="Ej: empresas de tecnologia en Buenos Aires"
                className="input w-full"
              />
            </div>
            <button
              onClick={handleScrapeUrl}
              disabled={loading || !url.trim()}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              Extraer Prospectos
            </button>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Busqueda
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Ej: consulting companies, software development firms..."
                className="input w-full"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Industria (opcional)
                </label>
                <input
                  type="text"
                  value={searchIndustry}
                  onChange={e => setSearchIndustry(e.target.value)}
                  placeholder="Ej: Technology, Finance..."
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pais (opcional)
                </label>
                <input
                  type="text"
                  value={searchCountry}
                  onChange={e => setSearchCountry(e.target.value)}
                  placeholder="Ej: Argentina, Mexico..."
                  className="input w-full"
                />
              </div>
            </div>
            <button
              onClick={handleSearchWeb}
              disabled={loading || !searchQuery.trim()}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Buscar y Extraer
            </button>
          </div>
        )}

        {activeTab === 'linkedin' && (
          <div className="space-y-4">
            <div className="flex gap-2 mb-2">
              {(['paste', 'url', 'search'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setLinkedinMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    linkedinMode === mode
                      ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {mode === 'paste' ? 'Pegar Texto' : mode === 'url' ? 'URL de Perfil' : 'Buscar Perfiles'}
                </button>
              ))}
            </div>

            {linkedinMode === 'paste' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Texto de LinkedIn
                </label>
                <textarea
                  value={linkedinText}
                  onChange={e => setLinkedinText(e.target.value)}
                  placeholder="Copia y pega el texto de un perfil de LinkedIn, o varios perfiles..."
                  className="input w-full h-40 resize-y"
                  rows={6}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Selecciona todo el texto de un perfil de LinkedIn y pegalo aqui. Funciona con multiples perfiles.
                </p>
              </div>
            )}

            {linkedinMode === 'url' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL del perfil
                </label>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={e => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/nombre-persona"
                  className="input w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Requiere Proxycurl API key o intenta via Google cache.
                </p>
              </div>
            )}

            {linkedinMode === 'search' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Buscar perfiles
                </label>
                <input
                  type="text"
                  value={linkedinSearch}
                  onChange={e => setLinkedinSearch(e.target.value)}
                  placeholder="Ej: CTO fintech Argentina"
                  className="input w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Busca perfiles de LinkedIn via Google. Requiere Google Search API configurada.
                </p>
              </div>
            )}

            <button
              onClick={handleScrapeLinkedin}
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Linkedin className="w-4 h-4" />}
              Extraer de LinkedIn
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Extrayendo prospectos con IA... esto puede tardar 15-30 segundos
          </p>
        </div>
      )}

      {/* Import result */}
      {importResult && (
        <div className="card p-4 border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <Check className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">
              {importResult.imported} prospectos importados exitosamente.
              {importResult.errors.length > 0 && ` ${importResult.errors.length} errores.`}
            </p>
          </div>
          {importResult.errors.length > 0 && (
            <ul className="mt-2 text-xs text-red-600 dark:text-red-400 list-disc pl-6">
              {importResult.errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Results Table */}
      {results.length > 0 && !importResult && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {results.length} prospectos encontrados
              </h3>
              <span className="text-sm text-gray-500">
                {selected.size} seleccionados
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleAll}
                className="btn-secondary text-sm"
              >
                {selected.size === results.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
              <button
                onClick={handleImport}
                disabled={importing || selected.size === 0}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Importar {selected.size} seleccionados
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === results.length}
                      onChange={toggleAll}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Empresa</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Contacto</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Industria</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ubicacion</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Web</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {results.map((prospect, idx) => (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      selected.has(idx)
                        ? 'bg-primary-50 dark:bg-primary-900/10'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(idx)}
                        onChange={() => toggleSelect(idx)}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 dark:text-white text-sm">
                        {prospect.companyName}
                      </span>
                      {prospect.companySize && (
                        <span className="block text-xs text-gray-500">{prospect.companySize} empleados</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900 dark:text-white">{prospect.contactName}</span>
                      {prospect.contactTitle && (
                        <span className="block text-xs text-gray-500">{prospect.contactTitle}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {prospect.email || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {prospect.industry || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {[prospect.city, prospect.country].filter(Boolean).join(', ') || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {prospect.website ? (
                        <a
                          href={prospect.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700"
                          onClick={e => e.stopPropagation()}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No results */}
      {!loading && !error && results.length === 0 && !importResult && (
        <div className="card p-8 text-center text-gray-500 dark:text-gray-400">
          <Globe className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">
            {activeTab === 'url' && 'Pega una URL de un directorio de empresas para extraer prospectos automaticamente.'}
            {activeTab === 'search' && 'Busca empresas por industria, ubicacion o keywords. Requiere Google Search API.'}
            {activeTab === 'linkedin' && 'Extrae datos de perfiles de LinkedIn pegando texto, URL o buscando perfiles.'}
          </p>
        </div>
      )}
    </div>
  );
}
