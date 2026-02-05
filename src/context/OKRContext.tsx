import { createContext, useContext, useMemo, useCallback, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { Objective, KeyResult, OKRFilters, Initiative, InitiativeStatus, InitiativeComment } from '../types';
import { getCurrentQuarter, getCurrentYear } from '../utils/helpers';

interface OKRContextType {
  objectives: Objective[];
  filters: OKRFilters;
  filteredObjectives: Objective[];
  loading: boolean;
  error: string | null;
  setFilters: (filters: OKRFilters) => void;
  addObjective: (objective: Omit<Objective, 'id' | 'createdAt' | 'updatedAt' | 'keyResults' | 'organizationId'>) => Promise<Objective | null>;
  updateObjective: (id: string, updates: Partial<Objective>) => Promise<void>;
  deleteObjective: (id: string) => Promise<void>;
  addKeyResult: (objectiveId: string, keyResult: Omit<KeyResult, 'id' | 'objectiveId'>) => Promise<void>;
  updateKeyResult: (objectiveId: string, keyResultId: string, updates: Partial<KeyResult>) => Promise<void>;
  deleteKeyResult: (objectiveId: string, keyResultId: string) => Promise<void>;
  refreshObjectives: () => Promise<void>;
  initiatives: Initiative[];
  fetchInitiatives: () => Promise<void>;
  addInitiative: (keyResultId: string, data: { title: string; responsibleId?: string | null; dueDate?: string | null; description?: string | null }) => Promise<Initiative | null>;
  updateInitiative: (id: string, updates: Partial<Pick<Initiative, 'title' | 'description' | 'responsibleId' | 'dueDate' | 'status' | 'sortOrder'>>) => Promise<void>;
  deleteInitiative: (id: string) => Promise<void>;
  initiativeComments: Record<string, InitiativeComment[]>;
  fetchComments: (initiativeId: string) => Promise<void>;
  addComment: (initiativeId: string, text: string) => Promise<void>;
  deleteComment: (commentId: string, initiativeId: string) => Promise<void>;
}

const OKRContext = createContext<OKRContextType | undefined>(undefined);

export function OKRProvider({ children }: { children: ReactNode }) {
  const { organization, appUser } = useAuth();
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<OKRFilters>({
    quarter: getCurrentQuarter(),
    year: getCurrentYear(),
    status: 'all',
    search: '',
  });

  const fetchObjectives = useCallback(async () => {
    if (!organization?.id) {
      setObjectives([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch objectives
      const { data: objectivesData, error: objectivesError } = await supabase
        .from('objectives')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (objectivesError) {
        throw objectivesError;
      }

      // Fetch all key results for these objectives
      const objectiveIds = objectivesData?.map(o => o.id) || [];

      let keyResultsData: any[] = [];
      if (objectiveIds.length > 0) {
        const { data: krData, error: krError } = await supabase
          .from('key_results')
          .select('*')
          .in('objective_id', objectiveIds);

        if (krError) {
          throw krError;
        }
        keyResultsData = krData || [];
      }

      // Combine objectives with their key results
      const transformedObjectives: Objective[] = (objectivesData || []).map(obj => ({
        id: obj.id,
        organizationId: obj.organization_id,
        title: obj.title,
        description: obj.description,
        status: obj.status as Objective['status'],
        quarter: obj.quarter as Objective['quarter'],
        year: obj.year,
        owner: obj.owner,
        startDate: obj.start_date,
        endDate: obj.end_date,
        createdAt: obj.created_at,
        updatedAt: obj.updated_at,
        keyResults: keyResultsData
          .filter(kr => kr.objective_id === obj.id)
          .map(kr => ({
            id: kr.id,
            objectiveId: kr.objective_id,
            title: kr.title,
            progress: kr.progress,
            targetValue: kr.target_value,
            currentValue: kr.current_value,
            unit: kr.unit,
          })),
      }));

      setObjectives(transformedObjectives);
    } catch (err) {
      console.error('Error fetching objectives:', err);
      setError('Error al cargar los objetivos');
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    fetchObjectives();
  }, [fetchObjectives]);

  const filteredObjectives = useMemo(() => {
    return objectives.filter((obj) => {
      if (filters.quarter !== 'all' && obj.quarter !== filters.quarter) return false;
      if (filters.year !== 'all' && obj.year !== filters.year) return false;
      if (filters.status !== 'all' && obj.status !== filters.status) return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        return (
          obj.title.toLowerCase().includes(search) ||
          obj.description?.toLowerCase().includes(search) ||
          obj.owner.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [objectives, filters]);

  const addObjective = useCallback(
    async (objective: Omit<Objective, 'id' | 'createdAt' | 'updatedAt' | 'keyResults' | 'organizationId'>): Promise<Objective | null> => {
      if (!organization?.id) return null;

      try {
        const { data, error } = await supabase
          .from('objectives')
          .insert({
            organization_id: organization.id,
            title: objective.title,
            description: objective.description,
            quarter: objective.quarter,
            year: objective.year,
            status: objective.status,
            owner: objective.owner,
            start_date: objective.startDate,
            end_date: objective.endDate,
          })
          .select()
          .single();

        if (error) throw error;

        const newObjective: Objective = {
          id: data.id,
          organizationId: data.organization_id,
          title: data.title,
          description: data.description,
          status: data.status as Objective['status'],
          quarter: data.quarter as Objective['quarter'],
          year: data.year,
          owner: data.owner,
          startDate: data.start_date,
          endDate: data.end_date,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          keyResults: [],
        };

        setObjectives(prev => [newObjective, ...prev]);
        return newObjective;
      } catch (err) {
        console.error('Error adding objective:', err);
        setError('Error al crear el objetivo');
        return null;
      }
    },
    [organization?.id]
  );

  const updateObjective = useCallback(
    async (id: string, updates: Partial<Objective>) => {
      try {
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.quarter !== undefined) dbUpdates.quarter = updates.quarter;
        if (updates.year !== undefined) dbUpdates.year = updates.year;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.owner !== undefined) dbUpdates.owner = updates.owner;
        if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
        if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;

        if (Object.keys(dbUpdates).length > 0) {
          const { error } = await supabase
            .from('objectives')
            .update(dbUpdates)
            .eq('id', id);

          if (error) throw error;
        }

        // Handle key results updates if provided
        if (updates.keyResults !== undefined) {
          // Get existing key results for this objective
          const objective = objectives.find(o => o.id === id);
          const existingKRIds = objective?.keyResults.map(kr => kr.id) || [];
          const newKRIds = updates.keyResults.map(kr => kr.id);

          // Delete removed key results
          const toDelete = existingKRIds.filter(krId => !newKRIds.includes(krId));
          if (toDelete.length > 0) {
            await supabase.from('key_results').delete().in('id', toDelete);
          }

          // Upsert key results
          for (const kr of updates.keyResults) {
            if (existingKRIds.includes(kr.id)) {
              // Update existing
              await supabase
                .from('key_results')
                .update({
                  title: kr.title,
                  progress: kr.progress,
                  target_value: kr.targetValue,
                  current_value: kr.currentValue,
                  unit: kr.unit,
                })
                .eq('id', kr.id);
            } else {
              // Insert new
              await supabase.from('key_results').insert({
                id: kr.id,
                objective_id: id,
                title: kr.title,
                progress: kr.progress,
                target_value: kr.targetValue,
                current_value: kr.currentValue,
                unit: kr.unit,
              });
            }
          }
        }

        // Refresh to get updated data
        await fetchObjectives();
      } catch (err) {
        console.error('Error updating objective:', err);
        setError('Error al actualizar el objetivo');
      }
    },
    [objectives, fetchObjectives]
  );

  const deleteObjective = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase
          .from('objectives')
          .delete()
          .eq('id', id);

        if (error) throw error;

        setObjectives(prev => prev.filter(obj => obj.id !== id));
      } catch (err) {
        console.error('Error deleting objective:', err);
        setError('Error al eliminar el objetivo');
      }
    },
    []
  );

  const addKeyResult = useCallback(
    async (objectiveId: string, keyResult: Omit<KeyResult, 'id' | 'objectiveId'>) => {
      try {
        const { data, error } = await supabase
          .from('key_results')
          .insert({
            objective_id: objectiveId,
            title: keyResult.title,
            progress: keyResult.progress,
            target_value: keyResult.targetValue,
            current_value: keyResult.currentValue,
            unit: keyResult.unit,
          })
          .select()
          .single();

        if (error) throw error;

        const newKR: KeyResult = {
          id: data.id,
          objectiveId: data.objective_id,
          title: data.title,
          progress: data.progress,
          targetValue: data.target_value,
          currentValue: data.current_value,
          unit: data.unit,
        };

        setObjectives(prev =>
          prev.map(obj =>
            obj.id === objectiveId
              ? { ...obj, keyResults: [...obj.keyResults, newKR] }
              : obj
          )
        );
      } catch (err) {
        console.error('Error adding key result:', err);
        setError('Error al agregar el Key Result');
      }
    },
    []
  );

  const updateKeyResult = useCallback(
    async (objectiveId: string, keyResultId: string, updates: Partial<KeyResult>) => {
      try {
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
        if (updates.targetValue !== undefined) dbUpdates.target_value = updates.targetValue;
        if (updates.currentValue !== undefined) dbUpdates.current_value = updates.currentValue;
        if (updates.unit !== undefined) dbUpdates.unit = updates.unit;

        const { error } = await supabase
          .from('key_results')
          .update(dbUpdates)
          .eq('id', keyResultId);

        if (error) throw error;

        setObjectives(prev =>
          prev.map(obj =>
            obj.id === objectiveId
              ? {
                  ...obj,
                  keyResults: obj.keyResults.map(kr =>
                    kr.id === keyResultId ? { ...kr, ...updates } : kr
                  ),
                }
              : obj
          )
        );
      } catch (err) {
        console.error('Error updating key result:', err);
        setError('Error al actualizar el Key Result');
      }
    },
    []
  );

  const deleteKeyResult = useCallback(
    async (objectiveId: string, keyResultId: string) => {
      try {
        const { error } = await supabase
          .from('key_results')
          .delete()
          .eq('id', keyResultId);

        if (error) throw error;

        setObjectives(prev =>
          prev.map(obj =>
            obj.id === objectiveId
              ? {
                  ...obj,
                  keyResults: obj.keyResults.filter(kr => kr.id !== keyResultId),
                }
              : obj
          )
        );
      } catch (err) {
        console.error('Error deleting key result:', err);
        setError('Error al eliminar el Key Result');
      }
    },
    []
  );

  // ===== INITIATIVES =====
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);

  const fetchInitiatives = useCallback(async () => {
    if (!organization?.id) return;
    try {
      const { data, error: err } = await supabase
        .from('initiatives')
        .select('*, users!initiatives_responsible_id_fkey(full_name)')
        .eq('organization_id', organization.id)
        .order('sort_order');

      if (err) throw err;

      setInitiatives((data || []).map((i: any) => ({
        id: i.id,
        keyResultId: i.key_result_id,
        organizationId: i.organization_id,
        title: i.title,
        description: i.description,
        responsibleId: i.responsible_id,
        responsibleName: i.users?.full_name || null,
        dueDate: i.due_date,
        status: i.status as InitiativeStatus,
        sortOrder: i.sort_order || 0,
        createdAt: i.created_at,
        updatedAt: i.updated_at,
      })));
    } catch (err) {
      console.error('Error fetching initiatives:', err);
    }
  }, [organization?.id]);

  useEffect(() => {
    if (organization?.id) fetchInitiatives();
  }, [organization?.id, fetchInitiatives]);

  const addInitiative = useCallback(async (keyResultId: string, data: { title: string; responsibleId?: string | null; dueDate?: string | null; description?: string | null }): Promise<Initiative | null> => {
    if (!organization?.id) return null;
    try {
      const { data: row, error: err } = await supabase
        .from('initiatives')
        .insert({
          key_result_id: keyResultId,
          organization_id: organization.id,
          title: data.title,
          description: data.description || null,
          responsible_id: data.responsibleId || null,
          due_date: data.dueDate || null,
        })
        .select('*, users!initiatives_responsible_id_fkey(full_name)')
        .single();

      if (err) throw err;

      const newInit: Initiative = {
        id: row.id,
        keyResultId: row.key_result_id,
        organizationId: row.organization_id,
        title: row.title,
        description: row.description,
        responsibleId: row.responsible_id,
        responsibleName: row.users?.full_name || null,
        dueDate: row.due_date,
        status: row.status as InitiativeStatus,
        sortOrder: row.sort_order || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      setInitiatives(prev => [...prev, newInit]);
      return newInit;
    } catch (err) {
      console.error('Error adding initiative:', err);
      return null;
    }
  }, [organization?.id]);

  const updateInitiative = useCallback(async (id: string, updates: Partial<Pick<Initiative, 'title' | 'description' | 'responsibleId' | 'dueDate' | 'status' | 'sortOrder'>>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.responsibleId !== undefined) dbUpdates.responsible_id = updates.responsibleId;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
      dbUpdates.updated_at = new Date().toISOString();

      const { error: err } = await supabase.from('initiatives').update(dbUpdates).eq('id', id);
      if (err) throw err;

      setInitiatives(prev => prev.map(i => i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i));
    } catch (err) {
      console.error('Error updating initiative:', err);
    }
  }, []);

  const deleteInitiative = useCallback(async (id: string) => {
    try {
      const { error: err } = await supabase.from('initiatives').delete().eq('id', id);
      if (err) throw err;
      setInitiatives(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error('Error deleting initiative:', err);
    }
  }, []);

  // ===== INITIATIVE COMMENTS =====
  const [initiativeComments, setInitiativeComments] = useState<Record<string, InitiativeComment[]>>({});

  const fetchComments = useCallback(async (initiativeId: string) => {
    try {
      const { data, error: err } = await supabase
        .from('initiative_comments')
        .select('*, users(full_name)')
        .eq('initiative_id', initiativeId)
        .order('created_at', { ascending: true });

      if (err) throw err;

      setInitiativeComments(prev => ({
        ...prev,
        [initiativeId]: (data || []).map((c: any) => ({
          id: c.id,
          initiativeId: c.initiative_id,
          userId: c.user_id,
          userName: c.users?.full_name || null,
          text: c.text,
          createdAt: c.created_at,
        })),
      }));
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  }, []);

  const addComment = useCallback(async (initiativeId: string, text: string) => {
    if (!appUser) return;
    try {
      const { data, error: err } = await supabase
        .from('initiative_comments')
        .insert({
          initiative_id: initiativeId,
          user_id: appUser.id,
          text,
        })
        .select('*, users(full_name)')
        .single();

      if (err) throw err;

      const newComment: InitiativeComment = {
        id: data.id,
        initiativeId: data.initiative_id,
        userId: data.user_id,
        userName: data.users?.full_name || null,
        text: data.text,
        createdAt: data.created_at,
      };

      setInitiativeComments(prev => ({
        ...prev,
        [initiativeId]: [...(prev[initiativeId] || []), newComment],
      }));
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  }, [appUser]);

  const deleteComment = useCallback(async (commentId: string, initiativeId: string) => {
    try {
      const { error: err } = await supabase.from('initiative_comments').delete().eq('id', commentId);
      if (err) throw err;
      setInitiativeComments(prev => ({
        ...prev,
        [initiativeId]: (prev[initiativeId] || []).filter(c => c.id !== commentId),
      }));
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  }, []);

  const value = useMemo(
    () => ({
      objectives,
      filters,
      filteredObjectives,
      loading,
      error,
      setFilters,
      addObjective,
      updateObjective,
      deleteObjective,
      addKeyResult,
      updateKeyResult,
      deleteKeyResult,
      refreshObjectives: fetchObjectives,
      initiatives,
      fetchInitiatives,
      addInitiative,
      updateInitiative,
      deleteInitiative,
      initiativeComments,
      fetchComments,
      addComment,
      deleteComment,
    }),
    [
      objectives,
      filters,
      filteredObjectives,
      loading,
      error,
      addObjective,
      updateObjective,
      deleteObjective,
      addKeyResult,
      updateKeyResult,
      deleteKeyResult,
      fetchObjectives,
      initiatives,
      fetchInitiatives,
      addInitiative,
      updateInitiative,
      deleteInitiative,
      initiativeComments,
      fetchComments,
      addComment,
      deleteComment,
    ]
  );

  return <OKRContext.Provider value={value}>{children}</OKRContext.Provider>;
}

export function useOKR() {
  const context = useContext(OKRContext);
  if (context === undefined) {
    throw new Error('useOKR must be used within an OKRProvider');
  }
  return context;
}
