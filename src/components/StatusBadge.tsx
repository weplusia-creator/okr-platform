import type { ElementType } from 'react';
import type { OKRStatus } from '../types';
import { STATUS_CONFIG } from '../types';
import { CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: OKRStatus;
  size?: 'sm' | 'md';
}

const StatusIcons: Record<OKRStatus, ElementType> = {
  in_progress: Clock,
  completed: CheckCircle,
  at_risk: AlertTriangle,
  cancelled: XCircle,
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = StatusIcons[status];

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-2.5 py-1 text-sm';

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <span className={`${config.bgClass} ${sizeClasses} inline-flex items-center gap-1.5 rounded-full font-medium`}>
      <Icon className={iconSize} />
      {config.label}
    </span>
  );
}
