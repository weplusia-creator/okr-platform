import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type {
  ROIAnalysis,
  ROIInitialCost,
  ROIRecurringCost,
  ROIHiddenCost,
  ROIDirectSaving,
  ROIAdditionalRevenue,
  ROIProductivityBenefit,
  ROIIntangibleBenefit,
  ROIStatus,
  Currency,
} from '../types/tools';

// ===== ROI Template type =====

export interface ROITemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  isSystem: boolean;
  initialCosts: ROIInitialCost[];
  recurringCosts: ROIRecurringCost[];
  hiddenCosts: ROIHiddenCost[];
  directSavings: ROIDirectSaving[];
  additionalRevenue: ROIAdditionalRevenue[];
  productivityBenefits: ROIProductivityBenefit[];
  intangibleBenefits: ROIIntangibleBenefit[];
}

// ===== Context type =====

interface ToolsContextType {
  roiAnalyses: ROIAnalysis[];
  roiTemplates: ROITemplate[];
  loadingROI: boolean;
  fetchROIAnalyses: () => Promise<void>;
  fetchROITemplates: () => Promise<void>;
  addROIAnalysis: (data: Omit<ROIAnalysis, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>) => Promise<string | null>;
  updateROIAnalysis: (id: string, data: Partial<Omit<ROIAnalysis, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>>) => Promise<boolean>;
  deleteROIAnalysis: (id: string) => Promise<void>;
  duplicateROIAnalysis: (id: string) => Promise<string | null>;
}

const ToolsContext = createContext<ToolsContextType | undefined>(undefined);

// ===== Mapping helpers =====

function mapRowToAnalysis(row: any): ROIAnalysis {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    clientId: row.client_id,
    clientName: row.client_name,
    projectId: row.project_id,
    solutionDescription: row.solution_description,
    analysisPeriod: row.analysis_period,
    currency: row.currency as Currency,
    analysisDate: row.analysis_date,
    responsible: row.responsible,
    initialCosts: row.initial_costs || [],
    recurringCosts: row.recurring_costs || [],
    hiddenCosts: row.hidden_costs || [],
    directSavings: row.direct_savings || [],
    additionalRevenue: row.additional_revenue || [],
    productivityBenefits: row.productivity_benefits || [],
    intangibleBenefits: row.intangible_benefits || [],
    contextNotes: row.context_notes,
    conclusionNotes: row.conclusion_notes,
    assumptions: row.assumptions,
    status: row.status as ROIStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToTemplate(row: any): ROITemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    isSystem: row.is_system,
    initialCosts: row.initial_costs || [],
    recurringCosts: row.recurring_costs || [],
    hiddenCosts: row.hidden_costs || [],
    directSavings: row.direct_savings || [],
    additionalRevenue: row.additional_revenue || [],
    productivityBenefits: row.productivity_benefits || [],
    intangibleBenefits: row.intangible_benefits || [],
  };
}

function analysisToRow(data: Partial<Omit<ROIAnalysis, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (data.name !== undefined) row.name = data.name;
  if (data.clientId !== undefined) row.client_id = data.clientId;
  if (data.clientName !== undefined) row.client_name = data.clientName;
  if (data.projectId !== undefined) row.project_id = data.projectId;
  if (data.solutionDescription !== undefined) row.solution_description = data.solutionDescription;
  if (data.analysisPeriod !== undefined) row.analysis_period = data.analysisPeriod;
  if (data.currency !== undefined) row.currency = data.currency;
  if (data.analysisDate !== undefined) row.analysis_date = data.analysisDate;
  if (data.responsible !== undefined) row.responsible = data.responsible;
  if (data.initialCosts !== undefined) row.initial_costs = data.initialCosts;
  if (data.recurringCosts !== undefined) row.recurring_costs = data.recurringCosts;
  if (data.hiddenCosts !== undefined) row.hidden_costs = data.hiddenCosts;
  if (data.directSavings !== undefined) row.direct_savings = data.directSavings;
  if (data.additionalRevenue !== undefined) row.additional_revenue = data.additionalRevenue;
  if (data.productivityBenefits !== undefined) row.productivity_benefits = data.productivityBenefits;
  if (data.intangibleBenefits !== undefined) row.intangible_benefits = data.intangibleBenefits;
  if (data.contextNotes !== undefined) row.context_notes = data.contextNotes;
  if (data.conclusionNotes !== undefined) row.conclusion_notes = data.conclusionNotes;
  if (data.assumptions !== undefined) row.assumptions = data.assumptions;
  if (data.status !== undefined) row.status = data.status;
  return row;
}

// ===== Provider =====

