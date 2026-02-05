import { DollarSign, TrendingUp, Thermometer } from 'lucide-react';
import { useInfoBar } from '../hooks/useInfoBar';

function formatNum(n: number | null | undefined): string {
  if (n == null) return '--';
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n);
}

export function InfoBar() {
  const { dolarBlue, dolarOficial, riesgoPais, temperatura, loading } = useInfoBar();

  const placeholder = loading ? 'animate-pulse' : '';

  return (
    <div className="border-b border-gray-200 dark:border-[#443f40] bg-gray-50 dark:bg-[#272324] px-4 py-1.5 overflow-hidden">
      <div className="flex items-center gap-5 text-xs whitespace-nowrap">
        {/* Dólar Blue */}
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3 h-3 text-primary-400" />
          <span className="text-gray-500 dark:text-gray-500">Blue</span>
          <span className={`font-medium text-gray-900 dark:text-gray-200 ${placeholder}`}>
            ${formatNum(dolarBlue?.venta)}
          </span>
        </div>

        <span className="text-gray-300 dark:text-gray-700">|</span>

        {/* Dólar Oficial */}
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500 dark:text-gray-500">Oficial</span>
          <span className={`font-medium text-gray-900 dark:text-gray-200 ${placeholder}`}>
            ${formatNum(dolarOficial?.venta)}
          </span>
        </div>

        <span className="text-gray-300 dark:text-gray-700">|</span>

        {/* Riesgo País */}
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3 text-amber-500" />
          <span className="text-gray-500 dark:text-gray-500">Riesgo País</span>
          <span className={`font-medium text-gray-900 dark:text-gray-200 ${placeholder}`}>
            {formatNum(riesgoPais)}
          </span>
        </div>

        {temperatura != null && (
          <>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <div className="flex items-center gap-1.5">
              <Thermometer className="w-3 h-3 text-blue-400" />
              <span className={`font-medium text-gray-900 dark:text-gray-200`}>
                {temperatura}°C
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
