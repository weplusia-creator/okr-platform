import { useMemo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  AlertTriangle,
  Users,
  ArrowRight,
  CalendarDays,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useProjects } from '../../context/ProjectContext';
import type { ProjectPayment } from '../../types/projects';

export function FinanceDashboard() {
  const {
    getFinanceSummary,
    getMonthlyData,
    clients,
    invoices,
    loadingInvoices,
    loadingCashFlow,
  } = useFinance();
  const { fetchAllPayments, projects } = useProjects();

  const [allPayments, setAllPayments] = useState<(ProjectPayment & { projectName: string })[]>([]);

  useEffect(() => {
    fetchAllPayments().then(setAllPayments);
  }, [fetchAllPayments]);

  const summary = getFinanceSummary();
  const currentYear = new Date().getFullYear();
  const monthlyData = getMonthlyData(currentYear);

  // Top clients by total billing (invoices + project payments)
  const topClients = useMemo(() => {
    const clientMap = new Map<string, { name: string; paid: number; pending: number }>();

    const getOrCreate = (clientId: string, clientName: string) => {
      if (!clientMap.has(clientId)) clientMap.set(clientId, { name: clientName, paid: 0, pending: 0 });
      return clientMap.get(clientId)!;
    };

    // Invoices
    invoices.forEach(inv => {
      if (!inv.clientId) return;
      const client = clients.find(c => c.id === inv.clientId);
      if (!client) return;
      const entry = getOrCreate(client.id, client.company || client.name);
      if (inv.status === 'paid') {
        entry.paid += inv.total || 0;
      } else if (inv.status !== 'cancelled') {
        entry.pending += inv.total || 0;
      }
    });

    // Project payments (cuotas) — only if not already linked to an invoice
    allPayments.forEach(p => {
      if (p.invoiceId) return; // already counted via invoices
      const project = projects.find(pr => pr.id === p.projectId);
      if (!project?.clientId) return;
      const client = clients.find(c => c.id === project.clientId);
      if (!client) return;
      const entry = getOrCreate(client.id, client.company || client.name);
      if (p.status === 'paid') {
        entry.paid += p.amount;
      } else {
        entry.pending += p.amount;
      }
    });

    return Array.from(clientMap.entries())
      .map(([id, data]) => ({ id, ...data, total: data.paid + data.pending }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [invoices, allPayments, projects, clients]);

  // Future pending payments total
  const futurePayments = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const pending = allPayments.filter(p => p.month >= currentMonth && p.status === 'pending');
    return {
      total: pending.reduce((sum, p) => sum + p.amount, 0),
      count: pending.length,
    };
  }, [allPayments]);

  // Merge future payments into monthly chart data
  const paymentsByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    allPayments.forEach(p => {
      if (p.status === 'pending') {
        const [, mm] = p.month.split('-');
        const yearOfPayment = Number(p.month.split('-')[0]);
        if (yearOfPayment === currentYear) {
          const key = Number(mm) - 1; // 0-indexed month
          map[key] = (map[key] || 0) + p.amount;
        }
      }
    });
    return map;
  }, [allPayments, currentYear]);

  const maxMonthlyValue = useMemo(() => {
    return Math.max(
      ...monthlyData.map((m, i) => Math.max(m.income + (paymentsByMonth[i] || 0), m.expenses)),
      1
    );
  }, [monthlyData, paymentsByMonth]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loadingInvoices || loadingCashFlow) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard Financiero
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Resumen de tus finanzas
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Balance</p>
              <p className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                {formatCurrency(summary.balance)}
              </p>
            </div>
            <div className={`p-3 rounded-lg shrink-0 ${summary.balance >= 0 ? 'bg-success-100 dark:bg-success-900/30' : 'bg-danger-100 dark:bg-danger-900/30'}`}>
              <DollarSign className={`w-6 h-6 ${summary.balance >= 0 ? 'text-success-600' : 'text-danger-600'}`} />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ingresos</p>
              <p className="text-2xl font-bold text-success-600">
                {formatCurrency(summary.totalIncome)}
              </p>
            </div>
            <div className="p-3 rounded-lg shrink-0 bg-success-100 dark:bg-success-900/30">
              <TrendingUp className="w-6 h-6 text-success-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Egresos</p>
              <p className="text-2xl font-bold text-danger-600">
                {formatCurrency(summary.totalExpenses)}
              </p>
            </div>
            <div className="p-3 rounded-lg shrink-0 bg-danger-100 dark:bg-danger-900/30">
              <TrendingDown className="w-6 h-6 text-danger-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Por cobrar</p>
              <p className="text-2xl font-bold text-primary-600">
                {formatCurrency(summary.pendingAmount)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {summary.pendingInvoices} facturas
              </p>
            </div>
            <div className="p-3 rounded-lg shrink-0 bg-primary-100 dark:bg-primary-900/30">
              <FileText className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Cuotas futuras</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(futurePayments.total)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {futurePayments.count} cuotas pendientes
              </p>
            </div>
            <div className="p-3 rounded-lg shrink-0 bg-purple-100 dark:bg-purple-900/30">
              <CalendarDays className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Overdue Alert */}
      {summary.overdueInvoices > 0 && (
        <div className="card p-4 border-l-4 border-warning-500 bg-warning-50 dark:bg-warning-900/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-warning-600" />
            <div>
              <p className="font-medium text-warning-800 dark:text-warning-200">
                Facturas vencidas
              </p>
              <p className="text-sm text-warning-700 dark:text-warning-300">
                Tienes {summary.overdueInvoices} facturas vencidas por {formatCurrency(summary.overdueAmount)}
              </p>
            </div>
            <Link
              to="/finance/invoices?status=overdue"
              className="ml-auto btn-secondary text-sm"
            >
              Ver facturas
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Chart with future payments */}
        <div className="lg:col-span-2 card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Flujo de caja {currentYear}
          </h3>
          <div className="h-72">
            <div className="flex items-end justify-between h-full gap-2">
              {monthlyData.map((month, index) => {
                const projected = paymentsByMonth[index] || 0;
                const totalIncome = month.income + projected;
                return (
                  <div key={month.month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex gap-0.5 h-56 items-end">
                      <div className="flex-1 flex flex-col items-end justify-end h-full">
                        {projected > 0 && (
                          <div
                            className="w-full bg-purple-400 dark:bg-purple-500 rounded-t transition-all opacity-60"
                            style={{ height: `${(projected / maxMonthlyValue) * 100}%` }}
                            title={`Proyectado: ${formatCurrency(projected)}`}
                          />
                        )}
                        <div
                          className="w-full bg-success-500 rounded-t transition-all"
                          style={{ height: `${(month.income / maxMonthlyValue) * 100}%` }}
                          title={`Ingresos: ${formatCurrency(month.income)}`}
                        />
                      </div>
                      <div
                        className="flex-1 bg-danger-500 rounded-t transition-all"
                        style={{ height: `${(month.expenses / maxMonthlyValue) * 100}%` }}
                        title={`Egresos: ${formatCurrency(month.expenses)}`}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {month.month}
                    </span>
                  </div>
                );
              })}
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

        {/* Top Clients */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Top clientes
            </h3>
            <Link
              to="/projects/clients"
              className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1"
            >
              Ver todos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {topClients.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay datos de clientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topClients.map((client, index) => (
                <Link
                  key={client.id}
                  to={`/projects/clients/${client.id}`}
                  className="block p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 text-sm font-medium flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white truncate max-w-[120px]">
                        {client.name}
                      </span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(client.total)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 ml-9 text-xs">
                    <span className="text-success-600">
                      Cobrado: {formatCurrency(client.paid)}
                    </span>
                    <span className="text-purple-600">
                      Proyectado: {formatCurrency(client.pending)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/finance/invoices/new"
          className="card p-4 hover:shadow-md transition-shadow flex items-center gap-4"
        >
          <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900/30">
            <FileText className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Nueva factura</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Crear una factura</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
        </Link>

        <Link
          to="/projects/clients/new"
          className="card p-4 hover:shadow-md transition-shadow flex items-center gap-4"
        >
          <div className="p-3 rounded-lg bg-success-100 dark:bg-success-900/30">
            <Users className="w-6 h-6 text-success-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Nuevo cliente</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Agregar un cliente</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
        </Link>

        <Link
          to="/finance/cash-flow"
          className="card p-4 hover:shadow-md transition-shadow flex items-center gap-4"
        >
          <div className="p-3 rounded-lg bg-warning-100 dark:bg-warning-900/30">
            <TrendingUp className="w-6 h-6 text-warning-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Registrar movimiento</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Ingreso o egreso</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
        </Link>
      </div>
    </div>
  );
}
