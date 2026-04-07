import { todayLocalISO } from '../utils/helpers';

// ===== TOOL CATALOG =====

export type ToolCategory = 'ventas' | 'estrategia' | 'finanzas' | 'productividad' | 'marketing' | 'diagnostico';

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: string;
  path: string;
  available: boolean;
}

export const TOOL_CATEGORIES: { value: ToolCategory; label: string; icon: string }[] = [
  { value: 'ventas', label: 'Ventas', icon: 'TrendingUp' },
  { value: 'estrategia', label: 'Estrategia', icon: 'Compass' },
  { value: 'finanzas', label: 'Finanzas', icon: 'DollarSign' },
  { value: 'productividad', label: 'Productividad', icon: 'Zap' },
  { value: 'marketing', label: 'Marketing', icon: 'Megaphone' },
  { value: 'diagnostico', label: 'Diagn\u00F3stico', icon: 'Search' },
];

export const TOOLS_CATALOG: ToolDefinition[] = [
  {
    id: 'b2b-prospector',
    name: 'Prospector B2B',
    description: 'Prospecci\u00F3n masiva con scoring configurable, seguimiento de interacciones y generaci\u00F3n de mensajes con IA.',
    category: 'ventas',
    icon: 'Target',
    path: '/tools/prospector',
    available: true,
  },
  {
    id: 'roi-calculator',
    name: 'Calculadora de ROI',
    description: 'Calcula el retorno de inversi\u00F3n para justificar el precio de tu servicio o producto.',
    category: 'ventas',
    icon: 'Calculator',
    path: '/tools/roi',
    available: true,
  },
  {
    id: 'pricing-calculator',
    name: 'Calculadora de Precios',
    description: 'Define precios \u00F3ptimos basados en costos, margen y competencia.',
    category: 'ventas',
    icon: 'Tag',
    path: '/tools/pricing',
    available: false,
  },
  {
    id: 'swot-analysis',
    name: 'An\u00E1lisis FODA',
    description: 'Analiza fortalezas, oportunidades, debilidades y amenazas.',
    category: 'estrategia',
    icon: 'Grid3x3',
    path: '/tools/swot',
    available: false,
  },
  {
    id: 'break-even',
    name: 'Punto de Equilibrio',
    description: 'Calcula cu\u00E1nto necesitas vender para cubrir costos.',
    category: 'finanzas',
    icon: 'Scale',
    path: '/tools/break-even',
    available: false,
  },
  {
    id: 'time-tracker',
    name: 'Calculadora de Horas',
    description: 'Estima horas y costos de proyectos.',
    category: 'productividad',
    icon: 'Clock',
    path: '/tools/time',
    available: false,
  },
  {
    id: 'cac-ltv',
    name: 'CAC / LTV',
    description: 'Calcula costo de adquisici\u00F3n y valor de vida del cliente.',
    category: 'marketing',
    icon: 'UserPlus',
    path: '/tools/cac-ltv',
    available: false,
  },
];

// ===== ROI CALCULATOR TYPES =====

export type Currency = 'ARS' | 'USD' | 'EUR';
export type Confidence = 'high' | 'medium' | 'low';
export type Impact = 'high' | 'medium' | 'low';
export type ROIStatus = 'draft' | 'completed' | 'archived';

export const CURRENCY_OPTIONS: { value: Currency; label: string; symbol: string }[] = [
  { value: 'ARS', label: 'Peso Argentino', symbol: '$' },
  { value: 'USD', label: 'D\u00F3lar', symbol: 'US$' },
  { value: 'EUR', label: 'Euro', symbol: '\u20AC' },
];

export const PERIOD_OPTIONS = [
  { value: 6, label: '6 meses' },
  { value: 12, label: '1 a\u00F1o' },
  { value: 24, label: '2 a\u00F1os' },
  { value: 36, label: '3 a\u00F1os' },
  { value: 60, label: '5 a\u00F1os' },
];

export const CONFIDENCE_OPTIONS: { value: Confidence; label: string; factor: number }[] = [
  { value: 'high', label: 'Alta', factor: 1.0 },
  { value: 'medium', label: 'Media', factor: 0.7 },
  { value: 'low', label: 'Baja', factor: 0.4 },
];

export const IMPACT_OPTIONS: { value: Impact; label: string }[] = [
  { value: 'high', label: 'Alto' },
  { value: 'medium', label: 'Medio' },
  { value: 'low', label: 'Bajo' },
];

// Item types
export interface ROIInitialCost {
  id: string;
  concept: string;
  amount: number;
}

export interface ROIRecurringCost {
  id: string;
  concept: string;
  monthlyAmount: number;
}

export interface ROIHiddenCost {
  id: string;
  concept: string;
  hours: number;
  hourlyRate: number;
}

