import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Pencil, Loader2, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { useCheckin } from '../../context/CheckinContext';
import { SECCION_CONFIG } from '../../types/checkin';
import type { PlantillaType, CheckinSeccion, TipoRespuesta } from '../../types/checkin';
import { Modal } from '../../components/Modal';

const TIPO_RESPUESTA_LABELS: Record<TipoRespuesta, string> = {
  texto: 'Texto libre',
  emoji: 'Emoji',
  slider: 'Slider (1-10)',
  si_no: 'Sí / No',
  checkbox: 'Checkbox',
};

const PLANTILLA_TYPE_LABELS: Record<PlantillaType, string> = {
  estandar: 'Estándar',
  onboarding: 'Onboarding',
  avanzado: 'Proyecto Avanzado',
  cierre: 'Cierre de Proyecto',
  custom: 'Personalizada',
};

export function CheckinPlantillas() {
  const navigate = useNavigate();
  const {
    plantillas, plantillaPreguntas, fetchPlantillas, fetchPlantillaPreguntas,
    addPlantilla, updatePlantilla, deletePlantilla,
    addPlantillaPregunta, updatePlantillaPregunta, deletePlantillaPregunta,
  } = useCheckin();

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    tipo: 'custom' as PlantillaType,
  });

  const [preguntaForm, setPreguntaForm] = useState({
    seccion: 'pulso' as CheckinSeccion,
    pregunta: '',
    tipoRespuesta: 'texto' as TipoRespuesta,
    esRequerida: false,
  });

  useEffect(() => {
    fetchPlantillas();
  }, [fetchPlantillas]);

  const handleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      fetchPlantillaPreguntas(id);
    }
  };

  const handleCreate = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);
    try {
      const p = await addPlantilla({
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        tipo: form.tipo,
        esPublica: false,
        creadoPor: null as any,
      });
      if (p) {
        setShowCreate(false);
        setForm({ nombre: '', descripcion: '', tipo: 'custom' });
        setExpandedId(p.id);
      } else {
        alert('No se pudo crear la plantilla. Revisá la consola (F12) para más detalles.');
      }
    } catch (err: any) {
      alert('Error: ' + (err?.message || JSON.stringify(err)));
    } finally {
      setSaving(false);
    }
  };

  const handleAddPregunta = async () => {
    if (!expandedId || !preguntaForm.pregunta.trim()) return;
    setSaving(true);
    try {
      const existingPreguntas = plantillaPreguntas.filter(p => p.plantillaId === expandedId);
      await addPlantillaPregunta({
        plantillaId: expandedId,
        seccion: preguntaForm.seccion,
        pregunta: preguntaForm.pregunta.trim(),
        tipoRespuesta: preguntaForm.tipoRespuesta,
        orden: existingPreguntas.length,
        esRequerida: preguntaForm.esRequerida,
      });
      setPreguntaForm({ seccion: 'pulso', pregunta: '', tipoRespuesta: 'texto', esRequerida: false });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deletePlantilla(confirmDelete);
    setConfirmDelete(null);
    if (expandedId === confirmDelete) setExpandedId(null);
  };

  const expandedPreguntas = expandedId
    ? plantillaPreguntas.filter(p => p.plantillaId === expandedId).sort((a, b) => a.orden - b.orden)
    : [];

  // Group by section
  const preguntasBySec = expandedPreguntas.reduce<Record<string, typeof expandedPreguntas>>((acc, p) => {
    if (!acc[p.seccion]) acc[p.seccion] = [];
    acc[p.seccion].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Plantillas de Check-in</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gestión de plantillas de preguntas</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nueva plantilla
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {plantillas.map(p => (
          <div key={p.id} className="card">
            <div
              className="px-5 py-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
              onClick={() => handleExpand(p.id)}
            >
              {expandedId === p.id ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white">{p.nombre}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {PLANTILLA_TYPE_LABELS[p.tipo as PlantillaType] || p.tipo}
                  </span>
                  {p.esPublica && <span className="text-xs text-blue-600">Pública</span>}
                  {p.descripcion && <span className="text-xs text-gray-400 truncate">{p.descripcion}</span>}
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); setConfirmDelete(p.id); }}
                className="p-2 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Expanded: show preguntas */}
            {expandedId === p.id && (
              <div className="border-t border-gray-200 dark:border-gray-700 px-5 py-4 space-y-4">
                {Object.entries(SECCION_CONFIG).map(([sec, cfg]) => {
                  const secPreguntas = preguntasBySec[sec] || [];
                  return (
                    <div key={sec}>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        {cfg.label}
                      </h4>
                      {secPreguntas.length > 0 ? (
                        <div className="space-y-2 mb-2">
                          {secPreguntas.map(preg => (
                            <div key={preg.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                              <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{preg.pregunta}</span>
                              <span className="text-xs text-gray-400">{TIPO_RESPUESTA_LABELS[preg.tipoRespuesta as TipoRespuesta]}</span>
                              {preg.esRequerida && <span className="text-xs text-red-500">*</span>}
                              <button onClick={() => deletePlantillaPregunta(preg.id)} className="p-1 text-gray-400 hover:text-red-500">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 mb-2">Sin preguntas</p>
                      )}
                    </div>
                  );
                })}

                {/* Add pregunta form */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Agregar pregunta</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <select
                      className="select"
                      value={preguntaForm.seccion}
                      onChange={e => setPreguntaForm(f => ({ ...f, seccion: e.target.value as CheckinSeccion }))}
                    >
                      {Object.entries(SECCION_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      className="input md:col-span-2"
                      placeholder="Pregunta..."
                      value={preguntaForm.pregunta}
                      onChange={e => setPreguntaForm(f => ({ ...f, pregunta: e.target.value }))}
                    />
                    <select
                      className="select"
                      value={preguntaForm.tipoRespuesta}
                      onChange={e => setPreguntaForm(f => ({ ...f, tipoRespuesta: e.target.value as TipoRespuesta }))}
                    >
                      {Object.entries(TIPO_RESPUESTA_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <input
                        type="checkbox"
                        checked={preguntaForm.esRequerida}
                        onChange={e => setPreguntaForm(f => ({ ...f, esRequerida: e.target.checked }))}
                      />
                      Requerida
                    </label>
                    <div className="flex-1" />
                    <button
                      onClick={handleAddPregunta}
                      disabled={saving || !preguntaForm.pregunta.trim()}
                      className="btn-primary text-sm flex items-center gap-1"
                    >
                      {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                      Agregar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {plantillas.length === 0 && (
          <div className="card p-12 text-center text-gray-500">
            No hay plantillas creadas. Creá una nueva para empezar.
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nueva Plantilla">
        <div className="space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input
              type="text"
              className="input"
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Check-in semanal estándar"
            />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea
              className="input"
              rows={2}
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              placeholder="Descripción opcional..."
            />
          </div>
          <div>
            <label className="label">Tipo</label>
            <select
              className="select"
              value={form.tipo}
              onChange={e => setForm(f => ({ ...f, tipo: e.target.value as PlantillaType }))}
            >
              {Object.entries(PLANTILLA_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleCreate} disabled={saving || !form.nombre.trim()} className="btn-primary flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Eliminar Plantilla">
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">¿Estás seguro de que querés eliminar esta plantilla? Esta acción no se puede deshacer.</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancelar</button>
            <button onClick={handleDelete} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
              Eliminar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
