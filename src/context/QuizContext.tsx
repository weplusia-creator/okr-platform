import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { supabase, onTabResumed } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type {
  Quiz, QuizQuestion, QuizOption, QuizSession, QuizParticipant, QuizResponse,
  QuizMode, QuizStatus, QuestionType,
} from '../types/quiz';
import {
  mapQuizRow, mapQuestionRow, mapOptionRow, mapSessionRow, mapParticipantRow, mapResponseRow,
} from '../types/quiz';

const db = supabase as any;

// ===== Context Type =====

interface QuizContextType {
  // State
  quizzes: Quiz[];
  loading: boolean;

  // Quizzes CRUD
  fetchQuizzes: () => Promise<void>;
  addQuiz: (data: { title: string; description?: string; mode: QuizMode }) => Promise<Quiz | null>;
  updateQuiz: (id: string, updates: Partial<{ title: string; description: string | null; mode: QuizMode; status: QuizStatus; timeLimitSeconds: number | null; passingScore: number; shuffleQuestions: boolean; showAnswersAfter: boolean }>) => Promise<void>;
  deleteQuiz: (id: string) => Promise<void>;

  // Questions CRUD
  fetchQuestions: (quizId: string) => Promise<QuizQuestion[]>;
  addQuestion: (quizId: string, data: { questionType: QuestionType; questionText: string; explanation?: string; points?: number; timeLimitSeconds?: number | null; orderNum: number }) => Promise<QuizQuestion | null>;
  updateQuestion: (id: string, updates: Partial<{ questionType: QuestionType; questionText: string; explanation: string | null; points: number; timeLimitSeconds: number | null; orderNum: number }>) => Promise<void>;
  deleteQuestion: (id: string) => Promise<void>;

  // Options CRUD
  fetchOptions: (questionId: string) => Promise<QuizOption[]>;
  addOption: (questionId: string, data: { optionText: string; isCorrect: boolean; orderNum: number }) => Promise<QuizOption | null>;
  updateOption: (id: string, updates: Partial<{ optionText: string; isCorrect: boolean; orderNum: number }>) => Promise<void>;
  deleteOption: (id: string) => Promise<void>;

  // Sessions (live mode)
  createSession: (quizId: string) => Promise<QuizSession | null>;
  updateSession: (id: string, updates: Partial<{ status: string; currentQuestionIndex: number; startedAt: string; finishedAt: string }>) => Promise<void>;
  fetchSession: (quizId: string) => Promise<QuizSession | null>;

