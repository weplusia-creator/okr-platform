import { useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import {
  DELIVERABLE_STATUS_ORDER,
  DELIVERABLE_STATUS_CONFIG,
  type ProjectDeliverable,
  type DeliverableStatus,
} from '../../types/projects';
import { useProjects } from '../../context/ProjectContext';

interface KanbanBoardProps {
  deliverables: ProjectDeliverable[];
  onEditDeliverable: (d: ProjectDeliverable) => void;
}

const COLUMN_COLORS: Record<DeliverableStatus, { header: string; bg: string; border: string }> = {
  pending: {
    header: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    bg: 'bg-gray-50 dark:bg-gray-800/50',
    border: 'border-gray-200 dark:border-gray-700',
  },
  in_progress: {
    header: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-50/50 dark:bg-blue-900/10',
    border: 'border-blue-200 dark:border-blue-800',
  },
  in_review: {
    header: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
    bg: 'bg-yellow-50/50 dark:bg-yellow-900/10',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  delivered: {
    header: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50/50 dark:bg-emerald-900/10',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  approved: {
    header: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    bg: 'bg-green-50/50 dark:bg-green-900/10',
    border: 'border-green-200 dark:border-green-800',
  },
};

function truncate(text: string | null, maxLength: number): string {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
}

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  } catch {
    return dateStr;
  }
}

export function KanbanBoard({ deliverables, onEditDeliverable }: KanbanBoardProps) {
  const { updateDeliverable } = useProjects();

  const columns = useMemo(() => {
    const map: Record<DeliverableStatus, ProjectDeliverable[]> = {
      pending: [],
      in_progress: [],
      in_review: [],
      delivered: [],
      approved: [],
    };
    deliverables.forEach((d) => {
      map[d.status].push(d);
    });
    // Sort by sortOrder within each column
    Object.values(map).forEach((list) => list.sort((a, b) => a.sortOrder - b.sortOrder));
    return map;
  }, [deliverables]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as DeliverableStatus;
    const deliverableId = result.draggableId;
    if (newStatus !== result.source.droppableId) {
      updateDeliverable(deliverableId, { status: newStatus });
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[400px]">
        {DELIVERABLE_STATUS_ORDER.map((status) => {
          const colors = COLUMN_COLORS[status];
          const config = DELIVERABLE_STATUS_CONFIG[status];
          const columnDeliverables = columns[status];

          return (
            <div
              key={status}
              className={`flex-shrink-0 w-72 flex flex-col rounded-xl border ${colors.border} ${colors.bg}`}
            >
              <div className={`px-4 py-3 rounded-t-xl ${colors.header} font-semibold text-sm flex items-center justify-between`}>
                <span>{config.label}</span>
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/60 dark:bg-black/20 text-xs font-bold">
                  {columnDeliverables.length}
                </span>
              </div>

              <Droppable droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 p-2 space-y-2 min-h-[100px] transition-colors ${
                      snapshot.isDraggingOver ? 'bg-white/50 dark:bg-white/5' : ''
                    }`}
                  >
                    {columnDeliverables.map((deliverable, index) => {
                      const totalCriteria = deliverable.acceptanceCriteria.length;
                      const metCriteria = deliverable.acceptanceCriteria.filter((c) => c.checked).length;

                      return (
                        <Draggable key={deliverable.id} draggableId={deliverable.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => onEditDeliverable(deliverable)}
                              className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
                            >
                              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                                {deliverable.name}
                              </h4>

                              {deliverable.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                  {truncate(deliverable.description, 80)}
                                </p>
                              )}

                              <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 dark:text-gray-400">
                                {deliverable.dueDate && (
                                  <span className="inline-flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {formatDate(deliverable.dueDate)}
                                  </span>
                                )}

                                {deliverable.responsibleName && (
                                  <span className="inline-flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    {deliverable.responsibleName}
                                  </span>
                                )}
                              </div>

                              {totalCriteria > 0 && (
                                <div className="mt-2">
                                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    <span>Criterios de aceptación</span>
                                    <span>{metCriteria}/{totalCriteria}</span>
                                  </div>
                                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                    <div
                                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                                      style={{ width: `${(metCriteria / totalCriteria) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
