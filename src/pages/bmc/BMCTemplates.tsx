import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Copy, Trash2, ChevronDown, ChevronRight, HelpCircle } from 'lucide-react';
import { useBMC } from '../../context/BMCContext';
import { Modal } from '../../components/Modal';
import type { BmcTemplateType, BmcBlockType } from '../../types/bmc';
import { BMC_TEMPLATE_TYPE_LABELS, BMC_BLOCK_CONFIG, DEFAULT_TEMPLATE_QUESTIONS } from '../../types/bmc';

export function BMCTemplates() {
  const { templates, fetchTemplates, addTemplate, updateTemplate, deleteTemplate } = useBMC();

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', type: 'custom' as BmcTemplateType });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Editing questions state
  const [editQuestions, setEditQuestions] = useState<Record<string, { question: string; helpText?: string }[]>>({});
  const [newQuestion, setNewQuestion] = useState('');
  const [newHelpText, setNewHelpText] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const questions = form.type !== 'custom' ? DEFAULT_TEMPLATE_QUESTIONS[form.type] : DEFAULT_TEMPLATE_QUESTIONS.custom;
      await addTemplate({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        questions: questions as any,
      });
      setShowCreate(false);
      setForm({ name: '', description: '', type: 'custom' });
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (template: typeof templates[0]) => {
    await addTemplate({
      name: `${template.name} (copia)`,
      description: template.description || undefined,
      type: 'custom',
      questions: template.questions,
    });
  };

  const handleDelete = async (id: string) => {
    await deleteTemplate(id);
    setConfirmDelete(null);
  };

  const startEditQuestions = (template: typeof templates[0]) => {
    setEditingId(template.id);
    setEditQuestions(JSON.parse(JSON.stringify(template.questions)));
    setExpandedTemplate(template.id);
  };

  const saveQuestions = async () => {
    if (!editingId) return;
    await updateTemplate(editingId, { questions: editQuestions as any });
    setEditingId(null);
  };

  const addQuestionToBlock = (blockType: string) => {
    if (!newQuestion.trim()) return;
    setEditQuestions(prev => ({
      ...prev,
      [blockType]: [...(prev[blockType] || []), { question: newQuestion.trim(), helpText: newHelpText.trim() || undefined }],
    }));
    setNewQuestion('');
    setNewHelpText('');
  };

  const removeQuestionFromBlock = (blockType: string, index: number) => {
    setEditQuestions(prev => ({
      ...prev,
      [blockType]: (prev[blockType] || []).filter((_, i) => i !== index),
    }));
  };

  const updateQuestionInBlock = (blockType: string, index: number, field: 'question' | 'helpText', value: string) => {
    setEditQuestions(prev => ({
      ...prev,
      [blockType]: (prev[blockType] || []).map((q, i) => i === index ? { ...q, [field]: value || undefined } : q),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/bmc" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Plantillas BMC</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Plantillas de preguntas reutilizables para diagnósticos</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nueva Plantilla
        </button>
      </div>

      {/* All templates: predefined + saved */}
      <div className="space-y-3">
        {/* Predefined templates */}
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Predefinidas</h2>
        {(Object.entries(DEFAULT_TEMPLATE_QUESTIONS) as [BmcTemplateType, Record<BmcBlockType, { question: string; helpText?: string }[]>][])
          .filter(([k]) => k !== 'custom')
          .map(([type, qData]) => {
            const preId = `predefined:${type}`;
            const label = BMC_TEMPLATE_TYPE_LABELS[type];
            const isExpanded = expandedTemplate === preId;
            const isEditing = editingId === preId;
            const displayData = isEditing ? editQuestions : qData;
            const totalQuestions = Object.values(displayData).reduce((sum, qs) => sum + (qs?.length || 0), 0);

            return (
              <div key={type} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  onClick={() => setExpandedTemplate(isExpanded ? null : preId)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{label}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Predefinida — {totalQuestions} preguntas</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    {!isEditing && (
                      <button onClick={() => { setEditingId(preId); setEditQuestions(JSON.parse(JSON.stringify(qData))); setExpandedTemplate(preId); }} className="btn-ghost btn-sm text-xs">Editar</button>
                    )}
                    <button onClick={() => handleDuplicate({ name: label, description: null, questions: qData } as any)} className="btn-ghost btn-sm">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
                    {Object.entries(BMC_BLOCK_CONFIG).map(([bType, cfg]) => {
                      const blockQuestions = (displayData as any)[bType] || [];
                      const isBlockExp = expandedBlock === bType;

                      return (
                        <div key={bType} className="border border-gray-100 dark:border-gray-700 rounded-lg">
                          <div
                            className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30"
                            onClick={() => setExpandedBlock(isBlockExp ? null : bType)}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cfg.color }} />
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{cfg.name}</span>
                              <span className="text-[10px] text-gray-400">({blockQuestions.length})</span>
                            </div>
                            {isBlockExp ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                          </div>

                          {isBlockExp && (
                            <div className="px-3 pb-3 space-y-2">
                              {blockQuestions.map((q: any, i: number) => (
                                <div key={i} className="flex items-start gap-2 text-xs">
                                  <span className="text-gray-400 mt-0.5">{i + 1}.</span>
                                  {isEditing ? (
                                    <div className="flex-1 space-y-1">
                                      <input className="input text-xs w-full" value={q.question} onChange={e => updateQuestionInBlock(bType, i, 'question', e.target.value)} />
                                      <input className="input text-xs w-full" placeholder="Texto de ayuda (opcional)" value={q.helpText || ''} onChange={e => updateQuestionInBlock(bType, i, 'helpText', e.target.value)} />
                                    </div>
                                  ) : (
                                    <div className="flex-1">
                                      <p className="text-gray-700 dark:text-gray-300">{q.question}</p>
                                      {q.helpText && (
                                        <p className="text-gray-400 flex items-center gap-1 mt-0.5">
                                          <HelpCircle className="w-3 h-3" /> {q.helpText}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  {isEditing && (
                                    <button onClick={() => removeQuestionFromBlock(bType, i)} className="text-red-400 hover:text-red-600 mt-1">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ))}

                              {isEditing && (
                                <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-1">
                                  <input
                                    className="input text-xs"
                                    placeholder="Nueva pregunta..."
                                    value={expandedBlock === bType ? newQuestion : ''}
                                    onChange={e => setNewQuestion(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addQuestionToBlock(bType)}
                                  />
                                  <input
                                    className="input text-xs"
                                    placeholder="Texto de ayuda (opcional)"
                                    value={expandedBlock === bType ? newHelpText : ''}
                                    onChange={e => setNewHelpText(e.target.value)}
                                  />
                                  <button onClick={() => addQuestionToBlock(bType)} className="btn-secondary btn-sm text-xs">
                                    + Agregar
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {isEditing && (
                      <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <button onClick={() => setEditingId(null)} className="btn-secondary btn-sm">Cancelar</button>
                        <button
                          onClick={async () => {
                            setSaving(true);
                            try {
                              await addTemplate({ name: `${label} (editada)`, type, questions: editQuestions as any });
                              setEditingId(null);
                            } finally { setSaving(false); }
                          }}
                          className="btn-primary btn-sm"
                        >
                          {saving ? 'Guardando...' : 'Guardar como nueva plantilla'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Saved templates */}
      {templates.length > 0 && <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-6">Mis plantillas</h2>}
      {templates.length > 0 && (
        <div className="space-y-3">
          {templates.map(template => {
            const isExpanded = expandedTemplate === template.id;
            const isEditing = editingId === template.id;
            const qData = isEditing ? editQuestions : template.questions;
            const totalQuestions = Object.values(qData).reduce((sum, qs) => sum + (qs?.length || 0), 0);

            return (
              <div key={template.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
                {/* Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  onClick={() => setExpandedTemplate(isExpanded ? null : template.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{template.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {BMC_TEMPLATE_TYPE_LABELS[template.type]} — {totalQuestions} preguntas
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    {!isEditing && (
                      <button onClick={() => startEditQuestions(template)} className="btn-ghost btn-sm text-xs">Editar</button>
                    )}
                    <button onClick={() => handleDuplicate(template)} className="btn-ghost btn-sm">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {confirmDelete === template.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleDelete(template.id)} className="btn-danger btn-sm text-xs">Sí</button>
                        <button onClick={() => setConfirmDelete(null)} className="btn-ghost btn-sm text-xs">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(template.id)} className="btn-ghost btn-sm text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded: questions by block */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
                    {Object.entries(BMC_BLOCK_CONFIG).map(([type, cfg]) => {
                      const blockQuestions = (qData as any)[type] || [];
                      const isBlockExpanded = expandedBlock === type;

                      return (
                        <div key={type} className="border border-gray-100 dark:border-gray-700 rounded-lg">
                          <div
                            className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30"
                            onClick={() => setExpandedBlock(isBlockExpanded ? null : type)}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cfg.color }} />
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{cfg.name}</span>
                              <span className="text-[10px] text-gray-400">({blockQuestions.length})</span>
                            </div>
                            {isBlockExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                          </div>

                          {isBlockExpanded && (
                            <div className="px-3 pb-3 space-y-2">
                              {blockQuestions.map((q: any, i: number) => (
                                <div key={i} className="flex items-start gap-2 text-xs">
                                  <span className="text-gray-400 mt-0.5">{i + 1}.</span>
                                  {isEditing ? (
                                    <div className="flex-1 space-y-1">
                                      <input className="input text-xs w-full" value={q.question} onChange={e => updateQuestionInBlock(type, i, 'question', e.target.value)} />
                                      <input className="input text-xs w-full" placeholder="Texto de ayuda (opcional)" value={q.helpText || ''} onChange={e => updateQuestionInBlock(type, i, 'helpText', e.target.value)} />
                                    </div>
                                  ) : (
                                    <div className="flex-1">
                                      <p className="text-gray-700 dark:text-gray-300">{q.question}</p>
                                      {q.helpText && (
                                        <p className="text-gray-400 flex items-center gap-1 mt-0.5">
                                          <HelpCircle className="w-3 h-3" /> {q.helpText}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  {isEditing && (
                                    <button onClick={() => removeQuestionFromBlock(type, i)} className="text-red-400 hover:text-red-600 mt-1">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ))}

                              {isEditing && (
                                <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-1">
                                  <input
                                    className="input text-xs"
                                    placeholder="Nueva pregunta..."
                                    value={expandedBlock === type ? newQuestion : ''}
                                    onChange={e => setNewQuestion(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addQuestionToBlock(type)}
                                  />
                                  <input
                                    className="input text-xs"
                                    placeholder="Texto de ayuda (opcional)"
                                    value={expandedBlock === type ? newHelpText : ''}
                                    onChange={e => setNewHelpText(e.target.value)}
                                  />
                                  <button onClick={() => addQuestionToBlock(type)} className="btn-secondary btn-sm text-xs">
                                    + Agregar
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {isEditing && (
                      <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <button onClick={() => setEditingId(null)} className="btn-secondary btn-sm">Cancelar</button>
                        <button onClick={saveQuestions} className="btn-primary btn-sm">Guardar cambios</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nueva Plantilla BMC">
        <div className="space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Diagnóstico para Startups" />
          </div>
          <div>
            <label className="label">Tipo</label>
            <select className="select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as BmcTemplateType }))}>
              {Object.entries(BMC_TEMPLATE_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Al elegir un tipo se cargan preguntas predeterminadas que podés editar después.</p>
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea className="input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleCreate} disabled={!form.name.trim() || saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Creando...' : 'Crear Plantilla'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
