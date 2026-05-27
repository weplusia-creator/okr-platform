import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Filters, StatsCards, ObjectivesList, ObjectiveForm } from '../components';
import { useOKR } from '../context/OKRContext';
import { useAuth } from '../context/AuthContext';
import { Loader2, Plus, ChevronsUpDown, ChevronsDownUp, ArrowLeft, Folder, Building2 } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

interface DashboardProps {
  /** When set, only render objectives matching this scope.
   *  - undefined → no scoping (legacy behaviour, not used by new routes)
   *  - 'internal' → objectives where clientId IS NULL
   *  - a client UUID → objectives where clientId === that UUID */
  scope?: 'internal' | string;
}

export function Dashboard({ scope }: DashboardProps = {}) {
  const params = useParams<{ clientId?: string }>();
  // URL-driven scope overrides prop (so /okrs/clients/:id and
  // /okrs/internal work without their own page components).
  const effectiveScope = params.clientId ?? scope;

  const { loading, error, filteredObjectives } = useOKR();
  const { organization } = useAuth();
  const { clients } = useFinance();
  const [showNewObjective, setShowNewObjective] = useState(false);
  const [forceExpanded, setForceExpanded] = useState<boolean | undefined>(undefined);

  const allExpanded = forceExpanded === true;

  // Apply the scope on top of whatever the existing OKR filters already did.
  const scopedObjectives = useMemo(() => {
    if (!effectiveScope) return filteredObjectives;
    if (effectiveScope === 'internal') {
      return filteredObjectives.filter(o => !o.clientId);
    }
    return filteredObjectives.filter(o => o.clientId === effectiveScope);
  }, [filteredObjectives, effectiveScope]);

  const scopeClient = useMemo(
    () => effectiveScope && effectiveScope !== 'internal'
      ? clients.find(c => c.id === effectiveScope) ?? null
      : null,
    [clients, effectiveScope],
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb back to clients hub when scoped */}
      {effectiveScope && (
        <Link
          to="/okrs"
          className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Todos los clientes
        </Link>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {effectiveScope === 'internal' && (
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              <Folder className="w-5 h-5" />
            </div>
          )}
          {scopeClient && (
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {scopeClient ? scopeClient.name : effectiveScope === 'internal' ? 'OKRs internos' : 'Dashboard de OKRs'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {scopeClient ? (
                <>Objetivos asignados a este cliente</>
              ) : effectiveScope === 'internal' ? (
                <>Objetivos sin cliente asignado (uso interno de {organization?.name || 'tu equipo'})</>
              ) : organization ? (
                <>Gestiona los objetivos de <span className="font-medium">{organization.name}</span></>
              ) : (
                'Visualiza y gestiona los objetivos de tu equipo'
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {scopedObjectives.length > 0 && (
            <button
              onClick={() => setForceExpanded(allExpanded ? false : true)}
              className="btn-secondary"
              title={allExpanded ? 'Contraer todos' : 'Expandir todos'}
            >
              {allExpanded ? <ChevronsDownUp className="w-4 h-4" /> : <ChevronsUpDown className="w-4 h-4" />}
              <span className="hidden sm:inline">{allExpanded ? 'Contraer' : 'Expandir'} todo</span>
            </button>
          )}
          <button onClick={() => setShowNewObjective(true)} className="btn-primary">
            <Plus className="w-5 h-5" />
            Nuevo Objetivo
          </button>
        </div>
      </div>

      <ObjectiveForm isOpen={showNewObjective} onClose={() => setShowNewObjective(false)} />

      {error && (
        <div className="p-4 rounded-lg bg-danger-50 dark:bg-danger-900/30 border border-danger-200 dark:border-danger-800">
          <p className="text-sm text-danger-700 dark:text-danger-300">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : (
        <>
          <StatsCards />
          <Filters />
          <ObjectivesList forceExpanded={forceExpanded} objectives={scopedObjectives} />
        </>
      )}
    </div>
  );
}
