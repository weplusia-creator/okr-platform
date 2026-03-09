import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { KPICategory, KPI, KPIEntry } from '../types';

interface KPIContextType {
  categories: KPICategory[];
  kpis: KPI[];
  entries: Record<string, KPIEntry[]>;
  loading: boolean;

  fetchCategories: () => Promise<void>;
  addCategory: (name: string, color?: string) => Promise<KPICategory | null>;
  updateCategory: (id: string, updates: Partial<Pick<KPICategory, 'name' | 'color'>>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  fetchKPIs: () => Promise<void>;
  addKPI: (data: { name: string; description?: string; unit?: string; categoryId?: string; targetValue?: number }) => Promise<KPI | null>;
  updateKPI: (id: string, updates: Partial<Pick<KPI, 'name' | 'description' | 'unit' | 'categoryId' | 'targetValue'>>) => Promise<void>;
  deleteKPI: (id: string) => Promise<void>;

  fetchEntries: (kpiId: string) => Promise<void>;
  addEntry: (kpiId: string, value: number, date: string, notes?: string) => Promise<KPIEntry | null>;
  deleteEntry: (id: string, kpiId: string) => Promise<void>;

  syncSystemKPIs: (metrics: { key: string; label: string; unit: string; monthlyValues: { month: string; value: number }[] }[]) => Promise<void>;
}

const KPIContext = createContext<KPIContextType | undefined>(undefined);

export function KPIProvider({ children }: { children: ReactNode }) {
  const { organization } = useAuth();
  const [categories, setCategories] = useState<KPICategory[]>([]);
  const [kpis, setKPIs] = useState<KPI[]>([]);
  const [entries, setEntries] = useState<Record<string, KPIEntry[]>>({});
  const [loading, setLoading] = useState(false);

  // ===== CATEGORIES =====
  const fetchCategories = useCallback(async () => {
    if (!organization?.id) return;
    try {
      const { data, error } = await supabase
        .from('kpi_categories')
        .select('*')
        .eq('organization_id', organization.id)
        .order('sort_order');
      if (error) throw error;
      setCategories((data || []).map(c => ({
        id: c.id,
        organizationId: c.organization_id,
        name: c.name,
        color: c.color || '#3B82F6',
        sortOrder: c.sort_order || 0,
        createdAt: c.created_at,
      })));
    } catch (err) {
      console.error('Error fetching KPI categories:', err);
    }
  }, [organization?.id]);

  const addCategory = useCallback(async (name: string, color = '#3B82F6'): Promise<KPICategory | null> => {
    if (!organization?.id) return null;
    try {
      const { data, error } = await supabase
        .from('kpi_categories')
        .insert({ organization_id: organization.id, name, color })
        .select()
        .single();
      if (error) throw error;
      const cat: KPICategory = {
        id: data.id,
        organizationId: data.organization_id,
        name: data.name,
        color: data.color || '#3B82F6',
        sortOrder: data.sort_order || 0,
        createdAt: data.created_at,
      };
      setCategories(prev => [...prev, cat]);
      return cat;
    } catch (err) {
      console.error('Error adding category:', err);
      return null;
    }
  }, [organization?.id]);

  const updateCategory = useCallback(async (id: string, updates: Partial<Pick<KPICategory, 'name' | 'color'>>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      const { error } = await supabase.from('kpi_categories').update(dbUpdates).eq('id', id);
      if (error) throw error;
      setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    } catch (err) {
      console.error('Error updating category:', err);
    }
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('kpi_categories').delete().eq('id', id);
      if (error) throw error;
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  }, []);

