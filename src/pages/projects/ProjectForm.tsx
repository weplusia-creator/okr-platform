import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useProjects } from '../../context/ProjectContext';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import type { ProjectStatus, ProjectPriority } from '../../types/projects';
import { PROJECT_STATUS_CONFIG, PRIORITY_CONFIG } from '../../types/projects';

export function ProjectForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { projects, addProject, updateProject, getProject, products, applyProductToProject } = useProjects();
  const { clients } = useFinance();
  const { appUser } = useAuth();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    clientId: '',
    product: '',
    status: 'proposal' as ProjectStatus,
    priority: 'medium' as ProjectPriority,
    ownerId: appUser?.id || '',
    monthlyFee: '',
    startDate: '',
    estimatedEndDate: '',
    actualEndDate: '',
    notes: '',
  });

  useEffect(() => {
    if (isEditing && id) {
      const loadProject = async () => {
        setInitialLoading(true);
        const project = projects.find((p) => p.id === id);
        if (project) {
          setFormData({
            name: project.name,
            description: project.description || '',
            clientId: project.clientId || '',
            product: project.product || '',
            status: project.status,
            priority: project.priority,
            ownerId: project.ownerId,
            monthlyFee: project.monthlyFee != null ? String(project.monthlyFee) : '',
            startDate: project.startDate || '',
            estimatedEndDate: project.estimatedEndDate || '',
            actualEndDate: project.actualEndDate || '',
            notes: project.notes || '',
          });
          setInitialLoading(false);
        } else {
          const fetched = await getProject(id);
          if (fetched) {
            setFormData({
              name: fetched.name,
              description: fetched.description || '',
              clientId: fetched.clientId || '',
              product: fetched.product || '',
              status: fetched.status,
              priority: fetched.priority,
              ownerId: fetched.ownerId,
              monthlyFee: fetched.monthlyFee != null ? String(fetched.monthlyFee) : '',
              budget: fetched.budget != null ? String(fetched.budget) : '',
              estimatedCost: fetched.estimatedCost != null ? String(fetched.estimatedCost) : '',
              startDate: fetched.startDate || '',
              estimatedEndDate: fetched.estimatedEndDate || '',
              actualEndDate: fetched.actualEndDate || '',
              notes: fetched.notes || '',
            });
          }
          setInitialLoading(false);
        }
      };
      loadProject();
    }
  }, [id, projects, isEditing, getProject]);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        clientId: formData.clientId || null,
        product: formData.product || null,
        status: formData.status,
        priority: formData.priority,
        ownerId: formData.ownerId || appUser?.id || '',
        monthlyFee: formData.monthlyFee ? parseFloat(formData.monthlyFee) : null,
        budget: null,
        estimatedCost: null,
        startDate: formData.startDate || null,
        estimatedEndDate: formData.estimatedEndDate || null,
        actualEndDate: formData.actualEndDate || null,
        notes: formData.notes || null,
      };

      if (isEditing && id) {
        // Check if product changed — apply new product modules
        const existingProject = projects.find(p => p.id === id);
        await updateProject(id, payload);
        if (payload.product && payload.product !== existingProject?.product) {
          const selectedProduct = products.find(p => p.name === payload.product);
          if (selectedProduct) {
            await applyProductToProject(selectedProduct.id, id);
          }
        }
        navigate(`/projects/${id}`);
      } else {
        const newProject = await addProject(payload as any);
        if (newProject) {
          // Apply product template modules to the new project
          if (payload.product) {
            const selectedProduct = products.find(p => p.name === payload.product);
            if (selectedProduct) {
              await applyProductToProject(selectedProduct.id, newProject.id);
            }
          }
          navigate(`/projects/${newProject.id}`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Editar Proyecto' : 'Nuevo Proyecto'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isEditing ? 'Modifica los datos del proyecto' : 'Completa los datos del nuevo proyecto'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        {/* Name, Client, Product */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="label">Nombre *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className="input"
              placeholder="Nombre del proyecto"
              required
            />
          </div>

          <div>
            <label className="label">Cliente</label>
            <select
              value={formData.clientId}
              onChange={(e) => {
                const clientId = e.target.value;
                setFormData((prev) => {
                  const clientName = clients.find(c => c.id === clientId)?.name || '';
                  const autoName = [clientName, prev.product].filter(Boolean).join(' — ');
                  const prevAutoName = [clients.find(c => c.id === prev.clientId)?.name || '', prev.product].filter(Boolean).join(' — ');
                  const shouldUpdate = !prev.name || prev.name === prevAutoName;
                  return { ...prev, clientId, name: shouldUpdate ? autoName : prev.name };
                });
              }}
              className="select"
            >
              <option value="">Sin cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Producto contratado</label>
            <select
              value={formData.product}
              onChange={(e) => {
                const product = e.target.value;
                setFormData((prev) => {
                  const clientName = clients.find(c => c.id === prev.clientId)?.name || '';
                  const autoName = [clientName, product].filter(Boolean).join(' — ');
                  const prevAutoName = [clientName, prev.product].filter(Boolean).join(' — ');
                  const shouldUpdate = !prev.name || prev.name === prevAutoName;
                  return { ...prev, product, name: shouldUpdate ? autoName : prev.name };
                });
              }}
              className="select"
            >
              <option value="">Sin producto</option>
              {products.map((p) => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="label">Descripcion</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            className="input"
            rows={3}
            placeholder="Descripcion del proyecto..."
          />
        </div>

        {/* Status, Priority, Owner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="label">Estado</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as ProjectStatus }))}
              className="select"
            >
              {(Object.keys(PROJECT_STATUS_CONFIG) as ProjectStatus[]).map((status) => (
                <option key={status} value={status}>
                  {PROJECT_STATUS_CONFIG[status].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Prioridad</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value as ProjectPriority }))}
              className="select"
            >
              {(Object.keys(PRIORITY_CONFIG) as ProjectPriority[]).map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_CONFIG[priority].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Responsable</label>
            <select
              value={formData.ownerId}
              onChange={(e) => setFormData((prev) => ({ ...prev, ownerId: e.target.value }))}
              className="select"
            >
              {appUser && (
                <option value={appUser.id}>{appUser.fullName || appUser.email}</option>
              )}
            </select>
          </div>
        </div>

        {/* Monthly Fee */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="label">Fee mensual</label>
            <input
              type="number"
              value={formData.monthlyFee}
              onChange={(e) => setFormData((prev) => ({ ...prev, monthlyFee: e.target.value }))}
              className="input"
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="label">Fecha inicio</label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
              className="input"
            />
          </div>

          <div>
            <label className="label">Fecha fin estimada</label>
            <input
              type="date"
              value={formData.estimatedEndDate}
              onChange={(e) => setFormData((prev) => ({ ...prev, estimatedEndDate: e.target.value }))}
              className="input"
            />
          </div>

          {isEditing && (
            <div>
              <label className="label">Fecha fin real</label>
              <input
                type="date"
                value={formData.actualEndDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, actualEndDate: e.target.value }))}
                className="input"
              />
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="label">Notas</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            className="input"
            rows={4}
            placeholder="Notas adicionales del proyecto..."
          />
        </div>

        {/* Actions */}
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
            disabled={loading || !formData.name}
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
                {isEditing ? 'Guardar cambios' : 'Crear proyecto'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
