import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign, TrendingUp, TrendingDown, Handshake, FolderKanban, Target,
  FileText, CheckCircle2, Clock, AlertTriangle, Loader2, Users,
  ListChecks, BarChart3, ArrowRight, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { KPICard } from '../components/ui/KPICard';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { useCRM } from '../context/CRMContext';
import { useProjects } from '../context/ProjectContext';
import { todayLocalISO } from '../utils/helpers';
import { useOKR } from '../context/OKRContext';
import { useTask } from '../context/TaskContext';
import { useProposals } from '../context/ProposalContext';
import type { ProjectPayment } from '../types/projects';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const CHART_COLORS = {
  income: '#10B981',
  expense: '#EF4444',
  primary: '#3B82F6',
  warning: '#F59E0B',
  purple: '#8B5CF6',
  pink: '#EC4899',
  gray: '#6B7280',
  brand: '#D4FC59',
};

const INVOICE_COLORS: Record<string, string> = {
  draft: '#6B7280',
  issued: '#3B82F6',
  paid: '#10B981',
  overdue: '#EF4444',
  cancelled: '#9CA3AF',
};

const INVOICE_LABELS: Record<string, string> = {
  draft: 'Borrador',
  issued: 'Emitida',
  paid: 'Cobrada',
  overdue: 'Vencida',
  cancelled: 'Cancelada',
};

const PROJECT_COLORS: Record<string, string> = {
  proposal: '#6B7280',
  approved: '#3B82F6',
  in_progress: '#F59E0B',
  paused: '#8B5CF6',
  completed: '#10B981',
  cancelled: '#EF4444',
};

const PROJECT_LABELS: Record<string, string> = {
  proposal: 'Propuesta',
  approved: 'Aprobado',
  in_progress: 'En progreso',
  paused: 'Pausado',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

const PROPOSAL_COLORS: Record<string, string> = {
  draft: '#6B7280',
  sent: '#3B82F6',
  viewed: '#8B5CF6',
  accepted: '#10B981',
  rejected: '#EF4444',
};

const PROPOSAL_LABELS: Record<string, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  viewed: 'Vista',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
};

