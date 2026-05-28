import { useState, useMemo, useCallback, useEffect, type FormEvent } from 'react';
import {
  ArrowLeftRight,
  Check,
  Plus,
  Trash2,
  DollarSign,
  Calendar,
  Loader2,
  X,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useProjects } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { TransactionType } from '../../types/finance';
import { todayLocalISO, parseLocalDate } from '../../utils/helpers';

import { toast } from '../../components/ui/toast';
import { confirmDialog } from '../../components/ui/confirm';
const SOCIOS = [
  { id: 'mateo', name: 'Mateo' },
  { id: 'dionisio', name: 'Dionisio' },
];

interface Settlement {
  id: string;
  organizationId: string;
  paidBy: string;
  paidTo: string;
  amount: number;
  date: string;
  notes: string | null;
  createdAt: string;
}

export function Saldos() {
  const { transactions, categories, clients, addTransaction } = useFinance();
  const { projects } = useProjects();
  const { organization, isAdmin } = useAuth();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settlementForm, setSettlementForm] = useState({
    amount: '',
    paidBy: '',
    paidTo: '',
    date: todayLocalISO(),
    notes: '',
  });

  // Transaction shortcut
  const [showDetail, setShowDetail] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const [txForm, setTxForm] = useState({
    type: 'expense' as TransactionType,
    categoryId: '',
    amount: '',
    description: '',
    date: todayLocalISO(),
    paidBy: '',
    clientId: '',
    projectId: '',
  });

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const openNewTransaction = (type: TransactionType) => {
    const defaultCategory = categories.find(c => c.type === type);
    setTxForm({
      type,
      categoryId: defaultCategory?.id || '',
      amount: '',
      description: '',
      date: todayLocalISO(),
      paidBy: '',
      clientId: '',
      projectId: '',
    });
    setShowTransactionModal(true);
  };

  const handleSaveTransaction = async (e: FormEvent) => {
    e.preventDefault();
    if (!txForm.categoryId || !txForm.amount || !txForm.description || !txForm.paidBy) return;
    setTxLoading(true);
    try {
      await addTransaction({
        type: txForm.type,
        categoryId: txForm.categoryId,
        amount: parseFloat(txForm.amount),
        description: txForm.description,
        date: txForm.date,
        invoiceId: null,
        clientId: txForm.clientId || null,
        projectId: txForm.projectId || null,
        paidBy: txForm.paidBy,
        paymentId: null,
      });
      setShowTransactionModal(false);
    } finally {
      setTxLoading(false);
    }
  };

  // Fetch settlements
  const fetchSettlements = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('partner_settlements')
        .select('*')
        .eq('organization_id', organization.id)
        .order('date', { ascending: false });

      if (error) throw error;

      setSettlements((data || []).map((s: any) => ({
        id: s.id,
        organizationId: s.organization_id,
        paidBy: s.paid_by,
        paidTo: s.paid_to,
        amount: Number(s.amount),
        date: s.date,
        notes: s.notes,
        createdAt: s.created_at,
      })));
    } catch (err) {
      console.error('Error fetching settlements:', err);
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    fetchSettlements();
  }, [fetchSettlements]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return parseLocalDate(date).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  // Calculate balance from ALL transactions minus settlements
  const balance = useMemo(() => {
    const data: Record<string, { expenses: number; income: number }> = {};
    SOCIOS.forEach(s => { data[s.name] = { expenses: 0, income: 0 }; });

    let totalExpensesWithSocio = 0;
    let totalIncomeWithSocio = 0;

    transactions.forEach(t => {
      if (!t.paidBy) return;
      const socio = SOCIOS.find(s => s.name === t.paidBy);
      if (!socio) return;
      if (t.type === 'expense') {
        data[socio.name].expenses += t.amount;
        totalExpensesWithSocio += t.amount;
      } else {
        data[socio.name].income += t.amount;
        totalIncomeWithSocio += t.amount;
      }
    });

    // Each person's net = income collected - expenses paid
    const fairShare = (totalIncomeWithSocio - totalExpensesWithSocio) / 2;
    const balances = SOCIOS.map(s => {
      const net = data[s.name].income - data[s.name].expenses;
      return { name: s.name, expenses: data[s.name].expenses, income: data[s.name].income, net, diff: net - fairShare };
    });

    // Subtract settlements
    let settlementAdjustment = 0;
    settlements.forEach(s => {
      // If paidBy paid paidTo, paidBy's diff decreases (they gave money back)
      const debtorIdx = balances.findIndex(b => b.name === s.paidBy);
      const creditorIdx = balances.findIndex(b => b.name === s.paidTo);
      if (debtorIdx >= 0) balances[debtorIdx].diff -= s.amount;
      if (creditorIdx >= 0) balances[creditorIdx].diff += s.amount;
      settlementAdjustment += s.amount;
    });

    const debtor = balances.find(b => b.diff > 0.01);
    const creditor = balances.find(b => b.diff < -0.01);
    const amount = debtor ? Math.abs(debtor.diff) : 0;

    return {
      balances,
      debtor: debtor ? debtor.name : null,
      creditor: creditor ? creditor.name : null,
      amount,
      isSettled: amount < 1,
      totalSettled: settlementAdjustment,
    };
  }, [transactions, settlements]);

  // Group transactions by partner for the detail view
  const transactionsByPartner = useMemo(() => {
    const grouped: Record<string, typeof transactions> = {};
    SOCIOS.forEach(s => { grouped[s.name] = []; });

    transactions.forEach(t => {
      if (!t.paidBy) return;
      const socio = SOCIOS.find(s => s.name === t.paidBy);
      if (!socio) return;
      grouped[socio.name].push(t);
    });

    // Sort each group by date descending
    Object.keys(grouped).forEach(name => {
      grouped[name].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    return grouped;
  }, [transactions]);

  const openSettlementModal = (options?: { paidBy?: string; paidTo?: string; amount?: number }) => {
    setSettlementForm({
      amount: options?.amount ? String(Math.round(options.amount)) : '',
      paidBy: options?.paidBy || balance.debtor || SOCIOS[0].name,
      paidTo: options?.paidTo || balance.creditor || SOCIOS[1].name,
      date: todayLocalISO(),
      notes: '',
    });
    setShowModal(true);
  };

  const handleSettle = async (e: FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(settlementForm.amount);
    if (!organization?.id || !settlementForm.paidBy || !settlementForm.paidTo || !amount || amount <= 0) return;
    if (settlementForm.paidBy === settlementForm.paidTo) {
      toast.info('El pagador y el receptor no pueden ser el mismo socio.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('partner_settlements')
        .insert({
          organization_id: organization.id,
          paid_by: settlementForm.paidBy,
          paid_to: settlementForm.paidTo,
          amount: Math.round(amount * 100) / 100,
          date: settlementForm.date,
          notes: settlementForm.notes || null,
        });

      if (error) throw error;

      await fetchSettlements();
      setShowModal(false);
    } catch (err) {
      console.error('Error creating settlement:', err);
      toast.error('Error al registrar el saldo');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSettlement = async (id: string) => {
    if (!(await confirmDialog({ message: '¿Eliminar este registro de saldo? La deuda volverá a aparecer.', danger: true }))) return;
    try {
      const { error } = await supabase
        .from('partner_settlements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSettlements(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting settlement:', err);
    }
  };

  if (loading) {
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
            Saldos entre socios
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Balance y liquidación de deudas (reparto 50/50)
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => openNewTransaction('expense')} className="btn-secondary">
            <TrendingDown className="w-5 h-5" />
            Egreso
          </button>
          <button onClick={() => openNewTransaction('income')} className="btn-primary">
            <TrendingUp className="w-5 h-5" />
            Ingreso
          </button>
        </div>
      </div>

      {/* Balance Card */}
      <div className={`card p-8 text-center ${balance.isSettled ? 'ring-2 ring-success-500' : 'ring-2 ring-orange-400'}`}>
        {balance.isSettled ? (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
              <Check className="w-8 h-8 text-success-600" />
            </div>
            <h2 className="text-2xl font-bold text-success-600 mb-1">Están al día</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">No hay deuda pendiente entre socios</p>
            <button
              onClick={() => openSettlementModal()}
              className="btn-secondary"
            >
              <DollarSign className="w-4 h-4" />
              Registrar pago entre socios
            </button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <ArrowLeftRight className="w-8 h-8 text-orange-600" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              {balance.debtor} le debe a {balance.creditor}
            </p>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
              {formatCurrency(balance.amount)}
            </h2>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => openSettlementModal({
                  paidBy: balance.debtor || undefined,
                  paidTo: balance.creditor || undefined,
                  amount: balance.amount,
                })}
                className="btn-primary text-lg px-8 py-3"
              >
                <Check className="w-5 h-5" />
                Saldar deuda completa
              </button>
              <button
                onClick={() => openSettlementModal({
                  paidBy: balance.debtor || undefined,
                  paidTo: balance.creditor || undefined,
                })}
                className="btn-secondary text-lg px-6 py-3"
              >
                <DollarSign className="w-5 h-5" />
                Pago parcial
              </button>
            </div>
          </>
        )}
      </div>

      {/* Desglose por socio */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {balance.balances.map(b => (
          <div key={b.name} className="card p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{b.name}</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Gastos pagados (total histórico)</span>
                <span className="font-medium text-danger-600">{formatCurrency(b.expenses)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Ingresos cobrados (total histórico)</span>
                <span className="font-medium text-success-600">{formatCurrency(b.income)}</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Neto</span>
                <span className={`font-semibold ${b.net >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                  {formatCurrency(b.net)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detalle de deudas */}
      <div className="card p-5">
        <button
          onClick={() => setShowDetail(prev => !prev)}
          className="w-full flex items-center justify-between"
        >
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            Detalle de transacciones por socio
          </h3>
          {showDetail ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showDetail && (
          <div className="mt-4 space-y-6">
            {SOCIOS.map(socio => {
              const txs = transactionsByPartner[socio.name] || [];
              const expenses = txs.filter(t => t.type === 'expense');
              const incomes = txs.filter(t => t.type === 'income');
              const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
              const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);

              return (
                <div key={socio.id}>
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                    {socio.name}
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      ({txs.length} transacciones)
                    </span>
                  </h4>

                  {txs.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2">Sin transacciones registradas</p>
                  ) : (
                    <>
                      {/* Expenses */}
                      {expenses.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-danger-600 mb-1.5 uppercase tracking-wide">
                            Gastos pagados ({expenses.length})
                          </p>
                          <div className="space-y-1">
                            {expenses.map(t => (
                              <div key={t.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                                    {t.description}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <span>{formatDate(t.date)}</span>
                                    {t.category && <span>· {t.category.name}</span>}
                                    {t.clientName && <span>· {t.clientName}</span>}
                                    {t.projectName && <span>· {t.projectName}</span>}
                                  </div>
                                </div>
                                <span className="text-sm font-medium text-danger-600 ml-3 shrink-0">
                                  -{formatCurrency(t.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-end mt-1 pr-2">
                            <span className="text-xs font-semibold text-danger-600">
                              Total: -{formatCurrency(totalExpenses)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Income */}
                      {incomes.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-success-600 mb-1.5 uppercase tracking-wide">
                            Ingresos cobrados ({incomes.length})
                          </p>
                          <div className="space-y-1">
                            {incomes.map(t => (
                              <div key={t.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                                    {t.description}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <span>{formatDate(t.date)}</span>
                                    {t.category && <span>· {t.category.name}</span>}
                                    {t.clientName && <span>· {t.clientName}</span>}
                                    {t.projectName && <span>· {t.projectName}</span>}
                                  </div>
                                </div>
                                <span className="text-sm font-medium text-success-600 ml-3 shrink-0">
                                  +{formatCurrency(t.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-end mt-1 pr-2">
                            <span className="text-xs font-semibold text-success-600">
                              Total: +{formatCurrency(totalIncome)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Partner net */}
                      <div className="flex justify-end pr-2 pt-1 border-t border-gray-100 dark:border-gray-700">
                        <span className={`text-sm font-bold ${totalIncome - totalExpenses >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                          Neto: {formatCurrency(totalIncome - totalExpenses)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial de saldos */}
      <div className="card p-5">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          Historial de liquidaciones
        </h3>

        {settlements.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
            No hay liquidaciones registradas todavía.
          </p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {settlements.map(s => (
              <div key={s.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-success-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {s.paidBy} le pagó a {s.paidTo}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatDate(s.date)}</span>
                      {s.notes && <span>· {s.notes}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="font-semibold text-success-600">{formatCurrency(s.amount)}</span>
                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400">
                      Saldado
                    </span>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteSettlement(s.id)}
                      className="p-1.5 text-gray-400 hover:text-danger-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transaction Shortcut Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {txForm.type === 'income' ? 'Nuevo ingreso' : 'Nuevo egreso'}
              </h3>
              <button onClick={() => setShowTransactionModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-4">
              <div>
                <label className="label">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxForm(prev => ({ ...prev, type: 'income', categoryId: incomeCategories[0]?.id || '' }))}
                    className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 ${
                      txForm.type === 'income'
                        ? 'border-success-500 bg-success-50 dark:bg-success-900/20 text-success-600'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <TrendingUp className="w-5 h-5" />
                    Ingreso
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxForm(prev => ({ ...prev, type: 'expense', categoryId: expenseCategories[0]?.id || '' }))}
                    className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 ${
                      txForm.type === 'expense'
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
                  value={txForm.categoryId}
                  onChange={(e) => setTxForm(prev => ({ ...prev, categoryId: e.target.value }))}
                  className="input"
                  required
                >
                  <option value="">Seleccionar categoría</option>
                  {(txForm.type === 'income' ? incomeCategories : expenseCategories).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">
                  {txForm.type === 'expense' ? 'Pagado por' : 'Cobrado por'}
                </label>
                <select
                  value={txForm.paidBy}
                  onChange={(e) => setTxForm(prev => ({ ...prev, paidBy: e.target.value }))}
                  className="input"
                  required
                >
                  <option value="">Seleccionar socio</option>
                  {SOCIOS.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Monto</label>
                <input
                  type="number"
                  value={txForm.amount}
                  onChange={(e) => setTxForm(prev => ({ ...prev, amount: e.target.value }))}
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
                  value={txForm.description}
                  onChange={(e) => setTxForm(prev => ({ ...prev, description: e.target.value }))}
                  className="input"
                  placeholder="Descripción de la transacción"
                  required
                />
              </div>

              <div>
                <label className="label">Cliente <span className="text-gray-400 font-normal">(opcional)</span></label>
                <select
                  value={txForm.clientId}
                  onChange={(e) => setTxForm(prev => ({ ...prev, clientId: e.target.value }))}
                  className="input"
                >
                  <option value="">Sin cliente</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Proyecto <span className="text-gray-400 font-normal">(opcional)</span></label>
                <select
                  value={txForm.projectId}
                  onChange={(e) => setTxForm(prev => ({ ...prev, projectId: e.target.value }))}
                  className="input"
                >
                  <option value="">Sin proyecto</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Fecha</label>
                <input
                  type="date"
                  value={txForm.date}
                  onChange={(e) => setTxForm(prev => ({ ...prev, date: e.target.value }))}
                  className="input"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowTransactionModal(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={txLoading} className="btn-primary">
                  {txLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settlement Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Saldar deuda
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSettle} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Pagó</label>
                  <select
                    value={settlementForm.paidBy}
                    onChange={(e) => setSettlementForm(prev => ({ ...prev, paidBy: e.target.value }))}
                    className="input"
                    required
                  >
                    {SOCIOS.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Recibió</label>
                  <select
                    value={settlementForm.paidTo}
                    onChange={(e) => setSettlementForm(prev => ({ ...prev, paidTo: e.target.value }))}
                    className="input"
                    required
                  >
                    {SOCIOS.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Monto</label>
                <input
                  type="number"
                  value={settlementForm.amount}
                  onChange={(e) => setSettlementForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="input"
                  placeholder="0"
                  min="1"
                  step="1"
                  required
                  autoFocus
                />
                {balance.amount > 0 && !balance.isSettled && (
                  <p className="text-xs text-gray-400 mt-1">
                    Deuda total: {formatCurrency(balance.amount)}
                  </p>
                )}
              </div>

              <div>
                <label className="label">Concepto / Descripción</label>
                <input
                  type="text"
                  value={settlementForm.notes}
                  onChange={(e) => setSettlementForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="input"
                  placeholder="Ej: Transferencia bancaria, Efectivo, Pago parcial enero..."
                />
              </div>

              <div>
                <label className="label">Fecha del pago</label>
                <input
                  type="date"
                  value={settlementForm.date}
                  onChange={(e) => setSettlementForm(prev => ({ ...prev, date: e.target.value }))}
                  className="input"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={saving || !settlementForm.amount} className="btn-primary">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      <Check className="w-5 h-5" />
                      Confirmar pago
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
