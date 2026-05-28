import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Users as UsersIcon,
  Plus,
  Edit3,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  Target,
  CheckCircle,
  Clock,
  TrendingUp,
  Briefcase,
  Building2,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { supabase } from '../../lib/supabase';
import type { AppUser, UserRole, UserType } from '../../types';
import { USER_ROLE_CONFIG } from '../../types';

import { toast } from '../../components/ui/toast';
interface UserPerformance {
  totalOKRs: number;
  avgProgress: number;
  totalKRs: number;
  completedKRs: number;
  onTimeKRs: number;
}

export function Users() {
  const location = useLocation();
  const userType: UserType = location.pathname.includes('/admin/clients') ? 'client' : 'consultant';
  const isClientView = userType === 'client';

  const { orgUsers, fetchOrgUsers, createOrgUser, updateOrgUser, deleteOrgUser } = useAuth();
  const { clients } = useFinance();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [performance, setPerformance] = useState<Record<string, UserPerformance>>({});
  const [loadingPerf, setLoadingPerf] = useState<string | null>(null);

  // New user form
  const [showNew, setShowNew] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('member');
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newClientId, setNewClientId] = useState('');
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit user
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('member');
  const [editJobTitle, setEditJobTitle] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [editUserType, setEditUserType] = useState<UserType>('consultant');
  const [editClientId, setEditClientId] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');

  const filteredUsers = useMemo(
    () => orgUsers.filter(u => u.userType === userType && u.status !== 'inactive'),
    [orgUsers, userType],
  );

  useEffect(() => {
    fetchOrgUsers().finally(() => setLoading(false));
  }, [fetchOrgUsers]);

  // Reset expanded/editing when switching views
  useEffect(() => {
    setExpandedUser(null);
    setEditingUser(null);
    setShowNew(false);
  }, [userType]);

  const fetchPerformance = useCallback(async (userId: string) => {
    if (performance[userId]) return;
    setLoadingPerf(userId);
    try {
      const { data: objectives } = await supabase
        .from('objectives')
        .select('id, status, end_date')
        .eq('owner', userId);

      if (!objectives || objectives.length === 0) {
        setPerformance(prev => ({ ...prev, [userId]: { totalOKRs: 0, avgProgress: 0, totalKRs: 0, completedKRs: 0, onTimeKRs: 0 } }));
        setLoadingPerf(null);
        return;
      }

      const objIds = objectives.map(o => o.id);
      const { data: keyResults } = await supabase
        .from('key_results')
        .select('id, objective_id, progress, updated_at')
        .in('objective_id', objIds);

      const krs = keyResults || [];
      const totalKRs = krs.length;
      const completedKRs = krs.filter(kr => kr.progress >= 100).length;

      const objProgressMap: Record<string, number[]> = {};
      for (const kr of krs) {
        if (!objProgressMap[kr.objective_id]) objProgressMap[kr.objective_id] = [];
        objProgressMap[kr.objective_id].push(kr.progress);
      }

      let totalProgress = 0;
      for (const obj of objectives) {
        const krProgresses = objProgressMap[obj.id] || [];
        const objProgress = krProgresses.length > 0 ? krProgresses.reduce((a, b) => a + b, 0) / krProgresses.length : 0;
        totalProgress += objProgress;
      }
      const avgProgress = objectives.length > 0 ? totalProgress / objectives.length : 0;

      const objEndDateMap: Record<string, string> = {};
      for (const obj of objectives) objEndDateMap[obj.id] = obj.end_date;

      let onTimeKRs = 0;
      for (const kr of krs) {
        if (kr.progress >= 100) {
          const endDate = objEndDateMap[kr.objective_id];
          if (endDate && kr.updated_at && kr.updated_at <= endDate + 'T23:59:59') {
            onTimeKRs++;
          } else if (!endDate) {
            onTimeKRs++;
          }
        }
      }

      setPerformance(prev => ({
        ...prev,
        [userId]: { totalOKRs: objectives.length, avgProgress, totalKRs, completedKRs, onTimeKRs },
      }));
    } catch (err) {
      console.error('Error fetching performance:', err);
    }
    setLoadingPerf(null);
  }, [performance]);

  const handleToggleUser = useCallback(async (userId: string) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
      return;
    }
    setExpandedUser(userId);
    await fetchPerformance(userId);
  }, [expandedUser, fetchPerformance]);

  const handleCreate = async () => {
    if (!newEmail.trim() || !newName.trim()) return;
    setSaving(true);
    setCreateError(null);
    try {
      const result = await createOrgUser(newEmail.trim(), newName.trim(), newRole, newJobTitle.trim() || null, userType, newClientId || null);
      if (result) {
        setShowNew(false);
        setNewEmail('');
        setNewName('');
        setNewRole('member');
        setNewJobTitle('');
        setNewClientId('');
        // Show a friendly success toast based on whether the invite
        // email was sent (preferred flow) or the user was created
        // with an explicit password (legacy).
        if (result.inviteSent) {
          toast.success(
            `✓ ${result.user.fullName} creado. Le mandamos un mail a ${result.user.email} con el link para activar la cuenta (revisá también spam).`,
            { duration: 8000 },
          );
        } else {
          toast.success(`✓ Usuario creado: ${result.user.fullName} (${result.user.email})`);
        }
      } else {
        setCreateError('Error al crear usuario.');
      }
    } catch (err: any) {
      setCreateError(err?.message || 'Error al crear usuario.');
    }
    setSaving(false);
  };

  const handleUpdate = async (id: string) => {
    await updateOrgUser(id, {
      fullName: editName.trim(),
      role: editRole,
      jobTitle: editJobTitle.trim() || null,
      status: editStatus,
      userType: editUserType,
      clientId: editClientId || null,
      birthDate: editBirthDate || null,
    });
    setEditingUser(null);
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    await deleteOrgUser(id);
    setConfirmDelete(null);
    setDeleting(false);
  };

  const startEdit = (u: AppUser) => {
    setEditingUser(u.id);
    setExpandedUser(u.id);
    setEditName(u.fullName || '');
    setEditRole(u.role);
    setEditJobTitle(u.jobTitle || '');
    setEditStatus(u.status);
    setEditUserType(u.userType);
    setEditClientId(u.clientId || '');
    setEditBirthDate(u.birthDate || '');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const PageIcon = isClientView ? Building2 : Briefcase;
  const title = isClientView ? 'Equipo Clientes' : 'Equipo Consultor';
  const subtitle = isClientView
    ? 'Gestioná los usuarios de tus clientes'
    : 'Gestioná tu equipo de consultores';
  const emptyLabel = isClientView ? 'No hay usuarios de clientes' : 'No hay consultores';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <PageIcon className="w-7 h-7 text-primary-500" />
            {title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{subtitle}</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <Plus className="w-5 h-5" />
          Nuevo usuario
        </button>
      </div>

      {/* New user form */}
      {showNew && (
        <div className="card p-4 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Nuevo usuario</h3>
          {createError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">{createError}</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre completo *</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="input" placeholder="Juan Pérez" autoFocus />
            </div>
            <div>
              <label className="label">Email *</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="input" placeholder="juan@empresa.com" />
            </div>
            <div>
              <label className="label">Rol</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value as UserRole)} className="select">
                {(Object.keys(USER_ROLE_CONFIG) as UserRole[]).map(r => (
                  <option key={r} value={r}>{USER_ROLE_CONFIG[r].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Puesto</label>
              <input type="text" value={newJobTitle} onChange={e => setNewJobTitle(e.target.value)} className="input" placeholder="Product Manager" />
            </div>
            {isClientView && (
              <div>
                <label className="label">Empresa cliente</label>
                <select value={newClientId} onChange={e => setNewClientId(e.target.value)} className="select">
                  <option value="">Sin vincular</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">La contraseña por defecto es <strong>WAU2026</strong></p>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowNew(false); setCreateError(null); }} className="btn-secondary">Cancelar</button>
            <button onClick={handleCreate} disabled={saving || !newEmail.trim() || !newName.trim()} className="btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Crear usuario
            </button>
          </div>
        </div>
      )}

      {/* Users list */}
      {filteredUsers.length === 0 ? (
        <div className="card p-12 text-center">
          <UsersIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{emptyLabel}</h3>
          <p className="text-gray-500 dark:text-gray-400">Agregá usuarios con el botón de arriba</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map(u => {
            const isExpanded = expandedUser === u.id;
            const isEditing = editingUser === u.id;
            const perf = performance[u.id];
            const roleConfig = USER_ROLE_CONFIG[u.role] || USER_ROLE_CONFIG.member;

            return (
              <div key={u.id} className="card overflow-hidden">
                <div className="p-4 flex items-center gap-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary-600">
                      {(u.fullName || u.email).charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <button onClick={() => handleToggleUser(u.id)} className="flex-1 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 dark:text-white">{u.fullName || u.email}</span>
                      <span className={`badge ${roleConfig.bgClass}`}>{roleConfig.label}</span>
                      {u.status === 'inactive' && <span className="badge badge-gray">Inactivo</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-sm text-gray-500 dark:text-gray-400">{u.email}</span>
                      {u.jobTitle && <span className="text-sm text-gray-400">· {u.jobTitle}</span>}
                    </div>
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(u)} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" title="Editar">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setConfirmDelete(u.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleToggleUser(u.id)} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Delete confirmation */}
                {confirmDelete === u.id && (
                  <div className="border-t border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 flex items-center justify-between">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      ¿Eliminar a <strong>{u.fullName || u.email}</strong>? Esta acción no se puede deshacer.
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmDelete(null)} className="btn-secondary text-sm" disabled={deleting}>Cancelar</button>
                      <button onClick={() => handleDelete(u.id)} className="btn-danger text-sm" disabled={deleting}>
                        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-5">
                    {/* Edit form */}
                    {isEditing && (
                      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Editar usuario</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="label">Nombre</label>
                            <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="input text-sm" />
                          </div>
                          <div>
                            <label className="label">Puesto</label>
                            <input type="text" value={editJobTitle} onChange={e => setEditJobTitle(e.target.value)} className="input text-sm" placeholder="Product Manager" />
                          </div>
                          <div>
                            <label className="label">Rol</label>
                            <select value={editRole} onChange={e => setEditRole(e.target.value as UserRole)} className="select text-sm">
                              {(Object.keys(USER_ROLE_CONFIG) as UserRole[]).map(r => (
                                <option key={r} value={r}>{USER_ROLE_CONFIG[r].label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="label">Equipo</label>
                            <select value={editUserType} onChange={e => setEditUserType(e.target.value as UserType)} className="select text-sm">
                              <option value="consultant">Consultor</option>
                              <option value="client">Cliente</option>
                            </select>
                          </div>
                          <div>
                            <label className="label">Estado</label>
                            <select value={editStatus} onChange={e => setEditStatus(e.target.value as 'active' | 'inactive')} className="select text-sm">
                              <option value="active">Activo</option>
                              <option value="inactive">Inactivo</option>
                            </select>
                          </div>
                          <div>
                            <label className="label">Fecha de nacimiento</label>
                            <input type="date" value={editBirthDate} onChange={e => setEditBirthDate(e.target.value)} className="input text-sm" />
                          </div>
                          {isClientView && (
                            <div>
                              <label className="label">Empresa cliente</label>
                              <select value={editClientId} onChange={e => setEditClientId(e.target.value)} className="select text-sm">
                                <option value="">Sin vincular</option>
                                {clients.map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingUser(null)} className="btn-secondary text-sm">Cancelar</button>
                          <button onClick={() => handleUpdate(u.id)} className="btn-primary text-sm">
                            <Save className="w-4 h-4" /> Guardar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Performance */}
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary-500" />
                        Desempeño OKR
                      </h5>
                      {loadingPerf === u.id ? (
                        <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary-600" /></div>
                      ) : perf ? (
                        perf.totalOKRs === 0 ? (
                          <p className="text-sm text-gray-400">Sin OKRs asignados</p>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Target className="w-4 h-4 text-primary-500" />
                              </div>
                              <p className="text-xl font-bold text-gray-900 dark:text-white">{perf.totalOKRs}</p>
                              <p className="text-xs text-gray-500">OKRs</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <TrendingUp className="w-4 h-4 text-blue-500" />
                              </div>
                              <p className={`text-xl font-bold ${perf.avgProgress >= 70 ? 'text-green-600' : perf.avgProgress >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {perf.avgProgress.toFixed(0)}%
                              </p>
                              <p className="text-xs text-gray-500">Progreso</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              </div>
                              <p className="text-xl font-bold text-gray-900 dark:text-white">
                                {perf.completedKRs}/{perf.totalKRs}
                              </p>
                              <p className="text-xs text-gray-500">KRs completados</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <Clock className="w-4 h-4 text-yellow-500" />
                              </div>
                              <p className="text-xl font-bold text-gray-900 dark:text-white">
                                {perf.completedKRs > 0 ? Math.round((perf.onTimeKRs / perf.completedKRs) * 100) : 0}%
                              </p>
                              <p className="text-xs text-gray-500">A tiempo</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                              <div className="flex items-center justify-center gap-1 mb-1">
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                              </div>
                              <p className="text-xl font-bold text-emerald-600">{perf.onTimeKRs}</p>
                              <p className="text-xs text-gray-500">KRs a tiempo</p>
                            </div>
                          </div>
                        )
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
