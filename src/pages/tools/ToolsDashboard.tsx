import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calculator,
  Tag,
  Grid3x3,
  Scale,
  Clock,
  UserPlus,
  TrendingUp,
  Compass,
  DollarSign,
  Zap,
  Megaphone,
  Search,
  Wrench,
  Target,
} from 'lucide-react';
import { TOOLS_CATALOG, TOOL_CATEGORIES, type ToolCategory } from '../../types/tools';

const ICON_MAP: Record<string, React.ElementType> = {
  Calculator,
  Tag,
  Grid3x3,
  Scale,
  Clock,
  UserPlus,
  TrendingUp,
  Compass,
  DollarSign,
  Zap,
  Megaphone,
  Search,
  Wrench,
  Target,
};

const CATEGORY_LABELS: Record<ToolCategory, string> = {
  ventas: 'Ventas',
  estrategia: 'Estrategia',
  finanzas: 'Finanzas',
  productividad: 'Productividad',
  marketing: 'Marketing',
  diagnostico: 'Diagnostico',
};

export function ToolsDashboard() {
  const [activeCategory, setActiveCategory] = useState<ToolCategory | 'all'>('all');

  const filteredTools =
    activeCategory === 'all'
      ? TOOLS_CATALOG
      : TOOLS_CATALOG.filter((tool) => tool.category === activeCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Herramientas</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Herramientas para potenciar tu negocio
        </p>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeCategory === 'all'
              ? 'bg-primary-300 text-gray-900'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-[#3d3839] dark:text-gray-400 dark:hover:bg-[#252525]'
          }`}
        >
          Todas
        </button>
        {TOOL_CATEGORIES.map((cat) => {
          const CatIcon = ICON_MAP[cat.icon];
          return (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === cat.value
                  ? 'bg-primary-300 text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-[#3d3839] dark:text-gray-400 dark:hover:bg-[#252525]'
              }`}
            >
              {CatIcon && <CatIcon className="w-4 h-4" />}
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTools.map((tool) => {
          const Icon = ICON_MAP[tool.icon] || Wrench;

          const cardContent = (
            <div
              className={`card p-5 h-full flex flex-col ${
                tool.available
                  ? 'hover:shadow-md dark:hover:bg-[#3d3839] cursor-pointer'
                  : 'opacity-60 cursor-default'
              } transition-all duration-200`}
            >
              {/* Icon + Badge Row */}
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-primary-100 dark:bg-primary-300/10">
                  <Icon className="w-6 h-6 text-primary-600 dark:text-primary-300" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge badge-gray">
                    {CATEGORY_LABELS[tool.category]}
                  </span>
                  {!tool.available && (
                    <span className="badge badge-primary">
                      Proximamente
                    </span>
                  )}
                </div>
              </div>

              {/* Name */}
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                {tool.name}
              </h3>

              {/* Description */}
              <p className="text-sm text-gray-500 dark:text-gray-400 flex-1">
                {tool.description}
              </p>
            </div>
          );

          if (tool.available) {
            return (
              <Link key={tool.id} to={tool.path} className="block">
                {cardContent}
              </Link>
            );
          }

          return (
            <div key={tool.id}>
              {cardContent}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredTools.length === 0 && (
        <div className="text-center py-16">
          <Wrench className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            No hay herramientas en esta categoria
          </p>
        </div>
      )}
    </div>
  );
}
