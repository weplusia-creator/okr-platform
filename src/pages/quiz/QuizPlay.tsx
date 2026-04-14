import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, XCircle, CheckCircle, Clock, ChevronRight, Trophy, Brain, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { OPTION_COLORS } from '../../types/quiz';
import type { QuizQuestion, QuizOption, QuizSession } from '../../types/quiz';
import { mapQuestionRow, mapOptionRow, mapSessionRow } from '../../types/quiz';

const db = supabase as any;

type Stage = 'loading' | 'error' | 'join' | 'playing' | 'feedback' | 'waiting' | 'results';

interface QuizData {
  id: string; title: string; description: string | null; mode: 'live' | 'self_paced';
  timeLimitSeconds: number | null; passingScore: number; shuffleQuestions: boolean; showAnswersAfter: boolean;
}

export function QuizPlay() {
  const { token } = useParams<{ token: string }>();

  // State
  const [stage, setStage] = useState<Stage>('loading');
  const [error, setError] = useState('');
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [questions, setQuestions] = useState<(QuizQuestion & { options: QuizOption[] })[]>([]);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackCorrect, setFeedbackCorrect] = useState<boolean | null>(null);
  const [feedbackPoints, setFeedbackPoints] = useState(0);
  const [feedbackExplanation, setFeedbackExplanation] = useState<string | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Live mode state
  const [session, setSession] = useState<QuizSession | null>(null);

  // Load quiz data
  const loadQuiz = useCallback(async () => {
    if (!token) { setError('Token inválido'); setStage('error'); return; }
    try {
      const { data: q, error: err } = await db.from('quizzes').select('*').eq('token', token).eq('status', 'active').maybeSingle();
      if (err || !q) { setError('Quiz no encontrado o no disponible'); setStage('error'); return; }

      const quizData: QuizData = {
        id: q.id, title: q.title, description: q.description, mode: q.mode,
        timeLimitSeconds: q.time_limit_seconds, passingScore: q.passing_score ?? 60,
        shuffleQuestions: q.shuffle_questions ?? false, showAnswersAfter: q.show_answers_after ?? true,
      };
      setQuiz(quizData);

      // Fetch questions + options
      const { data: qRows } = await db.from('quiz_questions').select('*').eq('quiz_id', q.id).order('order_num');
      let qs = (qRows || []).map(mapQuestionRow);
      if (quizData.shuffleQuestions) qs = qs.sort(() => Math.random() - 0.5);

      const withOptions: (QuizQuestion & { options: QuizOption[] })[] = [];
      for (const question of qs) {
        if (question.questionType === 'short_answer') {
          withOptions.push({ ...question, options: [] });
        } else {
          const { data: oRows } = await db.from('quiz_options').select('*').eq('question_id', question.id).order('order_num');
          withOptions.push({ ...question, options: (oRows || []).map(mapOptionRow) });
        }
      }
      setQuestions(withOptions);

      // For live mode, check for active session
      if (quizData.mode === 'live') {
        const { data: sessions } = await db.from('quiz_sessions').select('*').eq('quiz_id', q.id).in('status', ['waiting', 'in_progress']).order('created_at', { ascending: false }).limit(1);
        if (sessions && sessions.length > 0) setSession(mapSessionRow(sessions[0]));
      }

      // Check if participant already exists (reconnect)
      const storedParticipantId = localStorage.getItem(`quiz-participant-${q.id}`);
      if (storedParticipantId) {
        const { data: existing } = await db.from('quiz_participants').select('*').eq('id', storedParticipantId).maybeSingle();
        if (existing && existing.status === 'active') {
          setParticipantId(existing.id);
          setDisplayName(existing.display_name);
          // Count already answered questions
          const { data: responses } = await db.from('quiz_responses').select('id, is_correct, points_earned').eq('participant_id', existing.id);
          const answered = responses?.length || 0;
          const score = responses?.reduce((s: number, r: any) => s + (r.points_earned || 0), 0) || 0;
          const correct = responses?.filter((r: any) => r.is_correct).length || 0;
          setTotalScore(score);
          setTotalCorrect(correct);
          if (answered >= withOptions.length) {
            setStage('results');
          } else {
            setCurrentIndex(answered);
            if (quizData.mode === 'live' && sessions?.[0]?.status === 'waiting') setStage('waiting');
            else setStage('playing');
          }
          return;
        }
      }

      setStage('join');
    } catch (err) {
      console.error('Error loading quiz:', err);
      setError('Error al cargar el quiz');
      setStage('error');
    }
  }, [token]);

  useEffect(() => { loadQuiz(); }, [loadQuiz]);

  // Timer logic
  const startTimer = useCallback((seconds: number) => {
    setTimeLeft(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Auto-submit when timer expires
  useEffect(() => {
    if (timeLeft === 0 && stage === 'playing' && !submitting) {
      handleSubmitAnswer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // Start timer for current question
  useEffect(() => {
    if (stage === 'playing' && questions[currentIndex]) {
      const q = questions[currentIndex];
      const limit = q.timeLimitSeconds || quiz?.timeLimitSeconds;
      setQuestionStartTime(Date.now());
      if (limit) startTimer(limit);
      else setTimeLeft(null);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, stage]);

  // Live mode: subscribe to session changes
  useEffect(() => {
    if (!quiz || quiz.mode !== 'live' || !session) return;

    const channel = supabase
      .channel(`quiz-session-${session.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'quiz_sessions',
        filter: `id=eq.${session.id}`,
      }, (payload: any) => {
        const updated = mapSessionRow(payload.new);
        setSession(updated);
        if (updated.status === 'in_progress') {
          setCurrentIndex(updated.currentQuestionIndex);
          setStage('playing');
          setSelectedOptionId(null);
          setTextAnswer('');
          setFeedbackCorrect(null);
        }
        if (updated.status === 'finished') setStage('results');
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [quiz, session]);

  // Join quiz
  const handleJoin = async () => {
    if (!displayName.trim() || !quiz) return;
    setSubmitting(true);
    try {
      const { data: participant, error: err } = await db.from('quiz_participants').insert({
        quiz_id: quiz.id,
        session_id: session?.id || null,
        display_name: displayName.trim(),
        total_questions: questions.length,
      }).select().single();
      if (err) throw err;

      setParticipantId(participant.id);
      localStorage.setItem(`quiz-participant-${quiz.id}`, participant.id);

      if (quiz.mode === 'live' && session?.status === 'waiting') setStage('waiting');
      else setStage('playing');
    } catch (err) {
      console.error('Error joining quiz:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Track cumulative score with ref to avoid stale closures
  const scoreRef = useRef({ score: 0, correct: 0 });

  // Submit answer
  const handleSubmitAnswer = async () => {
    if (!participantId || !questions[currentIndex] || submitting) return;
    setSubmitting(true);

    const q = questions[currentIndex];
    const responseTimeMs = Date.now() - questionStartTime;
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      let isCorrect = false;
      let pointsEarned = 0;

      if (q.questionType === 'short_answer') {
        const { data: opts } = await db.from('quiz_options').select('option_text').eq('question_id', q.id).eq('is_correct', true).limit(1);
        const expected = opts?.[0]?.option_text?.trim().toLowerCase();
        if (expected) {
          isCorrect = textAnswer.trim().toLowerCase() === expected;
        }
      } else if (selectedOptionId) {
        const selectedOpt = q.options.find(o => o.id === selectedOptionId);
        isCorrect = selectedOpt?.isCorrect ?? false;
      }

      if (isCorrect) pointsEarned = q.points;

      const { error: insertErr } = await db.from('quiz_responses').insert({
        participant_id: participantId,
        question_id: q.id,
        selected_option_id: selectedOptionId || null,
        text_answer: q.questionType === 'short_answer' ? textAnswer : null,
        is_correct: isCorrect,
        points_earned: pointsEarned,
        response_time_ms: responseTimeMs,
      });

      // Handle duplicate (already answered) — skip gracefully
      if (insertErr) {
        if (insertErr.code === '23505') {
          // UNIQUE violation — already answered, just advance
          console.warn('Response already submitted for this question, advancing');
        } else {
          console.error('Error inserting response:', insertErr);
          // Still advance — don't block the user
        }
      }

      // Update running totals
      scoreRef.current.score += pointsEarned;
      scoreRef.current.correct += isCorrect ? 1 : 0;
      setTotalScore(scoreRef.current.score);
      setTotalCorrect(scoreRef.current.correct);

      if (quiz?.showAnswersAfter) {
        setFeedbackCorrect(isCorrect);
        setFeedbackPoints(pointsEarned);
        setFeedbackExplanation(q.explanation);
        setSubmitting(false);
        setStage('feedback');
      } else {
        setSubmitting(false);
        await doAdvance(currentIndex + 1);
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
      // Don't block — advance anyway so user isn't stuck
      setSubmitting(false);
      if (quiz?.showAnswersAfter) {
        setFeedbackCorrect(false);
        setFeedbackPoints(0);
        setFeedbackExplanation(null);
        setStage('feedback');
      } else {
        await doAdvance(currentIndex + 1);
      }
    }
  };

  const doAdvance = async (nextIndex: number) => {
    if (nextIndex >= questions.length) {
      // Finish — use ref for accurate final score
      if (participantId) {
        try {
          await db.from('quiz_participants').update({
            status: 'finished',
            total_score: scoreRef.current.score,
            total_correct: scoreRef.current.correct,
            finished_at: new Date().toISOString(),
          }).eq('id', participantId);
        } catch (e) {
          console.error('Error updating participant:', e);
        }
      }
      setStage('results');
    } else {
      if (quiz?.mode === 'live') {
        setStage('waiting');
      } else {
        setCurrentIndex(nextIndex);
        setSelectedOptionId(null);
        setTextAnswer('');
        setFeedbackCorrect(null);
        setStage('playing');
      }
    }
  };

  const advanceToNext = () => doAdvance(currentIndex + 1);

  // Computed
  const currentQ = questions[currentIndex];
  const maxScore = questions.reduce((s, q) => s + q.points, 0);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const passed = percentage >= (quiz?.passingScore ?? 60);

  // ============ RENDER ============

  if (stage === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#2e2a2b]">
        <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#2e2a2b] p-4">
        <div className="card p-8 text-center max-w-md">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Error</h2>
          <p className="text-gray-500 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col">
      {/* Header bar */}
      <div className="bg-black/20 backdrop-blur-sm px-4 py-2 flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          <span className="font-bold text-sm">{quiz?.title}</span>
        </div>
        {stage === 'playing' && (
          <div className="flex items-center gap-3 text-sm">
            <span>{currentIndex + 1}/{questions.length}</span>
            {timeLeft !== null && (
              <span className={`flex items-center gap-1 font-mono font-bold ${timeLeft <= 5 ? 'text-red-300 animate-pulse' : ''}`}>
                <Clock className="w-4 h-4" /> {timeLeft}s
              </span>
            )}
            <span className="font-bold">{totalScore} pts</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {(stage === 'playing' || stage === 'feedback') && (
        <div className="h-1 bg-white/20">
          <div
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${((currentIndex + (stage === 'feedback' ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">

        {/* JOIN SCREEN */}
        {stage === 'join' && (
          <div className="card p-8 max-w-md w-full text-center space-y-6">
            <div>
              <Brain className="w-16 h-16 mx-auto text-indigo-500 mb-3" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{quiz?.title}</h1>
              {quiz?.description && <p className="text-sm text-gray-500 mt-2">{quiz.description}</p>}
              <p className="text-xs text-gray-400 mt-2">{questions.length} preguntas</p>
            </div>
            <div>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                className="input text-center text-lg"
                placeholder="Tu nombre"
                autoFocus
              />
            </div>
            <button
              onClick={handleJoin}
              disabled={!displayName.trim() || submitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-lg transition-colors"
            >
              {submitting ? 'Uniéndose...' : 'Comenzar'}
            </button>
          </div>
        )}

        {/* WAITING (live mode) */}
        {stage === 'waiting' && (
          <div className="text-center text-white space-y-4">
            <Loader2 className="w-12 h-12 animate-spin mx-auto opacity-70" />
            <p className="text-xl font-bold">Esperando al presentador...</p>
            <p className="text-sm opacity-70">La siguiente pregunta aparecerá automáticamente</p>
          </div>
        )}

        {/* PLAYING */}
        {stage === 'playing' && currentQ && (
          <div className="w-full max-w-2xl space-y-6">
            {/* Question */}
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg px-4">
                {currentQ.questionText}
              </h2>
            </div>

            {/* Options */}
            {currentQ.questionType !== 'short_answer' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQ.options.map((opt, i) => {
                  const color = OPTION_COLORS[i % OPTION_COLORS.length];
                  const isSelected = selectedOptionId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedOptionId(opt.id)}
                      className={`p-4 sm:p-6 rounded-xl font-bold text-lg text-white transition-all ${color.bg} ${color.hover} ${
                        isSelected ? 'ring-4 ring-white scale-[1.02]' : 'opacity-90 hover:opacity-100'
                      }`}
                    >
                      {opt.optionText}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="max-w-lg mx-auto">
                <input
                  type="text"
                  value={textAnswer}
                  onChange={e => setTextAnswer(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmitAnswer()}
                  className="w-full px-6 py-4 rounded-xl text-lg text-center bg-white/90 text-gray-900 placeholder-gray-400 outline-none focus:ring-4 focus:ring-white/50"
                  placeholder="Escribe tu respuesta..."
                  autoFocus
                />
              </div>
            )}

            {/* Submit */}
            <div className="text-center">
              <button
                onClick={handleSubmitAnswer}
                disabled={submitting || (currentQ.questionType !== 'short_answer' && !selectedOptionId) || (currentQ.questionType === 'short_answer' && !textAnswer.trim())}
                className="px-8 py-3 bg-white text-indigo-700 font-bold rounded-xl text-lg hover:bg-white/90 disabled:opacity-40 transition-all flex items-center gap-2 mx-auto"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                Confirmar
              </button>
            </div>
          </div>
        )}

        {/* FEEDBACK */}
        {stage === 'feedback' && (
          <div className="card p-8 max-w-md w-full text-center space-y-4">
            {feedbackCorrect ? (
              <>
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                <h2 className="text-2xl font-bold text-green-600">Correcto!</h2>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">+{feedbackPoints} pts</p>
              </>
            ) : (
              <>
                <XCircle className="w-16 h-16 text-red-500 mx-auto" />
                <h2 className="text-2xl font-bold text-red-600">Incorrecto</h2>
              </>
            )}
            {feedbackExplanation && (
              <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                {feedbackExplanation}
              </p>
            )}
            <button
              onClick={advanceToNext}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-lg transition-colors"
            >
              {currentIndex + 1 >= questions.length ? 'Ver resultados' : 'Siguiente pregunta'}
            </button>
          </div>
        )}

        {/* RESULTS */}
        {stage === 'results' && (
          <div className="card p-8 max-w-md w-full text-center space-y-6">
            <Trophy className={`w-20 h-20 mx-auto ${passed ? 'text-yellow-500' : 'text-gray-400'}`} />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {passed ? 'Aprobado!' : 'Quiz completado'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">{displayName}</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-3xl font-bold text-indigo-600">{totalScore}</p>
                <p className="text-xs text-gray-500">Puntos</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-indigo-600">{percentage}%</p>
                <p className="text-xs text-gray-500">Porcentaje</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-indigo-600">{totalCorrect}/{questions.length}</p>
                <p className="text-xs text-gray-500">Correctas</p>
              </div>
            </div>
            {!passed && quiz?.passingScore && (
              <p className="text-sm text-red-500">
                Se necesita {quiz.passingScore}% para aprobar
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
