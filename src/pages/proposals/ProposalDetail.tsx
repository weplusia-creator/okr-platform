import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Send,
  Copy,
  Download,
  Copy as Duplicate,
  User,
  Building2,
  Mail,
  Phone,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  ChevronDown,
  ChevronUp,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { useProposals } from '../../context/ProposalContext';
import { PROPOSAL_STATUS_CONFIG, type Proposal, type ProposalItem } from '../../types/proposals';
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

// Calculate days until expiry based on sentAt date and validityDays
const calculateDaysUntilExpiry = (sentAt: string | null, validityDays: number): number | null => {
  if (!sentAt) return null;
  const sentDate = new Date(sentAt);
  const expiryDate = new Date(sentDate.getTime() + validityDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diffTime = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export function ProposalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getProposal,
    fetchProposalItems,
    sendProposal,
    duplicateProposal,
    loading,
  } = useProposals();

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [items, setItems] = useState<ProposalItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Modal states
  const [showSendModal, setShowSendModal] = useState(false);
  const [showLinkCopied, setShowLinkCopied] = useState(false);
  const [sendingProposal, setSendingProposal] = useState(false);

  useEffect(() => {
    if (id) {
      loadProposal();
    }
  }, [id]);

  const loadProposal = async () => {
    if (!id) return;
    setLoadingData(true);
    try {
      const [proposalData, itemsData] = await Promise.all([
        getProposal(id),
        fetchProposalItems(id),
      ]);
      setProposal(proposalData);
      setItems(itemsData);
    } finally {
      setLoadingData(false);
    }
  };

  const toggleItemExpanded = (itemId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleSendProposal = async () => {
    if (!id) return;
    setSendingProposal(true);
    try {
      const token = await sendProposal(id);
      setShowSendModal(false);
      // Reload proposal to get updated status
      const updatedProposal = await getProposal(id);
      setProposal(updatedProposal);
      // Copy link to clipboard
      const shareUrl = `${window.location.origin}/p/${token}`;
      await navigator.clipboard.writeText(shareUrl);
      setShowLinkCopied(true);
      setTimeout(() => setShowLinkCopied(false), 3000);
    } catch (error) {
      console.error('Error sending proposal:', error);
    } finally {
      setSendingProposal(false);
    }
  };

  const handleCopyLink = async () => {
    if (!proposal?.shareToken) return;
    const shareUrl = `${window.location.origin}/p/${proposal.shareToken}`;
    await navigator.clipboard.writeText(shareUrl);
    setShowLinkCopied(true);
    setTimeout(() => setShowLinkCopied(false), 3000);
  };

  const handleDuplicate = async () => {
    if (!id) return;
    const duplicated = await duplicateProposal(id);
    if (duplicated) {
      navigate(`/proposals/${duplicated.id}`);
    }
  };

  const handleDownloadPDF = () => {
    // Placeholder for PDF download functionality
    alert('Funcionalidad de descarga de PDF proximamente disponible');
  };

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Propuesta no encontrada</p>
        <Link
          to="/proposals"
          className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Propuestas
        </Link>
      </div>
    );
  }

  const statusConfig = PROPOSAL_STATUS_CONFIG[proposal.status];
  const daysUntilExpiry = calculateDaysUntilExpiry(proposal.sentAt, proposal.validityDays);
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
  const isDraft = proposal.status === 'draft';
  const isSentOrViewed = proposal.status === 'sent' || proposal.status === 'viewed';

  return (
    <div className="space-y-6">
      {/* Link copied toast */}
      {showLinkCopied && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5" />
          <span>Link copiado al portapapeles</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/proposals"
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {proposal.proposalNumber}
              </span>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusConfig.bgClass}`}>
                {statusConfig.label}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {proposal.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Draft actions */}
          {isDraft && (
            <>
              <Link
                to={`/proposals/${proposal.id}/edit`}
                className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Edit className="w-5 h-5" />
                Editar
              </Link>
              <button
                onClick={() => setShowSendModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Send className="w-5 h-5" />
                Enviar Propuesta
              </button>
            </>
          )}

          {/* Sent/Viewed actions */}
          {isSentOrViewed && (
            <>
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Copy className="w-5 h-5" />
                Copiar Link
              </button>
              <button
                onClick={handleDownloadPDF}
                className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Download className="w-5 h-5" />
                Descargar PDF
              </button>
            </>
          )}

          {/* Duplicate for all non-draft */}
          {!isDraft && (
            <button
              onClick={handleDuplicate}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Duplicate className="w-5 h-5" />
              Duplicar
            </button>
          )}
        </div>
      </div>

      {/* Two columns layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Main content (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Info Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Informacion del Cliente
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Nombre
                  </label>
                  <p className="text-gray-900 dark:text-white">{proposal.clientName}</p>
                </div>
              </div>

              {proposal.clientCompany && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Empresa
                    </label>
                    <p className="text-gray-900 dark:text-white">{proposal.clientCompany}</p>
                  </div>
                </div>
              )}

              {proposal.clientEmail && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Email
                    </label>
                    <p className="text-gray-900 dark:text-white">{proposal.clientEmail}</p>
                  </div>
                </div>
              )}

              {proposal.clientPhone && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Phone className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Telefono
                    </label>
                    <p className="text-gray-900 dark:text-white">{proposal.clientPhone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Introduction */}
          {proposal.introduction && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Introduccion
              </h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {proposal.introduction}
              </p>
            </div>
          )}

          {/* Diagnostico y Objetivos */}
          {(proposal.objective || (proposal.strengths && proposal.strengths.length > 0) || (proposal.specificObjectives && proposal.specificObjectives.length > 0) || (proposal.centralGap && proposal.centralGap.length > 0)) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Diagnostico y Objetivos
              </h2>
              {proposal.objective && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Objetivo de la propuesta
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {proposal.objective}
                  </p>
                </div>
              )}
              {proposal.strengths && proposal.strengths.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Fortalezas actuales
                  </h3>
                  <ul className="list-disc list-inside space-y-1">
                    {proposal.strengths.map((s, idx) => (
                      <li key={idx} className="text-gray-700 dark:text-gray-300">{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {proposal.specificObjectives && proposal.specificObjectives.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Objetivos especificos
                  </h3>
                  <ul className="list-disc list-inside space-y-1">
                    {proposal.specificObjectives.map((obj, idx) => (
                      <li key={idx} className="text-gray-700 dark:text-gray-300">
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {proposal.centralGap && proposal.centralGap.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    GAP central encontrado
                  </h3>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-2 bg-gray-100 dark:bg-gray-700 px-4 py-2">
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Situacion actual</span>
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Situacion deseada</span>
                    </div>
                    {proposal.centralGap.map((row, idx) => (
                      <div key={idx} className="grid grid-cols-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-gray-700 dark:text-gray-300 pr-4">{row.current}</span>
                        <span className="text-gray-700 dark:text-gray-300">{row.desired}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Services List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Servicios / Productos
            </h2>

            {items.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No hay items en esta propuesta
              </p>
            ) : (
              <div className="space-y-4">
                {items.map((item) => {
                  const isExpanded = expandedItems.has(item.id);
                  const hasExpandableContent =
                    (item.benefits && item.benefits.length > 0) ||
                    item.methodology ||
                    (item.deliverables && item.deliverables.length > 0) ||
                    item.requirements;

                  return (
                    <div
                      key={item.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                    >
                      {/* Item header */}
                      <div
                        className={`p-4 ${hasExpandableContent ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''}`}
                        onClick={() => hasExpandableContent && toggleItemExpanded(item.id)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900 dark:text-white">
                                {item.name}
                              </h3>
                              {hasExpandableContent && (
                                <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                            </div>
                            {item.description && (
                              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(item.totalPrice)}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {formatCurrency(item.unitPrice)} x {item.quantity}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Expandable content */}
                      {isExpanded && hasExpandableContent && (
                        <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
                          {/* Benefits */}
                          {item.benefits && item.benefits.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Beneficios
                              </h4>
                              <ul className="list-disc list-inside space-y-1">
                                {item.benefits.map((benefit, idx) => (
                                  <li
                                    key={idx}
                                    className="text-sm text-gray-600 dark:text-gray-400"
                                  >
                                    {benefit}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Methodology */}
                          {item.methodology && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Metodologia
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                {item.methodology}
                              </p>
                            </div>
                          )}

                          {/* Deliverables */}
                          {item.deliverables && item.deliverables.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Entregables
                              </h4>
                              <ul className="list-disc list-inside space-y-1">
                                {item.deliverables.map((deliverable, idx) => (
                                  <li
                                    key={idx}
                                    className="text-sm text-gray-600 dark:text-gray-400"
                                  >
                                    {deliverable.name}
                                    {deliverable.description && (
                                      <span className="text-gray-500">
                                        {' '}- {deliverable.description}
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Requirements */}
                          {item.requirements && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Requisitos
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                {item.requirements}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pricing Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Resumen de Precios
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {formatCurrency(proposal.subtotal)}
                </span>
              </div>
              {proposal.discountPercent > 0 && (
                <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                  <span>Descuento ({proposal.discountPercent}%)</span>
                  <span>
                    -{formatCurrency(proposal.subtotal * (proposal.discountPercent / 100))}
                  </span>
                </div>
              )}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">Total</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(proposal.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          {proposal.termsAndConditions && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Terminos y Condiciones
              </h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {proposal.termsAndConditions}
              </p>
            </div>
          )}

          {/* Payment Terms */}
          {proposal.paymentTerms && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Condiciones de Pago
              </h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {proposal.paymentTerms}
              </p>
            </div>
          )}
        </div>

        {/* Right column - Status and info (1/3) */}
        <div className="space-y-6">
          {/* Status Timeline Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Estado de la Propuesta
            </h2>

            <div className="space-y-4">
              {/* Created */}
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  {(proposal.sentAt || proposal.viewedAt || proposal.acceptedAt || proposal.rejectedAt) && (
                    <div className="w-0.5 h-6 bg-gray-200 dark:bg-gray-700 mt-1" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Creada</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDateTime(proposal.createdAt)}
                  </p>
                </div>
              </div>

              {/* Sent */}
              {proposal.sentAt && (
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Send className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    {(proposal.viewedAt || proposal.acceptedAt || proposal.rejectedAt) && (
                      <div className="w-0.5 h-6 bg-gray-200 dark:bg-gray-700 mt-1" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Enviada</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(proposal.sentAt)}
                    </p>
                  </div>
                </div>
              )}

              {/* Viewed */}
              {proposal.viewedAt && (
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Eye className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    {(proposal.acceptedAt || proposal.rejectedAt) && (
                      <div className="w-0.5 h-6 bg-gray-200 dark:bg-gray-700 mt-1" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Vista</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(proposal.viewedAt)}
                    </p>
                  </div>
                </div>
              )}

              {/* Accepted */}
              {proposal.acceptedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Aceptada</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(proposal.acceptedAt)}
                    </p>
                  </div>
                </div>
              )}

              {/* Rejected */}
              {proposal.rejectedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Rechazada</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(proposal.rejectedAt)}
                    </p>
                    {proposal.rejectionReason && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {proposal.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Validity Info */}
          {proposal.sentAt && !proposal.acceptedAt && !proposal.rejectedAt && (
            <div
              className={`rounded-xl shadow-sm border p-6 ${
                isExpired
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : daysUntilExpiry !== null && daysUntilExpiry <= 7
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    isExpired
                      ? 'bg-red-100 dark:bg-red-900/50'
                      : daysUntilExpiry !== null && daysUntilExpiry <= 7
                        ? 'bg-yellow-100 dark:bg-yellow-900/50'
                        : 'bg-blue-100 dark:bg-blue-900/50'
                  }`}
                >
                  {isExpired ? (
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  ) : (
                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                <div>
                  <label
                    className={`text-sm font-medium ${
                      isExpired
                        ? 'text-red-600 dark:text-red-400'
                        : daysUntilExpiry !== null && daysUntilExpiry <= 7
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    Validez
                  </label>
                  <p
                    className={`text-lg font-bold ${
                      isExpired
                        ? 'text-red-700 dark:text-red-300'
                        : daysUntilExpiry !== null && daysUntilExpiry <= 7
                          ? 'text-yellow-700 dark:text-yellow-300'
                          : 'text-blue-700 dark:text-blue-300'
                    }`}
                  >
                    {isExpired
                      ? 'Vencida'
                      : daysUntilExpiry === 0
                        ? 'Vence hoy'
                        : daysUntilExpiry === 1
                          ? 'Vence manana'
                          : `${daysUntilExpiry} dias restantes`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Owner Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Responsable
            </h2>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {proposal.ownerName || 'Sin asignar'}
                </p>
                {proposal.createdByName && proposal.createdByName !== proposal.ownerName && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Creada por {proposal.createdByName}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Additional Info */}
          {(proposal.estimatedDurationDays || proposal.proposedStartDate) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Informacion Adicional
              </h2>
              <div className="space-y-4">
                {proposal.estimatedDurationDays && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Duracion Estimada
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {proposal.estimatedDurationDays} dias
                      </p>
                    </div>
                  </div>
                )}
                {proposal.proposedStartDate && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Inicio Propuesto
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {formatDate(proposal.proposedStartDate)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Send Confirmation Modal */}
      <Modal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        title="Enviar Propuesta"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Estas a punto de enviar esta propuesta. Una vez enviada, el cliente podra verla a traves
            de un link unico.
          </p>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Send className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  {proposal.title}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Cliente: {proposal.clientName}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Total: {formatCurrency(proposal.totalAmount)}
                </p>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            El link se copiara automaticamente al portapapeles despues de enviar.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setShowSendModal(false)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSendProposal}
              disabled={sendingProposal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {sendingProposal ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar Propuesta
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
