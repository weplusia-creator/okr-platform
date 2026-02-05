import { Link, useLocation } from 'react-router-dom';
import { Settings, MapPin, FileText } from 'lucide-react';

const TABS = [
  { label: 'Configuracion', path: '/finance/arca', icon: Settings },
  { label: 'Puntos de Venta', path: '/finance/arca/puntos-venta', icon: MapPin },
  { label: 'Facturas Electronicas', path: '/finance/arca/invoices', icon: FileText },
];

export function ArcaTabs() {
  const { pathname } = useLocation();

  return (
    <div className="flex gap-1 border-b border-gray-200 dark:border-[#443f40] mb-6">
      {TABS.map(tab => {
        const active = pathname === tab.path;
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              active
                ? 'border-primary-400 text-primary-400 dark:text-primary-300'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
