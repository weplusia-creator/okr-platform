import { useState, useEffect, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { Modal } from './Modal';
import { useOKR } from '../context/OKRContext';
import type { Objective, Quarter, OKRStatus, KeyResult } from '../types';
import { QUARTER_LABELS, STATUS_CONFIG } from '../types';
import { getCurrentQuarter, getCurrentYear, getQuarterDateRange, generateId } from '../utils/helpers';

interface ObjectiveFormProps {
  isOpen: boolean;
  onClose: () => void;
  objective?: Objective;
}

interface KeyResultInput {
  id: string;
  title: string;
  progress: number;
  targetValue?: string;
  currentValue?: string;
  unit?: string;
}

export function ObjectiveForm({ isOpen, onClose, objective }: ObjectiveFormProps) {
  const { addObjective, updateObjective } = useOKR();
  const isEditing = !!objective;

  const currentQuarter = getCurrentQuarter();
  const currentYear = getCurrentYear();
  const defaultDates = getQuarterDateRange(currentQuarter, currentYear);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'in_progress' as OKRStatus,
    quarter: currentQuarter as Quarter,
    year: currentYear,
    owner: '',
    startDate: defaultDates.start,
    endDate: defaultDates.end,
  });

  const [keyResults, setKeyResults] = useState<KeyResultInput[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (objective) {
      setFormData({
        title: objective.title,
        description: objective.description || '',
        status: objective.status,
        quarter: objective.quarter,
        year: objective.year,
        owner: objective.owner,
        startDate: objective.startDate,
        endDate: objective.endDate,
      });
      setKeyResults(
        objective.keyResults.map((kr) => ({
          id: kr.id,
          title: kr.title,
          progress: kr.progress,
          targetValue: kr.targetValue?.toString() || '',
          currentValue: kr.currentValue?.toString() || '',
          unit: kr.unit || '',
        }))
      );
    } else {
      setFormData({
        title: '',
        description: '',
        status: 'in_progress',
        quarter: currentQuarter,
        year: currentYear,
        owner: '',
        startDate: defaultDates.start,
        endDate: defaultDates.end,
      });
      setKeyResults([]);
    }
    setErrors({});
  }, [objective, isOpen]);

  const handleQuarterChange = (quarter: Quarter) => {
    const dates = getQuarterDateRange(quarter, formData.year);
    setFormData({
      ...formData,
      quarter,
      startDate: dates.start,
      endDate: dates.end,
    });
  };

  const handleYearChange = (year: number) => {
    const dates = getQuarterDateRange(formData.quarter, year);
    setFormData({
      ...formData,
      year,
      startDate: dates.start,
      endDate: dates.end,
    });
  };

  const addKeyResult = () => {
    setKeyResults([
      ...keyResults,
      { id: generateId(), title: '', progress: 0, targetValue: '', currentValue: '', unit: '' },
    ]);
  };

  const removeKeyResult = (id: string) => {
    setKeyResults(keyResults.filter((kr) => kr.id !== id));
  };

  const updateKeyResultInput = (id: string, field: keyof KeyResultInput, value: string | number) => {
    setKeyResults(
      keyResults.map((kr) =>
        kr.id === id ? { ...kr, [field]: value } : kr
      )
    );
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'El título es obligatorio';
    }

    if (!formData.owner.trim()) {
      newErrors.owner = 'El responsable es obligatorio';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'La fecha de inicio es obligatoria';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'La fecha de fin es obligatoria';
    }

    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      newErrors.endDate = 'La fecha de fin debe ser posterior a la de inicio';
    }

    keyResults.forEach((kr, index) => {
      if (!kr.title.trim()) {
        newErrors[`kr_${index}_title`] = 'El título del KR es obligatorio';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const processedKeyResults: KeyResult[] = keyResults
      .filter((kr) => kr.title.trim())
      .map((kr) => ({
        id: kr.id,
        objectiveId: objective?.id || '',
        title: kr.title.trim(),
        progress: kr.progress,
        ...(kr.targetValue && { targetValue: parseFloat(kr.targetValue) }),
        ...(kr.currentValue && { currentValue: parseFloat(kr.currentValue) }),
        ...(kr.unit && { unit: kr.unit }),
      }));

    if (isEditing && objective) {
      await updateObjective(objective.id, {
        ...formData,
        keyResults: processedKeyResults.map(kr => ({ ...kr, objectiveId: objective.id })),
      });
    } else {
      const newObjective = await addObjective(formData);
      if (newObjective && processedKeyResults.length > 0) {
        await updateObjective(newObjective.id, {
          keyResults: processedKeyResults.map(kr => ({ ...kr, objectiveId: newObjective.id })),
        });
      }
    }

    onClose();
  };

  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Objetivo' : 'Nuevo Objetivo'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="label">Título del Objetivo *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className={`input ${errors.title ? 'border-danger-500 focus:ring-danger-500' : ''}`}
            placeholder="Ej: Aumentar la retención de usuarios"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-danger-600">{errors.title}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="label">Descripción</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input min-h-[80px] resize-none"
            placeholder="Describe el objetivo y su contexto..."
            rows={3}
          />
        </div>

        {/* Owner */}
        <div>
          <label className="label">Responsable *</label>
          <input
            type="text"
            value={formData.owner}
            onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
            className={`input ${errors.owner ? 'border-danger-500 focus:ring-danger-500' : ''}`}
            placeholder="Nombre del responsable"
          />
          {errors.owner && (
            <p className="mt-1 text-sm text-danger-600">{errors.owner}</p>
          )}
        </div>

        {/* Quarter, Year, Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Trimestre</label>
            <select
              value={formData.quarter}
              onChange={(e) => handleQuarterChange(e.target.value as Quarter)}
              className="select"
            >
              {(Object.keys(QUARTER_LABELS) as Quarter[]).map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Año</label>
            <select
              value={formData.year}
              onChange={(e) => handleYearChange(parseInt(e.target.value))}
              className="select"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Estado</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as OKRStatus })}
              className="select"
            >
              {(Object.keys(STATUS_CONFIG) as OKRStatus[]).map((status) => (
                <option key={status} value={status}>
                  {STATUS_CONFIG[status].label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Fecha de inicio *</label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className={`input ${errors.startDate ? 'border-danger-500 focus:ring-danger-500' : ''}`}
            />
            {errors.startDate && (
              <p className="mt-1 text-sm text-danger-600">{errors.startDate}</p>
            )}
          </div>

          <div>
            <label className="label">Fecha de fin *</label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className={`input ${errors.endDate ? 'border-danger-500 focus:ring-danger-500' : ''}`}
            />
            {errors.endDate && (
              <p className="mt-1 text-sm text-danger-600">{errors.endDate}</p>
            )}
          </div>
        </div>

        {/* Key Results */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="label mb-0">Key Results</label>
            <button
              type="button"
              onClick={addKeyResult}
              className="btn-ghost btn-sm text-primary-600 hover:text-primary-700"
            >
              <Plus className="w-4 h-4" />
              Agregar KR
            </button>
          </div>

          {keyResults.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
              No hay Key Results. Haz clic en "Agregar KR" para añadir uno.
            </p>
          ) : (
            <div className="space-y-4">
              {keyResults.map((kr, index) => (
                <div
                  key={kr.id}
                  className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        value={kr.title}
                        onChange={(e) => updateKeyResultInput(kr.id, 'title', e.target.value)}
                        className={`input ${errors[`kr_${index}_title`] ? 'border-danger-500 focus:ring-danger-500' : ''}`}
                        placeholder="Título del Key Result"
                      />
                      {errors[`kr_${index}_title`] && (
                        <p className="text-sm text-danger-600">{errors[`kr_${index}_title`]}</p>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                            Progreso (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={kr.progress}
                            onChange={(e) =>
                              updateKeyResultInput(kr.id, 'progress', parseInt(e.target.value) || 0)
                            }
                            className="input text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                            Meta
                          </label>
                          <input
                            type="number"
                            value={kr.targetValue}
                            onChange={(e) => updateKeyResultInput(kr.id, 'targetValue', e.target.value)}
                            className="input text-sm"
                            placeholder="100"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                            Actual
                          </label>
                          <input
                            type="number"
                            value={kr.currentValue}
                            onChange={(e) => updateKeyResultInput(kr.id, 'currentValue', e.target.value)}
                            className="input text-sm"
                            placeholder="50"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                            Unidad
                          </label>
                          <input
                            type="text"
                            value={kr.unit}
                            onChange={(e) => updateKeyResultInput(kr.id, 'unit', e.target.value)}
                            className="input text-sm"
                            placeholder="%"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeKeyResult(kr.id)}
                      className="flex-shrink-0 p-1.5 rounded-md text-gray-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/30 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" className="btn-primary">
            {isEditing ? 'Guardar cambios' : 'Crear objetivo'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
