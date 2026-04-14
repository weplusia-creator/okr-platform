// ===== Quiz Module Types =====

// ===== Enums/Union Types =====

export type QuizMode = 'live' | 'self_paced';
export type QuizStatus = 'draft' | 'active' | 'closed';
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';
export type SessionStatus = 'waiting' | 'in_progress' | 'paused' | 'finished';
export type ParticipantStatus = 'active' | 'finished';

// ===== Interfaces =====

export interface Quiz {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  mode: QuizMode;
  token: string;
  status: QuizStatus;
  timeLimitSeconds: number | null;
  passingScore: number;
  shuffleQuestions: boolean;
  showAnswersAfter: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  questionType: QuestionType;
  questionText: string;
  explanation: string | null;
  points: number;
  timeLimitSeconds: number | null;
  imageUrl: string | null;
  orderNum: number;
  createdAt: string;
}

export interface QuizOption {
  id: string;
  questionId: string;
  optionText: string;
  isCorrect: boolean;
  orderNum: number;
  createdAt: string;
}

export interface QuizSession {
  id: string;
  quizId: string;
  status: SessionStatus;
  currentQuestionIndex: number;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface QuizParticipant {
  id: string;
  quizId: string;
  sessionId: string | null;
  displayName: string;
  email: string | null;
  totalScore: number;
  totalCorrect: number;
  totalQuestions: number;
  status: ParticipantStatus;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface QuizResponse {
  id: string;
  participantId: string;
  questionId: string;
  selectedOptionId: string | null;
  textAnswer: string | null;
  isCorrect: boolean | null;
  pointsEarned: number;
  responseTimeMs: number | null;
  createdAt: string;
}

// ===== Config Maps =====

export const QUIZ_MODE_LABELS: Record<QuizMode, { label: string; description: string }> = {
  live: { label: 'Live (Kahoot)', description: 'El presentador controla el avance' },
  self_paced: { label: 'Examen', description: 'Cada participante avanza a su ritmo' },
};

export const QUIZ_STATUS_CONFIG: Record<QuizStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Borrador', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700' },
  active: { label: 'Activo', color: 'text-green-700 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
  closed: { label: 'Cerrado', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
};

export const QUESTION_TYPE_CONFIG: Record<QuestionType, { label: string; icon: string }> = {
  multiple_choice: { label: 'Opción múltiple', icon: 'ListChecks' },
  true_false: { label: 'Verdadero/Falso', icon: 'ToggleLeft' },
  short_answer: { label: 'Respuesta corta', icon: 'MessageSquare' },
};

export const SESSION_STATUS_CONFIG: Record<SessionStatus, { label: string; color: string }> = {
  waiting: { label: 'Esperando', color: 'text-yellow-600' },
  in_progress: { label: 'En curso', color: 'text-blue-600' },
  paused: { label: 'Pausado', color: 'text-orange-600' },
  finished: { label: 'Finalizado', color: 'text-gray-600' },
};

// Kahoot-style option colors
export const OPTION_COLORS = [
  { bg: 'bg-red-500', hover: 'hover:bg-red-600', text: 'text-white', icon: 'triangle' },
  { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', text: 'text-white', icon: 'diamond' },
  { bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600', text: 'text-white', icon: 'circle' },
  { bg: 'bg-green-500', hover: 'hover:bg-green-600', text: 'text-white', icon: 'square' },
];

// ===== Helpers =====

/** Map a DB row (snake_case) to Quiz (camelCase) */
export function mapQuizRow(row: any): Quiz {
  return {
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    description: row.description,
    mode: row.mode,
    token: row.token,
    status: row.status,
    timeLimitSeconds: row.time_limit_seconds,
    passingScore: row.passing_score ?? 60,
    shuffleQuestions: row.shuffle_questions ?? false,
    showAnswersAfter: row.show_answers_after ?? true,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapQuestionRow(row: any): QuizQuestion {
  return {
    id: row.id,
    quizId: row.quiz_id,
    questionType: row.question_type,
    questionText: row.question_text,
    explanation: row.explanation,
    points: row.points ?? 1,
    timeLimitSeconds: row.time_limit_seconds,
    imageUrl: row.image_url,
    orderNum: row.order_num ?? 0,
    createdAt: row.created_at,
  };
}

export function mapOptionRow(row: any): QuizOption {
  return {
    id: row.id,
    questionId: row.question_id,
    optionText: row.option_text,
    isCorrect: row.is_correct ?? false,
    orderNum: row.order_num ?? 0,
    createdAt: row.created_at,
  };
}

export function mapSessionRow(row: any): QuizSession {
  return {
    id: row.id,
    quizId: row.quiz_id,
    status: row.status,
    currentQuestionIndex: row.current_question_index ?? 0,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    createdAt: row.created_at,
  };
}

export function mapParticipantRow(row: any): QuizParticipant {
  return {
    id: row.id,
    quizId: row.quiz_id,
    sessionId: row.session_id,
    displayName: row.display_name,
    email: row.email,
    totalScore: row.total_score ?? 0,
    totalCorrect: row.total_correct ?? 0,
    totalQuestions: row.total_questions ?? 0,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    createdAt: row.created_at,
  };
}

export function mapResponseRow(row: any): QuizResponse {
  return {
    id: row.id,
    participantId: row.participant_id,
    questionId: row.question_id,
    selectedOptionId: row.selected_option_id,
    textAnswer: row.text_answer,
    isCorrect: row.is_correct,
    pointsEarned: row.points_earned ?? 0,
    responseTimeMs: row.response_time_ms,
    createdAt: row.created_at,
  };
}
