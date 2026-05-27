import { Inbox } from 'lucide-react';
import { useOKR } from '../context/OKRContext';
import { ObjectiveCard } from './ObjectiveCard';

import type { Objective } from '../types';

interface ObjectivesListProps {
  /** Optional pre-filtered list (e.g. scoped to a single client). When
   *  omitted, falls back to the global filteredObjectives from OKRContext. */
  objectives?: Objective[];
  /** When set, overrides each card's default expanded state. */
  forceExpanded?: boolean;
}

export function ObjectivesList({ forceExpanded, objectives }: ObjectivesListProps) {
  const { filteredObjectives, filters } = useOKR();
  const list = objectives ?? filteredObjectives;

  if (list.length === 0) {
    return (
      <div className="card p-12 text-center animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
          <Inbox className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No se encontraron objetivos
        </h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          {filters.search || filters.quarter !== 'all' || filters.year !== 'all' || filters.status !== 'all'
            ? 'Intenta ajustar los filtros para ver más resultados.'
            : 'Crea tu primer objetivo haciendo clic en el botón "Nuevo Objetivo".'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {list.map((objective) => (
        <ObjectiveCard
          key={objective.id}
          objective={objective}
          defaultExpanded={forceExpanded}
        />
      ))}
    </div>
  );
}
