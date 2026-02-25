import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight,
  Play, HelpCircle, CheckCircle, Lightbulb,
  TrendingUp, AlertTriangle, Swords, Trophy, FileText, CheckSquare,
  Share2, Check,
} from 'lucide-react';
import { usePlaybook } from '../../context/PlaybookContext';
import type {
  PlaybookStage, PlaybookStep, PlaybookScript, PlaybookQuestion,
  PlaybookObjection, PlaybookItem, PlaybookStatus, StepType,
  QuestionCategory, ObjectionCategory, ObjectionSeverity, ItemType,
} from '../../types/playbook';
import {
  PLAYBOOK_STATUS_LABELS, QUESTION_CATEGORY_LABELS,
  OBJECTION_CATEGORY_LABELS, OBJECTION_SEVERITY_LABELS,
  STEP_TYPE_CONFIG, ITEM_TYPE_CONFIG,
} from '../../types/playbook';

const STEP_ICONS: Record<string, React.ReactNode> = {
  accion: <Play className="w-3.5 h-3.5" />,
  pregunta: <HelpCircle className="w-3.5 h-3.5" />,
  verificacion: <CheckCircle className="w-3.5 h-3.5" />,
  tip: <Lightbulb className="w-3.5 h-3.5" />,
};

const ITEM_ICONS: Record<string, React.ReactNode> = {
  buying_signal: <TrendingUp className="w-3.5 h-3.5" />,
  red_flag: <AlertTriangle className="w-3.5 h-3.5" />,
  competitor: <Swords className="w-3.5 h-3.5" />,
  success_case: <Trophy className="w-3.5 h-3.5" />,
  material: <FileText className="w-3.5 h-3.5" />,
  checklist: <CheckSquare className="w-3.5 h-3.5" />,
};

type TabKey = 'pasos' | 'scripts' | 'preguntas' | 'objeciones' | 'recursos';

