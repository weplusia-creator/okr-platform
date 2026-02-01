// Finance Types

export interface Client {
  id: string;
  organizationId: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  cuit: string | null;
  industry: string | null;
  employeeCount: string | null;
  website: string | null;
  contactName: string | null;
  contactRole: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  organizationId: string;
  clientId: string;
  client?: Client;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  paidDate: string | null;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  items: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'income' | 'expense';

export interface CashFlowCategory {
  id: string;
  organizationId: string;
  name: string;
  type: TransactionType;
  color: string;
  createdAt: string;
}

export interface CashFlowTransaction {
  id: string;
  organizationId: string;
  categoryId: string;
  category?: CashFlowCategory;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  invoiceId: string | null;
  createdAt: string;
}

export interface FinanceFilters {
  startDate: string;
  endDate: string;
  clientId?: string;
  status?: InvoiceStatus | 'all';
  transactionType?: TransactionType | 'all';
  categoryId?: string;
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  pendingInvoices: number;
  pendingAmount: number;
  overdueInvoices: number;
  overdueAmount: number;
}

export interface ClientBalance {
  clientId: string;
  clientName: string;
  totalInvoiced: number;
  totalPaid: number;
  pendingBalance: number;
}

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
}
