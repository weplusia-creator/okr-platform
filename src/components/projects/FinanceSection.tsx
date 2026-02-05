import { useMemo, useEffect, useState } from 'react';
import { DollarSign, FileText, ExternalLink, TrendingUp, CalendarDays, CheckCircle2, Circle, Loader2, Receipt, Link2, Pencil, Trash2 } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useProjects } from '../../context/ProjectContext';
import type { Project, ProjectPayment } from '../../types/projects';

interface FinanceSectionProps {
  project: Project;
}

const formatARS = (value: number) =>
  value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

const formatMonth = (month: string) => {
  const [yyyy, mm] = month.split('-');
  const date = new Date(Number(yyyy), Number(mm) - 1, 1);
  return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
};

export function FinanceSection({ project }: FinanceSectionProps) {
  const { invoices, addInvoice, addTransaction, categories } = useFinance();
  const { payments, fetchPayments, generatePayments, markPaymentPaid, markPaymentPending, updatePaymentPaidDate, updatePaymentAmount, deletePayment, linkPaymentInvoice } = useProjects();
  const [generating, setGenerating] = useState(false);
  const [creatingInvoiceFor, setCreatingInvoiceFor] = useState<string | null>(null);
  const [editingPaidDate, setEditingPaidDate] = useState<string | null>(null);
  const [editPaidDateValue, setEditPaidDateValue] = useState('');
  const [editingAmount, setEditingAmount] = useState<string | null>(null);
  const [editAmountValue, setEditAmountValue] = useState('');

  useEffect(() => {
    fetchPayments(project.id);
  }, [project.id, fetchPayments]);

  const projectInvoices = useMemo(() => {
    if (!project.clientId) return [];
    return invoices.filter((inv) => inv.clientId === project.clientId);
  }, [invoices, project.clientId]);

  const summary = useMemo(() => {
    const totalFacturado = projectInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalCobrado = projectInvoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total, 0);
    const pendiente = totalFacturado - totalCobrado;
    return { totalFacturado, totalCobrado, pendiente };
  }, [projectInvoices]);

  const paymentSummary = useMemo(() => {
    const totalProyecto = payments.reduce((sum, p) => sum + p.amount, 0);
    const cobrado = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
    const pendiente = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
    return { totalProyecto, cobrado, pendiente };
  }, [payments]);

  const invoiceMap = useMemo(() => {
    const map: Record<string, { invoiceNumber: string; status: string }> = {};
    for (const inv of invoices) {
      map[inv.id] = { invoiceNumber: inv.invoiceNumber, status: inv.status };
    }
    return map;
  }, [invoices]);


  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generatePayments(project.id);
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkPaid = async (payment: ProjectPayment) => {
    await markPaymentPaid(payment.id);
    // Auto-create cash flow transaction
    const incomeCategory = categories.find(c => c.type === 'income');
    if (incomeCategory) {
      const today = new Date().toISOString().split('T')[0];
      await addTransaction({
        type: 'income',
        categoryId: incomeCategory.id,
        amount: payment.amount,
        description: `Cuota ${formatMonth(payment.month)} — ${project.name}`,
        date: today,
        invoiceId: null,
        clientId: project.clientId || null,
        projectId: project.id,
        paymentId: payment.id,
      });
    }
  };

  const handleCreateInvoice = async (payment: ProjectPayment) => {
    if (!project.clientId) return;
    setCreatingInvoiceFor(payment.id);
    try {
      const today = new Date().toISOString().split('T')[0];
      const description = `Cuota ${formatMonth(payment.month)} — ${project.name}`;
      const invoice = await addInvoice(
        {
          clientId: project.clientId,
          status: 'paid',
          issueDate: payment.paidDate || today,
          dueDate: payment.paidDate || today,
          paidDate: payment.paidDate || today,
          subtotal: payment.amount,
          tax: 0,
          total: payment.amount,
          notes: `Cuota mensual del proyecto ${project.name}`,
        },
        [
          {
            description,
            quantity: 1,
            unitPrice: payment.amount,
            total: payment.amount,
          },
        ]
      );
      if (invoice) {
        await linkPaymentInvoice(payment.id, invoice.id);
      }
    } catch (err) {
      console.error('Error creating invoice from payment:', err);
    } finally {
      setCreatingInvoiceFor(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Monthly Payments */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-purple-500" />
            Cuotas Mensuales
          </h4>
          {project.monthlyFee && project.startDate && (project.estimatedEndDate || project.actualEndDate) && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-primary btn-sm flex items-center gap-1"
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Generar cuotas
            </button>
          )}
        </div>

        {!project.monthlyFee ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            Configura el fee mensual en los datos del proyecto para gestionar cuotas.
          </p>
        ) : payments.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No hay cuotas generadas. Usa el boton "Generar cuotas" para crearlas automaticamente.
          </p>
        ) : (
          <>
            {/* Payment summary */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Fee mensual</p>
                <p className="text-lg font-bold text-purple-700 dark:text-purple-400">{formatARS(project.monthlyFee)}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total proyecto</p>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{formatARS(paymentSummary.totalProyecto)}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cobrado</p>
                <p className="text-lg font-bold text-green-700 dark:text-green-400">{formatARS(paymentSummary.cobrado)}</p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pendiente</p>
                <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">{formatARS(paymentSummary.pendiente)}</p>
              </div>
            </div>

            {/* Payment table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-2 font-medium">Mes</th>
                    <th className="pb-2 font-medium">Monto</th>
                    <th className="pb-2 font-medium">Estado</th>
                    <th className="pb-2 font-medium">Fecha de pago</th>
                    <th className="pb-2 font-medium">Factura</th>
                    <th className="pb-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {payments.map((payment) => {
                    const linkedInvoice = payment.invoiceId ? invoiceMap[payment.invoiceId] : null;
                    return (
                      <tr key={payment.id} className="text-gray-700 dark:text-gray-300">
                        <td className="py-2 font-medium capitalize">{formatMonth(payment.month)}</td>
                        <td className="py-2">
                          {editingAmount === payment.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={editAmountValue}
                                onChange={e => setEditAmountValue(e.target.value)}
                                className="input text-xs py-0.5 px-1 w-28"
                                autoFocus
                                min="0"
                                step="0.01"
                              />
                              <button
                                onClick={async () => {
                                  const val = parseFloat(editAmountValue);
                                  if (!isNaN(val) && val >= 0) {
                                    await updatePaymentAmount(payment.id, val);
                                  }
                                  setEditingAmount(null);
                                }}
                                className="text-xs text-green-600 font-medium"
                              >
                                OK
                              </button>
                              <button
                                onClick={() => setEditingAmount(null)}
                                className="text-xs text-gray-400"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingAmount(payment.id); setEditAmountValue(String(payment.amount)); }}
                              className="hover:text-primary-600 hover:underline transition-colors"
                              title="Editar monto"
                            >
                              {formatARS(payment.amount)}
                            </button>
                          )}
                        </td>
                        <td className="py-2">
                          {payment.status === 'paid' ? (
                            <span className="badge-success text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Cobrado
                            </span>
                          ) : (
                            <span className="badge-warning text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <Circle className="w-3 h-3" /> Pendiente
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-gray-500 dark:text-gray-400">
                          {editingPaidDate === payment.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="date"
                                value={editPaidDateValue}
                                onChange={e => setEditPaidDateValue(e.target.value)}
                                className="input text-xs py-0.5 px-1 w-32"
                                autoFocus
                              />
                              <button
                                onClick={async () => {
                                  if (editPaidDateValue) {
                                    await updatePaymentPaidDate(payment.id, editPaidDateValue);
                                  }
                                  setEditingPaidDate(null);
                                }}
                                className="text-xs text-green-600 font-medium"
                              >
                                OK
                              </button>
                              <button
                                onClick={() => setEditingPaidDate(null)}
                                className="text-xs text-gray-400"
                              >
                                ✕
                              </button>
                            </div>
                          ) : payment.paidDate ? (
                            <button
                              onClick={() => { setEditingPaidDate(payment.id); setEditPaidDateValue(payment.paidDate!); }}
                              className="hover:text-primary-600 hover:underline transition-colors"
                              title="Editar fecha de cobro"
                            >
                              {new Date(payment.paidDate + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </button>
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                        <td className="py-2">
                          {linkedInvoice ? (
                            <a
                              href={`/finance/invoices`}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                            >
                              <Link2 className="w-3 h-3" />
                              {linkedInvoice.invoiceNumber}
                            </a>
                          ) : payment.status === 'paid' && project.clientId ? (
                            <button
                              onClick={() => handleCreateInvoice(payment)}
                              disabled={creatingInvoiceFor === payment.id}
                              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium inline-flex items-center gap-1"
                            >
                              {creatingInvoiceFor === payment.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Receipt className="w-3 h-3" />
                              )}
                              Generar factura
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            {payment.status === 'pending' ? (
                              <button
                                onClick={() => handleMarkPaid(payment)}
                                className="text-xs text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 font-medium"
                              >
                                Marcar cobrado
                              </button>
                            ) : (
                              <button
                                onClick={() => markPaymentPending(payment.id)}
                                className="text-xs text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300 font-medium"
                              >
                                Marcar pendiente
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (confirm(`Eliminar cuota de ${formatMonth(payment.month)}?`)) {
                                  deletePayment(payment.id);
                                }
                              }}
                              className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              title="Eliminar cuota"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Invoices */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            Facturas del Proyecto
          </h4>
          <a
            href="/finance/invoices/new"
            className="btn-primary btn-sm flex items-center gap-1"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Crear Factura
          </a>
        </div>

        {!project.clientId ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            Este proyecto no tiene un cliente asignado. Asigne un cliente para ver las facturas asociadas.
          </p>
        ) : projectInvoices.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No hay facturas asociadas a este cliente.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-2 font-medium">Numero</th>
                  <th className="pb-2 font-medium">Fecha</th>
                  <th className="pb-2 font-medium">Vencimiento</th>
                  <th className="pb-2 font-medium">Total</th>
                  <th className="pb-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {projectInvoices.map((inv) => {
                  const statusMap: Record<string, { label: string; cls: string }> = {
                    draft: { label: 'Borrador', cls: 'badge-gray' },
                    issued: { label: 'Emitida', cls: 'badge-primary' },
                    paid: { label: 'Pagada', cls: 'badge-success' },
                    overdue: { label: 'Vencida', cls: 'badge-danger' },
                    cancelled: { label: 'Cancelada', cls: 'badge-gray' },
                  };
                  const st = statusMap[inv.status] || { label: inv.status, cls: 'badge-gray' };

                  return (
                    <tr key={inv.id} className="text-gray-700 dark:text-gray-300">
                      <td className="py-2 font-medium">{inv.invoiceNumber}</td>
                      <td className="py-2">
                        {new Date(inv.issueDate + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="py-2">
                        {new Date(inv.dueDate + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="py-2 font-medium">{formatARS(inv.total)}</td>
                      <td className="py-2">
                        <span className={`${st.cls} text-xs px-2 py-0.5 rounded-full`}>{st.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      {projectInvoices.length > 0 && (
        <div className="card p-5">
          <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Resumen de Facturacion
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ingresos total</p>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{formatARS(summary.totalFacturado)}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Cobrado</p>
              <p className="text-lg font-bold text-green-700 dark:text-green-400">{formatARS(summary.totalCobrado)}</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pendiente</p>
              <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">{formatARS(summary.pendiente)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
