import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, getAccessTokenDirect } from '../../lib/supabase';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Loader2,
  Lock,
  Plus,
  Trash2,
  Presentation,
  Star,
  BarChart3,
  Home,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useProposals } from '../../context/ProposalContext';
import type { Proposal, ProposalItem } from '../../types/proposals';

// ── Reuse constants from PublicView ────────────────────

const PHASE_COLORS = [
  { bg: '#3100E2', text: '#ffffff', accent: '#D4FC59', cardBg: 'rgba(255,255,255,0.07)' },
  { bg: '#FF4632', text: '#ffffff', accent: '#D4FC59', cardBg: 'rgba(100,0,100,0.25)' },
  { bg: '#D4FC59', text: '#231F1F', accent: '#3100E2', cardBg: 'rgba(0,0,0,0.06)' },
  { bg: '#2e2a2b', text: '#ffffff', accent: '#D4FC59', cardBg: 'rgba(255,255,255,0.07)' },
];

const DEFAULT_PHASES = [
  { name: 'DIAGNÓSTICO + ESTRATEGIA', periodo: 'Mes 1', objetivo: 'Entender en profundidad el negocio, las unidades de negocio, el mercado y las oportunidades reales de crecimiento.', entregables: ['Diagnóstico comercial y estratégico', 'Definición de unidades de negocio prioritarias', 'Segmentación de clientes e industrias', 'Identificación de oportunidades de expansión comercial', 'Mapa de oportunidades y quick wins'] },
  { name: 'DISEÑO DEL SISTEMA COMERCIAL', periodo: 'Mes 2', objetivo: 'Diseñar un sistema comercial claro, replicable y medible, adaptado a la realidad del negocio.', entregables: ['Estrategia comercial por unidad de negocio', 'Definición de roles comerciales', 'Diseño del proceso comercial end-to-end', 'Definición de OKRs comerciales y de facturación', 'Playbook comercial inicial', 'Esquema de objetivos y comisiones'] },
  { name: 'IMPLEMENTACIÓN + CAPACITACIÓN', periodo: 'Mes 3', objetivo: 'Implementar el sistema comercial diseñado. Capacitar al equipo en las nuevas herramientas, procesos y rutinas.', entregables: ['Puesta en marcha del proceso comercial', 'Capacitación del equipo comercial', 'Implementación de rutinas de gestión', 'Playbook comercial completo', 'Esquema de objetivos y comisiones'] },
  { name: 'EJECUCIÓN + ACOMPAÑAMIENTO', periodo: 'Mes 4', objetivo: 'Pasar del diseño a la ejecución real del sistema. Medir resultados, ajustar y acompañar los primeros cierres.', entregables: ['Seguimiento de OKRs', 'Ajustes tácticos según resultados', 'Acompañamiento en los primeros cierres', 'Informe de resultados y recomendaciones', 'Plan de continuidad'] },
];

const DEFAULT_PLAN_ACCION = [
  { pilar: 'Diagnóstico', enfoque: 'Entender en profundidad el negocio, los clientes y las oportunidades reales.' },
  { pilar: 'Diseño', enfoque: 'Construir la estrategia comercial, los procesos y los OKRs adecuados al contexto del negocio.' },
  { pilar: 'Ejecución', enfoque: 'Implementar el sistema comercial, roles, rutinas y prioridades.' },
  { pilar: 'Medición', enfoque: 'Gestionar con métricas claras y foco en resultados.' },
];

const CLAVES_EXITO = [
  { icon: 'star', title: 'APLICACIÓN INMEDIATA Y SOSTENIDA', desc: 'Prácticas concretas que se aplican desde el día siguiente.' },
  { icon: 'chart', title: 'SIMPLICIDAD Y FOCO', desc: 'Sistema claro, entendible y gestionable.' },
  { icon: 'star', title: 'ALINEACIÓN CULTURAL', desc: 'Profesionalizar sin perder identidad ni ADN técnico.' },
  { icon: 'chart', title: 'APRENDIZAJE PRÁCTICO', desc: 'Capacitación aplicada, orientada a la ejecución real.' },
];

