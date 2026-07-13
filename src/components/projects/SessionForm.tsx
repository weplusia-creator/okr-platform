import { useState, useEffect } from 'react';
import { toast } from '../ui/toast';
import { Presentation, Video, FileText } from 'lucide-react';
import { Modal } from '../Modal';
import { useProjects } from '../../context/ProjectContext';
import type { ModuleSession } from '../../types/projects';

interface SessionFormProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId: string;
  projectId: string;
  session?: ModuleSession;
  nextSortOrder: number;
}

export function SessionForm({ isOpen, onClose, moduleId, projectId, session, nextSortOrder }: SessionFormProps) {
  const { addModuleSession, updateModuleSession, createNPSSurvey } = useProjects();
  const isEditing = !!session;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [presentationUrl, setPresentationUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [supportMaterialUrl, setSupportMaterialUrl] = useState('');
  const [createNPS, setCreateNPS] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (session) {
      setTitle(session.title);
      setDescription(session.description || '');
      setSessionDate(session.sessionDate || '');
      setPresentationUrl(session.presentationUrl || '');
      setVideoUrl(session.videoUrl || '');
      setSupportMaterialUrl(session.supportMaterialUrl || '');
      setCreateNPS(false);
    } else {
      setTitle('');
      setDescription('');
      setSessionDate('');
      setPresentationUrl('');
      setVideoUrl('');
      setSupportMaterialUrl('');
      setCreateNPS(true);
    }
  }, [session, isOpen]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);

    try {
      if (isEditing && session) {
        await updateModuleSession(session.id, {
          title: title.trim(),
          description: description.trim() || null,
          sessionDate: sessionDate || null,
          presentationUrl: presentationUrl.trim() || null,
          videoUrl: videoUrl.trim() || null,
          supportMaterialUrl: supportMaterialUrl.trim() || null,
        });
      } else {
        let npsSurveyId: string | null = null;
        if (createNPS) {
          const survey = await createNPSSurvey(projectId, title.trim());
          if (survey) npsSurveyId = survey.id;
        }

        await addModuleSession({
          moduleId,
          title: title.trim(),
          description: description.trim() || null,
          sessionDate: sessionDate || null,
          status: 'pending',
          presentationUrl: presentationUrl.trim() || null,
          videoUrl: videoUrl.trim() || null,
          supportMaterialUrl: supportMaterialUrl.trim() || null,
          npsSurveyId,
          sortOrder: nextSortOrder,
          completedAt: null,
        });
      }
      onClose();
    } catch (err: any) {
      console.error('Error saving session:', err);
      toast.error('No se pudo guardar la sesión: ' + (err?.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Sesión' : 'Nueva Sesión'} size="lg">
      <div className="space-y-4">
        <div>
          <label className="label">Título *</label>
          <input
            type="text"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nombre de la sesión"
          />
        </div>

        <div>
          <label className="label">Descripción</label>
          <textarea
            className="input min-h-[60px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="¿Qué se trabaja en esta sesión?"
            rows={2}
          />
        </div>

        <div>
          <label className="label">Fecha de la sesión</label>
          <input
            type="date"
            className="input"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label flex items-center gap-1.5">
              <Presentation className="w-3.5 h-3.5" /> Link presentación
            </label>
            <input type="url" className="input" value={presentationUrl} onChange={(e) => setPresentationUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <label className="label flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5" /> Link video
            </label>
            <input type="url" className="input" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="sm:col-span-2">
            <label className="label flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Material de apoyo
            </label>
            <input type="url" className="input" value={supportMaterialUrl} onChange={(e) => setSupportMaterialUrl(e.target.value)} placeholder="https://..." />
          </div>
        </div>

        {!isEditing && (
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={createNPS}
              onChange={(e) => setCreateNPS(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            Crear encuesta NPS para esta sesión
          </label>
        )}

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
            {saving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Sesión'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
