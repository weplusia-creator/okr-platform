import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, Loader2, ChevronUp, ChevronDown, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useQuiz } from '../../context/QuizContext';
import { QUESTION_TYPE_CONFIG, OPTION_COLORS } from '../../types/quiz';
import type { QuizMode, QuestionType, QuizQuestion, QuizOption } from '../../types/quiz';

const db = supabase as any;

interface LocalOption {
  id?: string;
  optionText: string;
  isCorrect: boolean;
  orderNum: number;
}

interface LocalQuestion {
  id?: string;
  questionType: QuestionType;
  questionText: string;
  explanation: string;
  points: number;
  timeLimitSeconds: number | null;
  orderNum: number;
  options: LocalOption[];
  correctAnswer?: string; // for short_answer
}

export function QuizForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const {
    addQuiz, updateQuiz, fetchQuestions, fetchOptions,
    addQuestion, updateQuestion, deleteQuestion,
    addOption, updateOption, deleteOption,
  } = useQuiz();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<QuizMode>('self_paced');
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<string>('');
  const [passingScore, setPassingScore] = useState('60');
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [showAnswersAfter, setShowAnswersAfter] = useState(true);
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(0);

  // Load existing quiz for editing
  const loadQuiz = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await db
        .from('quizzes')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) { navigate('/quizzes'); return; }

      setTitle(data.title);
      setDescription(data.description || '');
      setMode(data.mode);
      setTimeLimitSeconds(data.time_limit_seconds ? String(data.time_limit_seconds) : '');
      setPassingScore(String(data.passing_score ?? 60));
      setShuffleQuestions(data.shuffle_questions ?? false);
      setShowAnswersAfter(data.show_answers_after ?? true);

      // Load questions
      const qs = await fetchQuestions(id);
      const localQs: LocalQuestion[] = [];
      for (const q of qs) {
        const opts = await fetchOptions(q.id);
        localQs.push({
          id: q.id,
          questionType: q.questionType,
          questionText: q.questionText,
          explanation: q.explanation || '',
          points: q.points,
          timeLimitSeconds: q.timeLimitSeconds,
          orderNum: q.orderNum,
          options: opts.map(o => ({
            id: o.id,
            optionText: o.optionText,
            isCorrect: o.isCorrect,
            orderNum: o.orderNum,
          })),
          correctAnswer: q.questionType === 'short_answer'
            ? opts.find(o => o.isCorrect)?.optionText || ''
            : undefined,
        });
      }
      setQuestions(localQs);
    } finally {
      setLoading(false);
    }
  }, [id, fetchQuestions, fetchOptions, navigate]);

  useEffect(() => { loadQuiz(); }, [loadQuiz]);

  // Add new question
  const addLocalQuestion = () => {
    const newQ: LocalQuestion = {
      questionType: 'multiple_choice',
      questionText: '',
      explanation: '',
      points: 1,
      timeLimitSeconds: null,
      orderNum: questions.length,
      options: [
        { optionText: '', isCorrect: true, orderNum: 0 },
        { optionText: '', isCorrect: false, orderNum: 1 },
      ],
    };
    setQuestions(prev => [...prev, newQ]);
    setExpandedQuestion(questions.length);
  };

  // Remove question
  const removeQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index).map((q, i) => ({ ...q, orderNum: i })));
    if (expandedQuestion === index) setExpandedQuestion(null);
  };

  // Move question up/down
  const moveQuestion = (index: number, dir: -1 | 1) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= questions.length) return;
    setQuestions(prev => {
      const arr = [...prev];
      [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
      return arr.map((q, i) => ({ ...q, orderNum: i }));
    });
    setExpandedQuestion(newIndex);
  };

  // Update question field
  const updateLocalQuestion = (index: number, updates: Partial<LocalQuestion>) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, ...updates } : q));
  };

  // Change question type
  const changeQuestionType = (index: number, type: QuestionType) => {
    const q = questions[index];
    let options: LocalOption[] = q.options;

    if (type === 'true_false') {
      options = [
        { optionText: 'Verdadero', isCorrect: true, orderNum: 0 },
        { optionText: 'Falso', isCorrect: false, orderNum: 1 },
      ];
    } else if (type === 'multiple_choice' && q.questionType !== 'multiple_choice') {
      options = [
        { optionText: '', isCorrect: true, orderNum: 0 },
        { optionText: '', isCorrect: false, orderNum: 1 },
      ];
    } else if (type === 'short_answer') {
      options = [];
    }

    updateLocalQuestion(index, { questionType: type, options, correctAnswer: type === 'short_answer' ? '' : undefined });
  };

  // Options management
  const addLocalOption = (qIndex: number) => {
    const q = questions[qIndex];
    if (q.options.length >= 6) return;
    updateLocalQuestion(qIndex, {
      options: [...q.options, { optionText: '', isCorrect: false, orderNum: q.options.length }],
    });
  };

  const removeLocalOption = (qIndex: number, oIndex: number) => {
    const q = questions[qIndex];
    if (q.options.length <= 2) return;
    const newOpts = q.options.filter((_, i) => i !== oIndex).map((o, i) => ({ ...o, orderNum: i }));
    // Ensure at least one is correct
    if (!newOpts.some(o => o.isCorrect) && newOpts.length > 0) newOpts[0].isCorrect = true;
    updateLocalQuestion(qIndex, { options: newOpts });
  };

  const updateLocalOption = (qIndex: number, oIndex: number, updates: Partial<LocalOption>) => {
    const q = questions[qIndex];
    updateLocalQuestion(qIndex, {
      options: q.options.map((o, i) => i === oIndex ? { ...o, ...updates } : o),
    });
  };

  const setCorrectOption = (qIndex: number, oIndex: number) => {
    const q = questions[qIndex];
    updateLocalQuestion(qIndex, {
      options: q.options.map((o, i) => ({ ...o, isCorrect: i === oIndex })),
    });
  };

  // Save
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || questions.length === 0) return;

    setSaving(true);
    try {
      let quizId = id;

      if (isEditing && quizId) {
        await updateQuiz(quizId, {
          title, description: description || null, mode,
          timeLimitSeconds: timeLimitSeconds ? parseInt(timeLimitSeconds) : null,
          passingScore: parseInt(passingScore) || 60,
          shuffleQuestions, showAnswersAfter,
        });
      } else {
        const quiz = await addQuiz({ title, description, mode });
        if (!quiz) throw new Error('Failed to create quiz');
        quizId = quiz.id;
        // Update settings not covered by addQuiz
        await updateQuiz(quizId, {
          timeLimitSeconds: timeLimitSeconds ? parseInt(timeLimitSeconds) : null,
          passingScore: parseInt(passingScore) || 60,
          shuffleQuestions, showAnswersAfter,
        });
      }

      // Save questions
      // Get existing question IDs
      const existingQs = isEditing ? await fetchQuestions(quizId!) : [];
      const existingQIds = new Set(existingQs.map(q => q.id));

      for (const q of questions) {
        let questionId = q.id;

        if (questionId && existingQIds.has(questionId)) {
          // Update existing
          await updateQuestion(questionId, {
            questionType: q.questionType,
            questionText: q.questionText,
            explanation: q.explanation || null,
            points: q.points,
            timeLimitSeconds: q.timeLimitSeconds,
            orderNum: q.orderNum,
          });
          existingQIds.delete(questionId);
        } else {
          // Create new
          const created = await addQuestion(quizId!, {
            questionType: q.questionType,
            questionText: q.questionText,
            explanation: q.explanation || undefined,
            points: q.points,
            timeLimitSeconds: q.timeLimitSeconds,
            orderNum: q.orderNum,
          });
          if (!created) continue;
          questionId = created.id;
        }

        // Save options
        if (q.questionType === 'short_answer') {
          // Store correct answer as a single option
          const existingOpts = questionId ? await fetchOptions(questionId) : [];
          if (existingOpts.length > 0) {
            await updateOption(existingOpts[0].id, { optionText: q.correctAnswer || '', isCorrect: true });
            for (let i = 1; i < existingOpts.length; i++) await deleteOption(existingOpts[i].id);
          } else if (q.correctAnswer) {
            await addOption(questionId!, { optionText: q.correctAnswer, isCorrect: true, orderNum: 0 });
          }
        } else {
          const existingOpts = questionId ? await fetchOptions(questionId) : [];
          const existingOptIds = new Set(existingOpts.map(o => o.id));

          for (const o of q.options) {
            if (o.id && existingOptIds.has(o.id)) {
              await updateOption(o.id, { optionText: o.optionText, isCorrect: o.isCorrect, orderNum: o.orderNum });
              existingOptIds.delete(o.id);
            } else {
              await addOption(questionId!, { optionText: o.optionText, isCorrect: o.isCorrect, orderNum: o.orderNum });
            }
          }
          // Delete removed options
          for (const removedId of existingOptIds) await deleteOption(removedId);
        }
      }

      // Delete removed questions
      for (const removedId of existingQIds) await deleteQuestion(removedId);

      navigate(`/quizzes/${quizId}`);
    } catch (err) {
      console.error('Error saving quiz:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isEditing ? 'Editar Quiz' : 'Nuevo Quiz'}
        </h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Quiz Config */}
        <div className="card p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Configuración</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Título *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="Ej: Examen módulo 1" required />
            </div>

            <div className="sm:col-span-2">
              <label className="label">Descripción</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} className="input" rows={2} placeholder="Instrucciones para los participantes..." />
            </div>

            <div>
              <label className="label">Modo</label>
              <div className="flex gap-2">
                {(['self_paced', 'live'] as QuizMode[]).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      mode === m
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {m === 'self_paced' ? 'Examen' : 'Live (Kahoot)'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Puntaje mínimo (%)</label>
              <input type="number" value={passingScore} onChange={e => setPassingScore(e.target.value)} className="input" min={0} max={100} />
            </div>

            <div>
              <label className="label">Tiempo límite global (seg)</label>
              <input type="number" value={timeLimitSeconds} onChange={e => setTimeLimitSeconds(e.target.value)} className="input" placeholder="Sin límite" min={0} />
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={shuffleQuestions} onChange={e => setShuffleQuestions(e.target.checked)} className="rounded border-gray-300" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Mezclar preguntas</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showAnswersAfter} onChange={e => setShowAnswersAfter(e.target.checked)} className="rounded border-gray-300" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Mostrar respuestas</span>
              </label>
            </div>
          </div>
        </div>

        {/* Questions Builder */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Preguntas ({questions.length})
            </h2>
            <button type="button" onClick={addLocalQuestion} className="btn-secondary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Agregar pregunta
            </button>
          </div>

          {questions.map((q, qi) => (
            <div key={qi} className="card overflow-hidden">
              {/* Question Header - always visible */}
              <button
                type="button"
                onClick={() => setExpandedQuestion(expandedQuestion === qi ? null : qi)}
                className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className="text-xs font-bold text-gray-400 w-6">{qi + 1}</span>
                <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate">
                  {q.questionText || '(sin texto)'}
                </span>
                <span className="text-xs text-gray-500 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
                  {QUESTION_TYPE_CONFIG[q.questionType].label}
                </span>
                <span className="text-xs text-gray-500">{q.points} pts</span>
              </button>

              {/* Question Body - collapsible */}
              {expandedQuestion === qi && (
                <div className="px-5 pb-5 space-y-4 border-t border-gray-100 dark:border-gray-700/50 pt-4">
                  {/* Question Type */}
                  <div className="flex gap-2">
                    {(['multiple_choice', 'true_false', 'short_answer'] as QuestionType[]).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => changeQuestionType(qi, t)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          q.questionType === t
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                            : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {QUESTION_TYPE_CONFIG[t].label}
                      </button>
                    ))}
                  </div>

                  {/* Question Text */}
                  <div>
                    <label className="label">Pregunta *</label>
                    <textarea
                      value={q.questionText}
                      onChange={e => updateLocalQuestion(qi, { questionText: e.target.value })}
                      className="input"
                      rows={2}
                      placeholder="Escribe la pregunta..."
                    />
                  </div>

                  {/* Options (MC / TF) */}
                  {q.questionType !== 'short_answer' && (
                    <div className="space-y-2">
                      <label className="label">Opciones (click para marcar correcta)</label>
                      {q.options.map((o, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCorrectOption(qi, oi)}
                            className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                              o.isCorrect
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-200 dark:bg-gray-600 text-gray-400 hover:bg-gray-300'
                            }`}
                            title={o.isCorrect ? 'Correcta' : 'Marcar como correcta'}
                          >
                            {o.isCorrect && <Check className="w-4 h-4" />}
                          </button>
                          <div
                            className={`w-2 h-7 rounded ${OPTION_COLORS[oi % OPTION_COLORS.length].bg}`}
                          />
                          <input
                            type="text"
                            value={o.optionText}
                            onChange={e => updateLocalOption(qi, oi, { optionText: e.target.value })}
                            className="input flex-1"
                            placeholder={`Opción ${oi + 1}`}
                            disabled={q.questionType === 'true_false'}
                          />
                          {q.questionType === 'multiple_choice' && q.options.length > 2 && (
                            <button type="button" onClick={() => removeLocalOption(qi, oi)} className="p-1 text-gray-400 hover:text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      {q.questionType === 'multiple_choice' && q.options.length < 6 && (
                        <button type="button" onClick={() => addLocalOption(qi)} className="text-xs text-primary-600 hover:underline flex items-center gap-1 mt-1">
                          <Plus className="w-3 h-3" /> Agregar opción
                        </button>
                      )}
                    </div>
                  )}

                  {/* Short answer */}
                  {q.questionType === 'short_answer' && (
                    <div>
                      <label className="label">Respuesta esperada (para corrección automática)</label>
                      <input
                        type="text"
                        value={q.correctAnswer || ''}
                        onChange={e => updateLocalQuestion(qi, { correctAnswer: e.target.value })}
                        className="input"
                        placeholder="Respuesta correcta..."
                      />
                      <p className="text-xs text-gray-400 mt-1">Comparación case-insensitive. Dejar vacío para corrección manual.</p>
                    </div>
                  )}

                  {/* Extra fields */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="label">Puntos</label>
                      <input type="number" value={q.points} onChange={e => updateLocalQuestion(qi, { points: parseInt(e.target.value) || 1 })} className="input" min={1} />
                    </div>
                    <div>
                      <label className="label">Tiempo (seg)</label>
                      <input
                        type="number"
                        value={q.timeLimitSeconds ?? ''}
                        onChange={e => updateLocalQuestion(qi, { timeLimitSeconds: e.target.value ? parseInt(e.target.value) : null })}
                        className="input"
                        placeholder="Sin límite"
                        min={5}
                      />
                    </div>
                    <div>
                      <label className="label">Explicación</label>
                      <input
                        type="text"
                        value={q.explanation}
                        onChange={e => updateLocalQuestion(qi, { explanation: e.target.value })}
                        className="input"
                        placeholder="Se muestra después de responder"
                      />
                    </div>
                  </div>

                  {/* Question Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/50">
                    <button type="button" onClick={() => moveQuestion(qi, -1)} disabled={qi === 0} className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => moveQuestion(qi, 1)} disabled={qi === questions.length - 1} className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => removeQuestion(qi)} className="ml-auto p-1.5 text-red-400 hover:text-red-600 flex items-center gap-1 text-xs">
                      <Trash2 className="w-4 h-4" /> Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {questions.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <p className="mb-2">No hay preguntas todavía.</p>
              <button type="button" onClick={addLocalQuestion} className="text-primary-600 hover:underline text-sm">
                Agregar primera pregunta
              </button>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={saving || !title.trim() || questions.length === 0} className="btn-primary flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Guardando...' : 'Guardar Quiz'}
          </button>
        </div>
      </form>
    </div>
  );
}
