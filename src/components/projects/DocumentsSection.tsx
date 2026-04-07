import { useState } from 'react';
import { Plus, Edit, Trash2, ExternalLink, FileText, CheckCircle2, Circle } from 'lucide-react';
import { Modal } from '../Modal';
import { useProjects } from '../../context/ProjectContext';
import {
  DOCUMENT_TYPE_CONFIG,
  type ProjectDocument,
  type DocumentType,
  type ChecklistItem,
} from '../../types/projects';
import { todayLocalISO } from '../../utils/helpers';

interface DocumentsSectionProps {
  projectId: string;
  documents: ProjectDocument[];
}

export function DocumentsSection({ projectId, documents }: DocumentsSectionProps) {
  const { addDocument, updateDocument, deleteDocument } = useProjects();

  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<ProjectDocument | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [type, setType] = useState<DocumentType>('other');
  const [date, setDate] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [actionItems, setActionItems] = useState<ChecklistItem[]>([]);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditingDoc(null);
    setTitle('');
    setType('other');
    setDate(todayLocalISO());
    setUrl('');
    setNotes('');
    setActionItems([]);
    setShowModal(true);
  };

  const openEdit = (doc: ProjectDocument) => {
    setEditingDoc(doc);
    setTitle(doc.title);
    setType(doc.type);
    setDate(doc.date || '');
    setUrl(doc.url || '');
    setNotes(doc.notes || '');
    setActionItems([...doc.actionItems]);
    setShowModal(true);
  };

  const handleAddActionItem = () => {
    setActionItems((prev) => [...prev, { text: '', checked: false }]);
  };

  const handleActionItemTextChange = (index: number, text: string) => {
    setActionItems((prev) => prev.map((a, i) => (i === index ? { ...a, text } : a)));
  };

  const handleActionItemToggle = (index: number) => {
    setActionItems((prev) => prev.map((a, i) => (i === index ? { ...a, checked: !a.checked } : a)));
  };

  const handleRemoveActionItem = (index: number) => {
    setActionItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);

    const filteredActions = actionItems.filter((a) => a.text.trim());

    try {
      if (editingDoc) {
        await updateDocument(editingDoc.id, {
          title: title.trim(),
          type,
          date: date || null,
          url: url.trim() || null,
          notes: notes.trim() || null,
          actionItems: filteredActions,
        });
      } else {
        await addDocument({
          projectId,
          title: title.trim(),
          type,
          date: date || null,
          url: url.trim() || null,
          notes: notes.trim() || null,
          actionItems: filteredActions,
        });
      }
      setShowModal(false);
    } catch (err) {
      console.error('Error saving document:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDocument(id);
    setConfirmDelete(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Documentos</h3>
        <button onClick={openCreate} className="btn-primary btn-sm flex items-center gap-1">
          <Plus className="w-4 h-4" />
          Agregar Documento
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay documentos registrados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => {
            const typeConfig = DOCUMENT_TYPE_CONFIG[doc.type];
            return (
              <div key={doc.id} className="card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {doc.title}
                      </h4>
                    </div>
                    <span className="badge-gray text-xs px-2 py-0.5 rounded-full">
                      {typeConfig.label}
                    </span>
                  </div>
                  {doc.url && (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 dark:text-blue-400 flex-shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>

                {doc.date && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {new Date(doc.date + 'T00:00:00').toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                )}

                {doc.notes && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-3">{doc.notes}</p>
                )}

                {doc.actionItems.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Action items ({doc.actionItems.filter((a) => a.checked).length}/{doc.actionItems.length})
                    </p>
                    <ul className="space-y-0.5">
                      {doc.actionItems.slice(0, 3).map((item, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                          {item.checked ? (
                            <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Circle className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />
                          )}
                          <span className={item.checked ? 'line-through text-gray-400 dark:text-gray-500' : ''}>
                            {item.text}
                          </span>
                        </li>
                      ))}
                      {doc.actionItems.length > 3 && (
                        <li className="text-xs text-gray-400">+{doc.actionItems.length - 3} mas...</li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => openEdit(doc)}
                    className="btn-ghost btn-sm flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  {confirmDelete === doc.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDelete(doc.id)} className="btn-danger btn-sm text-xs">
                        Si
                      </button>
                      <button onClick={() => setConfirmDelete(null)} className="btn-ghost btn-sm text-xs">
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(doc.id)}
                      className="btn-ghost btn-sm flex items-center gap-1 text-xs text-red-500 dark:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Document Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingDoc ? 'Editar Documento' : 'Nuevo Documento'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Titulo *</label>
            <input
              type="text"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titulo del documento"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo</label>
              <select className="select" value={type} onChange={(e) => setType(e.target.value as DocumentType)}>
                {Object.entries(DOCUMENT_TYPE_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Fecha</label>
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">URL</label>
            <input
              type="url"
              className="input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="label">Notas</label>
            <textarea
              className="input min-h-[80px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas del documento..."
              rows={3}
            />
          </div>

          <div>
            <label className="label">Action Items</label>
            <div className="space-y-2">
              {actionItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => handleActionItemToggle(index)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    className="input flex-1"
                    value={item.text}
                    onChange={(e) => handleActionItemTextChange(index, e.target.value)}
                    placeholder="Descripcion del action item"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveActionItem(index)}
                    className="btn-ghost btn-sm text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddActionItem}
              className="btn-ghost btn-sm mt-2 text-blue-600 dark:text-blue-400 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Agregar action item
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={() => setShowModal(false)} className="btn-secondary">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim() || saving}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? 'Guardando...' : editingDoc ? 'Guardar Cambios' : 'Crear Documento'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
