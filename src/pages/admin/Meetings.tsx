import { useEffect, useState } from 'react';
import { Plus, Calendar, Clock, MapPin, Trash2, ChevronDown, ChevronRight, ExternalLink, FileText, X, Check } from 'lucide-react';
import { useMeetings } from '../../context/MeetingContext';
import { DAY_LABELS } from '../../types';
import type { Meeting, MeetingOccurrence, MeetingOccurrenceStatus } from '../../types';
import { todayLocalISO } from '../../utils/helpers';

const DAY_OPTIONS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

const STATUS_BADGE: Record<MeetingOccurrenceStatus, { label: string; cls: string }> = {
  scheduled: { label: 'Programada', cls: 'badge-primary' },
  completed: { label: 'Completada', cls: 'badge-success' },
  cancelled: { label: 'Cancelada', cls: 'badge-gray' },
};

export function Meetings() {
  const {
    meetings, occurrences, loading,
    fetchMeetings, addMeeting, deleteMeeting,
    fetchOccurrences, updateOccurrence, getGoogleCalendarUrl,
  } = useMeetings();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('10:00');
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingMinutes, setEditingMinutes] = useState<string | null>(null);
  const [minutesText, setMinutesText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const handleExpand = (meetingId: string) => {
    if (expanded === meetingId) {
      setExpanded(null);
    } else {
      setExpanded(meetingId);
      if (!occurrences[meetingId]) {
        fetchOccurrences(meetingId);
      }
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await addMeeting({ title: title.trim(), description: description.trim() || undefined, dayOfWeek, startTime, durationMinutes: duration, location: location.trim() || undefined });
      setTitle(''); setDescription(''); setDayOfWeek(1); setStartTime('10:00'); setDuration(60); setLocation('');
      setShowForm(false);
    } catch (err) {
      console.error('Error creating meeting:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleStartMinutes = (occ: MeetingOccurrence) => {
    setEditingMinutes(occ.id);
    setMinutesText(occ.minutes || '');
  };

  const handleSaveMinutes = async () => {
    if (!editingMinutes) return;
    await updateOccurrence(editingMinutes, { minutes: minutesText || null });
    setEditingMinutes(null);
  };

  const handleStatusChange = async (occ: MeetingOccurrence, status: MeetingOccurrenceStatus) => {
    await updateOccurrence(occ.id, { status });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reuniones</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {meetings.length} reunión{meetings.length !== 1 ? 'es' : ''} recurrente{meetings.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
          <Plus className="w-4 h-4" /> Nueva reunión
        </button>
      </div>

      {/* New meeting form */}
      {showForm && (
        <div className="card p-4 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Nueva reunión semanal</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="label">Título *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Weekly Standup" className="input" autoFocus />
            </div>
            <div className="md:col-span-2">
              <label className="label">Descripción</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción opcional" className="input" />
            </div>
            <div>
              <label className="label">Día de la semana *</label>
              <select value={dayOfWeek} onChange={e => setDayOfWeek(Number(e.target.value))} className="select">
                {DAY_OPTIONS.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Hora de inicio *</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Duración (minutos)</label>
              <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="select">
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
                <option value={120}>120 min</option>
              </select>
            </div>
            <div>
              <label className="label">Ubicación / Link</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Sala, Zoom link, etc." className="input" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            <button onClick={handleCreate} disabled={!title.trim() || saving} className="btn-primary">
              Crear reunión
            </button>
          </div>
        </div>
      )}

      {/* Meetings list */}
      {loading && meetings.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No hay reuniones definidas</p>
          <p className="text-sm text-gray-400">Creá una reunión semanal recurrente para empezar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map(meeting => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              isExpanded={expanded === meeting.id}
              onToggle={() => handleExpand(meeting.id)}
              occurrences={occurrences[meeting.id] || []}
              onDelete={() => setConfirmDelete(meeting.id)}
              onStartMinutes={handleStartMinutes}
              editingMinutes={editingMinutes}
              minutesText={minutesText}
              onMinutesChange={setMinutesText}
              onSaveMinutes={handleSaveMinutes}
              onCancelMinutes={() => setEditingMinutes(null)}
              onStatusChange={handleStatusChange}
              getCalendarUrl={(date) => getGoogleCalendarUrl(meeting, date)}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Eliminar reunión</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Se eliminarán todas las ocurrencias y minutas asociadas. ¿Estás seguro?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancelar</button>
              <button onClick={() => { deleteMeeting(confirmDelete); setConfirmDelete(null); if (expanded === confirmDelete) setExpanded(null); }} className="btn-danger">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MeetingCard({
  meeting, isExpanded, onToggle, occurrences, onDelete,
  onStartMinutes, editingMinutes, minutesText, onMinutesChange, onSaveMinutes, onCancelMinutes,
  onStatusChange, getCalendarUrl,
}: {
  meeting: Meeting;
  isExpanded: boolean;
  onToggle: () => void;
  occurrences: MeetingOccurrence[];
  onDelete: () => void;
  onStartMinutes: (occ: MeetingOccurrence) => void;
  editingMinutes: string | null;
  minutesText: string;
  onMinutesChange: (v: string) => void;
  onSaveMinutes: () => void;
  onCancelMinutes: () => void;
  onStatusChange: (occ: MeetingOccurrence, status: MeetingOccurrenceStatus) => void;
  getCalendarUrl: (date: string) => string;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50" onClick={onToggle}>
        <div className="flex items-center gap-3">
          {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{meeting.title}</h3>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {DAY_LABELS[meeting.dayOfWeek]}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {meeting.startTime.slice(0, 5)} ({meeting.durationMinutes} min)
              </span>
              {meeting.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[200px]">{meeting.location}</span>
                </span>
              )}
            </div>
          </div>
        </div>
        <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-2 text-gray-300 hover:text-danger-500">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {occurrences.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">Cargando ocurrencias...</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {occurrences.map(occ => {
                const isEditing = editingMinutes === occ.id;
                const dateObj = new Date(occ.date + 'T12:00:00');
                const isPast = occ.date < todayLocalISO();
                const badge = STATUS_BADGE[occ.status];

                return (
                  <div key={occ.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-900 dark:text-white w-32">
                          {dateObj.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' })}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                        {occ.minutes && <FileText className="w-3.5 h-3.5 text-primary-500" title="Tiene minuta" />}
                      </div>
                      <div className="flex items-center gap-2">
                        {occ.status === 'scheduled' && (
                          <select
                            value={occ.status}
                            onChange={e => onStatusChange(occ, e.target.value as MeetingOccurrenceStatus)}
                            onClick={e => e.stopPropagation()}
                            className="select text-xs py-1 w-auto"
                          >
                            <option value="scheduled">Programada</option>
                            <option value="completed">Completada</option>
                            <option value="cancelled">Cancelada</option>
                          </select>
                        )}
                        {occ.status === 'completed' && !isPast && (
                          <select
                            value={occ.status}
                            onChange={e => onStatusChange(occ, e.target.value as MeetingOccurrenceStatus)}
                            onClick={e => e.stopPropagation()}
                            className="select text-xs py-1 w-auto"
                          >
                            <option value="scheduled">Programada</option>
                            <option value="completed">Completada</option>
                            <option value="cancelled">Cancelada</option>
                          </select>
                        )}
                        <a
                          href={getCalendarUrl(occ.date)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="p-1.5 text-gray-400 hover:text-primary-500"
                          title="Agregar a Google Calendar"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={e => { e.stopPropagation(); onStartMinutes(occ); }}
                          className="p-1.5 text-gray-400 hover:text-primary-500"
                          title="Minuta"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={minutesText}
                          onChange={e => onMinutesChange(e.target.value)}
                          placeholder="Escribí la minuta de la reunión..."
                          className="input min-h-[120px] text-sm"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={onCancelMinutes} className="p-1.5 text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                          </button>
                          <button onClick={onSaveMinutes} className="p-1.5 text-green-600 hover:text-green-700">
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {!isEditing && occ.minutes && (
                      <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {occ.minutes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