export function ToolsProvider({ children }: { children: ReactNode }) {
  const { organization } = useAuth();
  const [roiAnalyses, setRoiAnalyses] = useState<ROIAnalysis[]>([]);
  const [roiTemplates, setRoiTemplates] = useState<ROITemplate[]>([]);
  const [loadingROI, setLoadingROI] = useState(false);

  // ----- Fetch analyses -----
  const fetchROIAnalyses = useCallback(async () => {
    if (!organization?.id) return;
    try {
      setLoadingROI(true);
      const { data, error } = await supabase
        .from('roi_analyses')
        .select('*')
        .eq('organization_id', organization.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setRoiAnalyses((data || []).map(mapRowToAnalysis));
    } catch (err: any) {
      // Silence table-not-found errors (migration may not have been run)
      if (err?.code !== 'PGRST116' && err?.code !== '42P01') {
        console.error('Error fetching ROI analyses:', err);
      }
    } finally {
      setLoadingROI(false);
    }
  }, [organization?.id]);

  // ----- Fetch templates -----
  const fetchROITemplates = useCallback(async () => {
    if (!organization?.id) return;
    try {
      const { data, error } = await supabase
        .from('roi_templates')
        .select('*')
        .or(`organization_id.eq.${organization.id},is_system.eq.true`)
        .order('name');

      if (error) throw error;
      setRoiTemplates((data || []).map(mapRowToTemplate));
    } catch (err: any) {
      if (err?.code !== 'PGRST116' && err?.code !== '42P01') {
        console.error('Error fetching ROI templates:', err);
      }
    }
  }, [organization?.id]);

  // ----- Add analysis -----
  const addROIAnalysis = useCallback(async (
    data: Omit<ROIAnalysis, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>
  ): Promise<string | null> => {
    if (!organization?.id) return null;
    try {
      const row = {
        ...analysisToRow(data),
        organization_id: organization.id,
      };

      const { error } = await supabase
        .from('roi_analyses')
        .insert(row);

      if (error) throw error;

      // Separate query to get the new ID (RLS workaround)
      const { data: newRow } = await supabase
        .from('roi_analyses')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('name', data.name)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (newRow) {
        await fetchROIAnalyses();
        return newRow.id;
      }
      return null;
    } catch (err) {
      console.error('Error adding ROI analysis:', err);
      return null;
    }
  }, [organization?.id, fetchROIAnalyses]);

  // ----- Update analysis -----
  const updateROIAnalysis = useCallback(async (
    id: string,
    data: Partial<Omit<ROIAnalysis, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>>
  ): Promise<boolean> => {
    if (!organization?.id) return false;
    try {
      const row = {
        ...analysisToRow(data),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('roi_analyses')
        .update(row)
        .eq('id', id)
        .eq('organization_id', organization.id);

      if (error) throw error;

      await fetchROIAnalyses();
      return true;
    } catch (err) {
      console.error('Error updating ROI analysis:', err);
      return false;
    }
  }, [organization?.id, fetchROIAnalyses]);

  // ----- Delete analysis -----
  const deleteROIAnalysis = useCallback(async (id: string): Promise<void> => {
    if (!organization?.id) return;
    try {
      const { error } = await supabase
        .from('roi_analyses')
        .delete()
        .eq('id', id)
        .eq('organization_id', organization.id);

      if (error) throw error;

      setRoiAnalyses(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Error deleting ROI analysis:', err);
    }
  }, [organization?.id]);

  // ----- Duplicate analysis -----
  const duplicateROIAnalysis = useCallback(async (id: string): Promise<string | null> => {
    if (!organization?.id) return null;
    try {
      const original = roiAnalyses.find(a => a.id === id);
      if (!original) return null;

      const duplicatedName = `${original.name} (copia)`;

      const row = {
        organization_id: organization.id,
        name: duplicatedName,
        client_id: original.clientId,
        client_name: original.clientName,
        project_id: original.projectId,
        solution_description: original.solutionDescription,
        analysis_period: original.analysisPeriod,
        currency: original.currency,
        analysis_date: original.analysisDate,
        responsible: original.responsible,
        initial_costs: original.initialCosts,
        recurring_costs: original.recurringCosts,
        hidden_costs: original.hiddenCosts,
        direct_savings: original.directSavings,
        additional_revenue: original.additionalRevenue,
        productivity_benefits: original.productivityBenefits,
        intangible_benefits: original.intangibleBenefits,
        context_notes: original.contextNotes,
        conclusion_notes: original.conclusionNotes,
        assumptions: original.assumptions,
        status: 'draft' as const,
      };

      const { error } = await supabase
        .from('roi_analyses')
        .insert(row);

      if (error) throw error;

      // Separate query to get the new ID (RLS workaround)
      const { data: newRow } = await supabase
        .from('roi_analyses')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('name', duplicatedName)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (newRow) {
        await fetchROIAnalyses();
        return newRow.id;
      }
      return null;
    } catch (err) {
      console.error('Error duplicating ROI analysis:', err);
      return null;
    }
  }, [organization?.id, roiAnalyses, fetchROIAnalyses]);

  // ROI data is lazy-loaded: fetched on demand when the user visits the ROI page,
  // not on mount. This avoids 404 errors when the ROI tables haven't been migrated.
  useEffect(() => {
    if (!organization?.id) {
      setRoiAnalyses([]);
      setRoiTemplates([]);
    }
  }, [organization?.id]);

  const value: ToolsContextType = {
    roiAnalyses,
    roiTemplates,
    loadingROI,
    fetchROIAnalyses,
    fetchROITemplates,
    addROIAnalysis,
    updateROIAnalysis,
    deleteROIAnalysis,
    duplicateROIAnalysis,
  };

  return <ToolsContext.Provider value={value}>{children}</ToolsContext.Provider>;
}

export function useTools() {
  const context = useContext(ToolsContext);
  if (context === undefined) {
    throw new Error('useTools must be used within a ToolsProvider');
  }
  return context;
}
