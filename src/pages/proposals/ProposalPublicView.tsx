import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Building2,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
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
  const [searchParams] = useSearchParams();
  const printMode = searchParams.get('print') === '1';
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [items, setItems] = useState<ProposalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const fetchProposal = async () => {
      if (!token) {
        setError('Token invalido');
        setLoading(false);
        return;
      }
      try {
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

        if (p.status === 'sent') {
          await supabase
            .from('proposals')
            .update({ status: 'viewed', viewed_at: new Date().toISOString() })
            .eq('id', p.id);
          p.status = 'viewed';
          p.viewed_at = new Date().toISOString();
        }

        setProposal({
          id: p.id, organizationId: p.organization_id, dealId: p.deal_id, clientId: p.client_id,
          proposalNumber: p.proposal_number, title: p.title, clientName: p.client_name,
          clientCompany: p.client_company, clientEmail: p.client_email, clientPhone: p.client_phone,
          introduction: p.introduction, objective: p.objective,
          strengths: p.strengths || [], specificObjectives: p.specific_objectives || [],
          centralGap: p.central_gap || [], termsAndConditions: p.terms_and_conditions,
          validityDays: p.validity_days, subtotal: parseFloat(p.subtotal) || 0,
          discountPercent: parseFloat(p.discount_percent) || 0,
          totalAmount: parseFloat(p.total_amount) || 0, currency: p.currency,
          paymentTerms: p.payment_terms, estimatedDurationDays: p.estimated_duration_days,
          proposedStartDate: p.proposed_start_date, status: p.status,
          sentAt: p.sent_at, viewedAt: p.viewed_at, acceptedAt: p.accepted_at,
          rejectedAt: p.rejected_at, rejectionReason: p.rejection_reason,
          shareToken: p.share_token, createdBy: p.created_by, ownerId: p.owner_id,
          createdAt: p.created_at, updatedAt: p.updated_at,
        });

        const { data: itemsData } = await supabase
          .from('proposal_items')
          .select('*')
          .eq('proposal_id', p.id)
          .order('sort_order', { ascending: true });

        setItems(
          (itemsData || []).map((item: any) => ({
            id: item.id, proposalId: item.proposal_id, productId: item.product_id,
            name: item.name, description: item.description, benefits: item.benefits || [],
            methodology: item.methodology, deliverables: item.deliverables || [],
            requirements: item.requirements, unitPrice: parseFloat(item.unit_price) || 0,
            quantity: item.quantity || 1, totalPrice: parseFloat(item.total_price) || 0,
            monthlyFee: item.monthly_fee ? parseFloat(item.monthly_fee) : null,
            estimatedDurationDays: item.estimated_duration_days,
            sortOrder: item.sort_order, createdAt: item.created_at,
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

  // Auto-trigger print in print mode
  useEffect(() => {
    if (printMode && !loading && proposal) {
      const timer = setTimeout(() => window.print(), 600);
      return () => clearTimeout(timer);
    }
  }, [printMode, loading, proposal]);

  const toggleItemExpanded = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  };

  const handleAccept = async () => {
    if (!proposal) return;
    setSubmitting(true);
    try {
      await supabase.from('proposals').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', proposal.id);
      setProposal({ ...proposal, status: 'accepted', acceptedAt: new Date().toISOString() });
      setShowAcceptModal(false);
    } catch (err) { console.error('Error accepting proposal:', err); }
    finally { setSubmitting(false); }
  };

  const handleReject = async () => {
    if (!proposal || !rejectReason.trim()) return;
    setSubmitting(true);
    try {
      await supabase.from('proposals').update({ status: 'rejected', rejected_at: new Date().toISOString(), rejection_reason: rejectReason }).eq('id', proposal.id);
      setProposal({ ...proposal, status: 'rejected', rejectedAt: new Date().toISOString(), rejectionReason: rejectReason });
      setShowRejectModal(false);
    } catch (err) { console.error('Error rejecting proposal:', err); }
    finally { setSubmitting(false); }
  };

  const getValidityInfo = () => {
    if (!proposal?.sentAt) return null;
    const sentDate = new Date(proposal.sentAt);
    const expiresDate = new Date(sentDate);
    expiresDate.setDate(expiresDate.getDate() + proposal.validityDays);
    const now = new Date();
    const daysLeft = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { expiresDate, daysLeft };
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#231F1F' }}>
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-[#D4FC59]/20" />
            <div className="absolute inset-0 rounded-full border-4 border-t-[#D4FC59] animate-spin" />
          </div>
          <p className="text-white/70 text-sm tracking-widest uppercase">Cargando propuesta...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error || !proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#231F1F' }}>
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-[#FF4632] mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-3">Propuesta no disponible</h1>
          <p className="text-white/70">{error || 'La propuesta que buscas no existe o ha expirado.'}</p>
        </div>
      </div>
    );
  }

  const validity = getValidityInfo();
  const isExpired = validity && validity.daysLeft < 0;
  const canRespond = proposal.status === 'viewed' && !isExpired;

  // ========== PRINT MODE ==========
  if (printMode) {
    return (
      <div className="print-proposal">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&display=swap');
          .font-display { font-family: 'Playfair Display', Georgia, serif; }
          @media print {
            @page { margin: 0; size: A4 landscape; }
            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .print-slide { page-break-after: always; break-after: page; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; }
            .print-slide:last-child { page-break-after: avoid; }
            .no-print { display: none !important; }
          }
          @media screen {
            .print-slide { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; }
          }
        `}</style>

        {/* Slide 1: Cover */}
        <div className="print-slide" style={{ background: '#231F1F' }}>
          <div className="px-12 sm:px-20 py-16">
            <img src="/wau-logo.png" alt="WAU" className="w-14 h-14 object-contain mb-10 opacity-60" />
            <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', color: '#D4FC59', fontSize: '1.3rem', marginBottom: '0.5rem' }}>
              {proposal.clientCompany ? `( ${proposal.clientCompany} )` : `( ${proposal.clientName} )`}
            </p>
            <h1 style={{ color: '#fff', fontSize: '3.5rem', fontWeight: 800, textTransform: 'uppercase', lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: '1.5rem' }}>
              {proposal.title}
            </h1>
            <div style={{ width: '6rem', height: '4px', background: '#D4FC59', marginBottom: '2.5rem' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '0.5rem' }}>Preparado para</p>
                <p style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 600 }}>{proposal.clientName}</p>
                {proposal.clientCompany && <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '0.25rem' }}>{proposal.clientCompany}</p>}
                {proposal.clientEmail && <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '0.25rem' }}>{proposal.clientEmail}</p>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '0.5rem' }}>Fecha</p>
                <p style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 600 }}>{proposal.sentAt ? formatDate(proposal.sentAt) : '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Slide: Introduction */}
        {proposal.introduction && (
          <div className="print-slide" style={{ background: '#231F1F' }}>
            <div className="px-12 sm:px-20 py-16">
              <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', color: '#D4FC59', fontSize: '2rem', marginBottom: '0.5rem' }}>Introduccion</p>
              <div style={{ width: '5rem', height: '4px', background: '#FF4632', marginBottom: '2.5rem' }} />
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.15rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', textAlign: 'justify', maxWidth: '50rem' }}>
                {proposal.introduction}
              </p>
            </div>
          </div>
        )}

        {/* Slide: Objective */}
        {proposal.objective && (
          <div className="print-slide" style={{ background: '#231F1F' }}>
            <div className="px-12 sm:px-20 py-16">
              {proposal.clientCompany && (
                <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', color: '#D4FC59', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                  ( {proposal.clientCompany} )
                </p>
              )}
              <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', color: '#D4FC59', fontSize: '2rem', marginBottom: '0.5rem' }}>Objetivo general:</p>
              <div style={{ width: '5rem', height: '4px', background: '#D4FC59', marginBottom: '2.5rem' }} />
              <p style={{ color: '#fff', fontSize: '1.4rem', lineHeight: 1.6, fontWeight: 600, textAlign: 'justify', maxWidth: '50rem' }}>
                {proposal.objective}
              </p>
            </div>
          </div>
        )}

        {/* Slide: Strengths */}
        {proposal.strengths && proposal.strengths.length > 0 && (
          <div className="print-slide" style={{ background: '#FF4632' }}>
            <div className="px-12 sm:px-20 py-16">
              <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', color: '#D4FC59', fontSize: '1.5rem' }}>FORTALEZAS</p>
              <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', color: '#fff', fontSize: '2.5rem', lineHeight: 1.2, marginBottom: '1rem' }}>
                actuales de <strong>{proposal.clientCompany || proposal.clientName}</strong>
              </p>
              <div style={{ width: '5rem', height: '3px', background: 'rgba(255,255,255,0.8)', marginBottom: '2rem' }} />
              {proposal.strengths.map((s, idx) => (
                <p key={idx} style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.8rem' }}>
                  <span style={{ color: 'rgba(255,255,255,0.8)', marginRight: '0.75rem' }}>{idx + 1}.</span>{s}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Slide: Specific Objectives */}
        {proposal.specificObjectives && proposal.specificObjectives.length > 0 && (
          <div className="print-slide" style={{ background: '#FFFBE8' }}>
            <div className="px-12 sm:px-20 py-16">
              <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', color: '#FF4632', fontSize: '2.5rem', lineHeight: 1.2, marginBottom: '0.5rem' }}>
                Objetivos especificos
              </p>
              <div style={{ width: '6rem', height: '4px', background: '#FF4632', marginBottom: '2.5rem' }} />
              {proposal.specificObjectives.map((obj, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
                  <span style={{ color: '#3100E2', fontSize: '1.5rem', lineHeight: 1, flexShrink: 0 }}>•</span>
                  <p style={{ color: '#3100E2', fontSize: '1.15rem', lineHeight: 1.5 }}>{obj}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Slide: GAP */}
        {proposal.centralGap && proposal.centralGap.length > 0 && (
          <div className="print-slide" style={{ background: '#3100E2' }}>
            <div className="px-12 sm:px-20 py-16">
              <h2 style={{ color: '#D4FC59', fontSize: '3rem', fontWeight: 700, lineHeight: 1.1, marginBottom: '1rem' }}>GAP central identificado</h2>
              <div style={{ width: '6rem', height: '4px', background: '#D4FC59', marginBottom: '2rem' }} />
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid rgba(255,255,255,0.8)' }}>
                <thead>
                  <tr>
                    <th style={{ background: '#D4FC59', color: '#231F1F', padding: '0.75rem 1.25rem', textAlign: 'left', fontWeight: 700, fontSize: '1.05rem' }}>Situacion actual</th>
                    <th style={{ background: '#D4FC59', color: '#231F1F', padding: '0.75rem 1.25rem', textAlign: 'left', fontWeight: 700, fontSize: '1.05rem', borderLeft: '1px solid rgba(49,0,226,0.2)' }}>Situacion deseada</th>
                  </tr>
                </thead>
                <tbody>
                  {proposal.centralGap.map((row, idx) => (
                    <tr key={idx} style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                      <td style={{ padding: '1rem 1.25rem', color: '#fff', fontSize: '1.05rem' }}>{row.current}</td>
                      <td style={{ padding: '1rem 1.25rem', color: '#fff', fontSize: '1.05rem', borderLeft: '1px solid rgba(255,255,255,0.2)' }}>{row.desired}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Slide: Services */}
        {items.length > 0 && (
          <div className="print-slide" style={{ background: '#231F1F' }}>
            <div className="px-12 sm:px-20 py-16">
              <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', color: '#D4FC59', fontSize: '2rem', marginBottom: '0.5rem' }}>Servicios incluidos</p>
              <div style={{ width: '5rem', height: '4px', background: '#FF4632', marginBottom: '2rem' }} />
              {items.map((item, index) => (
                <div key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ width: '2rem', height: '2rem', borderRadius: '4px', background: '#D4FC59', color: '#231F1F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, flexShrink: 0 }}>{index + 1}</span>
                      <div>
                        <p style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 700 }}>{item.name}</p>
                        {item.description && <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginTop: '0.25rem' }}>{item.description}</p>}
                      </div>
                    </div>
                    <span style={{ color: '#D4FC59', fontWeight: 700, fontSize: '1.15rem', flexShrink: 0, marginLeft: '1rem' }}>{formatCurrency(item.totalPrice)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Slide: Investment */}
        <div className="print-slide" style={{ background: '#231F1F' }}>
          <div className="px-12 sm:px-20 py-16">
            <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', color: '#D4FC59', fontSize: '2rem', marginBottom: '0.5rem' }}>Resumen de inversion</p>
            <div style={{ width: '5rem', height: '4px', background: '#D4FC59', marginBottom: '2.5rem' }} />
            {items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem 0' }}>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>{item.name}</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{formatCurrency(item.totalPrice)}</span>
              </div>
            ))}
            <div style={{ borderTop: '2px solid rgba(255,255,255,0.2)', marginTop: '1.5rem', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <span style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700, textTransform: 'uppercase' }}>Total</span>
              <span style={{ color: '#D4FC59', fontSize: '3rem', fontWeight: 700 }}>{formatCurrency(proposal.totalAmount)}</span>
            </div>
            {proposal.paymentTerms && (
              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '0.5rem' }}>Condiciones de pago</p>
                <p style={{ color: 'rgba(255,255,255,0.8)' }}>{proposal.paymentTerms}</p>
              </div>
            )}
          </div>
        </div>

        {/* Print button (screen only) */}
        <div className="no-print" style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 50 }}>
          <button
            onClick={() => window.print()}
            style={{ background: '#D4FC59', color: '#231F1F', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            Descargar PDF
          </button>
        </div>
      </div>
    );
  }

  // Build steps — each diagnostico section is its own slide
  const steps: { key: string; label: string }[] = [{ key: 'intro', label: 'Inicio' }];
  if (proposal.introduction) steps.push({ key: 'introduccion', label: 'Introduccion' });
  if (proposal.objective) steps.push({ key: 'objetivo', label: 'Objetivo' });
  if (proposal.strengths && proposal.strengths.length > 0) steps.push({ key: 'fortalezas', label: 'Fortalezas' });
  if (proposal.specificObjectives && proposal.specificObjectives.length > 0) steps.push({ key: 'objetivos_esp', label: 'Objetivos' });
  if (proposal.centralGap && proposal.centralGap.length > 0) steps.push({ key: 'gap', label: 'GAP' });
  if (items.length > 0) steps.push({ key: 'servicios', label: 'Servicios' });
  steps.push({ key: 'inversion', label: 'Inversion' });
  if (canRespond || proposal.status === 'accepted' || proposal.status === 'rejected') {
    steps.push({ key: 'decision', label: 'Decision' });
  }

  const totalSteps = steps.length;
  const activeStepKey = steps[currentStep]?.key || 'intro';

  const goNext = () => { setCurrentStep((s) => Math.min(totalSteps - 1, s + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goPrev = () => { setCurrentStep((s) => Math.max(0, s - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  // Slide background per step
  const slideBg: Record<string, string> = {
    intro: '#231F1F',
    introduccion: '#231F1F',
    objetivo: '#231F1F',
    fortalezas: '#FF4632',
    objetivos_esp: '#FFFBE8',
    gap: '#3100E2',
    servicios: '#231F1F',
    inversion: '#231F1F',
    decision: '#231F1F',
  };

  const bg = slideBg[activeStepKey] || '#231F1F';
  const isLightSlide = activeStepKey === 'objetivos_esp';

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ background: bg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&display=swap');
        .font-display { font-family: 'Playfair Display', Georgia, serif; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slideIn { animation: slideIn 0.6s ease-out; }
      `}</style>

      {/* Fixed Nav Bar */}
      <nav className="fixed top-0 left-0 right-0 z-30 transition-colors duration-500" style={{ background: bg }}>
        <div className="h-1" style={{ background: 'linear-gradient(90deg, #3100E2 0%, #D4FC59 50%, #FF4632 100%)' }} />
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/wau-logo.png" alt="WAU" className="w-8 h-8 object-contain" />
            <span className={`text-xs font-medium tracking-widest uppercase ${isLightSlide ? 'text-[#231F1F]/40' : 'text-white/60'}`}>
              {proposal.proposalNumber}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {proposal.status === 'accepted' && (
              <span className="text-xs font-bold tracking-widest uppercase text-[#D4FC59]">Aceptada</span>
            )}
            {proposal.status === 'rejected' && (
              <span className="text-xs font-bold tracking-widest uppercase text-[#FF4632]">Rechazada</span>
            )}
            <span className={`text-xs ${isLightSlide ? 'text-[#231F1F]/30' : 'text-white/50'}`}>
              {currentStep + 1}/{totalSteps}
            </span>
          </div>
        </div>
        {/* Progress line */}
        <div className="h-0.5 bg-black/10">
          <div
            className="h-full bg-[#D4FC59] transition-all duration-500 ease-out"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </nav>

      {/* Slide Content */}
      <main className="min-h-screen flex flex-col justify-center pt-16 pb-24">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 w-full animate-slideIn" key={activeStepKey}>

          {/* ===== SLIDE: INTRO (Cover) ===== */}
          {activeStepKey === 'intro' && (
            <div className="py-12 sm:py-20">
              <div className="mb-8">
                <img src="/wau-logo.png" alt="WAU" className="w-16 h-16 object-contain mb-8 opacity-60" />
              </div>
              <p className="text-[#D4FC59] font-display italic text-lg sm:text-xl mb-4">
                {proposal.clientCompany ? `( ${proposal.clientCompany} )` : `( ${proposal.clientName} )`}
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white uppercase tracking-tight leading-[1.1] mb-8">
                {proposal.title}
              </h1>
              <div className="w-24 h-1 bg-[#D4FC59] mb-10" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-12">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/60 mb-3">Preparado para</p>
                  <p className="text-xl font-semibold text-white mb-2">{proposal.clientName}</p>
                  {proposal.clientCompany && (
                    <p className="text-white/70 flex items-center gap-2"><Building2 className="w-4 h-4" />{proposal.clientCompany}</p>
                  )}
                  {proposal.clientEmail && (
                    <p className="text-white/70 flex items-center gap-2 mt-1"><Mail className="w-4 h-4" />{proposal.clientEmail}</p>
                  )}
                  {proposal.clientPhone && (
                    <p className="text-white/70 flex items-center gap-2 mt-1"><Phone className="w-4 h-4" />{proposal.clientPhone}</p>
                  )}
                </div>
                <div className="sm:text-right">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/60 mb-3">Fecha</p>
                  <p className="text-xl font-semibold text-white">{proposal.sentAt ? formatDate(proposal.sentAt) : '-'}</p>
                  {validity && (
                    <p className={`text-sm mt-2 ${isExpired ? 'text-[#FF4632]' : 'text-white/70'}`}>
                      {isExpired ? 'Propuesta expirada' : `Valida por ${validity.daysLeft} dias`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===== SLIDE: INTRODUCCION (dark bg) ===== */}
          {activeStepKey === 'introduccion' && (
            <div className="py-12 sm:py-20">
              <p className="font-display italic text-[#D4FC59] text-2xl sm:text-3xl mb-2">Introduccion</p>
              <div className="w-20 h-1 bg-[#FF4632] mb-10" />
              <p className="text-white/80 text-lg sm:text-xl leading-relaxed whitespace-pre-wrap max-w-3xl" style={{ textAlign: 'justify' }}>
                {proposal.introduction}
              </p>
            </div>
          )}

          {/* ===== SLIDE: OBJETIVO (dark bg) ===== */}
          {activeStepKey === 'objetivo' && (
            <div className="py-12 sm:py-20">
              <p className="text-[#D4FC59] font-display italic text-lg mb-1">
                {proposal.clientCompany ? `( ${proposal.clientCompany} )` : ''}
              </p>
              <p className="font-display italic text-[#D4FC59] text-2xl sm:text-3xl mb-2">Objetivo general:</p>
              <div className="w-20 h-1 bg-[#D4FC59] mb-10" />
              <p className="text-white text-xl sm:text-2xl leading-relaxed font-semibold max-w-3xl" style={{ textAlign: 'justify' }}>
                {proposal.objective}
              </p>
            </div>
          )}

          {/* ===== SLIDE: FORTALEZAS (orange bg) ===== */}
          {activeStepKey === 'fortalezas' && (
            <div className="py-12 sm:py-20">
              <p className="font-display italic text-[#D4FC59] text-xl sm:text-2xl leading-tight">
                FORTALEZAS
              </p>
              <p className="font-display italic text-white text-3xl sm:text-4xl lg:text-5xl leading-tight mb-2">
                actuales de <strong>{proposal.clientCompany || proposal.clientName}</strong>
              </p>
              <div className="w-20 h-1 bg-white/30 mb-10 mt-4" />
              <div className="space-y-4 mt-8">
                {proposal.strengths!.map((s, idx) => (
                  <p key={idx} className="text-white text-lg sm:text-xl font-bold uppercase tracking-wide">
                    <span className="text-white/80 mr-3">{idx + 1}.</span>
                    {s}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* ===== SLIDE: OBJETIVOS ESPECIFICOS (light/sand bg) ===== */}
          {activeStepKey === 'objetivos_esp' && (
            <div className="py-12 sm:py-20">
              <p className="font-display italic text-[#FF4632] text-3xl sm:text-4xl lg:text-5xl leading-tight mb-2">
                Objetivos especificos
              </p>
              <div className="w-24 h-1 bg-[#FF4632] mb-10 mt-4" />
              <div className="space-y-5 mt-8 max-w-3xl">
                {proposal.specificObjectives!.map((obj, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className="text-[#3100E2] text-2xl leading-none mt-1 flex-shrink-0">•</span>
                    <p className="text-[#3100E2] text-lg sm:text-xl leading-relaxed">
                      {obj}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== SLIDE: GAP CENTRAL (blue bg) ===== */}
          {activeStepKey === 'gap' && (
            <div className="py-12 sm:py-20">
              <h2 className="text-[#D4FC59] text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-3">
                GAP central identificado
              </h2>
              <div className="w-24 h-1 bg-[#D4FC59] mb-10 mt-4" />
              <div className="mt-8 border border-white/30 rounded-sm overflow-hidden">
                <div className="grid grid-cols-2">
                  <div className="px-6 py-4 bg-[#D4FC59]">
                    <span className="text-[#231F1F] font-bold text-base sm:text-lg">Situacion actual</span>
                  </div>
                  <div className="px-6 py-4 bg-[#D4FC59] border-l border-[#3100E2]/20">
                    <span className="text-[#231F1F] font-bold text-base sm:text-lg">Situacion deseada</span>
                  </div>
                </div>
                {proposal.centralGap!.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-2 border-t border-white/20">
                    <div className="px-6 py-5">
                      <span className="text-white text-base sm:text-lg">{row.current}</span>
                    </div>
                    <div className="px-6 py-5 border-l border-white/20">
                      <span className="text-white text-base sm:text-lg">{row.desired}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== SLIDE: SERVICIOS (dark bg) ===== */}
          {activeStepKey === 'servicios' && (
            <div className="py-12 sm:py-20">
              <p className="font-display italic text-[#D4FC59] text-2xl sm:text-3xl mb-2">Servicios incluidos</p>
              <div className="w-20 h-1 bg-[#FF4632] mb-10" />
              <div className="space-y-6 mt-8">
                {items.map((item, index) => {
                  const isItemExpanded = expandedItems.has(item.id);
                  const hasDetails = item.benefits.length > 0 || item.methodology || item.deliverables.length > 0 || item.requirements || item.scope || item.outOfScope || (item.faqs && item.faqs.length > 0);

                  return (
                    <div key={item.id} className="border border-white/10 rounded-lg overflow-hidden">
                      <div
                        className={`p-5 sm:p-6 ${hasDetails ? 'cursor-pointer hover:bg-white/[0.03]' : ''} transition-colors`}
                        onClick={() => hasDetails && toggleItemExpanded(item.id)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="w-10 h-10 rounded-md bg-[#D4FC59] text-[#231F1F] flex items-center justify-center text-sm font-bold flex-shrink-0">
                                {index + 1}
                              </span>
                              <div>
                                <h3 className="text-lg sm:text-xl font-bold text-white">{item.name}</h3>
                                {item.description && (
                                  <p className="text-white/70 mt-1 text-sm">{item.description}</p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[#D4FC59] font-bold text-lg sm:text-xl">{formatCurrency(item.totalPrice)}</span>
                            {hasDetails && (
                              isItemExpanded
                                ? <ChevronUp className="w-5 h-5 text-white/60" />
                                : <ChevronDown className="w-5 h-5 text-white/60" />
                            )}
                          </div>
                        </div>
                      </div>

                      {isItemExpanded && (
                        <div className="border-t border-white/10 bg-white/[0.02] p-5 sm:p-6 space-y-6">
                          {item.benefits.length > 0 && (
                            <div>
                              <h4 className="text-[#D4FC59] text-xs font-bold uppercase tracking-[0.2em] mb-3">Beneficios</h4>
                              <div className="space-y-2">
                                {item.benefits.map((b, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <Check className="w-4 h-4 text-[#D4FC59] mt-0.5 flex-shrink-0" />
                                    <span className="text-white/70 text-sm">{b}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {item.methodology && (
                            <div>
                              <h4 className="text-[#D4FC59] text-xs font-bold uppercase tracking-[0.2em] mb-3">Metodologia</h4>
                              <p className="text-white/70 whitespace-pre-wrap text-sm leading-relaxed">{item.methodology}</p>
                            </div>
                          )}
                          {item.deliverables.length > 0 && (
                            <div>
                              <h4 className="text-[#D4FC59] text-xs font-bold uppercase tracking-[0.2em] mb-3">Entregables</h4>
                              <div className="space-y-2">
                                {item.deliverables.map((del, i) => (
                                  <div key={i} className="flex items-start gap-3">
                                    <span className="w-6 h-6 rounded bg-[#3100E2] text-[#D4FC59] flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                                    <div>
                                      <p className="text-white/80 text-sm">{del.name}</p>
                                      {del.description && <p className="text-white/70 text-xs mt-0.5">{del.description}</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {item.requirements && (
                            <div>
                              <h4 className="text-[#D4FC59] text-xs font-bold uppercase tracking-[0.2em] mb-3">Requisitos</h4>
                              <p className="text-white/70 whitespace-pre-wrap text-sm">{item.requirements}</p>
                            </div>
                          )}
                          {item.scope && (
                            <div>
                              <h4 className="text-[#D4FC59] text-xs font-bold uppercase tracking-[0.2em] mb-3">Que incluye</h4>
                              <p className="text-white/70 whitespace-pre-wrap text-sm">{item.scope}</p>
                            </div>
                          )}
                          {item.outOfScope && (
                            <div>
                              <h4 className="text-[#FF4632] text-xs font-bold uppercase tracking-[0.2em] mb-3">Que NO incluye</h4>
                              <p className="text-white/70 whitespace-pre-wrap text-sm">{item.outOfScope}</p>
                            </div>
                          )}
                          {item.faqs && item.faqs.length > 0 && (
                            <div>
                              <h4 className="text-[#D4FC59] text-xs font-bold uppercase tracking-[0.2em] mb-3">Preguntas Frecuentes</h4>
                              <div className="space-y-3">
                                {item.faqs.map((faq, i) => (
                                  <div key={i} className="border border-white/10 rounded-lg p-4">
                                    <p className="text-white/80 font-medium text-sm mb-1">{faq.question}</p>
                                    <p className="text-white/70 text-sm">{faq.answer}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {item.estimatedDurationDays && (
                            <div className="flex items-center gap-2 text-white/70 text-sm pt-3 border-t border-white/5">
                              <Clock className="w-4 h-4" />
                              <span>Duracion estimada: <strong className="text-white/80">{item.estimatedDurationDays} dias</strong></span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== SLIDE: INVERSION (dark bg) ===== */}
          {activeStepKey === 'inversion' && (
            <div className="py-12 sm:py-20">
              <p className="font-display italic text-[#D4FC59] text-2xl sm:text-3xl mb-2">Resumen de inversion</p>
              <div className="w-20 h-1 bg-[#D4FC59] mb-10" />

              {/* Items breakdown */}
              <div className="space-y-3 mb-8">
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-4 border-b border-white/10">
                    <span className="text-white/80 text-base sm:text-lg">{item.name}</span>
                    <span className="text-white font-semibold text-base sm:text-lg">{formatCurrency(item.totalPrice)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-white/20 pt-6 space-y-3">
                <div className="flex justify-between text-white/70 text-base">
                  <span>Subtotal</span>
                  <span>{formatCurrency(proposal.subtotal)}</span>
                </div>
                {proposal.discountPercent > 0 && (
                  <div className="flex justify-between text-[#D4FC59] text-base">
                    <span>Descuento ({proposal.discountPercent}%)</span>
                    <span>-{formatCurrency(proposal.subtotal * (proposal.discountPercent / 100))}</span>
                  </div>
                )}
                <div className="border-t border-white/20 pt-6 flex justify-between items-end">
                  <span className="text-2xl font-bold text-white uppercase">Total</span>
                  <span className="text-4xl sm:text-5xl font-bold text-[#D4FC59]">{formatCurrency(proposal.totalAmount)}</span>
                </div>
              </div>

              {proposal.paymentTerms && (
                <div className="mt-10 pt-6 border-t border-white/10">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/60 mb-2">Condiciones de pago</p>
                  <p className="text-white/80 text-base">{proposal.paymentTerms}</p>
                </div>
              )}

              {proposal.termsAndConditions && (
                <div className="mt-8 pt-6 border-t border-white/10">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/60 mb-2">Terminos y condiciones</p>
                  <p className="text-white/70 text-sm whitespace-pre-wrap leading-relaxed">{proposal.termsAndConditions}</p>
                </div>
              )}
            </div>
          )}

          {/* ===== SLIDE: DECISION (dark bg) ===== */}
          {activeStepKey === 'decision' && (
            <div className="py-12 sm:py-20 text-center">
              {canRespond && (
                <>
                  <p className="font-display italic text-[#D4FC59] text-3xl sm:text-4xl lg:text-5xl mb-4">
                    Que te parece?
                  </p>
                  <p className="text-white/70 mb-12 max-w-md mx-auto text-base">
                    Tu respuesta nos ayuda a avanzar juntos.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
                    <button
                      onClick={() => setShowAcceptModal(true)}
                      className="flex-1 flex items-center justify-center gap-3 px-8 py-5 rounded-lg font-bold text-[#231F1F] text-lg uppercase tracking-wide transition-transform hover:scale-[1.02]"
                      style={{ background: '#D4FC59' }}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Aceptar
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="flex-1 flex items-center justify-center gap-3 px-8 py-5 rounded-lg font-bold text-white/80 text-lg uppercase tracking-wide border-2 border-white/20 hover:border-white/40 transition-colors"
                    >
                      <XCircle className="w-5 h-5" />
                      Rechazar
                    </button>
                  </div>
                </>
              )}

              {proposal.status === 'accepted' && (
                <div>
                  <div className="w-24 h-24 rounded-full bg-[#D4FC59]/20 flex items-center justify-center mx-auto mb-8">
                    <CheckCircle2 className="w-12 h-12 text-[#D4FC59]" />
                  </div>
                  <p className="font-display italic text-[#D4FC59] text-3xl sm:text-4xl lg:text-5xl mb-4">
                    Propuesta aceptada
                  </p>
                  <p className="text-white/70 max-w-md mx-auto text-base">
                    Gracias por confiar en nosotros. Nos pondremos en contacto pronto.
                  </p>
                </div>
              )}

              {proposal.status === 'rejected' && proposal.rejectionReason && (
                <div className="text-left">
                  <p className="font-display italic text-[#FF4632] text-3xl sm:text-4xl mb-4">Propuesta rechazada</p>
                  <div className="w-20 h-1 bg-[#FF4632] mb-8" />
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/60 mb-2">Motivo</p>
                  <p className="text-white/80 text-base">{proposal.rejectionReason}</p>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-30 transition-colors duration-500" style={{ background: bg }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all disabled:opacity-20 disabled:cursor-not-allowed ${
              isLightSlide
                ? 'text-[#231F1F]/60 border border-[#231F1F]/20 hover:bg-[#231F1F]/5'
                : 'text-white/70 border border-white/10 hover:bg-white/5'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          {/* Dot indicators */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => { setCurrentStep(idx); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={`rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? 'w-6 h-2 bg-[#D4FC59]'
                    : idx < currentStep
                      ? `w-2 h-2 ${isLightSlide ? 'bg-[#3100E2]/30' : 'bg-[#D4FC59]/30'}`
                      : `w-2 h-2 ${isLightSlide ? 'bg-[#231F1F]/15' : 'bg-white/15'}`
                }`}
              />
            ))}
          </div>

          {currentStep < totalSteps - 1 ? (
            <button
              onClick={goNext}
              className="flex items-center gap-2 px-5 py-3 rounded-lg font-bold text-[#231F1F] transition-transform hover:scale-[1.02]"
              style={{ background: '#D4FC59' }}
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-[120px]" />
          )}
        </div>
        {/* Footer credit */}
        <div className="text-center pb-3">
          <span className={`text-[10px] tracking-widest uppercase ${isLightSlide ? 'text-[#231F1F]/20' : 'text-white/15'}`}>
            WAU Consultora
          </span>
        </div>
      </div>

      {/* ===== MODALS ===== */}
      {showAcceptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#231F1F] border border-white/10 rounded-2xl max-w-md w-full p-8">
            <div className="w-16 h-16 rounded-full bg-[#D4FC59]/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-[#D4FC59]" />
            </div>
            <h2 className="text-xl font-bold text-white text-center mb-3">Confirmar aceptacion</h2>
            <p className="text-white/70 text-center mb-8 text-sm">
              Al aceptar, estas confirmando tu interes en los servicios descritos.
              Nos pondremos en contacto para coordinar los proximos pasos.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowAcceptModal(false)} disabled={submitting}
                className="flex-1 px-4 py-3 border border-white/10 text-white/70 rounded-lg hover:bg-white/5 transition-colors">
                Cancelar
              </button>
              <button onClick={handleAccept} disabled={submitting}
                className="flex-1 px-4 py-3 rounded-lg font-bold text-[#231F1F] disabled:opacity-50"
                style={{ background: '#D4FC59' }}>
                {submitting ? 'Confirmando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#231F1F] border border-white/10 rounded-2xl max-w-md w-full p-8">
            <div className="w-16 h-16 rounded-full bg-[#FF4632]/20 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-8 h-8 text-[#FF4632]" />
            </div>
            <h2 className="text-xl font-bold text-white text-center mb-3">Rechazar propuesta</h2>
            <p className="text-white/70 text-center mb-6 text-sm">
              Indicanos el motivo para poder mejorar.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motivo del rechazo..."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/20 focus:ring-2 focus:ring-[#FF4632]/50 focus:border-[#FF4632]/50 mb-6 outline-none"
              rows={3}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowRejectModal(false)} disabled={submitting}
                className="flex-1 px-4 py-3 border border-white/10 text-white/70 rounded-lg hover:bg-white/5 transition-colors">
                Cancelar
              </button>
              <button onClick={handleReject} disabled={submitting || !rejectReason.trim()}
                className="flex-1 px-4 py-3 bg-[#FF4632] text-white rounded-lg hover:bg-[#FF4632]/90 disabled:opacity-50 font-bold transition-all">
                {submitting ? 'Enviando...' : 'Confirmar rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
