import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import {
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_CONFIG,
  type LeadSource,
  type LeadStatus,
} from '../../types/crm';

import { toast } from '../../components/ui/toast';
interface FormData {
  contactName: string;
  company: string;
  email: string;
  phone: string;
  position: string;
  source: LeadSource;
  status: LeadStatus;
  budgetRange: string;
  timeline: string;
  nextContactAt: string;
  needs: string;
  notes: string;
}

const initialFormData: FormData = {
  contactName: '',
  company: '',
  email: '',
  phone: '',
  position: '',
  source: 'manual',
  status: 'nuevo',
  budgetRange: '',
  timeline: '',
  nextContactAt: '',
  needs: '',
  notes: '',
};

export function LeadForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { leads, addLead, updateLead } = useCRM();

  const isEditing = Boolean(id);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditing && id) {
      const lead = leads.find((l) => l.id === id);
      if (lead) {
        setFormData({
          contactName: lead.contactName,
          company: lead.company || '',
          email: lead.email || '',
          phone: lead.phone || '',
          position: lead.position || '',
          source: lead.source,
          status: lead.status,
          budgetRange: lead.budgetRange || '',
          timeline: lead.timeline || '',
          nextContactAt: lead.nextContactAt ? lead.nextContactAt.split('T')[0] : '',
          needs: lead.needs || '',
          notes: lead.notes || '',
        });
      }
    }
  }, [isEditing, id, leads]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.contactName.trim()) {
      toast.error('El nombre de contacto es requerido');
      return;
    }

    setSaving(true);

    try {
      const leadData = {
        contactName: formData.contactName.trim(),
        company: formData.company.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        position: formData.position.trim() || null,
        source: formData.source,
        status: formData.status,
        budgetRange: formData.budgetRange.trim() || null,
        timeline: formData.timeline.trim() || null,
        nextContactAt: formData.nextContactAt || null,
        needs: formData.needs.trim() || null,
        notes: formData.notes.trim() || null,
        ownerId: null,
        convertedAt: null,
        convertedToDealId: null,
        lastContactAt: null,
      };

      if (isEditing && id) {
        const success = await updateLead(id, leadData);
        if (!success) return;
        navigate(`/crm/leads/${id}`);
      } else {
        const newLead = await addLead(leadData);
        if (newLead) {
          navigate(`/crm/leads/${newLead.id}`);
        } else {
          navigate('/crm/leads');
        }
      }
    } catch (error) {
      console.error('Error saving lead:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isEditing ? 'Editar Lead' : 'Nuevo Lead'}
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="label">
                Nombre de Contacto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="contactName"
                value={formData.contactName}
                onChange={handleChange}
                className="input w-full"
                placeholder="Nombre completo"
                required
              />
            </div>

            <div>
              <label className="label">Empresa</label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="input w-full"
                placeholder="Nombre de la empresa"
              />
            </div>

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input w-full"
                placeholder="email@ejemplo.com"
              />
            </div>

            <div>
              <label className="label">Telefono</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input w-full"
                placeholder="+54 11 1234-5678"
              />
            </div>

            <div>
              <label className="label">Cargo</label>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleChange}
                className="input w-full"
                placeholder="Cargo en la empresa"
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label className="label">Origen</label>
              <select
                name="source"
                value={formData.source}
                onChange={handleChange}
                className="select w-full"
              >
                {(Object.keys(LEAD_SOURCE_LABELS) as LeadSource[]).map((source) => (
                  <option key={source} value={source}>
                    {LEAD_SOURCE_LABELS[source]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Estado</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="select w-full"
              >
                {(Object.keys(LEAD_STATUS_CONFIG) as LeadStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {LEAD_STATUS_CONFIG[status].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Rango de Presupuesto</label>
              <input
                type="text"
                name="budgetRange"
                value={formData.budgetRange}
                onChange={handleChange}
                className="input w-full"
                placeholder="Ej: $50.000 - $100.000"
              />
            </div>

            <div>
              <label className="label">Timeline</label>
              <input
                type="text"
                name="timeline"
                value={formData.timeline}
                onChange={handleChange}
                className="input w-full"
                placeholder="Ej: Q1 2026, 3 meses"
              />
            </div>

            <div>
              <label className="label">Proximo Contacto</label>
              <input
                type="date"
                name="nextContactAt"
                value={formData.nextContactAt}
                onChange={handleChange}
                className="input w-full"
              />
            </div>
          </div>
        </div>

        {/* Full Width Fields */}
        <div className="mt-6 space-y-4">
          <div>
            <label className="label">Necesidades</label>
            <textarea
              name="needs"
              value={formData.needs}
              onChange={handleChange}
              className="input w-full min-h-[100px]"
              placeholder="Describe las necesidades del lead..."
              rows={4}
            />
          </div>

          <div>
            <label className="label">Notas</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="input w-full min-h-[100px]"
              placeholder="Notas adicionales..."
              rows={4}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
