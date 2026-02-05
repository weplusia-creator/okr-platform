import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Calculator,
  DollarSign,
  TrendingUp,
  Clock,
  BarChart3,
  PieChart,
  AlertTriangle,
  Check,
  FileText,
} from 'lucide-react';
import { useTools } from '../../../context/ToolsContext';
import { useFinance } from '../../../context/FinanceContext';
import {
  type ROIAnalysis,
  type ROIInitialCost,
  type ROIRecurringCost,
  type ROIHiddenCost,
  type ROIDirectSaving,
  type ROIAdditionalRevenue,
  type ROIProductivityBenefit,
  type ROIIntangibleBenefit,
  type Currency,
  type Confidence,
  type Impact,
  calculateROI,
  getScenarios,
  getSensitivityMatrix,
  getCumulativeData,
  getYearlyData,
  formatROICurrency,
  formatMonths,
  genId,
  createEmptyAnalysis,
  CURRENCY_OPTIONS,
  PERIOD_OPTIONS,
  CONFIDENCE_OPTIONS,
  IMPACT_OPTIONS,
} from '../../../types/tools';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from 'recharts';

// ===== Constants =====

const CHART_COLORS = {
  cost: '#FF4632',
  benefit: '#D4FC59',
  net: '#3100E2',
};

const PIE_COLORS = ['#D4FC59', '#3100E2', '#FF4632', '#F59E0B', '#8B5CF6'];

const STEP_LABELS = ['Datos Generales', 'Inversi\u00F3n', 'Beneficios', 'Resultados'];

type FormData = Omit<ROIAnalysis, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>;

// ===== Helper: currency symbol =====

function getCurrencySymbol(currency: Currency): string {
  return CURRENCY_OPTIONS.find((c) => c.value === currency)?.symbol ?? '$';
}

// ===== Component =====

