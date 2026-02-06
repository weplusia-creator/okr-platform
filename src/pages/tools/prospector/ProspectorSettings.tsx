import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Trash2,
  Loader2,
  Plus,
  Pencil,
  X,
  Settings,
  FileText,
} from 'lucide-react';
import { useProspector } from '../../../context/ProspectorContext';
import {
  MESSAGE_TYPE_CONFIG,
  MESSAGE_TONE_CONFIG,
} from '../../../types/prospector';
import type { MessageType, MessageTone } from '../../../types/prospector';

type SettingsTab = 'scoring' | 'templates';

const FIELD_NAME_OPTIONS = [
  { value: 'company_size', label: 'Tamano empresa' },
  { value: 'industry', label: 'Industria' },
  { value: 'contact_title', label: 'Cargo contacto' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Telefono' },
  { value: 'linkedin_url', label: 'LinkedIn URL' },
  { value: 'last_interaction', label: 'Ultima interaccion' },
];

const messageTypeKeys = Object.keys(MESSAGE_TYPE_CONFIG) as MessageType[];
const messageToneKeys = Object.keys(MESSAGE_TONE_CONFIG) as MessageTone[];

export function ProspectorSettings() {
  const {
    scoringCriteria,
    templates,
    loading,
    fetchScoringCriteria,
    addScoringCriteria,
    deleteScoringCriteria,
    initDefaultCriteria,
    fetchTemplates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    recalculateScores,
  } = useProspector();

  const [activeTab, setActiveTab] = useState<SettingsTab>('scoring');
  const [recalculating, setRecalculating] = useState(false);

  // Scoring form state
  const [criteriaForm, setCriteriaForm] = useState({
    name: '',
    fieldName: 'company_size',
    fieldValue: '',
    points: 10,
    weight: 1.0,
  });

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    templateType: 'first_contact' as MessageType,
    tone: 'formal' as MessageTone,
    subjectTemplate: '',
    bodyTemplate: '',
  });

  // Editing template state
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    templateType: 'first_contact' as MessageType,
    tone: 'formal' as MessageTone,
    subjectTemplate: '',
    bodyTemplate: '',
  });

  useEffect(() => {
    fetchScoringCriteria();
    fetchTemplates();
  }, [fetchScoringCriteria, fetchTemplates]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await recalculateScores();
    } finally {
      setRecalculating(false);
    }
  };

  const handleAddCriteria = async () => {
    if (!criteriaForm.name || !criteriaForm.fieldValue) return;
    await addScoringCriteria({
      name: criteriaForm.name,
      fieldName: criteriaForm.fieldName,
      fieldValue: criteriaForm.fieldValue,
      points: criteriaForm.points,
      weight: criteriaForm.weight,
      isActive: true,
    });
    setCriteriaForm({ name: '', fieldName: 'company_size', fieldValue: '', points: 10, weight: 1.0 });
  };

  const handleDeleteCriteria = async (id: string) => {
    if (!confirm('Eliminar este criterio de scoring?')) return;
    await deleteScoringCriteria(id);
  };

  const handleAddTemplate = async () => {
    if (!templateForm.name || !templateForm.bodyTemplate) return;
    await addTemplate({
      name: templateForm.name,
      templateType: templateForm.templateType,
      tone: templateForm.tone,
      subjectTemplate: templateForm.subjectTemplate || null,
      bodyTemplate: templateForm.bodyTemplate,
    });
    setTemplateForm({
      name: '',
      templateType: 'first_contact',
      tone: 'formal',
      subjectTemplate: '',
      bodyTemplate: '',
    });
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Eliminar este template?')) return;
    await deleteTemplate(id);
  };

  const startEditTemplate = (tpl: typeof templates[number]) => {
    setEditingTemplateId(tpl.id);
    setEditForm({
      name: tpl.name,
      templateType: tpl.templateType,
      tone: tpl.tone,
      subjectTemplate: tpl.subjectTemplate || '',
      bodyTemplate: tpl.bodyTemplate,
    });
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplateId || !editForm.name || !editForm.bodyTemplate) return;
    await updateTemplate(editingTemplateId, {
      name: editForm.name,
      templateType: editForm.templateType,
      tone: editForm.tone,
      subjectTemplate: editForm.subjectTemplate || null,
      bodyTemplate: editForm.bodyTemplate,
    });
    setEditingTemplateId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary-300" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/tools/prospector"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Configuracion Prospector
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Scoring y templates de IA
            </p>
          </div>
        </div>
        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="btn-primary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
          Recalcular Scores
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('scoring')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'scoring'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <span className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Scoring
          </span>
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'templates'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Templates IA
          </span>
        </button>
      </div>

      {/* Scoring Tab */}
      {activeTab === 'scoring' && (
        <div className="space-y-6">
          {scoringCriteria.length === 0 ? (
            <div className="card p-6 text-center space-y-4">
              <p className="text-gray-500 dark:text-gray-400">
                No hay criterios de scoring configurados.
              </p>
              <button
                onClick={initDefaultCriteria}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Cargar criterios por defecto
              </button>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Nombre
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Campo
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Puntos
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Peso
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Activo
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {scoringCriteria.map((c) => (
                      <tr
                        key={c.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {c.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {FIELD_NAME_OPTIONS.find((f) => f.value === c.fieldName)?.label || c.fieldName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {c.fieldValue || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {c.points > 0 ? `+${c.points}` : c.points}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {c.weight.toFixed(1)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block w-2.5 h-2.5 rounded-full ${
                              c.isActive ? 'bg-green-500' : 'bg-red-500'
                            }`}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteCriteria(c.id)}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Add Criteria Form */}
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Agregar Criterio
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={criteriaForm.name}
                  onChange={(e) => setCriteriaForm({ ...criteriaForm, name: e.target.value })}
                  placeholder="Ej: Empresa grande"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Campo
                </label>
                <select
                  value={criteriaForm.fieldName}
                  onChange={(e) => setCriteriaForm({ ...criteriaForm, fieldName: e.target.value })}
                  className="input w-full"
                >
                  {FIELD_NAME_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Valor
                </label>
                <input
                  type="text"
                  value={criteriaForm.fieldValue}
                  onChange={(e) => setCriteriaForm({ ...criteriaForm, fieldValue: e.target.value })}
                  placeholder="Ej: 1000+"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Puntos
                </label>
                <input
                  type="number"
                  value={criteriaForm.points}
                  onChange={(e) => setCriteriaForm({ ...criteriaForm, points: parseInt(e.target.value) || 0 })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Peso
                </label>
                <input
                  type="number"
                  step={0.1}
                  value={criteriaForm.weight}
                  onChange={(e) => setCriteriaForm({ ...criteriaForm, weight: parseFloat(e.target.value) || 1.0 })}
                  className="input w-full"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleAddCriteria}
                disabled={!criteriaForm.name || !criteriaForm.fieldValue}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {templates.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No hay templates configurados.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((tpl) => (
                <div key={tpl.id} className="card p-5">
                  {editingTemplateId === tpl.id ? (
                    /* Inline Edit Mode */
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Nombre
                        </label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="input w-full"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Tipo
                          </label>
                          <select
                            value={editForm.templateType}
                            onChange={(e) => setEditForm({ ...editForm, templateType: e.target.value as MessageType })}
                            className="input w-full"
                          >
                            {messageTypeKeys.map((key) => (
                              <option key={key} value={key}>
                                {MESSAGE_TYPE_CONFIG[key].label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Tono
                          </label>
                          <select
                            value={editForm.tone}
                            onChange={(e) => setEditForm({ ...editForm, tone: e.target.value as MessageTone })}
                            className="input w-full"
                          >
                            {messageToneKeys.map((key) => (
                              <option key={key} value={key}>
                                {MESSAGE_TONE_CONFIG[key].label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Asunto
                        </label>
                        <input
                          type="text"
                          value={editForm.subjectTemplate}
                          onChange={(e) => setEditForm({ ...editForm, subjectTemplate: e.target.value })}
                          className="input w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Cuerpo
                        </label>
                        <textarea
                          value={editForm.bodyTemplate}
                          onChange={(e) => setEditForm({ ...editForm, bodyTemplate: e.target.value })}
                          rows={4}
                          className="input w-full"
                        />
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => setEditingTemplateId(null)}
                          className="btn-secondary flex items-center gap-1"
                        >
                          <X className="w-4 h-4" />
                          Cancelar
                        </button>
                        <button
                          onClick={handleUpdateTemplate}
                          disabled={!editForm.name || !editForm.bodyTemplate}
                          className="btn-primary flex items-center gap-1"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <>
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                          {tpl.name}
                        </h3>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditTemplate(tpl)}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(tpl.id)}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-500/10 text-primary-400">
                          {MESSAGE_TYPE_CONFIG[tpl.templateType].label}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-500/10 text-gray-400">
                          {MESSAGE_TONE_CONFIG[tpl.tone].label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3">
                        {tpl.bodyTemplate.length > 100
                          ? `${tpl.bodyTemplate.slice(0, 100)}...`
                          : tpl.bodyTemplate}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* New Template Form */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Nuevo Template
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="Ej: Cold outreach formal"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo
                  </label>
                  <select
                    value={templateForm.templateType}
                    onChange={(e) => setTemplateForm({ ...templateForm, templateType: e.target.value as MessageType })}
                    className="input w-full"
                  >
                    {messageTypeKeys.map((key) => (
                      <option key={key} value={key}>
                        {MESSAGE_TYPE_CONFIG[key].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tono
                  </label>
                  <select
                    value={templateForm.tone}
                    onChange={(e) => setTemplateForm({ ...templateForm, tone: e.target.value as MessageTone })}
                    className="input w-full"
                  >
                    {messageToneKeys.map((key) => (
                      <option key={key} value={key}>
                        {MESSAGE_TONE_CONFIG[key].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Asunto
                </label>
                <input
                  type="text"
                  value={templateForm.subjectTemplate}
                  onChange={(e) => setTemplateForm({ ...templateForm, subjectTemplate: e.target.value })}
                  placeholder="Ej: {{contactName}}, una propuesta para {{companyName}}"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cuerpo
                </label>
                <textarea
                  value={templateForm.bodyTemplate}
                  onChange={(e) => setTemplateForm({ ...templateForm, bodyTemplate: e.target.value })}
                  rows={5}
                  placeholder="Escribe el template del cuerpo del mensaje..."
                  className="input w-full"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleAddTemplate}
                  disabled={!templateForm.name || !templateForm.bodyTemplate}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Crear Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
