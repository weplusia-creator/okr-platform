import { useEffect, useState } from 'react';
import { Building2, Users, ChevronRight, ArrowLeftRight, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { AppUser } from '../../types';

export function Organizations() {
  const { allOrganizations, fetchAllOrganizations, allUsers, fetchAllUsers, impersonateUser } = useAuth();
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAllOrganizations();
    fetchAllUsers();
  }, [fetchAllOrganizations, fetchAllUsers]);

  const orgUsers = (orgId: string) => allUsers.filter(u => u.organizationId === orgId);
  const filteredOrgs = allOrganizations.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));

  const handleImpersonate = async (user: AppUser) => {
    await impersonateUser(user.id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Organizaciones</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Todas las organizaciones de la plataforma</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Buscar organización..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredOrgs.map(org => {
          const users = orgUsers(org.id);
          const admins = users.filter(u => u.role === 'admin');

          return (
            <div
              key={org.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedOrg(selectedOrg === org.id ? null : org.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{org.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Código: {org.inviteCode}</p>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${selectedOrg === org.id ? 'rotate-90' : ''}`} />
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {users.length} usuarios</span>
                <span>{admins.length} admins</span>
              </div>

              {selectedOrg === org.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                  {users.length === 0 ? (
                    <p className="text-xs text-gray-400">Sin usuarios</p>
                  ) : (
                    users.map(u => (
                      <div key={u.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{u.fullName || u.email}</p>
                          <p className="text-[10px] text-gray-400">{u.email} · {u.role} · {u.userType}</p>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); handleImpersonate(u); }}
                          className="btn-secondary btn-sm flex items-center gap-1 text-xs"
                        >
                          <ArrowLeftRight className="w-3 h-3" /> Entrar como
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredOrgs.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No se encontraron organizaciones</p>
        </div>
      )}
    </div>
  );
}
