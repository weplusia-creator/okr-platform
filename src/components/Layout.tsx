import { useState, useEffect, useMemo } from 'react';
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
  GanttChart as GanttChartIcon,
  Sparkles,
  Briefcase,
  Building2,
  BarChart3,
  Eye,
  Kanban,
  Calendar,
  Settings,
  BookOpen,
  ClipboardList,
  ClipboardCheck,
  Shield,
  ArrowLeftRight,
  Handshake,
  Wrench,
  Calculator,
  Presentation,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { InfoBar } from './InfoBar';
import { NotificationBell } from './NotificationBell';

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
    label: 'Tablero de Control',
    icon: BarChart3,
    path: '/dashboard',
  },
  {
    label: 'Proyectos',
    icon: FolderKanban,
    children: [
      { label: 'Dashboard', path: '/projects', icon: LayoutDashboard },
      { label: 'Proyectos', path: '/projects/list', icon: FolderKanban },
      { label: 'Clientes', path: '/projects/clients', icon: Users },
      { label: 'Gantt', path: '/projects/gantt', icon: GanttChartIcon },
      { label: 'Check-ins', path: '/checkins', icon: ClipboardCheck },
      { label: 'Diagnóstico BMC', path: '/bmc', icon: ClipboardList },
      { label: 'Playbook', path: '/playbook', icon: BookOpen },
    ],
  },
  {
    label: 'CRM',
    icon: Handshake,
    children: [
      { label: 'Dashboard', path: '/crm', icon: LayoutDashboard },
      { label: 'Tablero Control', path: '/crm/control', icon: BarChart3 },
      { label: 'Leads', path: '/crm/leads', icon: Users },
      { label: 'Pipeline', path: '/crm/pipeline', icon: Kanban },
      { label: 'Propuestas', path: '/proposals', icon: FileText },
      { label: 'Actividades', path: '/crm/activities', icon: Calendar },
    ],
  },
  {
    label: 'Finanzas',
    icon: DollarSign,
    children: [
      { label: 'Dashboard', path: '/finance', icon: LayoutDashboard },
      { label: 'Facturas', path: '/finance/invoices', icon: FileText },
      { label: 'Flujo de caja', path: '/finance/cash-flow', icon: TrendingUp },
      { label: 'Saldos', path: '/finance/saldos', icon: ArrowLeftRight },
      { label: 'ARCA', path: '/finance/arca', icon: Shield },
    ],
  },
  {
    label: 'OKRs',
    icon: Target,
    children: [
      { label: 'Objetivos', path: '/okrs', icon: Target },
      { label: 'Iniciativas', path: '/okrs/initiatives', icon: Kanban },
    ],
  },
  {
    label: 'Tareas',
    icon: ClipboardList,
    path: '/tareas',
  },
  {
    label: 'KPIs',
    icon: BarChart3,
    path: '/kpis',
  },
  {
    label: 'Tools',
    icon: Wrench,
    children: [
      { label: 'Todas', path: '/tools', icon: Wrench },
      { label: 'Presentaciones', path: '/presentations', icon: Presentation },
      { label: 'Prospector B2B', path: '/tools/prospector', icon: Target },
      { label: 'Calculadora ROI', path: '/tools/roi', icon: Calculator },
    ],
  },
  {
    label: 'Admin',
    icon: Settings,
    children: [
      { label: 'Consultor', path: '/admin/team', icon: Briefcase },
      { label: 'Clientes', path: '/admin/clients', icon: Building2 },
      { label: 'Reuniones', path: '/admin/meetings', icon: Calendar },
      { label: 'Servicios', path: '/products', icon: Sparkles },
      { label: 'Manual de uso', path: '/admin/manual', icon: BookOpen },
    ],
  },
  {
    label: 'Portal Cliente',
    icon: Eye,
    path: '/portal',
  },
];

const SUPER_ADMIN_NAV: NavItem[] = [
  ...ADMIN_NAV,
  {
    label: 'Super Admin',
    icon: Shield,
    children: [
      { label: 'Organizaciones', path: '/super/organizations', icon: Building2 },
      { label: 'Todos los usuarios', path: '/super/users', icon: Users },
    ],
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
      { label: 'Check-ins', path: '/checkins', icon: ClipboardCheck },
    ],
  },
  {
    label: 'OKRs',
    icon: Target,
    children: [
      { label: 'Objetivos', path: '/okrs', icon: Target },
      { label: 'Iniciativas', path: '/okrs/initiatives', icon: Kanban },
    ],
  },
  {
    label: 'Tareas',
    icon: ClipboardList,
    path: '/tareas',
  },
];

