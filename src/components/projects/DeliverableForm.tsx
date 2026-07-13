import { useState, useEffect } from 'react';
import { toast } from '../ui/toast';
import { Plus, Trash2, Link } from 'lucide-react';
import { Modal } from '../Modal';
import { useProjects } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import {
  DELIVERABLE_STATUS_CONFIG,
  type ProjectDeliverable,
  type ProjectParticipant,
  type DeliverableStatus,
  type ChecklistItem,
} from '../../types/projects';

interface DeliverableFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  projectId: string;
  participants: ProjectParticipant[];
  deliverable?: ProjectDeliverable;
}

export function DeliverableForm({
  isOpen,
  onClose,
  projectId,
  participants,
  deliverable,
}: DeliverableFormProps) {
  const { addDeliverable, updateDeliverable, deliverables } = useProjects();
  const { orgUsers } = useAuth();
  const isEditing = !!deliverable;
  const consultants = orgUsers.filter((u) => u.userType === 'consultant' && u.status === 'active');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<DeliverableStatus>('pending');
  const [responsibleId, setResponsibleId] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<ChecklistItem[]>([]);
  const [clientFeedback, setClientFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (deliverable) {
      setName(deliverable.name);
      setDescription(deliverable.description || '');
      setDueDate(deliverable.dueDate || '');
      setStatus(deliverable.status);
      setResponsibleId(deliverable.responsibleId || '');
      setInvoiceAmount(deliverable.invoiceAmount != null ? String(deliverable.invoiceAmount) : '');
      setAttachments([...deliverable.attachments]);
      setAcceptanceCriteria([...deliverable.acceptanceCriteria]);
      setClientFeedback(deliverable.clientFeedback || '');
    } else {
      setName('');
      setDescription('');
      setDueDate('');
      setStatus('pending');
      setResponsibleId('');
      setInvoiceAmount('');
      setAttachments([]);
      setAcceptanceCriteria([]);
      setClientFeedback('');
    }
  }, [deliverable, isOpen]);

  const handleAddAttachment = () => {
    setAttachments((prev) => [...prev, '']);
  };

  const handleAttachmentChange = (index: number, value: string) => {
    setAttachments((prev) => prev.map((a, i) => (i === index ? value : a)));
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCriterion = () => {
    setAcceptanceCriteria((prev) => [...prev, { text: '', checked: false }]);
  };

  const handleCriterionTextChange = (index: number, text: string) => {
    setAcceptanceCriteria((prev) => prev.map((c, i) => (i === index ? { ...c, text } : c)));
  };

  const handleCriterionToggle = (index: number) => {
    setAcceptanceCriteria((prev) => prev.map((c, i) => (i === index ? { ...c, checked: !c.checked } : c)));
  };

  const handleRemoveCriterion = (index: number) => {
    setAcceptanceCriteria((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);

    const filteredAttachments = attachments.filter((a) => a.trim());
    const filteredCriteria = acceptanceCriteria.filter((c) => c.text.trim());
    const selectedConsultant = consultants.find((u) => u.id === responsibleId);

    try {
      if (isEditing && deliverable) {
        await updateDeliverable(deliverable.id, {
          name: name.trim(),
          description: description.trim() || null,
          dueDate: dueDate || null,
          status,
          responsibleId: responsibleId || null,
          responsibleName: selectedConsultant?.fullName || selectedConsultant?.email,
          invoiceAmount: invoiceAmount ? parseFloat(invoiceAmount) : null,
          attachments: filteredAttachments,
          acceptanceCriteria: filteredCriteria,
          clientFeedback: clientFeedback.trim() || null,
        });
      } else {
        await addDeliverable({
          projectId,
          name: name.trim(),
          description: description.trim() || null,
          dueDate: dueDate || null,
          actualDeliveryDate: null,
          status,
          responsibleId: responsibleId || null,
          responsibleName: selectedConsultant?.fullName || selectedConsultant?.email,
          attachments: filteredAttachments,
          invoiceAmount: invoiceAmount ? parseFloat(invoiceAmount) : null,
          acceptanceCriteria: filteredCriteria,
          clientFeedback: clientFeedback.trim() || null,
          sortOrder: deliverables.length,
        });
      }
      onClose();
    } catch (err: any) {
      console.error('Error saving deliverable:', err);
      toast.error('No se pudo guardar el entregable: ' + (err?.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Entregable' : 'Nuevo Entregable'}
      size="lg"
    >
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="label">Nombre *</label>
          <input
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del entregable"
          />
        </div>

        {/* Description */}
        <div>
          <label className="label">Descripcion</label>
          <textarea
            className="input min-h-[80px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripcion del entregable..."
            rows={3}
          />
        </div>

        {/* Row: Due Date + Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Fecha de entrega</label>
            <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Estado</label>
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value as DeliverableStatus)}>
              {Object.entries(DELIVERABLE_STATUS_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row: Responsible + Invoice Amount */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Responsable</label>
            <select className="select" value={responsibleId} onChange={(e) => setResponsibleId(e.target.value)}>
              <option value="">Sin asignar</option>
              {consultants.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName || u.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Monto facturacion (ARS)</label>
            <input
              type="number"
              className="input"
              value={invoiceAmount}
              onChange={(e) => setInvoiceAmount(e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        {/* Attachments */}
        <div>
          <label className="label">Adjuntos (URLs)</label>
          <div className="space-y-2">
            {attachments.map((url, index) => (
              <div key={index} className="flex items-center gap-2">
                <Link className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="url"
                  className="input flex-1"
                  value={url}
                  onChange={(e) => handleAttachmentChange(index, e.target.value)}
                  placeholder="https://..."
                />
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(index)}
                  className="btn-ghost btn-sm text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddAttachment}
            className="btn-ghost btn-sm mt-2 text-blue-600 dark:text-blue-400 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Agregar adjunto
          </button>
        </div>

        {/* Acceptance Criteria */}
        <div>
          <label className="label">Criterios de aceptacion</label>
          <div className="space-y-2">
            {acceptanceCriteria.map((criterion, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={criterion.checked}
                  onChange={() => handleCriterionToggle(index)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <input
                  type="text"
                  className="input flex-1"
                  value={criterion.text}
                  onChange={(e) => handleCriterionTextChange(index, e.target.value)}
                  placeholder="Criterio de aceptacion"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveCriterion(index)}
                  className="btn-ghost btn-sm text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddCriterion}
            className="btn-ghost btn-sm mt-2 text-blue-600 dark:text-blue-400 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Agregar criterio
          </button>
        </div>

        {/* Client Feedback */}
        <div>
          <label className="label">Feedback del cliente</label>
          <textarea
            className="input min-h-[60px]"
            value={clientFeedback}
            onChange={(e) => setClientFeedback(e.target.value)}
            placeholder="Comentarios o feedback del cliente..."
            rows={2}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Entregable'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