export interface ROIDirectSaving {
  id: string;
  concept: string;
  monthlyAmount: number;
  confidence: Confidence;
}

export interface ROIAdditionalRevenue {
  id: string;
  concept: string;
  monthlyAmount: number;
  confidence: Confidence;
}

export interface ROIProductivityBenefit {
  id: string;
  concept: string;
  hoursPerMonth: number;
  hourlyRate: number;
  peopleAffected: number;
  confidence: Confidence;
}

export interface ROIIntangibleBenefit {
  id: string;
  benefit: string;
  impact: Impact;
}

// Main analysis type
export interface ROIAnalysis {
  id: string;
  organizationId: string;
  name: string;
  clientId: string | null;
  clientName: string | null;
  projectId: string | null;
  solutionDescription: string | null;
  analysisPeriod: number;
  currency: Currency;
  analysisDate: string;
  responsible: string | null;

  initialCosts: ROIInitialCost[];
  recurringCosts: ROIRecurringCost[];
  hiddenCosts: ROIHiddenCost[];
  directSavings: ROIDirectSaving[];
  additionalRevenue: ROIAdditionalRevenue[];
  productivityBenefits: ROIProductivityBenefit[];
  intangibleBenefits: ROIIntangibleBenefit[];

  contextNotes: string | null;
  conclusionNotes: string | null;
  assumptions: string | null;

  status: ROIStatus;
  createdAt: string;
  updatedAt: string;
}

// Calculation results
export interface ROICalculation {
  totalInitialCosts: number;
  totalRecurringMonthly: number;
  totalRecurringForPeriod: number;
  totalHiddenCosts: number;
  totalInvestment: number;

  totalSavingsMonthly: number;
  totalRevenueMonthly: number;
  totalProductivityMonthly: number;
  totalBenefitsMonthly: number;
  totalBenefitsForPeriod: number;

  netBenefit: number;
  roiPercentage: number;
  paybackMonths: number;
  costBenefitRatio: number;
}

export interface ROIScenario {
  label: string;
  benefitFactor: number;
  costFactor: number;
  calc: ROICalculation;
}

// ===== CALCULATION FUNCTIONS =====

export function calculateROI(analysis: ROIAnalysis, benefitFactor = 1, costFactor = 1): ROICalculation {
  const period = analysis.analysisPeriod;

  // Costs
  const totalInitialCosts = analysis.initialCosts.reduce((s, c) => s + c.amount, 0) * costFactor;
  const totalRecurringMonthly = analysis.recurringCosts.reduce((s, c) => s + c.monthlyAmount, 0) * costFactor;
  const totalRecurringForPeriod = totalRecurringMonthly * period;
  const totalHiddenCosts = analysis.hiddenCosts.reduce((s, c) => s + c.hours * c.hourlyRate, 0) * costFactor;
  const totalInvestment = totalInitialCosts + totalRecurringForPeriod + totalHiddenCosts;

  // Benefits
  const totalSavingsMonthly = analysis.directSavings.reduce((s, b) => s + b.monthlyAmount, 0) * benefitFactor;
  const totalRevenueMonthly = analysis.additionalRevenue.reduce((s, b) => s + b.monthlyAmount, 0) * benefitFactor;
  const totalProductivityMonthly = analysis.productivityBenefits.reduce(
    (s, b) => s + b.hoursPerMonth * b.hourlyRate * b.peopleAffected,
    0
  ) * benefitFactor;
  const totalBenefitsMonthly = totalSavingsMonthly + totalRevenueMonthly + totalProductivityMonthly;
  const totalBenefitsForPeriod = totalBenefitsMonthly * period;

  // KPIs
  const netBenefit = totalBenefitsForPeriod - totalInvestment;
  const roiPercentage = totalInvestment > 0 ? ((totalBenefitsForPeriod - totalInvestment) / totalInvestment) * 100 : 0;
  const paybackMonths = totalBenefitsMonthly > 0
    ? (totalInitialCosts + totalHiddenCosts) / totalBenefitsMonthly + (totalRecurringMonthly > 0 ? totalRecurringMonthly / (totalBenefitsMonthly - totalRecurringMonthly) : 0)
    : Infinity;
  const costBenefitRatio = totalInvestment > 0 ? totalBenefitsForPeriod / totalInvestment : 0;

  // More accurate payback: find month where cumulative benefit > cumulative cost
  let cumulativeCost = totalInitialCosts + totalHiddenCosts;
  let cumulativeBenefit = 0;
  let actualPayback = Infinity;
  for (let m = 1; m <= period; m++) {
    cumulativeCost += totalRecurringMonthly;
    cumulativeBenefit += totalBenefitsMonthly;
    if (cumulativeBenefit >= cumulativeCost && actualPayback === Infinity) {
      actualPayback = m;
    }
  }

  return {
    totalInitialCosts,
    totalRecurringMonthly,
    totalRecurringForPeriod,
    totalHiddenCosts,
    totalInvestment,
    totalSavingsMonthly,
    totalRevenueMonthly,
    totalProductivityMonthly,
    totalBenefitsMonthly,
    totalBenefitsForPeriod,
    netBenefit,
    roiPercentage,
    paybackMonths: actualPayback,
    costBenefitRatio,
  };
}

