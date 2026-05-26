import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { supabase, onTabResumed } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useFinance } from './FinanceContext';
import { useProjects } from './ProjectContext';
import type {
  Lead, Deal, Activity, DealHistory, DealNote,
  LeadStatus, DealStage, CRMStats, PipelineStage,
} from '../types/crm';
import {
  DEAL_STAGE_CONFIG, DEAL_PIPELINE_STAGES,
  DEFAULT_PIPELINE_STAGES, STAGE_COLOR_OPTIONS, TERMINAL_STAGES,
} from '../types/crm';
import { todayLocalISO } from '../utils/helpers';

interface CRMContextType {
  // State
  leads: Lead[];
  deals: Deal[];
  activities: Activity[];
  loading: boolean;
  error: string | null;

  // Leads CRUD
  fetchLeads: () => Promise<void>;
  addLead: (data: Omit<Lead, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'score'>) => Promise<Lead | null>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<boolean>;
  deleteLead: (id: string) => Promise<void>;
  convertLeadToDeal: (leadId: string, dealData: Partial<Deal>) => Promise<Deal | null>;

  // Deals CRUD
  fetchDeals: () => Promise<void>;
  addDeal: (data: Omit<Deal, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => Promise<Deal | null>;
  updateDeal: (id: string, updates: Partial<Deal>) => Promise<boolean>;
  updateDealStage: (id: string, newStage: DealStage, notes?: string) => Promise<void>;
  deleteDeal: (id: string) => Promise<void>;
  markDealWon: (id: string, options: { createClient: boolean; createProject: boolean; wonNotes?: string }) => Promise<{ clientId?: string; projectId?: string } | null>;
  markDealLost: (id: string, lostReason: string) => Promise<void>;
  fetchDealHistory: (dealId: string) => Promise<DealHistory[]>;

  // Activities CRUD
  fetchActivities: (options?: { leadId?: string; dealId?: string; pendingOnly?: boolean }) => Promise<void>;
  addActivity: (data: Omit<Activity, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => Promise<Activity | null>;
  updateActivity: (id: string, updates: Partial<Activity>) => Promise<void>;
  completeActivity: (id: string) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;

  // Pipeline Stages
  pipelineStages: PipelineStage[];
  getStageConfig: (stageName: string) => { label: string; color: string; bgClass: string; probability: number; headerBg: string };
  addStage: (data: Omit<PipelineStage, 'id'>) => Promise<void>;
  updateStage: (id: string, updates: Partial<PipelineStage>) => Promise<void>;
  deleteStage: (id: string) => Promise<boolean>;
  reorderStages: (orderedIds: string[]) => Promise<void>;
  fetchPipelineStages: () => Promise<void>;

  // Deal Notes
  dealNotes: DealNote[];
  fetchDealNotes: (dealId: string) => Promise<void>;
  addDealNote: (dealId: string, content: string) => Promise<DealNote | null>;
  deleteDealNote: (noteId: string) => Promise<void>;

  // Stats & Helpers
  getStats: () => CRMStats;
  getPipelineByStage: () => { stage: DealStage; count: number; value: number }[];
  getUpcomingReminders: () => Activity[];
  getOverdueActivities: () => Activity[];
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export function CRMProvider({ children }: { children: ReactNode }) {
  const { organization, appUser } = useAuth();
  const { addClient } = useFinance();
  const { addProject } = useProjects();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [dealNotes, setDealNotes] = useState<DealNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>(DEFAULT_PIPELINE_STAGES);

  // ===== PIPELINE STAGES =====

  const fetchPipelineStages = useCallback(async () => {
    if (!organization?.id) return;
    try {
      const { data, error: err } = await supabase
        .from('crm_pipeline_stages')
        .select('*')
        .eq('organization_id', organization.id)
        .order('position', { ascending: true });

      if (err) throw err;

      if (data && data.length > 0) {
        setPipelineStages(data.map((s: any) => ({
          id: s.id,
          name: s.name,
          label: s.label,
          color: s.color,
          probability: s.probability,
          position: s.position,
        })));
      } else {
        setPipelineStages(DEFAULT_PIPELINE_STAGES);
      }
    } catch (err) {
      console.error('Error fetching pipeline stages:', err);
      setPipelineStages(DEFAULT_PIPELINE_STAGES);
    }
  }, [organization?.id]);

  const getStageConfig = useCallback((stageName: string) => {
    // Check terminal stages first
    if (stageName === 'ganado') {
      const cfg = DEAL_STAGE_CONFIG['ganado'];
      return { label: cfg.label, color: cfg.color, bgClass: cfg.bgClass, probability: cfg.probability, headerBg: cfg.headerBg };
    }
    if (stageName === 'perdido') {
      const cfg = DEAL_STAGE_CONFIG['perdido'];
      return { label: cfg.label, color: cfg.color, bgClass: cfg.bgClass, probability: cfg.probability, headerBg: cfg.headerBg };
    }
    // Check custom stages
    const custom = pipelineStages.find(s => s.name === stageName);
    if (custom) {
      const colorCfg = STAGE_COLOR_OPTIONS[custom.color] || STAGE_COLOR_OPTIONS.gray;
      return {
        label: custom.label,
        color: custom.color,
        bgClass: colorCfg.bgClass,
        probability: custom.probability,
        headerBg: colorCfg.headerBg,
      };
    }
    // Fallback to hardcoded config
    const fallback = DEAL_STAGE_CONFIG[stageName];
    if (fallback) return { label: fallback.label, color: fallback.color, bgClass: fallback.bgClass, probability: fallback.probability, headerBg: fallback.headerBg };
    // Ultimate fallback
    return { label: stageName, color: 'gray', bgClass: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', probability: 50, headerBg: 'bg-gray-100 dark:bg-gray-700' };
  }, [pipelineStages]);

  const addStage = useCallback(async (data: Omit<PipelineStage, 'id'>) => {
    if (!organization?.id) return;
    try {
      const { data: row, error: err } = await supabase
        .from('crm_pipeline_stages')
        .insert({
          organization_id: organization.id,
          name: data.name,
          label: data.label,
          color: data.color,
          probability: data.probability,
          position: data.position,
        })
        .select()
        .single();

      if (err) throw err;

      // If this is the first custom stage, save all defaults first
      if (pipelineStages.length > 0 && !pipelineStages[0].id) {
        // Stages are still defaults (no id), save them all
        const existing = pipelineStages.map(s => ({
          organization_id: organization.id,
          name: s.name,
          label: s.label,
          color: s.color,
          probability: s.probability,
          position: s.position,
        }));
        await supabase.from('crm_pipeline_stages').upsert(existing, { onConflict: 'organization_id,name' });
      }

      await fetchPipelineStages();
    } catch (err) {
      console.error('Error adding stage:', err);
      setError('Error al crear etapa');
    }
  }, [organization?.id, pipelineStages, fetchPipelineStages]);

  const updateStage = useCallback(async (id: string, updates: Partial<PipelineStage>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.label !== undefined) dbUpdates.label = updates.label;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      if (updates.probability !== undefined) dbUpdates.probability = updates.probability;
      if (updates.position !== undefined) dbUpdates.position = updates.position;

      if (Object.keys(dbUpdates).length === 0) return;

      const { error: err } = await supabase
        .from('crm_pipeline_stages')
        .update(dbUpdates)
        .eq('id', id);

      if (err) throw err;

      setPipelineStages(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    } catch (err) {
      console.error('Error updating stage:', err);
      setError('Error al actualizar etapa');
    }
  }, []);

  const deleteStage = useCallback(async (id: string): Promise<boolean> => {
    try {
      const stage = pipelineStages.find(s => s.id === id);
      if (!stage) return false;

      // Check if any deals use this stage
      const dealsInStage = deals.filter(d => d.stage === stage.name);
      if (dealsInStage.length > 0) {
        setError(`No se puede eliminar: hay ${dealsInStage.length} deal(s) en esta etapa`);
        return false;
      }

      const { error: err } = await supabase
        .from('crm_pipeline_stages')
        .delete()
        .eq('id', id);

      if (err) throw err;

      setPipelineStages(prev => prev.filter(s => s.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting stage:', err);
      setError('Error al eliminar etapa');
      return false;
    }
  }, [pipelineStages, deals]);

  const reorderStages = useCallback(async (orderedIds: string[]) => {
    try {
      const updates = orderedIds.map((id, index) => ({ id, position: index }));
      // Optimistic update
      setPipelineStages(prev => {
        const map = new Map(prev.map(s => [s.id, s]));
        return orderedIds.map((id, index) => {
          const stage = map.get(id);
          return stage ? { ...stage, position: index } : null;
        }).filter(Boolean) as PipelineStage[];
      });

      // Persist
      for (const u of updates) {
        await supabase
          .from('crm_pipeline_stages')
          .update({ position: u.position })
          .eq('id', u.id);
      }
    } catch (err) {
      console.error('Error reordering stages:', err);
      setError('Error al reordenar etapas');
      await fetchPipelineStages(); // Revert on error
    }
  }, [fetchPipelineStages]);

  // ===== LEADS =====

  const fetchLeads = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('crm_leads')
        .select('*, owner:users!crm_leads_owner_id_fkey(full_name)')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (err) throw err;

      setLeads((data || []).map((l: any) => ({
        id: l.id,
        organizationId: l.organization_id,
        contactName: l.contact_name,
        company: l.company,
        email: l.email,
        phone: l.phone,
        position: l.position,
        source: l.source,
        status: l.status,
        score: l.score || 0,
        budgetRange: l.budget_range,
        timeline: l.timeline,
        needs: l.needs,
        notes: l.notes,
        ownerId: l.owner_id,
        ownerName: l.owner?.full_name,
        convertedAt: l.converted_at,
        convertedToDealId: l.converted_to_deal_id,
        lastContactAt: l.last_contact_at,
        nextContactAt: l.next_contact_at,
        createdAt: l.created_at,
        updatedAt: l.updated_at,
      })));
    } catch (err) {
      console.error('Error fetching leads:', err);
      setError('Error al cargar leads');
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  const addLead = useCallback(async (data: Omit<Lead, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'score'>): Promise<Lead | null> => {
    if (!organization?.id) return null;
    try {
      const { data: row, error: err } = await supabase
        .from('crm_leads')
        .insert({
          organization_id: organization.id,
          contact_name: data.contactName,
          company: data.company,
          email: data.email,
          phone: data.phone,
          position: data.position,
          source: data.source || 'manual',
          status: data.status || 'nuevo',
          budget_range: data.budgetRange,
          timeline: data.timeline,
          needs: data.needs,
          notes: data.notes,
          owner_id: data.ownerId || appUser?.id,
          next_contact_at: data.nextContactAt,
        })
        .select()
        .single();

      if (err) throw err;
      if (!row) throw new Error('No se pudo crear el lead');

      const newLead: Lead = {
        id: row.id,
        organizationId: row.organization_id,
        contactName: row.contact_name,
        company: row.company,
        email: row.email,
        phone: row.phone,
        position: row.position,
        source: row.source,
        status: row.status,
        score: row.score || 0,
        budgetRange: row.budget_range,
        timeline: row.timeline,
        needs: row.needs,
        notes: row.notes,
        ownerId: row.owner_id,
        ownerName: appUser?.fullName,
        convertedAt: row.converted_at,
        convertedToDealId: row.converted_to_deal_id,
        lastContactAt: row.last_contact_at,
        nextContactAt: row.next_contact_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      setLeads(prev => [newLead, ...prev]);
      return newLead;
    } catch (err) {
      console.error('Error adding lead:', err);
      setError('Error al crear lead');
      return null;
    }
  }, [organization?.id, appUser?.id, appUser?.fullName]);

  const updateLead = useCallback(async (id: string, updates: Partial<Lead>): Promise<boolean> => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.contactName !== undefined) dbUpdates.contact_name = updates.contactName;
      if (updates.company !== undefined) dbUpdates.company = updates.company;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.position !== undefined) dbUpdates.position = updates.position;
      if (updates.source !== undefined) dbUpdates.source = updates.source;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.score !== undefined) dbUpdates.score = updates.score;
      if (updates.budgetRange !== undefined) dbUpdates.budget_range = updates.budgetRange;
      if (updates.timeline !== undefined) dbUpdates.timeline = updates.timeline;
      if (updates.needs !== undefined) dbUpdates.needs = updates.needs;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.ownerId !== undefined) dbUpdates.owner_id = updates.ownerId;
      if (updates.nextContactAt !== undefined) dbUpdates.next_contact_at = updates.nextContactAt;
      if (updates.lastContactAt !== undefined) dbUpdates.last_contact_at = updates.lastContactAt;

      if (Object.keys(dbUpdates).length === 0) return true;

      const { error: err } = await supabase
        .from('crm_leads')
        .update(dbUpdates)
        .eq('id', id);

      if (err) throw err;

      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
      return true;
    } catch (err) {
      console.error('Error updating lead:', err);
      setError('Error al actualizar lead');
      return false;
    }
  }, []);

