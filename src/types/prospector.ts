// ===== B2B Prospector Types =====

export type ProspectStatus = 'new' | 'contacted' | 'interested' | 'negotiation' | 'won' | 'lost';
export type ScoreLabel = 'cold' | 'warm' | 'hot' | 'ready_to_close';
export type InteractionType = 'email' | 'call' | 'meeting' | 'note' | 'linkedin_message';
export type MessageTone = 'formal' | 'casual' | 'consultive';
export type MessageType = 'first_contact' | 'follow_up' | 'proposal' | 'closing';
export type ProspectSource = 'manual' | 'url_scrape' | 'web_search' | 'linkedin';

export interface ExtractedProspect {
  companyName: string;
  contactName: string;
  contactTitle: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  website: string | null;
  industry: string | null;
  companySize: string | null;
  country: string | null;
  city: string | null;
  notes: string | null;
}

export interface ScrapeJob {
  id: string;
  organizationId: string;
  createdBy: string | null;
  jobType: ProspectSource;
  inputUrl: string | null;
  inputQuery: string | null;
  prospectsFound: number;
  prospectsImported: number;
  status: 'completed' | 'failed';
  errorMessage: string | null;
  createdAt: string;
}

export interface Prospect {
  id: string;
  organizationId: string;
  listId: string | null;
  companyName: string;
  contactName: string;
  contactTitle: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  website: string | null;
  industry: string | null;
  companySize: string | null;
  country: string | null;
  city: string | null;
  estimatedValue: number;
  score: number;
  scoreLabel: ScoreLabel;
  status: ProspectStatus;
  tags: string[];
  notes: string | null;
  source: ProspectSource;
  sourceUrl: string | null;
  scrapeJobId: string | null;
  assignedTo: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProspectorList {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  status: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProspectorInteraction {
  id: string;
  organizationId: string;
  prospectId: string;
  userId: string | null;
  interactionType: InteractionType;
  subject: string | null;
  body: string | null;
  outcome: string | null;
  durationMinutes: number | null;
  createdAt: string;
  // Joined fields
  userName?: string;
}

export interface ScoringCriteria {
  id: string;
  organizationId: string;
  name: string;
  fieldName: string;
  fieldValue: string | null;
  points: number;
  weight: number;
  isActive: boolean;
  createdAt: string;
}

export interface AITemplate {
  id: string;
  organizationId: string;
  name: string;
  templateType: MessageType;
  tone: MessageTone;
  subjectTemplate: string | null;
  bodyTemplate: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ===== Config maps =====

export const PROSPECT_STATUS_CONFIG: Record<ProspectStatus, { label: string; color: string; bgClass: string }> = {
  new: { label: 'Nuevo', color: 'text-gray-400', bgClass: 'bg-gray-500/20 text-gray-300' },
  contacted: { label: 'Contactado', color: 'text-blue-400', bgClass: 'bg-blue-500/20 text-blue-300' },
  interested: { label: 'Interesado', color: 'text-yellow-400', bgClass: 'bg-yellow-500/20 text-yellow-300' },
  negotiation: { label: 'Negociación', color: 'text-purple-400', bgClass: 'bg-purple-500/20 text-purple-300' },
  won: { label: 'Ganado', color: 'text-green-400', bgClass: 'bg-green-500/20 text-green-300' },
  lost: { label: 'Perdido', color: 'text-red-400', bgClass: 'bg-red-500/20 text-red-300' },
};

export const SCORE_LABEL_CONFIG: Record<ScoreLabel, { label: string; color: string; bgClass: string }> = {
  cold: { label: 'Frío', color: 'text-blue-400', bgClass: 'bg-blue-500/20 text-blue-300' },
  warm: { label: 'Tibio', color: 'text-yellow-400', bgClass: 'bg-yellow-500/20 text-yellow-300' },
  hot: { label: 'Caliente', color: 'text-orange-400', bgClass: 'bg-orange-500/20 text-orange-300' },
  ready_to_close: { label: 'Listo para cerrar', color: 'text-green-400', bgClass: 'bg-green-500/20 text-green-300' },
};

export const INTERACTION_TYPE_CONFIG: Record<InteractionType, { label: string; icon: string; color: string }> = {
  email: { label: 'Email', icon: 'Mail', color: 'text-blue-400' },
  call: { label: 'Llamada', icon: 'Phone', color: 'text-green-400' },
  meeting: { label: 'Reunión', icon: 'Calendar', color: 'text-purple-400' },
  note: { label: 'Nota', icon: 'FileText', color: 'text-gray-400' },
  linkedin_message: { label: 'LinkedIn', icon: 'Linkedin', color: 'text-sky-400' },
};

export const MESSAGE_TYPE_CONFIG: Record<MessageType, { label: string }> = {
  first_contact: { label: 'Primer contacto' },
  follow_up: { label: 'Seguimiento' },
  proposal: { label: 'Propuesta' },
  closing: { label: 'Cierre' },
};

export const MESSAGE_TONE_CONFIG: Record<MessageTone, { label: string }> = {
  formal: { label: 'Formal' },
  casual: { label: 'Casual' },
  consultive: { label: 'Consultivo' },
};

export const PROSPECT_SOURCE_CONFIG: Record<ProspectSource, { label: string; bgClass: string }> = {
  manual: { label: 'Manual', bgClass: 'bg-gray-500/20 text-gray-300' },
  url_scrape: { label: 'URL Scrape', bgClass: 'bg-cyan-500/20 text-cyan-300' },
  web_search: { label: 'Web Search', bgClass: 'bg-indigo-500/20 text-indigo-300' },
  linkedin: { label: 'LinkedIn', bgClass: 'bg-sky-500/20 text-sky-300' },
};

export const COMPANY_SIZE_OPTIONS = ['1-9', '10-49', '50-99', '100-499', '500-999', '1000+'];

export const DEFAULT_SCORING_CRITERIA: Omit<ScoringCriteria, 'id' | 'organizationId' | 'createdAt'>[] = [
  { name: 'Empresa grande (1000+)', fieldName: 'company_size', fieldValue: '1000+', points: 20, weight: 1.0, isActive: true },
  { name: 'Empresa mediana (100-499)', fieldName: 'company_size', fieldValue: '100-499', points: 15, weight: 1.0, isActive: true },
  { name: 'Industria Tech', fieldName: 'industry', fieldValue: 'Technology', points: 15, weight: 1.0, isActive: true },
  { name: 'Industria Finanzas', fieldName: 'industry', fieldValue: 'Finance', points: 15, weight: 1.0, isActive: true },
  { name: 'Cargo C-Level', fieldName: 'contact_title', fieldValue: 'C-Level', points: 20, weight: 1.0, isActive: true },
  { name: 'Cargo Director', fieldName: 'contact_title', fieldValue: 'Director', points: 12, weight: 1.0, isActive: true },
  { name: 'Tiene email', fieldName: 'email', fieldValue: 'present', points: 5, weight: 1.0, isActive: true },
  { name: 'Tiene LinkedIn', fieldName: 'linkedin_url', fieldValue: 'present', points: 5, weight: 1.0, isActive: true },
  { name: 'Interacción reciente (7d)', fieldName: 'last_interaction', fieldValue: '7_days', points: 15, weight: 1.0, isActive: true },
  { name: 'Sin contacto (30d+)', fieldName: 'last_interaction', fieldValue: '30_days_stale', points: -10, weight: 1.0, isActive: true },
];

// ===== Score calculation (client-side) =====

export function calculateProspectScore(
  prospect: Prospect,
  criteria: ScoringCriteria[],
  lastInteractionDate: string | null,
): { score: number; label: ScoreLabel; matches: { name: string; points: number }[] } {
  const matches: { name: string; points: number }[] = [];
  let total = 0;
  const now = new Date();
  const lastDate = lastInteractionDate ? new Date(lastInteractionDate) : null;
  const daysSinceContact = lastDate ? Math.floor((now.getTime() - lastDate.getTime()) / 86400000) : null;

  for (const c of criteria) {
    if (!c.isActive) continue;
    let matched = false;

    switch (c.fieldName) {
      case 'company_size':
        matched = prospect.companySize === c.fieldValue;
        break;
      case 'industry':
        matched = (prospect.industry || '').toLowerCase() === (c.fieldValue || '').toLowerCase();
        break;
      case 'contact_title': {
        const title = (prospect.contactTitle || '').toLowerCase();
        if (c.fieldValue === 'C-Level') matched = /^(ceo|cto|cfo|coo|chief)/.test(title);
        else if (c.fieldValue === 'VP') matched = title.includes('vice president') || title.startsWith('vp');
        else if (c.fieldValue === 'Director') matched = title.includes('director');
        else if (c.fieldValue === 'Manager') matched = title.includes('manager');
        else matched = title.includes((c.fieldValue || '').toLowerCase());
        break;
      }
      case 'email':
        if (c.fieldValue === 'present') matched = !!prospect.email;
        break;
      case 'phone':
        if (c.fieldValue === 'present') matched = !!prospect.phone;
        break;
      case 'linkedin_url':
        if (c.fieldValue === 'present') matched = !!prospect.linkedinUrl;
        break;
      case 'last_interaction':
        if (c.fieldValue === '7_days') matched = daysSinceContact !== null && daysSinceContact <= 7;
        else if (c.fieldValue === '30_days_stale') matched = daysSinceContact === null || daysSinceContact > 30;
        break;
    }

    if (matched) {
      const pts = Math.round(c.points * c.weight);
      total += pts;
      matches.push({ name: c.name, points: pts });
    }
  }

  const score = Math.max(0, Math.min(100, total));
  let label: ScoreLabel = 'cold';
  if (score >= 76) label = 'ready_to_close';
  else if (score >= 51) label = 'hot';
  else if (score >= 26) label = 'warm';

  return { score, label, matches };
}
