import { useState } from 'react';
import { UserPlus, Trash2, Info, Pencil, LayoutGrid, List, MessageCircle, Copy, Phone } from 'lucide-react';
import { Modal } from '../Modal';
import { useProjects } from '../../context/ProjectContext';
import { supabase } from '../../lib/supabase';
import {
  PARTICIPANT_ROLE_CONFIG,
  type ProjectParticipant,
  type ParticipantRole,
} from '../../types/projects';

const ROLE_DESCRIPTIONS: Record<ParticipantRole, string> = {
  alumno: 'Persona que realiza el curso/consultoría. Completa los módulos y tareas asignadas.',
  consultor: 'Profesional que guía al alumno, entrega materiales y hace seguimiento del progreso.',
  admin: 'Supervisor general del proyecto. Tiene visibilidad completa y puede gestionar todo.',
  sponsor: 'Contacto del cliente o sponsor que aprueba entregables y da feedback.',
};

interface TeamSectionProps {
  projectId: string;
  participants: ProjectParticipant[];
}

export function TeamSection({ projectId, participants }: TeamSectionProps) {
  const { addParticipant, updateParticipantRole, removeParticipant, fetchParticipants } = useProjects();

  const [showModal, setShowModal] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<ParticipantRole>('alumno');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showRoleInfo, setShowRoleInfo] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [editingParticipant, setEditingParticipant] = useState<ProjectParticipant | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSave = async () => {
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) {
      setSaveError('El nombre y email son obligatorios.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const newParticipant = await addParticipant({
        projectId,
        userId: '',
        userName: trimmedName,
        userEmail: trimmedEmail,
        role,
        hourlyRate: null,
        allocatedHours: null,
      });
      // Update phone if provided
      if (phone.trim() && newParticipant?.userId) {
        await (supabase as any).from('users').update({ phone: phone.trim() }).eq('id', newParticipant.userId);
      }
      setShowModal(false);
      setFullName('');
      setEmail('');
      setPhone('');
      setRole('alumno');
      setSaveError(null);
      fetchParticipants(projectId);
      setSuccessMsg(`Miembro agregado: ${trimmedEmail}\n\nContraseña de acceso: WAU2026`);
    } catch (err: any) {
      const msg = err?.message || err?.details || JSON.stringify(err);
      console.error('Error adding participant:', msg, err);
      setSaveError('Error: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    await removeParticipant(id);
    setConfirmDelete(null);
    fetchParticipants(projectId);
  };

  const handleOpenEdit = (p: ProjectParticipant) => {
    setEditingParticipant(p);
    setEditName(p.userName || '');
    setEditEmail(p.userEmail || '');
    setEditPhone(p.userPhone || '');
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingParticipant) return;
    const trimmedName = editName.trim();
    const trimmedEmail = editEmail.trim();
    if (!trimmedName || !trimmedEmail) {
      setEditError('El nombre y email son obligatorios.');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const db = supabase as any;
      const { error } = await db
        .from('users')
        .update({ full_name: trimmedName, email: trimmedEmail.toLowerCase(), phone: editPhone.trim() || null })
        .eq('id', editingParticipant.userId);
      if (error) throw error;
      setEditingParticipant(null);
      fetchParticipants(projectId);
    } catch (err: any) {
      setEditError(err?.message || 'Error al actualizar');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Equipo</h3>
          <button
            onClick={() => setShowRoleInfo(!showRoleInfo)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="Ver descripción de roles"
          >
            <Info className="w-4 h-4" />
          </button>
          <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden ml-2">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 ${viewMode === 'cards' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 ${viewMode === 'list' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {participants.some(p => p.userPhone) && (
            <button onClick={() => setShowWhatsApp(true)} className="btn-secondary btn-sm flex items-center gap-1 text-green-600 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/20">
              <MessageCircle className="w-4 h-4" />
              Grupo WhatsApp
            </button>
          )}
          <button onClick={() => setShowModal(true)} className="btn-primary btn-sm flex items-center gap-1">
            <UserPlus className="w-4 h-4" />
            Agregar Miembro
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-sm text-green-700 dark:text-green-300 whitespace-pre-line">
          {successMsg}
          <button onClick={() => setSuccessMsg(null)} className="mt-2 block text-xs underline opacity-70 hover:opacity-100">Cerrar</button>
        </div>
      )}

      {showRoleInfo && (
        <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">Roles del equipo</h4>
          <div className="space-y-2">
            {Object.entries(PARTICIPANT_ROLE_CONFIG).map(([key, cfg]) => (
              <div key={key}>
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">{cfg.label}:</span>
                <span className="text-sm text-blue-700 dark:text-blue-400 ml-1">
                  {ROLE_DESCRIPTIONS[key as ParticipantRole]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {participants.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <UserPlus className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay miembros en el equipo</p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {participants.map((p) => (
            <div key={p.id} className="card p-4">
              <div className="flex items-start justify-between mb-1">
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {p.userName || p.userEmail || p.userId}
                  </h4>
                  {p.userEmail && p.userName && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.userEmail}</p>
                  )}
                  {p.userPhone && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate flex items-center gap-1">
                      <Phone className="w-3 h-3" />{p.userPhone}
                    </p>
                  )}
                </div>
                <select
                  value={p.role}
                  onChange={async (e) => {
                    await updateParticipantRole(p.id, e.target.value);
                    fetchParticipants(projectId);
                  }}
                  className="text-xs px-2 py-0.5 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer"
                >
                  {Object.entries(PARTICIPANT_ROLE_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                {ROLE_DESCRIPTIONS[p.role]}
              </p>
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <button onClick={() => handleOpenEdit(p)} className="btn-ghost btn-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 text-xs">
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                {confirmDelete === p.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-500">Confirmar?</span>
                    <button onClick={() => handleRemove(p.id)} className="btn-danger btn-sm text-xs">Si</button>
                    <button onClick={() => setConfirmDelete(null)} className="btn-ghost btn-sm text-xs">No</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(p.id)} className="btn-ghost btn-sm text-red-500 dark:text-red-400 flex items-center gap-1 text-xs">
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Rol</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {p.userName || p.userId}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {p.userEmail || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={p.role}
                      onChange={async (e) => {
                        await updateParticipantRole(p.id, e.target.value);
                        fetchParticipants(projectId);
                      }}
                      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer"
                    >
                      {Object.entries(PARTICIPANT_ROLE_CONFIG).map(([key, cfg]) => (
                        <option key={key} value={key}>{cfg.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleOpenEdit(p)} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded" title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {confirmDelete === p.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleRemove(p.id)} className="text-xs text-red-600 font-medium px-1">Si</button>
                          <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-500 px-1">No</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(p.id)} className="p-1.5 text-red-400 hover:text-red-600 rounded" title="Eliminar">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setSaveError(null); }} title="Agregar Miembro">
        <div className="space-y-4">
          <div>
            <label className="label">Nombre completo *</label>
            <input
              type="text"
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Juan Pérez"
            />
          </div>

          <div>
            <label className="label">Email *</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@ejemplo.com"
            />
            <p className="text-xs text-gray-400 mt-1">
              Si el usuario no existe, se creará una cuenta y recibirá un email para establecer su contraseña
            </p>
          </div>

          <div>
            <label className="label">Teléfono (con código de país)</label>
            <input
              type="tel"
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="5491123456789"
            />
            <p className="text-xs text-gray-400 mt-1">Para WhatsApp. Ej: 5491123456789 (sin + ni espacios)</p>
          </div>

          <div>
            <label className="label">Rol</label>
            <select className="select" value={role} onChange={(e) => setRole(e.target.value as ParticipantRole)}>
              {Object.entries(PARTICIPANT_ROLE_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">{ROLE_DESCRIPTIONS[role]}</p>
          </div>

          {saveError && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">{saveError}</p>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={() => { setShowModal(false); setSaveError(null); }} className="btn-secondary">Cancelar</button>
            <button
              onClick={handleSave}
              disabled={!fullName.trim() || !email.trim() || saving}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Agregar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* WhatsApp Group Modal */}
      <Modal isOpen={showWhatsApp} onClose={() => setShowWhatsApp(false)} title="Crear Grupo WhatsApp">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            WhatsApp no permite crear grupos automáticamente desde una web. Usá los números de abajo para crear el grupo manualmente.
          </p>

          <div className="space-y-2">
            {participants.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/30 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.userName || p.userEmail}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {p.userPhone || 'Sin teléfono'}
                  </p>
                </div>
                {p.userPhone && (
                  <a
                    href={`https://wa.me/${p.userPhone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 dark:text-green-400 font-medium"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Abrir chat
                  </a>
                )}
              </div>
            ))}
          </div>

          {participants.some(p => p.userPhone) && (
            <button
              onClick={() => {
                const phones = participants
                  .filter(p => p.userPhone)
                  .map(p => `${p.userName || 'Sin nombre'}: ${p.userPhone}`)
                  .join('\n');
                navigator.clipboard.writeText(phones);
                alert('Números copiados al portapapeles');
              }}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copiar todos los números
            </button>
          )}

          <p className="text-xs text-gray-400 dark:text-gray-500">
            Tip: Copiá los números, abrí WhatsApp, creá un grupo nuevo y agregá los contactos.
          </p>
        </div>
      </Modal>

      {/* Edit Participant Modal */}
      <Modal isOpen={!!editingParticipant} onClose={() => setEditingParticipant(null)} title="Editar Miembro">
        <div className="space-y-4">
          <div>
            <label className="label">Nombre completo *</label>
            <input
              type="text"
              className="input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Email *</label>
            <input
              type="email"
              className="input"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input
              type="tel"
              className="input"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              placeholder="5491123456789"
            />
          </div>
          {editError && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">{editError}</p>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={() => setEditingParticipant(null)} className="btn-secondary">Cancelar</button>
            <button
              onClick={handleSaveEdit}
              disabled={!editName.trim() || !editEmail.trim() || editSaving}
              className="btn-primary disabled:opacity-50"
            >
              {editSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
