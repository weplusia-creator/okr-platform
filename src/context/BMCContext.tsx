import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { supabase, onTabResumed } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type {
  BmcTemplate, BmcCanvas, BmcBlock, BmcQuestion,
  BmcParticipant, BmcResponse, BmcVote,
  BmcCanvasType, BmcCanvasStatus, BmcShowResponses,
  BmcBlockType, BmcTemplateType, BmcResponseType,
  BmcParticipantRole,
} from '../types/bmc';
import { BMC_BLOCK_CONFIG, DEFAULT_TEMPLATE_QUESTIONS } from '../types/bmc';

interface BMCContextType {
  // Templates
  templates: BmcTemplate[];
  fetchTemplates: () => Promise<void>;
  addTemplate: (data: { name: string; description?: string; type: BmcTemplateType; questions: BmcTemplate['questions'] }) => Promise<BmcTemplate | null>;
  updateTemplate: (id: string, updates: Partial<Pick<BmcTemplate, 'name' | 'description' | 'type' | 'questions'>>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;

  // Canvases
  canvases: BmcCanvas[];
  fetchCanvases: (projectId?: string) => Promise<void>;
  addCanvas: (data: {
    projectId: string; name: string; description?: string;
    type?: BmcCanvasType; templateId?: string; predefinedQuestions?: BmcTemplate['questions']; dueDate?: string;
    anonymousResponses?: boolean; allowVoting?: boolean; showOthersResponses?: BmcShowResponses;
  }) => Promise<BmcCanvas | null>;
  updateCanvas: (id: string, updates: Partial<Pick<BmcCanvas, 'name' | 'description' | 'type' | 'status' | 'dueDate' | 'anonymousResponses' | 'allowVoting' | 'showOthersResponses'>>) => Promise<void>;
  deleteCanvas: (id: string) => Promise<void>;

  // Blocks
  blocks: BmcBlock[];
  fetchBlocks: (canvasId: string) => Promise<void>;
  consolidateBlock: (blockId: string, text: string) => Promise<void>;

  // Questions
  questions: BmcQuestion[];
  fetchQuestions: (blockId: string) => Promise<void>;
  addQuestion: (blockId: string, data: { question: string; helpText?: string; sortOrder: number; responseType?: BmcResponseType; required?: boolean }) => Promise<BmcQuestion | null>;
  updateQuestion: (id: string, updates: Partial<Pick<BmcQuestion, 'question' | 'helpText' | 'sortOrder' | 'responseType' | 'required'>>) => Promise<void>;
  deleteQuestion: (id: string) => Promise<void>;

  // Participants
  participants: BmcParticipant[];
  fetchParticipants: (canvasId: string) => Promise<void>;
  addParticipant: (canvasId: string, data: { userId?: string; email?: string; name?: string; role?: BmcParticipantRole }) => Promise<BmcParticipant | null>;
  removeParticipant: (id: string) => Promise<void>;
  updateParticipantStatus: (id: string, status: BmcParticipant['status']) => Promise<void>;

  // Responses
  responses: BmcResponse[];
  fetchResponses: (canvasId: string) => Promise<void>;
  saveResponse: (data: { canvasId: string; blockId: string; questionId: string; participantId: string; response: string; isAnonymous?: boolean }) => Promise<void>;

  // Votes
  votes: BmcVote[];
  fetchVotes: (canvasId: string) => Promise<void>;
  castVote: (responseId: string, participantId: string, value: number) => Promise<void>;

  loading: boolean;
}

const BMCContext = createContext<BMCContextType | undefined>(undefined);

export function BMCProvider({ children }: { children: ReactNode }) {
  const { appUser, organization } = useAuth();
  const db = supabase;

  const [templates, setTemplates] = useState<BmcTemplate[]>([]);
  const [canvases, setCanvases] = useState<BmcCanvas[]>([]);
  const [blocks, setBlocks] = useState<BmcBlock[]>([]);
  const [questions, setQuestions] = useState<BmcQuestion[]>([]);
  const [participants, setParticipants] = useState<BmcParticipant[]>([]);
  const [responses, setResponses] = useState<BmcResponse[]>([]);
  const [votes, setVotes] = useState<BmcVote[]>([]);
  const [loading, setLoading] = useState(false);

  // ===== TEMPLATES =====

  const fetchTemplates = useCallback(async () => {
    if (!organization?.id) return;
    try {
      const { data, error } = await db
        .from('bmc_templates')
        .select('*')
        .or(`organization_id.eq.${organization.id},is_public.eq.true`)
        .order('name');

      if (error) throw error;

      setTemplates((data || []).map((t: any) => ({
        id: t.id,
        organizationId: t.organization_id,
        name: t.name,
        description: t.description,
        type: t.type,
        isPublic: t.is_public,
        createdBy: t.created_by,
        questions: t.questions || {},
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      })));
    } catch (err) {
      console.error('Error fetching BMC templates:', err);
    }
  }, [organization?.id]);

  const addTemplate = useCallback(async (data: { name: string; description?: string; type: BmcTemplateType; questions: BmcTemplate['questions'] }): Promise<BmcTemplate | null> => {
    if (!organization?.id || !appUser?.id) return null;
    try {
      const { data: row, error } = await db
        .from('bmc_templates')
        .insert({
          organization_id: organization.id,
          name: data.name,
          description: data.description || null,
          type: data.type,
          created_by: appUser.id,
          questions: data.questions,
        })
        .select()
        .single();

      if (error) throw error;

      const template: BmcTemplate = {
        id: row.id,
        organizationId: row.organization_id,
        name: row.name,
        description: row.description,
        type: row.type,
        isPublic: row.is_public,
        createdBy: row.created_by,
        questions: row.questions || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      setTemplates(prev => [...prev, template].sort((a, b) => a.name.localeCompare(b.name)));
      return template;
    } catch (err) {
      console.error('Error adding BMC template:', err);
      return null;
    }
  }, [organization?.id, appUser?.id]);

  const updateTemplate = useCallback(async (id: string, updates: Partial<Pick<BmcTemplate, 'name' | 'description' | 'type' | 'questions'>>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.questions !== undefined) dbUpdates.questions = updates.questions;

      const { error } = await db.from('bmc_templates').update(dbUpdates).eq('id', id);
      if (error) throw error;

      setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    } catch (err) {
      console.error('Error updating BMC template:', err);
    }
  }, []);

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      const { error } = await db.from('bmc_templates').delete().eq('id', id);
      if (error) throw error;
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Error deleting BMC template:', err);
    }
  }, []);

  // ===== CANVASES =====

  const fetchCanvases = useCallback(async (projectId?: string) => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      let query = db.from('bmc_canvases').select('*').eq('organization_id', organization.id);
      if (projectId) query = query.eq('project_id', projectId);
      query = query.order('version', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;

      setCanvases((data || []).map((c: any) => ({
        id: c.id,
        organizationId: c.organization_id,
        projectId: c.project_id,
        name: c.name,
        description: c.description,
        version: c.version,
        type: c.type,
        status: c.status,
        templateId: c.template_id,
        dueDate: c.due_date,
        anonymousResponses: c.anonymous_responses,
        allowVoting: c.allow_voting,
        showOthersResponses: c.show_others_responses,
        createdBy: c.created_by,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })));
    } catch (err) {
      console.error('Error fetching BMC canvases:', err);
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  const addCanvas = useCallback(async (data: {
    projectId: string; name: string; description?: string;
    type?: BmcCanvasType; templateId?: string; predefinedQuestions?: BmcTemplate['questions']; dueDate?: string;
    anonymousResponses?: boolean; allowVoting?: boolean; showOthersResponses?: BmcShowResponses;
  }): Promise<BmcCanvas | null> => {
    if (!organization?.id || !appUser?.id) return null;
    try {
      // Get next version
      const { data: existing } = await db
        .from('bmc_canvases')
        .select('version')
        .eq('project_id', data.projectId)
        .order('version', { ascending: false })
        .limit(1);

      const nextVersion = (existing && existing.length > 0) ? existing[0].version + 1 : 1;

      const { data: row, error } = await db
        .from('bmc_canvases')
        .insert({
          organization_id: organization.id,
          project_id: data.projectId,
          name: data.name,
          description: data.description || null,
          version: nextVersion,
          type: data.type || 'initial',
          template_id: data.templateId || null,
          due_date: data.dueDate || null,
          anonymous_responses: data.anonymousResponses ?? false,
          allow_voting: data.allowVoting ?? false,
          show_others_responses: data.showOthersResponses || 'after',
          created_by: appUser.id,
        })
        .select()
        .single();

      if (error) throw error;

      const canvas: BmcCanvas = {
        id: row.id,
        organizationId: row.organization_id,
        projectId: row.project_id,
        name: row.name,
        description: row.description,
        version: row.version,
        type: row.type,
        status: row.status,
        templateId: row.template_id,
        dueDate: row.due_date,
        anonymousResponses: row.anonymous_responses,
        allowVoting: row.allow_voting,
        showOthersResponses: row.show_others_responses,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      setCanvases(prev => [...prev, canvas]);

      // Auto-create the 9 blocks
      const blockConfigs = Object.values(BMC_BLOCK_CONFIG);
      for (const cfg of blockConfigs) {
        await db.from('bmc_blocks').insert({
          canvas_id: canvas.id,
          type: cfg.type,
          name: cfg.name,
          description: cfg.description,
          icon: cfg.icon,
          color: cfg.color,
          sort_order: blockConfigs.indexOf(cfg),
        });
      }

      // If template provided, auto-create questions from template
      if (data.templateId) {
        const template = templates.find(t => t.id === data.templateId);
        if (template) {
          await _createQuestionsFromTemplate(canvas.id, template.questions);
        }
      } else if (data.predefinedQuestions) {
        await _createQuestionsFromTemplate(canvas.id, data.predefinedQuestions);
      }

      return canvas;
    } catch (err) {
      console.error('Error adding BMC canvas:', err);
      return null;
    }
  }, [organization?.id, appUser?.id, templates]);

  const _createQuestionsFromTemplate = async (canvasId: string, templateQuestions: BmcTemplate['questions']) => {
    try {
      // Fetch blocks for this canvas
      const { data: blockRows } = await db
        .from('bmc_blocks')
        .select('id, type')
        .eq('canvas_id', canvasId);

      if (!blockRows) return;

      const blockMap: Record<string, string> = {};
      for (const b of blockRows) {
        blockMap[b.type] = b.id;
      }

      for (const [blockType, qs] of Object.entries(templateQuestions)) {
        const blockId = blockMap[blockType];
        if (!blockId || !qs) continue;

        for (let i = 0; i < qs.length; i++) {
          const q = qs[i];
          await db.from('bmc_questions').insert({
            block_id: blockId,
            question: q.question,
            help_text: q.helpText || null,
            sort_order: i,
            response_type: q.responseType || 'text',
            required: q.required ?? true,
          });
        }
      }
    } catch (err) {
      console.error('Error creating questions from template:', err);
    }
  };

  const updateCanvas = useCallback(async (id: string, updates: Partial<Pick<BmcCanvas, 'name' | 'description' | 'type' | 'status' | 'dueDate' | 'anonymousResponses' | 'allowVoting' | 'showOthersResponses'>>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
      if (updates.anonymousResponses !== undefined) dbUpdates.anonymous_responses = updates.anonymousResponses;
      if (updates.allowVoting !== undefined) dbUpdates.allow_voting = updates.allowVoting;
      if (updates.showOthersResponses !== undefined) dbUpdates.show_others_responses = updates.showOthersResponses;

      const { error } = await db.from('bmc_canvases').update(dbUpdates).eq('id', id);
      if (error) throw error;
      setCanvases(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    } catch (err) {
      console.error('Error updating BMC canvas:', err);
    }
  }, []);

  const deleteCanvas = useCallback(async (id: string) => {
    try {
      const { error } = await db.from('bmc_canvases').delete().eq('id', id);
      if (error) throw error;
      setCanvases(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting BMC canvas:', err);
    }
  }, []);

  // ===== BLOCKS =====

  const fetchBlocks = useCallback(async (canvasId: string) => {
    try {
      const { data, error } = await db
        .from('bmc_blocks')
        .select('*')
        .eq('canvas_id', canvasId)
        .order('sort_order');

      if (error) throw error;

      setBlocks((data || []).map((b: any) => ({
        id: b.id,
        canvasId: b.canvas_id,
        type: b.type,
        name: b.name,
        description: b.description,
        icon: b.icon,
        color: b.color,
        sortOrder: b.sort_order,
        consolidatedResponse: b.consolidated_response,
        consolidatedBy: b.consolidated_by,
        consolidatedAt: b.consolidated_at,
        createdAt: b.created_at,
      })));
    } catch (err) {
      console.error('Error fetching BMC blocks:', err);
    }
  }, []);

  const consolidateBlock = useCallback(async (blockId: string, text: string) => {
    if (!appUser?.id) return;
    try {
      const now = new Date().toISOString();
      const { error } = await db
        .from('bmc_blocks')
        .update({
          consolidated_response: text,
          consolidated_by: appUser.id,
          consolidated_at: now,
        })
        .eq('id', blockId);

      if (error) throw error;

      setBlocks(prev => prev.map(b => b.id === blockId
        ? { ...b, consolidatedResponse: text, consolidatedBy: appUser.id, consolidatedAt: now }
        : b
      ));
    } catch (err) {
      console.error('Error consolidating block:', err);
    }
  }, [appUser?.id]);

  // ===== QUESTIONS =====

  const fetchQuestions = useCallback(async (blockId: string) => {
    try {
      const { data, error } = await db
        .from('bmc_questions')
        .select('*')
        .eq('block_id', blockId)
        .order('sort_order');

      if (error) throw error;

      const mapped = (data || []).map((q: any) => ({
        id: q.id,
        blockId: q.block_id,
        question: q.question,
        helpText: q.help_text,
        sortOrder: q.sort_order,
        responseType: q.response_type,
        required: q.required,
        options: q.options,
        createdAt: q.created_at,
      }));

      setQuestions(prev => {
        const others = prev.filter(q => q.blockId !== blockId);
        return [...others, ...mapped];
      });
    } catch (err) {
      console.error('Error fetching BMC questions:', err);
    }
  }, []);

  const addQuestion = useCallback(async (blockId: string, data: { question: string; helpText?: string; sortOrder: number; responseType?: BmcResponseType; required?: boolean }): Promise<BmcQuestion | null> => {
    try {
      const { data: row, error } = await db
        .from('bmc_questions')
        .insert({
          block_id: blockId,
          question: data.question,
          help_text: data.helpText || null,
          sort_order: data.sortOrder,
          response_type: data.responseType || 'text',
          required: data.required ?? true,
        })
        .select()
        .single();

      if (error) throw error;

      const q: BmcQuestion = {
        id: row.id,
        blockId: row.block_id,
        question: row.question,
        helpText: row.help_text,
        sortOrder: row.sort_order,
        responseType: row.response_type,
        required: row.required,
        options: row.options,
        createdAt: row.created_at,
      };

      setQuestions(prev => [...prev, q]);
      return q;
    } catch (err) {
      console.error('Error adding BMC question:', err);
      return null;
    }
  }, []);

  const updateQuestion = useCallback(async (id: string, updates: Partial<Pick<BmcQuestion, 'question' | 'helpText' | 'sortOrder' | 'responseType' | 'required'>>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.question !== undefined) dbUpdates.question = updates.question;
      if (updates.helpText !== undefined) dbUpdates.help_text = updates.helpText;
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
      if (updates.responseType !== undefined) dbUpdates.response_type = updates.responseType;
      if (updates.required !== undefined) dbUpdates.required = updates.required;

      const { error } = await db.from('bmc_questions').update(dbUpdates).eq('id', id);
      if (error) throw error;
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
    } catch (err) {
      console.error('Error updating BMC question:', err);
    }
  }, []);

  const deleteQuestion = useCallback(async (id: string) => {
    try {
      const { error } = await db.from('bmc_questions').delete().eq('id', id);
      if (error) throw error;
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      console.error('Error deleting BMC question:', err);
    }
  }, []);

  // ===== PARTICIPANTS =====

  const fetchParticipants = useCallback(async (canvasId: string) => {
    try {
      const { data, error } = await db
        .from('bmc_participants')
        .select('*')
        .eq('canvas_id', canvasId);

      if (error) throw error;

      setParticipants((data || []).map((p: any) => ({
        id: p.id,
        canvasId: p.canvas_id,
        userId: p.user_id,
        email: p.email,
        name: p.name,
        role: p.role,
        status: p.status,
        accessToken: p.access_token,
        invitedAt: p.invited_at,
        completedAt: p.completed_at,
      })));
    } catch (err) {
      console.error('Error fetching BMC participants:', err);
    }
  }, []);

  const addParticipant = useCallback(async (canvasId: string, data: { userId?: string; email?: string; name?: string; role?: BmcParticipantRole }): Promise<BmcParticipant | null> => {
    try {
      const { data: row, error } = await db
        .from('bmc_participants')
        .insert({
          canvas_id: canvasId,
          user_id: data.userId || null,
          email: data.email || null,
          name: data.name || null,
          role: data.role || 'participant',
        })
        .select()
        .single();

      if (error) throw error;

      const participant: BmcParticipant = {
        id: row.id,
        canvasId: row.canvas_id,
        userId: row.user_id,
        email: row.email,
        name: row.name,
        role: row.role,
        status: row.status,
        accessToken: row.access_token,
        invitedAt: row.invited_at,
        completedAt: row.completed_at,
      };

      setParticipants(prev => [...prev, participant]);
      return participant;
    } catch (err) {
      console.error('Error adding BMC participant:', err);
      return null;
    }
  }, []);

  const removeParticipant = useCallback(async (id: string) => {
    try {
      const { error } = await db.from('bmc_participants').delete().eq('id', id);
      if (error) throw error;
      setParticipants(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error removing BMC participant:', err);
    }
  }, []);

  const updateParticipantStatus = useCallback(async (id: string, status: BmcParticipant['status']) => {
    try {
      const updates: Record<string, unknown> = { status };
      if (status === 'completed') updates.completed_at = new Date().toISOString();

      const { error } = await db.from('bmc_participants').update(updates).eq('id', id);
      if (error) throw error;
      setParticipants(prev => prev.map(p => p.id === id ? { ...p, status, completedAt: status === 'completed' ? new Date().toISOString() : p.completedAt } : p));
    } catch (err) {
      console.error('Error updating participant status:', err);
    }
  }, []);

  // ===== RESPONSES =====

  const fetchResponses = useCallback(async (canvasId: string) => {
    try {
      const { data, error } = await db
        .from('bmc_responses')
        .select('*, bmc_participants(name, email)')
        .eq('canvas_id', canvasId);

      if (error) throw error;

      setResponses((data || []).map((r: any) => ({
        id: r.id,
        canvasId: r.canvas_id,
        blockId: r.block_id,
        questionId: r.question_id,
        participantId: r.participant_id,
        response: r.response,
        isAnonymous: r.is_anonymous,
        participantName: r.bmc_participants?.name || r.bmc_participants?.email || null,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })));
    } catch (err) {
      console.error('Error fetching BMC responses:', err);
    }
  }, []);

  const saveResponse = useCallback(async (data: {
    canvasId: string; blockId: string; questionId: string;
    participantId: string; response: string; isAnonymous?: boolean;
  }) => {
    try {
      const { data: row, error } = await db
        .from('bmc_responses')
        .upsert({
          canvas_id: data.canvasId,
          block_id: data.blockId,
          question_id: data.questionId,
          participant_id: data.participantId,
          response: data.response,
          is_anonymous: data.isAnonymous ?? false,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'question_id,participant_id' })
        .select()
        .single();

      if (error) throw error;

      if (!row) throw new Error('No se recibió respuesta del servidor');

      const resp: BmcResponse = {
        id: row.id,
        canvasId: row.canvas_id,
        blockId: row.block_id,
        questionId: row.question_id,
        participantId: row.participant_id,
        response: row.response,
        isAnonymous: row.is_anonymous,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      setResponses(prev => {
        const idx = prev.findIndex(r => r.questionId === resp.questionId && r.participantId === resp.participantId);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = resp;
          return copy;
        }
        return [...prev, resp];
      });
    } catch (err: any) {
      console.error('Error saving BMC response:', err);
      alert(`Error al guardar respuesta: ${err?.message || err}`);
    }
  }, []);

  // ===== VOTES =====

  const fetchVotes = useCallback(async (canvasId: string) => {
    try {
      const { data: responseIds } = await db
        .from('bmc_responses')
        .select('id')
        .eq('canvas_id', canvasId);

      if (!responseIds || responseIds.length === 0) {
        setVotes([]);
        return;
      }

      const { data, error } = await db
        .from('bmc_votes')
        .select('*')
        .in('response_id', responseIds.map(r => r.id));

      if (error) throw error;

      setVotes((data || []).map((v: any) => ({
        id: v.id,
        responseId: v.response_id,
        participantId: v.participant_id,
        value: v.value,
        createdAt: v.created_at,
      })));
    } catch (err) {
      console.error('Error fetching BMC votes:', err);
    }
  }, []);

  const castVote = useCallback(async (responseId: string, participantId: string, value: number) => {
    try {
      const { data: row, error } = await db
        .from('bmc_votes')
        .upsert({
          response_id: responseId,
          participant_id: participantId,
          value,
        }, { onConflict: 'response_id,participant_id' })
        .select()
        .single();

      if (error) throw error;

      const vote: BmcVote = {
        id: row.id,
        responseId: row.response_id,
        participantId: row.participant_id,
        value: row.value,
        createdAt: row.created_at,
      };

      setVotes(prev => {
        const idx = prev.findIndex(v => v.responseId === vote.responseId && v.participantId === vote.participantId);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = vote;
          return copy;
        }
        return [...prev, vote];
      });
    } catch (err) {
      console.error('Error casting BMC vote:', err);
    }
  }, []);

  // ===== REALTIME =====
  // Subscribe to bmc_canvases for this org so a new canvas (created by
  // a teammate or in another tab) appears without F5.
  useEffect(() => {
    if (!organization?.id) return;
    const orgFilter = `organization_id=eq.${organization.id}`;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const debounce = (fn: () => void) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(fn, 300);
    };
    const channel = supabase
      .channel(`bmc:${organization.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bmc_canvases', filter: orgFilter },
        () => debounce(fetchCanvases))
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [organization?.id, fetchCanvases]);

  useEffect(() => {
    if (!organization?.id) return;
    return onTabResumed(() => { fetchCanvases(); });
  }, [organization?.id, fetchCanvases]);

  const value: BMCContextType = {
    templates, fetchTemplates, addTemplate, updateTemplate, deleteTemplate,
    canvases, fetchCanvases, addCanvas, updateCanvas, deleteCanvas,
    blocks, fetchBlocks, consolidateBlock,
    questions, fetchQuestions, addQuestion, updateQuestion, deleteQuestion,
    participants, fetchParticipants, addParticipant, removeParticipant, updateParticipantStatus,
    responses, fetchResponses, saveResponse,
    votes, fetchVotes, castVote,
    loading,
  };

  return <BMCContext.Provider value={value}>{children}</BMCContext.Provider>;
}

export function useBMC() {
  const context = useContext(BMCContext);
  if (!context) throw new Error('useBMC must be used within BMCProvider');
  return context;
}
