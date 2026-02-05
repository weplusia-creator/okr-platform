import type { OrganizationCuit } from '../../types/arca';
import { formatCuit } from '../../types/arca';

interface CuitSelectorProps {
  value: string;
  onChange: (id: string) => void;
  cuits: OrganizationCuit[];
  className?: string;
}

export function CuitSelector({ value, onChange, cuits, className = '' }: CuitSelectorProps) {
  const activeCuits = cuits.filter(c => c.isActive);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`select ${className}`}
    >
      <option value="">Seleccionar CUIT emisor...</option>
      {activeCuits.map(cuit => (
        <option
          key={cuit.id}
          value={cuit.id}
          disabled={!cuit.hasCertificate}
        >
          {cuit.businessName} - {formatCuit(cuit.cuit)}
          {!cuit.hasCertificate ? ' (sin certificado)' : ''}
        </option>
      ))}
    </select>
  );
}
