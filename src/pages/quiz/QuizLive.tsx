import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, SkipForward, Users, Trophy, Loader2, QrCode, Copy, Check, Clock, Brain } from 'lucide-react';
import QRCode from 'react-qr-code';
import { supabase } from '../../lib/supabase';
import { useQuiz } from '../../context/QuizContext';
import { OPTION_COLORS, mapQuizRow, mapQuestionRow, mapOptionRow, mapParticipantRow } from '../../types/quiz';
import type { Quiz, QuizQuestion, QuizOption, QuizSession, QuizParticipant } from '../../types/quiz';

const db = supabase as any;

type LiveStage = 'loading' | 'lobby' | 'question' | 'question_results' | 'leaderboard' | 'finished';

export function QuizLive() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { createSession, updateSession } = useQuiz();

  const [stage, setStage] = useState<LiveStage>('loading');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<(QuizQuestion & { options: QuizOption[] })[]>([]);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [participants, setParticipants] = useState<QuizParticipant[]>([]);
  const [responseCount, setResponseCount] = useState(0);
  const [optionCounts, setOptionCounts] = useState<Record<string, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load quiz + create/resume session
  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await db.from('quizzes').select('*').eq('id', id).single();
      if (!data) { navigate('/quizzes'); return; }
      setQuiz(mapQuizRow(data));

      // Load questions
      const { data: qRows } = await db.from('quiz_questions').select('*').eq('quiz_id', id).order('order_num');
      const qs: (QuizQuestion & { options: QuizOption[] })[] = [];
      for (const row of (qRows || [])) {
        const q = mapQuestionRow(row);
        const { data: oRows } = await db.from('quiz_options').select('*').eq('question_id', q.id).order('order_num');
        qs.push({ ...q, options: (oRows || []).map(mapOptionRow) });
      }
      setQuestions(qs);

      // Check for existing session
      const { data: sessions } = await db.from('quiz_sessions').select('*').eq('quiz_id', id).in('status', ['waiting', 'in_progress', 'paused']).order('created_at', { ascending: false }).limit(1);
      let sess: QuizSession | null = null;
      if (sessions && sessions.length > 0) {
        sess = {
          id: sessions[0].id, quizId: sessions[0].quiz_id, status: sessions[0].status,
          currentQuestionIndex: sessions[0].current_question_index ?? 0,
          startedAt: sessions[0].started_at, finishedAt: sessions[0].finished_at, createdAt: sessions[0].created_at,
        };
      } else {
        sess = await createSession(id);
      }
      if (!sess) { navigate('/quizzes'); return; }
      setSession(sess);
      setCurrentIndex(sess.currentQuestionIndex);

      // Load participants
      const { data: pts } = await db.from('quiz_participants').select('*').eq('session_id', sess.id).order('total_score', { ascending: false });
      setParticipants((pts || []).map(mapParticipantRow));

      if (sess.status === 'waiting') setStage('lobby');
      else if (sess.status === 'in_progress') setStage('question');
      else setStage('lobby');
    } finally {
      if (stage === 'loading') setStage(prev => prev === 'loading' ? 'lobby' : prev);
    }
  }, [id, createSession, navigate, stage]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime: participants joining + responses
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel(`quiz-live-${session.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'quiz_participants',
      }, async () => {
        const { data } = await db.from('quiz_participants').select('*').eq('session_id', session.id).order('total_score', { ascending: false });
        setParticipants((data || []).map(mapParticipantRow));
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'quiz_responses',
      }, async () => {
        // Refresh response count for current question
        if (questions[currentIndex]) {
          const { data: resps } = await db.from('quiz_responses').select('selected_option_id').eq('question_id', questions[currentIndex].id);
          setResponseCount(resps?.length || 0);
          const counts: Record<string, number> = {};
          (resps || []).forEach((r: any) => {
            if (r.selected_option_id) counts[r.selected_option_id] = (counts[r.selected_option_id] || 0) + 1;
          });
          setOptionCounts(counts);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session, questions, currentIndex]);

  // Timer
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

  useEffect(() => {
    if (timeLeft === 0 && stage === 'question') {
      showQuestionResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // Actions
  const startQuiz = async () => {
    if (!session) return;
    await updateSession(session.id, {
      status: 'in_progress',
      currentQuestionIndex: 0,
      startedAt: new Date().toISOString(),
    });
    setCurrentIndex(0);
    setStage('question');
    setResponseCount(0);
    setOptionCounts({});
    const limit = questions[0]?.timeLimitSeconds || quiz?.timeLimitSeconds;
    if (limit) startTimer(limit);
    else setTimeLeft(null);
  };

  const showQuestionResults = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    // Fetch final counts
    if (questions[currentIndex]) {
      const { data: resps } = await db.from('quiz_responses').select('selected_option_id').eq('question_id', questions[currentIndex].id);
      setResponseCount(resps?.length || 0);
      const counts: Record<string, number> = {};
      (resps || []).forEach((r: any) => {
        if (r.selected_option_id) counts[r.selected_option_id] = (counts[r.selected_option_id] || 0) + 1;
      });
      setOptionCounts(counts);
    }
    // Refresh leaderboard
    if (session) {
      const { data } = await db.from('quiz_participants').select('*').eq('session_id', session.id).order('total_score', { ascending: false });
      setParticipants((data || []).map(mapParticipantRow));
    }
    setStage('question_results');
  };

  const showLeaderboard = () => setStage('leaderboard');

  const nextQuestion = async () => {
    const next = currentIndex + 1;
    if (next >= questions.length) {
      await finishQuiz();
      return;
    }
    if (session) {
      await updateSession(session.id, { currentQuestionIndex: next });
    }
    setCurrentIndex(next);
    setResponseCount(0);
    setOptionCounts({});
    setStage('question');
    const limit = questions[next]?.timeLimitSeconds || quiz?.timeLimitSeconds;
    if (limit) startTimer(limit);
    else setTimeLeft(null);
  };

  const finishQuiz = async () => {
    if (session) {
      await updateSession(session.id, { status: 'finished', finishedAt: new Date().toISOString() });
    }
    // Refresh final leaderboard
    if (session) {
      const { data } = await db.from('quiz_participants').select('*').eq('session_id', session.id).order('total_score', { ascending: false });
      setParticipants((data || []).map(mapParticipantRow));
    }
    setStage('finished');
  };

  const handleCopy = async () => {
    if (!quiz) return;
    await navigator.clipboard.writeText(`${window.location.origin}/quiz/${quiz.token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentQ = questions[currentIndex];
  const activeParticipants = participants.filter(p => p.status === 'active').length + participants.filter(p => p.status === 'finished').length;

  if (stage === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // ============ FULLSCREEN LIVE LAYOUT ============
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white flex flex-col">
      {/* Top bar */}
      <div className="px-6 py-3 flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/quizzes/${id}`)} className="p-1 hover:bg-white/10 rounded">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Brain className="w-5 h-5" />
          <span className="font-bold">{quiz?.title}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {activeParticipants}</span>
          {stage === 'question' && (
            <>
              <span>{currentIndex + 1}/{questions.length}</span>
              {timeLeft !== null && (
                <span className={`flex items-center gap-1 font-mono font-bold text-lg ${timeLeft <= 5 ? 'text-red-300 animate-pulse' : ''}`}>
                  <Clock className="w-5 h-5" /> {timeLeft}s
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">

        {/* LOBBY */}
        {stage === 'lobby' && (
          <div className="text-center space-y-8 max-w-lg">
            <h1 className="text-4xl font-bold">{quiz?.title}</h1>
            <div className="bg-white p-6 rounded-2xl inline-block">
              {quiz && <QRCode value={`${window.location.origin}/quiz/${quiz.token}`} size={220} />}
            </div>
            <div className="flex items-center justify-center gap-2">
              <button onClick={handleCopy} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado!' : 'Copiar link'}
              </button>
            </div>
            <div>
              <p className="text-lg opacity-80 mb-2">Participantes conectados:</p>
              <p className="text-5xl font-bold">{activeParticipants}</p>
              <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-md mx-auto">
                {participants.slice(0, 20).map(p => (
                  <span key={p.id} className="bg-white/20 px-3 py-1 rounded-full text-sm">{p.displayName}</span>
                ))}
              </div>
            </div>
            <button
              onClick={startQuiz}
              disabled={activeParticipants === 0}
              className="px-10 py-4 bg-green-500 hover:bg-green-600 disabled:opacity-40 rounded-2xl text-xl font-bold transition-colors flex items-center gap-2 mx-auto"
            >
              <Play className="w-6 h-6" /> Comenzar ({questions.length} preguntas)
            </button>
          </div>
        )}

        {/* QUESTION */}
        {stage === 'question' && currentQ && (
          <div className="w-full max-w-4xl space-y-8">
            <div className="text-center">
              <p className="text-sm opacity-60 mb-2">Pregunta {currentIndex + 1} de {questions.length} - {currentQ.points} pts</p>
              <h2 className="text-3xl sm:text-4xl font-bold">{currentQ.questionText}</h2>
            </div>

            {currentQ.questionType !== 'short_answer' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentQ.options.map((opt, i) => {
                  const color = OPTION_COLORS[i % OPTION_COLORS.length];
                  return (
                    <div key={opt.id} className={`p-6 rounded-xl ${color.bg} text-white text-xl font-bold text-center`}>
                      {opt.optionText}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="text-center space-y-3">
              <p className="text-lg opacity-80">Respuestas recibidas: <span className="font-bold text-2xl">{responseCount}</span> / {activeParticipants}</p>
              <button onClick={showQuestionResults} className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-bold transition-colors">
                <SkipForward className="w-5 h-5 inline mr-2" /> Mostrar resultados
              </button>
            </div>
          </div>
        )}

        {/* QUESTION RESULTS */}
        {stage === 'question_results' && currentQ && (
          <div className="w-full max-w-4xl space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">{currentQ.questionText}</h2>
            </div>

            {currentQ.questionType !== 'short_answer' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentQ.options.map((opt, i) => {
                  const color = OPTION_COLORS[i % OPTION_COLORS.length];
                  const count = optionCounts[opt.id] || 0;
                  const pct = responseCount > 0 ? Math.round((count / responseCount) * 100) : 0;
                  return (
                    <div key={opt.id} className={`p-4 rounded-xl ${color.bg} text-white relative overflow-hidden ${opt.isCorrect ? 'ring-4 ring-white' : 'opacity-60'}`}>
                      <div className="relative z-10 flex items-center justify-between">
                        <span className="font-bold text-lg">{opt.optionText}</span>
                        <span className="font-bold text-2xl">{count} ({pct}%)</span>
                      </div>
                      {opt.isCorrect && <Check className="absolute top-2 right-2 w-8 h-8 opacity-30" />}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-center gap-4">
              <button onClick={showLeaderboard} className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-bold transition-colors flex items-center gap-2">
                <Trophy className="w-5 h-5" /> Ver ranking
              </button>
              <button onClick={nextQuestion} className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-xl font-bold transition-colors flex items-center gap-2">
                <SkipForward className="w-5 h-5" /> {currentIndex + 1 >= questions.length ? 'Finalizar' : 'Siguiente'}
              </button>
            </div>
          </div>
        )}

        {/* LEADERBOARD */}
        {(stage === 'leaderboard' || stage === 'finished') && (
          <div className="w-full max-w-2xl space-y-6">
            <div className="text-center">
              <Trophy className="w-16 h-16 mx-auto text-yellow-400 mb-2" />
              <h2 className="text-3xl font-bold">{stage === 'finished' ? 'Resultado Final' : 'Ranking'}</h2>
            </div>

            {/* Top 3 podium */}
            {participants.length >= 1 && (
              <div className="flex items-end justify-center gap-4">
                {[1, 0, 2].map(pos => {
                  const p = participants[pos];
                  if (!p) return <div key={pos} className="w-24" />;
                  const heights = ['h-32', 'h-24', 'h-20'];
                  const medals = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];
                  return (
                    <div key={p.id} className="text-center">
                      <p className="font-bold text-sm mb-1 truncate w-24">{p.displayName}</p>
                      <p className="text-2xl font-bold">{p.totalScore}</p>
                      <div className={`${heights[pos]} w-24 rounded-t-lg bg-white/20 flex items-center justify-center`}>
                        <Trophy className={`w-8 h-8 ${medals[pos]}`} />
                      </div>
                      <div className="bg-white/10 w-24 py-1 text-sm font-bold">{pos + 1}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full list */}
            <div className="bg-white/10 rounded-xl overflow-hidden">
              {participants.map((p, i) => (
                <div key={p.id} className={`flex items-center gap-3 px-4 py-2 ${i > 0 ? 'border-t border-white/10' : ''}`}>
                  <span className="w-8 text-center font-bold opacity-60">{i + 1}</span>
                  <span className="flex-1 font-medium">{p.displayName}</span>
                  <span className="font-bold">{p.totalScore} pts</span>
                  <span className="text-sm opacity-60">{p.totalCorrect}/{questions.length}</span>
                </div>
              ))}
            </div>

            {stage === 'leaderboard' && (
              <div className="text-center">
                <button onClick={nextQuestion} className="px-8 py-3 bg-green-500 hover:bg-green-600 rounded-xl font-bold text-lg transition-colors">
                  <SkipForward className="w-5 h-5 inline mr-2" /> {currentIndex + 1 >= questions.length ? 'Finalizar' : 'Siguiente pregunta'}
                </button>
              </div>
            )}

            {stage === 'finished' && (
              <div className="text-center">
                <button onClick={() => navigate(`/quizzes/${id}`)} className="px-8 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-bold transition-colors">
                  Ver detalle completo
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