  // ===== KPIs =====
  const fetchKPIs = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('kpis')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');
      if (error) throw error;
      setKPIs((data || []).map(k => ({
        id: k.id,
        organizationId: k.organization_id,
        categoryId: k.category_id || null,
        name: k.name,
        description: k.description || null,
        unit: k.unit || null,
        targetValue: k.target_value != null ? Number(k.target_value) : null,
        isSystem: k.is_system || false,
        createdAt: k.created_at,
      })));
    } catch (err) {
      console.error('Error fetching KPIs:', err);
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  const addKPI = useCallback(async (data: { name: string; description?: string; unit?: string; categoryId?: string; targetValue?: number }): Promise<KPI | null> => {
    if (!organization?.id) return null;
    try {
      const { data: row, error } = await supabase
        .from('kpis')
        .insert({
          organization_id: organization.id,
          name: data.name,
          description: data.description || null,
          unit: data.unit || null,
          category_id: data.categoryId || null,
          target_value: data.targetValue ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      const kpi: KPI = {
        id: row.id,
        organizationId: row.organization_id,
        categoryId: row.category_id || null,
        name: row.name,
        description: row.description || null,
        unit: row.unit || null,
        targetValue: row.target_value != null ? Number(row.target_value) : null,
        isSystem: row.is_system || false,
        createdAt: row.created_at,
      };
      setKPIs(prev => [...prev, kpi].sort((a, b) => a.name.localeCompare(b.name)));
      return kpi;
    } catch (err) {
      console.error('Error adding KPI:', err);
      return null;
    }
  }, [organization?.id]);

  const updateKPI = useCallback(async (id: string, updates: Partial<Pick<KPI, 'name' | 'description' | 'unit' | 'categoryId' | 'targetValue'>>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
      if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
      if (updates.targetValue !== undefined) dbUpdates.target_value = updates.targetValue;
      const { error } = await supabase.from('kpis').update(dbUpdates).eq('id', id);
      if (error) throw error;
      setKPIs(prev => prev.map(k => k.id === id ? { ...k, ...updates } : k));
    } catch (err) {
      console.error('Error updating KPI:', err);
    }
  }, []);

  const deleteKPI = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('kpis').delete().eq('id', id);
      if (error) throw error;
      setKPIs(prev => prev.filter(k => k.id !== id));
      setEntries(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    } catch (err) {
      console.error('Error deleting KPI:', err);
    }
  }, []);

  // ===== ENTRIES =====
  const fetchEntries = useCallback(async (kpiId: string) => {
    try {
      const { data, error } = await supabase
        .from('kpi_entries')
        .select('*')
        .eq('kpi_id', kpiId)
        .order('date', { ascending: true });
      if (error) throw error;
      setEntries(prev => ({
        ...prev,
        [kpiId]: (data || []).map(e => ({
          id: e.id,
          kpiId: e.kpi_id,
          value: Number(e.value),
          date: e.date,
          notes: e.notes || null,
          createdAt: e.created_at,
        })),
      }));
    } catch (err) {
      console.error('Error fetching entries:', err);
    }
  }, []);

  const addEntry = useCallback(async (kpiId: string, value: number, date: string, notes?: string): Promise<KPIEntry | null> => {
    try {
      const { data, error } = await supabase
        .from('kpi_entries')
        .insert({ kpi_id: kpiId, value, date, notes: notes || null })
        .select()
        .single();
      if (error) throw error;
      const entry: KPIEntry = {
        id: data.id,
        kpiId: data.kpi_id,
        value: Number(data.value),
        date: data.date,
        notes: data.notes || null,
        createdAt: data.created_at,
      };
      setEntries(prev => ({
        ...prev,
        [kpiId]: [...(prev[kpiId] || []), entry].sort((a, b) => a.date.localeCompare(b.date)),
      }));
      return entry;
    } catch (err) {
      console.error('Error adding entry:', err);
      return null;
    }
  }, []);

  const deleteEntry = useCallback(async (id: string, kpiId: string) => {
    try {
      const { error } = await supabase.from('kpi_entries').delete().eq('id', id);
      if (error) throw error;
      setEntries(prev => ({
        ...prev,
        [kpiId]: (prev[kpiId] || []).filter(e => e.id !== id),
      }));
    } catch (err) {
      console.error('Error deleting entry:', err);
    }
  }, []);

  // ===== SYSTEM KPI SYNC (monthly) =====
  const syncSystemKPIs = useCallback(async (metrics: { key: string; label: string; unit: string; monthlyValues: { month: string; value: number }[] }[]) => {
    if (!organization?.id) return;

    for (const metric of metrics) {
      const systemName = `__system__${metric.key}`;

      // Find or create the system KPI
      let kpi = kpis.find(k => k.isSystem && k.name === systemName);

      if (!kpi) {
        const { data: existing } = await supabase
          .from('kpis')
          .select('*')
          .eq('organization_id', organization.id)
          .eq('is_system', true)
          .eq('name', systemName)
          .maybeSingle();

        if (existing) {
          kpi = {
            id: existing.id,
            organizationId: existing.organization_id,
            categoryId: existing.category_id || null,
            name: existing.name,
            description: existing.description || null,
            unit: existing.unit || null,
            targetValue: existing.target_value != null ? Number(existing.target_value) : null,
            isSystem: true,
            createdAt: existing.created_at,
          };
        } else {
          const { data: newRow, error: createErr } = await supabase
            .from('kpis')
            .insert({
              organization_id: organization.id,
              name: systemName,
              description: metric.label,
              unit: metric.unit || null,
              is_system: true,
            })
            .select()
            .single();
          if (createErr || !newRow) continue;
          kpi = {
            id: newRow.id,
            organizationId: newRow.organization_id,
            categoryId: null,
            name: newRow.name,
            description: metric.label,
            unit: metric.unit || null,
            targetValue: null,
            isSystem: true,
            createdAt: newRow.created_at,
          };
        }
      }

      // Upsert entry for each month (use 1st of month as date)
      for (const mv of metric.monthlyValues) {
        const date = `${mv.month}-01`;
        const { data: existingEntry } = await supabase
          .from('kpi_entries')
          .select('id')
          .eq('kpi_id', kpi.id)
          .eq('date', date)
          .maybeSingle();

        if (existingEntry) {
          const { error } = await supabase.from('kpi_entries').update({ value: mv.value }).eq('id', existingEntry.id);
          if (error) throw new Error(error.message);
        } else {
          const { error } = await supabase.from('kpi_entries').insert({ kpi_id: kpi.id, value: mv.value, date });
          if (error) throw new Error(error.message);
        }
      }
    }

    // Refresh state
    await fetchKPIs();
    const updatedKPIs = kpis.filter(k => k.isSystem);
    for (const k of updatedKPIs) {
      await fetchEntries(k.id);
    }
  }, [organization?.id, kpis, fetchKPIs, fetchEntries]);

  const value = {
    categories, kpis, entries, loading,
    fetchCategories, addCategory, updateCategory, deleteCategory,
    fetchKPIs, addKPI, updateKPI, deleteKPI,
    fetchEntries, addEntry, deleteEntry,
    syncSystemKPIs,
  };

  return <KPIContext.Provider value={value}>{children}</KPIContext.Provider>;
}

export function useKPIs() {
  const context = useContext(KPIContext);
  if (!context) throw new Error('useKPIs must be used within KPIProvider');
  return context;
}
