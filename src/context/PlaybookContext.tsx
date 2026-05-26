import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { supabase, onTabResumed } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type {
  Playbook, PlaybookStage, PlaybookStep, PlaybookScript,
  PlaybookQuestion, PlaybookObjection, PlaybookItem,
  PlaybookType, PlaybookStatus, StepType,
  QuestionCategory, ObjectionCategory, ObjectionSeverity, ItemType,
} from '../types/playbook';

interface PlaybookContextType {
  // Playbooks
  playbooks: Playbook[];
  fetchPlaybooks: () => Promise<void>;
  addPlaybook: (data: { name: string; description?: string; type: PlaybookType; industry?: string; productService?: string; projectId?: string; isTemplate?: boolean }) => Promise<Playbook | null>;
  updatePlaybook: (id: string, updates: Partial<Pick<Playbook, 'name' | 'description' | 'type' | 'status' | 'industry' | 'productService' | 'isTemplate' | 'version'>>) => Promise<void>;
  deletePlaybook: (id: string) => Promise<void>;
  createPlaybookFromTemplate: (data: { name: string; description?: string; type: PlaybookType; projectId?: string }, template: { stages: any[]; objections: any[] }) => Promise<Playbook | null>;

  // Stages
  stages: PlaybookStage[];
  fetchStages: (playbookId: string) => Promise<void>;
  addStage: (playbookId: string, data: { name: string; description?: string; objective?: string; sortOrder: number; estimatedDuration?: string; color?: string; icon?: string }) => Promise<PlaybookStage | null>;
  updateStage: (id: string, updates: Partial<Pick<PlaybookStage, 'name' | 'description' | 'objective' | 'sortOrder' | 'estimatedDuration' | 'color' | 'icon'>>) => Promise<void>;
  deleteStage: (id: string) => Promise<void>;

  // Steps
  steps: PlaybookStep[];
  fetchSteps: (stageId: string) => Promise<void>;
  addStep: (stageId: string, data: { title: string; description?: string; sortOrder: number; type?: StepType; content?: string; isRequired?: boolean }) => Promise<PlaybookStep | null>;
  updateStep: (id: string, updates: Partial<Pick<PlaybookStep, 'title' | 'description' | 'sortOrder' | 'type' | 'content' | 'isRequired'>>) => Promise<void>;
  deleteStep: (id: string) => Promise<void>;

  // Scripts
  scripts: PlaybookScript[];
  fetchScripts: (playbookId: string) => Promise<void>;
  addScript: (playbookId: string, data: { name: string; situation?: string; scriptText: string; notes?: string; stageId?: string; sortOrder?: number }) => Promise<PlaybookScript | null>;
  updateScript: (id: string, updates: Partial<Pick<PlaybookScript, 'name' | 'situation' | 'scriptText' | 'notes' | 'stageId' | 'sortOrder'>>) => Promise<void>;
  deleteScript: (id: string) => Promise<void>;

  // Questions
  questions: PlaybookQuestion[];
  fetchQuestions: (playbookId: string) => Promise<void>;
  addQuestion: (playbookId: string, data: { question: string; category?: QuestionCategory; purpose?: string; stageId?: string; sortOrder?: number; whatToListen?: string; followupQuestion?: string }) => Promise<PlaybookQuestion | null>;
  updateQuestion: (id: string, updates: Partial<Pick<PlaybookQuestion, 'question' | 'category' | 'purpose' | 'stageId' | 'sortOrder' | 'whatToListen' | 'followupQuestion'>>) => Promise<void>;
  deleteQuestion: (id: string) => Promise<void>;

