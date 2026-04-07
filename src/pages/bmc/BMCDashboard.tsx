import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, LayoutGrid, FileText, Users, ChevronRight, Search, Trash2 } from 'lucide-react';
import { useBMC } from '../../context/BMCContext';
import { useProjects } from '../../context/ProjectContext';
import { BMC_CANVAS_STATUS_LABELS, BMC_CANVAS_TYPE_LABELS, BMC_TEMPLATE_TYPE_LABELS, DEFAULT_TEMPLATE_QUESTIONS } from '../../types/bmc';
import { Modal } from '../../components/Modal';
import { parseLocalDate } from '../../utils/helpers';
import type { BmcCanvasType, BmcShowResponses, BmcTemplateType } from '../../types/bmc';

export function BMCDashboard() {
  const navigate = useNavigate();
  const { canvases, fetchCanvases, addCanvas, deleteCanvas, templates, fetchTemplates, participants, fetchParticipants, responses, fetchResponses } = useBMC();
  const { projects } = useProjects();

  const [filterProject, setFilterProject] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    projectId: '',
    name: '',
    description: '',
    type: 'initial' as BmcCanvasType,
    templateId: '',
    predefinedType: '' as BmcTemplateType | '',
    dueDate: '',
    anonymousResponses: false,
    allowVoting: false,
    showOthersResponses: 'after' as BmcShowResponses,
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchCanvases();
    fetchTemplates();
  }, [fetchCanvases, fetchTemplates]);

  const filteredCanvases = filterProject
    ? canvases.filter(c => c.projectId === filterProject)
    : canvases;

  const handleCreate = async () => {
    if (!form.projectId || !form.name.trim()) return;
    setSaving(true);
    try {
      const predefinedQuestions = form.predefinedType && !form.templateId
        ? DEFAULT_TEMPLATE_QUESTIONS[form.predefinedType as BmcTemplateType]
        : undefined;
      const canvas = await addCanvas({
        projectId: form.projectId,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        templateId: form.templateId || undefined,
        predefinedQuestions: predefinedQuestions as any,
        dueDate: form.dueDate || undefined,
        anonymousResponses: form.anonymousResponses,
        allowVoting: form.allowVoting,
        showOthersResponses: form.showOthersResponses,
      });
      if (canvas) {
        setShowCreate(false);
        navigate(`/bmc/${canvas.id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Diagnóstico BMC</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Business Model Canvas — gestión de diagnósticos</p>
        </div>
        <div className="flex gap-2">
          <Link to="/bmc/templates" className="btn-secondary flex items-center gap-2">
            <FileText className="w-4 h-4" /> Plantillas
          </Link>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nuevo Canvas
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <select
          className="select max-w-xs"
          value={filterProject}
          onChange={e => setFilterProject(e.target.value)}
        >
          <option value="">Todos los proyectos</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.clientName ? `${p.clientName} — ${p.product || p.name}` : p.name}</option>
          ))}
        </select>
      </div>

      {/* Canvas list */}
      {filteredCanvases.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <LayoutGrid className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No hay canvas BMC creados</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
            Crear primer canvas
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCanvases.map(canvas => {
            const project = projects.find(p => p.id === canvas.projectId);
            const statusCfg = BMC_CANVAS_STATUS_LABELS[canvas.status];

            return (
              <div
                key={canvas.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative"
              >
                <Link to={`/bmc/${canvas.id}`} className="block">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{canvas.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {project?.clientName || project?.name || 'Sin proyecto'} — v{canvas.version}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{BMC_CANVAS_TYPE_LABELS[canvas.type]}</span>
                    {canvas.dueDate && (
                      <span>Vence: {parseLocalDate(canvas.dueDate).toLocaleDateString('es-AR')}</span>
                    )}
                  </div>
                </Link>

                <div className="flex items-center justify-between mt-3">
                  {confirmDelete === canvas.id ? (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500">¿Eliminar?</span>
                      <button onClick={() => { deleteCanvas(canvas.id); setConfirmDelete(null); }} className="text-red-600 font-medium hover:underline">Sí</button>
                      <button onClick={() => setConfirmDelete(null)} className="text-gray-500 hover:underline">No</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(canvas.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <Link to={`/bmc/${canvas.id}`}>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nuevo Canvas BMC">
        <div className="space-y-4">
          <div>
            <label className="label">Proyecto *</label>
            <select className="select" value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}>
              <option value="">Seleccionar proyecto...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.clientName ? `${p.clientName} — ${p.product || p.name}` : p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Nombre *</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: BMC Inicial" />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea className="input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo</label>
              <select className="select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as BmcCanvasType }))}>
                <option value="initial">Inicial</option>
                <option value="revision">Revisión</option>
                <option value="final">Final</option>
              </select>
            </div>
            <div>
              <label className="label">Fecha límite</label>
              <input type="date" className="input" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Plantilla de preguntas</label>
            <select
              className="select"
              value={form.templateId || (form.predefinedType ? `predefined:${form.predefinedType}` : '')}
              onChange={e => {
                const val = e.target.value;
                if (val.startsWith('predefined:')) {
                  setForm(f => ({ ...f, templateId: '', predefinedType: val.replace('predefined:', '') as BmcTemplateType }));
                } else {
                  setForm(f => ({ ...f, templateId: val, predefinedType: '' }));
                }
              }}
            >
              <option value="">Sin plantilla (canvas en blanco)</option>
              <optgroup label="Plantillas predefinidas">
                {(Object.entries(BMC_TEMPLATE_TYPE_LABELS) as [BmcTemplateType, string][])
                  .filter(([k]) => k !== 'custom')
                  .map(([k, v]) => (
                    <option key={k} value={`predefined:${k}`}>{v}</option>
                  ))}
              </optgroup>
              {templates.length > 0 && (
                <optgroup label="Mis plantillas">
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={form.anonymousResponses} onChange={e => setForm(f => ({ ...f, anonymousResponses: e.target.checked }))} className="rounded" />
              Respuestas anónimas
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={form.allowVoting} onChange={e => setForm(f => ({ ...f, allowVoting: e.target.checked }))} className="rounded" />
              Permitir votar respuestas
            </label>
            <div>
              <label className="label text-xs">Ver respuestas de otros</label>
              <select className="select" value={form.showOthersResponses} onChange={e => setForm(f => ({ ...f, showOthersResponses: e.target.value as BmcShowResponses }))}>
                <option value="yes">Siempre</option>
                <option value="no">Nunca</option>
                <option value="after">Después de responder</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleCreate} disabled={!form.projectId || !form.name.trim() || saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Creando...' : 'Crear Canvas'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
