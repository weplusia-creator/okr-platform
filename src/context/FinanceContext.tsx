import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { notifyMany } from '../lib/notify';
import type {
  Client,
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  CashFlowCategory,
  CashFlowTransaction,
  TransactionType,
  FinanceSummary,
  MonthlyData,
  RecurringExpense,
} from '../types/finance';
import { todayLocalISO } from '../utils/helpers';

interface FinanceContextType {
  // Clients
  clients: Client[];
  loadingClients: boolean;
  fetchClients: () => Promise<void>;
  addClient: (client: Omit<Client, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => Promise<Client | null>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<boolean>;
  deleteClient: (id: string) => Promise<void>;

  // Invoices
  invoices: Invoice[];
  loadingInvoices: boolean;
  fetchInvoices: () => Promise<void>;
  addInvoice: (invoice: Omit<Invoice, 'id' | 'organizationId' | 'invoiceNumber' | 'createdAt' | 'updatedAt' | 'items'>, items: Omit<InvoiceItem, 'id' | 'invoiceId'>[]) => Promise<Invoice | null>;
  updateInvoice: (id: string, updates: Partial<Invoice>, items?: Omit<InvoiceItem, 'id' | 'invoiceId'>[]) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  markInvoiceAsPaid: (id: string, paidDate: string) => Promise<void>;
  getClientInvoices: (clientId: string) => Invoice[];

  // Cash Flow
  categories: CashFlowCategory[];
  transactions: CashFlowTransaction[];
  loadingCashFlow: boolean;
  fetchCategories: () => Promise<void>;
  fetchTransactions: (startDate?: string, endDate?: string) => Promise<void>;
  addCategory: (category: Omit<CashFlowCategory, 'id' | 'organizationId' | 'createdAt'>) => Promise<CashFlowCategory | null>;
  deleteCategory: (id: string) => Promise<void>;
  addTransaction: (transaction: Omit<CashFlowTransaction, 'id' | 'organizationId' | 'createdAt'>) => Promise<CashFlowTransaction | null>;
  updateTransaction: (id: string, updates: Partial<CashFlowTransaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // Recurring Expenses
  recurringExpenses: RecurringExpense[];
  fetchRecurringExpenses: () => Promise<void>;
  addRecurringExpense: (expense: Omit<RecurringExpense, 'id' | 'organizationId' | 'createdAt'>) => Promise<RecurringExpense | null>;
  updateRecurringExpense: (id: string, updates: Partial<RecurringExpense>) => Promise<void>;
  deleteRecurringExpense: (id: string) => Promise<void>;
  generateMonthlyExpenses: (month: string, recurringExpenseId?: string) => Promise<number>;

  // Reports
  getFinanceSummary: () => FinanceSummary;
  getMonthlyData: (year: number) => MonthlyData[];
  getTopClients: (limit?: number) => { clientId: string; clientName: string; total: number }[];

  error: string | null;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const DEFAULT_CATEGORIES: { name: string; type: TransactionType; color: string }[] = [
  { name: 'Ventas', type: 'income', color: '#10B981' },
  { name: 'Servicios', type: 'income', color: '#3B82F6' },
  { name: 'Otros ingresos', type: 'income', color: '#8B5CF6' },
  { name: 'Sueldos', type: 'expense', color: '#EF4444' },
  { name: 'Alquiler', type: 'expense', color: '#F59E0B' },
  { name: 'Servicios públicos', type: 'expense', color: '#EC4899' },
  { name: 'Impuestos', type: 'expense', color: '#6366F1' },
  { name: 'Proveedores', type: 'expense', color: '#14B8A6' },
  { name: 'Otros gastos', type: 'expense', color: '#6B7280' },
];

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { organization, appUser } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [categories, setCategories] = useState<CashFlowCategory[]>([]);
  const [transactions, setTransactions] = useState<CashFlowTransaction[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingCashFlow, setLoadingCashFlow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===== CLIENTS =====
  const fetchClients = useCallback(async () => {
    if (!organization?.id) return;
    setLoadingClients(true);
    try {
      const { data, error: err } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');

      if (err) throw err;

      setClients((data || []).map((c: any) => ({
        id: c.id,
        organizationId: c.organization_id,
        name: c.name,
        company: c.company,
        email: c.email,
        phone: c.phone,
        address: c.address,
        cuit: c.cuit ?? null,
        tipoDocumento: c.tipo_documento ?? null,
        condicionIva: c.condicion_iva ?? null,
        industry: c.industry ?? null,
        employeeCount: c.employee_count ?? null,
        website: c.website ?? null,
        contactName: c.contact_name ?? null,
        contactRole: c.contact_role ?? null,
        logoUrl: c.logo_url ?? null,
        notes: c.notes,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })));
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('Error al cargar clientes');
    } finally {
      setLoadingClients(false);
    }
  }, [organization?.id]);

  const addClient = useCallback(async (client: Omit<Client, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>): Promise<Client | null> => {
    if (!organization?.id) {
      console.error('[addClient] No organization id');
      return null;
    }
    try {
      const row: Record<string, unknown> = {
        organization_id: organization.id,
        name: client.name,
        company: client.company || null,
        email: client.email || null,
        phone: client.phone || null,
        address: client.address || null,
        notes: client.notes || null,
      };
      if (client.cuit != null) row.cuit = client.cuit;
      if (client.industry != null) row.industry = client.industry;
      if (client.employeeCount != null) row.employee_count = client.employeeCount;
      if (client.website != null) row.website = client.website;
      if (client.contactName != null) row.contact_name = client.contactName;
      if (client.contactRole != null) row.contact_role = client.contactRole;

      const { data: inserted, error: insertErr } = await supabase
        .from('clients')
        .insert(row)
        .select()
        .single();

      if (insertErr) throw new Error(insertErr.message);
      if (!inserted) throw new Error('No se pudo crear el cliente');

      await fetchClients();

      const fullClient: Client = {
        id: inserted.id,
        organizationId: inserted.organization_id,
        name: inserted.name,
        company: inserted.company ?? null,
        email: inserted.email ?? null,
        phone: inserted.phone ?? null,
        address: inserted.address ?? null,
        cuit: inserted.cuit ?? null,
        tipoDocumento: inserted.tipo_documento ?? null,
        condicionIva: inserted.condicion_iva ?? null,
        industry: inserted.industry ?? null,
        employeeCount: inserted.employee_count ?? null,
        website: inserted.website ?? null,
        contactName: inserted.contact_name ?? null,
        contactRole: inserted.contact_role ?? null,
        logoUrl: inserted.logo_url ?? null,
        notes: inserted.notes ?? null,
        createdAt: inserted.created_at,
        updatedAt: inserted.updated_at,
      };
      return fullClient;
    } catch (err: any) {
      console.error('[addClient] Error:', err);
      setError(err?.message || 'Error al crear cliente');
      return null;
    }
  }, [organization?.id, fetchClients]);

  const updateClient = useCallback(async (id: string, updates: Partial<Client>): Promise<boolean> => {
    try {
      const row: Record<string, unknown> = {};
      if (updates.name !== undefined) row.name = updates.name;
      if (updates.company !== undefined) row.company = updates.company;
      if (updates.email !== undefined) row.email = updates.email;
      if (updates.phone !== undefined) row.phone = updates.phone;
      if (updates.address !== undefined) row.address = updates.address;
      if (updates.cuit !== undefined) row.cuit = updates.cuit;
      if (updates.industry !== undefined) row.industry = updates.industry;
      if (updates.employeeCount !== undefined) row.employee_count = updates.employeeCount;
      if (updates.website !== undefined) row.website = updates.website;
      if (updates.contactName !== undefined) row.contact_name = updates.contactName;
      if (updates.contactRole !== undefined) row.contact_role = updates.contactRole;
      if (updates.notes !== undefined) row.notes = updates.notes;

      if (Object.keys(row).length === 0) return true;

      const { error: err } = await supabase
        .from('clients')
        .update(row as any)
        .eq('id', id);

      if (err) throw err;

      setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      return true;
    } catch (err: any) {
      console.error('Error updating client:', err?.message || err);
      setError('Error al actualizar cliente');
      return false;
    }
  }, []);

  const deleteClient = useCallback(async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (err) throw err;

      setClients(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting client:', err);
      setError('Error al eliminar cliente');
    }
  }, []);

  // ===== INVOICES =====
  const fetchInvoices = useCallback(async () => {
    if (!organization?.id) return;
    setLoadingInvoices(true);
    try {
      const { data: invoicesData, error: invErr } = await supabase
        .from('invoices')
        .select('*, clients(name, company)')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (invErr) throw invErr;

      const invoiceIds = invoicesData?.map(i => i.id) || [];
      let itemsData: any[] = [];

      if (invoiceIds.length > 0) {
        const { data: items, error: itemsErr } = await supabase
          .from('invoice_items')
          .select('*')
          .in('invoice_id', invoiceIds);

        if (itemsErr) throw itemsErr;
        itemsData = items || [];
      }

      setInvoices((invoicesData || []).map(inv => ({
        id: inv.id,
        organizationId: inv.organization_id,
        clientId: inv.client_id,
        client: inv.clients ? {
          id: inv.client_id,
          organizationId: inv.organization_id,
          name: inv.clients.name,
          company: inv.clients.company,
          email: null,
          phone: null,
          address: null,
          notes: null,
          createdAt: '',
          updatedAt: '',
        } : undefined,
        invoiceNumber: inv.invoice_number,
        status: inv.status as InvoiceStatus,
        issueDate: inv.issue_date,
        dueDate: inv.due_date,
        paidDate: inv.paid_date,
        subtotal: inv.subtotal,
        tax: inv.tax,
        total: inv.total,
        notes: inv.notes,
        items: itemsData
          .filter(item => item.invoice_id === inv.id)
          .map(item => ({
            id: item.id,
            invoiceId: item.invoice_id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            total: item.total,
          })),
        arcaStatus: inv.arca_status || null,
        cae: inv.cae || null,
        caeVencimiento: inv.cae_vencimiento || null,
        createdAt: inv.created_at,
        updatedAt: inv.updated_at,
      })));
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError('Error al cargar facturas');
    } finally {
      setLoadingInvoices(false);
    }
  }, [organization?.id]);

  const addInvoice = useCallback(async (
    invoice: Omit<Invoice, 'id' | 'organizationId' | 'invoiceNumber' | 'createdAt' | 'updatedAt' | 'items'>,
    items: Omit<InvoiceItem, 'id' | 'invoiceId'>[]
  ): Promise<Invoice | null> => {
    if (!organization?.id) {
      throw new Error('No se encontró la organización. Recargá la página.');
    }
    // Generate invoice number
    const year = new Date().getFullYear();
    const { count, error: countErr } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
      .gte('created_at', `${year}-01-01`);

    if (countErr) {
      console.error('Error counting invoices:', countErr);
      throw new Error(countErr.message || 'Error al generar número de factura.');
    }

    const invoiceNumber = `FAC-${year}-${String((count || 0) + 1).padStart(4, '0')}`;

    const { data: invData, error: invErr } = await supabase
      .from('invoices')
      .insert({
        organization_id: organization.id,
        client_id: invoice.clientId,
        invoice_number: invoiceNumber,
        status: invoice.status,
        issue_date: invoice.issueDate,
        due_date: invoice.dueDate,
        paid_date: invoice.paidDate,
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        total: invoice.total,
        notes: invoice.notes,
      })
      .select()
      .single();

    if (invErr) {
      console.error('Error inserting invoice:', invErr);
      throw new Error(invErr.message || 'Error al crear la factura.');
    }
    if (!invData) throw new Error('No se pudo crear la factura');

    // Insert items
    if (items.length > 0) {
      const { error: itemsErr } = await supabase
        .from('invoice_items')
        .insert(items.map(item => ({
          invoice_id: invData.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.total,
        })));

      if (itemsErr) {
        console.error('Error inserting invoice items:', itemsErr);
        throw new Error(itemsErr.message || 'Error al guardar los items de la factura.');
      }
    }

    await fetchInvoices();
    return invoices.find(i => i.id === invData.id) || null;
  }, [organization?.id, fetchInvoices, invoices]);

  const updateInvoice = useCallback(async (
    id: string,
    updates: Partial<Invoice>,
    items?: Omit<InvoiceItem, 'id' | 'invoiceId'>[]
  ) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.clientId !== undefined) dbUpdates.client_id = updates.clientId;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.issueDate !== undefined) dbUpdates.issue_date = updates.issueDate;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
      if (updates.paidDate !== undefined) dbUpdates.paid_date = updates.paidDate;
      if (updates.subtotal !== undefined) dbUpdates.subtotal = updates.subtotal;
      if (updates.tax !== undefined) dbUpdates.tax = updates.tax;
      if (updates.total !== undefined) dbUpdates.total = updates.total;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

      if (Object.keys(dbUpdates).length > 0) {
        const { error: err } = await supabase
          .from('invoices')
          .update(dbUpdates)
          .eq('id', id);

        if (err) throw err;
      }

      // Update items if provided
      if (items) {
        // Delete existing items
        const { error: delItemsErr } = await supabase.from('invoice_items').delete().eq('invoice_id', id);
        if (delItemsErr) throw delItemsErr;

        // Insert new items
        if (items.length > 0) {
          const { error: itemsErr } = await supabase
            .from('invoice_items')
            .insert(items.map(item => ({
              invoice_id: id,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              total: item.total,
            })));

          if (itemsErr) throw itemsErr;
        }
      }

      await fetchInvoices();
    } catch (err) {
      console.error('Error updating invoice:', err);
      setError('Error al actualizar factura');
    }
  }, [fetchInvoices]);

  const deleteInvoice = useCallback(async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (err) throw err;

      setInvoices(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error('Error deleting invoice:', err);
      setError('Error al eliminar factura');
    }
  }, []);

  const markInvoiceAsPaid = useCallback(async (id: string, paidDate: string) => {
    try {
      const { error: err } = await supabase
        .from('invoices')
        .update({ status: 'paid', paid_date: paidDate })
        .eq('id', id);

      if (err) throw err;

      // Create income transaction
      const invoice = invoices.find(i => i.id === id);
      if (invoice && organization?.id) {
        const incomeCategory = categories.find(c => c.type === 'income');
        if (incomeCategory) {
          const { error: txErr } = await supabase.from('cash_flow_transactions').insert({
            organization_id: organization.id,
            category_id: incomeCategory.id,
            type: 'income',
            amount: invoice.total,
            description: `Pago factura ${invoice.invoiceNumber}`,
            date: paidDate,
            invoice_id: id,
          });
          if (txErr) throw txErr;
          await fetchTransactions();
        }
      }

      // Notify admin users
      if (organization?.id && appUser?.id && invoice) {
        const { data: admins } = await supabase
          .from('users')
          .select('id')
          .eq('organization_id', organization.id)
          .in('role', ['admin', 'super_admin'])
          .neq('id', appUser.id);

        if (admins && admins.length > 0) {
          notifyMany(admins.map(a => a.id), {
            organizationId: organization.id,
            type: 'finance',
            title: `Factura cobrada: ${invoice.invoiceNumber}`,
            entityType: 'invoice',
            entityId: id,
            actionUrl: '/finance/invoices',
          });
        }
      }

      await fetchInvoices();
    } catch (err) {
      console.error('Error marking invoice as paid:', err);
      setError('Error al marcar factura como pagada');
    }
  }, [invoices, categories, organization?.id, appUser?.id, fetchInvoices]);

  const getClientInvoices = useCallback((clientId: string) => {
    return invoices.filter(i => i.clientId === clientId);
  }, [invoices]);

  // ===== CASH FLOW =====
  const fetchCategories = useCallback(async () => {
    if (!organization?.id) return;
    try {
      const { data, error: err } = await supabase
        .from('cash_flow_categories')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');

      if (err) throw err;

      if (!data || data.length === 0) {
        // Create default categories
        const { data: newCats, error: insertErr } = await supabase
          .from('cash_flow_categories')
          .insert(DEFAULT_CATEGORIES.map(c => ({
            organization_id: organization.id,
            name: c.name,
            type: c.type,
            color: c.color,
          })))
          .select();

        if (insertErr) throw insertErr;

        setCategories((newCats || []).map(c => ({
          id: c.id,
          organizationId: c.organization_id,
          name: c.name,
          type: c.type as TransactionType,
          color: c.color,
          createdAt: c.created_at,
        })));
      } else {
        setCategories(data.map(c => ({
          id: c.id,
          organizationId: c.organization_id,
          name: c.name,
          type: c.type as TransactionType,
          color: c.color,
          createdAt: c.created_at,
        })));
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Error al cargar categorías');
    }
  }, [organization?.id]);

  const fetchTransactions = useCallback(async (startDate?: string, endDate?: string) => {
    if (!organization?.id) return;
    setLoadingCashFlow(true);
    try {
      let query = supabase
        .from('cash_flow_transactions')
        .select('*, cash_flow_categories(name, color)')
        .eq('organization_id', organization.id)
        .order('date', { ascending: false });
      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);
      const res = await query;
      if (res.error) throw res.error;
      const data = res.data;

      setTransactions((data || []).map(t => ({
        id: t.id,
        organizationId: t.organization_id,
        categoryId: t.category_id,
        category: t.cash_flow_categories ? {
          id: t.category_id,
          organizationId: t.organization_id,
          name: t.cash_flow_categories.name,
          type: t.type as TransactionType,
          color: t.cash_flow_categories.color,
          createdAt: '',
        } : undefined,
        type: t.type as TransactionType,
        amount: t.amount,
        description: t.description,
        date: t.date,
        invoiceId: t.invoice_id,
        clientId: t.client_id || null,
        projectId: t.project_id || null,
        paymentId: t.payment_id || null,
        paidBy: t.paid_by || null,
        invoicedBy: t.invoiced_by || null,
        recurringExpenseId: t.recurring_expense_id || null,
        clientName: undefined,
        projectName: undefined,
        createdAt: t.created_at,
      })));
    } catch (err) {
      // Silence table-not-found errors (migration may not have been run)
      const code = (err as any)?.code;
      if (code !== 'PGRST116' && code !== '42P01') {
        console.error('Error fetching transactions:', err);
        setError('Error al cargar transacciones');
      }
    } finally {
      setLoadingCashFlow(false);
    }
  }, [organization?.id]);

  const addCategory = useCallback(async (category: Omit<CashFlowCategory, 'id' | 'organizationId' | 'createdAt'>): Promise<CashFlowCategory | null> => {
    if (!organization?.id) return null;
    try {
      const { data, error: err } = await supabase
        .from('cash_flow_categories')
        .insert({
          organization_id: organization.id,
          name: category.name,
          type: category.type,
          color: category.color,
        })
        .select()
        .single();

      if (err) throw err;
      if (!data) throw new Error('No se pudo crear la categoría');

      const newCategory: CashFlowCategory = {
        id: data.id,
        organizationId: data.organization_id,
        name: data.name,
        type: data.type as TransactionType,
        color: data.color,
        createdAt: data.created_at,
      };

      setCategories(prev => [...prev, newCategory]);
      return newCategory;
    } catch (err) {
      console.error('Error adding category:', err);
      setError('Error al crear categoría');
      return null;
    }
  }, [organization?.id]);

  const deleteCategory = useCallback(async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('cash_flow_categories')
        .delete()
        .eq('id', id);

      if (err) throw err;

      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting category:', err);
      setError('Error al eliminar categoría');
    }
  }, []);

  const addTransaction = useCallback(async (transaction: Omit<CashFlowTransaction, 'id' | 'organizationId' | 'createdAt'>): Promise<CashFlowTransaction | null> => {
    if (!organization?.id) return null;
    try {
      const basePayload: Record<string, unknown> = {
        organization_id: organization.id,
        category_id: transaction.categoryId,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        date: transaction.date,
        invoice_id: transaction.invoiceId,
      };

      let data: any = null;

      // Try with extended columns first; fall back to base-only if columns don't exist
      try {
        const fullPayload: Record<string, unknown> = {
          ...basePayload,
          client_id: transaction.clientId || null,
          project_id: transaction.projectId || null,
          payment_id: transaction.paymentId || null,
          paid_by: transaction.paidBy || null,
          invoiced_by: transaction.invoicedBy || null,
        };
        if (transaction.recurringExpenseId) fullPayload.recurring_expense_id = transaction.recurringExpenseId;
        const res = await supabase
          .from('cash_flow_transactions')
          .insert(fullPayload)
          .select('*, cash_flow_categories(name, color)')
          .single();
        if (res.error) throw res.error;
        data = res.data;
      } catch {
        // Fallback: insert without optional FK columns
        const res = await supabase
          .from('cash_flow_transactions')
          .insert(basePayload)
          .select('*, cash_flow_categories(name, color)')
          .single();
        if (res.error) throw res.error;
        data = res.data;
      }

      if (!data) throw new Error('No se pudo crear la transacción');

      const newTransaction: CashFlowTransaction = {
        id: data.id,
        organizationId: data.organization_id,
        categoryId: data.category_id,
        category: data.cash_flow_categories ? {
          id: data.category_id,
          organizationId: data.organization_id,
          name: data.cash_flow_categories.name,
          type: data.type as TransactionType,
          color: data.cash_flow_categories.color,
          createdAt: '',
        } : undefined,
        type: data.type as TransactionType,
        amount: data.amount,
        description: data.description,
        date: data.date,
        invoiceId: data.invoice_id,
        clientId: data.client_id || null,
        projectId: data.project_id || null,
        paymentId: data.payment_id || null,
        paidBy: data.paid_by || null,
        invoicedBy: data.invoiced_by || null,
        createdAt: data.created_at,
      };

      setTransactions(prev => [newTransaction, ...prev]);

      // Notify admin users in the org (except the creator)
      if (organization?.id && appUser?.id) {
        const { data: admins } = await supabase
          .from('users')
          .select('id')
          .eq('organization_id', organization.id)
          .in('role', ['admin', 'super_admin'])
          .neq('id', appUser.id);

        if (admins && admins.length > 0) {
          const fmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
          notifyMany(admins.map(a => a.id), {
            organizationId: organization.id,
            type: 'finance',
            title: `Nueva ${newTransaction.type === 'income' ? 'ingreso' : 'gasto'}: ${newTransaction.description} ${fmt.format(newTransaction.amount)}`,
            entityType: 'transaction',
            entityId: newTransaction.id,
            actionUrl: '/finance/cash-flow',
          });
        }
      }

      return newTransaction;
    } catch (err) {
      console.error('Error adding transaction:', err);
      setError('Error al crear transacción');
      return null;
    }
  }, [organization?.id, appUser?.id]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<CashFlowTransaction>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.date !== undefined) dbUpdates.date = updates.date;

      if (updates.paidBy !== undefined) dbUpdates.paid_by = updates.paidBy;
      if (updates.invoicedBy !== undefined) dbUpdates.invoiced_by = updates.invoicedBy;

      // Try with optional FK columns; fall back without them
      const optionalUpdates: Record<string, unknown> = {};
      if (updates.clientId !== undefined) optionalUpdates.client_id = updates.clientId;
      if (updates.projectId !== undefined) optionalUpdates.project_id = updates.projectId;

      try {
        const { error: err } = await supabase
          .from('cash_flow_transactions')
          .update({ ...dbUpdates, ...optionalUpdates })
          .eq('id', id);
        if (err) throw err;
      } catch {
        // Fallback without optional FK columns
        if (Object.keys(dbUpdates).length > 0) {
          const { error: err } = await supabase
            .from('cash_flow_transactions')
            .update(dbUpdates)
            .eq('id', id);
          if (err) throw err;
        }
      }

      await fetchTransactions();
    } catch (err) {
      console.error('Error updating transaction:', err);
      setError('Error al actualizar transacción');
    }
  }, [fetchTransactions]);

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('cash_flow_transactions')
        .delete()
        .eq('id', id);

      if (err) throw err;

      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setError('Error al eliminar transacción');
    }
  }, []);

  // ===== RECURRING EXPENSES =====
  const fetchRecurringExpenses = useCallback(async () => {
    if (!organization?.id) return;
    try {
      const { data, error: err } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('organization_id', organization.id)
        .order('description');

      if (err) throw err;

      setRecurringExpenses((data || []).map((r: any) => ({
        id: r.id,
        organizationId: r.organization_id,
        description: r.description,
        amount: Number(r.amount),
        categoryId: r.category_id,
        paidBy: r.paid_by,
        active: r.active,
        createdAt: r.created_at,
      })));
    } catch (err) {
      console.error('Error fetching recurring expenses:', err);
    }
  }, [organization?.id]);

  const addRecurringExpense = useCallback(async (expense: Omit<RecurringExpense, 'id' | 'organizationId' | 'createdAt'>): Promise<RecurringExpense | null> => {
    if (!organization?.id) return null;
    try {
      const { data, error: err } = await supabase
        .from('recurring_expenses')
        .insert({
          organization_id: organization.id,
          description: expense.description,
          amount: expense.amount,
          category_id: expense.categoryId,
          paid_by: expense.paidBy,
          active: expense.active,
        })
        .select()
        .single();

      if (err) throw err;
      if (!data) throw new Error('No se pudo crear el costo fijo');

      const newExpense: RecurringExpense = {
        id: data.id,
        organizationId: data.organization_id,
        description: data.description,
        amount: Number(data.amount),
        categoryId: data.category_id,
        paidBy: data.paid_by,
        active: data.active,
        createdAt: data.created_at,
      };

      setRecurringExpenses(prev => [...prev, newExpense]);
      return newExpense;
    } catch (err) {
      console.error('Error adding recurring expense:', err);
      setError('Error al crear costo fijo');
      return null;
    }
  }, [organization?.id]);

  const updateRecurringExpense = useCallback(async (id: string, updates: Partial<RecurringExpense>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
      if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
      if (updates.paidBy !== undefined) dbUpdates.paid_by = updates.paidBy;
      if (updates.active !== undefined) dbUpdates.active = updates.active;

      if (Object.keys(dbUpdates).length === 0) return;

      const { error: err } = await supabase
        .from('recurring_expenses')
        .update(dbUpdates)
        .eq('id', id);

      if (err) throw err;

      setRecurringExpenses(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    } catch (err) {
      console.error('Error updating recurring expense:', err);
      setError('Error al actualizar costo fijo');
    }
  }, []);

  const deleteRecurringExpense = useCallback(async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('recurring_expenses')
        .delete()
        .eq('id', id);

      if (err) throw err;

      setRecurringExpenses(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Error deleting recurring expense:', err);
      setError('Error al eliminar costo fijo');
    }
  }, []);

  const generateMonthlyExpenses = useCallback(async (month: string, recurringExpenseId?: string): Promise<number> => {
    if (!organization?.id) return 0;
    try {
      const targetExpenses = recurringExpenseId
        ? recurringExpenses.filter(r => r.id === recurringExpenseId)
        : recurringExpenses.filter(r => r.active);
      if (targetExpenses.length === 0) return 0;

      // Check which recurring expenses already have transactions for this month
      const monthStart = `${month}-01`;
      const [mYear, mMonth] = month.split('-').map(Number);
      const lastDay = new Date(mYear, mMonth, 0).getDate();
      const monthEnd = `${month}-${String(lastDay).padStart(2, '0')}`;

      const { data: existing, error: existErr } = await supabase
        .from('cash_flow_transactions')
        .select('recurring_expense_id')
        .eq('organization_id', organization.id)
        .not('recurring_expense_id', 'is', null)
        .gte('date', monthStart)
        .lte('date', monthEnd);

      if (existErr) throw existErr;

      const existingIds = new Set((existing || []).map((t: any) => t.recurring_expense_id));

      const missing = targetExpenses.filter(r => !existingIds.has(r.id));
      if (missing.length === 0) return 0;

      let created = 0;
      for (const expense of missing) {
        // Try with recurring_expense_id first, fallback without it
        const basePayload: Record<string, unknown> = {
          organization_id: organization.id,
          category_id: expense.categoryId,
          type: 'expense',
          amount: expense.amount,
          description: expense.description,
          date: monthStart,
          paid_by: expense.paidBy,
        };

        let success = false;
        try {
          const { error: insertErr } = await supabase
            .from('cash_flow_transactions')
            .insert({ ...basePayload, recurring_expense_id: expense.id });
          if (insertErr) throw insertErr;
          success = true;
        } catch {
          // Fallback: insert without recurring_expense_id column
          const { error: insertErr2 } = await supabase
            .from('cash_flow_transactions')
            .insert(basePayload);
          if (!insertErr2) success = true;
          else console.error('Error inserting recurring transaction:', insertErr2);
        }

        if (success) created++;
      }

      if (created > 0) await fetchTransactions();
      return created;
    } catch (err) {
      console.error('Error generating monthly expenses:', err);
      return 0;
    }
  }, [organization?.id, recurringExpenses, fetchTransactions]);

  // ===== REPORTS =====
  const getFinanceSummary = useCallback((): FinanceSummary => {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const pendingInvoices = invoices.filter(i => i.status === 'issued');
    const overdueInvoices = invoices.filter(i => i.status === 'overdue');

    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      pendingInvoices: pendingInvoices.length,
      pendingAmount: pendingInvoices.reduce((sum, i) => sum + i.total, 0),
      overdueInvoices: overdueInvoices.length,
      overdueAmount: overdueInvoices.reduce((sum, i) => sum + i.total, 0),
    };
  }, [transactions, invoices]);

  const getMonthlyData = useCallback((year: number): MonthlyData[] => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    return months.map((month, index) => {
      const monthStr = String(index + 1).padStart(2, '0');
      const startDate = `${year}-${monthStr}-01`;
      // Last day of month: day 0 of next month = last day of current month
      const lastDay = new Date(year, index + 1, 0).getDate();
      const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

      const monthTransactions = transactions.filter(t =>
        t.date >= startDate && t.date <= endDate
      );

      return {
        month,
        income: monthTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0),
        expenses: monthTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0),
      };
    });
  }, [transactions]);

  const getTopClients = useCallback((limit: number = 5) => {
    const clientTotals = new Map<string, { name: string; total: number }>();

    invoices
      .filter(i => i.status === 'paid')
      .forEach(inv => {
        const current = clientTotals.get(inv.clientId) || {
          name: inv.client?.name || 'Cliente desconocido',
          total: 0
        };
        clientTotals.set(inv.clientId, {
          name: current.name,
          total: current.total + inv.total,
        });
      });

    return Array.from(clientTotals.entries())
      .map(([clientId, data]) => ({
        clientId,
        clientName: data.name,
        total: data.total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  }, [invoices]);

  // Load initial data
  useEffect(() => {
    if (organization?.id) {
      fetchClients();
      fetchInvoices();
      fetchCategories();
      fetchTransactions();
      fetchRecurringExpenses();
    }
  }, [organization?.id, fetchClients, fetchInvoices, fetchCategories, fetchTransactions, fetchRecurringExpenses]);

  // Check for overdue invoices once after initial load
  const overdueCheckedRef = useRef(false);
  useEffect(() => {
    if (invoices.length === 0 || overdueCheckedRef.current) return;
    overdueCheckedRef.current = true;

    const checkOverdue = async () => {
      const today = todayLocalISO();
      const overdueIds = invoices
        .filter(i => i.status === 'issued' && i.dueDate < today)
        .map(i => i.id);

      if (overdueIds.length > 0) {
        await supabase
          .from('invoices')
          .update({ status: 'overdue' })
          .in('id', overdueIds);

        await fetchInvoices();
      }
    };

    checkOverdue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices]);

  const value: FinanceContextType = {
    clients,
    loadingClients,
    fetchClients,
    addClient,
    updateClient,
    deleteClient,
    invoices,
    loadingInvoices,
    fetchInvoices,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    markInvoiceAsPaid,
    getClientInvoices,
    categories,
    transactions,
    loadingCashFlow,
    fetchCategories,
    fetchTransactions,
    addCategory,
    deleteCategory,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    recurringExpenses,
    fetchRecurringExpenses,
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    generateMonthlyExpenses,
    getFinanceSummary,
    getMonthlyData,
    getTopClients,
    error,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
