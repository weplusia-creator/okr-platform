import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Sparkles } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

async function fetchWebsiteData(url: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return result;
    const html = await resp.text();

    const getMeta = (nameOrProp: string): string => {
      const re = new RegExp(`<meta\\s+(?:name|property)=["']${nameOrProp}["']\\s+content=["']([^"']+)["']`, 'i');
      const re2 = new RegExp(`<meta\\s+content=["']([^"']+)["']\\s+(?:name|property)=["']${nameOrProp}["']`, 'i');
      return re.exec(html)?.[1] || re2.exec(html)?.[1] || '';
    };

    const title = /<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1]?.trim() || '';
    const description = getMeta('description') || getMeta('og:description') || getMeta('twitter:description');
    const keywords = getMeta('keywords');
    const ogTitle = getMeta('og:title');

    const addressMatch = html.match(/"streetAddress"\s*:\s*"([^"]+)"/i);
    const address = addressMatch?.[1] || '';
    const phoneMatch = html.match(/(?:tel:|phone[^"]*["']?\s*[:>]\s*)([\+\d\s\-()]{8,})/i);
    const phone = phoneMatch?.[1]?.trim() || '';
    const emailMatch = html.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    const email = emailMatch?.[0] || '';

    if (description) result.description = description.substring(0, 500);
    if (keywords) result.industry = keywords.split(',').slice(0, 3).map(k => k.trim()).join(', ');
    if (address) result.address = address;
    if (phone) result.phone = phone;
    if (email) result.email = email;
    if (ogTitle || title) result.ogTitle = ogTitle || title;
  } catch (err) {
    console.error('Error fetching website data:', err);
  }
  return result;
}

const EMPTY_FORM = {
  name: '',
  company: '',
  email: '',
  phone: '',
  address: '',
  cuit: '',
  industry: '',
  employeeCount: '',
  website: '',
  contactName: '',
  contactRole: '',
  notes: '',
};

export function ClientForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { clients, addClient, updateClient } = useFinance();
  const isEditing = Boolean(id);

  const [saving, setSaving] = useState(false);
  const [fetchingWeb, setFetchingWeb] = useState(false);
  const [webMessage, setWebMessage] = useState('');
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    setSaving(false);
    setWebMessage('');
    if (isEditing) {
      const client = clients.find(c => c.id === id);
      if (client) {
        setFormData({
          name: client.name,
          company: client.company || '',
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || '',
          cuit: client.cuit || '',
          industry: client.industry || '',
          employeeCount: client.employeeCount || '',
          website: client.website || '',
          contactName: client.contactName || '',
          contactRole: client.contactRole || '',
          notes: client.notes || '',
        });
      }
    } else {
      setFormData(EMPTY_FORM);
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFetchFromWeb = async () => {
    if (!formData.website) return;
    setFetchingWeb(true);
    setWebMessage('');
    try {
      const data = await fetchWebsiteData(formData.website);
      const filled: string[] = [];
      setFormData(prev => {
        const next = { ...prev };
        if (data.description && !prev.notes) { next.notes = data.description; filled.push('notas'); }
        if (data.industry && !prev.industry) { next.industry = data.industry; filled.push('industria'); }
        if (data.address && !prev.address) { next.address = data.address; filled.push('dirección'); }
        if (data.phone && !prev.phone) { next.phone = data.phone; filled.push('teléfono'); }
        if (data.email && !prev.email) { next.email = data.email; filled.push('email'); }
        if (data.ogTitle && !prev.name) { next.name = data.ogTitle; filled.push('nombre'); }
        return next;
      });
      setWebMessage(filled.length > 0
        ? `Se completó: ${filled.join(', ')}`
        : 'No se encontraron datos adicionales');
    } catch {
      setWebMessage('Error al obtener datos del sitio');
    } finally {
      setFetchingWeb(false);
    }
  };

  const handleSubmit = async () => {
    if (saving || !formData.name.trim()) return;

    const clientData = {
      name: formData.name.trim(),
      company: formData.company.trim() || null,
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      address: formData.address.trim() || null,
      cuit: formData.cuit.trim() || null,
      industry: formData.industry || null,
      employeeCount: formData.employeeCount.trim() || null,
      website: formData.website.trim() || null,
      contactName: formData.contactName.trim() || null,
      contactRole: formData.contactRole.trim() || null,
      notes: formData.notes.trim() || null,
    };

    setSaving(true);
    try {
      if (isEditing) {
        const ok = await updateClient(id!, clientData);
        if (ok) {
          navigate(`/projects/clients/${id}`);
          return;
        }
      } else {
        const newClient = await addClient(clientData);
        if (newClient) {
          navigate(`/projects/clients/${newClient.id}`);
          return;
        }
      }
    } catch (err) {
      console.error('Error saving client:', err);
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Editar cliente' : 'Nuevo cliente'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isEditing ? 'Modifica los datos del cliente' : 'Completa los datos del nuevo cliente'}
          </p>
        </div>
      </div>

      <div className="card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label">Cliente (Empresa) *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="input"
              placeholder="Acme Inc."
            />
          </div>

          <div>
            <label className="label">Responsable</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
              className="input"
              placeholder="Juan Pérez"
            />
          </div>

          <div>
            <label className="label">Email</label>
            <input
              type="text"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="input"
              placeholder="juan@ejemplo.com"
            />
          </div>

          <div>
            <label className="label">Teléfono</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="input"
              placeholder="+54 11 1234-5678"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label">CUIT</label>
            <input
              type="text"
              value={formData.cuit}
              onChange={(e) => setFormData(prev => ({ ...prev, cuit: e.target.value }))}
              className="input"
              placeholder="20-12345678-9"
            />
          </div>

          <div>
            <label className="label">Dirección</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              className="input"
              placeholder="Av. Corrientes 1234, CABA"
            />
          </div>

          <div>
            <label className="label">Industria</label>
            <select
              value={formData.industry}
              onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
              className="select"
            >
              <option value="">Seleccionar industria</option>
              <option value="Tecnología">Tecnología</option>
              <option value="Salud">Salud</option>
              <option value="Educación">Educación</option>
              <option value="Finanzas">Finanzas</option>
              <option value="Construcción">Construcción</option>
              <option value="Retail / Comercio">Retail / Comercio</option>
              <option value="Gastronomía">Gastronomía</option>
              <option value="Industria / Manufactura">Industria / Manufactura</option>
              <option value="Logística / Transporte">Logística / Transporte</option>
              <option value="Marketing / Publicidad">Marketing / Publicidad</option>
              <option value="Consultoría">Consultoría</option>
              <option value="Inmobiliaria">Inmobiliaria</option>
              <option value="Agro">Agro</option>
              <option value="Energía">Energía</option>
              <option value="Turismo / Hotelería">Turismo / Hotelería</option>
              <option value="Legal">Legal</option>
              <option value="ONG / Sin fines de lucro">ONG / Sin fines de lucro</option>
              <option value="Gobierno">Gobierno</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="label">Cantidad de empleados</label>
            <input
              type="text"
              value={formData.employeeCount}
              onChange={(e) => setFormData(prev => ({ ...prev, employeeCount: e.target.value }))}
              className="input"
              placeholder="1-10, 11-50, 51-200..."
            />
          </div>

          <div>
            <label className="label">Sitio web</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.website}
                onChange={(e) => { setFormData(prev => ({ ...prev, website: e.target.value })); setWebMessage(''); }}
                className="input flex-1"
                placeholder="https://ejemplo.com"
              />
              <button
                type="button"
                onClick={handleFetchFromWeb}
                disabled={!formData.website || fetchingWeb}
                className="btn-secondary shrink-0"
                title="Completar datos desde la web"
              >
                {fetchingWeb ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              </button>
            </div>
            {webMessage && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{webMessage}</p>
            )}
          </div>
        </div>

        <div>
          <label className="label">Notas</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="input"
            rows={4}
            placeholder="Información adicional sobre el cliente..."
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !formData.name.trim()}
            className="btn-primary"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {isEditing ? 'Guardar cambios' : 'Crear cliente'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
