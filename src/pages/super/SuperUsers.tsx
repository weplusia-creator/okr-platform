import { useEffect, useState } from 'react';
import { Users, ArrowLeftRight, Search, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { USER_ROLE_CONFIG } from '../../types';

export function SuperUsers() {
  const { allOrganizations, fetchAllOrganizations, allUsers, fetchAllUsers, impersonateUser } = useAuth();
  const [filterOrg, setFilterOrg] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAllOrganizations();
    fetchAllUsers();
  }, [fetchAllOrganizations, fetchAllUsers]);

  const filtered = allUsers.filter(u => {
    if (filterOrg && u.organizationId !== filterOrg) return false;
    if (filterRole && u.role !== filterRole) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!u.fullName?.toLowerCase().includes(s) && !u.email.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const getOrgName = (orgId: string | null) => {
    if (!orgId) return '—';
    return allOrganizations.find(o => o.id === orgId)?.name || '—';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Todos los Usuarios</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{allUsers.length} usuarios en toda la plataforma</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="select max-w-xs" value={filterOrg} onChange={e => setFilterOrg(e.target.value)}>
          <option value="">Todas las organizaciones</option>
          {allOrganizations.map(o => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        <select className="select max-w-[160px]" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">Todos los roles</option>
          {Object.entries(USER_ROLE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Usuario</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Organización</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Rol</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Tipo</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Estado</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const roleCfg = USER_ROLE_CONFIG[u.role];
              return (
                <tr key={u.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{u.fullName || '—'}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                      <Building2 className="w-3 h-3" /> {getOrgName(u.organizationId)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${roleCfg?.bgClass || 'badge-gray'}`}>
                      {roleCfg?.label || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{u.userType === 'client' ? 'Cliente' : 'Consultor'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => impersonateUser(u.id)}
                      className="btn-secondary btn-sm flex items-center gap-1 text-xs ml-auto"
                    >
                      <ArrowLeftRight className="w-3 h-3" /> Entrar como
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No se encontraron usuarios</p>
          </div>
        )}
      </div>
    </div>
  );
}
