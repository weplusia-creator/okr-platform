import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Building2,
  User,
  Mail,
  Phone,
  Globe,
  MapPin,
  Linkedin,
  Tag,
  DollarSign,
  MessageSquare,
  Sparkles,
  Calendar,
  FileText,
  Clock,
  Copy,
  Loader2,
  X,
} from 'lucide-react';
import { useProspector } from '../../../context/ProspectorContext';
import {
  PROSPECT_STATUS_CONFIG,
  SCORE_LABEL_CONFIG,
  INTERACTION_TYPE_CONFIG,
  MESSAGE_TYPE_CONFIG,
  MESSAGE_TONE_CONFIG,
  type ProspectorInteraction,
  type InteractionType,
  type MessageType,
  type MessageTone,
} from '../../../types/prospector';
import { parseLocalDate } from '../../../utils/helpers';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  return parseLocalDate(dateString).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateTime = (dateString: string | null): string => {
  if (!dateString) return '-';
  return parseLocalDate(dateString).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const INTERACTION_ICONS: Record<string, React.ReactNode> = {
  Mail: <Mail className="w-4 h-4" />,
  Phone: <Phone className="w-4 h-4" />,
  Calendar: <Calendar className="w-4 h-4" />,
  FileText: <FileText className="w-4 h-4" />,
  Linkedin: <Linkedin className="w-4 h-4" />,
};

export function ProspectorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    prospects,
    loading,
    updateProspect,
    deleteProspect,
    fetchInteractions,
    addInteraction,
    generateMessage,
  } = useProspector();

  // Interactions state
  const [interactions, setInteractions] = useState<ProspectorInteraction[]>([]);
  const [interactionsLoading, setInteractionsLoading] = useState(true);

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Interaction modal
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [interactionType, setInteractionType] = useState<InteractionType>('email');
  const [interactionSubject, setInteractionSubject] = useState('');
  const [interactionBody, setInteractionBody] = useState('');
  const [interactionOutcome, setInteractionOutcome] = useState('');
  const [interactionDuration, setInteractionDuration] = useState<number | ''>('');
  const [savingInteraction, setSavingInteraction] = useState(false);

  // AI modal
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiMessageType, setAiMessageType] = useState<MessageType>('first_contact');
  const [aiTone, setAiTone] = useState<MessageTone>('formal');
  const [aiContext, setAiContext] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<{ subject: string; body: string } | null>(null);
  const [aiCopied, setAiCopied] = useState(false);

  const prospect = prospects.find((p) => p.id === id);

  const loadInteractions = useCallback(async () => {
    if (!id) return;
    setInteractionsLoading(true);
    try {
      const data = await fetchInteractions(id);
      setInteractions(data);
    } finally {
      setInteractionsLoading(false);
    }
  }, [id, fetchInteractions]);

  useEffect(() => {
    loadInteractions();
  }, [loadInteractions]);

  const handleDelete = async () => {
    if (!id) return;
    await deleteProspect(id);
    navigate('/tools/prospector');
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    await updateProspect(id, { status: newStatus as any });
  };

  const handleSaveInteraction = async () => {
    if (!id) return;
    setSavingInteraction(true);
    try {
      await addInteraction({
        prospectId: id,
        interactionType,
        subject: interactionSubject || undefined,
        body: interactionBody || undefined,
        outcome: interactionOutcome || undefined,
        durationMinutes: interactionDuration ? Number(interactionDuration) : undefined,
      });
      await loadInteractions();
      setShowInteractionModal(false);
      setInteractionType('email');
      setInteractionSubject('');
      setInteractionBody('');
      setInteractionOutcome('');
      setInteractionDuration('');
    } finally {
      setSavingInteraction(false);
    }
  };

  const handleGenerateMessage = async () => {
    if (!id) return;
    setAiGenerating(true);
    setAiResult(null);
    try {
      const result = await generateMessage(id, aiMessageType, aiTone, aiContext || undefined);
      setAiResult(result);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleCopyBody = async () => {
    if (!aiResult?.body) return;
    try {
      await navigator.clipboard.writeText(aiResult.body);
      setAiCopied(true);
      setTimeout(() => setAiCopied(false), 2000);
    } catch {
      // Fallback: do nothing
    }
  };

  const openAIModal = () => {
    setAiMessageType('first_contact');
    setAiTone('formal');
    setAiContext('');
    setAiResult(null);
    setAiCopied(false);
    setShowAIModal(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Not found
  if (!prospect) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Prospecto no encontrado</p>
        <Link
          to="/tools/prospector"
          className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Prospector
        </Link>
      </div>
    );
  }

  const statusConfig = PROSPECT_STATUS_CONFIG[prospect.status];
  const scoreConfig = SCORE_LABEL_CONFIG[prospect.scoreLabel];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/tools/prospector"
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {prospect.companyName}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{prospect.contactName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            to={`/tools/prospector/${id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Editar
          </Link>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Confirmar
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column: Company info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Empresa
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Empresa</label>
              <p className="text-sm text-gray-900 dark:text-white">{prospect.companyName}</p>
            </div>
            {prospect.industry && (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Industria</label>
                <p className="text-sm text-gray-900 dark:text-white">{prospect.industry}</p>
              </div>
            )}
            {prospect.companySize && (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Tamano</label>
                <p className="text-sm text-gray-900 dark:text-white">{prospect.companySize} empleados</p>
              </div>
            )}
            {prospect.website && (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Sitio Web</label>
                <a
                  href={prospect.website.startsWith('http') ? prospect.website : `https://${prospect.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Globe className="w-3.5 h-3.5" />
                  {prospect.website}
                </a>
              </div>
            )}
            {(prospect.country || prospect.city) && (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Ubicacion</label>
                <p className="flex items-center gap-1 text-sm text-gray-900 dark:text-white">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  {[prospect.city, prospect.country].filter(Boolean).join(', ')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Middle column: Contact info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Contacto
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Nombre</label>
              <p className="text-sm text-gray-900 dark:text-white">{prospect.contactName}</p>
            </div>
            {prospect.contactTitle && (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Cargo</label>
                <p className="text-sm text-gray-900 dark:text-white">{prospect.contactTitle}</p>
              </div>
            )}
            {prospect.email && (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Email</label>
                <a
                  href={`mailto:${prospect.email}`}
                  className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Mail className="w-3.5 h-3.5" />
                  {prospect.email}
                </a>
              </div>
            )}
            {prospect.phone && (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Telefono</label>
                <p className="flex items-center gap-1 text-sm text-gray-900 dark:text-white">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  {prospect.phone}
                </p>
              </div>
            )}
            {prospect.linkedinUrl && (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">LinkedIn</label>
                <a
                  href={prospect.linkedinUrl.startsWith('http') ? prospect.linkedinUrl : `https://${prospect.linkedinUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  Perfil de LinkedIn
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Scoring */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Scoring
          </h2>
          <div className="space-y-4">
            {/* Score */}
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold text-gray-900 dark:text-white">
                {prospect.score}
              </span>
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${scoreConfig.bgClass}`}>
                {scoreConfig.label}
              </span>
            </div>

            {/* Status */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Estado</label>
              <div className="mt-1">
                <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${statusConfig.bgClass}`}>
                  {statusConfig.label}
                </span>
              </div>
            </div>

            {/* Estimated value */}
            {prospect.estimatedValue > 0 && (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Valor Estimado</label>
                <p className="flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-white">
                  <DollarSign className="w-3.5 h-3.5 text-green-500" />
                  {formatCurrency(prospect.estimatedValue)}
                </p>
              </div>
            )}

            {/* Tags */}
            {prospect.tags.length > 0 && (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Tags</label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {prospect.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setShowInteractionModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          Agregar Interaccion
        </button>
        <button
          onClick={openAIModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Generar Mensaje IA
        </button>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 dark:text-gray-400">Estado:</label>
          <select
            value={prospect.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {Object.entries(PROSPECT_STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Interactions timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Interacciones{' '}
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            ({interactions.length})
          </span>
        </h2>

        {interactionsLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : interactions.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            Sin interacciones
          </p>
        ) : (
          <div className="space-y-4">
            {interactions.map((interaction, index) => {
              const typeConfig = INTERACTION_TYPE_CONFIG[interaction.interactionType];
              const icon = INTERACTION_ICONS[typeConfig.icon] || <FileText className="w-4 h-4" />;

              return (
                <div key={interaction.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`p-2 rounded-lg ${typeConfig.color} bg-gray-100 dark:bg-gray-700`}>
                      {icon}
                    </div>
                    {index < interactions.length - 1 && (
                      <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${typeConfig.color}`}>
                        {typeConfig.label}
                      </span>
                      {interaction.subject && (
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          - {interaction.subject}
                        </span>
                      )}
                    </div>
                    {interaction.body && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {interaction.body}
                      </p>
                    )}
                    {interaction.outcome && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-medium">Resultado:</span> {interaction.outcome}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDateTime(interaction.createdAt)}
                      </span>
                      {interaction.userName && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {interaction.userName}
                        </span>
                      )}
                      {interaction.durationMinutes && (
                        <span>{interaction.durationMinutes} min</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Notes */}
      {prospect.notes && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Notas</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {prospect.notes}
          </p>
        </div>
      )}

      {/* Add Interaction Modal */}
      {showInteractionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#272324] rounded-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Agregar Interaccion
              </h3>
              <button
                onClick={() => setShowInteractionModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tipo de Interaccion
              </label>
              <select
                value={interactionType}
                onChange={(e) => setInteractionType(e.target.value as InteractionType)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(INTERACTION_TYPE_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
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
                value={interactionSubject}
                onChange={(e) => setInteractionSubject(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Asunto de la interaccion"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Detalle
              </label>
              <textarea
                value={interactionBody}
                onChange={(e) => setInteractionBody(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Detalle de la interaccion..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Resultado
              </label>
              <input
                type="text"
                value={interactionOutcome}
                onChange={(e) => setInteractionOutcome(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Interesado, Sin respuesta, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Duracion (minutos)
              </label>
              <input
                type="number"
                value={interactionDuration}
                onChange={(e) => setInteractionDuration(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: 30"
                min={0}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowInteractionModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveInteraction}
                disabled={savingInteraction}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {savingInteraction ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Message Generation Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#272324] rounded-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Generar Mensaje IA
              </h3>
              <button
                onClick={() => setShowAIModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!aiResult ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo de Mensaje
                  </label>
                  <select
                    value={aiMessageType}
                    onChange={(e) => setAiMessageType(e.target.value as MessageType)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {Object.entries(MESSAGE_TYPE_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tono
                  </label>
                  <select
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value as MessageTone)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {Object.entries(MESSAGE_TONE_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contexto Adicional (opcional)
                  </label>
                  <textarea
                    value={aiContext}
                    onChange={(e) => setAiContext(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ej: Mencionaron que buscan mejorar su proceso de ventas..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowAIModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGenerateMessage}
                    disabled={aiGenerating}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {aiGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generar
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Asunto
                  </label>
                  <input
                    type="text"
                    value={aiResult.subject}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cuerpo del Mensaje
                  </label>
                  <textarea
                    value={aiResult.body}
                    readOnly
                    rows={8}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    onClick={() => setAiResult(null)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Generar otro
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleCopyBody}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      {aiCopied ? 'Copiado!' : 'Copiar'}
                    </button>
                    <button
                      onClick={() => setShowAIModal(false)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
