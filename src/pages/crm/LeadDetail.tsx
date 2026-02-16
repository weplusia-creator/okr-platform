import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  User,
  Calendar,
  Clock,
  DollarSign,
  Target,
  FileText,
  Plus,
  CheckCircle2,
  Circle,
  Pencil,
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { LEAD_STATUS_CONFIG, LEAD_SOURCE_LABELS, ACTIVITY_TYPE_CONFIG, DEAL_STAGE_CONFIG, type LeadStatus, type LeadSource, type ActivityType } from '../../types/crm';
import { Modal } from '../../components/Modal';

const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateTime = (dateString: string | null): string => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getDaysSinceCreated = (createdAt: string): number => {
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - created.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const ACTIVITY_TYPES: ActivityType[] = ['llamada', 'email', 'reunion', 'tarea', 'nota'];

export function LeadDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const {
    leads,
    deals,
    activities,
    loading,
    updateLead,
    convertLeadToDeal,
    fetchActivities,
    addActivity,
    completeActivity,
  } = useCRM();

  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activityForm, setActivityForm] = useState({
    activityType: 'llamada' as ActivityType,
    subject: '',
    description: '',
    dueDate: '',
  });
  const [editForm, setEditForm] = useState({
    contactName: '',
    company: '',
    email: '',
    phone: '',
    position: '',
    source: 'manual' as LeadSource,
    budgetRange: '',
    timeline: '',
    needs: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const lead = leads.find(l => l.id === id);

  // Fetch activities for this lead
  useEffect(() => {
    if (id) {
      fetchActivities({ leadId: id });
    }
  }, [id, fetchActivities]);

  // Filter activities for this lead
  const leadActivities = useMemo(() => {
    return activities.filter(a => a.leadId === id).sort((a, b) => {
      // Sort by completion status first (incomplete first), then by date
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      const dateA = a.dueDate || a.createdAt;
      const dateB = b.dueDate || b.createdAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [activities, id]);

  // Find deals created from this lead
  const leadDeals = useMemo(() => {
    return deals.filter(d => d.leadId === id);
  }, [deals, id]);

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!lead) return;
    await updateLead(lead.id, { status: newStatus });
  };

  const openEditModal = () => {
    if (!lead) return;
    setEditForm({
      contactName: lead.contactName || '',
      company: lead.company || '',
      email: lead.email || '',
      phone: lead.phone || '',
      position: lead.position || '',
      source: lead.source,
      budgetRange: lead.budgetRange || '',
      timeline: lead.timeline || '',
      needs: lead.needs || '',
      notes: lead.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || isSavingEdit) return;
    setIsSavingEdit(true);
    try {
      await updateLead(lead.id, {
        contactName: editForm.contactName,
        company: editForm.company || null,
        email: editForm.email || null,
        phone: editForm.phone || null,
        position: editForm.position || null,
        source: editForm.source,
        budgetRange: editForm.budgetRange || null,
        timeline: editForm.timeline || null,
        needs: editForm.needs || null,
        notes: editForm.notes || null,
      });
      setIsEditModalOpen(false);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConvertToDeal = async () => {
    if (!lead || isConverting) return;
    setIsConverting(true);
    try {
      const deal = await convertLeadToDeal(lead.id, {
        name: `Oportunidad - ${lead.company || lead.contactName}`,
        description: lead.needs,
        amount: 0,
      });
      if (deal) {
        navigate(`/crm/deals/${deal.id}`);
      }
    } finally {
      setIsConverting(false);
    }
  };

  const handleActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addActivity({
        leadId: lead.id,
        dealId: null,
        activityType: activityForm.activityType,
        subject: activityForm.subject,
        description: activityForm.description || null,
        isCompleted: false,
        completedAt: null,
        completedBy: null,
        dueDate: activityForm.dueDate || null,
        durationMinutes: null,
        reminderAt: null,
        reminderSent: false,
        ownerId: lead.ownerId || '',
      });
      setActivityForm({
        activityType: 'llamada',
        subject: '',
        description: '',
        dueDate: '',
      });
      setIsActivityModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActivityComplete = async (activityId: string, isCompleted: boolean) => {
    if (!isCompleted) {
      await completeActivity(activityId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Lead no encontrado</p>
        <button
          onClick={() => navigate('/crm/leads')}
          className="btn-primary mt-4"
        >
          Volver a leads
        </button>
      </div>
    );
  }

  const daysSinceCreated = getDaysSinceCreated(lead.createdAt);
  const isConverted = !!lead.convertedToDealId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link
          to="/crm/leads"
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {lead.contactName}
          </h1>
          {lead.company && (
            <p className="text-gray-600 dark:text-gray-400">{lead.company}</p>
          )}
        </div>

        {/* Status Dropdown */}
        <div className="relative">
          <select
            value={lead.status}
            onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
            className={`appearance-none px-4 py-2 pr-8 rounded-full text-sm font-medium cursor-pointer border-0 ${(LEAD_STATUS_CONFIG[lead.status] || LEAD_STATUS_CONFIG.nuevo).bgClass}`}
          >
            {Object.entries(LEAD_STATUS_CONFIG).map(([status, config]) => (
              <option key={status} value={status}>
                {config.label}
              </option>
            ))}
          </select>
        </div>

        {/* Edit Button */}
        <button
          onClick={openEditModal}
          className="btn-secondary"
        >
          <Pencil className="w-4 h-4 mr-2" />
          Editar
        </button>

        {/* Convert to Deal Button */}
        {!isConverted && (
          <button
            onClick={handleConvertToDeal}
            disabled={isConverting}
            className="btn-primary"
          >
            {isConverting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Convirtiendo...
              </>
            ) : (
              <>
                <Target className="w-5 h-5 mr-2" />
                Convertir a Deal
              </>
            )}
          </button>
        )}
      </div>

      {/* Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Lead Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Informacion del Lead
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lead.company && (
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                  <Building2 className="w-5 h-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-500">Empresa</p>
                    <p className="text-gray-900 dark:text-white">{lead.company}</p>
                  </div>
                </div>
              )}

              {lead.email && (
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                  <Mail className="w-5 h-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-500">Email</p>
                    <a href={`mailto:${lead.email}`} className="text-primary-600 hover:underline">
                      {lead.email}
                    </a>
                  </div>
                </div>
              )}

              {lead.phone && (
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                  <Phone className="w-5 h-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-500">Telefono</p>
                    <div className="flex items-center gap-3">
                      <a href={`tel:${lead.phone}`} className="text-primary-600 hover:underline">
                        {lead.phone}
                      </a>
                      <a
                        href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                      >
                        WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {lead.position && (
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                  <User className="w-5 h-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-500">Cargo</p>
                    <p className="text-gray-900 dark:text-white">{lead.position}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <Target className="w-5 h-5 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Fuente</p>
                  <p className="text-gray-900 dark:text-white">{LEAD_SOURCE_LABELS[lead.source] || lead.source}</p>
                </div>
              </div>

              {lead.budgetRange && (
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                  <DollarSign className="w-5 h-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-500">Rango de Presupuesto</p>
                    <p className="text-gray-900 dark:text-white">{lead.budgetRange}</p>
                  </div>
                </div>
              )}

              {lead.timeline && (
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                  <Calendar className="w-5 h-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-500">Timeline</p>
                    <p className="text-gray-900 dark:text-white">{lead.timeline}</p>
                  </div>
                </div>
              )}
            </div>

            {lead.needs && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Necesidades</p>
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{lead.needs}</p>
                  </div>
                </div>
              </div>
            )}

            {lead.notes && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Notas</p>
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{lead.notes}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Deals Section */}
          {leadDeals.length > 0 && (
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Deals ({leadDeals.length})
              </h3>

              <div className="space-y-3">
                {leadDeals.map(deal => {
                  const stageConfig = DEAL_STAGE_CONFIG[deal.stage];
                  return (
                    <Link
                      key={deal.id}
                      to={`/crm/deals/${deal.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                          <Target className="w-4 h-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {deal.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Creado {formatDate(deal.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`badge ${stageConfig.bgClass}`}>
                          {stageConfig.label}
                        </span>
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {formatCurrency(deal.amount)}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Activities Timeline */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Actividades ({leadActivities.length})
              </h3>
              <button
                onClick={() => setIsActivityModalOpen(true)}
                className="btn-primary text-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Nueva Actividad
              </button>
            </div>

            {leadActivities.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay actividades registradas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leadActivities.map(activity => {
                  const typeConfig = ACTIVITY_TYPE_CONFIG[activity.activityType];
                  const isOverdue = activity.dueDate && !activity.isCompleted && new Date(activity.dueDate) < new Date();

                  return (
                    <div
                      key={activity.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        activity.isCompleted
                          ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60'
                          : isOverdue
                          ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <button
                        onClick={() => handleToggleActivityComplete(activity.id, activity.isCompleted)}
                        className={`shrink-0 mt-0.5 ${activity.isCompleted ? 'text-green-600' : 'text-gray-400 hover:text-green-600'}`}
                        disabled={activity.isCompleted}
                      >
                        {activity.isCompleted ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${typeConfig.color}20`,
                              color: typeConfig.color,
                            }}
                          >
                            {typeConfig.label}
                          </span>
                          <span className={`font-medium ${activity.isCompleted ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                            {activity.subject}
                          </span>
                        </div>
                        {activity.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {activity.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          {activity.dueDate && (
                            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}`}>
                              <Clock className="w-3.5 h-3.5" />
                              {formatDate(activity.dueDate)}
                              {isOverdue && ' (Vencida)'}
                            </span>
                          )}
                          {activity.ownerName && (
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              {activity.ownerName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Stats */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Estadisticas
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary-600" />
                  <span className="text-gray-600 dark:text-gray-400">Score</span>
                </div>
                <span className="text-xl font-bold text-primary-600">
                  {lead.score}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-400">Dias desde creacion</span>
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {daysSinceCreated}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-600 dark:text-gray-400">Ultimo contacto</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDate(lead.lastContactAt)}
                </span>
              </div>

              {lead.nextContactAt && (
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    <span className="text-gray-600 dark:text-gray-400">Proximo contacto</span>
                  </div>
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {formatDate(lead.nextContactAt)}
                  </span>
                </div>
              )}

              {lead.ownerName && (
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-gray-500" />
                    <span className="text-gray-600 dark:text-gray-400">Responsable</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {lead.ownerName}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
              <p>Creado: {formatDateTime(lead.createdAt)}</p>
              <p>Actualizado: {formatDateTime(lead.updatedAt)}</p>
              {lead.convertedAt && (
                <p className="text-green-600 dark:text-green-400 mt-1">
                  Convertido: {formatDateTime(lead.convertedAt)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Modal */}
      <Modal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        title="Nueva Actividad"
      >
        <form onSubmit={handleActivitySubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tipo de Actividad
            </label>
            <select
              value={activityForm.activityType}
              onChange={(e) => setActivityForm({ ...activityForm, activityType: e.target.value as ActivityType })}
              className="input"
              required
            >
              {ACTIVITY_TYPES.map(type => (
                <option key={type} value={type}>
                  {ACTIVITY_TYPE_CONFIG[type].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Asunto
            </label>
            <input
              type="text"
              value={activityForm.subject}
              onChange={(e) => setActivityForm({ ...activityForm, subject: e.target.value })}
              className="input"
              placeholder="Ej: Llamada de seguimiento"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descripcion
            </label>
            <textarea
              value={activityForm.description}
              onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
              className="input min-h-[100px]"
              placeholder="Detalles de la actividad..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fecha de Vencimiento
            </label>
            <input
              type="date"
              value={activityForm.dueDate}
              onChange={(e) => setActivityForm({ ...activityForm, dueDate: e.target.value })}
              className="input"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsActivityModalOpen(false)}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Actividad'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Lead Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Lead"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                value={editForm.contactName}
                onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Empresa
              </label>
              <input
                type="text"
                value={editForm.company}
                onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Telefono
              </label>
              <input
                type="text"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cargo
              </label>
              <input
                type="text"
                value={editForm.position}
                onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fuente
              </label>
              <select
                value={editForm.source}
                onChange={(e) => setEditForm({ ...editForm, source: e.target.value as LeadSource })}
                className="input"
              >
                {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rango de Presupuesto
              </label>
              <input
                type="text"
                value={editForm.budgetRange}
                onChange={(e) => setEditForm({ ...editForm, budgetRange: e.target.value })}
                className="input"
                placeholder="Ej: $100.000 - $500.000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Timeline
              </label>
              <input
                type="text"
                value={editForm.timeline}
                onChange={(e) => setEditForm({ ...editForm, timeline: e.target.value })}
                className="input"
                placeholder="Ej: 3 meses"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Necesidades
            </label>
            <textarea
              value={editForm.needs}
              onChange={(e) => setEditForm({ ...editForm, needs: e.target.value })}
              className="input min-h-[80px]"
              placeholder="Necesidades del lead..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notas
            </label>
            <textarea
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              className="input min-h-[80px]"
              placeholder="Notas adicionales..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSavingEdit}
              className="btn-primary"
            >
              {isSavingEdit ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
