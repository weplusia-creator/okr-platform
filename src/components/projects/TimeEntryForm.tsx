import { useState } from 'react';
import { Modal } from '../Modal';
import { useProjects } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { todayLocalISO } from '../../utils/helpers';

interface TimeEntryFormProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  taskTitle: string;
}

export function TimeEntryForm({ isOpen, onClose, taskId, taskTitle }: TimeEntryFormProps) {
  const { addTimeEntry } = useProjects();
  const { appUser } = useAuth();

  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayLocalISO());
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!hours || parseFloat(hours) <= 0) return;
    if (!appUser?.id) return;

    setSaving(true);
    try {
      const entry: any = {
        taskId,
        userId: appUser.id,
        userName: appUser.fullName,
        hours: parseFloat(hours),
        description: description.trim() || null,
        date,
      };
      await addTimeEntry(entry);
      setHours('');
      setDescription('');
      setDate(todayLocalISO());
      onClose();
    } catch (err) {
      console.error('Error adding time entry:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Horas" size="sm">
      <div className="space-y-4">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Tarea</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{taskTitle}</p>
        </div>

        <div>
          <label className="label">Horas *</label>
          <input
            type="number"
            className="input"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="0"
            min="0.25"
            step="0.25"
          />
        </div>

        <div>
          <label className="label">Descripcion</label>
          <input
            type="text"
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Que hiciste?"
          />
        </div>

        <div>
          <label className="label">Fecha</label>
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!hours || parseFloat(hours) <= 0 || saving}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Registrar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
