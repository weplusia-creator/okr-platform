import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Star,
  BarChart3,
  Home,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Proposal, ProposalItem } from '../../types/proposals';

// ── Utilities ──────────────────────────────────────────

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

const durationLabel = (days: number | null) => {
  if (!days) return '';
  if (days >= 28) return `${Math.round(days / 30)} meses`;
  if (days >= 7) return `${Math.round(days / 7)} semanas`;
  return `${days} días`;
};

/** Renders text with everything before the first colon in bold */
const BoldBeforeColon = ({ text, className = '' }: { text: string; className?: string }) => {
  const colonIdx = text.indexOf(':');
  if (colonIdx === -1) return <span className={className}>{text}</span>;
  return (
    <span className={className}>
      <strong>{text.slice(0, colonIdx + 1)}</strong>{text.slice(colonIdx + 1)}
    </span>
  );
};

// ── Phase colors cycling ───────────────────────────────

const PHASE_COLORS = [
  { bg: '#3100E2', text: '#ffffff', accent: '#D4FC59', cardBg: 'rgba(255,255,255,0.07)' },
  { bg: '#FF4632', text: '#ffffff', accent: '#D4FC59', cardBg: 'rgba(100,0,100,0.25)' },
  { bg: '#D4FC59', text: '#231F1F', accent: '#3100E2', cardBg: 'rgba(0,0,0,0.06)' },
  { bg: '#2e2a2b', text: '#ffffff', accent: '#D4FC59', cardBg: 'rgba(255,255,255,0.07)' },
];

// ── Static content for brand slides ────────────────────

const CLAVES_EXITO = [
  { icon: 'star', title: 'APLICACIÓN INMEDIATA Y SOSTENIDA', desc: 'Prácticas concretas que se aplican desde el día siguiente.' },
  { icon: 'chart', title: 'SIMPLICIDAD Y FOCO', desc: 'Sistema claro, entendible y gestionable.' },
  { icon: 'star', title: 'ALINEACIÓN CULTURAL', desc: 'Profesionalizar sin perder identidad ni ADN técnico.' },
  { icon: 'chart', title: 'APRENDIZAJE PRÁCTICO', desc: 'Capacitación aplicada, orientada a la ejecución real.' },
];

// ── WAU 360 Phases ─────────────────────────────────────

const WAU_360_PHASES = [
  {
    name: 'DIAGNÓSTICO + ESTRATEGIA',
    periodo: 'Mes 1',
    color: PHASE_COLORS[0],
    objetivo: 'Entender en profundidad el negocio, las unidades de negocio, el mercado y las oportunidades reales de crecimiento.',
    entregables: [
      'Diagnóstico comercial y estratégico',
      'Definición de unidades de negocio prioritarias',
      'Segmentación de clientes e industrias',
      'Identificación de oportunidades de expansión comercial',
      'Mapa de oportunidades y quick wins',
    ],
  },
  {
    name: 'DISEÑO DEL SISTEMA COMERCIAL',
    periodo: 'Mes 2',
    color: PHASE_COLORS[1],
    objetivo: 'Diseñar un sistema comercial claro, replicable y medible, adaptado a la realidad del negocio.',
    entregables: [
      'Estrategia comercial por unidad de negocio',
      'Definición de roles comerciales',
      'Diseño del proceso comercial end-to-end',
      'Definición de OKRs comerciales y de facturación',
      'Playbook comercial inicial',
      'Esquema de objetivos y comisiones',
    ],
  },
  {
    name: 'IMPLEMENTACIÓN + CAPACITACIÓN',
    periodo: 'Mes 3',
    color: PHASE_COLORS[2],
    objetivo: 'Implementar el sistema comercial diseñado. Capacitar al equipo en las nuevas herramientas, procesos y rutinas.',
    entregables: [
      'Puesta en marcha del proceso comercial',
      'Capacitación del equipo comercial',
      'Implementación de rutinas de gestión',
      'Playbook comercial completo',
      'Esquema de objetivos y comisiones',
    ],
  },
  {
    name: 'EJECUCIÓN + ACOMPAÑAMIENTO',
    periodo: 'Mes 4',
    color: PHASE_COLORS[3],
    objetivo: 'Pasar del diseño a la ejecución real del sistema. Medir resultados, ajustar y acompañar los primeros cierres.',
    entregables: [
      'Seguimiento de OKRs',
      'Ajustes tácticos según resultados',
      'Acompañamiento en los primeros cierres',
      'Informe de resultados y recomendaciones',
      'Plan de continuidad',
    ],
  },
];

// ── WAU Asterisk SVG ───────────────────────────────────

