import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useProspector } from '../../../context/ProspectorContext';
import {
  PROSPECT_STATUS_CONFIG,
  COMPANY_SIZE_OPTIONS,
  type ProspectStatus,
} from '../../../types/prospector';

interface FormData {
  companyName: string;
  contactName: string;
  contactTitle: string;
  email: string;
  phone: string;
  linkedinUrl: string;
  website: string;
  industry: string;
  companySize: string;
  country: string;
  city: string;
  estimatedValue: string;
  status: ProspectStatus;
  notes: string;
  tags: string;
}

const initialFormData: FormData = {
  companyName: '',
  contactName: '',
  contactTitle: '',
  email: '',
  phone: '',
  linkedinUrl: '',
  website: '',
  industry: '',
  companySize: '',
  country: '',
  city: '',
  estimatedValue: '',
  status: 'new',
  notes: '',
  tags: '',
};

export function ProspectorForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { prospects, addProspect, updateProspect } = useProspector();

  const isEditing = Boolean(id);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditing && id) {
      const prospect = prospects.find((p) => p.id === id);
      if (prospect) {
        setFormData({
          companyName: prospect.companyName,
          contactName: prospect.contactName,
          contactTitle: prospect.contactTitle || '',
          email: prospect.email || '',
          phone: prospect.phone || '',
          linkedinUrl: prospect.linkedinUrl || '',
          website: prospect.website || '',
          industry: prospect.industry || '',
          companySize: prospect.companySize || '',
          country: prospect.country || '',
          city: prospect.city || '',
          estimatedValue: prospect.estimatedValue ? String(prospect.estimatedValue) : '',
          status: prospect.status,
          notes: prospect.notes || '',
          tags: (prospect.tags || []).join(', '),
        });
      }
    }
  }, [isEditing, id, prospects]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.companyName.trim()) {
      alert('El nombre de empresa es requerido');
      return;
    }

    if (!formData.contactName.trim()) {
      alert('El nombre de contacto es requerido');
      return;
    }

    setSaving(true);

    try {
      const parsedTags = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const prospectData = {
        companyName: formData.companyName.trim(),
        contactName: formData.contactName.trim(),
        contactTitle: formData.contactTitle.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        linkedinUrl: formData.linkedinUrl.trim() || null,
        website: formData.website.trim() || null,
        industry: formData.industry.trim() || null,
        companySize: formData.companySize || null,
        country: formData.country.trim() || null,
        city: formData.city.trim() || null,
        estimatedValue: formData.estimatedValue ? parseFloat(formData.estimatedValue) : 0,
        status: formData.status,
        notes: formData.notes.trim() || null,
        tags: parsedTags,
      };

      if (isEditing && id) {
        await updateProspect(id, prospectData);
        navigate(`/tools/prospector/${id}`);
      } else {
        const newProspect = await addProspect(prospectData);
        if (newProspect) {
          navigate(`/tools/prospector`);
        } else {
          navigate('/tools/prospector');
        }
      }
    } catch (error) {
      console.error('Error saving prospect:', error);
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
          {isEditing ? 'Editar Prospecto' : 'Nuevo Prospecto'}
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        {/* Empresa */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Empresa</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre de Empresa <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                className="input"
                placeholder="Nombre de la empresa"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Industria
              </label>
              <input
                type="text"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                className="input"
                placeholder="Ej: Technology, Finance"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sitio Web
              </label>
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className="input"
                placeholder="https://ejemplo.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tamaño de Empresa
              </label>
              <select
                name="companySize"
                value={formData.companySize}
                onChange={handleChange}
                className="select"
              >
                <option value="">Seleccionar...</option>
                {COMPANY_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size} empleados
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Contacto */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contacto</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre de Contacto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="contactName"
                value={formData.contactName}
                onChange={handleChange}
                className="input"
                placeholder="Nombre completo"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cargo
              </label>
              <input
                type="text"
                name="contactTitle"
                value={formData.contactTitle}
                onChange={handleChange}
                className="input"
                placeholder="Ej: CEO, Director de Ventas"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
                placeholder="email@ejemplo.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Telefono
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input"
                placeholder="+54 11 1234-5678"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                LinkedIn
              </label>
              <input
                type="text"
                name="linkedinUrl"
                value={formData.linkedinUrl}
                onChange={handleChange}
                className="input"
                placeholder="https://linkedin.com/in/..."
              />
            </div>
          </div>
        </div>

        {/* Ubicacion */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ubicacion</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Pais
              </label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="input"
                placeholder="Ej: Argentina"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ciudad
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="input"
                placeholder="Ej: Buenos Aires"
              />
            </div>
          </div>
        </div>

        {/* Detalles */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Detalles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Valor Estimado
              </label>
              <input
                type="number"
                name="estimatedValue"
                value={formData.estimatedValue}
                onChange={handleChange}
                className="input"
                placeholder="0"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Estado
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="select"
              >
                {(Object.keys(PROSPECT_STATUS_CONFIG) as ProspectStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {PROSPECT_STATUS_CONFIG[status].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tags
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                className="input"
                placeholder="tag1, tag2, tag3"
              />
            </div>
          </div>
        </div>

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notas
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            className="input min-h-[100px]"
            placeholder="Notas adicionales sobre el prospecto..."
            rows={4}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
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
