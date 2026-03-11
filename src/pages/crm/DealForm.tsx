import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import type { DealStage } from '../../types/crm';

export function DealForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { deals, leads, addDeal, updateDeal, fetchDeals, pipelineStages, getStageConfig } = useCRM();
  const { clients } = useFinance();
  const { orgUsers } = useAuth();
  const isEditing = !!id;

  const [form, setForm] = useState({
    name: '',
    description: '',
    leadId: '',
    clientId: '',
    stage: '' as DealStage,
    amount: '',
    monthlyFee: '',
    product: '',
    expectedCloseDate: '',
    ownerId: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Set default stage when pipelineStages load (only for new deals)
  useEffect(() => {
    if (!isEditing && pipelineStages.length > 0 && !form.stage) {
      setForm(f => ({ ...f, stage: pipelineStages[0].name }));
    }
  }, [pipelineStages, isEditing, form.stage]);

  useEffect(() => {
    if (isEditing && deals.length === 0) {
      fetchDeals();
    }
  }, [isEditing, deals.length, fetchDeals]);

  useEffect(() => {
    if (isEditing) {
      const deal = deals.find(d => d.id === id);
      if (deal) {
        setForm({
          name: deal.name,
          description: deal.description || '',
          leadId: deal.leadId || '',
          clientId: deal.clientId || '',
          stage: deal.stage,
          amount: deal.amount ? String(deal.amount) : '',
          monthlyFee: deal.monthlyFee ? String(deal.monthlyFee) : '',
          product: deal.product || '',
          expectedCloseDate: deal.expectedCloseDate || '',
          ownerId: deal.ownerId || '',
        });
      }
    }
  }, [isEditing, id, deals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) return;

    const stage = form.stage || (pipelineStages.length > 0 ? pipelineStages[0].name : 'prospecto');

    setSaving(true);

    // Safety timeout: reset saving state if it takes too long
    const timeout = setTimeout(() => {
      setSaving(false);
      setFormError('La operación tardó demasiado. Intentá de nuevo.');
    }, 15000);

    try {
      if (isEditing) {
        const success = await updateDeal(id!, {
          name: form.name.trim(),
          description: form.description.trim() || null,
          leadId: form.leadId || null,
          clientId: form.clientId || null,
          stage,
          amount: form.amount ? parseFloat(form.amount) : 0,
          monthlyFee: form.monthlyFee ? parseFloat(form.monthlyFee) : null,
          product: form.product.trim() || null,
          expectedCloseDate: form.expectedCloseDate || null,
          ownerId: form.ownerId || null,
        });
        clearTimeout(timeout);
        if (success) {
          navigate(`/crm/deals/${id}`);
        } else {
          setFormError('Error al guardar los cambios. Intentá de nuevo.');
        }
      } else {
        const deal = await addDeal({
          name: form.name.trim(),
          description: form.description.trim() || null,
          leadId: form.leadId || null,
          clientId: form.clientId || null,
          stage,
          probability: getStageConfig(stage).probability,
          amount: form.amount ? parseFloat(form.amount) : 0,
          currency: 'ARS',
          monthlyFee: form.monthlyFee ? parseFloat(form.monthlyFee) : null,
          product: form.product.trim() || null,
          expectedCloseDate: form.expectedCloseDate || null,
          actualCloseDate: null,
          ownerId: form.ownerId || null,
          lostReason: null,
          wonNotes: null,
          createdClientId: null,
          createdProjectId: null,
          lastActivityAt: null,
        });
        clearTimeout(timeout);
        if (deal) {
          navigate(`/crm/deals/${deal.id}`);
        } else {
          setFormError('Error al crear la oportunidad. Revisá los datos e intentá de nuevo.');
        }
      }
    } catch (err) {
      clearTimeout(timeout);
      setFormError('Error inesperado al guardar.');
    } finally {
      setSaving(false);
    }
  };

  // Filter non-converted leads for linking
  const availableLeads = leads.filter(l => !l.convertedToDealId || l.convertedToDealId === id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isEditing ? 'Editar Oportunidad' : 'Nueva Oportunidad'}
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-4">
            <div>
              <label className="label">Nombre *</label>
              <input
                type="text"
                className="input"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Proyecto X para Cliente Y"
                required
              />
            </div>

            <div>
              <label className="label">Lead origen</label>
              <select
                className="select"
                value={form.leadId}
                onChange={e => setForm(f => ({ ...f, leadId: e.target.value }))}
              >
                <option value="">Sin lead asociado</option>
                {availableLeads.map(lead => (
                  <option key={lead.id} value={lead.id}>
                    {lead.contactName} {lead.company ? `(${lead.company})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Cliente</label>
              <select
                className="select"
                value={form.clientId}
                onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
              >
                <option value="">Sin cliente asociado</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Producto/Servicio</label>
              <input
                type="text"
                className="input"
                value={form.product}
                onChange={e => setForm(f => ({ ...f, product: e.target.value }))}
                placeholder="Ej: Consultoría, Desarrollo web, etc."
              />
            </div>

            <div>
              <label className="label">Descripcion</label>
              <textarea
                className="input"
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Detalles de la oportunidad..."
              />
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <div>
              <label className="label">Etapa</label>
              <select
                className="select"
                value={form.stage}
                onChange={e => setForm(f => ({ ...f, stage: e.target.value as DealStage }))}
              >
                {pipelineStages.map(stage => (
                  <option key={stage.name} value={stage.name}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Monto estimado (ARS)</label>
              <input
                type="number"
                className="input"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0"
                min="0"
              />
            </div>

            <div>
              <label className="label">Fee mensual (ARS)</label>
              <input
                type="number"
                className="input"
                value={form.monthlyFee}
                onChange={e => setForm(f => ({ ...f, monthlyFee: e.target.value }))}
                placeholder="0"
                min="0"
              />
            </div>

            <div>
              <label className="label">Fecha cierre esperado</label>
              <input
                type="date"
                className="input"
                value={form.expectedCloseDate}
                onChange={e => setForm(f => ({ ...f, expectedCloseDate: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">Responsable</label>
              <select
                className="select"
                value={form.ownerId}
                onChange={e => setForm(f => ({ ...f, ownerId: e.target.value }))}
              >
                <option value="">Sin asignar</option>
                {orgUsers.filter(u => u.status === 'active').map(user => (
                  <option key={user.id} value={user.id}>
                    {user.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error */}
        {formError && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
            {formError}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!form.name.trim() || saving}
            className="btn-primary disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
