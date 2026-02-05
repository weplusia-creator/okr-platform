import { useState, useCallback } from 'react';
import { Plus, Trash2, GripVertical, AlertCircle } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { STAGE_COLOR_OPTIONS, DEAL_STAGE_CONFIG, type PipelineStage } from '../../types/crm';
import { Modal } from '../../components/Modal';

interface StageEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function StageEditor({ isOpen, onClose }: StageEditorProps) {
  const { pipelineStages, addStage, updateStage, deleteStage, reorderStages, deals, error } = useCRM();

  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('gray');
  const [newProbability, setNewProbability] = useState(50);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const hasCustomStages = pipelineStages.length > 0 && !!pipelineStages[0].id;

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    setSaving(true);
    try {
      const name = slugify(newLabel);
      await addStage({
        name,
        label: newLabel.trim(),
        color: newColor,
        probability: newProbability,
        position: pipelineStages.length,
      });
      setNewLabel('');
      setNewColor('gray');
      setNewProbability(50);
      setShowAddForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateField = async (id: string, field: string, value: string | number) => {
    if (!id) return; // defaults don't have id
    await updateStage(id, { [field]: value });
  };

  const handleDelete = async (id: string) => {
    setDeleteError(null);
    const stage = pipelineStages.find(s => s.id === id);
    if (!stage) return;

    const dealsInStage = deals.filter(d => d.stage === stage.name);
    if (dealsInStage.length > 0) {
      setDeleteError(`No se puede eliminar "${stage.label}": hay ${dealsInStage.length} deal(s) en esta etapa`);
      return;
    }

    await deleteStage(id);
  };

  const handleDragStart = (index: number) => {
    setDragIdx(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === index) return;

    const newOrder = [...pipelineStages];
    const [moved] = newOrder.splice(dragIdx, 1);
    newOrder.splice(index, 0, moved);

    // Only reorder if all have ids (custom stages saved)
    if (newOrder.every(s => s.id)) {
      reorderStages(newOrder.map(s => s.id!));
    }
    setDragIdx(index);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
  };

  const colorOptions = Object.entries(STAGE_COLOR_OPTIONS);

  // Terminal stages config (always shown at bottom, not editable)
  const ganado = DEAL_STAGE_CONFIG['ganado'];
  const perdido = DEAL_STAGE_CONFIG['perdido'];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Etapas del Pipeline">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {deleteError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {deleteError}
          </div>
        )}

        {/* Custom pipeline stages */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Etapas del Pipeline
          </p>
          {pipelineStages.map((stage, index) => (
            <div
              key={stage.id || stage.name}
              draggable={!!stage.id}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg ${
                dragIdx === index ? 'opacity-50' : ''
              }`}
            >
              <div className="cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <GripVertical className="w-4 h-4" />
              </div>

              {/* Color selector */}
              <select
                value={stage.color}
                onChange={(e) => stage.id && handleUpdateField(stage.id, 'color', e.target.value)}
                className="w-24 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-2 py-1.5"
              >
                {colorOptions.map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>

              {/* Color preview dot */}
              <div className={`w-3 h-3 rounded-full shrink-0 ${STAGE_COLOR_OPTIONS[stage.color]?.bgClass.split(' ')[0] || 'bg-gray-300'}`} />

              {/* Label */}
              <input
                type="text"
                value={stage.label}
                onChange={(e) => stage.id && handleUpdateField(stage.id, 'label', e.target.value)}
                className="flex-1 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-2 py-1.5"
              />

              {/* Probability */}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={stage.probability}
                  onChange={(e) => stage.id && handleUpdateField(stage.id, 'probability', parseInt(e.target.value) || 0)}
                  className="w-16 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-2 py-1.5 text-center"
                />
                <span className="text-xs text-gray-400">%</span>
              </div>

              {/* Delete */}
              {stage.id && (
                <button
                  onClick={() => handleDelete(stage.id!)}
                  className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  title="Eliminar etapa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add new stage */}
        {showAddForm ? (
          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 border-dashed rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Nombre</label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Ej: Negociacion"
                  className="w-full mt-1 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Color</label>
                <select
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="w-full mt-1 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-3 py-2"
                >
                  {colorOptions.map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Probabilidad: {newProbability}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={newProbability}
                onChange={(e) => setNewProbability(parseInt(e.target.value))}
                className="w-full mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowAddForm(false); setNewLabel(''); }}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdd}
                disabled={!newLabel.trim() || saving}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Guardando...' : 'Agregar'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar Etapa
          </button>
        )}

        {/* Terminal stages (fixed, always shown) */}
        <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Etapas terminales (fijas)
          </p>
          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 rounded-lg opacity-75">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="flex-1 text-sm font-medium text-green-800 dark:text-green-300">Ganado</span>
            <span className="text-xs text-green-600 dark:text-green-400">100%</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg opacity-75">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="flex-1 text-sm font-medium text-red-800 dark:text-red-300">Perdido</span>
            <span className="text-xs text-red-600 dark:text-red-400">0%</span>
          </div>
        </div>

        {!hasCustomStages && (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Las etapas actuales son las predeterminadas. Al agregar una nueva etapa, se guardaran todas como custom.
          </p>
        )}
      </div>
    </Modal>
  );
}
