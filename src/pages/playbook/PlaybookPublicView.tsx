import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Search, ChevronRight, Star, Printer,
  Play, HelpCircle, CheckCircle, Lightbulb,
  MessageSquare, Target, ShieldQuestion,
  Clock, BookOpen,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type {
  Playbook,
  PlaybookStage,
  PlaybookStep,
  PlaybookScript,
  PlaybookQuestion,
  PlaybookObjection,
  PlaybookItem,
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
  ITEM_TYPE_CONFIG,
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
        className="w-full flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors text-left"
      >
        <span
          className="transition-transform duration-200 flex-shrink-0"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          <ChevronRight size={16} />
        </span>
        {icon}
        <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">{title}</span>
        {count !== undefined && (
          <span className="ml-auto text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full px-2 py-0.5">
            {count}
          </span>
        )}
      </button>
      {open && <div className="p-3 sm:p-4">{children}</div>}
    </div>
  );
}

// ---- Text match helper ----
function matchesSearch(text: string | null | undefined, query: string): boolean {
  if (!query) return true;
  if (!text) return false;
  return text.toLowerCase().includes(query.toLowerCase());
}

export function PlaybookPublicView() {
  const { token } = useParams<{ token: string }>();

  const [playbook, setPlaybook] = useState<Playbook | null>(null);
  const [stages, setStages] = useState<PlaybookStage[]>([]);
  const [steps, setSteps] = useState<PlaybookStep[]>([]);
  const [scripts, setScripts] = useState<PlaybookScript[]>([]);
  const [questions, setQuestions] = useState<PlaybookQuestion[]>([]);
  const [objections, setObjections] = useState<PlaybookObjection[]>([]);
  const [items, setItems] = useState<PlaybookItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedObjections, setExpandedObjections] = useState<Set<string>>(new Set());

  // Fetch all playbook data by share_token
  useEffect(() => {
    const fetchData = async () => {
      if (!token) { setError('Token inválido'); setLoading(false); return; }
      try {
        // 1. Fetch playbook by share_token
        const { data: p, error: err } = await supabase
          .from('playbooks')
          .select('*')
          .eq('share_token', token)
          .maybeSingle();

        if (err || !p) { setError('Playbook no encontrado'); setLoading(false); return; }

        const mapped: Playbook = {
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
        };
        setPlaybook(mapped);

        // 2. Fetch stages
        const { data: stagesData } = await supabase
          .from('playbook_stages')
          .select('*')
          .eq('playbook_id', p.id)
          .order('sort_order');

        const mappedStages: PlaybookStage[] = (stagesData || []).map((s: any) => ({
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
        setStages(mappedStages);

        if (mappedStages.length > 0) {
          setSelectedStageId(mappedStages[0].id);
        }

        // 3. Fetch steps for all stages
        if (mappedStages.length > 0) {
          const stageIds = mappedStages.map(s => s.id);
          const { data: stepsData } = await supabase
            .from('playbook_steps')
            .select('*')
            .in('stage_id', stageIds)
            .order('sort_order');

          setSteps((stepsData || []).map((s: any) => ({
            id: s.id,
            stageId: s.stage_id,
            title: s.title,
            description: s.description,
            type: s.type,
            content: s.content,
            sortOrder: s.sort_order,
            isRequired: s.is_required,
            createdAt: s.created_at,
          })));
        }

        // 4. Fetch scripts, questions, objections, items
        const [scriptsRes, questionsRes, objectionsRes, itemsRes] = await Promise.all([
          supabase.from('playbook_scripts').select('*').eq('playbook_id', p.id).order('sort_order'),
          supabase.from('playbook_questions').select('*').eq('playbook_id', p.id).order('sort_order'),
          supabase.from('playbook_objections').select('*').eq('playbook_id', p.id).order('sort_order'),
          supabase.from('playbook_items').select('*').eq('playbook_id', p.id).order('sort_order'),
        ]);

        setScripts((scriptsRes.data || []).map((s: any) => ({
          id: s.id, playbookId: s.playbook_id, stageId: s.stage_id,
          name: s.name, situation: s.situation, scriptText: s.script_text,
          notes: s.notes, sortOrder: s.sort_order, createdAt: s.created_at,
        })));

        setQuestions((questionsRes.data || []).map((q: any) => ({
          id: q.id, playbookId: q.playbook_id, stageId: q.stage_id,
          category: q.category, question: q.question, purpose: q.purpose,
          whatToListen: q.what_to_listen, followupQuestion: q.followup_question,
          sortOrder: q.sort_order, createdAt: q.created_at,
        })));

        setObjections((objectionsRes.data || []).map((o: any) => ({
          id: o.id, playbookId: o.playbook_id, objection: o.objection,
          category: o.category, severity: o.severity,
          responses: o.responses || [], signalsWorking: o.signals_working,
          ifNotWorking: o.if_not_working, sortOrder: o.sort_order, createdAt: o.created_at,
        })));

        setItems((itemsRes.data || []).map((i: any) => ({
          id: i.id, playbookId: i.playbook_id, stageId: i.stage_id,
          itemType: i.item_type, title: i.title, content: i.content || {},
          sortOrder: i.sort_order, createdAt: i.created_at,
        })));
      } catch (err: any) {
        console.error('Error fetching public playbook:', err);
        setError('Error al cargar el playbook');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // Derived data
  const playbookStages = useMemo(
    () => stages.sort((a, b) => a.sortOrder - b.sortOrder),
    [stages],
  );

  const selectedStage = playbookStages.find((s) => s.id === selectedStageId) || null;

  const stageSteps = useMemo(
    () => steps.filter((s) => s.stageId === selectedStageId).sort((a, b) => a.sortOrder - b.sortOrder),
    [steps, selectedStageId],
  );

  const stageScripts = useMemo(
    () => scripts.filter((s) => s.stageId === selectedStageId).sort((a, b) => a.sortOrder - b.sortOrder),
    [scripts, selectedStageId],
  );

  const stageQuestions = useMemo(
    () => questions.filter((q) => q.stageId === selectedStageId).sort((a, b) => a.sortOrder - b.sortOrder),
    [questions, selectedStageId],
  );

  const playbookObjections = useMemo(
    () => objections.sort((a, b) => a.sortOrder - b.sortOrder),
    [objections],
  );

  const stageItems = useMemo(
    () => items.filter((i) => i.stageId === selectedStageId).sort((a, b) => a.sortOrder - b.sortOrder),
    [items, selectedStageId],
  );

  // Search filtering
  const q = searchQuery.trim();

  const filteredSteps = stageSteps.filter(
    (s) => matchesSearch(s.title, q) || matchesSearch(s.content, q) || matchesSearch(s.description, q),
  );

  const filteredScripts = stageScripts.filter(
    (s) =>
      matchesSearch(s.name, q) || matchesSearch(s.situation, q) ||
      matchesSearch(s.scriptText, q) || matchesSearch(s.notes, q),
  );

  const filteredQuestions = stageQuestions.filter(
    (qn) => matchesSearch(qn.question, q) || matchesSearch(qn.purpose, q) || matchesSearch(qn.category, q),
  );

  const filteredObjections = playbookObjections.filter(
    (o) =>
      matchesSearch(o.objection, q) || matchesSearch(o.category, q) ||
      matchesSearch(o.signalsWorking, q) || matchesSearch(o.ifNotWorking, q) ||
      o.responses?.some((r) => matchesSearch(r.text, q) || matchesSearch(r.example, q)),
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

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  // Error state
  if (error || !playbook) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 text-lg">{error || 'Playbook no encontrado'}</p>
        </div>
      </div>
    );
  }

  const statusCfg = PLAYBOOK_STATUS_LABELS[playbook.status];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 print:px-0 print:py-2">
        {/* ===== Search & Print ===== */}
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 print:hidden">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar en el playbook..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
            />
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
          >
            <Printer size={16} />
            <span className="text-sm hidden sm:inline">Imprimir</span>
          </button>
        </div>

        {/* ===== Header ===== */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{playbook.name}</h1>
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
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">{playbook.description}</p>
          )}
        </div>

        {/* ===== Mobile Stage Tabs (horizontal scroll) ===== */}
        {playbookStages.length > 0 && (
          <div className="lg:hidden mb-4 print:hidden -mx-3 px-3">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {playbookStages.map(stage => {
                const isSelected = stage.id === selectedStageId;
                return (
                  <button
                    key={stage.id}
                    onClick={() => setSelectedStageId(stage.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm whitespace-nowrap transition-colors flex-shrink-0 ${
                      isSelected
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-semibold ring-1 ring-primary-300 dark:ring-primary-700'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 ring-1 ring-gray-200 dark:ring-gray-700'
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color || '#6B7280' }} />
                    {stage.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== Layout: Sidebar + Content ===== */}
        <div className="lg:flex lg:gap-6 print:block">
          {/* Left Sidebar – Stage list (desktop only) */}
          {playbookStages.length > 0 && (
            <div className="hidden lg:block w-64 flex-shrink-0 print:hidden">
              <div className="sticky top-6">
                <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Etapas</h2>
                <div className="space-y-1 max-h-[calc(100vh-10rem)] overflow-y-auto pr-1">
                  {playbookStages.map(stage => {
                    const isSelected = stage.id === selectedStageId;
                    return (
                      <button
                        key={stage.id}
                        onClick={() => setSelectedStageId(stage.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                          isSelected
                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-semibold'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color || '#6B7280' }} />
                        <span className="text-sm truncate">{stage.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Right Content – Selected stage */}
          <div className="flex-1 min-w-0">
        {selectedStage && (
          <div className="space-y-6 mb-10">
            {/* Stage Header */}
            <div className="p-4 sm:p-5 rounded-xl border-l-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm" style={{ borderLeftColor: selectedStage.color || '#3B82F6' }}>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1">{selectedStage.name}</h2>
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
                    <div key={script.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm sm:text-base">{script.name}</h4>
                      {script.situation && (
                        <p className="text-sm italic text-gray-500 dark:text-gray-400 mb-2">{script.situation}</p>
                      )}
                      <pre className="whitespace-pre-wrap text-xs sm:text-sm bg-gray-50 dark:bg-gray-900 border-l-4 border-purple-400 dark:border-purple-600 p-2.5 sm:p-3 rounded text-gray-800 dark:text-gray-200 font-sans leading-relaxed overflow-x-auto">
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

            {/* Recursos / Checklists */}
            {stageItems.length > 0 && (
              <Collapsible
                title="Checklists y Recursos"
                icon={<CheckCircle size={16} className="text-green-500" />}
                defaultOpen
                count={stageItems.length}
              >
                <div className="space-y-4">
                  {stageItems.map((item) => {
                    const cfg = ITEM_TYPE_CONFIG[item.itemType as keyof typeof ITEM_TYPE_CONFIG];
                    const contentItems = (item.content as any)?.items as string[] | undefined;
                    const note = (item.content as any)?.note as string | undefined;
                    return (
                      <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                          {cfg && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: cfg.color + '20', color: cfg.color }}>{cfg.name}</span>}
                          {item.title}
                        </h4>
                        {contentItems && contentItems.length > 0 && (
                          <ul className="space-y-1.5">
                            {contentItems.map((ci, idx) => (
                              <li key={idx} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <span className="text-gray-400 flex-shrink-0">{item.itemType === 'checklist' ? '☐' : '•'}</span>
                                {ci}
                              </li>
                            ))}
                          </ul>
                        )}
                        {note && (
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">{note}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Collapsible>
            )}
          </div>
        )}

        {/* ===== Objeciones (always visible) ===== */}
        {filteredObjections.length > 0 && (
          <div className="mt-6 sm:mt-8">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
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
                      className="w-full flex items-start sm:items-center gap-2 px-3 sm:px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left"
                    >
                      <span
                        className="transition-transform duration-200 text-gray-400 mt-0.5 sm:mt-0 flex-shrink-0"
                        style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                      >
                        <ChevronRight size={16} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">{obj.objection}</span>
                        <div className="flex flex-wrap gap-1.5 mt-1 sm:hidden">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            {OBJECTION_CATEGORY_LABELS[obj.category] || obj.category}
                          </span>
                          {sevCfg && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sevCfg.color}`}>
                              {sevCfg.label}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="hidden sm:inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex-shrink-0">
                        {OBJECTION_CATEGORY_LABELS[obj.category] || obj.category}
                      </span>
                      {sevCfg && (
                        <span className={`hidden sm:inline-block text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${sevCfg.color}`}>
                          {sevCfg.label}
                        </span>
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-3 sm:px-4 pb-4 space-y-4">
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
        </div>
      </div>
    </div>
  );
}
