import { useState, useEffect } from 'react';
import { toast } from '../ui/toast';
import { Plus, Calendar, CheckCircle, Trash2, Users } from 'lucide-react';
import { Modal } from '../Modal';
import { useProjects } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import type { AttendanceSession, AttendanceRecord, ProjectParticipant, ProjectModule } from '../../types/projects';
import { PARTICIPANT_ROLE_CONFIG } from '../../types/projects';
import { todayLocalISO } from '../../utils/helpers';

interface AttendanceSectionProps {
  projectId: string;
  participants: ProjectParticipant[];
}

export function AttendanceSection({ projectId, participants }: AttendanceSectionProps) {
  const { appUser } = useAuth();
  const {
    attendanceSessions,
    fetchAttendanceSessions,
    fetchAttendanceRecords,
    createAttendanceSession,
    deleteAttendanceSession,
    markAttendance,
    modules,
    fetchModules,
  } = useProjects();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDate, setSessionDate] = useState(todayLocalISO());
  const [sessionDescription, setSessionDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [attendanceMarks, setAttendanceMarks] = useState<Record<string, { present: boolean; notes: string }>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Per-session record cache for summary
  const [sessionRecordsMap, setSessionRecordsMap] = useState<Record<string, AttendanceRecord[]>>({});

  useEffect(() => {
    fetchAttendanceSessions(projectId);
    fetchModules(projectId);
  }, [projectId, fetchAttendanceSessions, fetchModules]);

  // Load records for all sessions to compute summary
  useEffect(() => {
    const loadRecords = async () => {
      const map: Record<string, AttendanceRecord[]> = {};
      for (const s of attendanceSessions) {
        map[s.id] = await fetchAttendanceRecords(s.id);
      }
      setSessionRecordsMap(map);
    };
    if (attendanceSessions.length > 0) loadRecords();
  }, [attendanceSessions, fetchAttendanceRecords]);

  const handleCreate = async () => {
    const title = sessionTitle.trim();
    if (!title || !appUser?.id) return;
    setSaving(true);
    try {
      await createAttendanceSession({
        projectId,
        moduleId: selectedModuleId && selectedModuleId !== '__custom__' ? selectedModuleId : null,
        sessionDate,
        sessionTitle: title,
        sessionDescription: sessionDescription.trim() || null,
        createdBy: appUser.id,
      });
      setShowCreateModal(false);
      setSelectedModuleId('');
      setSessionTitle('');
      setSessionDate(todayLocalISO());
      setSessionDescription('');
    } catch (err: any) {
      console.error('Error creating session:', err);
      toast.error('No se pudo crear la sesión: ' + (err?.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const handleOpenMark = async (session: AttendanceSession) => {
    setSelectedSession(session);
    const records = await fetchAttendanceRecords(session.id);
    const marks: Record<string, { present: boolean; notes: string }> = {};
    participants.forEach(p => {
      const existing = records.find(r => r.participantId === p.id);
      marks[p.id] = { present: existing?.present ?? false, notes: existing?.notes ?? '' };
    });
    setAttendanceMarks(marks);
    setShowMarkModal(true);
  };

  const handleSaveMark = async () => {
    if (!selectedSession) return;
    setSaving(true);
    try {
      await markAttendance(
        selectedSession.id,
        Object.entries(attendanceMarks).map(([participantId, m]) => ({
          participantId,
          present: m.present,
          notes: m.notes || undefined,
        }))
      );
      // Refresh records for this session
      const updated = await fetchAttendanceRecords(selectedSession.id);
      setSessionRecordsMap(prev => ({ ...prev, [selectedSession.id]: updated }));
      setShowMarkModal(false);
    } catch {
      // error handled in context
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteAttendanceSession(id);
    setConfirmDelete(null);
  };

  // Compute attendance stats per participant
  const participantStats = participants.map(p => {
    let attended = 0;
    let total = 0;
    for (const records of Object.values(sessionRecordsMap)) {
      const rec = records.find(r => r.participantId === p.id);
      if (rec) {
        total++;
        if (rec.present) attended++;
      }
    }
    return { participant: p, attended, total };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Asistencia</h3>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary btn-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nueva Sesión
        </button>
      </div>

      {/* Sessions list */}
      {attendanceSessions.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No hay sesiones de asistencia</p>
        </div>
      ) : (
        <div className="space-y-3">
          {attendanceSessions.map(session => {
            const records = sessionRecordsMap[session.id] || [];
            const presentCount = records.filter(r => r.present).length;
            const totalCount = records.length;

            return (
              <div key={session.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{session.sessionTitle}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {new Date(session.sessionDate + 'T12:00:00').toLocaleDateString('es-AR', {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    {session.sessionDescription && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 ml-8">{session.sessionDescription}</p>
                    )}
                    {totalCount > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-8">
                        Presentes: {presentCount}/{totalCount}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleOpenMark(session)} className="btn-secondary btn-sm flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      Marcar
                    </button>
                    {confirmDelete === session.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(session.id)} className="btn-danger btn-sm text-xs">Si</button>
                        <button onClick={() => setConfirmDelete(null)} className="btn-ghost btn-sm text-xs">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(session.id)} className="btn-ghost btn-sm text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Attendance summary per participant */}
      {participantStats.some(s => s.total > 0) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Resumen por participante</h4>
          <div className="space-y-3">
            {participantStats.map(({ participant, attended, total }) => {
              const rate = total > 0 ? Math.round((attended / total) * 100) : 0;
              return (
                <div key={participant.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {participant.userName || participant.userEmail}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {PARTICIPANT_ROLE_CONFIG[participant.role]?.label}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{attended}/{total}</p>
                    <p className="text-xs text-gray-500">{rate}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create session modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nueva Sesión de Asistencia">
        <div className="space-y-4">
          <div>
            <label className="label">Módulo / Título *</label>
            <select
              className="select"
              value={selectedModuleId}
              onChange={e => {
                const val = e.target.value;
                setSelectedModuleId(val);
                if (val && val !== '__custom__') {
                  const mod = modules.find(m => m.id === val);
                  if (mod) setSessionTitle(mod.title);
                } else {
                  setSessionTitle('');
                }
              }}
            >
              <option value="">Seleccionar módulo...</option>
              {modules.map(mod => (
                <option key={mod.id} value={mod.id}>{mod.title}</option>
              ))}
              <option value="__custom__">Otro (escribir título)</option>
            </select>
          </div>
          {selectedModuleId === '__custom__' && (
            <div>
              <label className="label">Título personalizado *</label>
              <input type="text" className="input" value={sessionTitle} onChange={e => setSessionTitle(e.target.value)} placeholder="Ej: Sesión especial" />
            </div>
          )}
          <div>
            <label className="label">Fecha *</label>
            <input type="date" className="input" value={sessionDate} onChange={e => setSessionDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Descripción (opcional)</label>
            <textarea className="input" rows={3} value={sessionDescription} onChange={e => setSessionDescription(e.target.value)} placeholder="Detalles de la sesión..." />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleCreate} disabled={!sessionTitle.trim() || saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Creando...' : 'Crear Sesión'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Mark attendance modal */}
      <Modal isOpen={showMarkModal} onClose={() => setShowMarkModal(false)} title={`Asistencia — ${selectedSession?.sessionTitle || ''}`}>
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {selectedSession && new Date(selectedSession.sessionDate + 'T12:00:00').toLocaleDateString('es-AR')}
          </p>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {participants.map(p => {
              const mark = attendanceMarks[p.id] || { present: false, notes: '' };
              return (
                <div key={p.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setAttendanceMarks(prev => ({
                        ...prev,
                        [p.id]: { ...prev[p.id], present: !prev[p.id]?.present },
                      }))}
                      className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                        mark.present ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                      }`}
                    >
                      {mark.present && <CheckCircle className="w-4 h-4 text-white" />}
                    </button>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{p.userName || p.userEmail}</p>
                      <p className="text-xs text-gray-500">{PARTICIPANT_ROLE_CONFIG[p.role]?.label}</p>
                    </div>
                  </div>
                  <input
                    type="text"
                    className="input mt-2 text-xs"
                    placeholder="Notas (opcional)"
                    value={mark.notes}
                    onChange={e => setAttendanceMarks(prev => ({
                      ...prev,
                      [p.id]: { ...prev[p.id], notes: e.target.value },
                    }))}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={() => setShowMarkModal(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleSaveMark} disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
