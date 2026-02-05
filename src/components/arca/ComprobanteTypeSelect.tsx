import type { ComprobanteType } from '../../types/arca';
import { COMPROBANTE_CONFIG } from '../../types/arca';

interface ComprobanteTypeSelectProps {
  value: ComprobanteType | null;
  onChange: (type: ComprobanteType) => void;
  allowedTypes: ComprobanteType[];
}

export function ComprobanteTypeSelect({ value, onChange, allowedTypes }: ComprobanteTypeSelectProps) {
  // Group allowed types by letra
  const grouped = allowedTypes.reduce<Record<string, ComprobanteType[]>>((acc, type) => {
    const config = COMPROBANTE_CONFIG[type];
    if (!acc[config.letra]) {
      acc[config.letra] = [];
    }
    acc[config.letra].push(type);
    return acc;
  }, {});

  const letras = Object.keys(grouped).sort();

  return (
    <select
      value={value ?? ''}
      onChange={(e) => {
        const val = Number(e.target.value) as ComprobanteType;
        if (val) onChange(val);
      }}
      className="select"
    >
      <option value="">Seleccionar tipo de comprobante...</option>
      {letras.map(letra => (
        <optgroup key={letra} label={`Tipo ${letra}`}>
          {grouped[letra].map(type => (
            <option key={type} value={type}>
              {COMPROBANTE_CONFIG[type].label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