const WauAsterisk = ({ size = 80, color = '#D4FC59' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <path d="M50 0 C53 0, 56 12, 56 25 C56 12, 68 3, 70 5 C72 7, 63 19, 56 25 C68 19, 80 16, 82 19 C84 22, 72 28, 60 31 C72 28, 84 22, 86 25 C88 28, 76 34, 65 38 C76 34, 88 35, 88 38 C88 41, 76 41, 65 41 C76 41, 88 41, 88 44 C88 47, 76 47, 65 47 C76 47, 88 53, 86 56 C84 59, 72 53, 60 50 C72 53, 84 59, 82 62 C80 65, 68 62, 56 56 C68 62, 80 72, 78 75 C76 78, 63 68, 56 56 C56 68, 56 82, 53 82 C50 82, 50 68, 50 56 C50 68, 44 82, 41 82 C38 82, 38 68, 44 56 C38 68, 25 78, 22 75 C19 72, 31 62, 44 56 C31 62, 19 65, 16 62 C13 59, 25 53, 38 50 C25 53, 13 59, 11 56 C9 53, 22 47, 35 47 C22 47, 9 47, 9 44 C9 41, 22 41, 35 41 C22 41, 9 41, 9 38 C9 35, 22 34, 35 38 C22 34, 9 28, 11 25 C13 22, 25 28, 38 31 C25 28, 13 22, 16 19 C19 16, 31 19, 44 25 C31 19, 19 7, 22 5 C25 3, 38 12, 44 25 C44 12, 44 0, 47 0 Z" fill={color} />
  </svg>
);

// Simpler asterisk that matches the brand
const WauStar = ({ size = 80, color = '#D4FC59', className = '' }: { size?: number; color?: string; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" className={className} fill={color}>
    <path d="M60 0 L72 42 L60 32 L48 42 Z" />
    <path d="M60 120 L72 78 L60 88 L48 78 Z" />
    <path d="M0 60 L42 48 L32 60 L42 72 Z" />
    <path d="M120 60 L78 48 L88 60 L78 72 Z" />
    <path d="M17.6 17.6 L49 44 L39 39 L44 49 Z" />
    <path d="M102.4 102.4 L71 76 L81 81 L76 71 Z" />
    <path d="M102.4 17.6 L76 49 L81 39 L71 44 Z" />
    <path d="M17.6 102.4 L44 71 L39 81 L49 76 Z" />
    <circle cx="60" cy="60" r="16" />
  </svg>
);

// ── CSS for radial background pattern ──────────────────

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&display=swap');
  .font-display { font-family: 'Playfair Display', Georgia, serif; }
  @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .animate-slideIn { animation: slideIn 0.5s ease-out; }
  .bg-radial {
    background-image: radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.04) 0%, transparent 70%);
  }
  .bg-radial-light {
    background-image: radial-gradient(ellipse at 50% 30%, rgba(0,0,0,0.02) 0%, transparent 70%);
  }
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
`;

// ═══════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════

export function ProposalPublicView() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const printMode = searchParams.get('print') === '1';
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [items, setItems] = useState<ProposalItem[]>([]);
  const [orgClients, setOrgClients] = useState<{ name: string; logoUrl: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // ── Data Loading ─────────────────────────────────────

  useEffect(() => {
    const fetchProposal = async () => {
      if (!token) { setError('Token inválido'); setLoading(false); return; }
      try {
        const { data: p, error: err } = await supabase
          .from('proposals')
          .select('*')
          .eq('share_token', token)
          .in('status', ['sent', 'viewed', 'accepted', 'rejected'])
          .single();

        if (err || !p) { setError('Propuesta no encontrada o no disponible'); setLoading(false); return; }

        if (p.status === 'sent') {
          await supabase.from('proposals')
            .update({ status: 'viewed', viewed_at: new Date().toISOString() })
            .eq('id', p.id);
          p.status = 'viewed';
          p.viewed_at = new Date().toISOString();
        }

        const mapped: Proposal = {
          id: p.id, organizationId: p.organization_id, dealId: p.deal_id, clientId: p.client_id,
          proposalNumber: p.proposal_number, title: p.title, clientName: p.client_name,
          clientCompany: p.client_company, clientEmail: p.client_email, clientPhone: p.client_phone,
          clientLogoUrl: p.client_logo_url, introduction: p.introduction, objective: p.objective,
          strengths: p.strengths || [], specificObjectives: p.specific_objectives || [],
          centralGap: p.central_gap || [], gapTitle: p.gap_title || null, gapDescription: p.gap_description || null,
          phases: p.phases || null, hiddenSlides: p.hidden_slides || [],
          termsAndConditions: p.terms_and_conditions,
          validityDays: p.validity_days, subtotal: parseFloat(p.subtotal) || 0,
          discountPercent: parseFloat(p.discount_percent) || 0,
          totalAmount: parseFloat(p.total_amount) || 0, currency: p.currency,
          paymentTerms: p.payment_terms, estimatedDurationDays: p.estimated_duration_days,
          proposedStartDate: p.proposed_start_date, status: p.status,
          sentAt: p.sent_at, viewedAt: p.viewed_at, acceptedAt: p.accepted_at,
          rejectedAt: p.rejected_at, rejectionReason: p.rejection_reason,
          shareToken: p.share_token, createdBy: p.created_by, ownerId: p.owner_id,
          createdAt: p.created_at, updatedAt: p.updated_at,
        };
        setProposal(mapped);

        // Fetch items
        const { data: itemsData } = await supabase
          .from('proposal_items').select('*')
          .eq('proposal_id', p.id)
          .order('sort_order', { ascending: true });

        setItems((itemsData || []).map((item: any) => ({
          id: item.id, proposalId: item.proposal_id, productId: item.product_id,
          name: item.name, description: item.description, benefits: item.benefits || [],
          methodology: item.methodology, deliverables: item.deliverables || [],
          requirements: item.requirements, scope: item.scope, outOfScope: item.out_of_scope,
          faqs: item.faqs || [],
          unitPrice: parseFloat(item.unit_price) || 0, quantity: item.quantity || 1,
          totalPrice: parseFloat(item.total_price) || 0,
          monthlyFee: item.monthly_fee ? parseFloat(item.monthly_fee) : null,
          estimatedDurationDays: item.estimated_duration_days,
          sortOrder: item.sort_order, createdAt: item.created_at,
        })));

        // Fetch org clients for "Ya confían en nosotros"
        const { data: clientsData } = await supabase
          .from('clients').select('name, logo_url')
          .eq('organization_id', p.organization_id)
          .not('logo_url', 'is', null)
          .limit(18);

        if (clientsData) {
          setOrgClients(clientsData.map((c: any) => ({ name: c.name, logoUrl: c.logo_url })));
        }
      } catch (err: any) {
        console.error('Error fetching proposal:', err);
        setError('Error al cargar la propuesta');
      } finally {
        setLoading(false);
      }
    };
    fetchProposal();
  }, [token]);

  useEffect(() => {
    if (printMode && !loading && proposal) {
      const timer = setTimeout(() => window.print(), 800);
      return () => clearTimeout(timer);
    }
  }, [printMode, loading, proposal]);

  // ── Handlers ─────────────────────────────────────────

  const handleAccept = async () => {
    if (!proposal) return;
    setSubmitting(true);
    try {
      await supabase.from('proposals').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', proposal.id);
      setProposal({ ...proposal, status: 'accepted', acceptedAt: new Date().toISOString() });
      setShowAcceptModal(false);
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const handleReject = async () => {
    if (!proposal || !rejectReason.trim()) return;
    setSubmitting(true);
    try {
      await supabase.from('proposals').update({ status: 'rejected', rejected_at: new Date().toISOString(), rejection_reason: rejectReason }).eq('id', proposal.id);
      setProposal({ ...proposal, status: 'rejected', rejectedAt: new Date().toISOString(), rejectionReason: rejectReason });
      setShowRejectModal(false);
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const getValidityInfo = () => {
    if (!proposal?.sentAt) return null;
    const sentDate = new Date(proposal.sentAt);
    const expiresDate = new Date(sentDate);
    expiresDate.setDate(expiresDate.getDate() + proposal.validityDays);
    const daysLeft = Math.ceil((expiresDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return { expiresDate, daysLeft };
  };

  // ── Loading/Error ────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#D4FC59' }}>
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-[#231F1F]/10" />
            <div className="absolute inset-0 rounded-full border-4 border-t-[#231F1F] animate-spin" />
          </div>
          <p className="text-[#231F1F]/50 text-sm tracking-widest uppercase">Cargando propuesta...</p>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#231F1F' }}>
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-[#FF4632] mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-3">Propuesta no disponible</h1>
          <p className="text-white/70">{error || 'La propuesta que buscás no existe o ha expirado.'}</p>
        </div>
      </div>
    );
  }

  const validity = getValidityInfo();
  const isExpired = validity && validity.daysLeft < 0;
  const canRespond = proposal.status === 'viewed' && !isExpired;

  // ── Resolve phases (custom or default) ──────────────
  const resolvedPhases = (proposal.phases && proposal.phases.length > 0)
    ? proposal.phases.map((p, i) => ({ ...p, color: PHASE_COLORS[i % PHASE_COLORS.length] }))
    : WAU_360_PHASES;

  // ── Build Steps ──────────────────────────────────────

  const hidden = proposal.hiddenSlides || [];
  const allSteps: { key: string; label: string }[] = [];
  allSteps.push({ key: 'cover', label: 'Inicio' });
  if (proposal.objective) allSteps.push({ key: 'objetivo', label: 'Objetivo' });
  if (proposal.specificObjectives?.length) allSteps.push({ key: 'objetivos_esp', label: 'Objetivos' });
  allSteps.push({ key: 'brand', label: 'WAU' });
  if (proposal.strengths?.length) allSteps.push({ key: 'fortalezas', label: 'Fortalezas' });
  if (proposal.centralGap?.length) {
    allSteps.push({ key: 'gap', label: 'GAP' });
    allSteps.push({ key: 'costo', label: 'Diagnóstico' });
  }
  allSteps.push({ key: 'plan_accion', label: 'Plan' });
  resolvedPhases.forEach((_, i) => allSteps.push({ key: `fase_${i}`, label: `Fase ${i + 1}` }));
  allSteps.push({ key: 'claves', label: 'Claves' });
  allSteps.push({ key: 'metodologia', label: 'Método' });
  if (orgClients.length > 0) allSteps.push({ key: 'clientes', label: 'Clientes' });
  allSteps.push({ key: 'inversion', label: 'Inversión' });
  allSteps.push({ key: 'impacto', label: 'Impacto' });
  allSteps.push({ key: 'gracias', label: 'Cierre' });

  // Filter out hidden slides
  const steps = allSteps.filter(s => !hidden.includes(s.key));
  const totalSteps = steps.length;
  const activeStepKey = steps[currentStep]?.key || 'cover';

  const goNext = () => { setCurrentStep(s => Math.min(totalSteps - 1, s + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goPrev = () => { setCurrentStep(s => Math.max(0, s - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  // ── Slide Config ─────────────────────────────────────

  const getSlideConfig = (key: string) => {
    if (key === 'cover') return { bg: '#D4FC59', isLight: true };
    if (key === 'objetivos_esp') return { bg: '#FFFFFF', isLight: true };
    if (key === 'fortalezas') return { bg: '#3100E2', isLight: false };
    if (key === 'gap') return { bg: '#F0EDF8', isLight: true };
    if (key === 'costo') return { bg: '#FF4632', isLight: false };
    if (key === 'claves') return { bg: '#F5F5F5', isLight: true };
    if (key === 'inversion') return { bg: '#3100E2', isLight: false };
    if (key.startsWith('fase_')) {
      const idx = parseInt(key.split('_')[1]);
      const c = PHASE_COLORS[idx % PHASE_COLORS.length];
      return { bg: c.bg, isLight: c.bg === '#D4FC59' };
    }
    return { bg: '#2e2a2b', isLight: false };
  };

  const slideConfig = getSlideConfig(activeStepKey);
  const bg = slideConfig.bg;
  const isLight = slideConfig.isLight;

  // ── Render Slide Content ─────────────────────────────

  const renderSlide = (key: string, forPrint = false) => {
    const cfg = getSlideConfig(key);
    const pad = forPrint ? 'px-12 sm:px-20 py-16' : 'py-12 sm:py-20';
    const clientLabel = proposal.clientCompany || proposal.clientName;

    // ═══ COVER (Green bg) ═══
    if (key === 'cover') {
      return (
        <div className={pad}>
          <div className="flex justify-center">
            <img src="/wau-logo-black.png" alt="WAU" className="h-48 sm:h-72 object-contain" />
          </div>
          <div className="w-full h-px bg-[#231F1F]/20 my-6" />
          <div className="text-center">
            <h1 style={{ color: '#231F1F', fontSize: forPrint ? '5rem' : 'clamp(3.5rem, 8vw, 7rem)', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1, letterSpacing: '-0.03em' }}>
              {clientLabel}
            </h1>
          </div>
        </div>
      );
    }

    // ═══ OBJETIVO (Dark bg) ═══
    if (key === 'objetivo') {
      const dur = durationLabel(proposal.estimatedDurationDays);
      return (
        <div className={pad}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <p className="font-display italic text-[#D4FC59] text-xl sm:text-2xl lg:text-3xl leading-tight mb-1">
                ({proposal.title}{dur ? ` – ${dur}` : ''})
              </p>
              <div className="w-full h-px bg-white/20 my-4" />
              <p className="font-display italic text-white/90 text-xl sm:text-2xl mb-4">1. Objetivo general:</p>
              <p className="text-white/80 text-base sm:text-lg leading-relaxed" style={{ textAlign: 'justify' }}>
                <BoldBeforeColon text={proposal.objective || ''} />
              </p>
              <div className="mt-8">
                <img src="/wau-logo.png" alt="WAU" className="h-10 object-contain opacity-40" />
              </div>
            </div>
            <div className="hidden lg:flex items-center justify-center">
              {proposal.clientLogoUrl ? (
                <img src={proposal.clientLogoUrl} alt={clientLabel} className="max-h-[500px] w-full object-cover rounded-2xl shadow-lg" style={{ filter: 'grayscale(100%)' }} />
              ) : (
                <div />
              )}
            </div>
          </div>
        </div>
      );
    }

    // ═══ OBJETIVOS ESPECÍFICOS (White bg) ═══
    if (key === 'objetivos_esp') {
      return (
        <div className={pad}>
          <p className="font-display italic text-[#FF4632] text-3xl sm:text-4xl lg:text-5xl mb-8">
            Objetivos específicos
          </p>
          <div className="space-y-5 max-w-4xl">
            {proposal.specificObjectives!.map((obj, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <span className="text-[#FF4632] text-lg sm:text-xl font-medium flex-shrink-0 mt-0.5" style={{ minWidth: '1.5rem' }}>{idx + 1}.</span>
                <p className="text-[#3100E2] text-base sm:text-lg lg:text-xl leading-relaxed">
                  <BoldBeforeColon text={obj} />
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ═══ BRAND - "Más que una consultora" (Dark bg) ═══
    if (key === 'brand') {
      return (
        <div className={`${pad} text-center flex flex-col items-center justify-center`}>
          <p className="text-white text-3xl sm:text-4xl lg:text-5xl font-light uppercase tracking-wide mb-2">
            MÁS QUE
          </p>
          <p className="text-white text-3xl sm:text-4xl lg:text-5xl font-light uppercase tracking-wide mb-4">
            UNA CONSULTORA
          </p>
          <p className="font-display italic text-[#D4FC59] text-xl sm:text-2xl mb-4">
            ( somos un )
          </p>
          <p className="text-white text-3xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-wide mb-2">
            SISTEMA DE
          </p>
          <p className="text-white text-3xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-wide">
            TRANSFORMACIÓN
          </p>
          <div className="mt-12 flex justify-end w-full">
            <img src="/wau-logo.png" alt="WAU" className="h-12 object-contain opacity-40" />
          </div>
        </div>
      );
    }

    // ═══ FORTALEZAS (Blue bg) ═══
    if (key === 'fortalezas') {
      const strengths = proposal.strengths!;
      // Grid layout similar to PDF: center card highlighted, others around
      return (
        <div className={pad}>
          <p className="font-display italic text-[#D4FC59] text-xl sm:text-2xl">( principales )</p>
          <p className="text-[#D4FC59] text-4xl sm:text-5xl lg:text-6xl font-bold uppercase mb-8">FORTALEZAS</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {strengths.map((s, idx) => (
              <div
                key={idx}
                className="rounded-xl p-6 text-center flex items-center justify-center min-h-[120px]"
                style={{ background: 'rgba(255,255,255,0.07)' }}
              >
                <p className="text-sm sm:text-base leading-snug text-[#D4FC59]">
                  <BoldBeforeColon text={s} />
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ═══ GAP CENTRAL (Light bg, title + description) ═══
    if (key === 'gap') {
      // Use dedicated gap fields, fallback to centralGap[0] for old data
      const gTitle = proposal.gapTitle || proposal.centralGap?.[0]?.current || 'Brecha identificada';
      const gDesc = proposal.gapDescription || proposal.centralGap?.[0]?.desired || '';
      return (
        <div className={pad}>
          <p className="font-display italic text-[#FF4632] text-lg sm:text-xl mb-1">el GAP central:</p>
          <h2 className="text-[#3100E2] text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight mb-6">
            <BoldBeforeColon text={gTitle} />
          </h2>
          {gDesc && (
            <p className="text-[#3100E2]/80 text-base sm:text-lg leading-relaxed max-w-4xl" style={{ textAlign: 'justify' }}>
              <BoldBeforeColon text={gDesc} />
            </p>
          )}
          <img src="/wau-logo.png" alt="WAU" className="h-10 object-contain opacity-40 mt-8" />
        </div>
      );
    }

    // ═══ COSTO DE NO CAMBIAR (Red bg) ═══
    if (key === 'costo') {
      const rawGap = proposal.centralGap || [];
      // Remove first row if it duplicates the GAP title (migrated data)
      const isDupe = proposal.gapTitle && rawGap.length > 0 && rawGap[0].current === proposal.gapTitle;
      const gap = isDupe ? rawGap.slice(1) : rawGap;
      return (
        <div className={pad}>
          <p className="font-display italic text-[#D4FC59] text-lg sm:text-xl">el costo oculto de</p>
          <h2 className="text-[#D4FC59] text-4xl sm:text-5xl font-bold uppercase mb-6">NO CAMBIAR</h2>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Table */}
            <div className="lg:col-span-3">
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: '#D4FC59', background: 'rgba(0,0,0,0.25)', borderBottom: '2px solid rgba(255,255,255,0.2)' }}>Situación actual</th>
                    <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: '#D4FC59', background: 'rgba(0,0,0,0.25)', borderBottom: '2px solid rgba(255,255,255,0.2)' }}>Situación deseada</th>
                  </tr>
                </thead>
                <tbody>
                  {gap.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', background: idx % 2 === 0 ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.06)' }}>
                      <td className="px-5 py-4 text-white font-medium text-sm leading-relaxed"><BoldBeforeColon text={row.current} /></td>
                      <td className="px-5 py-4 text-white font-medium text-sm leading-relaxed"><BoldBeforeColon text={row.desired} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Consequences card */}
            <div className="lg:col-span-2 rounded-xl p-6" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <p className="font-display italic text-white text-xl mb-4 font-bold">Costo de no cambiar</p>
              <div className="space-y-3">
                {gap.filter(row => row.cost).slice(0, 5).map((row, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-[#D4FC59] mt-0.5 text-lg">•</span>
                    <p className="text-white text-sm leading-relaxed">
                      <BoldBeforeColon text={row.cost!} />
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6">
            <img src="/wau-logo.png" alt="WAU" className="h-10 object-contain opacity-40" />
          </div>
        </div>
      );
    }

    // ═══ PLAN DE ACCIÓN (Dark bg) ═══
    if (key === 'plan_accion') {
      return (
        <div className={pad}>
          <p className="font-display italic text-[#D4FC59] text-xl sm:text-2xl">( Plan de )</p>
          <h2 className="text-[#D4FC59] text-4xl sm:text-5xl lg:text-6xl font-bold uppercase mb-6">ACCIÓN</h2>
          <div className="w-full h-px bg-white/20 mb-6" />
          <div className="rounded-xl p-6 sm:p-8" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-3xl">⚙️</span>
              <div>
                <p className="text-white font-bold text-lg uppercase">Marco Metodológico</p>
              </div>
              <p className="font-display italic text-white/70 text-lg ml-auto hidden sm:block">
                Capacitación + Ejecución + Medición
              </p>
            </div>
            <div className="w-full h-px bg-white/10 mb-4" />
            <table className="w-full" style={{ borderCollapse: 'collapse', border: '1px solid rgba(255,255,255,0.15)' }}>
              <thead>
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/70 border-b border-white/15 w-1/4">Pilar</th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/70 border-b border-white/15">Enfoque</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/10">
                  <td className="px-4 py-3 text-white font-medium text-sm">Diagnóstico</td>
                  <td className="px-4 py-3 text-white/80 text-sm">Entender en profundidad el negocio, los clientes y las oportunidades reales.</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="px-4 py-3 text-white font-medium text-sm">Diseño</td>
                  <td className="px-4 py-3 text-white/80 text-sm">Construir la estrategia comercial, los procesos y los OKRs adecuados al contexto del negocio.</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="px-4 py-3 text-white font-medium text-sm">Ejecución</td>
                  <td className="px-4 py-3 text-white/80 text-sm">Implementar el sistema comercial, roles, rutinas y prioridades.</td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="px-4 py-3 text-white font-medium text-sm">Medición</td>
                  <td className="px-4 py-3 text-white/80 text-sm">Gestionar con métricas claras y foco en resultados.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // ═══ FASES WAU 360 (Individual phase slides) ═══
    if (key.startsWith('fase_')) {
      const idx = parseInt(key.split('_')[1]);
      const phase = resolvedPhases[idx];
      if (!phase) return null;
      const phaseColor = phase.color;
      const dur = durationLabel(proposal.estimatedDurationDays);

      return (
        <div className={pad}>
          <p className="font-display italic text-lg sm:text-xl" style={{ color: phaseColor.accent }}>( Principales )</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold uppercase mb-2" style={{ color: phaseColor.accent }}>
            FASES DEL PROYECTO
          </h2>
          <p className="text-sm font-medium uppercase tracking-wider mb-1" style={{ color: '#ffffff' }}>
            Fase {idx + 1} de {resolvedPhases.length}{dur ? ` — ${dur}` : ''}
          </p>
          <div className="w-full h-px mb-6" style={{ background: `${phaseColor.accent}40` }} />

          <div className="rounded-xl p-6 sm:p-8" style={{ background: phaseColor.cardBg }}>
            <div className="flex items-center gap-3 mb-4">
              <Home className="w-5 h-5" style={{ color: phaseColor.accent }} />
              <p className="font-bold uppercase text-sm sm:text-base" style={{ color: phaseColor.text }}>
                FASE {idx + 1}: {phase.name} - {phase.periodo}
              </p>
            </div>
            <div className="w-full h-px mb-6" style={{ background: `${phaseColor.text}20` }} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <p className="font-bold text-xs uppercase tracking-wider mb-2" style={{ color: phaseColor.accent }}>
                  • Objetivo
                </p>
                <p className="text-sm sm:text-base leading-relaxed font-medium" style={{ color: phaseColor.text }}>
                  <BoldBeforeColon text={phase.objetivo} />
                </p>
              </div>
              <div>
                <p className="font-bold text-sm mb-3" style={{ color: phaseColor.accent }}>Entregables principales</p>
                {phase.entregables.map((e, i) => (
                  <p key={i} className="text-sm mb-1.5 font-medium" style={{ color: phaseColor.text }}>
                    • <BoldBeforeColon text={e} />
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ═══ CLAVES DEL ÉXITO (Light bg) ═══
    if (key === 'claves') {
      return (
        <div className={pad}>
          <p className="font-display italic text-[#FF4632] text-xl sm:text-2xl">( Claves )</p>
          <h2 className="text-[#FF4632] text-3xl sm:text-4xl lg:text-5xl font-bold uppercase mb-2">DEL ÉXITO DEL MODELO</h2>
          <div className="w-full h-1 bg-[#FF4632]/20 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CLAVES_EXITO.map((c, idx) => (
              <div key={idx} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
                <div className="flex justify-center mb-4">
                  {c.icon === 'star'
                    ? <Star className="w-8 h-8 text-[#FF4632]" />
                    : <BarChart3 className="w-8 h-8 text-[#FF4632]" />
                  }
                </div>
                <p className="font-bold text-[#231F1F] text-xs sm:text-sm uppercase tracking-wide mb-3">{c.title}</p>
                <p className="text-[#231F1F]/60 text-xs sm:text-sm uppercase"><BoldBeforeColon text={c.desc} /></p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ═══ METODOLOGÍA (Dark bg) ═══
    if (key === 'metodologia') {
      return (
        <div className={pad}>
          <p className="font-display italic text-[#D4FC59] text-3xl sm:text-4xl lg:text-5xl mb-10">
            Metodología y forma de trabajo
          </p>
          <div className="space-y-6 max-w-4xl">
            <p className="text-white text-xl sm:text-2xl">
              <strong className="text-white">• Frecuencia:</strong>{' '}
              <span className="text-white/80">1 reunión semanal</span>
            </p>
            <p className="text-white text-xl sm:text-2xl">
              <strong className="text-white">• Duración:</strong>{' '}
              <span className="text-white/80">2 horas + tareas entre reuniones</span>
            </p>
            <p className="text-white text-xl sm:text-2xl">
              <strong className="text-white">• Entregables y recursos:</strong>{' '}
              <span className="text-white/80">Plataforma WAU</span>
            </p>
            <p className="text-white text-xl sm:text-2xl">
              <strong className="text-white">• Interlocutores:</strong>{' '}
              <span className="text-white/80">Líder del proyecto, referente operativo y equipo núcleo</span>
            </p>
            <p className="text-white text-xl sm:text-2xl">
              <strong className="text-white">• Canales:</strong>{' '}
              <span className="text-white/80">WhatsApp, Drive y Mail</span>
            </p>
          </div>
          <div className="mt-12 flex justify-end">
            <img src="/wau-logo.png" alt="WAU" className="h-12 object-contain opacity-40" />
          </div>
        </div>
      );
    }

    // ═══ YA CONFÍAN EN NOSOTROS (Dark bg) ═══
    if (key === 'clientes') {
      return (
        <div className={pad}>
          <p className="font-display italic text-[#D4FC59] text-xl sm:text-2xl">Ya confían</p>
          <h2 className="text-white text-4xl sm:text-5xl lg:text-6xl font-bold uppercase mb-10">EN NOSOTROS</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-6">
            {orgClients.map((client, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white flex items-center justify-center overflow-hidden">
                  {client.logoUrl ? (
                    <img src={client.logoUrl} alt={client.name} className="w-14 h-14 sm:w-16 sm:h-16 object-contain" />
                  ) : (
                    <span className="text-[#231F1F] font-bold text-lg">{client.name.charAt(0)}</span>
                  )}
                </div>
                <span className="text-white/60 text-[10px] sm:text-xs text-center">{client.name}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ═══ INVERSIÓN (Blue bg) ═══
    if (key === 'inversion') {
      const dur = durationLabel(proposal.estimatedDurationDays);
      return (
        <div className={forPrint ? '' : ''} style={{ display: 'flex', minHeight: forPrint ? undefined : '100%' }}>
          {/* Left content */}
          <div className={`flex-1 flex flex-col justify-center ${forPrint ? 'px-12 py-16' : 'py-12 sm:py-20 pl-6 sm:pl-10 pr-6'}`} style={{ maxWidth: '55%' }}>
            <h2 className="text-white text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Inversión requerida
            </h2>
            <p className="text-white/80 text-base sm:text-lg mb-6">
              Capacitación y seguimiento - Proyecto de {dur || '4 meses'}:
            </p>
            <p className="text-white/70 text-lg sm:text-xl mb-1">
              {proposal.currency}
            </p>
            <p className="font-display italic text-[#D4FC59] text-2xl sm:text-3xl lg:text-4xl font-bold mb-1">
              {formatCurrency(proposal.totalAmount)}
            </p>
            <p className="font-display italic text-[#D4FC59] text-lg sm:text-xl font-bold">
              ({proposal.paymentTerms || 'En pesos, Mensuales'})
            </p>
            {proposal.discountPercent > 0 && (
              <p className="text-white/60 text-sm mt-3">
                Subtotal: {formatCurrency(proposal.subtotal)} — Descuento {proposal.discountPercent}%
              </p>
            )}
            {items.length > 1 && (
              <div className="mt-6 space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-white/70 text-sm">{item.name}</span>
                    <span className="text-white font-medium text-sm">{formatCurrency(item.totalPrice)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-auto pt-8">
              <img src="/wau-logo-white.png" alt="WAU" className="h-36 object-contain" />
            </div>
          </div>
          {/* Right image */}
          <div className="hidden lg:block" style={{ width: '45%', position: 'relative', overflow: 'hidden', borderRadius: '1.5rem' }}>
            <img
              src="/inversion-img.jpg"
              alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%)' }}
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.style.display = 'none';
                el.parentElement!.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)';
              }}
            />
          </div>
        </div>
      );
    }

    // ═══ NOS OBSESIONA EL IMPACTO (Dark bg) ═══
    if (key === 'impacto') {
      return (
        <div className={pad}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <p className="font-display italic text-[#D4FC59] text-xl mb-2">( nos )</p>
              <h2 className="text-white text-4xl sm:text-5xl lg:text-6xl font-bold uppercase leading-tight mb-2">
                OBSESIONA
              </h2>
              <h2 className="text-white text-4xl sm:text-5xl lg:text-6xl font-bold uppercase leading-tight">
                EL IMPACTO.
              </h2>
              <p className="text-white/50 text-sm sm:text-base mt-4 font-display italic">y trabajamos para lograrlo.</p>
            </div>
            <div className="hidden lg:block" />
          </div>
        </div>
      );
    }

    // ═══ GRACIAS / DECISION (Dark bg) ═══
    if (key === 'gracias') {
      if (canRespond) {
        return (
          <div className={`${pad} text-center`}>
            <div className="flex justify-center mb-6">
              <img src="/wau-logo.png" alt="WAU" className="h-20 object-contain" />
            </div>
            <p className="font-display italic text-[#D4FC59] text-3xl sm:text-4xl mb-8">( ¿qué te parece? )</p>
            <p className="text-white/60 mb-10 max-w-md mx-auto">Tu respuesta nos ayuda a avanzar juntos.</p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
              <button
                onClick={() => setShowAcceptModal(true)}
                className="flex-1 flex items-center justify-center gap-3 px-8 py-5 rounded-lg font-bold text-[#231F1F] text-lg uppercase tracking-wide transition-transform hover:scale-[1.02]"
                style={{ background: '#D4FC59' }}
              >
                <CheckCircle2 className="w-5 h-5" /> Aceptar
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                className="flex-1 flex items-center justify-center gap-3 px-8 py-5 rounded-lg font-bold text-white/80 text-lg uppercase tracking-wide border-2 border-white/20 hover:border-white/40 transition-colors"
              >
                <XCircle className="w-5 h-5" /> Rechazar
              </button>
            </div>
          </div>
        );
      }

      if (proposal.status === 'accepted') {
        return (
          <div className={`${pad} text-center`}>
            <div className="w-24 h-24 rounded-full bg-[#D4FC59]/20 flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 className="w-12 h-12 text-[#D4FC59]" />
            </div>
            <p className="font-display italic text-[#D4FC59] text-3xl sm:text-4xl lg:text-5xl mb-4">
              Propuesta aceptada
            </p>
            <p className="text-white/70 max-w-md mx-auto">Gracias por confiar en nosotros. Nos pondremos en contacto pronto.</p>
          </div>
        );
      }

      if (proposal.status === 'rejected') {
        return (
          <div className={`${pad} text-center`}>
            <div className="w-24 h-24 rounded-full bg-[#FF4632]/20 flex items-center justify-center mx-auto mb-8">
              <XCircle className="w-12 h-12 text-[#FF4632]" />
            </div>
            <p className="font-display italic text-[#FF4632] text-3xl sm:text-4xl mb-4">Propuesta rechazada</p>
            {proposal.rejectionReason && (
              <p className="text-white/60 max-w-md mx-auto">{proposal.rejectionReason}</p>
            )}
          </div>
        );
      }

      // Default gracias
      return (
        <div className={`${pad} text-center`}>
          <div className="flex justify-center mb-6">
            <img src="/wau-logo.png" alt="WAU" className="h-24 object-contain" />
          </div>
          <p className="font-display italic text-[#D4FC59] text-3xl sm:text-4xl">( gracias )</p>
          {validity && (
            <p className={`text-sm mt-6 ${isExpired ? 'text-[#FF4632]' : 'text-white/40'}`}>
              {isExpired ? 'Esta propuesta ha expirado' : `Válida por ${validity.daysLeft} días más`}
            </p>
          )}
        </div>
      );
    }

    return null;
  };

  // ═══════════════════════════════════════════════════════
  // PRINT MODE
  // ═══════════════════════════════════════════════════════

  if (printMode) {
    const allKeys = steps.map(s => s.key);
    return (
      <div className="print-proposal">
        <style>{GLOBAL_STYLES}</style>
        {allKeys.map((key) => {
          const cfg = getSlideConfig(key);
          return (
            <div key={key} className={`print-slide ${cfg.isLight ? 'bg-radial-light' : 'bg-radial'}`} style={{ background: cfg.bg }}>
              {renderSlide(key, true)}
            </div>
          );
        })}
        <div className="no-print" style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 50 }}>
          <button
            onClick={() => window.print()}
            style={{ background: '#D4FC59', color: '#231F1F', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}
          >
            Descargar PDF
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // INTERACTIVE MODE
  // ═══════════════════════════════════════════════════════

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isLight ? 'bg-radial-light' : 'bg-radial'}`} style={{ background: bg }}>
      <style>{GLOBAL_STYLES}</style>

      {/* Fixed Nav Bar */}
      <nav className="fixed top-0 left-0 right-0 z-30 transition-colors duration-500" style={{ background: bg }}>
        <div className="h-1" style={{ background: 'linear-gradient(90deg, #3100E2 0%, #D4FC59 50%, #FF4632 100%)' }} />
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/wau-logo.png" alt="WAU" className="w-8 h-8 object-contain" />
            <span className={`text-xs font-medium tracking-widest uppercase ${isLight ? 'text-[#231F1F]/40' : 'text-white/50'}`}>
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
            <span className={`text-xs ${isLight ? 'text-[#231F1F]/30' : 'text-white/40'}`}>
              {currentStep + 1}/{totalSteps}
            </span>
          </div>
        </div>
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
          {renderSlide(activeStepKey)}
        </div>
      </main>

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-30 transition-colors duration-500" style={{ background: bg }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all disabled:opacity-20 disabled:cursor-not-allowed ${
              isLight
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
                      ? `w-2 h-2 ${isLight ? 'bg-[#3100E2]/30' : 'bg-[#D4FC59]/30'}`
                      : `w-2 h-2 ${isLight ? 'bg-[#231F1F]/15' : 'bg-white/15'}`
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
        <div className="text-center pb-3">
          <span className={`text-[10px] tracking-widest uppercase ${isLight ? 'text-[#231F1F]/20' : 'text-white/15'}`}>
            WAU Business Consulting
          </span>
        </div>
      </div>

      {/* ═══ MODALS ═══ */}
      {showAcceptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#231F1F] border border-white/10 rounded-2xl max-w-md w-full p-8">
            <div className="w-16 h-16 rounded-full bg-[#D4FC59]/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-[#D4FC59]" />
            </div>
            <h2 className="text-xl font-bold text-white text-center mb-3">Confirmar aceptación</h2>
            <p className="text-white/70 text-center mb-8 text-sm">
              Al aceptar, estás confirmando tu interés en los servicios descritos.
              Nos pondremos en contacto para coordinar los próximos pasos.
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
            <p className="text-white/70 text-center mb-6 text-sm">Indicanos el motivo para poder mejorar.</p>
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
