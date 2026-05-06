import { useState } from 'react';
import { Filters, StatsCards, ObjectivesList, ObjectiveForm } from '../components';
import { useOKR } from '../context/OKRContext';
import { useAuth } from '../context/AuthContext';
import { Loader2, Plus, ChevronsUpDown, ChevronsDownUp } from 'lucide-react';

export function Dashboard() {
  const { loading, error, filteredObjectives } = useOKR();
  const { organization } = useAuth();
  const [showNewObjective, setShowNewObjective] = useState(false);
  const [forceExpanded, setForceExpanded] = useState<boolean | undefined>(undefined);

  const allExpanded = forceExpanded === true;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard de OKRs
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {organization ? (
              <>Gestiona los objetivos de <span className="font-medium">{organization.name}</span></>
            ) : (
              'Visualiza y gestiona los objetivos de tu equipo'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {filteredObjectives.length > 0 && (
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
          <ObjectivesList forceExpanded={forceExpanded} />
        </>
      )}
    </div>
  );
}
