import { Calendar, Edit, Trash2, DollarSign, Paperclip, MessageSquare, CheckCircle2, Circle } from 'lucide-react';
import {
  DELIVERABLE_STATUS_CONFIG,
  type ProjectDeliverable,
} from '../../types/projects';

interface DeliverableCardProps {
  deliverable: ProjectDeliverable;
  onEdit: () => void;
  onDelete: () => void;
}

export function DeliverableCard({ deliverable, onEdit, onDelete }: DeliverableCardProps) {
  const statusConfig = DELIVERABLE_STATUS_CONFIG[deliverable.status];

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
            {deliverable.name}
          </h3>
          {deliverable.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              {deliverable.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className={`${statusConfig.bgClass} text-xs px-2 py-1 rounded-full`}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Info Row */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
        {deliverable.dueDate && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(deliverable.dueDate + 'T00:00:00').toLocaleDateString('es-AR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        )}
        {deliverable.responsibleName && (
          <span className="inline-flex items-center gap-1">
            {deliverable.responsibleName}
          </span>
        )}
        {deliverable.invoiceAmount != null && deliverable.invoiceAmount > 0 && (
          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
            <DollarSign className="w-3.5 h-3.5" />
            {deliverable.invoiceAmount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
          </span>
        )}
      </div>

      {/* Acceptance Criteria */}
      {deliverable.acceptanceCriteria.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Criterios de aceptacion</p>
          <ul className="space-y-1">
            {deliverable.acceptanceCriteria.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                {item.checked ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                )}
                <span className={item.checked ? 'line-through text-gray-400 dark:text-gray-500' : ''}>
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Client Feedback */}
      {deliverable.clientFeedback && (
        <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400 flex items-center gap-1 mb-1">
            <MessageSquare className="w-3.5 h-3.5" />
            Feedback del cliente
          </p>
          <p className="text-xs text-yellow-600 dark:text-yellow-300">{deliverable.clientFeedback}</p>
        </div>
      )}

      {/* Attachments */}
      {deliverable.attachments.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Adjuntos</p>
          <div className="flex flex-wrap gap-2">
            {deliverable.attachments.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Paperclip className="w-3 h-3" />
                Adjunto {i + 1}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
        <button onClick={onEdit} className="btn-ghost btn-sm flex items-center gap-1 text-gray-600 dark:text-gray-400">
          <Edit className="w-3.5 h-3.5" />
          Editar
        </button>
        <button onClick={onDelete} className="btn-ghost btn-sm flex items-center gap-1 text-red-500 dark:text-red-400">
          <Trash2 className="w-3.5 h-3.5" />
          Eliminar
        </button>
      </div>
    </div>
  );
}
