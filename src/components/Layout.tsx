import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  Target,
  LayoutDashboard,
  DollarSign,
  Users,
  FileText,
  TrendingUp,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Sun,
  Moon,
  FolderKanban,
  CheckSquare,
  GanttChart as GanttChartIcon,
  Package,
  Briefcase,
  Building2,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path?: string;
  children?: { label: string; path: string; icon: React.ElementType }[];
}

const ADMIN_NAV: NavItem[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/',
  },
  {
    label: 'Proyectos',
    icon: FolderKanban,
    children: [
      { label: 'Dashboard', path: '/projects', icon: LayoutDashboard },
      { label: 'Proyectos', path: '/projects/list', icon: FolderKanban },
      { label: 'Clientes', path: '/projects/clients', icon: Users },
      { label: 'Mis Módulos', path: '/projects/my-modules', icon: CheckSquare },
      { label: 'Gantt', path: '/projects/gantt', icon: GanttChartIcon },
    ],
  },
  {
    label: 'Finanzas',
    icon: DollarSign,
    children: [
      { label: 'Dashboard', path: '/finance', icon: LayoutDashboard },
      { label: 'Facturas', path: '/finance/invoices', icon: FileText },
      { label: 'Flujo de caja', path: '/finance/cash-flow', icon: TrendingUp },
    ],
  },
  {
    label: 'Productos',
    icon: Package,
    path: '/products',
  },
  {
    label: 'KPIs',
    icon: BarChart3,
    path: '/kpis',
  },
  {
    label: 'Equipo',
    icon: Users,
    children: [
      { label: 'Consultor', path: '/admin/team', icon: Briefcase },
      { label: 'Clientes', path: '/admin/clients', icon: Building2 },
    ],
  },
  {
    label: 'OKRs',
    icon: Target,
    path: '/okrs',
  },
];

const VIEWER_NAV: NavItem[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/',
  },
  {
    label: 'OKRs',
    icon: Target,
    path: '/okrs',
  },
];

const MEMBER_NAV: NavItem[] = [
  {
    label: 'Proyectos',
    icon: FolderKanban,
    children: [
      { label: 'Proyectos', path: '/projects/list', icon: FolderKanban },
      { label: 'Mis Módulos', path: '/projects/my-modules', icon: CheckSquare },
    ],
  },
];

export function Layout() {
  const location = useLocation();
  const { appUser, organization, signOut } = useAuth();
  const isAdmin = appUser?.role === 'admin';
  const navigation = isAdmin ? ADMIN_NAV : appUser?.role === 'viewer' ? VIEWER_NAV : MEMBER_NAV;
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Proyectos: location.pathname.startsWith('/projects'),
    Finanzas: location.pathname.startsWith('/finance'),
    Equipo: location.pathname.startsWith('/admin'),
  });

  const toggleSection = (label: string) => {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <Link to="/" className="flex items-center gap-3">
              <img src="/wau-logo.png" alt="WAU" className="w-9 h-9 rounded-lg object-contain" />
              <span className="font-bold text-gray-900 dark:text-white">
                WAU Platform
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Organization */}
          {organization && (
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">Organización</p>
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {organization.name}
              </p>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <div key={item.label}>
                {item.path ? (
                  <Link
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive(item.path)
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                ) : (
                  <>
                    <button
                      onClick={() => toggleSection(item.label)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                        item.children?.some((c) => location.pathname.startsWith(c.path))
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${openSections[item.label] ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {openSections[item.label] && item.children && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.path}
                            to={child.path}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                              location.pathname === child.path
                                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            <child.icon className="w-4 h-4" />
                            <span className="text-sm">{child.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </nav>

          {/* User section */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <span className="text-sm font-medium text-primary-600">
                  {appUser?.fullName?.charAt(0) || appUser?.email?.charAt(0) || '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {appUser?.fullName || 'Usuario'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {appUser?.email}
                </p>
              </div>
            </div>
            <div className="flex gap-1 mt-2">
              <button
                onClick={toggleTheme}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={signOut}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Salir
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <img src="/wau-logo.png" alt="WAU" className="w-8 h-8 rounded-lg object-contain" />
              <span className="font-bold text-gray-900 dark:text-white">WAU Platform</span>
            </Link>
            <div className="w-9" /> {/* Spacer */}
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
