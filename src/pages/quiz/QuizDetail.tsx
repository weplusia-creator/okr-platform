import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, Trophy, CheckCircle, XCircle, Clock, QrCode, Copy, Check,
  Radio, Pencil, BarChart3, Loader2,
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { supabase } from '../../lib/supabase';
import { useQuiz } from '../../context/QuizContext';
import { QUIZ_STATUS_CONFIG, QUIZ_MODE_LABELS, mapQuizRow, mapQuestionRow, mapOptionRow } from '../../types/quiz';
import type { Quiz, QuizQuestion, QuizOption, QuizParticipant, QuizResponse } from '../../types/quiz';

const db = supabase as any;

export function QuizDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchParticipants, fetchResponses, updateQuiz } = useQuiz();

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<(QuizQuestion & { options: QuizOption[] })[]>([]);
  const [participants, setParticipants] = useState<QuizParticipant[]>([]);
  const [responses, setResponses] = useState<QuizResponse[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'leaderboard' | 'questions'>('leaderboard');

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await db.from('quizzes').select('*').eq('id', id).single();
      if (!data) { navigate('/quizzes'); return; }
      setQuiz(mapQuizRow(data));

      const { data: qRows } = await db.from('quiz_questions').select('*').eq('quiz_id', id).order('order_num');
      const qs: (QuizQuestion & { options: QuizOption[] })[] = [];
      for (const row of (qRows || [])) {
        const q = mapQuestionRow(row);
        const { data: oRows } = await db.from('quiz_options').select('*').eq('question_id', q.id).order('order_num');
        qs.push({ ...q, options: (oRows || []).map(mapOptionRow) });
      }
      setQuestions(qs);

      const pts = await fetchParticipants(id);
      setParticipants(pts);
      const resps = await fetchResponses(id);
      setResponses(resps);
    } finally {
      setLoading(false);
    }
  }, [id, fetchParticipants, fetchResponses, navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime subscription
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`quiz-results-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_participants' }, () => {
        fetchParticipants(id).then(setParticipants);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_responses' }, () => {
        fetchResponses(id).then(setResponses);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, fetchParticipants, fetchResponses]);

  if (loading || !quiz) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const getQuizUrl = () => `${window.location.origin}/quiz/${quiz.token}`;
  const handleCopy = async () => {
    await navigator.clipboard.writeText(getQuizUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const handleToggleStatus = async () => {
    const newStatus = quiz.status === 'active' ? 'closed' : 'active';
    await updateQuiz(quiz.id, { status: newStatus });
    setQuiz(prev => prev ? { ...prev, status: newStatus } : prev);
  };

  const maxScore = questions.reduce((s, q) => s + q.points, 0);
  const avgScore = participants.length > 0
    ? Math.round(participants.reduce((s, p) => s + p.totalScore, 0) / participants.length)
    : 0;
  const avgPercent = maxScore > 0 ? Math.round((avgScore / maxScore) * 100) : 0;
  const passCount = participants.filter(p => p.status === 'finished' && maxScore > 0 && (p.totalScore / maxScore) * 100 >= quiz.passingScore).length;
  const finishedCount = participants.filter(p => p.status === 'finished').length;

  // Per-question stats
  const questionStats = questions.map(q => {
    const qResponses = responses.filter(r => r.questionId === q.id);
    const total = qResponses.length;
    const correct = qResponses.filter(r => r.isCorrect).length;
    const rate = total > 0 ? Math.round((correct / total) * 100) : 0;
    // Option distribution
    const optionDist = q.options.map(o => ({
      ...o,
      count: qResponses.filter(r => r.selectedOptionId === o.id).length,
    }));
    return { question: q, total, correct, rate, optionDist };
  });

  const statusCfg = QUIZ_STATUS_CONFIG[quiz.status];
  const modeCfg = QUIZ_MODE_LABELS[quiz.mode];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/quizzes')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg mt-0.5">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{quiz.title}</h1>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.color}`}>{statusCfg.label}</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">{modeCfg.label}</span>
          </div>
          {quiz.description && <p className="text-sm text-gray-500 mt-1">{quiz.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {quiz.mode === 'live' && quiz.status === 'active' && (
            <Link to={`/quizzes/${quiz.id}/live`} className="btn-primary flex items-center gap-2 text-sm">
              <Radio className="w-4 h-4" /> Iniciar Live
            </Link>
          )}
          <Link to={`/quizzes/${quiz.id}/edit`} className="btn-secondary flex items-center gap-2 text-sm">
            <Pencil className="w-4 h-4" /> Editar
          </Link>
          <button onClick={() => setShowQR(!showQR)} className={`btn-secondary text-sm ${showQR ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
            <QrCode className="w-4 h-4" />
          </button>
          <button onClick={handleToggleStatus} className={`text-sm font-medium px-3 py-1.5 rounded-lg ${quiz.status === 'active' ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
            {quiz.status === 'active' ? 'Cerrar' : 'Activar'}
          </button>
        </div>
      </div>

      {/* QR */}
      {showQR && (
        <div className="card p-5 flex flex-col sm:flex-row items-center gap-6">
          <div className="bg-white p-4 rounded-lg">
            <QRCode value={getQuizUrl()} size={180} />
          </div>
          <div className="flex-1 space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">Compartí este QR o link con los participantes</p>
            <div className="flex items-center gap-2">
              <input type="text" readOnly value={getQuizUrl()} className="input text-sm flex-1" />
              <button onClick={handleCopy} className="btn-secondary text-sm flex items-center gap-1">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <Users className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{participants.length}</p>
          <p className="text-xs text-gray-500">Participantes</p>
        </div>
        <div className="card p-4 text-center">
          <BarChart3 className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{avgPercent}%</p>
          <p className="text-xs text-gray-500">Promedio</p>
        </div>
        <div className="card p-4 text-center">
          <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{passCount}/{finishedCount}</p>
          <p className="text-xs text-gray-500">Aprobados</p>
        </div>
        <div className="card p-4 text-center">
          <Clock className="w-5 h-5 text-orange-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{questions.length}</p>
          <p className="text-xs text-gray-500">Preguntas</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {(['leaderboard', 'questions'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'leaderboard' ? 'Ranking' : 'Por pregunta'}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      {tab === 'leaderboard' && (
        <div className="card overflow-hidden">
          {participants.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Todavía no hay participantes</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500 uppercase">
                  <th className="px-4 py-3 w-12">#</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3 text-center">Correctas</th>
                  <th className="px-4 py-3 text-center">Puntaje</th>
                  <th className="px-4 py-3 text-center">%</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p, i) => {
                  const pct = maxScore > 0 ? Math.round((p.totalScore / maxScore) * 100) : 0;
                  const pass = pct >= quiz.passingScore;
                  return (
                    <tr key={p.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3">
                        {i === 0 && participants.length > 1 ? <Trophy className="w-4 h-4 text-yellow-500" /> : <span className="text-gray-400">{i + 1}</span>}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.displayName}</td>
                      <td className="px-4 py-3 text-center">{p.totalCorrect}/{questions.length}</td>
                      <td className="px-4 py-3 text-center font-bold">{p.totalScore}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-medium ${pass ? 'text-green-600' : 'text-red-500'}`}>{pct}%</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.status === 'finished'
                          ? (pass ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <XCircle className="w-4 h-4 text-red-400 mx-auto" />)
                          : <Loader2 className="w-4 h-4 animate-spin text-blue-500 mx-auto" />
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Per-question stats */}
      {tab === 'questions' && (
        <div className="space-y-4">
          {questionStats.map((qs, i) => (
            <div key={qs.question.id} className="card p-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-6">{i + 1}</span>
                <h3 className="flex-1 font-medium text-gray-900 dark:text-white">{qs.question.questionText}</h3>
                <span className={`text-sm font-bold ${qs.rate >= 70 ? 'text-green-600' : qs.rate >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {qs.rate}% acierto
                </span>
              </div>
              {/* Option distribution bars */}
              {qs.optionDist.length > 0 && (
                <div className="space-y-1.5">
                  {qs.optionDist.map(o => {
                    const pct = qs.total > 0 ? Math.round((o.count / qs.total) * 100) : 0;
                    return (
                      <div key={o.id} className="flex items-center gap-2 text-xs">
                        <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${o.isCorrect ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}>
                          {o.isCorrect && <Check className="w-3 h-3" />}
                        </span>
                        <span className="w-32 truncate text-gray-700 dark:text-gray-300">{o.optionText}</span>
                        <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${o.isCorrect ? 'bg-green-500' : 'bg-gray-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-gray-500">{o.count} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
