import type { ArcaInvoiceStatus } from '../../types/arca';
import { ARCA_STATUS_CONFIG } from '../../types/arca';

interface ArcaStatusBadgeProps {
  status: ArcaInvoiceStatus;
}

export function ArcaStatusBadge({ status }: ArcaStatusBadgeProps) {
  const config = ARCA_STATUS_CONFIG[status];

  return (
    <span className={config.badgeClass}>
      {config.label}
    </span>
  );
}
