import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import type { InvoiceStatus, InvoiceItem } from '../../types/finance';
import { todayLocalISO, toLocalISODate } from '../../utils/helpers';

interface FormItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export function InvoiceForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { clients, invoices, addInvoice, updateInvoice } = useFinance();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientId: searchParams.get('clientId') || '',
    status: 'draft' as InvoiceStatus,
    issueDate: todayLocalISO(),
    dueDate: toLocalISODate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    tax: 0,
    notes: '',
  });

  const [items, setItems] = useState<FormItem[]>([
    { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 },
  ]);

  useEffect(() => {
    if (isEditing) {
      const invoice = invoices.find(i => i.id === id);
      if (invoice) {
        setFormData({
          clientId: invoice.clientId,
          status: invoice.status,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          tax: invoice.tax,
          notes: invoice.notes || '',
        });
        setItems(
          invoice.items.map(item => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          }))
        );
      }
    }
  }, [id, invoices, isEditing]);

  const addItem = () => {
    setItems(prev => [
      ...prev,
      { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 },
    ]);
  };

  const removeItem = (itemId: string) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(item => item.id !== itemId));
    }
  };

  const updateItem = (itemId: string, field: keyof FormItem, value: string | number) => {
    setItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
  };

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }, [items]);

  const total = useMemo(() => {
    return subtotal + formData.tax;
  }, [subtotal, formData.tax]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.clientId || items.some(item => !item.description || item.unitPrice <= 0)) {
      return;
    }

    setLoading(true);

    try {
      const invoiceItems: Omit<InvoiceItem, 'id' | 'invoiceId'>[] = items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
      }));

      if (isEditing) {
        await updateInvoice(
          id!,
          {
            clientId: formData.clientId,
            status: formData.status,
            issueDate: formData.issueDate,
            dueDate: formData.dueDate,
            subtotal,
            tax: formData.tax,
            total,
            notes: formData.notes || null,
          },
          invoiceItems
        );
        navigate(`/finance/invoices/${id}`);
      } else {
        await addInvoice(
          {
            clientId: formData.clientId,
            status: formData.status,
            issueDate: formData.issueDate,
            dueDate: formData.dueDate,
            paidDate: null,
            subtotal,
            tax: formData.tax,
            total,
            notes: formData.notes || null,
          },
          invoiceItems
        );
        navigate('/finance/invoices');
      }
    } catch (err: any) {
      alert('Error al guardar factura: ' + (err?.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Editar factura' : 'Nueva factura'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isEditing ? 'Modifica los datos de la factura' : 'Completa los datos de la nueva factura'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6 space-y-6">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Información general
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">Cliente *</label>
              <select
                value={formData.clientId}
                onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                className="input"
                required
              >
                <option value="">Seleccionar cliente</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name} {client.company && `(${client.company})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Estado</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as InvoiceStatus }))}
                className="input"
              >
                <option value="draft">Borrador</option>
                <option value="issued">Emitida</option>
              </select>
            </div>

            <div>
              <label className="label">Fecha de emisión *</label>
              <input
                type="date"
                value={formData.issueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">Fecha de vencimiento *</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="input"
                required
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Items de la factura
            </h3>
            <button
              type="button"
              onClick={addItem}
              className="btn-secondary text-sm"
            >
              <Plus className="w-4 h-4" />
              Agregar item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 items-start p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex-1">
                  <label className="label text-xs">Descripción</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    className="input"
                    placeholder="Descripción del servicio o producto"
                    required
                  />
                </div>
                <div className="w-24">
                  <label className="label text-xs">Cantidad</label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                    className="input"
                    min="1"
                    step="1"
                    required
                  />
                </div>
                <div className="w-32">
                  <label className="label text-xs">Precio unit.</label>
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="input"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="w-32">
                  <label className="label text-xs">Total</label>
                  <div className="input bg-gray-100 dark:bg-gray-700">
                    {formatCurrency(item.quantity * item.unitPrice)}
                  </div>
                </div>
                <div className="pt-6">
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                    className="p-2 text-gray-400 hover:text-danger-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Impuestos</span>
                  <input
                    type="number"
                    value={formData.tax}
                    onChange={(e) => setFormData(prev => ({ ...prev, tax: parseFloat(e.target.value) || 0 }))}
                    className="input w-32 text-right"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card p-6">
          <label className="label">Notas (opcional)</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="input"
            rows={3}
            placeholder="Información adicional para la factura..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || !formData.clientId || items.some(item => !item.description)}
            className="btn-primary"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {isEditing ? 'Guardar cambios' : 'Crear factura'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
