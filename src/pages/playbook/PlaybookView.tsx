import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Search, ChevronDown, ChevronRight, Star, Printer,
  Play, HelpCircle, CheckCircle, Lightbulb,
  MessageSquare, Target, ShieldQuestion, AlertTriangle,
  Clock, BookOpen,
} from 'lucide-react';
import { usePlaybook } from '../../context/PlaybookContext';
import type {
  Playbook,
  PlaybookStage,
  PlaybookStep,
  PlaybookScript,
  PlaybookQuestion,
  PlaybookObjection,
  QuestionCategory,
  StepType,
} from '../../types/playbook';
import {
  PLAYBOOK_TYPE_LABELS,
  PLAYBOOK_STATUS_LABELS,
  STEP_TYPE_CONFIG,
  QUESTION_CATEGORY_LABELS,
  OBJECTION_CATEGORY_LABELS,
  OBJECTION_SEVERITY_LABELS,
} from '../../types/playbook';

// ---- Icon helper for step types ----
const StepTypeIcon = ({ type, className }: { type: StepType; className?: string }) => {
  const config = STEP_TYPE_CONFIG[type];
  const iconMap: Record<string, React.ElementType> = {
    Play, HelpCircle, CheckCircle, Lightbulb,
  };
  const Icon = iconMap[config?.icon] || Play;
  return <Icon className={className} style={{ color: config?.color }} size={18} />;
};