export function getScenarios(analysis: ROIAnalysis): ROIScenario[] {
  return [
    { label: 'Conservador', benefitFactor: 0.7, costFactor: 1.3, calc: calculateROI(analysis, 0.7, 1.3) },
    { label: 'Esperado', benefitFactor: 1.0, costFactor: 1.0, calc: calculateROI(analysis, 1.0, 1.0) },
    { label: 'Optimista', benefitFactor: 1.3, costFactor: 1.0, calc: calculateROI(analysis, 1.3, 1.0) },
  ];
}

export function getSensitivityMatrix(analysis: ROIAnalysis): { benefitPct: number; costPct: number; roi: number }[] {
  const benefitPcts = [50, 70, 100, 130, 150];
  const costPcts = [80, 100, 120, 150];
  const results: { benefitPct: number; costPct: number; roi: number }[] = [];

  for (const bp of benefitPcts) {
    for (const cp of costPcts) {
      const calc = calculateROI(analysis, bp / 100, cp / 100);
      results.push({ benefitPct: bp, costPct: cp, roi: calc.roiPercentage });
    }
  }
  return results;
}

export function getCumulativeData(analysis: ROIAnalysis): { month: number; costs: number; benefits: number; net: number }[] {
  const calc = calculateROI(analysis);
  const data: { month: number; costs: number; benefits: number; net: number }[] = [];
  let cumCost = calc.totalInitialCosts + calc.totalHiddenCosts;
  let cumBenefit = 0;

  data.push({ month: 0, costs: cumCost, benefits: 0, net: -cumCost });

  for (let m = 1; m <= analysis.analysisPeriod; m++) {
    cumCost += calc.totalRecurringMonthly;
    cumBenefit += calc.totalBenefitsMonthly;
    data.push({ month: m, costs: cumCost, benefits: cumBenefit, net: cumBenefit - cumCost });
  }
  return data;
}

export function getYearlyData(analysis: ROIAnalysis): { year: number; costs: number; benefits: number; net: number }[] {
  const calc = calculateROI(analysis);
  const years = Math.ceil(analysis.analysisPeriod / 12);
  const data: { year: number; costs: number; benefits: number; net: number }[] = [];
  let cumNet = 0;

  for (let y = 1; y <= years; y++) {
    const yearCosts = (y === 1 ? calc.totalInitialCosts + calc.totalHiddenCosts : 0) + calc.totalRecurringMonthly * 12;
    const yearBenefits = calc.totalBenefitsMonthly * 12;
    cumNet += yearBenefits - yearCosts;
    data.push({ year: y, costs: yearCosts, benefits: yearBenefits, net: cumNet });
  }
  return data;
}

// Formatting helpers
export function formatROICurrency(amount: number, currency: Currency): string {
  const symbol = CURRENCY_OPTIONS.find(c => c.value === currency)?.symbol ?? '$';
  const formatted = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.abs(amount));
  return `${amount < 0 ? '-' : ''}${symbol}${formatted}`;
}

export function formatMonths(months: number): string {
  if (!isFinite(months) || months <= 0) return 'N/A';
  if (months < 1) return `${Math.round(months * 30)} d\u00EDas`;
  const y = Math.floor(months / 12);
  const m = Math.round(months % 12);
  if (y > 0 && m > 0) return `${y}a ${m}m`;
  if (y > 0) return `${y} a\u00F1o${y > 1 ? 's' : ''}`;
  return `${m} mes${m > 1 ? 'es' : ''}`;
}

// UUID generator
export function genId(): string {
  return crypto.randomUUID();
}

// Empty analysis factory
export function createEmptyAnalysis(): Omit<ROIAnalysis, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'> {
  return {
    name: '',
    clientId: null,
    clientName: null,
    projectId: null,
    solutionDescription: null,
    analysisPeriod: 12,
    currency: 'ARS',
    analysisDate: todayLocalISO(),
    responsible: null,
    initialCosts: [],
    recurringCosts: [],
    hiddenCosts: [],
    directSavings: [],
    additionalRevenue: [],
    productivityBenefits: [],
    intangibleBenefits: [],
    contextNotes: null,
    conclusionNotes: null,
    assumptions: null,
    status: 'draft',
  };
}
