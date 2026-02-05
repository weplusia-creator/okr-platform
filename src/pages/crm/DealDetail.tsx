import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Trophy,
  XCircle,
  Calendar,
  DollarSign,
  User,
  Clock,
  FileText,
  Plus,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import {
  ACTIVITY_TYPE_CONFIG,
  LOST_REASONS,
  TERMINAL_STAGES,
  type DealHistory,
  type Activity,
  type ActivityType,
} from '../../types/crm';
import { Modal } from '../../components/Modal';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

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

export function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    deals,
    leads,
    activities,
    fetchActivities,
    fetchDealHistory,
    markDealWon,
    markDealLost,
    addActivity,
    completeActivity,
    loading,
    getStageConfig,
  } = useCRM();

  const [history, setHistory] = useState<DealHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Modal states
  const [showWonModal, setShowWonModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);

  // Won modal state
  const [createClient, setCreateClient] = useState(true);
  const [createProject, setCreateProject] = useState(true);
  const [wonNotes, setWonNotes] = useState('');

  // Lost modal state
  const [lostReason, setLostReason] = useState<string>(LOST_REASONS[0]);
  const [lostNotes, setLostNotes] = useState('');

  // Activity modal state
  const [activityType, setActivityType] = useState<ActivityType>('llamada');
  const [activitySubject, setActivitySubject] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [activityDueDate, setActivityDueDate] = useState('');

  const deal = deals.find((d) => d.id === id);
  const linkedLead = deal?.leadId ? leads.find((l) => l.id === deal.leadId) : null;
  const dealActivities = activities.filter((a) => a.dealId === id);

  const isActive = deal && !(TERMINAL_STAGES as readonly string[]).includes(deal.stage);

  // Calculate days in pipeline
  const daysInPipeline = deal
    ? Math.floor(
        (new Date().getTime() - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      )
    : 0;

  // Calculate weighted value
  const weightedValue = deal ? deal.amount * (deal.probability / 100) : 0;

  useEffect(() => {
    if (id) {
      fetchActivities({ dealId: id });
      loadHistory();
    }
  }, [id, fetchActivities]);

  const loadHistory = async () => {
    if (!id) return;
    setHistoryLoading(true);
    try {
      const data = await fetchDealHistory(id);
      setHistory(data);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleMarkWon = async () => {
    if (!id) return;
    await markDealWon(id, {
      createClient,
      createProject,
      wonNotes: wonNotes || undefined,
    });
    setShowWonModal(false);
    setWonNotes('');
    loadHistory();
  };

  const handleMarkLost = async () => {
    if (!id) return;
    const reason = lostNotes ? `${lostReason}: ${lostNotes}` : lostReason;
    await markDealLost(id, reason);
    setShowLostModal(false);
    setLostReason(LOST_REASONS[0]);
    setLostNotes('');
    loadHistory();
  };

  const handleAddActivity = async () => {
    if (!id || !activitySubject.trim()) return;
    await addActivity({
      dealId: id,
      leadId: null,
      activityType,
      subject: activitySubject,
      description: activityDescription || null,
      isCompleted: false,
      completedAt: null,
      completedBy: null,
      dueDate: activityDueDate || null,
      durationMinutes: null,
      reminderAt: null,
      reminderSent: false,
      ownerId: deal?.ownerId || '',
    });
    setShowActivityModal(false);
    setActivitySubject('');
    setActivityDescription('');
    setActivityDueDate('');
    setActivityType('llamada');
    fetchActivities({ dealId: id });
  };

  const handleCompleteActivity = async (activityId: string) => {
    await completeActivity(activityId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Deal no encontrado</p>
        <Link
          to="/crm/pipeline"
          className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Pipeline
        </Link>
      </div>
    );
  }

  const stageConfig = getStageConfig(deal.stage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/crm/pipeline"
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{deal.name}</h1>
            <span className={`inline-block mt-1 px-3 py-1 text-sm font-medium rounded-full ${stageConfig.bgClass}`}>
              {stageConfig.label}
            </span>
          </div>
        </div>

        {isActive && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/proposals/new?dealId=${deal.id}`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <FileText className="w-5 h-5" />
              Generar Propuesta
            </button>
            <button
              onClick={() => setShowWonModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Trophy className="w-5 h-5" />
              Marcar Ganado
            </button>
            <button
              onClick={() => setShowLostModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <XCircle className="w-5 h-5" />
              Marcar Perdido
            </button>
          </div>
        )}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Deal Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Informacion del Deal
            </h2>

            <div className="space-y-4">
              {deal.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Descripcion
                  </label>
                  <p className="mt-1 text-gray-900 dark:text-white">{deal.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Monto
                    </label>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(deal.amount)}
                    </p>
                  </div>
                </div>

                {deal.monthlyFee && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Fee Mensual
                      </label>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(deal.monthlyFee)}
                      </p>
                    </div>
                  </div>
                )}

                {deal.product && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Producto
                      </label>
                      <p className="text-gray-900 dark:text-white">{deal.product}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Cierre Esperado
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {formatDate(deal.expectedCloseDate)}
                    </p>
                  </div>
                </div>

                {deal.ownerName && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Responsable
                      </label>
                      <p className="text-gray-900 dark:text-white">{deal.ownerName}</p>
                    </div>
                  </div>
                )}

                {(linkedLead || deal.clientName) && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                      <Building2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {deal.clientName ? 'Cliente' : 'Lead'}
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {deal.clientName || linkedLead?.company || linkedLead?.contactName}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {deal.stage === 'ganado' && deal.wonNotes && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <label className="text-sm font-medium text-green-700 dark:text-green-300">
                    Notas de cierre
                  </label>
                  <p className="mt-1 text-green-800 dark:text-green-200">{deal.wonNotes}</p>
                </div>
              )}

              {deal.stage === 'perdido' && deal.lostReason && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <label className="text-sm font-medium text-red-700 dark:text-red-300">
                    Razon de perdida
                  </label>
                  <p className="mt-1 text-red-800 dark:text-red-200">{deal.lostReason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Stage History Timeline */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Historial de Etapas
            </h2>

            {historyLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : history.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                Sin historial de cambios
              </p>
            ) : (
              <div className="space-y-4">
                {history.map((entry, index) => {
                  const toConfig = getStageConfig(entry.toStage);
                  const fromConfig = entry.fromStage ? getStageConfig(entry.fromStage) : null;

                  return (
                    <div key={entry.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${toConfig.bgClass}`} />
                        {index < history.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          {fromConfig && (
                            <>
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${fromConfig.bgClass}`}>
                                {fromConfig.label}
                              </span>
                              <ArrowRight className="w-4 h-4 text-gray-400" />
                            </>
                          )}
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${toConfig.bgClass}`}>
                            {toConfig.label}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <span>{formatDateTime(entry.createdAt)}</span>
                          {entry.changedByName && (
                            <>
                              <span>-</span>
                              <span>{entry.changedByName}</span>
                            </>
                          )}
                        </div>
                        {entry.notes && (
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            {entry.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Activities Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Actividades
              </h2>
              <button
                onClick={() => setShowActivityModal(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nueva Actividad
              </button>
            </div>

            {dealActivities.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                Sin actividades registradas
              </p>
            ) : (
              <div className="space-y-3">
                {dealActivities.map((activity) => {
                  const typeConfig = ACTIVITY_TYPE_CONFIG[activity.activityType];
                  return (
                    <div
                      key={activity.id}
                      className={`p-4 rounded-lg border ${
                        activity.isCompleted
                          ? 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div
                            className="p-2 rounded-lg"
                            style={{ backgroundColor: `${typeConfig.color}20` }}
                          >
                            <FileText className="w-4 h-4" style={{ color: typeConfig.color }} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className="text-xs font-medium px-2 py-0.5 rounded"
                                style={{
                                  backgroundColor: `${typeConfig.color}20`,
                                  color: typeConfig.color,
                                }}
                              >
                                {typeConfig.label}
                              </span>
                              {activity.isCompleted && (
                                <span className="text-xs text-green-600 dark:text-green-400">
                                  Completada
                                </span>
                              )}
                            </div>
                            <h4
                              className={`mt-1 font-medium ${
                                activity.isCompleted
                                  ? 'text-gray-500 dark:text-gray-400 line-through'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              {activity.subject}
                            </h4>
                            {activity.description && (
                              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {activity.description}
                              </p>
                            )}
                            <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                              {activity.dueDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {formatDate(activity.dueDate)}
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
                        {!activity.isCompleted && (
                          <button
                            onClick={() => handleCompleteActivity(activity.id)}
                            className="px-3 py-1.5 text-xs font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          >
                            Completar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column - Stats */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Estadisticas
            </h2>

            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      Probabilidad
                    </label>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {deal.probability}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                    <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      Dias en Pipeline
                    </label>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                      {daysInPipeline}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-green-600 dark:text-green-400">
                      Valor Ponderado
                    </label>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {formatCurrency(weightedValue)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Won Modal */}
      <Modal isOpen={showWonModal} onClose={() => setShowWonModal(false)} title="Marcar como Ganado">
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Vas a marcar este deal como ganado. Selecciona las acciones adicionales:
          </p>

          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
              <input
                type="checkbox"
                checked={createClient}
                onChange={(e) => setCreateClient(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">Crear Cliente</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Crear un nuevo cliente en el modulo de finanzas
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
              <input
                type="checkbox"
                checked={createProject}
                onChange={(e) => setCreateProject(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">Crear Proyecto</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Crear un nuevo proyecto con los datos del deal
                </p>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notas (opcional)
            </label>
            <textarea
              value={wonNotes}
              onChange={(e) => setWonNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Notas sobre el cierre..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setShowWonModal(false)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleMarkWon}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Confirmar Ganado
            </button>
          </div>
        </div>
      </Modal>

      {/* Lost Modal */}
      <Modal
        isOpen={showLostModal}
        onClose={() => setShowLostModal(false)}
        title="Marcar como Perdido"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Vas a marcar este deal como perdido. Selecciona la razon:
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Razon de perdida
            </label>
            <select
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {LOST_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notas adicionales (opcional)
            </label>
            <textarea
              value={lostNotes}
              onChange={(e) => setLostNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Detalles adicionales..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setShowLostModal(false)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleMarkLost}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Confirmar Perdido
            </button>
          </div>
        </div>
      </Modal>

      {/* New Activity Modal */}
      <Modal
        isOpen={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        title="Nueva Actividad"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Actividad
            </label>
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as ActivityType)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Object.entries(ACTIVITY_TYPE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Asunto *
            </label>
            <input
              type="text"
              value={activitySubject}
              onChange={(e) => setActivitySubject(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Asunto de la actividad"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Descripcion
            </label>
            <textarea
              value={activityDescription}
              onChange={(e) => setActivityDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Descripcion de la actividad..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fecha de vencimiento
            </label>
            <input
              type="date"
              value={activityDueDate}
              onChange={(e) => setActivityDueDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setShowActivityModal(false)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddActivity}
              disabled={!activitySubject.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Crear Actividad
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