// ---- Collapsible section ----
function Collapsible({
  title,
  icon,
  defaultOpen = false,
  count,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  count?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors text-left"
      >
        <span
          className="transition-transform duration-200"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          <ChevronRight size={16} />
        </span>
        {icon}
        <span className="font-semibold text-gray-900 dark:text-gray-100">{title}</span>
        {count !== undefined && (
          <span className="ml-auto text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full px-2 py-0.5">
            {count}
          </span>
        )}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

// ---- Text match helper ----
function matchesSearch(text: string | null | undefined, query: string): boolean {
  if (!query) return true;
  if (!text) return false;
  return text.toLowerCase().includes(query.toLowerCase());
}

export function PlaybookView() {
  const { id } = useParams<{ id: string }>();
  const {
    playbooks, fetchPlaybooks,
    stages, fetchStages,
    steps, fetchSteps,
    scripts, fetchScripts,
    questions, fetchQuestions,
    objections, fetchObjections,
    items, fetchItems,
    loading,
  } = usePlaybook();

  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedObjections, setExpandedObjections] = useState<Set<string>>(new Set());

  // Find the playbook
  const playbook = playbooks.find((p) => p.id === id) || null;

  // Fetch all data on mount
  useEffect(() => {
    if (!id) return;
    fetchPlaybooks();
    fetchStages(id);
    fetchScripts(id);
    fetchQuestions(id);
    fetchObjections(id);
    fetchItems(id);
  }, [id]);

  // Filter stages for this playbook
  const playbookStages = useMemo(
    () =>
      stages
        .filter((s) => s.playbookId === id)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [stages, id],
  );

  // Default to first stage
  useEffect(() => {
    if (playbookStages.length > 0 && !selectedStageId) {
      setSelectedStageId(playbookStages[0].id);
    }
  }, [playbookStages, selectedStageId]);

  // Fetch steps when selected stage changes
  useEffect(() => {
    if (selectedStageId) {
      fetchSteps(selectedStageId);
    }
  }, [selectedStageId]);

  const selectedStage = playbookStages.find((s) => s.id === selectedStageId) || null;

  // Filter data for selected stage
  const stageSteps = useMemo(
    () =>
      steps
        .filter((s) => s.stageId === selectedStageId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [steps, selectedStageId],
  );

  const stageScripts = useMemo(
    () =>
      scripts
        .filter((s) => s.stageId === selectedStageId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [scripts, selectedStageId],
  );

  const stageQuestions = useMemo(
    () =>
      questions
        .filter((q) => q.stageId === selectedStageId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [questions, selectedStageId],
  );

  const playbookObjections = useMemo(
    () =>
      objections
        .filter((o) => o.playbookId === id)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [objections, id],
  );

  // Search filtering
  const q = searchQuery.trim();

  const filteredSteps = stageSteps.filter(
    (s) => matchesSearch(s.title, q) || matchesSearch(s.content, q) || matchesSearch(s.description, q),
  );

  const filteredScripts = stageScripts.filter(
    (s) =>
      matchesSearch(s.name, q) ||
      matchesSearch(s.situation, q) ||
      matchesSearch(s.scriptText, q) ||
      matchesSearch(s.notes, q),
  );

  const filteredQuestions = stageQuestions.filter(
    (qn) => matchesSearch(qn.question, q) || matchesSearch(qn.purpose, q) || matchesSearch(qn.category, q),
  );

  const filteredObjections = playbookObjections.filter(
    (o) =>
      matchesSearch(o.objection, q) ||
      matchesSearch(o.category, q) ||
      matchesSearch(o.signalsWorking, q) ||
      matchesSearch(o.ifNotWorking, q) ||
      o.responses?.some(
        (r) => matchesSearch(r.text, q) || matchesSearch(r.example, q),
      ),
  );

  // Group questions by category
  const questionsByCategory = useMemo(() => {
    const groups: Partial<Record<QuestionCategory, typeof filteredQuestions>> = {};
    for (const qn of filteredQuestions) {
      if (!groups[qn.category]) groups[qn.category] = [];
      groups[qn.category]!.push(qn);
    }
    return groups;
  }, [filteredQuestions]);

  const toggleObjection = (objId: string) => {
    setExpandedObjections((prev) => {
      const next = new Set(prev);
      if (next.has(objId)) next.delete(objId);
      else next.add(objId);
      return next;
    });
  };

  if (loading && !playbook) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!playbook) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-500 dark:text-gray-400">
        Playbook no encontrado.
      </div>
    );
  }

  const statusCfg = PLAYBOOK_STATUS_LABELS[playbook.status];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 print:px-0 print:py-2">
      {/* ===== Search & Print ===== */}
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar en el playbook..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
        >
          <Printer size={16} />
          <span className="text-sm">Imprimir</span>
        </button>
      </div>

      {/* ===== Header ===== */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{playbook.name}</h1>
          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {PLAYBOOK_TYPE_LABELS[playbook.type]}
          </span>
          {statusCfg && (
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
          )}
        </div>
        {playbook.description && (
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{playbook.description}</p>
        )}
      </div>

      {/* ===== Stage Navigation (Pipeline) ===== */}
      {playbookStages.length > 0 && (
        <div className="mb-8 overflow-x-auto print:overflow-visible">
          <div className="flex gap-1 min-w-max">
            {playbookStages.map((stage, idx) => {
              const isSelected = stage.id === selectedStageId;
              return (
                <button
                  key={stage.id}
                  onClick={() => setSelectedStageId(stage.id)}
                  className={`
                    relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all
                    ${
                      isSelected
                        ? 'text-white shadow-md scale-105'
                        : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }
                  `}
                  style={isSelected ? { backgroundColor: stage.color || '#3B82F6' } : undefined}
                >
                  <span className="w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold bg-white/20">
                    {idx + 1}
                  </span>
                  {stage.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== Selected Stage Content ===== */}
      {selectedStage && (
        <div className="space-y-6 mb-10">
          {/* Stage Header */}
          <div className="p-5 rounded-xl border-l-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm" style={{ borderLeftColor: selectedStage.color || '#3B82F6' }}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{selectedStage.name}</h2>
            {selectedStage.objective && (
              <div className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 mb-1">
                <Target size={14} />
                <span>{selectedStage.objective}</span>
              </div>
            )}
            {selectedStage.estimatedDuration && (
              <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-2">
                <Clock size={14} />
                <span>{selectedStage.estimatedDuration}</span>
              </div>
            )}
            {selectedStage.description && (
              <p className="text-gray-600 dark:text-gray-400 text-sm">{selectedStage.description}</p>
            )}
          </div>

          {/* Pasos */}
          {filteredSteps.length > 0 && (
            <Collapsible
              title="Pasos"
              icon={<BookOpen size={16} className="text-blue-500" />}
              defaultOpen
              count={filteredSteps.length}
            >
              <ol className="space-y-3">
                {filteredSteps.map((step, idx) => (
                  <li key={step.id} className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StepTypeIcon type={step.type} />
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: STEP_TYPE_CONFIG[step.type]?.color + '20', color: STEP_TYPE_CONFIG[step.type]?.color }}>
                          {STEP_TYPE_CONFIG[step.type]?.label}
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">{step.title}</span>
                        {step.isRequired && <Star size={14} className="text-amber-400 fill-amber-400" />}
                      </div>
                      {step.content && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{step.content}</p>
                      )}
                      {step.description && (
                        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500 italic">{step.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </Collapsible>
          )}

          {/* Scripts */}
          {filteredScripts.length > 0 && (
            <Collapsible
              title="Scripts"
              icon={<MessageSquare size={16} className="text-purple-500" />}
              defaultOpen
              count={filteredScripts.length}
            >
              <div className="space-y-4">
                {filteredScripts.map((script) => (
                  <div key={script.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{script.name}</h4>
                    {script.situation && (
                      <p className="text-sm italic text-gray-500 dark:text-gray-400 mb-2">{script.situation}</p>
                    )}
                    <pre className="whitespace-pre-wrap text-sm bg-gray-50 dark:bg-gray-900 border-l-4 border-purple-400 dark:border-purple-600 p-3 rounded text-gray-800 dark:text-gray-200 font-sans leading-relaxed">
                      {script.scriptText}
                    </pre>
                    {script.notes && (
                      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">{script.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </Collapsible>
          )}

          {/* Preguntas */}
          {filteredQuestions.length > 0 && (
            <Collapsible
              title="Preguntas"
              icon={<HelpCircle size={16} className="text-indigo-500" />}
              defaultOpen
              count={filteredQuestions.length}
            >
              <div className="space-y-5">
                {(Object.entries(questionsByCategory) as [QuestionCategory, typeof filteredQuestions][]).map(
                  ([cat, qs]) => (
                    <div key={cat}>
                      <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        {QUESTION_CATEGORY_LABELS[cat] || cat}
                      </h4>
                      <div className="space-y-2">
                        {qs.map((qn) => (
                          <div key={qn.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                            <p className="font-semibold text-gray-900 dark:text-white text-sm">{qn.question}</p>
                            {qn.purpose && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{qn.purpose}</p>
                            )}
                            {qn.whatToListen && (
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                Escuchar: {qn.whatToListen}
                              </p>
                            )}
                            {qn.followupQuestion && (
                              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                                Seguimiento: {qn.followupQuestion}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </Collapsible>
          )}
        </div>
      )}

      {/* ===== Objeciones (always visible) ===== */}
      {filteredObjections.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ShieldQuestion size={20} className="text-red-500" />
            Objeciones ({filteredObjections.length})
          </h2>
          <div className="space-y-3">
            {filteredObjections.map((obj) => {
              const isOpen = expandedObjections.has(obj.id);
              const sevCfg = OBJECTION_SEVERITY_LABELS[obj.severity];
              return (
                <div key={obj.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleObjection(obj.id)}
                    className="w-full flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left"
                  >
                    <span
                      className="transition-transform duration-200 text-gray-400"
                      style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    >
                      <ChevronRight size={16} />
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white flex-1">{obj.objection}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {OBJECTION_CATEGORY_LABELS[obj.category] || obj.category}
                    </span>
                    {sevCfg && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sevCfg.color}`}>
                        {sevCfg.label}
                      </span>
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 space-y-4">
                      {/* Responses */}
                      {obj.responses && obj.responses.length > 0 && (
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Respuestas</h5>
                          <ol className="space-y-2">
                            {obj.responses.map((r, idx) => (
                              <li key={idx} className="flex gap-2 items-start">
                                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-xs font-bold text-blue-700 dark:text-blue-300">
                                  {idx + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                      {r.type}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-800 dark:text-gray-200">{r.text}</p>
                                  {r.example && (
                                    <p className="text-xs italic text-gray-500 dark:text-gray-400 mt-0.5">{r.example}</p>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {/* Signals Working */}
                      {obj.signalsWorking && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                          <h5 className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-1">
                            Senales de que funciona
                          </h5>
                          <p className="text-sm text-green-800 dark:text-green-300">{obj.signalsWorking}</p>
                        </div>
                      )}

                      {/* If Not Working */}
                      {obj.ifNotWorking && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                          <h5 className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide mb-1">
                            Si no funciona
                          </h5>
                          <p className="text-sm text-red-800 dark:text-red-300">{obj.ifNotWorking}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
