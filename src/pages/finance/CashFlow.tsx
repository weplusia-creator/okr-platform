import { useState, useMemo, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Filter,
  Edit2,
  Trash2,
  Tag,
  X,
  Loader2,
  CalendarDays,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useProjects } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import type { TransactionType, CashFlowTransaction } from '../../types/finance';
import type { ProjectPayment } from '../../types/projects';

type Period = 'week' | 'month' | 'year' | 'all' | string; // string for specific year like '2025'

export function CashFlow() {
  const {
    transactions,
    categories,
    loadingCashFlow,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCategory,
    deleteCategory,
  } = useFinance();
  const { isAdmin } = useAuth();
  const { fetchAllPayments, projects } = useProjects();
  const navigate = useNavigate();

  const [allPayments, setAllPayments] = useState<(ProjectPayment & { projectName: string })[]>([]);
  const [projectionView, setProjectionView] = useState<'bars' | 'chart'>('chart');
  const [period, setPeriod] = useState<Period>('month');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<CashFlowTransaction | null>(null);
  const [loading, setLoading] = useState(false);

  const [transactionForm, setTransactionForm] = useState({
    type: 'income' as TransactionType,
    categoryId: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    type: 'expense' as TransactionType,
    color: '#6366F1',
  });

  // Available years from transactions
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    transactions.forEach(t => {
      const y = new Date(t.date).getFullYear();
      if (y) years.add(y);
    });
    return [...years].sort((a, b) => b - a);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const now = new Date();

    return transactions.filter(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;

      if (period === 'all') return true;

      // Specific year filter (e.g. '2025')
      if (/^\d{4}$/.test(period)) {
        return new Date(t.date).getFullYear() === Number(period);
      }

      let startDate: Date;
      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          break;
        case 'year':
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          break;
        default:
          startDate = new Date(0);
      }

      return new Date(t.date) >= startDate;
    });
  }, [transactions, period, typeFilter]);

  const summary = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [filteredTransactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const openNewTransaction = (type: TransactionType) => {
    setEditingTransaction(null);
    const defaultCategory = categories.find(c => c.type === type);
    setTransactionForm({
      type,
      categoryId: defaultCategory?.id || '',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
    setShowTransactionModal(true);
  };

  const openEditTransaction = (transaction: CashFlowTransaction) => {
    setEditingTransaction(transaction);
    setTransactionForm({
      type: transaction.type,
      categoryId: transaction.categoryId,
      amount: transaction.amount.toString(),
      description: transaction.description,
      date: transaction.date,
    });
    setShowTransactionModal(true);
  };

  const handleSaveTransaction = async (e: FormEvent) => {
    e.preventDefault();
    if (!transactionForm.categoryId || !transactionForm.amount || !transactionForm.description) {
      return;
    }

    setLoading(true);
    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, {
          type: transactionForm.type,
          categoryId: transactionForm.categoryId,
          amount: parseFloat(transactionForm.amount),
          description: transactionForm.description,
          date: transactionForm.date,
        });
      } else {
        await addTransaction({
          type: transactionForm.type,
          categoryId: transactionForm.categoryId,
          amount: parseFloat(transactionForm.amount),
          description: transactionForm.description,
          date: transactionForm.date,
          invoiceId: null,
        });
      }
      setShowTransactionModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name) return;

    setLoading(true);
    try {
      await addCategory({
        name: categoryForm.name,
        type: categoryForm.type,
        color: categoryForm.color,
      });
      setShowCategoryModal(false);
      setCategoryForm({ name: '', type: 'expense', color: '#6366F1' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta transacción?')) {
      await deleteTransaction(id);
    }
  };

  useEffect(() => {
    fetchAllPayments().then(setAllPayments);
  }, [fetchAllPayments]);

  // Gantt timeline data: group payments by month, then by project
  const ganttData = useMemo(() => {
    if (allPayments.length === 0) return { months: [], projects: [], grid: {} as Record<string, Record<string, ProjectPayment & { projectName: string }>> };

    const monthsSet = new Set<string>();
    const projectsMap = new Map<string, string>();
    allPayments.forEach(p => {
      monthsSet.add(p.month);
      if (!projectsMap.has(p.projectId)) projectsMap.set(p.projectId, p.projectName);
    });

    const months = [...monthsSet].sort();
    const projects = [...projectsMap.entries()].map(([id, name]) => ({ id, name }));

    const grid: Record<string, Record<string, ProjectPayment & { projectName: string }>> = {};
    allPayments.forEach(p => {
      if (!grid[p.projectId]) grid[p.projectId] = {};
      grid[p.projectId][p.month] = p;
    });

    return { months, projects, grid };
  }, [allPayments]);

  // Gantt month totals
  const ganttMonthTotals = useMemo(() => {
    const totals: Record<string, { total: number; paid: number; pending: number }> = {};
    allPayments.forEach(p => {
      if (!totals[p.month]) totals[p.month] = { total: 0, paid: 0, pending: 0 };
      totals[p.month].total += p.amount;
      if (p.status === 'paid') totals[p.month].paid += p.amount;
      else totals[p.month].pending += p.amount;
    });
    return totals;
  }, [allPayments]);

  // Map project name → id for linking
  const projectNameToId = useMemo(() => {
    const map: Record<string, string> = {};
    allPayments.forEach(p => { if (!map[p.projectName]) map[p.projectName] = p.projectId; });
    return map;
  }, [allPayments]);

  // Projection: future pending payments grouped by month
  const projection = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const futurePayments = allPayments.filter(p => p.month >= currentMonth && p.status === 'pending');
    if (futurePayments.length === 0) return { months: [] as string[], byMonth: {} as Record<string, { total: number; projects: { name: string; projectId: string; amount: number }[] }>, grandTotal: 0 };

    const byMonth: Record<string, { total: number; projects: { name: string; projectId: string; amount: number }[] }> = {};
    let grandTotal = 0;
    futurePayments.forEach(p => {
      if (!byMonth[p.month]) byMonth[p.month] = { total: 0, projects: [] };
      byMonth[p.month].total += p.amount;
      byMonth[p.month].projects.push({ name: p.projectName, projectId: p.projectId, amount: p.amount });
      grandTotal += p.amount;
    });

    const months = Object.keys(byMonth).sort();
    return { months, byMonth, grandTotal };
  }, [allPayments]);

  // Cumulative projection for the bar chart
  const projectionCumulative = useMemo(() => {
    let cumulative = 0;
    return projection.months.map(m => {
      cumulative += projection.byMonth[m].total;
      return { month: m, monthly: projection.byMonth[m].total, cumulative };
    });
  }, [projection]);

  // Assign a color to each project for the chart
  const PROJECT_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#14B8A6', '#6366F1', '#F97316', '#06B6D4'];
  const projectionProjectColors = useMemo(() => {
    const projectNames = new Set<string>();
    allPayments.forEach(p => { if (p.status === 'pending') projectNames.add(p.projectName); });
    const map: Record<string, string> = {};
    let i = 0;
    projectNames.forEach(name => {
      map[name] = PROJECT_COLORS[i % PROJECT_COLORS.length];
      i++;
    });
    return map;
  }, [allPayments]);

  // Chart max for scaling
  const chartMax = useMemo(() => {
    if (projection.months.length === 0) return 1;
    return Math.max(...projection.months.map(m => projection.byMonth[m].total), 1);
  }, [projection]);

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  if (loadingCashFlow) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Flujo de caja
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Registra tus ingresos y egresos
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="btn-secondary"
          >
            <Tag className="w-5 h-5" />
            Categorías
          </button>
          <button
            onClick={() => openNewTransaction('expense')}
            className="btn-secondary"
          >
            <TrendingDown className="w-5 h-5" />
            Egreso
          </button>
          <button
            onClick={() => openNewTransaction('income')}
            className="btn-primary"
          >
            <TrendingUp className="w-5 h-5" />
            Ingreso
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success-100 dark:bg-success-900/30">
              <TrendingUp className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ingresos</p>
              <p className="text-xl font-bold text-success-600">
                {formatCurrency(summary.income)}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-danger-100 dark:bg-danger-900/30">
              <TrendingDown className="w-5 h-5 text-danger-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Egresos</p>
              <p className="text-xl font-bold text-danger-600">
                {formatCurrency(summary.expenses)}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${summary.balance >= 0 ? 'bg-success-100 dark:bg-success-900/30' : 'bg-danger-100 dark:bg-danger-900/30'}`}>
              <DollarSign className={`w-5 h-5 ${summary.balance >= 0 ? 'text-success-600' : 'text-danger-600'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Balance</p>
              <p className={`text-xl font-bold ${summary.balance >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                {formatCurrency(summary.balance)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Income vs Expenses Chart */}
      {(() => {
        const currentYear = new Date().getFullYear();
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const monthlyIncome = new Array(12).fill(0);
        const monthlyExpense = new Array(12).fill(0);

        transactions.forEach(t => {
          const d = new Date(t.date);
          if (d.getFullYear() !== currentYear) return;
          const m = d.getMonth();
          if (t.type === 'income') monthlyIncome[m] += t.amount;
          else monthlyExpense[m] += t.amount;
        });

        // Add pending project payments as projected
        const monthlyProjected = new Array(12).fill(0);
        allPayments.forEach(p => {
          if (p.status !== 'pending') return;
          const [yyyy, mm] = p.month.split('-');
          if (Number(yyyy) !== currentYear) return;
          monthlyProjected[Number(mm) - 1] += p.amount;
        });

        const maxVal = Math.max(...months.map((_, i) => Math.max(monthlyIncome[i] + monthlyProjected[i], monthlyExpense[i])), 1);

        return (
          <div className="card p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              Flujo de caja {currentYear}
            </h3>
            <div className="h-64">
              <div className="flex items-end justify-between h-full gap-2">
                {months.map((month, i) => (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex gap-0.5 h-48 items-end">
                      <div className="flex-1 flex flex-col items-end justify-end h-full">
                        {monthlyProjected[i] > 0 && (
                          <div
                            className="w-full bg-purple-400 dark:bg-purple-500 rounded-t transition-all opacity-60"
                            style={{ height: `${(monthlyProjected[i] / maxVal) * 100}%` }}
                            title={`Proyectado: ${formatCurrency(monthlyProjected[i])}`}
                          />
                        )}
                        <div
                          className="w-full bg-success-500 rounded-t transition-all"
                          style={{ height: `${(monthlyIncome[i] / maxVal) * 100}%`, minHeight: monthlyIncome[i] > 0 ? '2px' : '0' }}
                          title={`Ingresos: ${formatCurrency(monthlyIncome[i])}`}
                        />
                      </div>
                      <div
                        className="flex-1 bg-danger-500 rounded-t transition-all"
                        style={{ height: `${(monthlyExpense[i] / maxVal) * 100}%`, minHeight: monthlyExpense[i] > 0 ? '2px' : '0' }}
                        title={`Egresos: ${formatCurrency(monthlyExpense[i])}`}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{month}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-success-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Ingresos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-danger-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Egresos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-purple-400 opacity-60" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Cuotas proyectadas</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Flujo de Fondos - Cash Flow Forecast */}
      {(() => {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Collect last 3 months + next 12 months
        const forecastMonths: string[] = [];
        for (let offset = -3; offset <= 12; offset++) {
          const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
          forecastMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }

        // Income from transactions by month
        const txIncomeByMonth: Record<string, number> = {};
        const txExpenseByMonth: Record<string, number> = {};
        transactions.forEach(t => {
          const m = t.date.slice(0, 7);
          if (t.type === 'income') txIncomeByMonth[m] = (txIncomeByMonth[m] || 0) + t.amount;
          else txExpenseByMonth[m] = (txExpenseByMonth[m] || 0) + t.amount;
        });

        // Pending cuotas by month (future expected income)
        const cuotasByMonth: Record<string, number> = {};
        const cuotasPaidByMonth: Record<string, number> = {};
        allPayments.forEach(p => {
          if (p.status === 'pending') cuotasByMonth[p.month] = (cuotasByMonth[p.month] || 0) + p.amount;
          else cuotasPaidByMonth[p.month] = (cuotasPaidByMonth[p.month] || 0) + p.amount;
        });

        // Average monthly expense (from last 6 months of data) for future projection
        const last6 = forecastMonths.filter(m => m < currentMonth).slice(-6);
        const avgExpense = last6.length > 0
          ? last6.reduce((s, m) => s + (txExpenseByMonth[m] || 0), 0) / last6.length
          : 0;

        // Build rows
        type FundRow = { month: string; label: string; incomeReal: number; cuotasPaid: number; cuotasPending: number; expenseReal: number; expenseProjected: number; net: number; cumulative: number; isPast: boolean };
        const rows: FundRow[] = [];
        let cumulative = 0;

        // Calculate initial cumulative from all transactions before forecast window
        transactions.forEach(t => {
          const m = t.date.slice(0, 7);
          if (m < forecastMonths[0]) {
            cumulative += t.type === 'income' ? t.amount : -t.amount;
          }
        });

        forecastMonths.forEach(m => {
          const isPast = m < currentMonth;
          const isCurrent = m === currentMonth;
          const incomeReal = txIncomeByMonth[m] || 0;
          const cpaid = cuotasPaidByMonth[m] || 0;
          const cpending = cuotasByMonth[m] || 0;
          const expenseReal = txExpenseByMonth[m] || 0;
          const expenseProjected = (!isPast && !isCurrent && avgExpense > 0) ? avgExpense : 0;

          const totalIncome = isPast || isCurrent ? incomeReal : cpending;
          const totalExpense = isPast || isCurrent ? expenseReal : expenseProjected;
          const net = totalIncome - totalExpense;
          cumulative += net;

          rows.push({ month: m, label: '', incomeReal, cuotasPaid: cpaid, cuotasPending: cpending, expenseReal, expenseProjected, net, cumulative, isPast });
        });

        // Labels
        rows.forEach(r => {
          const [yyyy, mm] = r.month.split('-');
          r.label = new Date(Number(yyyy), Number(mm) - 1, 1).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
        });

        const maxBar = Math.max(...rows.map(r => Math.max(r.incomeReal, r.cuotasPending, r.expenseReal, r.expenseProjected)), 1);

        return (
          <div className="card p-5">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              Flujo de fondos
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Histórico + proyección de ingresos, egresos y saldo acumulado
            </p>

            {/* Bars: monthly income vs expense */}
            <div className="h-48 flex items-end gap-1 mb-1 border-b border-gray-200 dark:border-gray-700">
              {rows.map((r) => {
                const incomeVal = r.isPast ? r.incomeReal : r.cuotasPending;
                const expenseVal = r.isPast ? r.expenseReal : r.expenseProjected;
                const incomeH = maxBar > 0 ? (incomeVal / maxBar) * 100 : 0;
                const expenseH = maxBar > 0 ? (expenseVal / maxBar) * 100 : 0;
                return (
                  <div key={r.month} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
                    <div className="w-full flex gap-px items-end h-full">
                      <div
                        className={`flex-1 rounded-t transition-all ${r.isPast ? 'bg-success-500' : 'bg-success-400 opacity-70'}`}
                        style={{ height: `${Math.max(incomeH, incomeVal > 0 ? 3 : 0)}%` }}
                        title={`${r.label} — ${r.isPast ? 'Cobrado' : 'Por cobrar'}: ${formatCurrency(incomeVal)}`}
                      />
                      <div
                        className={`flex-1 rounded-t transition-all ${r.isPast ? 'bg-danger-500' : 'bg-danger-400 opacity-70'}`}
                        style={{ height: `${Math.max(expenseH, expenseVal > 0 ? 3 : 0)}%` }}
                        title={`${r.label} — ${r.isPast ? 'Gastado' : 'Gasto proy.'}: ${formatCurrency(expenseVal)}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Month labels */}
            <div className="flex gap-1 mb-4 pt-1">
              {rows.map(r => {
                const isCurrent = r.month === currentMonth;
                return (
                  <div key={r.month} className={`flex-1 text-center text-[10px] capitalize ${isCurrent ? 'font-bold text-blue-600 dark:text-blue-400' : r.isPast ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    {r.label}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-5 mb-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-success-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Ingresos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-danger-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Egresos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-success-400 opacity-70" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Por cobrar</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-danger-400 opacity-70" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Gasto proy.</span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-2 pr-3 font-medium sticky left-0 bg-white dark:bg-gray-900 min-w-[100px]">Mes</th>
                    {rows.map(r => {
                      const isCurrent = r.month === currentMonth;
                      return (
                        <th key={r.month} className={`pb-2 px-2 font-medium text-right min-w-[90px] capitalize ${isCurrent ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}>
                          {r.label}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-1.5 pr-3 font-medium text-success-600 sticky left-0 bg-white dark:bg-gray-900">Ingresos</td>
                    {rows.map(r => (
                      <td key={r.month} className="py-1.5 px-2 text-right text-success-600">
                        {r.incomeReal > 0 ? formatCurrency(r.incomeReal) : '—'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-3 font-medium text-purple-600 sticky left-0 bg-white dark:bg-gray-900">Por cobrar</td>
                    {rows.map(r => (
                      <td key={r.month} className="py-1.5 px-2 text-right text-purple-600">
                        {r.cuotasPending > 0 ? formatCurrency(r.cuotasPending) : '—'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-3 font-medium text-danger-600 sticky left-0 bg-white dark:bg-gray-900">Egresos</td>
                    {rows.map(r => (
                      <td key={r.month} className="py-1.5 px-2 text-right text-danger-600">
                        {(r.expenseReal > 0 || r.expenseProjected > 0)
                          ? <span className={r.expenseProjected > 0 ? 'opacity-60' : ''}>{formatCurrency(r.expenseReal || r.expenseProjected)}</span>
                          : '—'}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-t border-gray-200 dark:border-gray-700">
                    <td className="py-1.5 pr-3 font-semibold text-gray-700 dark:text-gray-300 sticky left-0 bg-white dark:bg-gray-900">Neto</td>
                    {rows.map(r => (
                      <td key={r.month} className={`py-1.5 px-2 text-right font-semibold ${r.net >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                        {formatCurrency(r.net)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-t-2 border-gray-300 dark:border-gray-600">
                    <td className="py-1.5 pr-3 font-bold text-blue-600 sticky left-0 bg-white dark:bg-gray-900">Acumulado</td>
                    {rows.map(r => (
                      <td key={r.month} className={`py-1.5 px-2 text-right font-bold ${r.cumulative >= 0 ? 'text-blue-600' : 'text-danger-600'}`}>
                        {formatCurrency(r.cumulative)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Projection - Future Income */}
      {projection.months.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Proyeccion de cobranzas
            </h3>
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-1.5">
                <span className="text-xs text-gray-500 dark:text-gray-400">Total pendiente: </span>
                <span className="text-sm font-bold text-blue-700 dark:text-blue-400">{formatCurrency(projection.grandTotal)}</span>
              </div>
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                <button
                  onClick={() => setProjectionView('chart')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${projectionView === 'chart' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  Grafico
                </button>
                <button
                  onClick={() => setProjectionView('bars')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${projectionView === 'bars' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  Barras
                </button>
              </div>
            </div>
          </div>

          {projectionView === 'chart' ? (
            <>
              {/* Stacked vertical bar chart with Y axis */}
              {(() => {
                const yTicks = 5;
                const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((chartMax / yTicks) * i));
                return (
                  <div className="flex h-[32rem] mb-4">
                    {/* Y axis labels */}
                    <div className="flex flex-col-reverse justify-between pr-2 py-1 shrink-0">
                      {tickValues.map((val, i) => (
                        <span key={i} className="text-[10px] text-gray-400 dark:text-gray-500 leading-none">
                          {formatCurrency(val)}
                        </span>
                      ))}
                    </div>
                    {/* Chart area */}
                    <div className="flex-1 relative border-b border-l border-gray-200 dark:border-gray-700">
                      {/* Gridlines */}
                      {tickValues.slice(1).map((val, i) => (
                        <div
                          key={i}
                          className="absolute left-0 right-0 border-t border-dashed border-gray-200 dark:border-gray-700"
                          style={{ bottom: `${((i + 1) / yTicks) * 100}%` }}
                        />
                      ))}
                      {/* Bars */}
                      <div className="flex items-end gap-2 h-full pl-1 pb-1">
                        {projection.months.map(month => {
                          const [yyyy, mm] = month.split('-');
                          const label = new Date(Number(yyyy), Number(mm) - 1, 1).toLocaleDateString('es-AR', { month: 'short' });
                          const total = projection.byMonth[month].total;
                          const barHeight = chartMax > 0 ? (total / chartMax) * 100 : 0;

                          return (
                            <div key={month} className="flex-1 flex flex-col items-center gap-1 min-w-[40px] h-full justify-end">
                              <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">{formatCurrency(total)}</span>
                              <div className="w-full flex flex-col-reverse rounded-t-md overflow-hidden" style={{ height: `${Math.max(barHeight, 2)}%` }}>
                                {projection.byMonth[month].projects.map((proj, i) => {
                                  const segmentPct = total > 0 ? (proj.amount / total) * 100 : 0;
                                  return (
                                    <div
                                      key={i}
                                      className="w-full transition-all duration-500 relative group"
                                      style={{
                                        height: `${segmentPct}%`,
                                        backgroundColor: projectionProjectColors[proj.name] || '#6B7280',
                                        minHeight: '4px',
                                      }}
                                    >
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 whitespace-nowrap bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-lg">
                                        {proj.name}: {formatCurrency(proj.amount)}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 capitalize">{label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}


              {/* Legend */}
              <div className="flex flex-wrap gap-3">
                {Object.entries(projectionProjectColors).map(([name, color]) => (
                  <button key={name} onClick={() => projectNameToId[name] && navigate(`/projects/${projectNameToId[name]}`)} className="flex items-center gap-1.5 hover:opacity-70 transition-opacity">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                    <span className="text-xs text-gray-600 dark:text-gray-400 hover:text-primary-600">{name}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            /* Horizontal bars view */
            <div className="space-y-3">
              {projectionCumulative.map(({ month, monthly, cumulative }) => {
                const [yyyy, mm] = month.split('-');
                const label = new Date(Number(yyyy), Number(mm) - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
                const maxAmount = Math.max(...projectionCumulative.map(p => p.monthly));
                const barWidth = maxAmount > 0 ? (monthly / maxAmount) * 100 : 0;

                return (
                  <div key={month}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(monthly)}</span>
                        <span className="text-xs text-gray-400">acum. {formatCurrency(cumulative)}</span>
                      </div>
                    </div>
                    {/* Stacked horizontal bar */}
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-6 relative overflow-hidden flex">
                      {projection.byMonth[month].projects.map((proj, i) => {
                        const segmentWidth = maxAmount > 0 ? (proj.amount / maxAmount) * 100 : 0;
                        return (
                          <div
                            key={i}
                            className="h-full transition-all duration-500 relative group first:rounded-l-full last:rounded-r-full"
                            style={{
                              width: `${Math.max(segmentWidth, 1)}%`,
                              backgroundColor: projectionProjectColors[proj.name] || '#6B7280',
                            }}
                          >
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 whitespace-nowrap bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-lg">
                              {proj.name}: {formatCurrency(proj.amount)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 ml-1">
                      {projection.byMonth[month].projects.map((proj, i) => (
                        <button key={i} onClick={() => navigate(`/projects/${proj.projectId}`)} className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1 hover:text-primary-600 transition-colors">
                          <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: projectionProjectColors[proj.name] }} />
                          {proj.name}: <span className="font-medium">{formatCurrency(proj.amount)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Gantt - Project Payments Timeline */}
      {ganttData.months.length > 0 && (
        <div className="card p-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-purple-500" />
            Cobranzas por proyecto
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-2 pr-4 font-medium sticky left-0 bg-white dark:bg-gray-900 min-w-[160px]">Proyecto</th>
                  {ganttData.months.map(m => {
                    const [, mm] = m.split('-');
                    const label = new Date(Number(m.split('-')[0]), Number(mm) - 1, 1).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
                    return <th key={m} className="pb-2 px-2 font-medium text-center min-w-[80px]">{label}</th>;
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {ganttData.projects.map(proj => (
                  <tr key={proj.id} className="text-gray-700 dark:text-gray-300">
                    <td className="py-2 pr-4 font-medium sticky left-0 bg-white dark:bg-gray-900 truncate max-w-[160px]">
                      <button onClick={() => navigate(`/projects/${proj.id}`)} className="hover:text-primary-600 transition-colors text-left">
                        {proj.name}
                      </button>
                    </td>
                    {ganttData.months.map(m => {
                      const payment = ganttData.grid[proj.id]?.[m];
                      if (!payment) return <td key={m} className="py-2 px-2 text-center"><span className="text-gray-300 dark:text-gray-600">—</span></td>;
                      const isPaid = payment.status === 'paid';
                      return (
                        <td key={m} className="py-2 px-2 text-center">
                          <div className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${
                            isPaid
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}>
                            {formatCurrency(payment.amount)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="font-semibold text-gray-900 dark:text-white border-t-2 border-gray-300 dark:border-gray-600">
                  <td className="py-2 pr-4 sticky left-0 bg-white dark:bg-gray-900">Total</td>
                  {ganttData.months.map(m => {
                    const t = ganttMonthTotals[m];
                    return (
                      <td key={m} className="py-2 px-2 text-center">
                        <div className="text-xs">{formatCurrency(t?.total || 0)}</div>
                        {t && t.pending > 0 && (
                          <div className="text-[10px] text-yellow-600 dark:text-yellow-400">Pend: {formatCurrency(t.pending)}</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="input"
          >
            <option value="week">Última semana</option>
            <option value="month">Último mes</option>
            <option value="year">Último año</option>
            {availableYears.map(y => (
              <option key={y} value={String(y)}>Año {y}</option>
            ))}
            <option value="all">Todo</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TransactionType | 'all')}
            className="input"
          >
            <option value="all">Todos</option>
            <option value="income">Ingresos</option>
            <option value="expense">Egresos</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="card p-12 text-center">
          <DollarSign className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No hay transacciones
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Comienza registrando un ingreso o egreso
          </p>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => openNewTransaction('income')}
              className="btn-primary"
            >
              <TrendingUp className="w-5 h-5" />
              Agregar ingreso
            </button>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTransactions.map(transaction => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-2 rounded-lg ${
                      transaction.type === 'income'
                        ? 'bg-success-100 dark:bg-success-900/30'
                        : 'bg-danger-100 dark:bg-danger-900/30'
                    }`}
                  >
                    {transaction.type === 'income' ? (
                      <TrendingUp className="w-5 h-5 text-success-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-danger-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {transaction.description}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs"
                        style={{ backgroundColor: `${transaction.category?.color}20`, color: transaction.category?.color }}
                      >
                        {transaction.category?.name}
                      </span>
                      <span>{formatDate(transaction.date)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`text-lg font-semibold ${
                      transaction.type === 'income' ? 'text-success-600' : 'text-danger-600'
                    }`}
                  >
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditTransaction(transaction)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteTransaction(transaction.id)}
                        className="p-2 text-gray-400 hover:text-danger-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingTransaction ? 'Editar transacción' : transactionForm.type === 'income' ? 'Nuevo ingreso' : 'Nuevo egreso'}
              </h3>
              <button
                onClick={() => setShowTransactionModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-4">
              <div>
                <label className="label">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTransactionForm(prev => ({ ...prev, type: 'income', categoryId: incomeCategories[0]?.id || '' }))}
                    className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 ${
                      transactionForm.type === 'income'
                        ? 'border-success-500 bg-success-50 dark:bg-success-900/20 text-success-600'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <TrendingUp className="w-5 h-5" />
                    Ingreso
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionForm(prev => ({ ...prev, type: 'expense', categoryId: expenseCategories[0]?.id || '' }))}
                    className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 ${
                      transactionForm.type === 'expense'
                        ? 'border-danger-500 bg-danger-50 dark:bg-danger-900/20 text-danger-600'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <TrendingDown className="w-5 h-5" />
                    Egreso
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Categoría</label>
                <select
                  value={transactionForm.categoryId}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, categoryId: e.target.value }))}
                  className="input"
                  required
                >
                  <option value="">Seleccionar categoría</option>
                  {(transactionForm.type === 'income' ? incomeCategories : expenseCategories).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Monto</label>
                <input
                  type="number"
                  value={transactionForm.amount}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="input"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="label">Descripción</label>
                <input
                  type="text"
                  value={transactionForm.description}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, description: e.target.value }))}
                  className="input"
                  placeholder="Descripción de la transacción"
                  required
                />
              </div>

              <div>
                <label className="label">Fecha</label>
                <input
                  type="date"
                  value={transactionForm.date}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                  className="input"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTransactionModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Guardar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Categorías
              </h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Add Category Form */}
            <form onSubmit={handleSaveCategory} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg mb-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Nueva categoría
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                  className="input flex-1"
                  placeholder="Nombre de la categoría"
                />
                <select
                  value={categoryForm.type}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, type: e.target.value as TransactionType }))}
                  className="input w-32"
                >
                  <option value="income">Ingreso</option>
                  <option value="expense">Egreso</option>
                </select>
                <input
                  type="color"
                  value={categoryForm.color}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, color: e.target.value }))}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <button type="submit" disabled={loading || !categoryForm.name} className="btn-primary">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </form>

            {/* Existing Categories */}
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Ingresos</p>
                <div className="space-y-1">
                  {incomeCategories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-gray-900 dark:text-white">{cat.name}</span>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => deleteCategory(cat.id)}
                          className="p-1 text-gray-400 hover:text-danger-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Egresos</p>
                <div className="space-y-1">
                  {expenseCategories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-gray-900 dark:text-white">{cat.name}</span>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => deleteCategory(cat.id)}
                          className="p-1 text-gray-400 hover:text-danger-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
