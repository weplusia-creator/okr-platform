import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  Plus,
  ChevronDown,
  ChevronUp,
  Loader2,
  Save,
  X,
  Trash2,
  Edit3,
  TrendingUp,
  TrendingDown,
  Minus,
  Tag,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { useKPIs } from '../../context/KPIContext';
import { useFinance } from '../../context/FinanceContext';
import { useOKR } from '../../context/OKRContext';
import { useProjects } from '../../context/ProjectContext';
import { supabase } from '../../lib/supabase';
import type { KPI, KPICategory } from '../../types';

export function KPIDashboard() {
  const {
    categories, kpis, entries, loading,
    fetchCategories, addCategory, deleteCategory,
    fetchKPIs, addKPI, updateKPI, deleteKPI,
    fetchEntries, addEntry, deleteEntry,
    syncSystemKPIs,
  } = useKPIs();

  // Platform data
  const { clients, invoices, transactions, getFinanceSummary } = useFinance();
  const { objectives } = useOKR();
  const { projects, fetchAllPayments } = useProjects();
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [npsStats, setNpsStats] = useState<{ avg: number; nps: number; total: number }>({ avg: 0, nps: 0, total: 0 });

  // Current totals for platform cards
  const platformMetrics = useMemo(() => {
    const summary = getFinanceSummary();
    const allKRs = objectives.flatMap(o => o.keyResults);
    const completedKRs = allKRs.filter(kr => kr.progress >= 100);
    const avgOKRProgress = allKRs.length > 0
      ? allKRs.reduce((sum, kr) => sum + kr.progress, 0) / allKRs.length
      : 0;
    const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const activeProjects = projects.filter(p => {
      const status = (p as any).status as string;
      if (status !== 'in_progress' && status !== 'active' && status !== 'approved') return false;
      const start = (p as any).startDate || '';
      if (start && start.substring(0, 7) > currentMonth) return false;
      const end = (p as any).endDate || '';
      if (end && end.substring(0, 7) < currentMonth) return false;
      return true;
    });
    const activeClientIds = new Set(activeProjects.map(p => p.clientId).filter(Boolean));
    const paidPayments = allPayments.filter(p => p.status === 'paid');
    const totalCollectedPayments = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const pendingPayments = allPayments.filter(p => p.status === 'pending');
    const pendingPaymentsAmount = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPending = summary.pendingAmount + pendingPaymentsAmount;

    return [
      { key: 'total_income', label: 'Ingresos', value: summary.totalIncome + totalCollectedPayments, unit: '$', color: '#10B981', group: 'Finanzas' },
      { key: 'total_expenses', label: 'Egresos', value: summary.totalExpenses, unit: '$', color: '#EF4444', group: 'Finanzas' },
      { key: 'balance', label: 'Balance', value: (summary.totalIncome + totalCollectedPayments) - summary.totalExpenses, unit: '$', color: '#3B82F6', group: 'Finanzas' },
      { key: 'pending_amount', label: 'Pendiente de cobro', value: totalPending, unit: '$', color: '#F59E0B', group: 'Finanzas' },
      { key: 'clients', label: 'Clientes activos', value: activeClientIds.size, unit: '', color: '#3B82F6', group: 'Clientes y Proyectos' },
      { key: 'active_projects', label: 'Proyectos activos', value: activeProjects.length, unit: '', color: '#10B981', group: 'Clientes y Proyectos' },
      { key: 'overdue_invoices', label: 'Facturas vencidas', value: summary.overdueInvoices, unit: '', color: '#EF4444', group: 'Clientes y Proyectos' },
      { key: 'pending_payments', label: 'Cuotas pendientes', value: pendingPayments.length, unit: '', color: '#F97316', group: 'Clientes y Proyectos' },
      { key: 'total_okrs', label: 'OKRs totales', value: objectives.length, unit: '', color: '#8B5CF6', group: 'OKRs' },
      { key: 'avg_okr_progress', label: 'Progreso OKR promedio', value: Math.round(avgOKRProgress), unit: '%', color: '#8B5CF6', group: 'OKRs' },
      { key: 'completed_krs', label: 'Key Results completados', value: completedKRs.length, unit: `/ ${allKRs.length}`, color: '#10B981', group: 'OKRs' },
      { key: 'nps_avg', label: 'NPS Promedio', value: npsStats.avg, unit: `/ 10`, color: '#F59E0B', group: 'Clientes y Proyectos' },
      { key: 'nps_score', label: 'NPS Score', value: npsStats.nps, unit: '', color: npsStats.nps >= 50 ? '#10B981' : npsStats.nps >= 0 ? '#F59E0B' : '#EF4444', group: 'Clientes y Proyectos' },
      { key: 'nps_responses', label: 'Respuestas NPS', value: npsStats.total, unit: '', color: '#8B5CF6', group: 'Clientes y Proyectos' },
    ];
  }, [clients, invoices, objectives, projects, allPayments, getFinanceSummary, npsStats]);

  // Build monthly historical data for system KPIs from invoices + payments
  const systemMetricsWithHistory = useMemo(() => {
    // Collect all months from paid invoices and paid payments
    const monthSet = new Set<string>();
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthSet.add(currentMonth);

    invoices.forEach(inv => {
      if (inv.paidDate) {
        monthSet.add(inv.paidDate.substring(0, 7));
      }
      if (inv.issueDate) {
        monthSet.add(inv.issueDate.substring(0, 7));
      }
    });
    allPayments.forEach(p => {
      if (p.paidDate) monthSet.add(p.paidDate.substring(0, 7));
      if (p.month) monthSet.add(p.month);
    });
    transactions.forEach(t => {
      if (t.date) monthSet.add(t.date.substring(0, 7));
    });

    const months = Array.from(monthSet).sort();

    // Helper: get month from a date string
    const toMonth = (d: string) => d.substring(0, 7);

    // Compute cumulative/monthly values per month for each metric
    const buildMonthly = (key: string, label: string, unit: string, group: string, computeForMonth: (month: string) => number) => {
      const monthlyValues = months.map(m => ({ month: m, value: computeForMonth(m) }));
      return { key, label, unit, group, monthlyValues };
    };

    // Income per month: paid invoices + paid payments in that month
    const incomePerMonth = buildMonthly('total_income', 'Ingresos', '$', 'Finanzas', (month) => {
      const invIncome = invoices
        .filter(i => i.status === 'paid' && i.paidDate && toMonth(i.paidDate) === month)
        .reduce((sum, i) => sum + (i.total || 0), 0);
      const payIncome = allPayments
        .filter(p => p.status === 'paid' && p.paidDate && toMonth(p.paidDate) === month)
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      return invIncome + payIncome;
    });

    // Expenses per month from finance summary — we don't have monthly breakdown, so use transactions if available
    // For now approximate: total expenses spread, or just show cumulative
    // Actually, let's show income monthly (not cumulative) for a clearer chart
    const expensesPerMonth = buildMonthly('total_expenses', 'Egresos', '$', 'Finanzas', (month) => {
      return transactions
        .filter(t => t.type === 'expense' && toMonth(t.date) === month)
        .reduce((sum, t) => sum + t.amount, 0);
    });

    const balancePerMonth = buildMonthly('balance', 'Balance', '$', 'Finanzas', (month) => {
      const inc = incomePerMonth.monthlyValues.find(v => v.month === month)?.value || 0;
      const exp = expensesPerMonth.monthlyValues.find(v => v.month === month)?.value || 0;
      return inc - exp;
    });

    const pendingPerMonth = buildMonthly('pending_amount', 'Pendiente de cobro', '$', 'Finanzas', (month) => {
      // Pending invoices due in that month
      const invPending = invoices
        .filter(i => (i.status === 'issued' || i.status === 'overdue') && toMonth(i.dueDate) === month)
        .reduce((sum, i) => sum + (i.total || 0), 0);
      const payPending = allPayments
        .filter(p => p.status === 'pending' && p.month === month)
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      return invPending + payPending;
    });

    const activeStatuses = ['in_progress', 'active', 'approved'];
    const isProjectActiveInMonth = (p: any, month: string) => {
      const status = p.status as string;
      const start = p.startDate || p.createdAt || '';
      const end = p.endDate || '';
      const startMonth = start ? toMonth(start) : '';
      // Project must have started by this month
      if (!startMonth || startMonth > month) return false;
      // If project is completed/cancelled, only count months up to endDate
      if (status === 'completed' || status === 'cancelled') {
        return end ? toMonth(end) >= month : false;
      }
      // For active statuses, count if started and not ended
      if (!activeStatuses.includes(status)) return false;
      if (end && toMonth(end) < month) return false;
      return true;
    };

    const clientsPerMonth = buildMonthly('clients', 'Clientes activos', '', 'Clientes y Proyectos', (month) => {
      const activeInMonth = projects.filter(p => isProjectActiveInMonth(p, month));
      return new Set(activeInMonth.map(p => p.clientId).filter(Boolean)).size;
    });

    const activeProjectsPerMonth = buildMonthly('active_projects', 'Proyectos activos', '', 'Clientes y Proyectos', (month) => {
      return projects.filter(p => isProjectActiveInMonth(p, month)).length;
    });

    const overduePerMonth = buildMonthly('overdue_invoices', 'Facturas vencidas', '', 'Clientes y Proyectos', (month) => {
      return invoices.filter(i => (i.status === 'overdue' || (i.status !== 'paid' && i.status !== 'cancelled' && i.dueDate && toMonth(i.dueDate) <= month && i.dueDate < `${month}-32`)) ).length;
    });

    const pendingPaymentsPerMonth = buildMonthly('pending_payments', 'Cuotas pendientes', '', 'Clientes y Proyectos', (month) => {
      return allPayments.filter(p => p.status === 'pending' && p.month <= month).length;
    });

    const allKRs = objectives.flatMap(o => o.keyResults);
    const okrsPerMonth = buildMonthly('total_okrs', 'OKRs totales', '', 'OKRs', () => objectives.length);
    const avgProgressPerMonth = buildMonthly('avg_okr_progress', 'Progreso OKR promedio', '%', 'OKRs', () => {
      return allKRs.length > 0 ? Math.round(allKRs.reduce((s, kr) => s + kr.progress, 0) / allKRs.length) : 0;
    });
    const completedKRsPerMonth = buildMonthly('completed_krs', 'Key Results completados', '', 'OKRs', () => {
      return allKRs.filter(kr => kr.progress >= 100).length;
    });

    return [
      incomePerMonth, expensesPerMonth, balancePerMonth, pendingPerMonth,
      clientsPerMonth, activeProjectsPerMonth, overduePerMonth, pendingPaymentsPerMonth,
      okrsPerMonth, avgProgressPerMonth, completedKRsPerMonth,
    ];
  }, [clients, invoices, transactions, objectives, projects, allPayments, getFinanceSummary]);

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [visibleKPIIds, setVisibleKPIIds] = useState<Set<string>>(new Set());
  const [chartInitialized, setChartInitialized] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedKPI, setExpandedKPI] = useState<string | null>(null);

  // New category form
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3B82F6');

  // New KPI form
  const [showNewKPI, setShowNewKPI] = useState(false);
  const [kpiName, setKpiName] = useState('');
  const [kpiDesc, setKpiDesc] = useState('');
  const [kpiUnit, setKpiUnit] = useState('');
  const [kpiCategoryId, setKpiCategoryId] = useState('');
  const [kpiTarget, setKpiTarget] = useState('');

  // Edit KPI
  const [editingKPI, setEditingKPI] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editTarget, setEditTarget] = useState('');

  // New entry form
  const [entryKPI, setEntryKPI] = useState<string | null>(null);
  const [entryValue, setEntryValue] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryNotes, setEntryNotes] = useState('');

  // Confirm delete
  const [confirmDeleteKPI, setConfirmDeleteKPI] = useState<string | null>(null);
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const [synced, setSynced] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchKPIs();
    fetchAllPayments().then(setAllPayments);
    // Fetch all NPS responses for global average
    (async () => {
      try {
        const { data, error } = await supabase.from('nps_responses').select('score');
        if (error || !data || data.length === 0) return;
        const scores = data.map((r: any) => r.score as number);
        const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
        const promoters = scores.filter(s => s >= 9).length;
        const detractors = scores.filter(s => s <= 6).length;
        const nps = Math.round(((promoters - detractors) / scores.length) * 100);
        setNpsStats({ avg: Math.round(avg * 10) / 10, nps, total: scores.length });
      } catch (e) {
        console.error('Error fetching NPS:', e);
      }
    })();
  }, [fetchCategories, fetchKPIs, fetchAllPayments]);

  // Sync system KPIs once platform data is loaded (monthly historical)
  useEffect(() => {
    if (synced || loading) return;
    if (clients.length === 0 && invoices.length === 0 && objectives.length === 0 && projects.length === 0 && allPayments.length === 0) return;
    setSynced(true);
    syncSystemKPIs(systemMetricsWithHistory.map(m => ({
      key: m.key,
      label: m.label,
      unit: m.unit === '$' ? '$' : m.unit,
      monthlyValues: m.monthlyValues.filter(v => v.value !== 0 || m.key === 'balance' || m.key === 'total_expenses'),
    })));
  }, [synced, loading, clients, invoices, objectives, projects, allPayments, systemMetricsWithHistory, syncSystemKPIs]);

  const handleToggleKPI = useCallback(async (kpiId: string) => {
    if (expandedKPI === kpiId) {
      setExpandedKPI(null);
      return;
    }
    setExpandedKPI(kpiId);
    if (!entries[kpiId]) {
      await fetchEntries(kpiId);
    }
  }, [expandedKPI, entries, fetchEntries]);

  const filteredKPIs = useMemo(() => {
    const manual = kpis.filter(k => !k.isSystem);
    if (filterCategory === 'all') return manual;
    return manual.filter(k => k.categoryId === filterCategory);
  }, [kpis, filterCategory]);

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    setSaving(true);
    try {
      await addCategory(newCatName.trim(), newCatColor);
      setNewCatName('');
      setNewCatColor('#3B82F6');
      setShowNewCat(false);
    } catch (err) {
      console.error('Error creating category:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateKPI = async () => {
    if (!kpiName.trim()) return;
    setSaving(true);
    try {
      await addKPI({
        name: kpiName.trim(),
        description: kpiDesc.trim() || undefined,
        unit: kpiUnit.trim() || undefined,
        categoryId: kpiCategoryId || undefined,
        targetValue: kpiTarget ? Number(kpiTarget) : undefined,
      });
      setKpiName('');
      setKpiDesc('');
      setKpiUnit('');
      setKpiCategoryId('');
      setKpiTarget('');
      setShowNewKPI(false);
    } catch (err) {
      console.error('Error creating KPI:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateKPI = async (id: string) => {
    setSaving(true);
    try {
      await updateKPI(id, {
        name: editName.trim(),
        description: editDesc.trim() || null,
        unit: editUnit.trim() || null,
        categoryId: editCategoryId || null,
        targetValue: editTarget ? Number(editTarget) : null,
      });
      setEditingKPI(null);
    } catch (err) {
      console.error('Error updating KPI:', err);
    } finally {
      setSaving(false);
    }
  };

  const startEditKPI = (k: KPI) => {
    setEditingKPI(k.id);
    setEditName(k.name);
    setEditDesc(k.description || '');
    setEditUnit(k.unit || '');
    setEditCategoryId(k.categoryId || '');
    setEditTarget(k.targetValue != null ? String(k.targetValue) : '');
  };

  const handleAddEntry = async (kpiId: string) => {
    if (!entryValue) return;
    setSaving(true);
    try {
      await addEntry(kpiId, Number(entryValue), entryDate, entryNotes.trim() || undefined);
      setEntryValue('');
      setEntryNotes('');
      setEntryDate(new Date().toISOString().split('T')[0]);
      setEntryKPI(null);
    } catch (err) {
      console.error('Error adding entry:', err);
    } finally {
      setSaving(false);
    }
  };

  const getCategoryForKPI = (k: KPI): KPICategory | undefined => {
    return categories.find(c => c.id === k.categoryId);
  };

  const getLastEntry = (kpiId: string) => {
    const kpiEntries = entries[kpiId];
    if (!kpiEntries || kpiEntries.length === 0) return null;
    return kpiEntries[kpiEntries.length - 1];
  };

  const getTrend = (kpiId: string): { direction: 'up' | 'down' | 'flat'; pct: number } => {
    const kpiEntries = entries[kpiId];
    if (!kpiEntries || kpiEntries.length < 2) return { direction: 'flat', pct: 0 };
    const last = kpiEntries[kpiEntries.length - 1].value;
    const prev = kpiEntries[kpiEntries.length - 2].value;
    if (prev === 0) return { direction: last > 0 ? 'up' : 'flat', pct: 0 };
    const pct = ((last - prev) / Math.abs(prev)) * 100;
    return { direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat', pct: Math.abs(pct) };
  };

  // Preload entries for all KPIs (manual + system) to show trends and charts
  useEffect(() => {
    kpis.forEach(k => {
      if (!entries[k.id]) fetchEntries(k.id);
    });
  }, [kpis, entries, fetchEntries]);

  if (loading && kpis.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-primary-500" />
            KPIs
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Indicadores clave de rendimiento</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowNewCat(true)} className="btn-secondary">
            <Tag className="w-4 h-4" /> Nueva categoría
          </button>
          <button onClick={() => setShowNewKPI(true)} className="btn-primary">
            <Plus className="w-5 h-5" /> Nuevo KPI
          </button>
        </div>
      </div>

      {/* Platform auto KPIs cards */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">Indicadores de la plataforma</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {platformMetrics.map((m, i) => (
            <div key={i} className="card p-4 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{m.label}</p>
              <p className="text-2xl font-bold" style={{ color: m.color }}>
                {m.unit === '$' ? '$' : ''}{m.value.toLocaleString()}{m.unit && m.unit !== '$' && !m.unit.startsWith('/') ? m.unit : ''}
              </p>
              {m.unit.startsWith('/') && (
                <p className="text-xs text-gray-400">{m.unit}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Unified evolution chart with toggles */}
      {(() => {
        // All KPIs with entries (system + manual)
        const allChartKPIs = kpis.filter(k => (entries[k.id] || []).length >= 1);
        if (allChartKPIs.length === 0) return null;

        // Build toggle groups
        const systemGroups = ['Finanzas', 'Clientes y Proyectos', 'OKRs'] as const;
        const manualCatIds = [...new Set(allChartKPIs.filter(k => !k.isSystem).map(k => k.categoryId))];

        const getKPILabel = (k: KPI) => {
          if (k.isSystem) {
            const pm = platformMetrics.find(m => `__system__${m.key}` === k.name);
            return pm?.label || k.description || k.name.replace('__system__', '');
          }
          return k.name;
        };

        const getKPIColor = (k: KPI, i: number) => {
          if (k.isSystem) {
            const pm = platformMetrics.find(m => `__system__${m.key}` === k.name);
            return pm?.color || '#3B82F6';
          }
          const cat = getCategoryForKPI(k);
          const fallbackColors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
          return cat?.color || fallbackColors[i % fallbackColors.length];
        };

        const getSystemGroup = (k: KPI) => {
          const pm = platformMetrics.find(m => `__system__${m.key}` === k.name);
          return pm?.group || 'Otros';
        };

        // Initialize visible set on first render
        if (!chartInitialized && allChartKPIs.length > 0) {
          setVisibleKPIIds(new Set(allChartKPIs.map(k => k.id)));
          setChartInitialized(true);
        }

        const toggleKPI = (id: string) => {
          setVisibleKPIIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
          });
        };

        const toggleGroup = (kpiIds: string[]) => {
          setVisibleKPIIds(prev => {
            const next = new Set(prev);
            const allOn = kpiIds.every(id => next.has(id));
            kpiIds.forEach(id => { if (allOn) next.delete(id); else next.add(id); });
            return next;
          });
        };

        // Visible KPIs for chart
        const visibleKPIs = allChartKPIs.filter(k => visibleKPIIds.has(k.id));

        // Chart data (filtered by date range)
        const allDates = new Set<string>();
        visibleKPIs.forEach(k => (entries[k.id] || []).forEach(e => allDates.add(e.date)));
        const sortedDates = Array.from(allDates).sort().filter(d => {
          if (dateFrom && d < dateFrom) return false;
          if (dateTo && d > `${dateTo}-31`) return false;
          return true;
        });

        const chartData = sortedDates.map(date => {
          const row: Record<string, any> = { date };
          visibleKPIs.forEach(k => {
            const entry = (entries[k.id] || []).filter(e => e.date <= date).pop();
            if (entry) row[k.id] = entry.value;
          });
          return row;
        });

        return (
          <div className="card p-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Evolución temporal</h3>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 dark:text-gray-400">Desde</label>
                <input type="month" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input text-sm py-1 px-2 w-36" />
                <label className="text-xs text-gray-500 dark:text-gray-400">Hasta</label>
                <input type="month" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input text-sm py-1 px-2 w-36" />
                {(dateFrom || dateTo) && (
                  <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-primary-600 hover:underline">Limpiar</button>
                )}
              </div>
            </div>

            {/* Toggle buttons by group */}
            <div className="space-y-2">
              {systemGroups.map(group => {
                const groupKPIs = allChartKPIs.filter(k => k.isSystem && getSystemGroup(k) === group);
                if (groupKPIs.length === 0) return null;
                const allOn = groupKPIs.every(k => visibleKPIIds.has(k.id));
                return (
                  <div key={group} className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => toggleGroup(groupKPIs.map(k => k.id))}
                      className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${allOn ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}
                    >
                      {group}
                    </button>
                    {groupKPIs.map((k, i) => {
                      const on = visibleKPIIds.has(k.id);
                      const color = getKPIColor(k, i);
                      return (
                        <button
                          key={k.id}
                          onClick={() => toggleKPI(k.id)}
                          className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${on ? 'text-white' : 'opacity-40 bg-gray-100 dark:bg-gray-800 text-gray-500'}`}
                          style={on ? { backgroundColor: color } : undefined}
                        >
                          {getKPILabel(k)}
                        </button>
                      );
                    })}
                  </div>
                );
              })}

              {/* Manual KPIs grouped by category */}
              {(() => {
                const manualKPIs = allChartKPIs.filter(k => !k.isSystem);
                if (manualKPIs.length === 0) return null;

                // Group by category
                const grouped: Record<string, KPI[]> = { '__none__': [] };
                categories.forEach(c => { grouped[c.id] = []; });
                manualKPIs.forEach(k => {
                  if (k.categoryId && grouped[k.categoryId]) grouped[k.categoryId].push(k);
                  else grouped['__none__'].push(k);
                });

                return Object.entries(grouped).map(([catId, catKPIs]) => {
                  if (catKPIs.length === 0) return null;
                  const cat = categories.find(c => c.id === catId);
                  const label = cat?.name || 'Mis KPIs';
                  const allOn = catKPIs.every(k => visibleKPIIds.has(k.id));
                  return (
                    <div key={catId} className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => toggleGroup(catKPIs.map(k => k.id))}
                        className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${allOn ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}
                      >
                        {label}
                      </button>
                      {catKPIs.map((k, i) => {
                        const on = visibleKPIIds.has(k.id);
                        const color = getKPIColor(k, i);
                        return (
                          <button
                            key={k.id}
                            onClick={() => toggleKPI(k.id)}
                            className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${on ? 'text-white' : 'opacity-40 bg-gray-100 dark:bg-gray-800 text-gray-500'}`}
                            style={on ? { backgroundColor: color } : undefined}
                          >
                            {k.name}
                          </button>
                        );
                      })}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Chart */}
            {sortedDates.length >= 1 && visibleKPIs.length > 0 ? (
              <div style={{ width: '100%', height: 380 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={d => { const p = d.split('-'); const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']; return `${monthNames[parseInt(p[1])-1]} ${p[0].slice(2)}`; }}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      labelFormatter={d => { const p = String(d).split('-'); const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']; return `${monthNames[parseInt(p[1])-1]} ${p[0]}`; }}
                      formatter={(value: number, nameKey: string) => {
                        const kpi = visibleKPIs.find(k => k.id === nameKey);
                        return [value.toLocaleString(), kpi ? getKPILabel(kpi) : nameKey];
                      }}
                    />
                    <Legend formatter={(value: string) => {
                      const kpi = visibleKPIs.find(k => k.id === value);
                      return kpi ? getKPILabel(kpi) : value;
                    }} />
                    {visibleKPIs.map((k, i) => (
                      <Line
                        key={k.id}
                        type="monotone"
                        dataKey={k.id}
                        name={k.id}
                        stroke={getKPIColor(k, i)}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-gray-400 py-4 text-center">Seleccioná indicadores para ver el gráfico</p>
            )}
          </div>
        );
      })()}

      {/* New category form */}
      {showNewCat && (
        <div className="card p-4 space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">Nueva categoría</h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="label">Nombre</label>
              <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="input" placeholder="Marketing" autoFocus />
            </div>
            <div>
              <label className="label">Color</label>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setNewCatColor(c)} className={`w-8 h-8 rounded-full border-2 ${newCatColor === c ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNewCat(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleCreateCategory} disabled={saving || !newCatName.trim()} className="btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Crear
            </button>
          </div>
        </div>
      )}

      {/* Categories chips + delete */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">Categorías:</span>
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center gap-1">
              <button
                onClick={() => setFilterCategory(filterCategory === cat.id ? 'all' : cat.id)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filterCategory === cat.id ? 'text-white' : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800'}`}
                style={filterCategory === cat.id ? { backgroundColor: cat.color } : undefined}
              >
                {cat.name}
              </button>
              {confirmDeleteCat === cat.id ? (
                <div className="flex items-center gap-1">
                  <button onClick={() => { deleteCategory(cat.id); setConfirmDeleteCat(null); }} className="text-red-600 text-xs font-medium">Sí</button>
                  <button onClick={() => setConfirmDeleteCat(null)} className="text-gray-400 text-xs">No</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDeleteCat(cat.id)} className="p-0.5 text-gray-300 hover:text-red-500 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          {filterCategory !== 'all' && (
            <button onClick={() => setFilterCategory('all')} className="text-xs text-primary-600 hover:underline">Ver todos</button>
          )}
        </div>
      )}

      {/* New KPI form */}
      {showNewKPI && (
        <div className="card p-4 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Nuevo KPI</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Nombre *</label>
              <input type="text" value={kpiName} onChange={e => setKpiName(e.target.value)} className="input" placeholder="Revenue mensual" autoFocus />
            </div>
            <div>
              <label className="label">Unidad</label>
              <input type="text" value={kpiUnit} onChange={e => setKpiUnit(e.target.value)} className="input" placeholder="$, %, unidades..." />
            </div>
            <div>
              <label className="label">Categoría</label>
              <select value={kpiCategoryId} onChange={e => setKpiCategoryId(e.target.value)} className="select">
                <option value="">Sin categoría</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Valor objetivo</label>
              <input type="number" value={kpiTarget} onChange={e => setKpiTarget(e.target.value)} className="input" placeholder="50000" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Descripción</label>
              <input type="text" value={kpiDesc} onChange={e => setKpiDesc(e.target.value)} className="input" placeholder="Descripción del indicador..." />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNewKPI(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleCreateKPI} disabled={saving || !kpiName.trim()} className="btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Crear KPI
            </button>
          </div>
        </div>
      )}

      {/* KPIs list */}
      {filteredKPIs.length === 0 ? (
        <div className="card p-12 text-center">
          <BarChart3 className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No hay KPIs</h3>
          <p className="text-gray-500 dark:text-gray-400">Creá tu primer indicador para empezar a trackear métricas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredKPIs.map(k => {
            const cat = getCategoryForKPI(k);
            const lastEntry = getLastEntry(k.id);
            const trend = getTrend(k.id);
            const isExpanded = expandedKPI === k.id;
            const kpiEntries = entries[k.id] || [];
            const isEditing = editingKPI === k.id;

            return (
              <div key={k.id} className="card overflow-hidden">
                {/* Header */}
                <div className="p-4 flex items-center gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat?.color ? `${cat.color}20` : '#3B82F620' }}>
                    <BarChart3 className="w-5 h-5" style={{ color: cat?.color || '#3B82F6' }} />
                  </div>

                  <button onClick={() => handleToggleKPI(k.id)} className="flex-1 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 dark:text-white">{k.name}</span>
                      {cat && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: cat.color }}>
                          {cat.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {lastEntry ? (
                        <>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {k.unit && !k.unit.match(/^[%$]/) ? '' : k.unit === '$' ? '$' : ''}{lastEntry.value.toLocaleString()}{k.unit && k.unit !== '$' ? ` ${k.unit}` : ''}
                          </span>
                          {k.targetValue != null && (
                            <span className="text-xs text-gray-400">/ {k.unit === '$' ? '$' : ''}{k.targetValue.toLocaleString()}{k.unit && k.unit !== '$' ? ` ${k.unit}` : ''}</span>
                          )}
                          {trend.direction !== 'flat' && (
                            <span className={`text-xs font-medium flex items-center gap-0.5 ${trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                              {trend.direction === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {trend.pct.toFixed(1)}%
                            </span>
                          )}
                          {trend.direction === 'flat' && kpiEntries.length >= 2 && (
                            <span className="text-xs text-gray-400 flex items-center gap-0.5">
                              <Minus className="w-3 h-3" /> 0%
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-gray-400">Sin datos</span>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-1">
                    <button onClick={() => startEditKPI(k)} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setConfirmDeleteKPI(k.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleToggleKPI(k.id)} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Delete confirmation */}
                {confirmDeleteKPI === k.id && (
                  <div className="border-t border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 flex items-center justify-between">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      ¿Eliminar <strong>{k.name}</strong> y todos sus datos?
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmDeleteKPI(null)} className="btn-secondary text-sm">Cancelar</button>
                      <button onClick={() => { deleteKPI(k.id); setConfirmDeleteKPI(null); }} className="btn-danger text-sm">
                        <Trash2 className="w-4 h-4" /> Eliminar
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-5">
                    {/* Edit form */}
                    {isEditing && (
                      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Editar KPI</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <label className="label">Nombre</label>
                            <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="input text-sm" />
                          </div>
                          <div>
                            <label className="label">Unidad</label>
                            <input type="text" value={editUnit} onChange={e => setEditUnit(e.target.value)} className="input text-sm" />
                          </div>
                          <div>
                            <label className="label">Categoría</label>
                            <select value={editCategoryId} onChange={e => setEditCategoryId(e.target.value)} className="select text-sm">
                              <option value="">Sin categoría</option>
                              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="label">Valor objetivo</label>
                            <input type="number" value={editTarget} onChange={e => setEditTarget(e.target.value)} className="input text-sm" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="label">Descripción</label>
                            <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)} className="input text-sm" />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingKPI(null)} className="btn-secondary text-sm">Cancelar</button>
                          <button onClick={() => handleUpdateKPI(k.id)} disabled={saving} className="btn-primary text-sm">
                            <Save className="w-4 h-4" /> Guardar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Chart */}
                    {kpiEntries.length >= 1 ? (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Evolución</h5>
                        <div style={{ width: '100%', height: 260 }}>
                          <ResponsiveContainer>
                            <LineChart data={kpiEntries.map(e => ({ date: e.date, value: e.value, notes: e.notes }))} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                              <XAxis
                                dataKey="date"
                                tickFormatter={d => {
                                  const parts = d.split('-');
                                  return `${parts[2]}/${parts[1]}`;
                                }}
                                tick={{ fontSize: 12 }}
                              />
                              <YAxis tick={{ fontSize: 12 }} />
                              <Tooltip
                                labelFormatter={d => {
                                  const parts = String(d).split('-');
                                  return `${parts[2]}/${parts[1]}/${parts[0]}`;
                                }}
                                formatter={(value: number) => [
                                  `${k.unit === '$' ? '$' : ''}${value.toLocaleString()}${k.unit && k.unit !== '$' ? ` ${k.unit}` : ''}`,
                                  k.name,
                                ]}
                              />
                              <Line
                                type="monotone"
                                dataKey="value"
                                stroke={cat?.color || '#3B82F6'}
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                              />
                              {k.targetValue != null && (
                                <ReferenceLine
                                  y={k.targetValue}
                                  stroke="#EF4444"
                                  strokeDasharray="5 5"
                                  label={{ value: `Target: ${k.targetValue}`, position: 'right', fontSize: 11, fill: '#EF4444' }}
                                />
                              )}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : null}

                    {/* Entries table */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Entradas</h5>
                        <button
                          onClick={() => setEntryKPI(entryKPI === k.id ? null : k.id)}
                          className="btn-secondary text-sm"
                        >
                          <Plus className="w-4 h-4" /> Nueva entrada
                        </button>
                      </div>

                      {/* New entry form */}
                      {entryKPI === k.id && (
                        <div className="flex gap-3 items-end mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div>
                            <label className="label">Fecha</label>
                            <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="input text-sm" />
                          </div>
                          <div>
                            <label className="label">Valor{k.unit ? ` (${k.unit})` : ''}</label>
                            <input type="number" value={entryValue} onChange={e => setEntryValue(e.target.value)} className="input text-sm" placeholder="0" autoFocus />
                          </div>
                          <div className="flex-1">
                            <label className="label">Notas</label>
                            <input type="text" value={entryNotes} onChange={e => setEntryNotes(e.target.value)} className="input text-sm" placeholder="Opcional..." />
                          </div>
                          <button onClick={() => handleAddEntry(k.id)} disabled={saving || !entryValue} className="btn-primary text-sm">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Agregar
                          </button>
                          <button onClick={() => setEntryKPI(null)} className="btn-secondary text-sm">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {kpiEntries.length === 0 ? (
                        <p className="text-sm text-gray-400">Sin entradas aún</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Fecha</th>
                                <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Valor</th>
                                <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Notas</th>
                                <th className="w-10"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...kpiEntries].reverse().map(entry => {
                                const [y, m, d] = entry.date.split('-');
                                return (
                                  <tr key={entry.id} className="border-b border-gray-100 dark:border-gray-800">
                                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{d}/{m}/{y}</td>
                                    <td className="py-2 px-3 text-right font-medium text-gray-900 dark:text-white">
                                      {k.unit === '$' ? '$' : ''}{entry.value.toLocaleString()}{k.unit && k.unit !== '$' ? ` ${k.unit}` : ''}
                                    </td>
                                    <td className="py-2 px-3 text-gray-500 dark:text-gray-400">{entry.notes || '-'}</td>
                                    <td className="py-2 px-1">
                                      <button onClick={() => deleteEntry(entry.id, k.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