  // Objections
  objections: PlaybookObjection[];
  fetchObjections: (playbookId: string) => Promise<void>;
  addObjection: (playbookId: string, data: { objection: string; responses: { text: string; type: string; example: string }[]; category?: ObjectionCategory; severity?: ObjectionSeverity; signalsWorking?: string; ifNotWorking?: string; sortOrder?: number }) => Promise<PlaybookObjection | null>;
  updateObjection: (id: string, updates: Partial<Pick<PlaybookObjection, 'objection' | 'responses' | 'category' | 'severity' | 'signalsWorking' | 'ifNotWorking' | 'sortOrder'>>) => Promise<void>;
  deleteObjection: (id: string) => Promise<void>;

  // Items
  items: PlaybookItem[];
  fetchItems: (playbookId: string) => Promise<void>;
  addItem: (playbookId: string, data: { title: string; content?: Record<string, any>; itemType: ItemType; stageId?: string; sortOrder?: number }) => Promise<PlaybookItem | null>;
  updateItem: (id: string, updates: Partial<Pick<PlaybookItem, 'title' | 'content' | 'itemType' | 'stageId' | 'sortOrder'>>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;

  loading: boolean;
}

const PlaybookContext = createContext<PlaybookContextType | undefined>(undefined);

export function PlaybookProvider({ children }: { children: ReactNode }) {
  const { appUser, organization } = useAuth();
  const db = supabase;

  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [stages, setStages] = useState<PlaybookStage[]>([]);
  const [steps, setSteps] = useState<PlaybookStep[]>([]);
  const [scripts, setScripts] = useState<PlaybookScript[]>([]);
  const [questions, setQuestions] = useState<PlaybookQuestion[]>([]);
  const [objections, setObjections] = useState<PlaybookObjection[]>([]);
  const [items, setItems] = useState<PlaybookItem[]>([]);
  const [loading, setLoading] = useState(false);

  // ===== PLAYBOOKS =====

  const fetchPlaybooks = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      const { data, error } = await db
        .from('playbooks')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');

      if (error) throw error;

      setPlaybooks((data || []).map((p: any) => ({
        id: p.id,
        organizationId: p.organization_id,
        projectId: p.project_id,
        name: p.name,
        description: p.description,
        type: p.type,
        industry: p.industry,
        productService: p.product_service,
        status: p.status,
        version: p.version,
        isTemplate: p.is_template,
        shareToken: p.share_token || '',
        createdBy: p.created_by,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })));
    } catch (err) {
      console.error('Error fetching playbooks:', err);
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  const addPlaybook = useCallback(async (data: { name: string; description?: string; type: PlaybookType; industry?: string; productService?: string; projectId?: string; isTemplate?: boolean }): Promise<Playbook | null> => {
    if (!organization?.id || !appUser?.id) return null;
    try {
      const { data: row, error } = await db
        .from('playbooks')
        .insert({
          organization_id: organization.id,
          project_id: data.projectId || null,
          name: data.name,
          description: data.description || null,
          type: data.type,
          industry: data.industry || null,
          product_service: data.productService || null,
          is_template: data.isTemplate ?? false,
          created_by: appUser.id,
        })
        .select()
        .single();

      if (error) throw error;

      const playbook: Playbook = {
        id: row.id,
        organizationId: row.organization_id,
        projectId: row.project_id,
        name: row.name,
        description: row.description,
        type: row.type,
        industry: row.industry,
        productService: row.product_service,
        status: row.status,
        version: row.version,
        isTemplate: row.is_template,
        shareToken: row.share_token || '',
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      setPlaybooks(prev => [...prev, playbook].sort((a, b) => a.name.localeCompare(b.name)));
      return playbook;
    } catch (err) {
      console.error('Error adding playbook:', err);
      return null;
    }
  }, [organization?.id, appUser?.id]);

  const updatePlaybook = useCallback(async (id: string, updates: Partial<Pick<Playbook, 'name' | 'description' | 'type' | 'status' | 'industry' | 'productService' | 'isTemplate' | 'version'>>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.industry !== undefined) dbUpdates.industry = updates.industry;
      if (updates.productService !== undefined) dbUpdates.product_service = updates.productService;
      if (updates.isTemplate !== undefined) dbUpdates.is_template = updates.isTemplate;
      if (updates.version !== undefined) dbUpdates.version = updates.version;

      const { error } = await db.from('playbooks').update(dbUpdates).eq('id', id);
      if (error) throw error;
      setPlaybooks(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    } catch (err) {
      console.error('Error updating playbook:', err);
    }
  }, []);

  const deletePlaybook = useCallback(async (id: string) => {
    try {
      const { error } = await db.from('playbooks').delete().eq('id', id);
      if (error) throw error;
      setPlaybooks(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting playbook:', err);
    }
  }, []);

  const createPlaybookFromTemplate = useCallback(async (
    data: { name: string; description?: string; type: PlaybookType; projectId?: string },
    template: { stages: any[]; objections: any[] }
  ): Promise<Playbook | null> => {
    if (!organization?.id || !appUser?.id) return null;
    try {
      // 1. Create the playbook
      const { data: row, error } = await db
        .from('playbooks')
        .insert({
          organization_id: organization.id,
          project_id: data.projectId || null,
          name: data.name,
          description: data.description || null,
          type: data.type,
          created_by: appUser.id,
        })
        .select()
        .single();

      if (error) throw error;

      const playbook: Playbook = {
        id: row.id,
        organizationId: row.organization_id,
        projectId: row.project_id,
        name: row.name,
        description: row.description,
        type: row.type,
        industry: row.industry,
        productService: row.product_service,
        status: row.status,
        version: row.version,
        isTemplate: row.is_template,
        shareToken: row.share_token || '',
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      // 2. Create stages, steps, scripts, questions from template
      for (const tStage of template.stages) {
        const { data: stageRow, error: stageErr } = await db
          .from('playbook_stages')
          .insert({
            playbook_id: playbook.id,
            name: tStage.name,
            description: tStage.description || null,
            objective: tStage.objective || null,
            sort_order: tStage.sortOrder ?? 0,
            estimated_duration: tStage.estimatedDuration || null,
            color: tStage.color || null,
            icon: tStage.icon || null,
          })
          .select()
          .single();

        if (stageErr) throw stageErr;

        // Create steps for this stage
        if (tStage.steps) {
          for (const tStep of tStage.steps) {
            await db.from('playbook_steps').insert({
              stage_id: stageRow.id,
              title: tStep.title,
              description: tStep.description || null,
              sort_order: tStep.sortOrder ?? 0,
              type: tStep.type || null,
              content: tStep.content || null,
              is_required: tStep.isRequired ?? false,
            });
          }
        }

        // Create scripts for this stage
        if (tStage.scripts) {
          for (const tScript of tStage.scripts) {
            await db.from('playbook_scripts').insert({
              playbook_id: playbook.id,
              stage_id: stageRow.id,
              name: tScript.name,
              situation: tScript.situation || null,
              script_text: tScript.scriptText,
              notes: tScript.notes || null,
              sort_order: tScript.sortOrder ?? 0,
            });
          }
        }

        // Create questions for this stage
        if (tStage.questions) {
          for (const tQ of tStage.questions) {
            await db.from('playbook_questions').insert({
              playbook_id: playbook.id,
              stage_id: stageRow.id,
              question: tQ.question,
              category: tQ.category || null,
              purpose: tQ.purpose || null,
              sort_order: tQ.sortOrder ?? 0,
              what_to_listen: tQ.whatToListen || null,
              followup_question: tQ.followupQuestion || null,
            });
          }
        }
      }

      // 3. Create objections from template
      if (template.objections) {
        for (const tObj of template.objections) {
          await db.from('playbook_objections').insert({
            playbook_id: playbook.id,
            objection: tObj.objection,
            responses: tObj.responses || [],
            category: tObj.category || null,
            severity: tObj.severity || null,
            signals_working: tObj.signalsWorking || null,
            if_not_working: tObj.ifNotWorking || null,
            sort_order: tObj.sortOrder ?? 0,
          });
        }
      }

      setPlaybooks(prev => [...prev, playbook].sort((a, b) => a.name.localeCompare(b.name)));
      return playbook;
    } catch (err) {
      console.error('Error creating playbook from template:', err);
      return null;
    }
  }, [organization?.id, appUser?.id]);

  // ===== STAGES =====

  const fetchStages = useCallback(async (playbookId: string) => {
    try {
      const { data, error } = await db
        .from('playbook_stages')
        .select('*')
        .eq('playbook_id', playbookId)
        .order('sort_order');

      if (error) throw error;

      const mapped = (data || []).map((s: any) => ({
        id: s.id,
        playbookId: s.playbook_id,
        name: s.name,
        description: s.description,
        objective: s.objective,
        estimatedDuration: s.estimated_duration,
        sortOrder: s.sort_order,
        color: s.color,
        icon: s.icon,
        createdAt: s.created_at,
      }));

      setStages(prev => {
        const others = prev.filter(s => s.playbookId !== playbookId);
        return [...others, ...mapped];
      });
    } catch (err) {
      console.error('Error fetching playbook stages:', err);
    }
  }, []);

  const addStage = useCallback(async (playbookId: string, data: { name: string; description?: string; objective?: string; sortOrder: number; estimatedDuration?: string; color?: string; icon?: string }): Promise<PlaybookStage | null> => {
    try {
      const { data: row, error } = await db
        .from('playbook_stages')
        .insert({
          playbook_id: playbookId,
          name: data.name,
          description: data.description || null,
          objective: data.objective || null,
          sort_order: data.sortOrder,
          estimated_duration: data.estimatedDuration || null,
          color: data.color || null,
          icon: data.icon || null,
        })
        .select()
        .single();

      if (error) throw error;

      const stage: PlaybookStage = {
        id: row.id,
        playbookId: row.playbook_id,
        name: row.name,
        description: row.description,
        objective: row.objective,
        estimatedDuration: row.estimated_duration,
        sortOrder: row.sort_order,
        color: row.color,
        icon: row.icon,
        createdAt: row.created_at,
      };

      setStages(prev => [...prev, stage]);
      return stage;
    } catch (err) {
      console.error('Error adding playbook stage:', err);
      return null;
    }
  }, []);

  const updateStage = useCallback(async (id: string, updates: Partial<Pick<PlaybookStage, 'name' | 'description' | 'objective' | 'sortOrder' | 'estimatedDuration' | 'color' | 'icon'>>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.objective !== undefined) dbUpdates.objective = updates.objective;
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
      if (updates.estimatedDuration !== undefined) dbUpdates.estimated_duration = updates.estimatedDuration;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      if (updates.icon !== undefined) dbUpdates.icon = updates.icon;

      const { error } = await db.from('playbook_stages').update(dbUpdates).eq('id', id);
      if (error) throw error;
      setStages(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    } catch (err) {
      console.error('Error updating playbook stage:', err);
    }
  }, []);

  const deleteStage = useCallback(async (id: string) => {
    try {
      const { error } = await db.from('playbook_stages').delete().eq('id', id);
      if (error) throw error;
      setStages(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting playbook stage:', err);
    }
  }, []);

  // ===== STEPS =====

  const fetchSteps = useCallback(async (stageId: string) => {
    try {
      const { data, error } = await db
        .from('playbook_steps')
        .select('*')
        .eq('stage_id', stageId)
        .order('sort_order');

      if (error) throw error;

      const mapped = (data || []).map((s: any) => ({
        id: s.id,
        stageId: s.stage_id,
        title: s.title,
        description: s.description,
        type: s.type,
        content: s.content,
        sortOrder: s.sort_order,
        isRequired: s.is_required,
        createdAt: s.created_at,
      }));

      setSteps(prev => {
        const others = prev.filter(s => s.stageId !== stageId);
        return [...others, ...mapped];
      });
    } catch (err) {
      console.error('Error fetching playbook steps:', err);
    }
  }, []);

  const addStep = useCallback(async (stageId: string, data: { title: string; description?: string; sortOrder: number; type?: StepType; content?: string; isRequired?: boolean }): Promise<PlaybookStep | null> => {
    try {
      const { data: row, error } = await db
        .from('playbook_steps')
        .insert({
          stage_id: stageId,
          title: data.title,
          description: data.description || null,
          sort_order: data.sortOrder,
          type: data.type || null,
          content: data.content || null,
          is_required: data.isRequired ?? false,
        })
        .select()
        .single();

      if (error) throw error;

      const step: PlaybookStep = {
        id: row.id,
        stageId: row.stage_id,
        title: row.title,
        description: row.description,
        type: row.type,
        content: row.content,
        sortOrder: row.sort_order,
        isRequired: row.is_required,
        createdAt: row.created_at,
      };

      setSteps(prev => [...prev, step]);
      return step;
    } catch (err) {
      console.error('Error adding playbook step:', err);
      return null;
    }
  }, []);

  const updateStep = useCallback(async (id: string, updates: Partial<Pick<PlaybookStep, 'title' | 'description' | 'sortOrder' | 'type' | 'content' | 'isRequired'>>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.content !== undefined) dbUpdates.content = updates.content;
      if (updates.isRequired !== undefined) dbUpdates.is_required = updates.isRequired;

      const { error } = await db.from('playbook_steps').update(dbUpdates).eq('id', id);
      if (error) throw error;
      setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    } catch (err) {
      console.error('Error updating playbook step:', err);
    }
  }, []);

  const deleteStep = useCallback(async (id: string) => {
    try {
      const { error } = await db.from('playbook_steps').delete().eq('id', id);
      if (error) throw error;
      setSteps(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting playbook step:', err);
    }
  }, []);

  // ===== SCRIPTS =====

  const fetchScripts = useCallback(async (playbookId: string) => {
    try {
      const { data, error } = await db
        .from('playbook_scripts')
        .select('*')
        .eq('playbook_id', playbookId)
        .order('sort_order');

      if (error) throw error;

      const mapped = (data || []).map((s: any) => ({
        id: s.id,
        playbookId: s.playbook_id,
        stageId: s.stage_id,
        name: s.name,
        situation: s.situation,
        scriptText: s.script_text,
        notes: s.notes,
        sortOrder: s.sort_order,
        createdAt: s.created_at,
      }));

      setScripts(prev => {
        const others = prev.filter(s => s.playbookId !== playbookId);
        return [...others, ...mapped];
      });
    } catch (err) {
      console.error('Error fetching playbook scripts:', err);
    }
  }, []);

  const addScript = useCallback(async (playbookId: string, data: { name: string; situation?: string; scriptText: string; notes?: string; stageId?: string; sortOrder?: number }): Promise<PlaybookScript | null> => {
    try {
      const { data: row, error } = await db
        .from('playbook_scripts')
        .insert({
          playbook_id: playbookId,
          stage_id: data.stageId || null,
          name: data.name,
          situation: data.situation || null,
          script_text: data.scriptText,
          notes: data.notes || null,
          sort_order: data.sortOrder ?? 0,
        })
        .select()
        .single();

      if (error) throw error;

      const script: PlaybookScript = {
        id: row.id,
        playbookId: row.playbook_id,
        stageId: row.stage_id,
        name: row.name,
        situation: row.situation,
        scriptText: row.script_text,
        notes: row.notes,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
      };

      setScripts(prev => [...prev, script]);
      return script;
    } catch (err) {
      console.error('Error adding playbook script:', err);
      return null;
    }
  }, []);

  const updateScript = useCallback(async (id: string, updates: Partial<Pick<PlaybookScript, 'name' | 'situation' | 'scriptText' | 'notes' | 'stageId' | 'sortOrder'>>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.situation !== undefined) dbUpdates.situation = updates.situation;
      if (updates.scriptText !== undefined) dbUpdates.script_text = updates.scriptText;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.stageId !== undefined) dbUpdates.stage_id = updates.stageId;
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;

      const { error } = await db.from('playbook_scripts').update(dbUpdates).eq('id', id);
      if (error) throw error;
      setScripts(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    } catch (err) {
      console.error('Error updating playbook script:', err);
    }
  }, []);