  // Results
  fetchParticipants: (quizId: string) => Promise<QuizParticipant[]>;
  fetchResponses: (quizId: string) => Promise<QuizResponse[]>;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

export function QuizProvider({ children }: { children: ReactNode }) {
  const { appUser, organization } = useAuth();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(false);

  // ===== Quizzes =====

  const fetchQuizzes = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      const { data, error } = await db
        .from('quizzes')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setQuizzes((data || []).map(mapQuizRow));
    } catch (err) {
      console.error('Error fetching quizzes:', err);
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  const addQuiz = useCallback(async (data: { title: string; description?: string; mode: QuizMode }): Promise<Quiz | null> => {
    if (!organization?.id || !appUser?.id) return null;
    try {
      const { data: row, error } = await db
        .from('quizzes')
        .insert({
          organization_id: organization.id,
          title: data.title,
          description: data.description || null,
          mode: data.mode,
          created_by: appUser.id,
        })
        .select()
        .single();
      if (error) throw error;
      const quiz = mapQuizRow(row);
      setQuizzes(prev => [quiz, ...prev]);
      return quiz;
    } catch (err) {
      console.error('Error adding quiz:', err);
      return null;
    }
  }, [organization?.id, appUser?.id]);

  const updateQuiz = useCallback(async (id: string, updates: Record<string, any>) => {
    try {
      const row: Record<string, any> = {};
      if (updates.title !== undefined) row.title = updates.title;
      if (updates.description !== undefined) row.description = updates.description;
      if (updates.mode !== undefined) row.mode = updates.mode;
      if (updates.status !== undefined) row.status = updates.status;
      if (updates.timeLimitSeconds !== undefined) row.time_limit_seconds = updates.timeLimitSeconds;
      if (updates.passingScore !== undefined) row.passing_score = updates.passingScore;
      if (updates.shuffleQuestions !== undefined) row.shuffle_questions = updates.shuffleQuestions;
      if (updates.showAnswersAfter !== undefined) row.show_answers_after = updates.showAnswersAfter;
      row.updated_at = new Date().toISOString();

      const { error } = await db.from('quizzes').update(row).eq('id', id);
      if (error) throw error;

      setQuizzes(prev => prev.map(q => q.id === id ? { ...q, ...updates, updatedAt: row.updated_at } : q));
    } catch (err) {
      console.error('Error updating quiz:', err);
    }
  }, []);

  const deleteQuiz = useCallback(async (id: string) => {
    try {
      const { error } = await db.from('quizzes').delete().eq('id', id);
      if (error) throw error;
      setQuizzes(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      console.error('Error deleting quiz:', err);
    }
  }, []);

  // ===== Questions =====

  const fetchQuestions = useCallback(async (quizId: string): Promise<QuizQuestion[]> => {
    try {
      const { data, error } = await db
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_num');
      if (error) throw error;
      return (data || []).map(mapQuestionRow);
    } catch (err) {
      console.error('Error fetching questions:', err);
      return [];
    }
  }, []);

  const addQuestion = useCallback(async (quizId: string, data: { questionType: QuestionType; questionText: string; explanation?: string; points?: number; timeLimitSeconds?: number | null; orderNum: number }): Promise<QuizQuestion | null> => {
    try {
      const { data: row, error } = await db
        .from('quiz_questions')
        .insert({
          quiz_id: quizId,
          question_type: data.questionType,
          question_text: data.questionText,
          explanation: data.explanation || null,
          points: data.points ?? 1,
          time_limit_seconds: data.timeLimitSeconds ?? null,
          order_num: data.orderNum,
        })
        .select()
        .single();
      if (error) throw error;
      return mapQuestionRow(row);
    } catch (err) {
      console.error('Error adding question:', err);
      return null;
    }
  }, []);

  const updateQuestion = useCallback(async (id: string, updates: Record<string, any>) => {
    try {
      const row: Record<string, any> = {};
      if (updates.questionType !== undefined) row.question_type = updates.questionType;
      if (updates.questionText !== undefined) row.question_text = updates.questionText;
      if (updates.explanation !== undefined) row.explanation = updates.explanation;
      if (updates.points !== undefined) row.points = updates.points;
      if (updates.timeLimitSeconds !== undefined) row.time_limit_seconds = updates.timeLimitSeconds;
      if (updates.orderNum !== undefined) row.order_num = updates.orderNum;

      const { error } = await db.from('quiz_questions').update(row).eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('Error updating question:', err);
    }
  }, []);

  const deleteQuestion = useCallback(async (id: string) => {
    try {
      const { error } = await db.from('quiz_questions').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('Error deleting question:', err);
    }
  }, []);

  // ===== Options =====

  const fetchOptions = useCallback(async (questionId: string): Promise<QuizOption[]> => {
    try {
      const { data, error } = await db
        .from('quiz_options')
        .select('*')
        .eq('question_id', questionId)
        .order('order_num');
      if (error) throw error;
      return (data || []).map(mapOptionRow);
    } catch (err) {
      console.error('Error fetching options:', err);
      return [];
    }
  }, []);

  const addOption = useCallback(async (questionId: string, data: { optionText: string; isCorrect: boolean; orderNum: number }): Promise<QuizOption | null> => {
    try {
      const { data: row, error } = await db
        .from('quiz_options')
        .insert({
          question_id: questionId,
          option_text: data.optionText,
          is_correct: data.isCorrect,
          order_num: data.orderNum,
        })
        .select()
        .single();
      if (error) throw error;
      return mapOptionRow(row);
    } catch (err) {
      console.error('Error adding option:', err);
      return null;
    }
  }, []);

  const updateOption = useCallback(async (id: string, updates: Record<string, any>) => {
    try {
      const row: Record<string, any> = {};
      if (updates.optionText !== undefined) row.option_text = updates.optionText;
      if (updates.isCorrect !== undefined) row.is_correct = updates.isCorrect;
      if (updates.orderNum !== undefined) row.order_num = updates.orderNum;

      const { error } = await db.from('quiz_options').update(row).eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('Error updating option:', err);
    }
  }, []);

  const deleteOption = useCallback(async (id: string) => {
    try {
      const { error } = await db.from('quiz_options').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('Error deleting option:', err);
    }
  }, []);

  // ===== Sessions (live mode) =====

  const createSession = useCallback(async (quizId: string): Promise<QuizSession | null> => {
    try {
      const { data: row, error } = await db
        .from('quiz_sessions')
        .insert({ quiz_id: quizId })
        .select()
        .single();
      if (error) throw error;
      return mapSessionRow(row);
    } catch (err) {
      console.error('Error creating session:', err);
      return null;
    }
  }, []);

  const updateSession = useCallback(async (id: string, updates: Record<string, any>) => {
    try {
      const row: Record<string, any> = {};
      if (updates.status !== undefined) row.status = updates.status;
      if (updates.currentQuestionIndex !== undefined) row.current_question_index = updates.currentQuestionIndex;
      if (updates.startedAt !== undefined) row.started_at = updates.startedAt;
      if (updates.finishedAt !== undefined) row.finished_at = updates.finishedAt;

      const { error } = await db.from('quiz_sessions').update(row).eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('Error updating session:', err);
    }
  }, []);

  const fetchSession = useCallback(async (quizId: string): Promise<QuizSession | null> => {
    try {
      const { data, error } = await db
        .from('quiz_sessions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return data && data.length > 0 ? mapSessionRow(data[0]) : null;
    } catch (err) {
      console.error('Error fetching session:', err);
      return null;
    }
  }, []);

  // ===== Results =====

  const fetchParticipants = useCallback(async (quizId: string): Promise<QuizParticipant[]> => {
    try {
      const { data, error } = await db
        .from('quiz_participants')
        .select('*')
        .eq('quiz_id', quizId)
        .order('total_score', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapParticipantRow);
    } catch (err) {
      console.error('Error fetching participants:', err);
      return [];
    }
  }, []);

  const fetchResponses = useCallback(async (quizId: string): Promise<QuizResponse[]> => {
    try {
      // Fetch via participants join
      const { data: participants } = await db
        .from('quiz_participants')
        .select('id')
        .eq('quiz_id', quizId);
      if (!participants || participants.length === 0) return [];

      const participantIds = participants.map((p: any) => p.id);
      const { data, error } = await db
        .from('quiz_responses')
        .select('*')
        .in('participant_id', participantIds)
        .order('created_at');
      if (error) throw error;
      return (data || []).map(mapResponseRow);
    } catch (err) {
      console.error('Error fetching responses:', err);
      return [];
    }
  }, []);

  // ===== REALTIME =====
  // Sync quizzes list across tabs/users. Quiz live sessions (KAHOOT-style)
  // also benefit: a facilitator starting a session in one tab makes it
  // appear immediately in the participants' tabs without refresh.
  useEffect(() => {
    if (!organization?.id) return;
    const orgFilter = `organization_id=eq.${organization.id}`;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const debounce = (fn: () => void) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(fn, 300);
    };
    const channel = supabase
      .channel(`quizzes:${organization.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quizzes', filter: orgFilter },
        () => debounce(fetchQuizzes))
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [organization?.id, fetchQuizzes]);

  useEffect(() => {
    if (!organization?.id) return;
    return onTabResumed(() => { fetchQuizzes(); });
  }, [organization?.id, fetchQuizzes]);

  // ===== Provider =====

  const value: QuizContextType = {
    quizzes, loading,
    fetchQuizzes, addQuiz, updateQuiz, deleteQuiz,
    fetchQuestions, addQuestion, updateQuestion, deleteQuestion,
    fetchOptions, addOption, updateOption, deleteOption,
    createSession, updateSession, fetchSession,
    fetchParticipants, fetchResponses,
  };

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}

export function useQuiz() {
  const context = useContext(QuizContext);
  if (!context) throw new Error('useQuiz must be used within QuizProvider');
  return context;
}
