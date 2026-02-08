import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type {
  Prospect,
  ProspectorList,
  ProspectorInteraction,
  ScoringCriteria,
  AITemplate,
  ScoreLabel,
  ProspectStatus,
  ProspectSource,
  InteractionType,
  MessageType,
  MessageTone,
  ExtractedProspect,
  ScrapeJob,
} from '../types/prospector';
import { calculateProspectScore, DEFAULT_SCORING_CRITERIA } from '../types/prospector';

// ===== API helper =====

async function apiCall<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || '';
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
  return data as T;
}

// ===== Client-side Claude extraction (avoids Vercel 10s timeout) =====

async function extractProspectsWithClaude(text: string, hint?: string): Promise<ExtractedProspect[]> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY || '';
  if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY not configured');

  const prompt = `Eres un experto en extraccion de datos B2B. Analiza el siguiente texto y extrae TODOS los prospectos/empresas/contactos que encuentres.

${hint ? `CONTEXTO DEL USUARIO: ${hint}\n` : ''}
TEXTO A ANALIZAR:
${text.slice(0, 60000)}

Extrae: companyName (obligatorio), contactName (obligatorio, si no hay usa "N/A"), contactTitle, email, phone, linkedinUrl, website, industry, companySize (1-9, 10-49, 50-99, 100-499, 500-999, 1000+), country, city, notes

Responde UNICAMENTE con un JSON array. Si no encuentras prospectos, responde con [].`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`Claude API error: ${response.status}`);
  const result = await response.json();
  const content = result.content?.[0]?.text || '[]';
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p: any) => p.companyName)
      .map((p: any): ExtractedProspect => ({
        companyName: String(p.companyName || ''),
        contactName: String(p.contactName || 'N/A'),
        contactTitle: p.contactTitle || null,
        email: p.email || null,
        phone: p.phone || null,
        linkedinUrl: p.linkedinUrl || null,
        website: p.website || null,
        industry: p.industry || null,
        companySize: p.companySize || null,
        country: p.country || null,
        city: p.city || null,
        notes: p.notes || null,
      }));
  } catch {
    return [];
  }
}

// ===== Context type =====

interface ProspectorStats {
  totalProspects: number;
  byScore: Record<ScoreLabel, number>;
  byStatus: Record<ProspectStatus, number>;
  pipelineValue: number;
  staleProspects: number;
  recentInteractions: number;
}

interface ProspectorContextType {
  prospects: Prospect[];
  lists: ProspectorList[];
  interactions: ProspectorInteraction[];
  scoringCriteria: ScoringCriteria[];
  templates: AITemplate[];
  scrapeJobs: ScrapeJob[];
  loading: boolean;
  stats: ProspectorStats;

  // Prospects CRUD
  fetchProspects: () => Promise<void>;
  addProspect: (data: Partial<Prospect>) => Promise<Prospect | null>;
  updateProspect: (id: string, data: Partial<Prospect>) => Promise<void>;
  deleteProspect: (id: string) => Promise<void>;
  recalculateScores: () => Promise<void>;

  // Interactions
  fetchInteractions: (prospectId: string) => Promise<ProspectorInteraction[]>;
  addInteraction: (data: { prospectId: string; interactionType: InteractionType; subject?: string; body?: string; outcome?: string; durationMinutes?: number }) => Promise<void>;

  // Scoring criteria
  fetchScoringCriteria: () => Promise<void>;
  addScoringCriteria: (data: Partial<ScoringCriteria>) => Promise<void>;
  deleteScoringCriteria: (id: string) => Promise<void>;
  initDefaultCriteria: () => Promise<void>;