export function PlaybookEditor() {
  const { id: playbookId } = useParams<{ id: string }>();
  const {
    playbooks, fetchPlaybooks, updatePlaybook,
    stages, fetchStages, addStage, updateStage, deleteStage,
    steps, fetchSteps, addStep, updateStep, deleteStep,
    scripts, fetchScripts, addScript, updateScript, deleteScript,
    questions, fetchQuestions, addQuestion, updateQuestion, deleteQuestion,
    objections, fetchObjections, addObjection, updateObjection, deleteObjection,
    items, fetchItems, addItem, updateItem, deleteItem,
  } = usePlaybook();

  const playbook = playbooks.find(p => p.id === playbookId);

  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('pasos');
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [expandedObjections, setExpandedObjections] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Inline editing state
  const [editingField, setEditingField] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Fetch playbooks + data when playbook changes
  useEffect(() => {
    if (playbookId) {
      fetchPlaybooks();
      fetchStages(playbookId);
      fetchScripts(playbookId);
      fetchQuestions(playbookId);
      fetchObjections(playbookId);
      fetchItems(playbookId);
    }
  }, [playbookId, fetchPlaybooks, fetchStages, fetchScripts, fetchQuestions, fetchObjections, fetchItems]);

  // Sort stages
  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.sortOrder - b.sortOrder),
    [stages],
  );

  // Default to first stage
  useEffect(() => {
    if (sortedStages.length > 0 && !selectedStageId) {
      setSelectedStageId(sortedStages[0].id);
    }
  }, [sortedStages, selectedStageId]);

  // Fetch steps when stage changes
  useEffect(() => {
    if (selectedStageId) {
      fetchSteps(selectedStageId);
    }
  }, [selectedStageId, fetchSteps]);

  const selectedStage = stages.find(s => s.id === selectedStageId);
  const stageSteps = useMemo(
    () => steps.filter(s => s.stageId === selectedStageId).sort((a, b) => a.sortOrder - b.sortOrder),
    [steps, selectedStageId],
  );
  const stageScripts = useMemo(
    () => scripts.filter(s => s.stageId === selectedStageId).sort((a, b) => a.sortOrder - b.sortOrder),
    [scripts, selectedStageId],
  );
  const stageQuestions = useMemo(
    () => questions.filter(q => q.stageId === selectedStageId).sort((a, b) => a.sortOrder - b.sortOrder),
    [questions, selectedStageId],
  );
  const groupedItems = useMemo(() => {
    const map: Record<string, PlaybookItem[]> = {};
    for (const item of items) {
      if (item.stageId && item.stageId !== selectedStageId) continue;
      if (!map[item.itemType]) map[item.itemType] = [];
      map[item.itemType].push(item);
    }
    return map;
  }, [items, selectedStageId]);

  // Helpers
  const startEdit = (id: string, field: string, value: string) => {
    setEditingField({ id, field });
    setEditValue(value);
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleDelete = async (type: string, id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      return;
    }
    setDeleteConfirm(null);
    switch (type) {
      case 'stage': await deleteStage(id); if (id === selectedStageId) setSelectedStageId(null); break;
      case 'step': await deleteStep(id); break;
      case 'script': await deleteScript(id); break;
      case 'question': await deleteQuestion(id); break;
      case 'objection': await deleteObjection(id); break;
      case 'item': await deleteItem(id); break;
    }
  };

  // Playbook name editing
  const handleNameSave = async () => {
    if (playbookId && nameValue.trim() && nameValue !== playbook?.name) {
      await updatePlaybook(playbookId, { name: nameValue.trim() });
    }
    setEditingName(false);
  };

  const handleStatusChange = async (status: PlaybookStatus) => {
    if (playbookId) await updatePlaybook(playbookId, { status });
  };

  // Add handlers
  const handleAddStage = async () => {
    if (!playbookId) return;
    const stage = await addStage(playbookId, {
      name: 'Nueva Etapa',
      sortOrder: sortedStages.length,
    });
    if (stage) setSelectedStageId(stage.id);
  };

  const handleAddStep = async () => {
    if (!selectedStageId) return;
    await addStep(selectedStageId, {
      title: 'Nuevo paso',
      sortOrder: stageSteps.length,
      type: 'accion',
      isRequired: false,
    });
  };

  const handleAddScript = async () => {
    if (!playbookId || !selectedStageId) return;
    await addScript(playbookId, {
      name: 'Nuevo script',
      scriptText: '',
      stageId: selectedStageId,
      sortOrder: stageScripts.length,
    });
  };

  const handleAddQuestion = async () => {
    if (!playbookId || !selectedStageId) return;
    await addQuestion(playbookId, {
      question: 'Nueva pregunta',
      category: 'necesidad',
      stageId: selectedStageId,
      sortOrder: stageQuestions.length,
    });
  };

  const handleAddObjection = async () => {
    if (!playbookId) return;
    await addObjection(playbookId, {
      objection: 'Nueva objeción',
      response: '',
      category: 'precio',
      severity: 'medio',
      sortOrder: objections.length,
    });
  };

  const [copied, setCopied] = useState(false);
  const [newItemType, setNewItemType] = useState<ItemType>('buying_signal');
  const handleAddItem = async () => {
    if (!playbookId) return;
    await addItem(playbookId, {
      title: 'Nuevo recurso',
      itemType: newItemType,
      stageId: selectedStageId || null,
      sortOrder: items.filter(i => !i.stageId || i.stageId === selectedStageId).length,
    });
  };

  if (!playbook) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 dark:text-gray-400">Playbook no encontrado</p>
        <Link to="/playbook" className="text-primary-600 hover:underline mt-2 inline-block">Volver</Link>
      </div>
    );
  }

  const statusCfg = PLAYBOOK_STATUS_LABELS[playbook.status];

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'pasos', label: 'Pasos' },
    { key: 'scripts', label: 'Scripts' },
    { key: 'preguntas', label: 'Preguntas' },
    { key: 'objeciones', label: 'Objeciones' },
    { key: 'recursos', label: 'Recursos' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <Link to="/playbook" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          {editingName ? (
            <input
              className="input text-xl font-bold"
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={e => e.key === 'Enter' && handleNameSave()}
              autoFocus
            />
          ) : (
            <h1
              className="text-xl font-bold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded"
              onClick={() => { setNameValue(playbook.name); setEditingName(true); }}
            >
              {playbook.name}
            </h1>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            className="select text-xs"
            value={playbook.status}
            onChange={e => handleStatusChange(e.target.value as PlaybookStatus)}
          >
            {Object.entries(PLAYBOOK_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusCfg.color}`}>
            {statusCfg.label}
          </span>
          <button
            onClick={() => {
              const url = `${window.location.origin}/playbook/s/${playbook.shareToken}`;
              navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
          >
            {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            {copied ? 'Copiado!' : 'Compartir'}
          </button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left Sidebar - Stages */}
        <div className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 pr-4 overflow-y-auto">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Etapas</h2>
          <div className="space-y-1">
            {sortedStages.map(stage => (
              <div
                key={stage.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  stage.id === selectedStageId
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                onClick={() => setSelectedStageId(stage.id)}
              >
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color || '#6B7280' }} />
                <span className="text-sm truncate flex-1">{stage.name}</span>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete('stage', stage.id); }}
                  className={`text-xs flex-shrink-0 ${deleteConfirm === stage.id ? 'text-red-500 font-semibold' : 'text-gray-400 hover:text-red-400'}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <button onClick={handleAddStage} className="btn-secondary btn-sm w-full mt-3 flex items-center justify-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Agregar etapa
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {selectedStage ? (
            <>
              {/* Stage header - inline editable */}
              <div className="mb-4">
                {editingField?.id === selectedStage.id && editingField.field === 'name' ? (
                  <input
                    className="input text-lg font-semibold"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => { updateStage(selectedStage.id, { name: editValue }); cancelEdit(); }}
                    onKeyDown={e => e.key === 'Enter' && (updateStage(selectedStage.id, { name: editValue }), cancelEdit())}
                    autoFocus
                  />
                ) : (
                  <h2
                    className="text-lg font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded inline-block"
                    onClick={() => startEdit(selectedStage.id, 'name', selectedStage.name)}
                  >
                    {selectedStage.name}
                  </h2>
                )}
                {editingField?.id === selectedStage.id && editingField.field === 'description' ? (
                  <textarea
                    className="input text-sm mt-1 w-full"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => { updateStage(selectedStage.id, { description: editValue }); cancelEdit(); }}
                    autoFocus
                  />
                ) : (
                  <p
                    className="text-sm text-gray-500 dark:text-gray-400 mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded"
                    onClick={() => startEdit(selectedStage.id, 'description', selectedStage.description || '')}
                  >
                    {selectedStage.description || 'Sin descripción (click para editar)'}
                  </p>
                )}
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                {TABS.map(tab => (
                  <button
                    key={tab.key}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.key
                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === 'pasos' && (
                <div className="space-y-2">
                  {stageSteps.map(step => {
                    const cfg = STEP_TYPE_CONFIG[step.type];
                    const isExpanded = expandedSteps.has(step.id);
                    return (
                      <div key={step.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setExpandedSteps(prev => {
                            const next = new Set(prev);
                            next.has(step.id) ? next.delete(step.id) : next.add(step.id);
                            return next;
                          })}>
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                          </button>
                          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: cfg.color + '20', color: cfg.color }}>
                            {STEP_ICONS[step.type]} {cfg.label}
                          </span>
                          {editingField?.id === step.id && editingField.field === 'title' ? (
                            <input
                              className="input text-sm flex-1"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={() => { updateStep(step.id, { title: editValue }); cancelEdit(); }}
                              onKeyDown={e => e.key === 'Enter' && (updateStep(step.id, { title: editValue }), cancelEdit())}
                              autoFocus
                            />
                          ) : (
                            <span
                              className="text-sm font-medium text-gray-900 dark:text-white flex-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-1 rounded"
                              onClick={() => startEdit(step.id, 'title', step.title)}
                            >
                              {step.title}
                            </span>
                          )}
                          <label className="flex items-center gap-1 text-[10px] text-gray-500">
                            <input
                              type="checkbox"
                              checked={step.isRequired}
                              onChange={e => updateStep(step.id, { isRequired: e.target.checked })}
                              className="rounded"
                            />
                            Requerido
                          </label>
                          <select
                            className="select text-[10px] w-auto"
                            value={step.type}
                            onChange={e => updateStep(step.id, { type: e.target.value as StepType })}
                          >
                            {Object.entries(STEP_TYPE_CONFIG).map(([k, v]) => (
                              <option key={k} value={k}>{v.label}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleDelete('step', step.id)}
                            className={`${deleteConfirm === step.id ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {step.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 ml-6 mt-1">{step.description}</p>
                        )}
                        {isExpanded && (
                          <div className="ml-6 mt-2">
                            {editingField?.id === step.id && editingField.field === 'content' ? (
                              <textarea
                                className="input text-xs w-full"
                                rows={4}
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={() => { updateStep(step.id, { content: editValue }); cancelEdit(); }}
                                autoFocus
                              />
                            ) : (
                              <p
                                className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/30 rounded p-2 cursor-pointer"
                                onClick={() => startEdit(step.id, 'content', step.content || '')}
                              >
                                {step.content || 'Sin contenido (click para editar)'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <button onClick={handleAddStep} className="btn-secondary btn-sm flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Agregar paso
                  </button>
                </div>
              )}

              {activeTab === 'scripts' && (
                <div className="space-y-3">
                  {stageScripts.map(script => (
                    <div key={script.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        {editingField?.id === script.id && editingField.field === 'name' ? (
                          <input
                            className="input text-sm font-semibold flex-1"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={() => { updateScript(script.id, { name: editValue }); cancelEdit(); }}
                            onKeyDown={e => e.key === 'Enter' && (updateScript(script.id, { name: editValue }), cancelEdit())}
                            autoFocus
                          />
                        ) : (
                          <h3
                            className="text-sm font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-1 rounded"
                            onClick={() => startEdit(script.id, 'name', script.name)}
                          >
                            {script.name}
                          </h3>
                        )}
                        <button
                          onClick={() => handleDelete('script', script.id)}
                          className={`${deleteConfirm === script.id ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {editingField?.id === script.id && editingField.field === 'situation' ? (
                        <input
                          className="input text-xs w-full mb-2"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => { updateScript(script.id, { situation: editValue }); cancelEdit(); }}
                          autoFocus
                        />
                      ) : (
                        <p
                          className="text-xs text-gray-500 dark:text-gray-400 mb-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-1 rounded"
                          onClick={() => startEdit(script.id, 'situation', script.situation || '')}
                        >
                          <span className="font-medium">Situación:</span> {script.situation || 'Click para editar'}
                        </p>
                      )}
                      {editingField?.id === script.id && editingField.field === 'scriptText' ? (
                        <textarea
                          className="input text-xs w-full font-mono"
                          rows={6}
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => { updateScript(script.id, { scriptText: editValue }); cancelEdit(); }}
                          autoFocus
                        />
                      ) : (
                        <pre
                          className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/30 rounded p-3 whitespace-pre-wrap cursor-pointer"
                          onClick={() => startEdit(script.id, 'scriptText', script.scriptText || '')}
                        >
                          <code>{script.scriptText || 'Click para editar el script'}</code>
                        </pre>
                      )}
                      {script.notes && (
                        <p className="text-[10px] text-gray-400 mt-2 italic">{script.notes}</p>
                      )}
                    </div>
                  ))}
                  <button onClick={handleAddScript} className="btn-secondary btn-sm flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Agregar script
                  </button>
                </div>
              )}

              {activeTab === 'preguntas' && (
                <div className="space-y-2">
                  {stageQuestions.map(q => (
                    <div key={q.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                          {QUESTION_CATEGORY_LABELS[q.category]}
                        </span>
                        <select
                          className="select text-[10px] w-auto"
                          value={q.category}
                          onChange={e => updateQuestion(q.id, { category: e.target.value as QuestionCategory })}
                        >
                          {Object.entries(QUESTION_CATEGORY_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                        <div className="flex-1" />
                        <button
                          onClick={() => handleDelete('question', q.id)}
                          className={`${deleteConfirm === q.id ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {editingField?.id === q.id && editingField.field === 'question' ? (
                        <input
                          className="input text-sm w-full"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => { updateQuestion(q.id, { question: editValue }); cancelEdit(); }}
                          onKeyDown={e => e.key === 'Enter' && (updateQuestion(q.id, { question: editValue }), cancelEdit())}
                          autoFocus
                        />
                      ) : (
                        <p
                          className="text-sm text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-1 rounded"
                          onClick={() => startEdit(q.id, 'question', q.question)}
                        >
                          {q.question}
                        </p>
                      )}
                      {editingField?.id === q.id && editingField.field === 'purpose' ? (
                        <input
                          className="input text-xs w-full mt-1"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => { updateQuestion(q.id, { purpose: editValue }); cancelEdit(); }}
                          onKeyDown={e => e.key === 'Enter' && (updateQuestion(q.id, { purpose: editValue }), cancelEdit())}
                          autoFocus
                        />
                      ) : (
                        <p
                          className="text-xs text-gray-500 dark:text-gray-400 mt-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-1 rounded"
                          onClick={() => startEdit(q.id, 'purpose', q.purpose || '')}
                        >
                          <span className="font-medium">Propósito:</span> {q.purpose || 'Click para editar'}
                        </p>
                      )}
                    </div>
                  ))}
                  <button onClick={handleAddQuestion} className="btn-secondary btn-sm flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Agregar pregunta
                  </button>
                </div>
              )}

              {activeTab === 'objeciones' && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Las objeciones son globales del playbook, no por etapa.</p>
                  {objections.sort((a, b) => a.sortOrder - b.sortOrder).map(obj => {
                    const isExpanded = expandedObjections.has(obj.id);
                    const sevCfg = OBJECTION_SEVERITY_LABELS[obj.severity];
                    return (
                      <div key={obj.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <button onClick={() => setExpandedObjections(prev => {
                            const next = new Set(prev);
                            next.has(obj.id) ? next.delete(obj.id) : next.add(obj.id);
                            return next;
                          })}>
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                          </button>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {OBJECTION_CATEGORY_LABELS[obj.category]}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${sevCfg.color}`}>
                            {sevCfg.label}
                          </span>
                          <select
                            className="select text-[10px] w-auto"
                            value={obj.category}
                            onChange={e => updateObjection(obj.id, { category: e.target.value as ObjectionCategory })}
                          >
                            {Object.entries(OBJECTION_CATEGORY_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                          <select
                            className="select text-[10px] w-auto"
                            value={obj.severity}
                            onChange={e => updateObjection(obj.id, { severity: e.target.value as ObjectionSeverity })}
                          >
                            {Object.entries(OBJECTION_SEVERITY_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v.label}</option>
                            ))}
                          </select>
                          <div className="flex-1" />
                          <button
                            onClick={() => handleDelete('objection', obj.id)}
                            className={`${deleteConfirm === obj.id ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {editingField?.id === obj.id && editingField.field === 'objection' ? (
                          <input
                            className="input text-sm w-full"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={() => { updateObjection(obj.id, { objection: editValue }); cancelEdit(); }}
                            onKeyDown={e => e.key === 'Enter' && (updateObjection(obj.id, { objection: editValue }), cancelEdit())}
                            autoFocus
                          />
                        ) : (
                          <p
                            className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-1 rounded"
                            onClick={() => startEdit(obj.id, 'objection', obj.objection)}
                          >
                            {obj.objection}
                          </p>
                        )}

                        {isExpanded && (
                          <div className="mt-3 space-y-3 ml-6">
                            {/* Responses */}
                            <div>
                              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Respuestas</h4>
                              {(obj.responses || []).map((resp, idx) => (
                                <div key={idx} className="bg-gray-50 dark:bg-gray-700/30 rounded p-2 mb-1">
                                  <p className="text-xs text-gray-700 dark:text-gray-300">{resp.text}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-gray-400">Tipo: {resp.type}</span>
                                    {resp.example && <span className="text-[10px] text-gray-400">| {resp.example}</span>}
                                  </div>
                                </div>
                              ))}
                              <button
                                onClick={() => {
                                  const text = prompt('Texto de la respuesta:');
                                  if (!text) return;
                                  const type = prompt('Tipo (pregunta, reencuadre, evidencia, concesion, empatia):') || 'pregunta';
                                  const example = prompt('Ejemplo/nota (opcional):') || '';
                                  const newResponses = [...(obj.responses || []), { text, type, example }];
                                  updateObjection(obj.id, { responses: newResponses });
                                }}
                                className="text-[10px] text-primary-600 hover:underline mt-1"
                              >
                                + Agregar respuesta
                              </button>
                            </div>

                            {/* Signals Working */}
                            <div>
                              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Señales de que funciona</h4>
                              {editingField?.id === obj.id && editingField.field === 'signalsWorking' ? (
                                <textarea
                                  className="input text-xs w-full"
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  onBlur={() => { updateObjection(obj.id, { signalsWorking: editValue }); cancelEdit(); }}
                                  autoFocus
                                />
                              ) : (
                                <p
                                  className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-1 rounded"
                                  onClick={() => startEdit(obj.id, 'signalsWorking', obj.signalsWorking || '')}
                                >
                                  {obj.signalsWorking || 'Click para editar'}
                                </p>
                              )}
                            </div>

                            {/* If Not Working */}
                            <div>
                              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Si no funciona</h4>
                              {editingField?.id === obj.id && editingField.field === 'ifNotWorking' ? (
                                <textarea
                                  className="input text-xs w-full"
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  onBlur={() => { updateObjection(obj.id, { ifNotWorking: editValue }); cancelEdit(); }}
                                  autoFocus
                                />
                              ) : (
                                <p
                                  className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-1 rounded"
                                  onClick={() => startEdit(obj.id, 'ifNotWorking', obj.ifNotWorking || '')}
                                >
                                  {obj.ifNotWorking || 'Click para editar'}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <button onClick={handleAddObjection} className="btn-secondary btn-sm flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Agregar objeción
                  </button>
                </div>
              )}

              {activeTab === 'recursos' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Recursos de esta etapa agrupados por tipo.</p>
                  {Object.entries(ITEM_TYPE_CONFIG).map(([type, cfg]) => {
                    const typeItems = groupedItems[type] || [];
                    return (
                      <div key={type}>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                          <span style={{ color: cfg.color }}>{ITEM_ICONS[type]}</span>
                          {cfg.name} ({typeItems.length})
                        </h3>
                        <div className="space-y-1 ml-4">
                          {typeItems.map(item => (
                            <div key={item.id} className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
                              {editingField?.id === item.id && editingField.field === 'title' ? (
                                <input
                                  className="input text-sm flex-1"
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  onBlur={() => { updateItem(item.id, { title: editValue }); cancelEdit(); }}
                                  onKeyDown={e => e.key === 'Enter' && (updateItem(item.id, { title: editValue }), cancelEdit())}
                                  autoFocus
                                />
                              ) : (
                                <span
                                  className="text-sm text-gray-900 dark:text-white flex-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-1 rounded"
                                  onClick={() => startEdit(item.id, 'title', item.title)}
                                >
                                  {item.title}
                                </span>
                              )}
                              <button
                                onClick={() => handleDelete('item', item.id)}
                                className={`${deleteConfirm === item.id ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-2 mt-3">
                    <select
                      className="select text-xs"
                      value={newItemType}
                      onChange={e => setNewItemType(e.target.value as ItemType)}
                    >
                      {Object.entries(ITEM_TYPE_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>{v.name}</option>
                      ))}
                    </select>
                    <button onClick={handleAddItem} className="btn-secondary btn-sm flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5" /> Agregar recurso
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500">
              Seleccioná una etapa o creá una nueva para comenzar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