export function TableroControl() {
  const { organization } = useAuth();
  const { getFinanceSummary, getMonthlyData, getTopClients, invoices, transactions, recurringExpenses, loadingInvoices, loadingCashFlow } = useFinance();
  const { leads, deals, activities, getStats: getCRMStats, getPipelineByStage, loading: crmLoading } = useCRM();
  const { projects, fetchAllPayments, loading: projectsLoading } = useProjects();
  const { objectives, initiatives, loading: okrLoading } = useOKR();
  const { tasks, loading: tasksLoading } = useTask();
  const { proposals, getStats: getProposalStats, loading: proposalsLoading } = useProposals();

  const [isDark, setIsDark] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
  const [allPayments, setAllPayments] = useState<(ProjectPayment & { projectName: string })[]>([]);

  useEffect(() => {
    fetchAllPayments().then(setAllPayments);
  }, [fetchAllPayments]);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const isLoading = loadingInvoices || loadingCashFlow || crmLoading || projectsLoading || okrLoading || tasksLoading || proposalsLoading;

  // ===== Computed Data =====
  const financeSummary = useMemo(() => getFinanceSummary(), [getFinanceSummary]);
  const currentYear = new Date().getFullYear();
  const monthlyData = useMemo(() => getMonthlyData(currentYear), [getMonthlyData, currentYear]);

  // Year-filtered balance (matches CashFlow page)
  // Parse date string directly to avoid timezone issues
  const yearBalance = useMemo(() => {
    const yearTx = transactions.filter(t => parseInt(t.date.split('-')[0]) === currentYear);
    const income = yearTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = yearTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return income - expenses;
  }, [transactions, currentYear]);
  const crmStats = useMemo(() => getCRMStats(), [getCRMStats, leads, deals, activities]);
  const pipelineData = useMemo(() => getPipelineByStage(), [getPipelineByStage, deals]);
  const proposalStats = useMemo(() => getProposalStats(), [getProposalStats, proposals]);

  const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // Helper: check if a date string (YYYY-MM-DD) falls in the selected month/year
  // Parses string directly to avoid timezone issues with new Date()
  const isInSelectedMonth = (dateStr: string) => {
    const [y, m] = dateStr.split('-').map(Number);
    return (m - 1) === selectedMonth && y === currentYear;
  };

  // Month income
  const selectedMonthIncome = useMemo(() => {
    return transactions
      .filter(t => t.type === 'income' && isInSelectedMonth(t.date))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, selectedMonth, currentYear]);

  // Month expenses
  const selectedMonthExpenses = useMemo(() => {
    return transactions
      .filter(t => t.type === 'expense' && isInSelectedMonth(t.date))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, selectedMonth, currentYear]);

  // Selected month key for project payments (YYYY-MM format)
  const selectedMonthKey = `${currentYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  // Billing totals filtered by selected month
  const billingTotals = useMemo(() => {
    // Facturado: invoices ISSUED in the selected month (by issueDate)
    const monthInvoices = invoices.filter(i => isInSelectedMonth(i.issueDate));
    const totalFacturado = monthInvoices
      .filter(i => i.status !== 'draft' && i.status !== 'cancelled')
      .reduce((s, i) => s + i.total, 0);
    // Por cobrar: pending project payments for the selected month
    const porCobrar = allPayments
      .filter(p => p.status === 'pending' && p.month === selectedMonthKey)
      .reduce((s, p) => s + p.amount, 0);
    return { totalFacturado, porCobrar };
  }, [invoices, allPayments, selectedMonth, currentYear, selectedMonthKey]);

  // Top clients
  const topClients = useMemo(() => getTopClients(5), [getTopClients]);

  // Recurring expenses total
  const recurringTotal = useMemo(
    () => recurringExpenses.filter(r => r.active).reduce((s, r) => s + r.amount, 0),
    [recurringExpenses],
  );

  // Invoice status breakdown
  const invoiceStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    invoices.forEach(inv => { counts[inv.status] = (counts[inv.status] || 0) + 1; });
    return Object.entries(counts)
      .map(([status, value]) => ({
        name: INVOICE_LABELS[status] || status,
        value,
        color: INVOICE_COLORS[status] || '#6B7280',
      }))
      .filter(d => d.value > 0);
  }, [invoices]);

  // Project status breakdown
  const projectStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1; });
    return Object.entries(counts)
      .map(([status, value]) => ({
        name: PROJECT_LABELS[status] || status,
        value,
        color: PROJECT_COLORS[status] || '#6B7280',
      }))
      .filter(d => d.value > 0);
  }, [projects]);

  const activeProjects = useMemo(() => projects.filter(p => p.status === 'in_progress').length, [projects]);

  // OKR progress
  const avgOKRProgress = useMemo(() => {
    const allKRs = objectives.flatMap(o => o.keyResults);
    if (allKRs.length === 0) return 0;
    return Math.round(allKRs.reduce((s, kr) => s + kr.progress, 0) / allKRs.length);
  }, [objectives]);

  const okrProgressData = useMemo(() => {
    return objectives.slice(0, 6).map(obj => {
      const avg = obj.keyResults.length > 0
        ? Math.round(obj.keyResults.reduce((s, kr) => s + kr.progress, 0) / obj.keyResults.length)
        : 0;
      return {
        name: obj.title.length > 30 ? obj.title.substring(0, 30) + '...' : obj.title,
        progress: avg,
        fill: avg >= 70 ? '#10B981' : avg >= 30 ? '#F59E0B' : '#EF4444',
      };
    });
  }, [objectives]);

  const initiativeStats = useMemo(() => ({
    todo: initiatives.filter(i => i.status === 'todo').length,
    inProgress: initiatives.filter(i => i.status === 'in_progress').length,
    done: initiatives.filter(i => i.status === 'done').length,
  }), [initiatives]);

  // Task stats
  const taskStats = useMemo(() => {
    const todo = tasks.filter(t => t.status === 'todo').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const done = tasks.filter(t => t.status === 'done').length;
    const total = tasks.length;
    const today = todayLocalISO();
    const overdue = tasks.filter(t => t.status !== 'done' && t.dueDate && t.dueDate < today).length;
    return { todo, inProgress, done, total, overdue, completionRate: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [tasks]);

  // Proposal status breakdown
  const proposalStatusData = useMemo(() => {
    const statuses = ['draft', 'sent', 'viewed', 'accepted', 'rejected'] as const;
    const counts: Record<string, number> = {};
    proposals.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1; });
    return statuses
      .map(s => ({ name: PROPOSAL_LABELS[s], value: counts[s] || 0, color: PROPOSAL_COLORS[s] }))
      .filter(d => d.value > 0);
  }, [proposals]);

  // Proposals pending (sent + viewed)
  const proposalsPending = proposalStats.sentCount + proposalStats.viewedCount;

  // === Comparisons & sparkline series (additive — used by <KPICard />) ===
  const pctChange = (curr: number, prev: number): number => {
    if (prev === 0) return curr === 0 ? 0 : 100;
    return ((curr - prev) / Math.abs(prev)) * 100;
  };

  // Sparklines for current-year financials (12 months)
  const incomeSeries = useMemo(() => monthlyData.map(m => m.income), [monthlyData]);
  const expenseSeries = useMemo(() => monthlyData.map(m => m.expenses), [monthlyData]);
  const balanceSeries = useMemo(
    () => monthlyData.map(m => m.income - m.expenses),
    [monthlyData],
  );

  // Year balance vs previous year (delta)
  const balanceDeltaPct = useMemo(() => {
    const prevYear = currentYear - 1;
    const prevTx = transactions.filter(t => parseInt(t.date.split('-')[0]) === prevYear);
    const prevIncome = prevTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const prevExpenses = prevTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return pctChange(yearBalance, prevIncome - prevExpenses);
  }, [transactions, currentYear, yearBalance]);

  // Selected month vs previous month deltas
  const prevMonthIdx = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const incomeDeltaPct = useMemo(
    () => pctChange(selectedMonthIncome, monthlyData[prevMonthIdx]?.income ?? 0),
    [selectedMonthIncome, monthlyData, prevMonthIdx],
  );
  const expensesDeltaPct = useMemo(
    () => pctChange(selectedMonthExpenses, monthlyData[prevMonthIdx]?.expenses ?? 0),
    [selectedMonthExpenses, monthlyData, prevMonthIdx],
  );
  // Invoiced this month vs invoiced previous month
  const facturadoDeltaPct = useMemo(() => {
    const prevMonthKey = (() => {
      const y = prevMonthIdx === 11 ? currentYear - 1 : currentYear;
      const m = String(prevMonthIdx + 1).padStart(2, '0');
      return `${y}-${m}`;
    })();
    const prev = invoices
      .filter(i => i.issueDate.startsWith(prevMonthKey) && i.status !== 'draft' && i.status !== 'cancelled')
      .reduce((s, i) => s + i.total, 0);
    return pctChange(billingTotals.totalFacturado, prev);
  }, [invoices, billingTotals.totalFacturado, prevMonthIdx, currentYear]);

  // Generic "last N months" series builder.
  const lastNMonthsSeries = <T,>(
    items: T[],
    n: number,
    getDate: (t: T) => string | null | undefined,
    getValue: (t: T) => number,
  ): number[] => {
    const now = new Date();
    const buckets: number[] = Array(n).fill(0);
    const startYear = now.getFullYear();
    const startMonth = now.getMonth();
    for (const it of items) {
      const ds = getDate(it);
      if (!ds) continue;
      const parts = ds.split('-');
      if (parts.length < 2) continue;
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      if (!y || !m) continue;
      const monthsDiff = (startYear - y) * 12 + (startMonth - (m - 1));
      if (monthsDiff < 0 || monthsDiff >= n) continue;
      buckets[n - 1 - monthsDiff] += getValue(it);
    }
    return buckets;
  };

  // Series for non-financial KPIs (last 6 months: new pipeline value, new projects, new proposals)
  const pipelineSeries = useMemo(
    () => lastNMonthsSeries(deals, 6, d => d.createdAt, d => d.amount || 0),
    [deals],
  );
  const projectsSeries = useMemo(
    () => lastNMonthsSeries(projects, 6, p => p.createdAt, () => 1),
    [projects],
  );
  const proposalsSeries = useMemo(
    () => lastNMonthsSeries(proposals, 6, p => p.createdAt, () => 1),
    [proposals],
  );

  // Active projects: compute the count 30 days ago (approximation: # of projects created
  // before today-30 days that aren't completed/cancelled).
  const activeProjectsDeltaPct = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const prevCount = projects.filter(p =>
      p.createdAt && p.createdAt.slice(0, 10) <= cutoffStr &&
      p.status !== 'completed' && p.status !== 'cancelled'
    ).length;
    return pctChange(activeProjects, prevCount);
  }, [projects, activeProjects]);

  // Proposals pending delta: count of sent/viewed created last 30d vs previous 30d
  const proposalsPendingDeltaPct = useMemo(() => {
    const today = new Date();
    const d30 = new Date(today); d30.setDate(d30.getDate() - 30);
    const d60 = new Date(today); d60.setDate(d60.getDate() - 60);
    const s30 = d30.toISOString().slice(0, 10);
    const s60 = d60.toISOString().slice(0, 10);
    const isPending = (p: typeof proposals[number]) => p.status === 'sent' || p.status === 'viewed';
    const last30 = proposals.filter(p => isPending(p) && (p.createdAt?.slice(0, 10) ?? '') >= s30).length;
    const prev30 = proposals.filter(p => isPending(p) && (p.createdAt?.slice(0, 10) ?? '') >= s60 && (p.createdAt?.slice(0, 10) ?? '') < s30).length;
    return pctChange(last30, prev30);
  }, [proposals]);


  // Chart tooltip style
  const tooltipStyle = {
    backgroundColor: isDark ? '#363233' : '#fff',
    border: `1px solid ${isDark ? '#443f40' : '#E5E7EB'}`,
    borderRadius: '8px',
    color: isDark ? '#fff' : '#1f2937',
    fontSize: '13px',
  };

  const gridStroke = isDark ? '#443f40' : '#E5E7EB';
  const axisColor = '#6B7280';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const today = new Date();
  const todayStr = today.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 text-accent-600 dark:text-accent-400" />
          Tablero de Control
        </h1>
        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 capitalize">
          {organization?.name ? `${organization.name} · ` : ''}{todayStr}
        </p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
        <KPICard
          to="/finance"
          tone="green"
          icon={<DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          label={`Balance ${currentYear}`}
          value={formatCurrency(yearBalance)}
          valueClassName={yearBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
          series={balanceSeries}
          delta={{ pct: balanceDeltaPct, label: 'vs año anterior' }}
        />
        <KPICard
          to="/finance/cash-flow"
          tone="blue"
          icon={<TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          label="Ingresos mes"
          value={formatCurrency(selectedMonthIncome)}
          series={incomeSeries}
          delta={{ pct: incomeDeltaPct, label: 'vs mes pasado' }}
        />
        <KPICard
          to="/crm/pipeline"
          tone="pink"
          icon={<Handshake className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          label="Pipeline CRM"
          value={formatCurrency(crmStats.pipelineValue)}
          series={pipelineSeries}
          hint="ult. 6 meses"
        />
        <KPICard
          to="/projects/list"
          tone="yellow"
          icon={<FolderKanban className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          label="Proyectos activos"
          value={String(activeProjects)}
          series={projectsSeries}
          delta={{ pct: activeProjectsDeltaPct, label: 'vs 30d atras' }}
        />
        <KPICard
          to="/okrs"
          tone="purple"
          icon={<Target className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          label="Progreso OKRs"
          value={`${avgOKRProgress}%`}
          hint={`${objectives.length} OKR${objectives.length === 1 ? '' : 's'} activos`}
        />
        <KPICard
          to="/proposals"
          tone="indigo"
          icon={<FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          label="Propuestas pend."
          value={String(proposalsPending)}
          series={proposalsSeries}
          delta={{ pct: proposalsPendingDeltaPct, label: 'vs 30d atras' }}
        />
      </div>

      {/* Month Selector + Billing KPIs */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setSelectedMonth(m => m === 0 ? 11 : m - 1)}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-gray-900 dark:text-white min-w-[120px] text-center">
            {MONTH_NAMES[selectedMonth]} {currentYear}
          </span>
          <button
            onClick={() => setSelectedMonth(m => m === 11 ? 0 : m + 1)}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {selectedMonth !== new Date().getMonth() && (
            <button
              onClick={() => setSelectedMonth(new Date().getMonth())}
              className="text-[10px] sm:text-xs text-primary-600 dark:text-primary-400 hover:underline ml-1"
            >
              Hoy
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <KPICard
            to="/finance/invoices"
            tone="indigo"
            icon={<FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            label="Facturado"
            value={formatCurrency(billingTotals.totalFacturado)}
            delta={{ pct: facturadoDeltaPct, label: 'vs mes pasado' }}
          />
          <KPICard
            to="/finance/cash-flow"
            tone="green"
            icon={<TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            label="Cobrado"
            value={formatCurrency(selectedMonthIncome)}
            valueClassName="text-green-600 dark:text-green-400"
            series={incomeSeries}
            delta={{ pct: incomeDeltaPct, label: 'vs mes pasado' }}
          />
          <KPICard
            to="/finance/cash-flow"
            tone="yellow"
            icon={<Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            label="Por cobrar"
            value={formatCurrency(billingTotals.porCobrar)}
            valueClassName={billingTotals.porCobrar > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}
          />
          <KPICard
            to="/finance/cash-flow"
            tone="red"
            icon={<TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            label="Gastos"
            value={formatCurrency(selectedMonthExpenses)}
            valueClassName="text-red-600 dark:text-red-400"
            series={expenseSeries}
            delta={{ pct: expensesDeltaPct, label: 'vs mes pasado', invert: true }}
            hint={recurringTotal > 0 ? `Fijos: ${formatCurrency(recurringTotal)}` : undefined}
          />
        </div>
      </div>

      {/* Financial Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Cash Flow Chart */}
        <div className="lg:col-span-2 card p-3 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Flujo de caja {currentYear}</h2>
            <Link to="/finance/cash-flow" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              Ver detalle <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {monthlyData.some(m => m.income > 0 || m.expenses > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData} margin={{ left: -10, right: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 10 }} />
                <YAxis tick={{ fill: axisColor, fontSize: 10 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} width={45} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                <Area type="monotone" dataKey="income" name="Ingresos" stroke={CHART_COLORS.income} fill={CHART_COLORS.income} fillOpacity={0.15} strokeWidth={2} />
                <Area type="monotone" dataKey="expenses" name="Gastos" stroke={CHART_COLORS.expense} fill={CHART_COLORS.expense} fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-gray-400 dark:text-gray-500">
              <p>Sin datos financieros para {currentYear}</p>
            </div>
          )}
        </div>

        {/* Invoices + Top Clients */}
        <div className="card p-3 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Facturación</h2>
            <Link to="/finance/invoices" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              Ver <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Invoice donut */}
          {invoiceStatusData.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={invoiceStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {invoiceStatusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center">
                {invoiceStatusData.map((d, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-[10px] text-gray-600 dark:text-gray-400">{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[100px] text-gray-400 dark:text-gray-500 text-sm">
              Sin facturas
            </div>
          )}

          {/* Alerts */}
          <div className="mt-3 space-y-1.5">
            {financeSummary.overdueInvoices > 0 && (
              <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 px-2.5 py-1.5 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{financeSummary.overdueInvoices} vencida{financeSummary.overdueInvoices > 1 ? 's' : ''} ({formatCurrency(financeSummary.overdueAmount)})</span>
              </div>
            )}
            {financeSummary.pendingInvoices > 0 && (
              <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/10 px-2.5 py-1.5 rounded-lg">
                <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{financeSummary.pendingInvoices} pendiente{financeSummary.pendingInvoices > 1 ? 's' : ''} ({formatCurrency(financeSummary.pendingAmount)})</span>
              </div>
            )}
          </div>

          {/* Top Clients */}
          {topClients.length > 0 && (
            <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Top clientes</h3>
              <div className="space-y-1.5">
                {topClients.map((c, i) => (
                  <div key={c.clientId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-bold text-gray-400 w-3">{i + 1}</span>
                      <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{c.clientName}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-900 dark:text-white flex-shrink-0 ml-2">{formatCurrency(c.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CRM Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Pipeline Chart */}
        <div className="lg:col-span-2 card p-3 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pipeline Comercial</h2>
            <Link to="/crm/pipeline" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              Ver pipeline <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {pipelineData.length > 0 && pipelineData.some(p => p.count > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={pipelineData} layout="vertical" margin={{ left: -10, right: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis type="number" tick={{ fill: axisColor, fontSize: 10 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="stage" tick={{ fill: axisColor, fontSize: 10 }} width={80} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" name="Valor" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-gray-400 dark:text-gray-500">
              <p>Sin deals en pipeline</p>
            </div>
          )}
        </div>

        {/* CRM KPIs */}
        <div className="card p-3 sm:p-5">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Metricas CRM</h2>
            <Link to="/crm/control" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              Ver <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            <KPIRow icon={<Users className="w-4 h-4 text-blue-500" />} label="Total leads" value={String(crmStats.totalLeads)} />
            <KPIRow icon={<TrendingUp className="w-4 h-4 text-green-500" />} label="Tasa conversion" value={`${crmStats.conversionRate.toFixed(1)}%`} />
            <KPIRow icon={<CheckCircle2 className="w-4 h-4 text-green-500" />} label="Deals ganados" value={`${crmStats.wonDeals} (${formatCurrency(crmStats.wonValue)})`} />
            <KPIRow icon={<TrendingDown className="w-4 h-4 text-red-500" />} label="Deals perdidos" value={String(crmStats.lostDeals)} />
            <KPIRow icon={<DollarSign className="w-4 h-4 text-purple-500" />} label="Pipeline ponderado" value={formatCurrency(crmStats.weightedPipelineValue)} />
            <KPIRow icon={<Target className="w-4 h-4 text-yellow-500" />} label="Ticket promedio" value={formatCurrency(crmStats.avgDealSize)} />
            {crmStats.overdueActivities > 0 && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 px-3 py-2 rounded-lg">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{crmStats.overdueActivities} actividad{crmStats.overdueActivities > 1 ? 'es' : ''} vencida{crmStats.overdueActivities > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Projects & OKRs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Projects */}
        <div className="card p-3 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Proyectos</h2>
            <Link to="/projects/list" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {projectStatusData.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={projectStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {projectStatusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {projectStatusData.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
              <div className="w-full grid grid-cols-2 gap-3 mt-4">
                <div className="bg-gray-50 dark:bg-[#272324] rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{projects.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total proyectos</p>
                </div>
                <div className="bg-gray-50 dark:bg-[#272324] rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{activeProjects}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">En progreso</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-400 dark:text-gray-500">
              <p>Sin proyectos</p>
            </div>
          )}
        </div>

        {/* OKR Progress */}
        <div className="card p-3 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Progreso OKRs</h2>
            <Link to="/okrs" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              Ver OKRs <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {okrProgressData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={okrProgressData} layout="vertical" margin={{ left: -10, right: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: axisColor, fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: axisColor, fontSize: 9 }} width={100} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => `${value}%`} />
                  <Bar dataKey="progress" name="Progreso" radius={[0, 4, 4, 0]}>
                    {okrProgressData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-3 sm:mt-4">
                <div className="bg-gray-50 dark:bg-[#272324] rounded-lg p-2 sm:p-3 text-center">
                  <p className="text-base sm:text-lg font-bold text-gray-500">{initiativeStats.todo}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Pendientes</p>
                </div>
                <div className="bg-gray-50 dark:bg-[#272324] rounded-lg p-2 sm:p-3 text-center">
                  <p className="text-base sm:text-lg font-bold text-blue-600">{initiativeStats.inProgress}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">En curso</p>
                </div>
                <div className="bg-gray-50 dark:bg-[#272324] rounded-lg p-2 sm:p-3 text-center">
                  <p className="text-base sm:text-lg font-bold text-green-600">{initiativeStats.done}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Completadas</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-400 dark:text-gray-500">
              <p>Sin objetivos definidos</p>
            </div>
          )}
        </div>
      </div>

      {/* Tasks & Proposals Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Tasks */}
        <div className="card p-3 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-primary-500" />
              Gestion de Tareas
            </h2>
            <Link to="/tareas" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              Ver tablero <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {taskStats.total > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="bg-gray-50 dark:bg-[#272324] rounded-lg p-2 sm:p-3 text-center">
                  <p className="text-xl sm:text-2xl font-bold text-gray-500">{taskStats.todo}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Pendientes</p>
                </div>
                <div className="bg-gray-50 dark:bg-[#272324] rounded-lg p-2 sm:p-3 text-center">
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">{taskStats.inProgress}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">En curso</p>
                </div>
                <div className="bg-gray-50 dark:bg-[#272324] rounded-lg p-2 sm:p-3 text-center">
                  <p className="text-xl sm:text-2xl font-bold text-green-600">{taskStats.done}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Completadas</p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Completadas</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{taskStats.completionRate}%</span>
                </div>
                <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${taskStats.completionRate}%` }}
                  />
                </div>
              </div>
              {taskStats.overdue > 0 && (
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 px-3 py-2 rounded-lg">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{taskStats.overdue} tarea{taskStats.overdue > 1 ? 's' : ''} vencida{taskStats.overdue > 1 ? 's' : ''}</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-[120px] text-gray-400 dark:text-gray-500">
              <p>Sin tareas</p>
            </div>
          )}
        </div>

        {/* Proposals */}
        <div className="card p-3 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              Propuestas
            </h2>
            <Link to="/proposals" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {proposalStats.totalProposals > 0 ? (
            <>
              {/* Status bar */}
              {proposalStatusData.length > 0 && (
                <div className="mb-4">
                  <div className="flex rounded-full overflow-hidden h-4">
                    {proposalStatusData.map((d, i) => (
                      <div
                        key={i}
                        className="h-full transition-all"
                        style={{
                          backgroundColor: d.color,
                          width: `${(d.value / proposalStats.totalProposals) * 100}%`,
                        }}
                        title={`${d.name}: ${d.value}`}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {proposalStatusData.map((d, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{d.name} ({d.value})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="bg-gray-50 dark:bg-[#272324] rounded-lg p-2 sm:p-3 text-center">
                  <p className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white truncate">{formatCurrency(proposalStats.totalValue)}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Valor total</p>
                </div>
                <div className="bg-gray-50 dark:bg-[#272324] rounded-lg p-2 sm:p-3 text-center">
                  <p className="text-sm sm:text-lg font-bold text-green-600 truncate">{formatCurrency(proposalStats.acceptedValue)}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Valor aceptado</p>
                </div>
                <div className="bg-gray-50 dark:bg-[#272324] rounded-lg p-2 sm:p-3 text-center">
                  <p className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white">{proposalStats.totalProposals}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Total propuestas</p>
                </div>
                <div className="bg-gray-50 dark:bg-[#272324] rounded-lg p-2 sm:p-3 text-center">
                  <p className="text-sm sm:text-lg font-bold text-green-600">{proposalStats.conversionRate.toFixed(1)}%</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Tasa cierre</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[120px] text-gray-400 dark:text-gray-500">
              <p>Sin propuestas</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Small reusable row for CRM KPIs
function KPIRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <span className="text-sm font-semibold text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}