  const deleteScript = useCallback(async (id: string) => {
    try {
      const { error } = await db.from('playbook_scripts').delete().eq('id', id);
      if (error) throw error;
      setScripts(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting playbook script:', err);
    }
  }, []);

  // ===== QUESTIONS =====

  const fetchQuestions = useCallback(async (playbookId: string) => {
    try {
      const { data, error } = await db
        .from('playbook_questions')
        .select('*')
        .eq('playbook_id', playbookId)
        .order('sort_order');

      if (error) throw error;

      const mapped = (data || []).map((q: any) => ({
        id: q.id,
        playbookId: q.playbook_id,
        stageId: q.stage_id,
        category: q.category,
        question: q.question,
        purpose: q.purpose,
        whatToListen: q.what_to_listen,
        followupQuestion: q.followup_question,
        sortOrder: q.sort_order,
        createdAt: q.created_at,
      }));

      setQuestions(prev => {
        const others = prev.filter(q => q.playbookId !== playbookId);
        return [...others, ...mapped];
      });
    } catch (err) {
      console.error('Error fetching playbook questions:', err);
    }
  }, []);

  const addQuestion = useCallback(async (playbookId: string, data: { question: string; category?: QuestionCategory; purpose?: string; stageId?: string; sortOrder?: number; whatToListen?: string; followupQuestion?: string }): Promise<PlaybookQuestion | null> => {
    try {
      const { data: row, error } = await db
        .from('playbook_questions')
        .insert({
          playbook_id: playbookId,
          stage_id: data.stageId || null,
          question: data.question,
          category: data.category || null,
          purpose: data.purpose || null,
          sort_order: data.sortOrder ?? 0,
          what_to_listen: data.whatToListen || null,
          followup_question: data.followupQuestion || null,
        })
        .select()
        .single();

      if (error) throw error;

      const question: PlaybookQuestion = {
        id: row.id,
        playbookId: row.playbook_id,
        stageId: row.stage_id,
        category: row.category,
        question: row.question,
        purpose: row.purpose,
        whatToListen: row.what_to_listen,
        followupQuestion: row.followup_question,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
      };

      setQuestions(prev => [...prev, question]);
      return question;
    } catch (err) {
      console.error('Error adding playbook question:', err);
      return null;
    }
  }, []);

  const updateQuestion = useCallback(async (id: string, updates: Partial<Pick<PlaybookQuestion, 'question' | 'category' | 'purpose' | 'stageId' | 'sortOrder' | 'whatToListen' | 'followupQuestion'>>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.question !== undefined) dbUpdates.question = updates.question;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.purpose !== undefined) dbUpdates.purpose = updates.purpose;
      if (updates.stageId !== undefined) dbUpdates.stage_id = updates.stageId;
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
      if (updates.whatToListen !== undefined) dbUpdates.what_to_listen = updates.whatToListen;
      if (updates.followupQuestion !== undefined) dbUpdates.followup_question = updates.followupQuestion;

      const { error } = await db.from('playbook_questions').update(dbUpdates).eq('id', id);
      if (error) throw error;
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
    } catch (err) {
      console.error('Error updating playbook question:', err);
    }
  }, []);

  const deleteQuestion = useCallback(async (id: string) => {
    try {
      const { error } = await db.from('playbook_questions').delete().eq('id', id);
      if (error) throw error;
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      console.error('Error deleting playbook question:', err);
    }
  }, []);

  // ===== OBJECTIONS =====

  const fetchObjections = useCallback(async (playbookId: string) => {
    try {
      const { data, error } = await db
        .from('playbook_objections')
        .select('*')
        .eq('playbook_id', playbookId)
        .order('sort_order');

      if (error) throw error;

      const mapped = (data || []).map((o: any) => ({
        id: o.id,
        playbookId: o.playbook_id,
        objection: o.objection,
        category: o.category,
        severity: o.severity,
        responses: o.responses || [],
        signalsWorking: o.signals_working,
        ifNotWorking: o.if_not_working,
        sortOrder: o.sort_order,
        createdAt: o.created_at,
      }));

      setObjections(prev => {
        const others = prev.filter(o => o.playbookId !== playbookId);
        return [...others, ...mapped];
      });
    } catch (err) {
      console.error('Error fetching playbook objections:', err);
    }
  }, []);

  const addObjection = useCallback(async (playbookId: string, data: { objection: string; responses: { text: string; type: string; example: string }[]; category?: ObjectionCategory; severity?: ObjectionSeverity; signalsWorking?: string; ifNotWorking?: string; sortOrder?: number }): Promise<PlaybookObjection | null> => {
    try {
      const { data: row, error } = await db
        .from('playbook_objections')
        .insert({
          playbook_id: playbookId,
          objection: data.objection,
          responses: data.responses,
          category: data.category || null,
          severity: data.severity || null,
          signals_working: data.signalsWorking || null,
          if_not_working: data.ifNotWorking || null,
          sort_order: data.sortOrder ?? 0,
        })
        .select()
        .single();

      if (error) throw error;

      const objection: PlaybookObjection = {
        id: row.id,
        playbookId: row.playbook_id,
        objection: row.objection,
        category: row.category,
        severity: row.severity,
        responses: row.responses || [],
        signalsWorking: row.signals_working,
        ifNotWorking: row.if_not_working,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
      };

      setObjections(prev => [...prev, objection]);
      return objection;
    } catch (err) {
      console.error('Error adding playbook objection:', err);
      return null;
    }
  }, []);

  const updateObjection = useCallback(async (id: string, updates: Partial<Pick<PlaybookObjection, 'objection' | 'responses' | 'category' | 'severity' | 'signalsWorking' | 'ifNotWorking' | 'sortOrder'>>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.objection !== undefined) dbUpdates.objection = updates.objection;
      if (updates.responses !== undefined) dbUpdates.responses = updates.responses;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.severity !== undefined) dbUpdates.severity = updates.severity;
      if (updates.signalsWorking !== undefined) dbUpdates.signals_working = updates.signalsWorking;
      if (updates.ifNotWorking !== undefined) dbUpdates.if_not_working = updates.ifNotWorking;
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;

      const { error } = await db.from('playbook_objections').update(dbUpdates).eq('id', id);
      if (error) throw error;
      setObjections(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
    } catch (err) {
      console.error('Error updating playbook objection:', err);
    }
  }, []);

  const deleteObjection = useCallback(async (id: string) => {
    try {
      const { error } = await db.from('playbook_objections').delete().eq('id', id);
      if (error) throw error;
      setObjections(prev => prev.filter(o => o.id !== id));
    } catch (err) {
      console.error('Error deleting playbook objection:', err);
    }
  }, []);

  // ===== ITEMS =====

  const fetchItems = useCallback(async (playbookId: string) => {
    try {
      const { data, error } = await db
        .from('playbook_items')
        .select('*')
        .eq('playbook_id', playbookId)
        .order('sort_order');

      if (error) throw error;

      const mapped = (data || []).map((i: any) => ({
        id: i.id,
        playbookId: i.playbook_id,
        stageId: i.stage_id,
        itemType: i.item_type,
        title: i.title,
        content: i.content || {},
        sortOrder: i.sort_order,
        createdAt: i.created_at,
      }));

      setItems(prev => {
        const others = prev.filter(i => i.playbookId !== playbookId);
        return [...others, ...mapped];
      });
    } catch (err) {
      console.error('Error fetching playbook items:', err);
    }
  }, []);

  const addItem = useCallback(async (playbookId: string, data: { title: string; content?: Record<string, any>; itemType: ItemType; stageId?: string; sortOrder?: number }): Promise<PlaybookItem | null> => {
    try {
      const { data: row, error } = await db
        .from('playbook_items')
        .insert({
          playbook_id: playbookId,
          stage_id: data.stageId || null,
          title: data.title,
          content: data.content || {},
          item_type: data.itemType,
          sort_order: data.sortOrder ?? 0,
        })
        .select()
        .single();

      if (error) throw error;

      const item: PlaybookItem = {
        id: row.id,
        playbookId: row.playbook_id,
        stageId: row.stage_id,
        itemType: row.item_type,
        title: row.title,
        content: row.content || {},
        sortOrder: row.sort_order,
        createdAt: row.created_at,
      };

      setItems(prev => [...prev, item]);
      return item;
    } catch (err) {
      console.error('Error adding playbook item:', err);
      return null;
    }
  }, []);

  const updateItem = useCallback(async (id: string, updates: Partial<Pick<PlaybookItem, 'title' | 'content' | 'itemType' | 'stageId' | 'sortOrder'>>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.content !== undefined) dbUpdates.content = updates.content;
      if (updates.itemType !== undefined) dbUpdates.item_type = updates.itemType;
      if (updates.stageId !== undefined) dbUpdates.stage_id = updates.stageId;
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;

      const { error } = await db.from('playbook_items').update(dbUpdates).eq('id', id);
      if (error) throw error;
      setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    } catch (err) {
      console.error('Error updating playbook item:', err);
    }
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    try {
      const { error } = await db.from('playbook_items').delete().eq('id', id);
      if (error) throw error;
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error('Error deleting playbook item:', err);
    }
  }, []);

  // ===== REALTIME =====
  // Refetches the playbooks list whenever any playbook row changes for
  // this organization. Until this was added, a teammate creating a
  // playbook didn't show up until F5. We only listen on the top-level
  // table; the sub-tables (stages, steps, scripts, etc.) are typically
  // refetched on demand when the user opens a specific playbook.
  useEffect(() => {
    if (!organization?.id) return;
    const orgFilter = `organization_id=eq.${organization.id}`;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const debounce = (fn: () => void) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(fn, 300);
    };
    const channel = supabase
      .channel(`playbooks:${organization.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playbooks', filter: orgFilter },
        () => debounce(fetchPlaybooks))
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [organization?.id, fetchPlaybooks]);

  // Refetch on tab resume.
  useEffect(() => {
    if (!organization?.id) return;
    return onTabResumed(() => { fetchPlaybooks(); });
  }, [organization?.id, fetchPlaybooks]);

  const value: PlaybookContextType = {
    playbooks, fetchPlaybooks, addPlaybook, updatePlaybook, deletePlaybook, createPlaybookFromTemplate,
    stages, fetchStages, addStage, updateStage, deleteStage,
    steps, fetchSteps, addStep, updateStep, deleteStep,
    scripts, fetchScripts, addScript, updateScript, deleteScript,
    questions, fetchQuestions, addQuestion, updateQuestion, deleteQuestion,
    objections, fetchObjections, addObjection, updateObjection, deleteObjection,
    items, fetchItems, addItem, updateItem, deleteItem,
    loading,
  };

  return <PlaybookContext.Provider value={value}>{children}</PlaybookContext.Provider>;
}

export function usePlaybook() {
  const context = useContext(PlaybookContext);
  if (!context) throw new Error('usePlaybook must be used within PlaybookProvider');
  return context;
}
