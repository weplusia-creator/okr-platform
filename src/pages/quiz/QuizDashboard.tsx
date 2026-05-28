import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Brain, Users, QrCode, Copy, Check, Trash2, Loader2, Eye, Pencil, Radio } from 'lucide-react';
import QRCode from 'react-qr-code';
import { useQuiz } from '../../context/QuizContext';
import { QUIZ_STATUS_CONFIG, QUIZ_MODE_LABELS } from '../../types/quiz';
import type { QuizStatus, Quiz } from '../../types/quiz';

import { confirmDialog } from '../../components/ui/confirm';
export function QuizDashboard() {
  const { quizzes, loading, fetchQuizzes, deleteQuiz, updateQuiz, fetchParticipants } = useQuiz();
  const [filter, setFilter] = useState<QuizStatus | 'all'>('all');
  const [qrQuizId, setQrQuizId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});

  useEffect(() => { fetchQuizzes(); }, [fetchQuizzes]);

  useEffect(() => {
    quizzes.forEach(async (q) => {
      const participants = await fetchParticipants(q.id);
      setParticipantCounts(prev => ({ ...prev, [q.id]: participants.length }));
    });
  }, [quizzes, fetchParticipants]);

  const filtered = useMemo(() => {
    if (filter === 'all') return quizzes;
    return quizzes.filter(q => q.status === filter);
  }, [quizzes, filter]);

  const getQuizUrl = (token: string) => `${window.location.origin}/quiz/${token}`;

  const handleCopy = async (token: string) => {
    await navigator.clipboard.writeText(getQuizUrl(token));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog({ message: 'Eliminar este quiz y todas sus preguntas?', danger: true }))) return;
    await deleteQuiz(id);
  };

  const handleToggleStatus = async (quiz: Quiz) => {
    const newStatus = quiz.status === 'active' ? 'closed' : 'active';
    await updateQuiz(quiz.id, { status: newStatus });
  };

  if (loading && quizzes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quizzes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Crea exámenes y quizzes interactivos para tus participantes
          </p>
        </div>
        <Link to="/quizzes/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo Quiz
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'draft', 'active', 'closed'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              filter === s
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {s === 'all' ? 'Todos' : QUIZ_STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {/* Quiz List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Brain className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            {filter === 'all' ? 'No hay quizzes creados.' : `No hay quizzes con estado "${QUIZ_STATUS_CONFIG[filter as QuizStatus].label}".`}
          </p>
          <Link to="/quizzes/new" className="mt-3 inline-block text-primary-600 hover:underline text-sm">
            Crear primer quiz
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(quiz => {
            const statusCfg = QUIZ_STATUS_CONFIG[quiz.status];
            const modeCfg = QUIZ_MODE_LABELS[quiz.mode];
            return (
              <div key={quiz.id} className="card p-5 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <Link to={`/quizzes/${quiz.id}`} className="text-base font-semibold text-gray-900 dark:text-white hover:text-primary-600 truncate block">
                      {quiz.title}
                    </Link>
                    {quiz.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{quiz.description}</p>
                    )}
                  </div>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.color}`}>
                    {statusCfg.label}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
                    {quiz.mode === 'live' ? <Radio className="w-3 h-3 inline mr-1" /> : null}
                    {modeCfg.label}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Users className="w-3 h-3" /> {participantCounts[quiz.id] ?? 0}
                  </span>
                </div>

                {/* QR Section */}
                {qrQuizId === quiz.id && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-3">
                    <div className="flex justify-center">
                      <div className="bg-white p-3 rounded-lg">
                        <QRCode value={getQuizUrl(quiz.token)} size={160} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="text" readOnly value={getQuizUrl(quiz.token)} className="input text-xs flex-1" />
                      <button onClick={() => handleCopy(quiz.token)} className="btn-secondary text-xs px-2 py-1 flex items-center gap-1">
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 pt-1 border-t border-gray-100 dark:border-gray-700/50">
                  <Link to={`/quizzes/${quiz.id}`} className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors" title="Ver resultados">
                    <Eye className="w-4 h-4" />
                  </Link>
                  <Link to={`/quizzes/${quiz.id}/edit`} className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors" title="Editar">
                    <Pencil className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => setQrQuizId(qrQuizId === quiz.id ? null : quiz.id)}
                    className={`p-1.5 transition-colors ${qrQuizId === quiz.id ? 'text-primary-600' : 'text-gray-400 hover:text-primary-600'}`}
                    title="QR / Link"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                  {quiz.mode === 'live' && quiz.status === 'active' && (
                    <Link to={`/quizzes/${quiz.id}/live`} className="p-1.5 text-gray-400 hover:text-green-600 transition-colors" title="Iniciar live">
                      <Radio className="w-4 h-4" />
                    </Link>
                  )}
                  <button
                    onClick={() => handleToggleStatus(quiz)}
                    className={`ml-auto text-xs font-medium px-2 py-1 rounded transition-colors ${
                      quiz.status === 'active'
                        ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                        : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                    }`}
                  >
                    {quiz.status === 'active' ? 'Cerrar' : 'Activar'}
                  </button>
                  <button onClick={() => handleDelete(quiz.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="Eliminar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