  // Templates
  fetchTemplates: () => Promise<void>;
  addTemplate: (data: Partial<AITemplate>) => Promise<void>;
  updateTemplate: (id: string, data: Partial<AITemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;

  // Import / Export
  importCSV: (rows: Partial<Prospect>[]) => Promise<{ imported: number; errors: string[] }>;
  exportCSV: () => string;

  // AI
  generateMessage: (prospectId: string, messageType: MessageType, tone: MessageTone, additionalContext?: string) => Promise<{ subject: string; body: string } | null>;

  // Scraping
  scrapeUrl: (url: string, extractionHint?: string) => Promise<ExtractedProspect[]>;
  searchWeb: (query: string, industry?: string, country?: string, maxResults?: number) => Promise<ExtractedProspect[]>;
  scrapeLinkedin: (opts: { url?: string; searchQuery?: string; rawText?: string }) => Promise<ExtractedProspect[]>;
  importScrapedProspects: (prospects: ExtractedProspect[], source: ProspectSource, sourceUrl?: string, inputQuery?: string) => Promise<{ imported: number; errors: string[] }>;
  fetchScrapeHistory: () => Promise<void>;
}

const ProspectorContext = createContext<ProspectorContextType | undefined>(undefined);

// ===== Mapping helpers =====

function mapRowToProspect(row: any): Prospect {
  return {
    id: row.id,
    organizationId: row.organization_id,
    listId: row.list_id,
    companyName: row.company_name,
    contactName: row.contact_name,
    contactTitle: row.contact_title,
    email: row.email,
    phone: row.phone,
    linkedinUrl: row.linkedin_url,
    website: row.website,
    industry: row.industry,
    companySize: row.company_size,
    country: row.country,
    city: row.city,
    estimatedValue: parseFloat(row.estimated_value) || 0,
    score: row.score || 0,
    scoreLabel: row.score_label || 'cold',
    status: row.status || 'new',
    tags: row.tags || [],
    notes: row.notes,
    source: row.source || 'manual',
    sourceUrl: row.source_url || null,
    scrapeJobId: row.scrape_job_id || null,
    assignedTo: row.assigned_to,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToInteraction(row: any): ProspectorInteraction {
  return {
    id: row.id,
    organizationId: row.organization_id,
    prospectId: row.prospect_id,
    userId: row.user_id,
    interactionType: row.interaction_type,
    subject: row.subject,
    body: row.body,
    outcome: row.outcome,
    durationMinutes: row.duration_minutes,
    createdAt: row.created_at,
    userName: row.users?.full_name || row.user_name,
  };
}

function mapRowToCriteria(row: any): ScoringCriteria {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    fieldName: row.field_name,
    fieldValue: row.field_value,
    points: row.points,
    weight: parseFloat(row.weight) || 1.0,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function mapRowToTemplate(row: any): AITemplate {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    templateType: row.template_type,
    tone: row.tone,
    subjectTemplate: row.subject_template,
    bodyTemplate: row.body_template,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToScrapeJob(row: any): ScrapeJob {
  return {
    id: row.id,
    organizationId: row.organization_id,
    createdBy: row.created_by,
    jobType: row.job_type,
    inputUrl: row.input_url,
    inputQuery: row.input_query,
    prospectsFound: row.prospects_found,
    prospectsImported: row.prospects_imported,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  };
}

function prospectToRow(data: Partial<Prospect>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (data.companyName !== undefined) row.company_name = data.companyName;
  if (data.contactName !== undefined) row.contact_name = data.contactName;
  if (data.contactTitle !== undefined) row.contact_title = data.contactTitle;
  if (data.email !== undefined) row.email = data.email;
  if (data.phone !== undefined) row.phone = data.phone;
  if (data.linkedinUrl !== undefined) row.linkedin_url = data.linkedinUrl;
  if (data.website !== undefined) row.website = data.website;
  if (data.industry !== undefined) row.industry = data.industry;
  if (data.companySize !== undefined) row.company_size = data.companySize;
  if (data.country !== undefined) row.country = data.country;
  if (data.city !== undefined) row.city = data.city;
  if (data.estimatedValue !== undefined) row.estimated_value = data.estimatedValue;
  if (data.score !== undefined) row.score = data.score;
  if (data.scoreLabel !== undefined) row.score_label = data.scoreLabel;
  if (data.status !== undefined) row.status = data.status;
  if (data.tags !== undefined) row.tags = data.tags;
  if (data.notes !== undefined) row.notes = data.notes;
  if (data.assignedTo !== undefined) row.assigned_to = data.assignedTo;
  if (data.listId !== undefined) row.list_id = data.listId;
  if (data.source !== undefined) row.source = data.source;
  if (data.sourceUrl !== undefined) row.source_url = data.sourceUrl;
  if (data.scrapeJobId !== undefined) row.scrape_job_id = data.scrapeJobId;
  return row;
}

// ===== Provider =====

export function ProspectorProvider({ children }: { children: ReactNode }) {
  const { organization, user } = useAuth();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [lists, setLists] = useState<ProspectorList[]>([]);
  const [interactions, setInteractions] = useState<ProspectorInteraction[]>([]);
  const [scoringCriteria, setScoringCriteria] = useState<ScoringCriteria[]>([]);
  const [templates, setTemplates] = useState<AITemplate[]>([]);
  const [scrapeJobs, setScrapeJobs] = useState<ScrapeJob[]>([]);
  const [loading, setLoading] = useState(false);

  // ---- Fetch prospects ----
  const fetchProspects = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prospector_prospects')
        .select('*')
        .eq('organization_id', organization.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setProspects((data || []).map(mapRowToProspect));
    } catch (e) {
      console.error('Error fetching prospects:', e);
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  // ---- Add prospect ----
  const addProspect = useCallback(async (data: Partial<Prospect>): Promise<Prospect | null> => {
    if (!organization?.id) return null;
    try {
      const row = prospectToRow(data);
      row.organization_id = organization.id;
      row.created_by = user?.id;
      const { data: result, error } = await supabase
        .from('prospector_prospects')
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      const prospect = mapRowToProspect(result);
      setProspects(prev => [prospect, ...prev]);
      return prospect;
    } catch (e) {
      console.error('Error adding prospect:', e);
      return null;
    }
  }, [organization?.id, user?.id]);

  // ---- Update prospect ----
  const updateProspect = useCallback(async (id: string, data: Partial<Prospect>) => {
    try {
      const row = prospectToRow(data);
      const { error } = await supabase
        .from('prospector_prospects')
        .update(row)
        .eq('id', id);
      if (error) throw error;
      setProspects(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    } catch (e) {
      console.error('Error updating prospect:', e);
    }
  }, []);

  // ---- Delete prospect ----
  const deleteProspect = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('prospector_prospects').delete().eq('id', id);
      if (error) throw error;
      setProspects(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      console.error('Error deleting prospect:', e);
    }
  }, []);

  // ---- Recalculate scores ----
  const recalculateScores = useCallback(async () => {
    if (!prospects.length || !scoringCriteria.length) return;

    const { data: interData } = await supabase
      .from('prospector_interactions')
      .select('prospect_id, created_at')
      .in('prospect_id', prospects.map(p => p.id))
      .order('created_at', { ascending: false });

    const lastInteractionMap: Record<string, string> = {};
    for (const row of interData || []) {
      if (!lastInteractionMap[row.prospect_id]) {
        lastInteractionMap[row.prospect_id] = row.created_at;
      }
    }

    const updates: { id: string; score: number; scoreLabel: ScoreLabel }[] = [];
    for (const p of prospects) {
      const result = calculateProspectScore(p, scoringCriteria, lastInteractionMap[p.id] || null);
      if (result.score !== p.score || result.label !== p.scoreLabel) {
        updates.push({ id: p.id, score: result.score, scoreLabel: result.label });
      }
    }

    for (const u of updates) {
      await supabase
        .from('prospector_prospects')
        .update({ score: u.score, score_label: u.scoreLabel })
        .eq('id', u.id);
    }

    if (updates.length > 0) {
      setProspects(prev => prev.map(p => {
        const u = updates.find(x => x.id === p.id);
        return u ? { ...p, score: u.score, scoreLabel: u.scoreLabel } : p;
      }));
    }
  }, [prospects, scoringCriteria]);

  // ---- Interactions ----
  const fetchInteractions = useCallback(async (prospectId: string): Promise<ProspectorInteraction[]> => {
    const { data, error } = await supabase
      .from('prospector_interactions')
      .select('*, users:user_id(full_name)')
      .eq('prospect_id', prospectId)
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return (data || []).map(mapRowToInteraction);
  }, []);

  const addInteraction = useCallback(async (data: {
    prospectId: string;
    interactionType: InteractionType;
    subject?: string;
    body?: string;
    outcome?: string;
    durationMinutes?: number;
  }) => {
    if (!organization?.id) return;
    try {
      const { error } = await supabase.from('prospector_interactions').insert({
        organization_id: organization.id,
        prospect_id: data.prospectId,
        user_id: user?.id,
        interaction_type: data.interactionType,
        subject: data.subject || null,
        body: data.body || null,
        outcome: data.outcome || null,
        duration_minutes: data.durationMinutes || null,
      });
      if (error) throw error;
    } catch (e) {
      console.error('Error adding interaction:', e);
    }
  }, [organization?.id, user?.id]);

  // ---- Scoring Criteria ----
  const fetchScoringCriteria = useCallback(async () => {
    if (!organization?.id) return;
    const { data, error } = await supabase
      .from('prospector_scoring_criteria')
      .select('*')
      .eq('organization_id', organization.id)
      .order('field_name');
    if (error) { console.error(error); return; }
    setScoringCriteria((data || []).map(mapRowToCriteria));
  }, [organization?.id]);

  const addScoringCriteria = useCallback(async (data: Partial<ScoringCriteria>) => {
    if (!organization?.id) return;
    const { error } = await supabase.from('prospector_scoring_criteria').insert({
      organization_id: organization.id,
      name: data.name,
      field_name: data.fieldName,
      field_value: data.fieldValue,
      points: data.points,
      weight: data.weight || 1.0,
      is_active: data.isActive ?? true,
    });
    if (error) console.error(error);
    else await fetchScoringCriteria();
  }, [organization?.id, fetchScoringCriteria]);

  const deleteScoringCriteria = useCallback(async (id: string) => {
    const { error } = await supabase.from('prospector_scoring_criteria').delete().eq('id', id);
    if (error) console.error(error);
    else setScoringCriteria(prev => prev.filter(c => c.id !== id));
  }, []);

  const initDefaultCriteria = useCallback(async () => {
    if (!organization?.id) return;
    for (const c of DEFAULT_SCORING_CRITERIA) {
      await supabase.from('prospector_scoring_criteria').insert({
        organization_id: organization.id,
        name: c.name,
        field_name: c.fieldName,
        field_value: c.fieldValue,
        points: c.points,
        weight: c.weight,
        is_active: c.isActive,
      });
    }
    await fetchScoringCriteria();
  }, [organization?.id, fetchScoringCriteria]);

  // ---- Templates ----
  const fetchTemplates = useCallback(async () => {
    if (!organization?.id) return;
    const { data, error } = await supabase
      .from('prospector_templates')
      .select('*')
      .eq('organization_id', organization.id)
      .order('template_type');
    if (error) { console.error(error); return; }
    setTemplates((data || []).map(mapRowToTemplate));
  }, [organization?.id]);

  const addTemplate = useCallback(async (data: Partial<AITemplate>) => {
    if (!organization?.id) return;
    const { error } = await supabase.from('prospector_templates').insert({
      organization_id: organization.id,
      name: data.name,
      template_type: data.templateType,
      tone: data.tone,
      subject_template: data.subjectTemplate,
      body_template: data.bodyTemplate,
      created_by: user?.id,
    });
    if (error) console.error(error);
    else await fetchTemplates();
  }, [organization?.id, user?.id, fetchTemplates]);

  const updateTemplate = useCallback(async (id: string, data: Partial<AITemplate>) => {
    const row: Record<string, unknown> = {};
    if (data.name !== undefined) row.name = data.name;
    if (data.templateType !== undefined) row.template_type = data.templateType;
    if (data.tone !== undefined) row.tone = data.tone;
    if (data.subjectTemplate !== undefined) row.subject_template = data.subjectTemplate;
    if (data.bodyTemplate !== undefined) row.body_template = data.bodyTemplate;
    const { error } = await supabase.from('prospector_templates').update(row).eq('id', id);
    if (error) console.error(error);
    else await fetchTemplates();
  }, [fetchTemplates]);

  const deleteTemplate = useCallback(async (id: string) => {
    const { error } = await supabase.from('prospector_templates').delete().eq('id', id);
    if (error) console.error(error);
    else setTemplates(prev => prev.filter(t => t.id !== id));
  }, []);

  // ---- CSV Import ----
  const importCSV = useCallback(async (rows: Partial<Prospect>[]): Promise<{ imported: number; errors: string[] }> => {
    if (!organization?.id) return { imported: 0, errors: ['No organization'] };
    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.companyName || !r.contactName) {
        errors.push(`Fila ${i + 2}: company_name y contact_name son requeridos`);
        continue;
      }
      const row = prospectToRow(r);
      row.organization_id = organization.id;
      row.created_by = user?.id;
      const { error } = await supabase.from('prospector_prospects').insert(row);
      if (error) errors.push(`Fila ${i + 2}: ${error.message}`);
      else imported++;
    }

    if (imported > 0) await fetchProspects();
    return { imported, errors };
  }, [organization?.id, user?.id, fetchProspects]);

  // ---- CSV Export ----
  const exportCSV = useCallback((): string => {
    const headers = ['company_name', 'contact_name', 'contact_title', 'email', 'phone', 'linkedin_url', 'website', 'industry', 'company_size', 'country', 'city', 'estimated_value', 'score', 'score_label', 'status', 'source', 'notes'];
    const lines = [headers.join(',')];
    for (const p of prospects) {
      const vals = [
        p.companyName, p.contactName, p.contactTitle || '', p.email || '', p.phone || '',
        p.linkedinUrl || '', p.website || '', p.industry || '', p.companySize || '',
        p.country || '', p.city || '', String(p.estimatedValue), String(p.score),
        p.scoreLabel, p.status, p.source, (p.notes || '').replace(/[\n,]/g, ' '),
      ].map(v => `"${v.replace(/"/g, '""')}"`);
      lines.push(vals.join(','));
    }
    return lines.join('\n');
  }, [prospects]);

  // ---- AI Message Generation (server-side) ----
  const generateMessage = useCallback(async (
    prospectId: string,
    messageType: MessageType,
    tone: MessageTone,
    additionalContext?: string,
  ): Promise<{ subject: string; body: string } | null> => {
    const prospect = prospects.find(p => p.id === prospectId);
    if (!prospect) return null;

    const inters = await fetchInteractions(prospectId);
    const interHistory = inters.length > 0
      ? inters.slice(0, 5).map(i => `- ${i.interactionType} (${new Date(i.createdAt).toLocaleDateString()}): ${i.subject || ''} ${i.outcome || ''}`).join('\n')
      : 'Sin interacciones previas';

    try {
      const result = await apiCall<{ subject: string; body: string }>('/api/prospector/generate-message', {
        prospect: {
          contactName: prospect.contactName,
          contactTitle: prospect.contactTitle,
          companyName: prospect.companyName,
          industry: prospect.industry,
          companySize: prospect.companySize,
          city: prospect.city,
          country: prospect.country,
          scoreLabel: prospect.scoreLabel,
        },
        messageType,
        tone,
        additionalContext,
        interactionHistory: interHistory,
      });
      return result;
    } catch (e) {
      console.error('Error generating message:', e);
      return null;
    }
  }, [prospects, fetchInteractions]);

  // ---- Scraping: URL (server fetches HTML, client calls Claude) ----
  const scrapeUrl = useCallback(async (url: string, extractionHint?: string): Promise<ExtractedProspect[]> => {
    // Step 1: Server-side fetch + strip HTML (fast, within 10s limit)
    const result = await apiCall<{ text: string }>('/api/prospector/scrape-url', { url });
    // Step 2: Client-side Claude extraction (no timeout limit)
    return extractProspectsWithClaude(result.text, extractionHint);
  }, []);

  // ---- Scraping: Web Search ----
  const searchWeb = useCallback(async (
    query: string,
    industry?: string,
    country?: string,
    maxResults?: number,
  ): Promise<ExtractedProspect[]> => {
    const result = await apiCall<{ prospects: ExtractedProspect[] }>('/api/prospector/search-web', {
      query,
      industry,
      country,
      maxResults,
    });
    return result.prospects;
  }, []);

  // ---- Scraping: LinkedIn ----
  const scrapeLinkedin = useCallback(async (opts: {
    url?: string;
    searchQuery?: string;
    rawText?: string;
  }): Promise<ExtractedProspect[]> => {
    // Raw text mode: extract directly client-side (no server needed)
    if (opts.rawText) {
      return extractProspectsWithClaude(opts.rawText, 'This is raw text copied from LinkedIn profile(s). Extract all contact/company data.');
    }
    // URL/search modes: use server API
    const result = await apiCall<{ prospects: ExtractedProspect[] }>('/api/prospector/scrape-linkedin', opts);
    return result.prospects;
  }, []);

  // ---- Import scraped prospects ----
  const importScrapedProspects = useCallback(async (
    scrapedProspects: ExtractedProspect[],
    source: ProspectSource,
    sourceUrl?: string,
    inputQuery?: string,
  ): Promise<{ imported: number; errors: string[] }> => {
    if (!organization?.id) return { imported: 0, errors: ['No organization'] };

    // Create scrape job record
    const { data: jobData } = await supabase.from('prospector_scrape_jobs').insert({
      organization_id: organization.id,
      created_by: user?.id,
      job_type: source,
      input_url: sourceUrl || null,
      input_query: inputQuery || null,
      prospects_found: scrapedProspects.length,
      prospects_imported: 0,
      status: 'completed',
    }).select().single();

    const jobId = jobData?.id || null;
    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < scrapedProspects.length; i++) {
      const p = scrapedProspects[i];
      if (!p.companyName) {
        errors.push(`Prospecto ${i + 1}: company_name es requerido`);
        continue;
      }
      const { error } = await supabase.from('prospector_prospects').insert({
        organization_id: organization.id,
        created_by: user?.id,
        company_name: p.companyName,
        contact_name: p.contactName || 'N/A',
        contact_title: p.contactTitle,
        email: p.email,
        phone: p.phone,
        linkedin_url: p.linkedinUrl,
        website: p.website,
        industry: p.industry,
        company_size: p.companySize,
        country: p.country,
        city: p.city,
        notes: p.notes,
        source,
        source_url: sourceUrl || null,
        scrape_job_id: jobId,
      });
      if (error) errors.push(`Prospecto ${i + 1}: ${error.message}`);
      else imported++;
    }

    // Update job with imported count
    if (jobId) {
      await supabase.from('prospector_scrape_jobs')
        .update({ prospects_imported: imported })
        .eq('id', jobId);
    }

    if (imported > 0) await fetchProspects();
    await fetchScrapeHistory();

    return { imported, errors };
  }, [organization?.id, user?.id, fetchProspects]);

  // ---- Scrape History ----
  const fetchScrapeHistory = useCallback(async () => {
    if (!organization?.id) return;
    const { data, error } = await supabase
      .from('prospector_scrape_jobs')
      .select('*')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) { console.error(error); return; }
    setScrapeJobs((data || []).map(mapRowToScrapeJob));
  }, [organization?.id]);

  // ---- Stats ----
  const stats = useMemo<ProspectorStats>(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

    const byScore: Record<ScoreLabel, number> = { cold: 0, warm: 0, hot: 0, ready_to_close: 0 };
    const byStatus: Record<ProspectStatus, number> = { new: 0, contacted: 0, interested: 0, negotiation: 0, won: 0, lost: 0 };
    let pipelineValue = 0;
    let staleCount = 0;

    for (const p of prospects) {
      byScore[p.scoreLabel] = (byScore[p.scoreLabel] || 0) + 1;
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
      if (p.status !== 'won' && p.status !== 'lost') pipelineValue += p.estimatedValue;
      if (new Date(p.updatedAt) < thirtyDaysAgo && p.status !== 'won' && p.status !== 'lost') staleCount++;
    }

    return {
      totalProspects: prospects.length,
      byScore,
      byStatus,
      pipelineValue,
      staleProspects: staleCount,
      recentInteractions: 0,
    };
  }, [prospects]);