const CLIENT_NAV: NavItem[] = [
  {
    label: 'Mis Proyectos',
    icon: FolderKanban,
    path: '/portal',
  },
];

export function Layout() {
  const location = useLocation();
  const { appUser, organization, signOut, isSuperAdmin, impersonating, stopImpersonating } = useAuth();
  const isAdmin = appUser?.role === 'admin' || appUser?.role === 'super_admin';
  const navigation = appUser?.userType === 'client'
    ? CLIENT_NAV
    : isSuperAdmin && !impersonating
      ? SUPER_ADMIN_NAV
      : isAdmin
        ? ADMIN_NAV
        : appUser?.role === 'viewer'
          ? VIEWER_NAV
          : MEMBER_NAV;
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  // Derive which section contains the current path
  const activeSectionLabel = useMemo(() => {
    for (const item of navigation) {
      if (item.children?.some((c) => location.pathname === c.path || location.pathname.startsWith(c.path + '/'))) {
        return item.label;
      }
    }
    return null;
  }, [location.pathname, navigation]);

  // Auto-open the section that contains the current route
  useEffect(() => {
    if (activeSectionLabel) {
      setOpenSections((prev) => ({ ...prev, [activeSectionLabel]: true }));
    }
  }, [activeSectionLabel]);

  const toggleSection = (label: string) => {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#2e2a2b]">
      {/* WAU Brand accent bar */}
      <div className="wau-accent-bar fixed top-0 left-0 right-0 z-[60]" />

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-1 left-0 z-50 h-[calc(100%-4px)] w-64 bg-white dark:bg-[#272324] border-r border-gray-200 dark:border-[#443f40] transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-[#443f40]">
            <Link to="/home" className="flex items-center gap-3">
              <img src="/wau-logo.png" alt="WAU" className="w-9 h-9 rounded-lg object-contain" />
              <span className="font-bold text-gray-900 dark:text-white tracking-tight">
                WAU Consultora
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-gray-100 dark:hover:bg-[#3d3839] rounded"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Organization */}
          {organization && (
            <div className="px-4 py-3 border-b border-gray-200 dark:border-[#443f40]">
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
                        ? 'bg-primary-300 dark:bg-primary-400/20 dark:text-primary-300 nav-active-light'
                        : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3d3839]'
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
                          ? 'bg-primary-300 dark:bg-primary-400/20 dark:text-primary-300 nav-active-light'
                          : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3d3839]'
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
                                ? 'bg-primary-300 dark:bg-primary-400/20 dark:text-primary-300 font-medium nav-active-light'
                                : 'text-gray-600 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-[#3d3839] dark:hover:text-gray-300'
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
          <div className="p-3 border-t border-gray-200 dark:border-[#443f40]">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D4FC59' }}>
                <span className="text-sm font-medium" style={{ color: '#231F1F' }}>
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
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3d3839] rounded-lg transition-colors"
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

      {/* Desktop notification bell - fixed top right */}
      <div className="hidden lg:block fixed top-3 right-6 z-50">
        <NotificationBell />
      </div>

      {/* Main content */}
      <div className="lg:pl-64 pt-1">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-1 z-30 bg-white dark:bg-[#272324] border-b border-gray-200 dark:border-[#443f40]">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#3d3839] rounded-lg"
            >
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <Link to="/home" className="flex items-center gap-2">
              <img src="/wau-logo.png" alt="WAU" className="w-8 h-8 rounded-lg object-contain" />
              <span className="font-bold text-gray-900 dark:text-white tracking-tight">WAU Consultora</span>
            </Link>
            <NotificationBell />
          </div>
        </header>

        {/* Impersonation bar */}
        {impersonating && (
          <div className="sticky top-0 z-40 bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4" />
              <span>Viendo como: <strong>{appUser?.fullName || appUser?.email}</strong> — {organization?.name || 'Sin organización'}</span>
            </div>
            <button onClick={stopImpersonating} className="bg-white text-amber-600 px-3 py-1 rounded font-medium hover:bg-amber-50 transition-colors text-xs">
              Volver a Super Admin
            </button>
          </div>
        )}

        {/* Info bar */}
        {appUser?.userType !== 'client' && <InfoBar />}

        {/* Page content */}
        <main className="p-3 sm:p-4 md:p-6 min-h-[calc(100vh-4px)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