export function ROICalculator() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { roiAnalyses, roiTemplates, addROIAnalysis, updateROIAnalysis, fetchROITemplates } =
    useTools();
  const { clients } = useFinance();

  const isNew = !id || id === 'new';

  // ----- State -----
  const [formData, setFormData] = useState<FormData>(createEmptyAnalysis());
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Collapsible sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    initialCosts: true,
    recurringCosts: true,
    hiddenCosts: true,
    directSavings: true,
    additionalRevenue: true,
    productivityBenefits: true,
    intangibleBenefits: true,
  });

  // ----- Load existing analysis or empty -----
  useEffect(() => {
    if (isNew) {
      setFormData(createEmptyAnalysis());
      setLoaded(true);
    } else {
      const existing = roiAnalyses.find((a) => a.id === id);
      if (existing) {
        const { id: _id, organizationId: _oid, createdAt: _ca, updatedAt: _ua, ...rest } =
          existing;
        setFormData(rest);
        setLoaded(true);
      }
    }
  }, [id, isNew, roiAnalyses]);

  // Fetch templates on mount
  useEffect(() => {
    fetchROITemplates();
  }, [fetchROITemplates]);

  // ----- Calculations -----
  const analysisForCalc = useMemo<ROIAnalysis>(
    () =>
      ({
        id: '',
        organizationId: '',
        createdAt: '',
        updatedAt: '',
        ...formData,
      } as ROIAnalysis),
    [formData],
  );

  const calc = useMemo(() => calculateROI(analysisForCalc), [analysisForCalc]);
  const scenarios = useMemo(() => getScenarios(analysisForCalc), [analysisForCalc]);
  const sensitivityMatrix = useMemo(
    () => getSensitivityMatrix(analysisForCalc),
    [analysisForCalc],
  );
  const cumulativeData = useMemo(() => getCumulativeData(analysisForCalc), [analysisForCalc]);
  const yearlyData = useMemo(() => getYearlyData(analysisForCalc), [analysisForCalc]);

  // ----- Form helpers -----
  function updateField<K extends keyof FormData>(field: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  }

  function toggleSection(key: string) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // ----- Template apply -----
  function applyTemplate(templateId: string) {
    const tpl = roiTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    setFormData((prev) => ({
      ...prev,
      name: prev.name || tpl.name,
      initialCosts: tpl.initialCosts.map((c) => ({ ...c, id: genId() })),
      recurringCosts: tpl.recurringCosts.map((c) => ({ ...c, id: genId() })),
      hiddenCosts: tpl.hiddenCosts.map((c) => ({ ...c, id: genId() })),
      directSavings: tpl.directSavings.map((c) => ({ ...c, id: genId() })),
      additionalRevenue: tpl.additionalRevenue.map((c) => ({ ...c, id: genId() })),
      productivityBenefits: tpl.productivityBenefits.map((c) => ({ ...c, id: genId() })),
      intangibleBenefits: tpl.intangibleBenefits.map((c) => ({ ...c, id: genId() })),
    }));
    setDirty(true);
  }

  // ----- Save -----
  async function handleSave() {
    setSaving(true);
    try {
      if (isNew) {
        const newId = await addROIAnalysis(formData);
        if (newId) {
          setDirty(false);
          navigate(`/tools/roi/${newId}`, { replace: true });
        }
      } else {
        const ok = await updateROIAnalysis(id!, formData);
        if (ok) setDirty(false);
      }
    } catch (err) {
      console.error('Error saving:', err);
    } finally {
      setSaving(false);
    }
  }

  // ----- Table row helpers -----
  function addInitialCost() {
    updateField('initialCosts', [
      ...formData.initialCosts,
      { id: genId(), concept: '', amount: 0 },
    ]);
  }
  function removeInitialCost(rowId: string) {
    updateField(
      'initialCosts',
      formData.initialCosts.filter((c) => c.id !== rowId),
    );
  }
  function updateInitialCost(rowId: string, field: keyof ROIInitialCost, value: string | number) {
    updateField(
      'initialCosts',
      formData.initialCosts.map((c) => (c.id === rowId ? { ...c, [field]: value } : c)),
    );
  }

  function addRecurringCost() {
    updateField('recurringCosts', [
      ...formData.recurringCosts,
      { id: genId(), concept: '', monthlyAmount: 0 },
    ]);
  }
  function removeRecurringCost(rowId: string) {
    updateField(
      'recurringCosts',
      formData.recurringCosts.filter((c) => c.id !== rowId),
    );
  }
  function updateRecurringCost(
    rowId: string,
    field: keyof ROIRecurringCost,
    value: string | number,
  ) {
    updateField(
      'recurringCosts',
      formData.recurringCosts.map((c) => (c.id === rowId ? { ...c, [field]: value } : c)),
    );
  }

  function addHiddenCost() {
    updateField('hiddenCosts', [
      ...formData.hiddenCosts,
      { id: genId(), concept: '', hours: 0, hourlyRate: 0 },
    ]);
  }
  function removeHiddenCost(rowId: string) {
    updateField(
      'hiddenCosts',
      formData.hiddenCosts.filter((c) => c.id !== rowId),
    );
  }
  function updateHiddenCost(rowId: string, field: keyof ROIHiddenCost, value: string | number) {
    updateField(
      'hiddenCosts',
      formData.hiddenCosts.map((c) => (c.id === rowId ? { ...c, [field]: value } : c)),
    );
  }

  function addDirectSaving() {
    updateField('directSavings', [
      ...formData.directSavings,
      { id: genId(), concept: '', monthlyAmount: 0, confidence: 'medium' as Confidence },
    ]);
  }
  function removeDirectSaving(rowId: string) {
    updateField(
      'directSavings',
      formData.directSavings.filter((c) => c.id !== rowId),
    );
  }
  function updateDirectSaving(
    rowId: string,
    field: keyof ROIDirectSaving,
    value: string | number,
  ) {
    updateField(
      'directSavings',
      formData.directSavings.map((c) => (c.id === rowId ? { ...c, [field]: value } : c)),
    );
  }

  function addAdditionalRevenue() {
    updateField('additionalRevenue', [
      ...formData.additionalRevenue,
      { id: genId(), concept: '', monthlyAmount: 0, confidence: 'medium' as Confidence },
    ]);
  }
  function removeAdditionalRevenue(rowId: string) {
    updateField(
      'additionalRevenue',
      formData.additionalRevenue.filter((c) => c.id !== rowId),
    );
  }
  function updateAdditionalRevenue(
    rowId: string,
    field: keyof ROIAdditionalRevenue,
    value: string | number,
  ) {
    updateField(
      'additionalRevenue',
      formData.additionalRevenue.map((c) => (c.id === rowId ? { ...c, [field]: value } : c)),
    );
  }

  function addProductivityBenefit() {
    updateField('productivityBenefits', [
      ...formData.productivityBenefits,
      {
        id: genId(),
        concept: '',
        hoursPerMonth: 0,
        hourlyRate: 0,
        peopleAffected: 1,
        confidence: 'medium' as Confidence,
      },
    ]);
  }
  function removeProductivityBenefit(rowId: string) {
    updateField(
      'productivityBenefits',
      formData.productivityBenefits.filter((c) => c.id !== rowId),
    );
  }
  function updateProductivityBenefit(
    rowId: string,
    field: keyof ROIProductivityBenefit,
    value: string | number,
  ) {
    updateField(
      'productivityBenefits',
      formData.productivityBenefits.map((c) => (c.id === rowId ? { ...c, [field]: value } : c)),
    );
  }

  function addIntangibleBenefit() {
    updateField('intangibleBenefits', [
      ...formData.intangibleBenefits,
      { id: genId(), benefit: '', impact: 'medium' as Impact },
    ]);
  }
  function removeIntangibleBenefit(rowId: string) {
    updateField(
      'intangibleBenefits',
      formData.intangibleBenefits.filter((c) => c.id !== rowId),
    );
  }
  function updateIntangibleBenefit(
    rowId: string,
    field: keyof ROIIntangibleBenefit,
    value: string | number,
  ) {
    updateField(
      'intangibleBenefits',
      formData.intangibleBenefits.map((c) => (c.id === rowId ? { ...c, [field]: value } : c)),
    );
  }

  // ----- Color helpers -----
  function roiColor(roi: number): string {
    if (roi >= 100) return 'text-green-400';
    if (roi >= 50) return 'text-yellow-400';
    return 'text-red-400';
  }
  function roiBgColor(roi: number): string {
    if (roi >= 100) return 'bg-green-500/20 text-green-400';
    if (roi >= 50) return 'bg-yellow-500/20 text-yellow-400';
    if (roi >= 0) return 'bg-orange-500/20 text-orange-400';
    return 'bg-red-500/20 text-red-400';
  }
  function paybackColor(months: number): string {
    if (!isFinite(months)) return 'text-red-400';
    if (months <= 6) return 'text-green-400';
    if (months <= 12) return 'text-yellow-400';
    return 'text-red-400';
  }

  // ----- Sensitivity cell color -----
  function sensitivityCellBg(roi: number): string {
    if (roi >= 100) return 'bg-green-600/30 text-green-300';
    if (roi >= 50) return 'bg-green-600/15 text-green-400';
    if (roi >= 0) return 'bg-yellow-600/20 text-yellow-300';
    return 'bg-red-600/20 text-red-400';
  }

  // ----- Pie data -----
  const benefitPieData = useMemo(() => {
    const items: { name: string; value: number }[] = [];
    if (calc.totalSavingsMonthly > 0)
      items.push({ name: 'Ahorros Directos', value: calc.totalSavingsMonthly * formData.analysisPeriod });
    if (calc.totalRevenueMonthly > 0)
      items.push({ name: 'Ingresos Adicionales', value: calc.totalRevenueMonthly * formData.analysisPeriod });
    if (calc.totalProductivityMonthly > 0)
      items.push({ name: 'Productividad', value: calc.totalProductivityMonthly * formData.analysisPeriod });
    return items;
  }, [calc, formData.analysisPeriod]);

  const costPieData = useMemo(() => {
    const items: { name: string; value: number }[] = [];
    if (calc.totalInitialCosts > 0) items.push({ name: 'Costos Iniciales', value: calc.totalInitialCosts });
    if (calc.totalRecurringForPeriod > 0)
      items.push({ name: 'Costos Recurrentes', value: calc.totalRecurringForPeriod });
    if (calc.totalHiddenCosts > 0) items.push({ name: 'Costos Ocultos', value: calc.totalHiddenCosts });
    return items;
  }, [calc]);

  // ----- Custom tooltip for charts -----
  function ChartTooltipContent({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border dark:border-[#443f40] dark:bg-[#363233] p-3 shadow-lg">
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <p key={idx} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatROICurrency(entry.value, formData.currency)}
          </p>
        ))}
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-300" />
      </div>
    );
  }

  // ================= RENDER =================

  return (
    <div className="space-y-6 pb-32">
      {/* ===== Header ===== */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/tools/roi')}
            className="p-2 rounded-lg dark:hover:bg-[#3d3839] text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isNew ? 'Nuevo An\u00E1lisis ROI' : 'Editar An\u00E1lisis ROI'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formData.name || 'Sin nombre'}
              {dirty && <span className="ml-2 text-yellow-400">* Sin guardar</span>}
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !formData.name}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar
        </button>
      </div>

      {/* ===== Step Indicator ===== */}
      <div className="flex items-center justify-center gap-0">
        {STEP_LABELS.map((label, idx) => {
          const stepNum = idx + 1;
          const isActive = step === stepNum;
          const isCompleted = step > stepNum;
          return (
            <div key={stepNum} className="flex items-center">
              {idx > 0 && (
                <div
                  className={`w-12 sm:w-20 h-0.5 ${
                    isCompleted ? 'bg-primary-300' : 'dark:bg-[#443f40] bg-gray-200'
                  }`}
                />
              )}
              <button
                onClick={() => setStep(stepNum)}
                className="flex flex-col items-center gap-1 min-w-[80px]"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-primary-300 text-black'
                      : isCompleted
                        ? 'bg-primary-300/20 text-primary-300'
                        : 'dark:bg-[#443f40] bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
                </div>
                <span
                  className={`text-xs ${
                    isActive
                      ? 'text-primary-300 font-medium'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {label}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* ===== Step Content ===== */}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}

      {/* ===== Navigation ===== */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="btn-secondary flex items-center gap-2 disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" />
          Anterior
        </button>
        <button
          onClick={() => setStep((s) => Math.min(4, s + 1))}
          disabled={step === 4}
          className="btn-primary flex items-center gap-2 disabled:opacity-40"
        >
          Siguiente
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* ===== Floating KPI Bar (steps 2 & 3) ===== */}
      {(step === 2 || step === 3) && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t dark:border-[#443f40] dark:bg-[#363233]/95 bg-white/95 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 overflow-x-auto">
            <KpiPill
              label="ROI"
              value={`${calc.roiPercentage.toFixed(1)}%`}
              color={roiColor(calc.roiPercentage)}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <KpiPill
              label="Payback"
              value={formatMonths(calc.paybackMonths)}
              color={paybackColor(calc.paybackMonths)}
              icon={<Clock className="h-4 w-4" />}
            />
            <KpiPill
              label="Beneficio Neto"
              value={formatROICurrency(calc.netBenefit, formData.currency)}
              color={calc.netBenefit >= 0 ? 'text-green-400' : 'text-red-400'}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <KpiPill
              label="Inversi\u00F3n Total"
              value={formatROICurrency(calc.totalInvestment, formData.currency)}
              color="text-red-400"
              icon={<BarChart3 className="h-4 w-4" />}
            />
            <KpiPill
              label="Beneficios Totales"
              value={formatROICurrency(calc.totalBenefitsForPeriod, formData.currency)}
              color="text-primary-300"
              icon={<Calculator className="h-4 w-4" />}
            />
          </div>
        </div>
      )}
    </div>
  );

  // ================================================================
  // STEP 1: Datos Generales
  // ================================================================
  function renderStep1() {
    return (
      <div className="space-y-6">
        {/* Template selector (only for new analysis) */}
        {isNew && roiTemplates.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">
              Comenzar desde una plantilla
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {roiTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => applyTemplate(tpl.id)}
                  className="text-left p-4 rounded-xl border dark:border-[#443f40] dark:bg-[#363233] dark:hover:bg-[#3d3839] hover:border-primary-300/30 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary-300/10 text-primary-300 group-hover:bg-primary-300/20">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {tpl.name}
                      </p>
                      {tpl.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          {tpl.description}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <div className="rounded-xl border dark:border-[#443f40] dark:bg-[#363233] p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary-300" />
            Datos Generales
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div className="md:col-span-2">
              <label className="label">
                Nombre del an\u00E1lisis <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="Ej: Implementaci\u00F3n CRM para Empresa X"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
            </div>

            {/* Client */}
            <div>
              <label className="label">Cliente</label>
              <input
                type="text"
                className="input"
                list="client-list"
                placeholder="Seleccionar o escribir nombre"
                value={formData.clientName ?? ''}
                onChange={(e) => {
                  const name = e.target.value;
                  const match = clients.find((c) => c.name === name);
                  setFormData((prev) => ({
                    ...prev,
                    clientName: name || null,
                    clientId: match?.id ?? null,
                  }));
                  setDirty(true);
                }}
              />
              <datalist id="client-list">
                {clients.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>

            {/* Responsible */}
            <div>
              <label className="label">Responsable</label>
              <input
                type="text"
                className="input"
                placeholder="Nombre del responsable"
                value={formData.responsible ?? ''}
                onChange={(e) => updateField('responsible', e.target.value || null)}
              />
            </div>

            {/* Solution */}
            <div className="md:col-span-2">
              <label className="label">Soluci\u00F3n / Servicio propuesto</label>
              <textarea
                className="input min-h-[80px]"
                placeholder="Describe la soluci\u00F3n o servicio que se est\u00E1 evaluando"
                value={formData.solutionDescription ?? ''}
                onChange={(e) => updateField('solutionDescription', e.target.value || null)}
              />
            </div>

            {/* Period */}
            <div>
              <label className="label">Per\u00EDodo de an\u00E1lisis</label>
              <select
                className="input"
                value={formData.analysisPeriod}
                onChange={(e) => updateField('analysisPeriod', Number(e.target.value))}
              >
                {PERIOD_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Currency */}
            <div>
              <label className="label">Moneda</label>
              <select
                className="input"
                value={formData.currency}
                onChange={(e) => updateField('currency', e.target.value as Currency)}
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.symbol} - {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="label">Fecha del an\u00E1lisis</label>
              <input
                type="date"
                className="input"
                value={formData.analysisDate}
                onChange={(e) => updateField('analysisDate', e.target.value)}
              />
            </div>

            {/* Context */}
            <div className="md:col-span-2">
              <label className="label">Contexto / Situaci\u00F3n actual (opcional)</label>
              <textarea
                className="input min-h-[80px]"
                placeholder="Describe la situaci\u00F3n actual del cliente o proyecto"
                value={formData.contextNotes ?? ''}
                onChange={(e) => updateField('contextNotes', e.target.value || null)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ================================================================
  // STEP 2: Inversi\u00F3n
  // ================================================================
  function renderStep2() {
    const sym = getCurrencySymbol(formData.currency);

    const initialSubtotal = formData.initialCosts.reduce((s, c) => s + c.amount, 0);
    const recurringMonthly = formData.recurringCosts.reduce((s, c) => s + c.monthlyAmount, 0);
    const recurringAnnual = recurringMonthly * 12;
    const hiddenSubtotal = formData.hiddenCosts.reduce(
      (s, c) => s + c.hours * c.hourlyRate,
      0,
    );

    return (
      <div className="space-y-6">
        {/* A) Costos Iniciales */}
        <CollapsibleSection
          title="Costos Iniciales (una vez)"
          icon={<DollarSign className="h-5 w-5" />}
          sectionKey="initialCosts"
          open={openSections.initialCosts}
          onToggle={() => toggleSection('initialCosts')}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                  <th className="pb-2 pr-2">Concepto</th>
                  <th className="pb-2 pr-2 w-40">Monto ({sym})</th>
                  <th className="pb-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {formData.initialCosts.map((cost) => (
                  <tr key={cost.id} className="border-t dark:border-[#443f40]">
                    <td className="py-2 pr-2">
                      <input
                        type="text"
                        className="input text-sm py-1.5 px-2"
                        placeholder="Ej: Licencia de software"
                        value={cost.concept}
                        onChange={(e) =>
                          updateInitialCost(cost.id, 'concept', e.target.value)
                        }
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                          {sym}
                        </span>
                        <input
                          type="number"
                          className="input text-sm py-1.5 px-2 pl-8"
                          min={0}
                          value={cost.amount || ''}
                          onChange={(e) =>
                            updateInitialCost(cost.id, 'amount', Number(e.target.value))
                          }
                        />
                      </div>
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => removeInitialCost(cost.id)}
                        className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={addInitialCost}
              className="text-sm text-primary-300 hover:text-primary-400 flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Agregar costo
            </button>
            <p className="text-sm font-medium text-gray-300">
              Subtotal: {formatROICurrency(initialSubtotal, formData.currency)}
            </p>
          </div>
        </CollapsibleSection>

        {/* B) Costos Recurrentes */}
        <CollapsibleSection
          title="Costos Recurrentes (mensuales)"
          icon={<Clock className="h-5 w-5" />}
          sectionKey="recurringCosts"
          open={openSections.recurringCosts}
          onToggle={() => toggleSection('recurringCosts')}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                  <th className="pb-2 pr-2">Concepto</th>
                  <th className="pb-2 pr-2 w-36">Monto Mensual ({sym})</th>
                  <th className="pb-2 pr-2 w-36">Monto Anual ({sym})</th>
                  <th className="pb-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {formData.recurringCosts.map((cost) => (
                  <tr key={cost.id} className="border-t dark:border-[#443f40]">
                    <td className="py-2 pr-2">
                      <input
                        type="text"
                        className="input text-sm py-1.5 px-2"
                        placeholder="Ej: Suscripci\u00F3n mensual"
                        value={cost.concept}
                        onChange={(e) =>
                          updateRecurringCost(cost.id, 'concept', e.target.value)
                        }
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                          {sym}
                        </span>
                        <input
                          type="number"
                          className="input text-sm py-1.5 px-2 pl-8"
                          min={0}
                          value={cost.monthlyAmount || ''}
                          onChange={(e) =>
                            updateRecurringCost(
                              cost.id,
                              'monthlyAmount',
                              Number(e.target.value),
                            )
                          }
                        />
                      </div>
                    </td>
                    <td className="py-2 pr-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                          {sym}
                        </span>
                        <input
                          type="number"
                          className="input text-sm py-1.5 px-2 pl-8 dark:bg-[#3d3839] bg-gray-100"
                          readOnly
                          value={cost.monthlyAmount * 12}
                        />
                      </div>
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => removeRecurringCost(cost.id)}
                        className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={addRecurringCost}
              className="text-sm text-primary-300 hover:text-primary-400 flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Agregar costo
            </button>
            <div className="text-right text-sm">
              <p className="text-gray-400">
                Mensual: {formatROICurrency(recurringMonthly, formData.currency)}
              </p>
              <p className="font-medium text-gray-300">
                Anual: {formatROICurrency(recurringAnnual, formData.currency)}
              </p>
            </div>
          </div>
        </CollapsibleSection>

        {/* C) Costos Ocultos */}
        <CollapsibleSection
          title="Costos Ocultos / Indirectos"
          icon={<AlertTriangle className="h-5 w-5" />}
          sectionKey="hiddenCosts"
          open={openSections.hiddenCosts}
          onToggle={() => toggleSection('hiddenCosts')}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                  <th className="pb-2 pr-2">Concepto</th>
                  <th className="pb-2 pr-2 w-32">Horas Estimadas</th>
                  <th className="pb-2 pr-2 w-32">Costo/Hora ({sym})</th>
                  <th className="pb-2 pr-2 w-36">Total ({sym})</th>
                  <th className="pb-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {formData.hiddenCosts.map((cost) => (
                  <tr key={cost.id} className="border-t dark:border-[#443f40]">
                    <td className="py-2 pr-2">
                      <input
                        type="text"
                        className="input text-sm py-1.5 px-2"
                        placeholder="Ej: Capacitaci\u00F3n del equipo"
                        value={cost.concept}
                        onChange={(e) =>
                          updateHiddenCost(cost.id, 'concept', e.target.value)
                        }
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        className="input text-sm py-1.5 px-2"
                        min={0}
                        value={cost.hours || ''}
                        onChange={(e) =>
                          updateHiddenCost(cost.id, 'hours', Number(e.target.value))
                        }
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                          {sym}
                        </span>
                        <input
                          type="number"
                          className="input text-sm py-1.5 px-2 pl-8"
                          min={0}
                          value={cost.hourlyRate || ''}
                          onChange={(e) =>
                            updateHiddenCost(
                              cost.id,
                              'hourlyRate',
                              Number(e.target.value),
                            )
                          }
                        />
                      </div>
                    </td>
                    <td className="py-2 pr-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                          {sym}
                        </span>
                        <input
                          type="number"
                          className="input text-sm py-1.5 px-2 pl-8 dark:bg-[#3d3839] bg-gray-100"
                          readOnly
                          value={cost.hours * cost.hourlyRate}
                        />
                      </div>
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => removeHiddenCost(cost.id)}
                        className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={addHiddenCost}
              className="text-sm text-primary-300 hover:text-primary-400 flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Agregar costo
            </button>
            <p className="text-sm font-medium text-gray-300">
              Subtotal: {formatROICurrency(hiddenSubtotal, formData.currency)}
            </p>
          </div>
        </CollapsibleSection>

        {/* Total Inversi\u00F3n */}
        <div className="rounded-xl border dark:border-[#443f40] dark:bg-[#363233] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Inversi\u00F3n (per\u00EDodo completo)</p>
                <p className="text-2xl font-bold text-red-400">
                  {formatROICurrency(calc.totalInvestment, formData.currency)}
                </p>
              </div>
            </div>
            <div className="text-right text-xs text-gray-500 space-y-1">
              <p>Iniciales: {formatROICurrency(initialSubtotal, formData.currency)}</p>
              <p>
                Recurrentes ({formData.analysisPeriod}m):{' '}
                {formatROICurrency(recurringMonthly * formData.analysisPeriod, formData.currency)}
              </p>
              <p>Ocultos: {formatROICurrency(hiddenSubtotal, formData.currency)}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ================================================================
  // STEP 3: Beneficios
  // ================================================================
  function renderStep3() {
    const sym = getCurrencySymbol(formData.currency);

    const savingsMonthly = formData.directSavings.reduce((s, b) => s + b.monthlyAmount, 0);
    const revenueMonthly = formData.additionalRevenue.reduce((s, b) => s + b.monthlyAmount, 0);
    const productivityMonthly = formData.productivityBenefits.reduce(
      (s, b) => s + b.hoursPerMonth * b.hourlyRate * b.peopleAffected,
      0,
    );

    return (
      <div className="space-y-6">
        {/* A) Ahorros Directos */}
        <CollapsibleSection
          title="Ahorros Directos"
          icon={<DollarSign className="h-5 w-5" />}
          sectionKey="directSavings"
          open={openSections.directSavings}
          onToggle={() => toggleSection('directSavings')}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                  <th className="pb-2 pr-2">Concepto</th>
                  <th className="pb-2 pr-2 w-36">Ahorro Mensual ({sym})</th>
                  <th className="pb-2 pr-2 w-36">Ahorro Anual ({sym})</th>
                  <th className="pb-2 pr-2 w-28">Confianza</th>
                  <th className="pb-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {formData.directSavings.map((item) => (
                  <tr key={item.id} className="border-t dark:border-[#443f40]">
                    <td className="py-2 pr-2">
                      <input
                        type="text"
                        className="input text-sm py-1.5 px-2"
                        placeholder="Ej: Reducci\u00F3n de errores manuales"
                        value={item.concept}
                        onChange={(e) =>
                          updateDirectSaving(item.id, 'concept', e.target.value)
                        }
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                          {sym}
                        </span>
                        <input
                          type="number"
                          className="input text-sm py-1.5 px-2 pl-8"
                          min={0}
                          value={item.monthlyAmount || ''}
                          onChange={(e) =>
                            updateDirectSaving(
                              item.id,
                              'monthlyAmount',
                              Number(e.target.value),
                            )
                          }
                        />
                      </div>
                    </td>
                    <td className="py-2 pr-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                          {sym}
                        </span>
                        <input
                          type="number"
                          className="input text-sm py-1.5 px-2 pl-8 dark:bg-[#3d3839] bg-gray-100"
                          readOnly
                          value={item.monthlyAmount * 12}
                        />
                      </div>
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        className="input text-sm py-1.5 px-2"
                        value={item.confidence}
                        onChange={(e) =>
                          updateDirectSaving(item.id, 'confidence', e.target.value)
                        }
                      >
                        {CONFIDENCE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => removeDirectSaving(item.id)}
                        className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={addDirectSaving}
              className="text-sm text-primary-300 hover:text-primary-400 flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Agregar ahorro
            </button>
            <p className="text-sm font-medium text-gray-300">
              Mensual: {formatROICurrency(savingsMonthly, formData.currency)}
            </p>
          </div>
        </CollapsibleSection>

        {/* B) Ingresos Adicionales */}
        <CollapsibleSection
          title="Ingresos Adicionales"
          icon={<TrendingUp className="h-5 w-5" />}
          sectionKey="additionalRevenue"
          open={openSections.additionalRevenue}
          onToggle={() => toggleSection('additionalRevenue')}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                  <th className="pb-2 pr-2">Concepto</th>
                  <th className="pb-2 pr-2 w-36">Ingreso Mensual ({sym})</th>
                  <th className="pb-2 pr-2 w-36">Ingreso Anual ({sym})</th>
                  <th className="pb-2 pr-2 w-28">Confianza</th>
                  <th className="pb-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {formData.additionalRevenue.map((item) => (
                  <tr key={item.id} className="border-t dark:border-[#443f40]">
                    <td className="py-2 pr-2">
                      <input
                        type="text"
                        className="input text-sm py-1.5 px-2"
                        placeholder="Ej: Nuevos clientes estimados"
                        value={item.concept}
                        onChange={(e) =>
                          updateAdditionalRevenue(item.id, 'concept', e.target.value)
                        }
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                          {sym}
                        </span>
                        <input
                          type="number"
                          className="input text-sm py-1.5 px-2 pl-8"
                          min={0}
                          value={item.monthlyAmount || ''}
                          onChange={(e) =>
                            updateAdditionalRevenue(
                              item.id,
                              'monthlyAmount',
                              Number(e.target.value),
                            )
                          }
                        />
                      </div>
                    </td>
                    <td className="py-2 pr-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                          {sym}
                        </span>
                        <input
                          type="number"
                          className="input text-sm py-1.5 px-2 pl-8 dark:bg-[#3d3839] bg-gray-100"
                          readOnly
                          value={item.monthlyAmount * 12}
                        />
                      </div>
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        className="input text-sm py-1.5 px-2"
                        value={item.confidence}
                        onChange={(e) =>
                          updateAdditionalRevenue(item.id, 'confidence', e.target.value)
                        }
                      >
                        {CONFIDENCE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => removeAdditionalRevenue(item.id)}
                        className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={addAdditionalRevenue}
              className="text-sm text-primary-300 hover:text-primary-400 flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Agregar ingreso
            </button>
            <p className="text-sm font-medium text-gray-300">
              Mensual: {formatROICurrency(revenueMonthly, formData.currency)}
            </p>
          </div>
        </CollapsibleSection>

        {/* C) Beneficios de Productividad */}
        <CollapsibleSection
          title="Beneficios de Productividad"
          icon={<BarChart3 className="h-5 w-5" />}
          sectionKey="productivityBenefits"
          open={openSections.productivityBenefits}
          onToggle={() => toggleSection('productivityBenefits')}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                  <th className="pb-2 pr-2">Concepto</th>
                  <th className="pb-2 pr-2 w-28">Horas/Mes</th>
                  <th className="pb-2 pr-2 w-28">Costo/Hora ({sym})</th>
                  <th className="pb-2 pr-2 w-24">Personas</th>
                  <th className="pb-2 pr-2 w-36">Ahorro Mensual ({sym})</th>
                  <th className="pb-2 pr-2 w-28">Confianza</th>
                  <th className="pb-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {formData.productivityBenefits.map((item) => {
                  const monthlySaving = item.hoursPerMonth * item.hourlyRate * item.peopleAffected;
                  return (
                    <tr key={item.id} className="border-t dark:border-[#443f40]">
                      <td className="py-2 pr-2">
                        <input
                          type="text"
                          className="input text-sm py-1.5 px-2"
                          placeholder="Ej: Automatizaci\u00F3n de reportes"
                          value={item.concept}
                          onChange={(e) =>
                            updateProductivityBenefit(item.id, 'concept', e.target.value)
                          }
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          className="input text-sm py-1.5 px-2"
                          min={0}
                          value={item.hoursPerMonth || ''}
                          onChange={(e) =>
                            updateProductivityBenefit(
                              item.id,
                              'hoursPerMonth',
                              Number(e.target.value),
                            )
                          }
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                            {sym}
                          </span>
                          <input
                            type="number"
                            className="input text-sm py-1.5 px-2 pl-8"
                            min={0}
                            value={item.hourlyRate || ''}
                            onChange={(e) =>
                              updateProductivityBenefit(
                                item.id,
                                'hourlyRate',
                                Number(e.target.value),
                              )
                            }
                          />
                        </div>
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          className="input text-sm py-1.5 px-2"
                          min={1}
                          value={item.peopleAffected || ''}
                          onChange={(e) =>
                            updateProductivityBenefit(
                              item.id,
                              'peopleAffected',
                              Number(e.target.value),
                            )
                          }
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                            {sym}
                          </span>
                          <input
                            type="number"
                            className="input text-sm py-1.5 px-2 pl-8 dark:bg-[#3d3839] bg-gray-100"
                            readOnly
                            value={monthlySaving}
                          />
                        </div>
                      </td>
                      <td className="py-2 pr-2">
                        <select
                          className="input text-sm py-1.5 px-2"
                          value={item.confidence}
                          onChange={(e) =>
                            updateProductivityBenefit(item.id, 'confidence', e.target.value)
                          }
                        >
                          {CONFIDENCE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => removeProductivityBenefit(item.id)}
                          className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={addProductivityBenefit}
              className="text-sm text-primary-300 hover:text-primary-400 flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Agregar beneficio
            </button>
            <p className="text-sm font-medium text-gray-300">
              Mensual: {formatROICurrency(productivityMonthly, formData.currency)}
            </p>
          </div>
        </CollapsibleSection>

        {/* D) Beneficios Intangibles */}
        <CollapsibleSection
          title="Beneficios Intangibles"
          icon={<PieChart className="h-5 w-5" />}
          sectionKey="intangibleBenefits"
          open={openSections.intangibleBenefits}
          onToggle={() => toggleSection('intangibleBenefits')}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                  <th className="pb-2 pr-2">Beneficio</th>
                  <th className="pb-2 pr-2 w-28">Impacto</th>
                  <th className="pb-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {formData.intangibleBenefits.map((item) => (
                  <tr key={item.id} className="border-t dark:border-[#443f40]">
                    <td className="py-2 pr-2">
                      <input
                        type="text"
                        className="input text-sm py-1.5 px-2"
                        placeholder="Ej: Mejora en satisfacci\u00F3n del cliente"
                        value={item.benefit}
                        onChange={(e) =>
                          updateIntangibleBenefit(item.id, 'benefit', e.target.value)
                        }
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        className="input text-sm py-1.5 px-2"
                        value={item.impact}
                        onChange={(e) =>
                          updateIntangibleBenefit(item.id, 'impact', e.target.value)
                        }
                      >
                        {IMPACT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => removeIntangibleBenefit(item.id)}
                        className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3">
            <button
              onClick={addIntangibleBenefit}
              className="text-sm text-primary-300 hover:text-primary-400 flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Agregar beneficio
            </button>
          </div>
        </CollapsibleSection>

        {/* Total Beneficios */}
        <div className="rounded-xl border dark:border-[#443f40] dark:bg-[#363233] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-300/10 text-primary-300">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Beneficios (per\u00EDodo completo)</p>
                <p className="text-2xl font-bold text-primary-300">
                  {formatROICurrency(calc.totalBenefitsForPeriod, formData.currency)}
                </p>
              </div>
            </div>
            <div className="text-right text-xs text-gray-500 space-y-1">
              <p>Ahorros: {formatROICurrency(savingsMonthly * formData.analysisPeriod, formData.currency)}</p>
              <p>Ingresos: {formatROICurrency(revenueMonthly * formData.analysisPeriod, formData.currency)}</p>
              <p>Productividad: {formatROICurrency(productivityMonthly * formData.analysisPeriod, formData.currency)}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ================================================================
  // STEP 4: Resultados
  // ================================================================
  function renderStep4() {
    const benefitPcts = [50, 70, 100, 130, 150];
    const costPcts = [80, 100, 120, 150];

    return (
      <div className="space-y-8">
        {/* A) KPIs Principales */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary-300" />
            KPIs Principales
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* ROI % */}
            <div className="rounded-xl border dark:border-[#443f40] dark:bg-[#363233] p-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-gray-400" />
                <p className="text-sm text-gray-400">Retorno sobre la Inversi\u00F3n</p>
              </div>
              <p className={`text-3xl font-bold ${roiColor(calc.roiPercentage)}`}>
                {calc.roiPercentage.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {calc.roiPercentage >= 100
                  ? 'Excelente retorno'
                  : calc.roiPercentage >= 50
                    ? 'Retorno moderado'
                    : calc.roiPercentage >= 0
                      ? 'Retorno bajo'
                      : 'Inversi\u00F3n negativa'}
              </p>
            </div>

            {/* Payback */}
            <div className="rounded-xl border dark:border-[#443f40] dark:bg-[#363233] p-6">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-gray-400" />
                <p className="text-sm text-gray-400">Per\u00EDodo de Recuperaci\u00F3n</p>
              </div>
              <p className={`text-3xl font-bold ${paybackColor(calc.paybackMonths)}`}>
                {formatMonths(calc.paybackMonths)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {!isFinite(calc.paybackMonths)
                  ? 'No se recupera en el per\u00EDodo'
                  : calc.paybackMonths <= 6
                    ? 'Recuperaci\u00F3n r\u00E1pida'
                    : calc.paybackMonths <= 12
                      ? 'Recuperaci\u00F3n en tiempo razonable'
                      : 'Recuperaci\u00F3n lenta'}
              </p>
            </div>

            {/* Net Benefit */}
            <div className="rounded-xl border dark:border-[#443f40] dark:bg-[#363233] p-6">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-gray-400" />
                <p className="text-sm text-gray-400">Beneficio Neto</p>
              </div>
              <p
                className={`text-3xl font-bold ${
                  calc.netBenefit >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {formatROICurrency(calc.netBenefit, formData.currency)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Beneficios totales menos inversi\u00F3n total
              </p>
            </div>

            {/* Cost/Benefit Ratio */}
            <div className="rounded-xl border dark:border-[#443f40] dark:bg-[#363233] p-6">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-5 w-5 text-gray-400" />
                <p className="text-sm text-gray-400">Ratio Costo/Beneficio</p>
              </div>
              <p
                className={`text-3xl font-bold ${
                  calc.costBenefitRatio >= 2
                    ? 'text-green-400'
                    : calc.costBenefitRatio >= 1
                      ? 'text-yellow-400'
                      : 'text-red-400'
                }`}
              >
                {calc.costBenefitRatio.toFixed(2)}x
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Por cada{' '}
                {formatROICurrency(1, formData.currency)} invertido, recupera{' '}
                {formatROICurrency(calc.costBenefitRatio, formData.currency)}
              </p>
            </div>
          </div>
        </div>

        {/* B) Escenarios */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary-300" />
            An\u00E1lisis de Escenarios
          </h2>
          <div className="rounded-xl border dark:border-[#443f40] dark:bg-[#363233] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="dark:bg-[#3d3839] bg-gray-50">
                    <th className="text-left p-4 text-xs text-gray-400 uppercase tracking-wider">
                      M\u00E9trica
                    </th>
                    {scenarios.map((s) => (
                      <th
                        key={s.label}
                        className="text-center p-4 text-xs text-gray-400 uppercase tracking-wider"
                      >
                        {s.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t dark:border-[#443f40]">
                    <td className="p-4 text-gray-300">ROI</td>
                    {scenarios.map((s) => (
                      <td key={s.label} className="p-4 text-center">
                        <span className={`font-semibold ${roiColor(s.calc.roiPercentage)}`}>
                          {s.calc.roiPercentage.toFixed(1)}%
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-t dark:border-[#443f40]">
                    <td className="p-4 text-gray-300">Payback</td>
                    {scenarios.map((s) => (
                      <td key={s.label} className="p-4 text-center">
                        <span className={`font-semibold ${paybackColor(s.calc.paybackMonths)}`}>
                          {formatMonths(s.calc.paybackMonths)}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-t dark:border-[#443f40]">
                    <td className="p-4 text-gray-300">Beneficio Neto</td>
                    {scenarios.map((s) => (
                      <td key={s.label} className="p-4 text-center">
                        <span
                          className={`font-semibold ${
                            s.calc.netBenefit >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {formatROICurrency(s.calc.netBenefit, formData.currency)}
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* C) Gr\u00E1ficos */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary-300" />
            Gr\u00E1ficos
          </h2>

          <div className="space-y-6">
            {/* C1) Flujo Acumulado - Area Chart */}
            <div className="rounded-xl border dark:border-[#443f40] dark:bg-[#363233] p-6">
              <h3 className="text-sm font-medium text-gray-300 mb-4">
                Flujo Acumulado (costos vs beneficios)
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cumulativeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#443f40" />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                      tickFormatter={(v) => `M${v}`}
                    />
                    <YAxis
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                      tickFormatter={(v) =>
                        formatROICurrency(v, formData.currency)
                      }
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend
                      wrapperStyle={{ fontSize: 12, color: '#9CA3AF' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="costs"
                      name="Costos Acumulados"
                      stroke={CHART_COLORS.cost}
                      fill={CHART_COLORS.cost}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="benefits"
                      name="Beneficios Acumulados"
                      stroke={CHART_COLORS.benefit}
                      fill={CHART_COLORS.benefit}
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="net"
                      name="Neto"
                      stroke={CHART_COLORS.net}
                      strokeWidth={2}
                      dot={false}
                    />
                    <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="3 3" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* C2) Inversi\u00F3n vs Retorno por A\u00F1o - Bar Chart */}
            {yearlyData.length > 0 && (
              <div className="rounded-xl border dark:border-[#443f40] dark:bg-[#363233] p-6">
                <h3 className="text-sm font-medium text-gray-300 mb-4">
                  Inversi\u00F3n vs Retorno por A\u00F1o
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yearlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#443f40" />
                      <XAxis
                        dataKey="year"
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        tickFormatter={(v) => `A\u00F1o ${v}`}
                      />
                      <YAxis
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        tickFormatter={(v) =>
                          formatROICurrency(v, formData.currency)
                        }
                      />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Legend
                        wrapperStyle={{ fontSize: 12, color: '#9CA3AF' }}
                      />
                      <Bar dataKey="costs" name="Costos" fill={CHART_COLORS.cost} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="benefits" name="Beneficios" fill={CHART_COLORS.benefit} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* C3) Pie Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Benefit composition */}
              <div className="rounded-xl border dark:border-[#443f40] dark:bg-[#363233] p-6">
                <h3 className="text-sm font-medium text-gray-300 mb-4">
                  Composici\u00F3n de Beneficios
                </h3>
                {benefitPieData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={benefitPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                          labelLine={{ stroke: '#6B7280' }}
                        >
                          {benefitPieData.map((_entry, idx) => (
                            <Cell
                              key={idx}
                              fill={PIE_COLORS[idx % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) =>
                            formatROICurrency(value, formData.currency)
                          }
                          contentStyle={{
                            backgroundColor: '#363233',
                            border: '1px solid #443f40',
                            borderRadius: '8px',
                          }}
                        />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-8">
                    Sin datos de beneficios
                  </p>
                )}
              </div>

              {/* Cost composition */}
              <div className="rounded-xl border dark:border-[#443f40] dark:bg-[#363233] p-6">
                <h3 className="text-sm font-medium text-gray-300 mb-4">
                  Composici\u00F3n de Costos
                </h3>
                {costPieData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={costPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                          labelLine={{ stroke: '#6B7280' }}
                        >
                          {costPieData.map((_entry, idx) => (
                            <Cell
                              key={idx}
                              fill={PIE_COLORS[idx % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) =>
                            formatROICurrency(value, formData.currency)
                          }
                          contentStyle={{
                            backgroundColor: '#363233',
                            border: '1px solid #443f40',
                            borderRadius: '8px',
                          }}
                        />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-8">
                    Sin datos de costos
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* D) An\u00E1lisis de Sensibilidad */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary-300" />
            An\u00E1lisis de Sensibilidad
          </h2>
          <div className="rounded-xl border dark:border-[#443f40] dark:bg-[#363233] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="dark:bg-[#3d3839] bg-gray-50">
                    <th className="p-3 text-left text-xs text-gray-400 uppercase tracking-wider">
                      Beneficios \ Costos
                    </th>
                    {costPcts.map((cp) => (
                      <th
                        key={cp}
                        className="p-3 text-center text-xs text-gray-400 uppercase tracking-wider"
                      >
                        Costos {cp}%
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {benefitPcts.map((bp) => (
                    <tr key={bp} className="border-t dark:border-[#443f40]">
                      <td className="p-3 text-gray-300 font-medium">Beneficios {bp}%</td>
                      {costPcts.map((cp) => {
                        const entry = sensitivityMatrix.find(
                          (e) => e.benefitPct === bp && e.costPct === cp,
                        );
                        const roi = entry?.roi ?? 0;
                        return (
                          <td key={cp} className="p-3 text-center">
                            <span
                              className={`inline-block rounded px-2 py-1 text-xs font-semibold ${sensitivityCellBg(roi)}`}
                            >
                              {roi.toFixed(1)}%
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t dark:border-[#443f40]">
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-green-600/30" /> ROI &gt; 100%
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-green-600/15" /> ROI 50-100%
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-yellow-600/20" /> ROI 0-50%
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-red-600/20" /> ROI &lt; 0%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* E) Notas finales */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary-300" />
            Notas Finales
          </h2>
          <div className="rounded-xl border dark:border-[#443f40] dark:bg-[#363233] p-6 space-y-6">
            <div>
              <label className="label">Conclusi\u00F3n</label>
              <textarea
                className="input min-h-[100px]"
                placeholder="Resume los hallazgos principales y la recomendaci\u00F3n"
                value={formData.conclusionNotes ?? ''}
                onChange={(e) => updateField('conclusionNotes', e.target.value || null)}
              />
            </div>
            <div>
              <label className="label">Supuestos y Disclaimer</label>
              <textarea
                className="input min-h-[100px]"
                placeholder="Lista los supuestos clave y cualquier advertencia sobre las proyecciones"
                value={formData.assumptions ?? ''}
                onChange={(e) => updateField('assumptions', e.target.value || null)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

// ================================================================
// Reusable sub-components
// ================================================================

function CollapsibleSection({
  title,
  icon,
  sectionKey,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  sectionKey: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border dark:border-[#443f40] dark:bg-[#363233] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 dark:hover:bg-[#3d3839] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-primary-300">{icon}</div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function KpiPill({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 min-w-fit">
      <div className={`${color}`}>{icon}</div>
      <div>
        <p className="text-[10px] text-gray-500 uppercase tracking-wider leading-none">{label}</p>
        <p className={`text-sm font-semibold ${color} leading-tight`}>{value}</p>
      </div>
    </div>
  );
}