  // ---- Initial load ----
  useEffect(() => {
    if (organization?.id) {
      fetchProspects();
      fetchScoringCriteria();
      fetchTemplates();
      fetchScrapeHistory();
    }
  }, [organization?.id, fetchProspects, fetchScoringCriteria, fetchTemplates, fetchScrapeHistory]);

  const value = useMemo<ProspectorContextType>(() => ({
    prospects, lists, interactions, scoringCriteria, templates, scrapeJobs, loading, stats,
    fetchProspects, addProspect, updateProspect, deleteProspect, recalculateScores,
    fetchInteractions, addInteraction,
    fetchScoringCriteria, addScoringCriteria, deleteScoringCriteria, initDefaultCriteria,
    fetchTemplates, addTemplate, updateTemplate, deleteTemplate,
    importCSV, exportCSV, generateMessage,
    scrapeUrl, searchWeb, scrapeLinkedin, importScrapedProspects, fetchScrapeHistory,
  }), [
    prospects, lists, interactions, scoringCriteria, templates, scrapeJobs, loading, stats,
    fetchProspects, addProspect, updateProspect, deleteProspect, recalculateScores,
    fetchInteractions, addInteraction,
    fetchScoringCriteria, addScoringCriteria, deleteScoringCriteria, initDefaultCriteria,
    fetchTemplates, addTemplate, updateTemplate, deleteTemplate,
    importCSV, exportCSV, generateMessage,
    scrapeUrl, searchWeb, scrapeLinkedin, importScrapedProspects, fetchScrapeHistory,
  ]);

  return <ProspectorContext.Provider value={value}>{children}</ProspectorContext.Provider>;
}

export function useProspector() {
  const context = useContext(ProspectorContext);
  if (!context) throw new Error('useProspector must be used within ProspectorProvider');
  return context;
}