  const deleteLead = useCallback(async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('crm_leads')
        .delete()
        .eq('id', id);

      if (err) throw err;

      setLeads(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      console.error('Error deleting lead:', err);
      setError('Error al eliminar lead');
    }
  }, []);

  const convertLeadToDeal = useCallback(async (leadId: string, dealData: Partial<Deal>): Promise<Deal | null> => {
    if (!organization?.id) return null;
    try {
      const lead = leads.find(l => l.id === leadId);
      if (!lead) throw new Error('Lead not found');

      // Create deal
      const newDeal = await addDeal({
        leadId,
        clientId: null,
        name: dealData.name || `Oportunidad - ${lead.company || lead.contactName}`,
        description: dealData.description || lead.needs,
        stage: 'prospecto',
        probability: getStageConfig('prospecto').probability,
        amount: dealData.amount || 0,
        currency: 'ARS',
        monthlyFee: dealData.monthlyFee || null,
        product: dealData.product || null,
        expectedCloseDate: dealData.expectedCloseDate || null,
        actualCloseDate: null,
        ownerId: lead.ownerId,
        lostReason: null,
        wonNotes: null,
        createdClientId: null,
        createdProjectId: null,
        lastActivityAt: null,
      });

      if (newDeal) {
        // Update lead as converted
        await supabase
          .from('crm_leads')
          .update({
            converted_at: new Date().toISOString(),
            converted_to_deal_id: newDeal.id,
            status: 'calificado',
          })
          .eq('id', leadId);

        setLeads(prev => prev.map(l =>
          l.id === leadId
            ? { ...l, convertedAt: new Date().toISOString(), convertedToDealId: newDeal.id, status: 'calificado' as LeadStatus }
            : l
        ));
      }

      return newDeal;
    } catch (err) {
      console.error('Error converting lead:', err);
      setError('Error al convertir lead');
      return null;
    }
  }, [organization?.id, leads]);

  // ===== DEALS =====

  const fetchDeals = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('crm_deals')
        .select('*, owner:users!crm_deals_owner_id_fkey(full_name), client:clients!crm_deals_client_id_fkey(name)')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (err) throw err;

      setDeals((data || []).map((d: any) => ({
        id: d.id,
        organizationId: d.organization_id,
        leadId: d.lead_id,
        clientId: d.client_id,
        clientName: d.client?.name,
        name: d.name,
        description: d.description,
        stage: d.stage,
        probability: d.probability,
        amount: parseFloat(d.amount) || 0,
        currency: d.currency,
        monthlyFee: d.monthly_fee ? parseFloat(d.monthly_fee) : null,
        product: d.product,
        expectedCloseDate: d.expected_close_date,
        actualCloseDate: d.actual_close_date,
        ownerId: d.owner_id,
        ownerName: d.owner?.full_name,
        lostReason: d.lost_reason,
        wonNotes: d.won_notes,
        createdClientId: d.created_client_id,
        createdProjectId: d.created_project_id,
        lastActivityAt: d.last_activity_at,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      })));
    } catch (err) {
      console.error('Error fetching deals:', err);
      setError('Error al cargar deals');
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  const addDeal = useCallback(async (data: Omit<Deal, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>): Promise<Deal | null> => {
    if (!organization?.id) {
      throw new Error('No hay organización activa. Recargá la página e intentá de nuevo.');
    }
    try {
      const stage = data.stage || 'prospecto';
      const probability = data.probability ?? getStageConfig(stage).probability;
      const { data: row, error: err } = await supabase
        .from('crm_deals')
        .insert({
          organization_id: organization.id,
          lead_id: data.leadId,
          client_id: data.clientId,
          name: data.name,
          description: data.description,
          stage,
          probability,
          amount: data.amount || 0,
          currency: data.currency || 'ARS',
          monthly_fee: data.monthlyFee,
          product: data.product,
          expected_close_date: data.expectedCloseDate,
          owner_id: data.ownerId || appUser?.id,
        })
        .select()
        .single();

      if (err) throw err;
      if (!row) throw new Error('No se pudo crear la oportunidad');

      // Log initial stage (fire-and-forget, don't block deal creation)
      supabase.from('crm_deal_history').insert({
        deal_id: row.id,
        from_stage: null,
        to_stage: data.stage || 'prospecto',
        changed_by: appUser?.id,
      }).then(({ error }) => { if (error) console.error('Error logging deal history:', error.message); });

      const newDeal: Deal = {
        id: row.id,
        organizationId: row.organization_id,
        leadId: row.lead_id,
        clientId: row.client_id,
        name: row.name,
        description: row.description,
        stage: row.stage,
        probability: row.probability,
        amount: parseFloat(row.amount) || 0,
        currency: row.currency,
        monthlyFee: row.monthly_fee ? parseFloat(row.monthly_fee) : null,
        product: row.product,
        expectedCloseDate: row.expected_close_date,
        actualCloseDate: row.actual_close_date,
        ownerId: row.owner_id,
        ownerName: appUser?.fullName,
        lostReason: row.lost_reason,
        wonNotes: row.won_notes,
        createdClientId: row.created_client_id,
        createdProjectId: row.created_project_id,
        lastActivityAt: row.last_activity_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      setDeals(prev => [newDeal, ...prev]);
      return newDeal;
    } catch (err) {
      console.error('Error adding deal:', err);
      setError('Error al crear deal');
      throw err;
    }
  }, [organization?.id, appUser?.id, appUser?.fullName, getStageConfig]);

  const updateDeal = useCallback(async (id: string, updates: Partial<Deal>): Promise<boolean> => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.stage !== undefined) dbUpdates.stage = updates.stage;
      if (updates.probability !== undefined) dbUpdates.probability = updates.probability;
      if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
      if (updates.monthlyFee !== undefined) dbUpdates.monthly_fee = updates.monthlyFee;
      if (updates.product !== undefined) dbUpdates.product = updates.product;
      if (updates.expectedCloseDate !== undefined) dbUpdates.expected_close_date = updates.expectedCloseDate;
      if (updates.ownerId !== undefined) dbUpdates.owner_id = updates.ownerId;
      if (updates.clientId !== undefined) dbUpdates.client_id = updates.clientId;
      if (updates.leadId !== undefined) dbUpdates.lead_id = updates.leadId;

      if (Object.keys(dbUpdates).length === 0) return true;

      const { error: err } = await supabase
        .from('crm_deals')
        .update(dbUpdates)
        .eq('id', id);

      if (err) throw err;

      setDeals(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
      return true;
    } catch (err) {
      console.error('Error updating deal:', err);
      setError('Error al actualizar deal');
      return false;
    }
  }, []);

  const updateDealStage = useCallback(async (id: string, newStage: DealStage, notes?: string) => {
    try {
      const deal = deals.find(d => d.id === id);
      if (!deal) return;

      const stageCfg = getStageConfig(newStage);
      const isTerminal = newStage === 'ganado' || newStage === 'perdido';
      const today = new Date().toISOString().split('T')[0];
      const dbUpdates: Record<string, unknown> = {
        stage: newStage,
        probability: stageCfg.probability,
      };
      if (isTerminal && !deal.actualCloseDate) {
        dbUpdates.actual_close_date = today;
      }

      const { error: err } = await supabase
        .from('crm_deals')
        .update(dbUpdates)
        .eq('id', id);

      if (err) throw err;

      // Log stage change (fire-and-forget)
      supabase.from('crm_deal_history').insert({
        deal_id: id,
        from_stage: deal.stage,
        to_stage: newStage,
        changed_by: appUser?.id,
        notes,
      }).then(({ error }) => { if (error) console.error('Error logging deal history:', error.message); });

      setDeals(prev => prev.map(d =>
        d.id === id
          ? {
              ...d,
              stage: newStage,
              probability: stageCfg.probability,
              actualCloseDate: isTerminal && !d.actualCloseDate ? today : d.actualCloseDate,
            }
          : d
      ));
    } catch (err) {
      console.error('Error updating deal stage:', err);
      setError('Error al actualizar etapa');
    }
  }, [deals, appUser?.id, getStageConfig]);

  const deleteDeal = useCallback(async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('crm_deals')
        .delete()
        .eq('id', id);

      if (err) throw err;

      setDeals(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error('Error deleting deal:', err);
      setError('Error al eliminar deal');
    }
  }, []);

  const markDealWon = useCallback(async (
    id: string,
    options: { createClient: boolean; createProject: boolean; wonNotes?: string }
  ): Promise<{ clientId?: string; projectId?: string } | null> => {
    try {
      const deal = deals.find(d => d.id === id);
      if (!deal) return null;

      let createdClientId: string | undefined;
      let createdProjectId: string | undefined;

      // Get lead info for client creation
      const lead = deal.leadId ? leads.find(l => l.id === deal.leadId) : null;

      // Create client if requested
      if (options.createClient) {
        const client = await addClient({
          name: lead?.company || lead?.contactName || deal.name,
          company: lead?.company || null,
          email: lead?.email || null,
          phone: lead?.phone || null,
          address: null,
          cuit: null,
          industry: null,
          employeeCount: null,
          website: null,
          contactName: lead?.contactName || null,
          contactRole: lead?.position || null,
          notes: `Creado desde deal: ${deal.name}`,
        });
        createdClientId = client?.id;
      }

      // Create project if requested
      if (options.createProject && addProject) {
        const project = await addProject({
          clientId: createdClientId || deal.clientId || null,
          name: deal.name,
          description: deal.description,
          status: 'proposal',
          ownerId: deal.ownerId || appUser?.id || '',
          product: deal.product,
          monthlyFee: deal.monthlyFee,
          budget: deal.amount,
          estimatedCost: null,
          startDate: todayLocalISO(),
          estimatedEndDate: null,
          actualEndDate: null,
          notes: 'Proyecto creado desde deal ganado',
        });
        createdProjectId = project?.id;
      }

      // Update deal
      const { error: err } = await supabase
        .from('crm_deals')
        .update({
          stage: 'ganado',
          probability: 100,
          actual_close_date: todayLocalISO(),
          won_notes: options.wonNotes,
          created_client_id: createdClientId,
          created_project_id: createdProjectId,
        })
        .eq('id', id);

      if (err) throw err;

      // Log stage change (fire-and-forget)
      supabase.from('crm_deal_history').insert({
        deal_id: id,
        from_stage: deal.stage,
        to_stage: 'ganado',
        changed_by: appUser?.id,
        notes: options.wonNotes,
      }).then(({ error }) => { if (error) console.error('Error logging deal history:', error.message); });

      setDeals(prev => prev.map(d =>
        d.id === id
          ? {
            ...d,
            stage: 'ganado' as DealStage,
            probability: 100,
            actualCloseDate: todayLocalISO(),
            wonNotes: options.wonNotes || null,
            createdClientId: createdClientId || null,
            createdProjectId: createdProjectId || null,
          }
          : d
      ));

      return { clientId: createdClientId, projectId: createdProjectId };
    } catch (err) {
      console.error('Error marking deal as won:', err);
      setError('Error al marcar deal como ganado');
      return null;
    }
  }, [deals, leads, addClient, addProject, appUser?.id]);

  const markDealLost = useCallback(async (id: string, lostReason: string) => {
    try {
      const deal = deals.find(d => d.id === id);
      if (!deal) return;

      const { error: err } = await supabase
        .from('crm_deals')
        .update({
          stage: 'perdido',
          probability: 0,
          actual_close_date: todayLocalISO(),
          lost_reason: lostReason,
        })
        .eq('id', id);

      if (err) throw err;

      // Log stage change (fire-and-forget)
      supabase.from('crm_deal_history').insert({
        deal_id: id,
        from_stage: deal.stage,
        to_stage: 'perdido',
        changed_by: appUser?.id,
        notes: lostReason,
      }).then(({ error }) => { if (error) console.error('Error logging deal history:', error.message); });

      setDeals(prev => prev.map(d =>
        d.id === id
          ? {
            ...d,
            stage: 'perdido' as DealStage,
            probability: 0,
            actualCloseDate: todayLocalISO(),
            lostReason,
          }
          : d
      ));
    } catch (err) {
      console.error('Error marking deal as lost:', err);
      setError('Error al marcar deal como perdido');
    }
  }, [deals, appUser?.id]);

  const fetchDealHistory = useCallback(async (dealId: string): Promise<DealHistory[]> => {
    try {
      const { data, error: err } = await supabase
        .from('crm_deal_history')
        .select('*, changed_by_user:users!crm_deal_history_changed_by_fkey(full_name)')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false });

      if (err) throw err;

      return (data || []).map((h: any) => ({
        id: h.id,
        dealId: h.deal_id,
        fromStage: h.from_stage,
        toStage: h.to_stage,
        changedBy: h.changed_by,
        changedByName: h.changed_by_user?.full_name,
        notes: h.notes,
        createdAt: h.created_at,
      }));
    } catch (err) {
      console.error('Error fetching deal history:', err);
      return [];
    }
  }, []);

  // ===== DEAL NOTES =====

  const fetchDealNotes = useCallback(async (dealId: string) => {
    try {
      const { data, error: err } = await supabase
        .from('crm_deal_notes')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false });

      if (err) throw err;

      setDealNotes((data || []).map((n: any) => ({
        id: n.id,
        organizationId: n.organization_id,
        dealId: n.deal_id,
        content: n.content,
        createdBy: n.created_by,
        createdByName: n.created_by_name,
        createdAt: n.created_at,
      })));
    } catch (err) {
      console.error('Error fetching deal notes:', err);
    }
  }, []);

  const addDealNote = useCallback(async (dealId: string, content: string): Promise<DealNote | null> => {
    if (!organization?.id) return null;
    try {
      const { data, error: err } = await supabase
        .from('crm_deal_notes')
        .insert({
          organization_id: organization.id,
          deal_id: dealId,
          content,
          created_by: appUser?.id || null,
          created_by_name: appUser?.fullName || null,
        })
        .select()
        .single();

      if (err) throw err;

      const note: DealNote = {
        id: data.id,
        organizationId: data.organization_id,
        dealId: data.deal_id,
        content: data.content,
        createdBy: data.created_by,
        createdByName: data.created_by_name,
        createdAt: data.created_at,
      };

      setDealNotes(prev => [note, ...prev]);
      return note;
    } catch (err) {
      console.error('Error adding deal note:', err);
      setError('Error al agregar nota');
      return null;
    }
  }, [organization?.id, appUser?.id, appUser?.fullName]);

  const deleteDealNote = useCallback(async (noteId: string) => {
    try {
      const { error: err } = await supabase
        .from('crm_deal_notes')
        .delete()
        .eq('id', noteId);

      if (err) throw err;

      setDealNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) {
      console.error('Error deleting deal note:', err);
      setError('Error al eliminar nota');
    }
  }, []);

  // ===== ACTIVITIES =====

  const fetchActivities = useCallback(async (options?: { leadId?: string; dealId?: string; pendingOnly?: boolean }) => {
    if (!organization?.id) return;
    setError(null);
    try {
      let query = supabase
        .from('crm_activities')
        .select('*, owner:users!crm_activities_owner_id_fkey(full_name)')
        .eq('organization_id', organization.id);

      if (options?.leadId) query = query.eq('lead_id', options.leadId);
      if (options?.dealId) query = query.eq('deal_id', options.dealId);
      if (options?.pendingOnly) query = query.eq('is_completed', false);

      const { data, error: err } = await query.order('due_date', { ascending: true, nullsFirst: false });

      if (err) throw err;

      setActivities((data || []).map((a: any) => ({
        id: a.id,
        organizationId: a.organization_id,
        leadId: a.lead_id,
        dealId: a.deal_id,
        activityType: a.activity_type,
        subject: a.subject,
        description: a.description,
        isCompleted: a.is_completed,
        completedAt: a.completed_at,
        completedBy: a.completed_by,
        dueDate: a.due_date,
        durationMinutes: a.duration_minutes,
        reminderAt: a.reminder_at,
        reminderSent: a.reminder_sent,
        ownerId: a.owner_id,
        ownerName: a.owner?.full_name,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
      })));
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Error al cargar actividades');
    }
  }, [organization?.id]);

  const addActivity = useCallback(async (data: Omit<Activity, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>): Promise<Activity | null> => {
    if (!organization?.id) return null;
    try {
      const { data: row, error: err } = await supabase
        .from('crm_activities')
        .insert({
          organization_id: organization.id,
          lead_id: data.leadId,
          deal_id: data.dealId,
          activity_type: data.activityType,
          subject: data.subject,
          description: data.description,
          is_completed: data.isCompleted || false,
          due_date: data.dueDate,
          duration_minutes: data.durationMinutes,
          reminder_at: data.reminderAt,
          owner_id: data.ownerId || appUser?.id,
        })
        .select()
        .single();

      if (err) throw err;
      if (!row) throw new Error('No se pudo crear la actividad');

      // Update last contact on lead/deal
      if (data.leadId) {
        const { error: leadErr } = await supabase.from('crm_leads').update({ last_contact_at: new Date().toISOString() }).eq('id', data.leadId);
        if (leadErr) console.error('Error updating lead last_contact_at:', leadErr.message);
      }
      if (data.dealId) {
        const { error: dealErr } = await supabase.from('crm_deals').update({ last_activity_at: new Date().toISOString() }).eq('id', data.dealId);
        if (dealErr) console.error('Error updating deal last_activity_at:', dealErr.message);
      }

      const newActivity: Activity = {
        id: row.id,
        organizationId: row.organization_id,
        leadId: row.lead_id,
        dealId: row.deal_id,
        activityType: row.activity_type,
        subject: row.subject,
        description: row.description,
        isCompleted: row.is_completed,
        completedAt: row.completed_at,
        completedBy: row.completed_by,
        dueDate: row.due_date,
        durationMinutes: row.duration_minutes,
        reminderAt: row.reminder_at,
        reminderSent: row.reminder_sent,
        ownerId: row.owner_id,
        ownerName: appUser?.fullName,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      setActivities(prev => [newActivity, ...prev].sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }));
      return newActivity;
    } catch (err) {
      console.error('Error adding activity:', err);
      setError('Error al crear actividad');
      return null;
    }
  }, [organization?.id, appUser?.id, appUser?.fullName]);

  const updateActivity = useCallback(async (id: string, updates: Partial<Activity>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.subject !== undefined) dbUpdates.subject = updates.subject;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.activityType !== undefined) dbUpdates.activity_type = updates.activityType;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
      if (updates.reminderAt !== undefined) dbUpdates.reminder_at = updates.reminderAt;
      if (updates.isCompleted !== undefined) dbUpdates.is_completed = updates.isCompleted;

      if (Object.keys(dbUpdates).length === 0) return;

      const { error: err } = await supabase
        .from('crm_activities')
        .update(dbUpdates)
        .eq('id', id);

      if (err) throw err;

      setActivities(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    } catch (err) {
      console.error('Error updating activity:', err);
      setError('Error al actualizar actividad');
    }
  }, []);

  const completeActivity = useCallback(async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('crm_activities')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          completed_by: appUser?.id,
        })
        .eq('id', id);

      if (err) throw err;

      setActivities(prev => prev.map(a =>
        a.id === id
          ? { ...a, isCompleted: true, completedAt: new Date().toISOString(), completedBy: appUser?.id || null }
          : a
      ));
    } catch (err) {
      console.error('Error completing activity:', err);
      setError('Error al completar actividad');
    }
  }, [appUser?.id]);

  const deleteActivity = useCallback(async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('crm_activities')
        .delete()
        .eq('id', id);

      if (err) throw err;

      setActivities(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Error deleting activity:', err);
      setError('Error al eliminar actividad');
    }
  }, []);

  // ===== STATS & HELPERS =====

  const getUpcomingReminders = useCallback(() => {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return activities.filter(a =>
      !a.isCompleted &&
      a.dueDate &&
      new Date(a.dueDate) >= now &&
      new Date(a.dueDate) <= in24Hours
    );
  }, [activities]);

  const getOverdueActivities = useCallback(() => {
    const now = new Date().toISOString();
    return activities.filter(a =>
      !a.isCompleted &&
      a.dueDate &&
      a.dueDate < now
    );
  }, [activities]);

  const getStats = useCallback((): CRMStats => {
    const activeDeals = deals.filter(d => !(TERMINAL_STAGES as readonly string[]).includes(d.stage));
    const wonDeals = deals.filter(d => d.stage === 'ganado');
    const lostDeals = deals.filter(d => d.stage === 'perdido');
    const closedDeals = [...wonDeals, ...lostDeals];

    const pipelineValue = activeDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
    const weightedPipelineValue = activeDeals.reduce((sum, d) => sum + (d.amount || 0) * (d.probability / 100), 0);
    const wonValue = wonDeals.reduce((sum, d) => sum + (d.amount || 0), 0);

    const pendingActivities = activities.filter(a => !a.isCompleted);
    const overdueActivities = getOverdueActivities();

    return {
      totalLeads: leads.length,
      newLeads: leads.filter(l => l.status === 'nuevo').length,
      qualifiedLeads: leads.filter(l => l.status === 'calificado').length,
      conversionRate: leads.length > 0
        ? Math.round((leads.filter(l => l.convertedToDealId).length / leads.length) * 100)
        : 0,
      totalDeals: deals.length,
      pipelineValue,
      weightedPipelineValue,
      wonDeals: wonDeals.length,
      wonValue,
      lostDeals: lostDeals.length,
      avgDealSize: wonDeals.length > 0 ? wonValue / wonDeals.length : 0,
      winRate: closedDeals.length > 0
        ? Math.round((wonDeals.length / closedDeals.length) * 100)
        : 0,
      pendingActivities: pendingActivities.length,
      overdueActivities: overdueActivities.length,
    };
  }, [leads, deals, activities, getOverdueActivities]);

  const getPipelineByStage = useCallback(() => {
    const stageNames = pipelineStages.map(s => s.name);
    return stageNames.map(stage => ({
      stage,
      count: deals.filter(d => d.stage === stage).length,
      value: deals.filter(d => d.stage === stage).reduce((sum, d) => sum + (d.amount || 0), 0),
    }));
  }, [deals, pipelineStages]);

  // ===== INITIAL LOAD =====

  useEffect(() => {
    if (organization?.id) {
      fetchPipelineStages();
      fetchLeads();
      fetchDeals();
      fetchActivities();
    }
  }, [organization?.id, fetchPipelineStages, fetchLeads, fetchDeals, fetchActivities, fetchDealNotes]);

  // ===== REALTIME =====
  // Coalesce bursts of postgres changes per table into one debounced refetch
  // so a multi-row mutation doesn't trigger N parallel fetches.
  useEffect(() => {
    if (!organization?.id) return;
    const orgFilter = `organization_id=eq.${organization.id}`;
    const timers: Record<string, ReturnType<typeof setTimeout> | null> = {
      stages: null, leads: null, deals: null, activities: null, dealNotes: null,
    };
    const debounce = (key: keyof typeof timers, fn: () => void) => {
      if (timers[key]) clearTimeout(timers[key]!);
      timers[key] = setTimeout(fn, 300);
    };

    const channel = supabase
      .channel(`crm:${organization.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_pipeline_stages', filter: orgFilter },
        () => debounce('stages', fetchPipelineStages))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads', filter: orgFilter },
        () => debounce('leads', fetchLeads))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_deals', filter: orgFilter },
        () => debounce('deals', fetchDeals))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_activities', filter: orgFilter },
        () => debounce('activities', () => fetchActivities()))
      // Deal notes scoped to whichever deal is currently open. We refetch
      // only if the user has notes loaded for the deal that received an
      // event — keeps the subscription cheap and avoids cross-deal noise.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_deal_notes' },
        (payload: any) => {
          const dealId = payload.new?.deal_id || payload.old?.deal_id;
          if (!dealId) return;
          // Only refetch if we have any notes for this deal in local state
          // (i.e. the user has the deal detail open or visited recently).
          setDealNotes(prev => {
            const hasThis = prev.some(n => n.dealId === dealId);
            if (hasThis) {
              debounce('dealNotes', () => fetchDealNotes(dealId));
            }
            return prev;
          });
        })
      .subscribe();

    return () => {
      Object.values(timers).forEach((t) => { if (t) clearTimeout(t); });
      supabase.removeChannel(channel);
    };
  }, [organization?.id, fetchPipelineStages, fetchLeads, fetchDeals, fetchActivities]);

  // ===== TAB RESUMED =====
  // When the user returns to a backgrounded tab, refetch state since the
  // realtime channel may have missed events while throttled.
  useEffect(() => {
    if (!organization?.id) return;
    return onTabResumed(() => {
      fetchPipelineStages();
      fetchLeads();
      fetchDeals();
      fetchActivities();
    });
  }, [organization?.id, fetchPipelineStages, fetchLeads, fetchDeals, fetchActivities]);

  const value = useMemo<CRMContextType>(() => ({
    leads,
    deals,
    activities,
    loading,
    error,
    pipelineStages,
    getStageConfig,
    addStage,
    updateStage,
    deleteStage,
    reorderStages,
    fetchPipelineStages,
    fetchLeads,
    addLead,
    updateLead,
    deleteLead,
    convertLeadToDeal,
    fetchDeals,
    addDeal,
    updateDeal,
    updateDealStage,
    deleteDeal,
    markDealWon,
    markDealLost,
    fetchDealHistory,
    dealNotes,
    fetchDealNotes,
    addDealNote,
    deleteDealNote,
    fetchActivities,
    addActivity,
    updateActivity,
    completeActivity,
    deleteActivity,
    getStats,
    getPipelineByStage,
    getUpcomingReminders,
    getOverdueActivities,
  }), [
    leads, deals, activities, loading, error,
    pipelineStages, getStageConfig, addStage, updateStage, deleteStage, reorderStages, fetchPipelineStages,
    fetchLeads, addLead, updateLead, deleteLead, convertLeadToDeal,
    fetchDeals, addDeal, updateDeal, updateDealStage, deleteDeal, markDealWon, markDealLost, fetchDealHistory,
    dealNotes, fetchDealNotes, addDealNote, deleteDealNote,
    fetchActivities, addActivity, updateActivity, completeActivity, deleteActivity,
    getStats, getPipelineByStage, getUpcomingReminders, getOverdueActivities,
  ]);

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>;
}

export function useCRM() {
  const context = useContext(CRMContext);
  if (!context) throw new Error('useCRM must be used within CRMProvider');
  return context;
}