const WauStar = ({ size = 80, color = '#D4FC59', className = '' }: { size?: number; color?: string; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" className={className} fill={color}>
    <path d="M50 0 L72 42 L60 32 L48 42 Z" />
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

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount);

const durationLabel = (days: number | null) => {
  if (!days) return '';
  if (days >= 28) return `${Math.round(days / 30)} meses`;
  if (days >= 7) return `${Math.round(days / 7)} semanas`;
  return `${days} días`;
};

// ── Slide Config ───────────────────────────────────────

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

// ═══════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════

export function ProposalSlideEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProposal, fetchProposalItems, updateProposal } = useProposals();

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [items, setItems] = useState<ProposalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  // ── Editable form state ──────────────────────────────

  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [title, setTitle] = useState('');
  const [estimatedDurationDays, setEstimatedDurationDays] = useState<number | null>(null);
  const [objective, setObjective] = useState('');
  const [specificObjectives, setSpecificObjectives] = useState<string[]>([]);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [centralGap, setCentralGap] = useState<{ current: string; desired: string; cost?: string }[]>([]);
  const [gapTitle, setGapTitle] = useState('');
  const [gapDescription, setGapDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [clientLogoUrl, setClientLogoUrl] = useState('');
  const [phases, setPhases] = useState<{ name: string; periodo: string; objetivo: string; entregables: string[] }[]>(DEFAULT_PHASES);
  const [planAccion, setPlanAccion] = useState<{ pilar: string; enfoque: string }[]>(DEFAULT_PLAN_ACCION);
  const [hiddenSlides, setHiddenSlides] = useState<string[]>([]);

  // ── Load Data ────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [p, its] = await Promise.all([getProposal(id), fetchProposalItems(id)]);
      if (p) {
        setProposal(p);
        setClientName(p.clientName);
        setClientCompany(p.clientCompany || '');
        setTitle(p.title);
        setEstimatedDurationDays(p.estimatedDurationDays);
        setObjective(p.objective || '');
        setSpecificObjectives(p.specificObjectives || []);
        setStrengths(p.strengths || []);
        // Separate GAP title from centralGap table data
        const rawGap = p.centralGap || [];
        if (p.gapTitle) {
          // Already migrated – remove duplicate first row if it matches gapTitle
          const isDupe = rawGap.length > 0 && rawGap[0].current === p.gapTitle;
          setCentralGap(isDupe ? rawGap.slice(1) : rawGap);
          setGapTitle(p.gapTitle);
          setGapDescription(p.gapDescription || '');
        } else if (rawGap.length > 0) {
          // Old data: migrate first row to GAP fields, remove from table
          setGapTitle(rawGap[0].current || '');
          setGapDescription(rawGap[0].desired || '');
          setCentralGap(rawGap.slice(1));
        } else {
          setCentralGap([]);
          setGapTitle('');
          setGapDescription('');
        }
        setTotalAmount(p.totalAmount);
        setDiscountPercent(p.discountPercent);
        setPaymentTerms(p.paymentTerms || '');
        setIntroduction(p.introduction || '');
        setClientLogoUrl(p.clientLogoUrl || '');
        setPhases(p.phases && p.phases.length > 0 ? p.phases : DEFAULT_PHASES);
        setPlanAccion(p.planAccion && p.planAccion.length > 0 ? p.planAccion : DEFAULT_PLAN_ACCION);
        setHiddenSlides(p.hiddenSlides || []);
      }
      setItems(its);
    } finally {
      setLoading(false);
    }
  }, [id, getProposal, fetchProposalItems]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Save ─────────────────────────────────────────────

  const handleSave = async () => {
    if (!id || !proposal) return;
    setSaving(true);
    setSaved(false);
    try {
      // Read token directly from localStorage to avoid auth lock hang
      const accessToken = getAccessTokenDirect();

      const dbUpdates: Record<string, any> = {
        client_name: clientName,
        client_company: clientCompany || null,
        client_logo_url: clientLogoUrl || null,
        title,
        estimated_duration_days: estimatedDurationDays,
        objective: objective || null,
        introduction: introduction || null,
        specific_objectives: specificObjectives,
        strengths,
        central_gap: centralGap,
        gap_title: gapTitle || null,
        gap_description: gapDescription || null,
        phases: phases,
        plan_accion: planAccion,
        hidden_slides: hiddenSlides,
        total_amount: totalAmount,
        discount_percent: discountPercent,
        payment_terms: paymentTerms || null,
        updated_at: new Date().toISOString(),
      };

      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/proposals?id=eq.${id}&select=id,central_gap,gap_title,gap_description,phases,strengths,specific_objectives`;
      const resp = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(dbUpdates),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        setSaveError('Error: ' + errText);
        setTimeout(() => setSaveError(null), 5000);
        return;
      }

      const rows = await resp.json();
      const row = rows?.[0];

      if (!row) {
        setSaveError('No se actualizó la propuesta. Recargá la página.');
        setTimeout(() => setSaveError(null), 5000);
        return;
      }

      // Sync local state from what DB actually saved (deduplicate GAP row)
      const savedGap = row.central_gap || [];
      const savedGapTitle = row.gap_title || '';
      const savedDupe = savedGapTitle && savedGap.length > 0 && savedGap[0].current === savedGapTitle;
      setCentralGap(savedDupe ? savedGap.slice(1) : savedGap);
      setGapTitle(savedGapTitle);
      setGapDescription(row.gap_description || '');
      setPhases(row.phases && row.phases.length > 0 ? row.phases : DEFAULT_PHASES);
      setStrengths(row.strengths || []);
      setSpecificObjectives(row.specific_objectives || []);

      setProposal({
        ...proposal,
        clientName, clientCompany: clientCompany || null,
        clientLogoUrl: clientLogoUrl || null, title,
        estimatedDurationDays, objective: objective || null,
        introduction: introduction || null,
        specificObjectives: row.specific_objectives || [],
        strengths: row.strengths || [],
        centralGap: row.central_gap || [],
        gapTitle: row.gap_title || null,
        gapDescription: row.gap_description || null,
        phases: row.phases || null,
        totalAmount, discountPercent,
        paymentTerms: paymentTerms || null,
      } as Proposal);
      setSaved(true);
      setSaveError(null);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setSaveError('Error: ' + (err?.message || 'Error desconocido'));
      setTimeout(() => setSaveError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  // ── Build Steps ──────────────────────────────────────

  if (loading || !proposal) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const steps: { key: string; label: string; editable: boolean }[] = [];
  steps.push({ key: 'cover', label: 'Portada', editable: true });
  if (objective || proposal.objective) steps.push({ key: 'objetivo', label: 'Objetivo', editable: true });
  if (specificObjectives.length > 0 || (proposal.specificObjectives?.length ?? 0) > 0) steps.push({ key: 'objetivos_esp', label: 'Obj. Específicos', editable: true });
  steps.push({ key: 'brand', label: 'WAU Brand', editable: false });
  if (strengths.length > 0 || (proposal.strengths?.length ?? 0) > 0) steps.push({ key: 'fortalezas', label: 'Fortalezas', editable: true });
  if (centralGap.length > 0 || (proposal.centralGap?.length ?? 0) > 0) {
    steps.push({ key: 'gap', label: 'GAP Central', editable: true });
    steps.push({ key: 'costo', label: 'Costo No Cambiar', editable: true });
  }
  steps.push({ key: 'plan_accion', label: 'Plan de Acción', editable: true });
  phases.forEach((_, i) => steps.push({ key: `fase_${i}`, label: `Fase ${i + 1}`, editable: true }));
  steps.push({ key: 'claves', label: 'Claves Éxito', editable: false });
  steps.push({ key: 'metodologia', label: 'Metodología', editable: false });
  steps.push({ key: 'inversion', label: 'Inversión', editable: true });
  steps.push({ key: 'impacto', label: 'Impacto', editable: false });
  steps.push({ key: 'gracias', label: 'Cierre', editable: false });

  const totalSteps = steps.length;
  const activeStep = steps[currentStep] || steps[0];
  const cfg = getSlideConfig(activeStep.key);

  const goNext = () => setCurrentStep(s => Math.min(totalSteps - 1, s + 1));
  const goPrev = () => setCurrentStep(s => Math.max(0, s - 1));

  // ── Render Slide Preview ─────────────────────────────

  const renderPreview = () => {
    const key = activeStep.key;
    const clientLabel = clientCompany || clientName;
    const dur = durationLabel(estimatedDurationDays);

    if (key === 'cover') {
      return (
        <div className="flex flex-col items-center justify-center h-full py-8">
          <img src="/wau-logo.png" alt="WAU" className="h-10 object-contain mb-6" />
          <h1 style={{ color: '#231F1F', fontSize: 'clamp(2rem, 5vw, 4rem)', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1, letterSpacing: '-0.03em', textAlign: 'center' }}>
            {clientLabel || 'Nombre del Cliente'}
          </h1>
        </div>
      );
    }

    if (key === 'objetivo') {
      return (
        <div className="py-6 px-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <div>
              <p className="font-display italic text-[#D4FC59] text-lg sm:text-xl leading-tight mb-1">
                ({title || 'Título del proyecto'}{dur ? ` – ${dur}` : ''})
              </p>
              <div className="w-full h-px bg-white/20 my-3" />
              <p className="font-display italic text-white/90 text-base sm:text-lg mb-3">1. Objetivo general:</p>
              <p className="text-white/80 text-sm sm:text-base leading-relaxed">{objective || 'Descripción del objetivo...'}</p>
            </div>
            {clientLogoUrl && (
              <div className="hidden lg:flex items-center justify-center">
                <img src={clientLogoUrl} alt="Imagen" className="max-h-[180px] w-full object-contain rounded-xl" />
              </div>
            )}
          </div>
        </div>
      );
    }

    if (key === 'objetivos_esp') {
      return (
        <div className="py-6 px-2">
          <p className="font-display italic text-[#FF4632] text-2xl sm:text-3xl mb-4">Objetivos específicos</p>
          {specificObjectives.map((obj, idx) => (
            <div key={idx} className="flex items-start gap-2 mb-2">
              <span className="text-[#FF4632] text-sm font-medium flex-shrink-0">{idx + 1}.</span>
              <p className="text-[#3100E2] text-sm leading-relaxed">{obj}</p>
            </div>
          ))}
          {specificObjectives.length === 0 && <p className="text-gray-400 text-sm">Sin objetivos específicos</p>}
        </div>
      );
    }

    if (key === 'brand') {
      return (
        <div className="flex flex-col items-center justify-center h-full py-8 text-center">
          <p className="text-white text-xl font-light uppercase tracking-wide mb-1">MÁS QUE UNA CONSULTORA</p>
          <p className="font-display italic text-[#D4FC59] text-base mb-1">( somos un )</p>
          <p className="text-white text-xl font-bold uppercase">SISTEMA DE TRANSFORMACIÓN</p>
        </div>
      );
    }

    if (key === 'fortalezas') {
      return (
        <div className="py-6 px-2">
          <p className="font-display italic text-[#D4FC59] text-base">( principales )</p>
          <p className="text-[#D4FC59] text-2xl font-bold uppercase mb-4">FORTALEZAS</p>
          <div className="grid grid-cols-2 gap-2">
            {strengths.map((s, idx) => (
              <div key={idx} className="rounded-lg p-3 text-center" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <p className="text-[#D4FC59] text-xs font-bold">{s}</p>
              </div>
            ))}
          </div>
          {strengths.length === 0 && <p className="text-[#D4FC59]/50 text-sm">Sin fortalezas</p>}
        </div>
      );
    }

    if (key === 'gap') {
      return (
        <div className="py-6 px-2">
          <p className="font-display italic text-[#FF4632] text-sm mb-1">el GAP central:</p>
          <h2 className="text-[#3100E2] text-lg font-bold leading-tight mb-3">{gapTitle || 'Brecha identificada'}</h2>
          {gapDescription && <p className="text-[#3100E2]/80 text-xs leading-relaxed">{gapDescription}</p>}
          {!gapTitle && !gapDescription && <p className="text-gray-400 text-sm">Sin GAP definido</p>}
        </div>
      );
    }

    if (key === 'costo') {
      return (
        <div className="py-6 px-2">
          <p className="font-display italic text-[#D4FC59] text-sm">el costo oculto de</p>
          <h2 className="text-[#D4FC59] text-2xl font-bold uppercase mb-3">NO CAMBIAR</h2>
          <div className="space-y-1">
            {centralGap.map((row, idx) => (
              <p key={idx} className="text-white/80 text-xs">• {row.current}</p>
            ))}
            {centralGap.length === 0 && <p className="text-[#D4FC59]/50 text-xs">Sin filas en la tabla</p>}
          </div>
        </div>
      );
    }

    if (key === 'plan_accion') {
      return (
        <div className="py-6 px-2">
          <p className="font-display italic text-[#D4FC59] text-base">( Plan de )</p>
          <h2 className="text-[#D4FC59] text-2xl font-bold uppercase mb-3">ACCIÓN</h2>
          <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="text-left px-2 py-1.5 text-[10px] font-bold uppercase text-white/50 border-b border-white/15 w-1/4">Pilar</th>
                <th className="text-left px-2 py-1.5 text-[10px] font-bold uppercase text-white/50 border-b border-white/15">Enfoque</th>
              </tr>
            </thead>
            <tbody>
              {planAccion.map((row, idx) => (
                <tr key={idx} className="border-b border-white/10">
                  <td className="px-2 py-1.5 text-white font-medium">{row.pilar}</td>
                  <td className="px-2 py-1.5 text-white/70">{row.enfoque}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {planAccion.length === 0 && <p className="text-[#D4FC59]/50 text-xs mt-2">Sin pilares definidos</p>}
        </div>
      );
    }

    if (key.startsWith('fase_')) {
      const idx = parseInt(key.split('_')[1]);
      const phase = phases[idx];
      if (!phase) return null;
      const phaseColor = PHASE_COLORS[idx % PHASE_COLORS.length];
      return (
        <div className="py-6 px-2">
          <p className="font-display italic text-sm" style={{ color: phaseColor.accent }}>( Principales )</p>
          <h2 className="text-xl font-bold uppercase mb-2" style={{ color: phaseColor.accent }}>FASES DEL PROYECTO</h2>
          <div className="rounded-lg p-3" style={{ background: phaseColor.cardBg }}>
            <p className="font-bold uppercase text-xs mb-2" style={{ color: phaseColor.text }}>
              FASE {idx + 1}: {phase.name} - {phase.periodo}
            </p>
            <p className="text-xs mb-2" style={{ color: `${phaseColor.text}CC` }}>{phase.objetivo}</p>
            <p className="font-bold text-xs mb-1" style={{ color: phaseColor.text }}>Entregables:</p>
            {phase.entregables.slice(0, 3).map((e, i) => (
              <p key={i} className="text-xs" style={{ color: `${phaseColor.text}99` }}>• {e}</p>
            ))}
          </div>
        </div>
      );
    }

    if (key === 'claves') {
      return (
        <div className="py-6 px-2">
          <p className="font-display italic text-[#FF4632] text-base">( Claves )</p>
          <h2 className="text-[#FF4632] text-xl font-bold uppercase mb-3">DEL ÉXITO DEL MODELO</h2>
          <div className="grid grid-cols-2 gap-2">
            {CLAVES_EXITO.map((c, idx) => (
              <div key={idx} className="bg-white rounded-lg p-3 text-center shadow-sm">
                <p className="font-bold text-[#231F1F] text-[10px] uppercase mb-1">{c.title}</p>
                <p className="text-[#231F1F]/50 text-[9px]">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (key === 'metodologia') {
      return (
        <div className="py-6 px-2">
          <p className="font-display italic text-[#D4FC59] text-xl mb-4">Metodología y forma de trabajo</p>
          <div className="space-y-2 text-white text-xs">
            <p><strong>• Frecuencia:</strong> <span className="text-white/70">1 reunión semanal</span></p>
            <p><strong>• Duración:</strong> <span className="text-white/70">2 horas + tareas entre reuniones</span></p>
            <p><strong>• Entregables:</strong> <span className="text-white/70">Plataforma WAU</span></p>
            <p><strong>• Canales:</strong> <span className="text-white/70">WhatsApp, Drive y Mail</span></p>
          </div>
        </div>
      );
    }

    if (key === 'inversion') {
      return (
        <div className="flex h-full">
          <div className="flex-1 flex flex-col justify-center py-6 px-2" style={{ maxWidth: '55%' }}>
            <h2 className="text-white text-2xl font-bold leading-tight mb-3">Inversión requerida</h2>
            {dur && <p className="text-white/80 text-xs mb-3">Capacitación y seguimiento - Proyecto de {dur}:</p>}
            <p className="font-display italic text-[#D4FC59] text-lg font-bold">
              {formatCurrency(totalAmount)}
              {paymentTerms ? ` (${paymentTerms})` : ''}
            </p>
            <div className="mt-auto pt-4">
              <img src="/wau-logo.png" alt="WAU" className="h-6 object-contain opacity-30" />
            </div>
          </div>
          <div className="hidden lg:block rounded-l-xl overflow-hidden" style={{ width: '45%', background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)' }}>
            <img src="/inversion-img.jpg" alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        </div>
      );
    }

    if (key === 'impacto') {
      return (
        <div className="flex flex-col justify-center h-full py-8">
          <p className="font-display italic text-[#D4FC59] text-base mb-1">( nos )</p>
          <h2 className="text-white text-3xl font-bold uppercase leading-tight">OBSESIONA<br />EL IMPACTO.</h2>
          <p className="text-white/40 text-xs mt-2 font-display italic">y trabajamos para lograrlo.</p>
        </div>
      );
    }

    if (key === 'gracias') {
      return (
        <div className="flex flex-col items-center justify-center h-full py-8">
          <WauStar size={80} color="#D4FC59" />
          <p className="font-display italic text-[#D4FC59] text-2xl mt-4">( gracias )</p>
        </div>
      );
    }

    return null;
  };

  // ── Render Edit Panel ────────────────────────────────

  const renderEditPanel = () => {
    const key = activeStep.key;

    if (!activeStep.editable) {
      return (
        <div className="flex items-center gap-3 py-4 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <Lock className="w-5 h-5 text-gray-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Filmina fija — no editable</p>
        </div>
      );
    }

    if (key === 'cover') {
      return (
        <div className="space-y-4">
          <div>
            <label className="label">Nombre del cliente *</label>
            <input type="text" className="input" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nombre del cliente" />
          </div>
          <div>
            <label className="label">Empresa</label>
            <input type="text" className="input" value={clientCompany} onChange={e => setClientCompany(e.target.value)} placeholder="Empresa del cliente" />
          </div>
        </div>
      );
    }

    if (key === 'objetivo') {
      return (
        <div className="space-y-4">
          <div>
            <label className="label">Título del proyecto *</label>
            <input type="text" className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Sistema Comercial" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Duración estimada (días)</label>
              <input type="number" className="input" value={estimatedDurationDays ?? ''} onChange={e => setEstimatedDurationDays(e.target.value ? parseInt(e.target.value) : null)} placeholder="120" />
            </div>
          </div>
          <div>
            <label className="label">Objetivo general</label>
            <textarea className="input" rows={4} value={objective} onChange={e => setObjective(e.target.value)} placeholder="Describí el objetivo general de la propuesta..." />
          </div>
          <div>
            <label className="label">Imagen (URL) — se muestra a la derecha</label>
            <input type="text" className="input" value={clientLogoUrl} onChange={e => setClientLogoUrl(e.target.value)} placeholder="https://ejemplo.com/imagen.png" />
            {clientLogoUrl && (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={clientLogoUrl}
                  alt="Preview"
                  className="h-16 object-contain bg-white rounded border border-gray-200 dark:border-gray-700 px-2"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <span className="text-xs text-gray-400">Preview</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (key === 'objetivos_esp') {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="label mb-0">Objetivos específicos</label>
            <button onClick={() => setSpecificObjectives([...specificObjectives, ''])} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <Plus className="w-4 h-4" /> Agregar
            </button>
          </div>
          {specificObjectives.map((obj, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-sm font-medium text-gray-400 mt-2.5 w-6 text-right">{idx + 1}.</span>
              <input
                type="text"
                className="input flex-1"
                value={obj}
                onChange={e => {
                  const next = [...specificObjectives];
                  next[idx] = e.target.value;
                  setSpecificObjectives(next);
                }}
                placeholder="Objetivo específico..."
              />
              <button onClick={() => setSpecificObjectives(specificObjectives.filter((_, i) => i !== idx))} className="p-2 text-gray-400 hover:text-red-500 mt-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {specificObjectives.length === 0 && (
            <p className="text-sm text-gray-400">Sin objetivos. Hacé click en "Agregar" para crear uno.</p>
          )}
        </div>
      );
    }

    if (key === 'fortalezas') {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="label mb-0">Fortalezas actuales</label>
            <button onClick={() => setStrengths([...strengths, ''])} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <Plus className="w-4 h-4" /> Agregar
            </button>
          </div>
          {strengths.map((s, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                className="input flex-1"
                value={s}
                onChange={e => {
                  const next = [...strengths];
                  next[idx] = e.target.value;
                  setStrengths(next);
                }}
                placeholder="Fortaleza..."
              />
              <button onClick={() => setStrengths(strengths.filter((_, i) => i !== idx))} className="p-2 text-gray-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {strengths.length === 0 && (
            <p className="text-sm text-gray-400">Sin fortalezas. Hacé click en "Agregar" para crear una.</p>
          )}
        </div>
      );
    }

    if (key === 'gap') {
      return (
        <div className="space-y-4">
          <div>
            <label className="label">Título del GAP</label>
            <input
              type="text"
              className="input"
              value={gapTitle}
              onChange={e => setGapTitle(e.target.value)}
              placeholder="Ej: Brecha comercial identificada"
            />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea
              className="input"
              rows={5}
              value={gapDescription}
              onChange={e => setGapDescription(e.target.value)}
              placeholder="Descripción del GAP central..."
            />
          </div>
        </div>
      );
    }

    if (key === 'costo') {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="label mb-0">Tabla Actual vs. Deseado + Costo de no cambiar</label>
            <button onClick={() => setCentralGap([...centralGap, { current: '', desired: '', cost: '' }])} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <Plus className="w-4 h-4" /> Agregar fila
            </button>
          </div>
          {centralGap.length > 0 && (
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase px-1">
              <span>Situación actual</span>
              <span>Situación deseada</span>
              <span>Costo de no cambiar</span>
              <span className="w-8" />
            </div>
          )}
          {centralGap.map((row, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
              <textarea className="input" rows={2} value={row.current} onChange={e => { const next = [...centralGap]; next[idx] = { ...next[idx], current: e.target.value }; setCentralGap(next); }} placeholder="Situación actual..." />
              <textarea className="input" rows={2} value={row.desired} onChange={e => { const next = [...centralGap]; next[idx] = { ...next[idx], desired: e.target.value }; setCentralGap(next); }} placeholder="Situación deseada..." />
              <textarea className="input" rows={2} value={row.cost || ''} onChange={e => { const next = [...centralGap]; next[idx] = { ...next[idx], cost: e.target.value }; setCentralGap(next); }} placeholder="Costo de no cambiar..." />
              <button onClick={() => setCentralGap(centralGap.filter((_, i) => i !== idx))} className="p-2 text-gray-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {centralGap.length === 0 && (
            <p className="text-sm text-gray-400">Sin filas. Hacé click en "Agregar fila".</p>
          )}
        </div>
      );
    }

    if (key === 'plan_accion') {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="label mb-0">Tabla Pilar / Enfoque</label>
            <button onClick={() => setPlanAccion([...planAccion, { pilar: '', enfoque: '' }])} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <Plus className="w-4 h-4" /> Agregar fila
            </button>
          </div>
          {planAccion.length > 0 && (
            <div className="grid grid-cols-[1fr_3fr_auto] gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase px-1">
              <span>Pilar</span>
              <span>Enfoque</span>
              <span className="w-8" />
            </div>
          )}
          {planAccion.map((row, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_3fr_auto] gap-2">
              <input className="input" value={row.pilar} onChange={e => { const next = [...planAccion]; next[idx] = { ...next[idx], pilar: e.target.value }; setPlanAccion(next); }} placeholder="Ej: Diagnóstico" />
              <textarea className="input" rows={2} value={row.enfoque} onChange={e => { const next = [...planAccion]; next[idx] = { ...next[idx], enfoque: e.target.value }; setPlanAccion(next); }} placeholder="Descripción del enfoque..." />
              <button onClick={() => setPlanAccion(planAccion.filter((_, i) => i !== idx))} className="p-2 text-gray-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {planAccion.length === 0 && (
            <p className="text-sm text-gray-400">Sin pilares. Hacé click en "Agregar fila".</p>
          )}
        </div>
      );
    }

    if (key.startsWith('fase_')) {
      const idx = parseInt(key.split('_')[1]);
      const phase = phases[idx];
      if (!phase) return null;
      const updatePhase = (field: string, value: any) => {
        const next = [...phases];
        next[idx] = { ...next[idx], [field]: value };
        setPhases(next);
      };
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre de la fase</label>
              <input type="text" className="input" value={phase.name} onChange={e => updatePhase('name', e.target.value)} placeholder="Ej: DIAGNÓSTICO + ESTRATEGIA" />
            </div>
            <div>
              <label className="label">Período</label>
              <input type="text" className="input" value={phase.periodo} onChange={e => updatePhase('periodo', e.target.value)} placeholder="Ej: Mes 1" />
            </div>
          </div>
          <div>
            <label className="label">Objetivo</label>
            <textarea className="input" rows={3} value={phase.objetivo} onChange={e => updatePhase('objetivo', e.target.value)} placeholder="Objetivo de esta fase..." />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="label mb-0">Entregables</label>
              <button onClick={() => updatePhase('entregables', [...phase.entregables, ''])} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <Plus className="w-4 h-4" /> Agregar
              </button>
            </div>
            {phase.entregables.map((e, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  className="input flex-1"
                  value={e}
                  onChange={ev => {
                    const nextE = [...phase.entregables];
                    nextE[i] = ev.target.value;
                    updatePhase('entregables', nextE);
                  }}
                  placeholder="Entregable..."
                />
                <button onClick={() => updatePhase('entregables', phase.entregables.filter((_, j) => j !== i))} className="p-2 text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (key === 'inversion') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Monto total ($)</label>
              <input type="number" className="input" min={0} value={totalAmount} onChange={e => setTotalAmount(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="label">Descuento (%)</label>
              <input type="number" className="input" min={0} max={100} value={discountPercent} onChange={e => setDiscountPercent(parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div>
            <label className="label">Condiciones de pago</label>
            <input type="text" className="input" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} placeholder="Ej: En pesos, Mensuales" />
          </div>
        </div>
      );
    }

    return null;
  };

  // ── Main Render ──────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&display=swap'); .font-display { font-family: 'Playfair Display', Georgia, serif; }`}</style>

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(`/proposals/${id}`)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Presentation className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Editar filminas</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{proposal.proposalNumber} — {proposal.title}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar cambios'}
        </button>
      </div>

      {/* Save error banner */}
      {saveError && (
        <div className="bg-red-100 border border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300 px-4 py-2 rounded-lg text-sm font-medium">
          {saveError}
        </div>
      )}

      {/* Step tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-thin">
        {steps.map((step, idx) => (
          <button
            key={step.key}
            onClick={() => setCurrentStep(idx)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              idx === currentStep
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {!step.editable && <Lock className="w-3 h-3 opacity-50" />}
            {hiddenSlides.includes(step.key) && <EyeOff className="w-3 h-3 opacity-50" />}
            {step.label}
          </button>
        ))}
      </div>

      {/* Slide Preview */}
      <div
        className="rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700"
        style={{ background: cfg.bg, aspectRatio: '16/9', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
      >
        <div className="px-8 sm:px-12 max-h-full overflow-y-auto">
          {renderPreview()}
        </div>
      </div>

      {/* Edit Panel */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Filmina {currentStep + 1} de {totalSteps}: {activeStep.label}
            </span>
            {activeStep.editable && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">Editable</span>
            )}
          </div>
          {activeStep.key !== 'cover' && (
            <button
              onClick={() => {
                const key = activeStep.key;
                setHiddenSlides(prev =>
                  prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                );
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                hiddenSlides.includes(activeStep.key)
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200'
              }`}
            >
              {hiddenSlides.includes(activeStep.key) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {hiddenSlides.includes(activeStep.key) ? 'Oculta en link público' : 'Visible en link público'}
            </button>
          )}
        </div>
        {hiddenSlides.includes(activeStep.key) && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs">
            Esta filmina no se mostrará en el link público. Hacé click en el botón de arriba para volver a mostrarla.
          </div>
        )}
        {renderEditPanel()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between py-4">
        <button
          onClick={goPrev}
          disabled={currentStep === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Anterior
        </button>
        <span className="text-sm text-gray-400">{currentStep + 1} / {totalSteps}</span>
        <button
          onClick={goNext}
          disabled={currentStep >= totalSteps - 1}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Siguiente <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
