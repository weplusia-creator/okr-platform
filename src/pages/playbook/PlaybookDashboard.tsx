import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Trash2, ChevronRight, Loader2, Filter } from 'lucide-react';
import { usePlaybook } from '../../context/PlaybookContext';
import { useAuth } from '../../context/AuthContext';
import { useProjects } from '../../context/ProjectContext';
import { PLAYBOOK_STATUS_LABELS, PLAYBOOK_TYPE_LABELS, DEFAULT_CONSULTIVE_PLAYBOOK } from '../../types/playbook';
import { EDISUR_DEFINITIVO_PLAYBOOK } from '../../data/edisurPlaybook';
import { Modal } from '../../components/Modal';
import type { PlaybookType, PlaybookStatus } from '../../types/playbook';

export function PlaybookDashboard() {
  const navigate = useNavigate();
  const { playbooks, fetchPlaybooks, addPlaybook, deletePlaybook, createPlaybookFromTemplate } = usePlaybook();
  const { appUser } = useAuth();
  const { projects } = useProjects();

  const [filterStatus, setFilterStatus] = useState<PlaybookStatus | ''>('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'generico' as PlaybookType,
    template: 'consultiva' as 'none' | 'consultiva' | 'edisur',
    projectId: '',
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const isAdmin = appUser?.role === 'admin' || appUser?.role === 'super_admin';

  useEffect(() => {
    fetchPlaybooks().finally(() => setLoading(false));
  }, [fetchPlaybooks]);

  const filteredPlaybooks = filterStatus
    ? playbooks.filter(p => p.status === filterStatus)
    : playbooks;

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        projectId: form.projectId || undefined,
      };
      let playbook;
      if (form.template === 'consultiva') {
        playbook = await createPlaybookFromTemplate(data, DEFAULT_CONSULTIVE_PLAYBOOK);
      } else if (form.template === 'edisur') {
        playbook = await createPlaybookFromTemplate(data, EDISUR_DEFINITIVO_PLAYBOOK);
      } else {
        playbook = await addPlaybook(data);
      }
      if (playbook) {
        setShowCreate(false);
        setForm({ name: '', description: '', type: 'generico', template: 'consultiva', projectId: '' });
        navigate(`/playbook/${playbook.id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Playbook Comercial</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Guías y scripts para tu proceso de ventas</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nuevo Playbook
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-3 items-center">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          className="select max-w-xs"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as PlaybookStatus | '')}
        >
          <option value="">Todos</option>
          <option value="borrador">Borrador</option>
          <option value="activo">Activo</option>
          <option value="archivado">Archivado</option>
        </select>
      </div>

      {/* Playbook list */}
      {filteredPlaybooks.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No hay playbooks creados</p>
          {isAdmin && (
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
              Crear primer playbook
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredPlaybooks.map(playbook => {
            const statusCfg = PLAYBOOK_STATUS_LABELS[playbook.status];
            return (
              <div
                key={playbook.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative"
              >
                <Link to={`/playbook/${playbook.id}`} className="block">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{playbook.name}</h3>
                      {playbook.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                          {playbook.description}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">
                      {PLAYBOOK_TYPE_LABELS[playbook.type]}
                    </span>
                    <span>v{playbook.version}</span>
                  </div>
                </Link>

                <div className="flex items-center justify-between mt-3">
                  {isAdmin && (
                    <>
                      {confirmDelete === playbook.id ? (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500">¿Eliminar?</span>
                          <button onClick={() => { deletePlaybook(playbook.id); setConfirmDelete(null); }} className="text-red-600 font-medium hover:underline">Sí</button>
                          <button onClick={() => setConfirmDelete(null)} className="text-gray-500 hover:underline">No</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(playbook.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                  {!isAdmin && <div />}
                  <Link to={`/playbook/${playbook.id}`}>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nuevo Playbook">
        <div className="space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input
              className="input"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Playbook Venta Consultiva"
            />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea
              className="input"
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe el objetivo de este playbook..."
            />
          </div>
          <div>
            <label className="label">Tipo</label>
            <select
              className="select"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as PlaybookType }))}
            >
              {(Object.entries(PLAYBOOK_TYPE_LABELS) as [PlaybookType, string][]).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Proyecto (opcional)</label>
            <select
              className="select"
              value={form.projectId}
              onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
            >
              <option value="">Sin proyecto</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.clientName ? `${p.clientName} — ${p.product || p.name}` : p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Plantilla</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="radio" name="template" checked={form.template === 'consultiva'} onChange={() => setForm(f => ({ ...f, template: 'consultiva' }))} className="rounded" />
                Venta Consultiva (genérica)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="radio" name="template" checked={form.template === 'edisur'} onChange={() => setForm(f => ({ ...f, template: 'edisur' }))} className="rounded" />
                EDISUR Definitivo (inmobiliario · high ticket · inbound)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="radio" name="template" checked={form.template === 'none'} onChange={() => setForm(f => ({ ...f, template: 'none' }))} className="rounded" />
                En blanco (sin plantilla)
              </label>
            </div>
            <p className="text-xs text-gray-400 mt-1 ml-6">
              Las plantillas incluyen etapas, scripts, preguntas y objeciones precargadas
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancelar</button>
            <button
              onClick={handleCreate}
              disabled={!form.name.trim() || saving}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? 'Creando...' : 'Crear Playbook'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
