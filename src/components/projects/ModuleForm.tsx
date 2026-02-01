import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '../Modal';
import { useProjects } from '../../context/ProjectContext';
import type { ProjectModule, ChecklistItem } from '../../types/projects';

interface ModuleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  projectId: string;
  module?: ProjectModule;
  nextSortOrder: number;
}

export function ModuleForm({ isOpen, onClose, onSaved, projectId, module, nextSortOrder }: ModuleFormProps) {
  const { addModule, updateModule } = useProjects();
  const isEditing = !!module;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [subtasks, setSubtasks] = useState<ChecklistItem[]>([]);
  const [sortOrder, setSortOrder] = useState(nextSortOrder);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (module) {
      setTitle(module.title);
      setDescription(module.description || '');
      setStartDate(module.startDate || '');
      setDueDate(module.dueDate || '');
      setSubtasks([...module.subtasks]);
      setSortOrder(module.sortOrder);
    } else {
      setTitle('');
      setDescription('');
      setStartDate('');
      setDueDate('');
      setSubtasks([]);
      setSortOrder(nextSortOrder);
    }
  }, [module, isOpen, nextSortOrder]);

  const handleAddSubtask = () => {
    setSubtasks((prev) => [...prev, { text: '', checked: false }]);
  };

  const handleSubtaskTextChange = (index: number, text: string) => {
    setSubtasks((prev) => prev.map((s, i) => (i === index ? { ...s, text } : s)));
  };

  const handleSubtaskToggle = (index: number) => {
    setSubtasks((prev) => prev.map((s, i) => (i === index ? { ...s, checked: !s.checked } : s)));
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);

    const filteredSubtasks = subtasks.filter((s) => s.text.trim());

    try {
      if (isEditing && module) {
        await updateModule(module.id, {
          title: title.trim(),
          description: description.trim() || null,
          startDate: startDate || null,
          dueDate: dueDate || null,
          subtasks: filteredSubtasks,
          sortOrder,
        });
      } else {
        await addModule({
          projectId,
          deliverableId: null,
          title: title.trim(),
          description: description.trim() || null,
          startDate: startDate || null,
          dueDate: dueDate || null,
          status: 'pending',
          subtasks: filteredSubtasks,
          sortOrder,
          completedAt: null,
          completedBy: null,
        });
      }
      if (onSaved) {
        onSaved();
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Error saving module:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Modulo' : 'Nuevo Modulo'} size="lg">
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="label">Titulo *</label>
          <input
            type="text"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nombre del modulo"
          />
        </div>

        {/* Description */}
        <div>
          <label className="label">Descripcion</label>
          <textarea
            className="input min-h-[80px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripcion del modulo..."
            rows={3}
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Fecha inicio</label>
            <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Fecha limite</label>
            <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        {/* Sort Order */}
        <div>
          <label className="label">Orden</label>
          <input
            type="number"
            className="input"
            value={sortOrder}
            onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
            min="0"
          />
        </div>

        {/* Subtasks */}
        <div>
          <label className="label">Subtareas</label>
          <div className="space-y-2">
            {subtasks.map((subtask, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={subtask.checked}
                  onChange={() => handleSubtaskToggle(index)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <input
                  type="text"
                  className="input flex-1"
                  value={subtask.text}
                  onChange={(e) => handleSubtaskTextChange(index, e.target.value)}
                  placeholder="Descripcion de la subtarea"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveSubtask(index)}
                  className="btn-ghost btn-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddSubtask}
            className="btn-ghost btn-sm mt-2 text-blue-600 dark:text-blue-400 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Agregar subtarea
          </button>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Modulo'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
