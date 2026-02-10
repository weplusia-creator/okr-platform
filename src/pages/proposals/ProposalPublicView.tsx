import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  FileText,
  Building2,
  Mail,
  Phone,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Proposal, ProposalItem } from '../../types/proposals';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

export function ProposalPublicView() {
  const { token } = useParams<{ token: string }>();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [items, setItems] = useState<ProposalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchProposal = async () => {
      if (!token) {
        setError('Token inválido');
        setLoading(false);
        return;
      }

      try {
        // Fetch proposal by token
        const { data: p, error: err } = await supabase
          .from('proposals')
          .select('*')
          .eq('share_token', token)
          .in('status', ['sent', 'viewed', 'accepted', 'rejected'])
          .single();

        if (err || !p) {
          setError('Propuesta no encontrada o no disponible');
          setLoading(false);
          return;
        }

        // Mark as viewed if status is 'sent'
        if (p.status === 'sent') {
          await supabase
            .from('proposals')
            .update({ status: 'viewed', viewed_at: new Date().toISOString() })
            .eq('id', p.id);
          p.status = 'viewed';
          p.viewed_at = new Date().toISOString();
        }

        setProposal({
          id: p.id,
          organizationId: p.organization_id,
          dealId: p.deal_id,
          clientId: p.client_id,
          proposalNumber: p.proposal_number,
          title: p.title,
          clientName: p.client_name,
          clientCompany: p.client_company,
          clientEmail: p.client_email,
          clientPhone: p.client_phone,
          introduction: p.introduction,
          objective: p.objective,
          specificObjectives: p.specific_objectives || [],
          centralGap: p.central_gap,
          termsAndConditions: p.terms_and_conditions,
          validityDays: p.validity_days,
          subtotal: parseFloat(p.subtotal) || 0,
          discountPercent: parseFloat(p.discount_percent) || 0,
          totalAmount: parseFloat(p.total_amount) || 0,
          currency: p.currency,
          paymentTerms: p.payment_terms,
          estimatedDurationDays: p.estimated_duration_days,
          proposedStartDate: p.proposed_start_date,
          status: p.status,
          sentAt: p.sent_at,
          viewedAt: p.viewed_at,
          acceptedAt: p.accepted_at,
          rejectedAt: p.rejected_at,
          rejectionReason: p.rejection_reason,
          shareToken: p.share_token,
          createdBy: p.created_by,
          ownerId: p.owner_id,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        });

        // Fetch items
        const { data: itemsData } = await supabase
          .from('proposal_items')
          .select('*')
          .eq('proposal_id', p.id)
          .order('sort_order', { ascending: true });

        setItems(
          (itemsData || []).map((item: any) => ({
            id: item.id,
            proposalId: item.proposal_id,
            productId: item.product_id,
            name: item.name,
            description: item.description,
            benefits: item.benefits || [],
            methodology: item.methodology,
            deliverables: item.deliverables || [],
            requirements: item.requirements,
            unitPrice: parseFloat(item.unit_price) || 0,
            quantity: item.quantity || 1,
            totalPrice: parseFloat(item.total_price) || 0,
            monthlyFee: item.monthly_fee ? parseFloat(item.monthly_fee) : null,
            estimatedDurationDays: item.estimated_duration_days,
            sortOrder: item.sort_order,
            createdAt: item.created_at,
          }))
        );
      } catch (err: any) {
        console.error('Error fetching proposal:', err);
        setError('Error al cargar la propuesta');
      } finally {
        setLoading(false);
      }
    };

    fetchProposal();
  }, [token]);

  const toggleItemExpanded = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleAccept = async () => {
    if (!proposal) return;
    setSubmitting(true);
    try {
      await supabase
        .from('proposals')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', proposal.id);
      setProposal({ ...proposal, status: 'accepted', acceptedAt: new Date().toISOString() });
      setShowAcceptModal(false);
    } catch (err) {
      console.error('Error accepting proposal:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!proposal || !rejectReason.trim()) return;
    setSubmitting(true);
    try {
      await supabase
        .from('proposals')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: rejectReason,
        })
        .eq('id', proposal.id);
      setProposal({
        ...proposal,
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectionReason: rejectReason,
      });
      setShowRejectModal(false);
    } catch (err) {
      console.error('Error rejecting proposal:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate validity
  const getValidityInfo = () => {
    if (!proposal?.sentAt) return null;
    const sentDate = new Date(proposal.sentAt);
    const expiresDate = new Date(sentDate);
    expiresDate.setDate(expiresDate.getDate() + proposal.validityDays);
    const now = new Date();
    const daysLeft = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { expiresDate, daysLeft };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="wau-accent-bar" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="wau-accent-bar" />
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
            <AlertTriangle className="w-16 h-16 text-danger-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Propuesta no disponible</h1>
            <p className="text-gray-600">{error || 'La propuesta que buscas no existe o ha expirado.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const validity = getValidityInfo();
  const isExpired = validity && validity.daysLeft < 0;
  const canRespond = proposal.status === 'viewed' && !isExpired;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* WAU Brand accent bar */}
      <div className="wau-accent-bar fixed top-0 left-0 right-0 z-20" />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-1 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/wau-logo.png" alt="WAU" className="w-10 h-10 object-contain" />
            <div>
              <p className="text-sm text-gray-500">Propuesta comercial</p>
              <p className="font-semibold text-gray-900">{proposal.proposalNumber}</p>
            </div>
          </div>
          {proposal.status === 'accepted' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-success-300 text-gray-900 rounded-full">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Aceptada</span>
            </div>
          )}
          {proposal.status === 'rejected' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-danger-100 text-danger-600 rounded-full">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">Rechazada</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Title and Client */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{proposal.title}</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Preparado para</p>
              <p className="font-semibold text-gray-900">{proposal.clientName}</p>
              {proposal.clientCompany && (
                <p className="text-gray-600 flex items-center gap-2 mt-1">
                  <Building2 className="w-4 h-4" />
                  {proposal.clientCompany}
                </p>
              )}
              {proposal.clientEmail && (
                <p className="text-gray-600 flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4" />
                  {proposal.clientEmail}
                </p>
              )}
              {proposal.clientPhone && (
                <p className="text-gray-600 flex items-center gap-2 mt-1">
                  <Phone className="w-4 h-4" />
                  {proposal.clientPhone}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">Fecha de envío</p>
              <p className="font-semibold text-gray-900">
                {proposal.sentAt ? formatDate(proposal.sentAt) : '-'}
              </p>
              {validity && (
                <p className={`text-sm mt-2 ${isExpired ? 'text-red-600' : validity.daysLeft <= 7 ? 'text-yellow-600' : 'text-gray-500'}`}>
                  {isExpired
                    ? 'Propuesta expirada'
                    : `Válida por ${validity.daysLeft} días más`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Introduction */}
        {proposal.introduction && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Introducción</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{proposal.introduction}</p>
          </div>
        )}

        {/* Diagnostico y Objetivos */}
        {(proposal.objective || (proposal.specificObjectives && proposal.specificObjectives.length > 0) || proposal.centralGap) && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Diagnóstico y Objetivos</h2>
            {proposal.objective && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Objetivo de la propuesta</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{proposal.objective}</p>
              </div>
            )}
            {proposal.specificObjectives && proposal.specificObjectives.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Objetivos específicos</h3>
                <ul className="space-y-1">
                  {proposal.specificObjectives.map((obj, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <Check className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
                      {obj}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {proposal.centralGap && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">GAP central encontrado</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{proposal.centralGap}</p>
              </div>
            )}
          </div>
        )}

        {/* Services */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Servicios incluidos</h2>
          <div className="space-y-4">
            {items.map((item, index) => {
              const isExpanded = expandedItems.has(item.id);
              const hasDetails =
                item.benefits.length > 0 ||
                item.methodology ||
                item.deliverables.length > 0 ||
                item.requirements ||
                item.scope ||
                item.outOfScope ||
                (item.faqs && item.faqs.length > 0);

              return (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <div
                    className={`p-4 ${hasDetails ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    onClick={() => hasDetails && toggleItemExpanded(item.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-success-300 text-gray-900 rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </span>
                          <h3 className="font-semibold text-gray-900">{item.name}</h3>
                        </div>
                        {item.description && (
                          <p className="text-gray-600 mt-2 ml-8">{item.description}</p>
                        )}
                      </div>
                      <div className="text-right ml-4 flex items-center gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(item.totalPrice)}
                          </p>
                          {item.quantity > 1 && (
                            <p className="text-sm text-gray-500">
                              {item.quantity} x {formatCurrency(item.unitPrice)}
                            </p>
                          )}
                        </div>
                        {hasDetails && (
                          isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-4">
                      {item.benefits.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Beneficios</h4>
                          <ul className="space-y-1">
                            {item.benefits.map((benefit, i) => (
                              <li key={i} className="flex items-start gap-2 text-gray-700">
                                <Check className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {item.methodology && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Metodología</h4>
                          <p className="text-gray-700 whitespace-pre-wrap">{item.methodology}</p>
                        </div>
                      )}

                      {item.deliverables.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Entregables</h4>
                          <ul className="space-y-2">
                            {item.deliverables.map((del, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="w-5 h-5 bg-primary-100 text-primary-700 rounded flex items-center justify-center text-xs font-medium flex-shrink-0">
                                  {i + 1}
                                </span>
                                <div>
                                  <p className="text-gray-900">{del.name}</p>
                                  {del.description && (
                                    <p className="text-sm text-gray-500">{del.description}</p>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {item.requirements && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Requisitos</h4>
                          <p className="text-gray-700 whitespace-pre-wrap">{item.requirements}</p>
                        </div>
                      )}

                      {item.scope && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Qué incluye</h4>
                          <p className="text-gray-700 whitespace-pre-wrap">{item.scope}</p>
                        </div>
                      )}

                      {item.outOfScope && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Qué NO incluye</h4>
                          <p className="text-gray-700 whitespace-pre-wrap">{item.outOfScope}</p>
                        </div>
                      )}

                      {item.faqs && item.faqs.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Preguntas Frecuentes</h4>
                          <div className="space-y-3">
                            {item.faqs.map((faq, i) => (
                              <div key={i} className="bg-white rounded-lg p-3 border border-gray-200">
                                <p className="font-medium text-gray-900 mb-1">{faq.question}</p>
                                <p className="text-gray-600 text-sm">{faq.answer}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {item.estimatedDurationDays && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>Duración estimada: {item.estimatedDurationDays} días</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen de inversión</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(proposal.subtotal)}</span>
            </div>
            {proposal.discountPercent > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Descuento ({proposal.discountPercent}%)</span>
                <span>-{formatCurrency(proposal.subtotal * (proposal.discountPercent / 100))}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-3 flex justify-between">
              <span className="text-xl font-bold text-gray-900">Total</span>
              <span className="text-xl font-bold text-primary-600">
                {formatCurrency(proposal.totalAmount)}
              </span>
            </div>
          </div>

          {proposal.paymentTerms && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">Condiciones de pago</p>
              <p className="text-gray-700">{proposal.paymentTerms}</p>
            </div>
          )}
        </div>

        {/* Terms */}
        {proposal.termsAndConditions && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Términos y condiciones</h2>
            <p className="text-gray-700 whitespace-pre-wrap text-sm">{proposal.termsAndConditions}</p>
          </div>
        )}

        {/* Action Buttons */}
        {canRespond && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">¿Qué te parece esta propuesta?</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setShowAcceptModal(true)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                <CheckCircle2 className="w-5 h-5" />
                Aceptar propuesta
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                <XCircle className="w-5 h-5" />
                Rechazar propuesta
              </button>
            </div>
          </div>
        )}

        {/* Rejection reason */}
        {proposal.status === 'rejected' && proposal.rejectionReason && (
          <div className="bg-danger-50 border border-danger-200 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-danger-600 mb-2">Motivo del rechazo</h2>
            <p className="text-danger-500">{proposal.rejectionReason}</p>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center py-8 mt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Propuesta generada con{' '}
            <span className="font-semibold text-gray-900">WAU Platform</span>
          </p>
        </footer>
      </main>

      {/* Accept Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Confirmar aceptación</h2>
            <p className="text-gray-600 mb-6">
              Al aceptar esta propuesta, estás confirmando tu interés en los servicios descritos.
              Nos pondremos en contacto contigo para coordinar los próximos pasos.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAcceptModal(false)}
                disabled={submitting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAccept}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {submitting ? 'Confirmando...' : 'Confirmar aceptación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Rechazar propuesta</h2>
            <p className="text-gray-600 mb-4">
              Lamentamos que esta propuesta no se ajuste a tus necesidades.
              Por favor, indicanos el motivo para poder mejorar.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motivo del rechazo..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 mb-4"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={submitting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={submitting || !rejectReason.trim()}
                className="flex-1 px-4 py-2 bg-danger-500 text-white rounded-lg hover:bg-danger-600 disabled:opacity-50"
              >
                {submitting ? 'Enviando...' : 'Confirmar rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
