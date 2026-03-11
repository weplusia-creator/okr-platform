import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';
import { useRef, useEffect, type ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, appUser, organization, signOut, refreshUser, authError, sessionExpired } = useAuth();
  const autoRetried = useRef(false);

  // If user exists but appUser is null and we're done loading, auto-retry once
  useEffect(() => {
    if (!loading && user && !appUser && !autoRetried.current) {
      autoRetried.current = true;
      refreshUser();
    }
  }, [loading, user, appUser, refreshUser]);

  // Reset auto-retry flag when appUser loads successfully
  useEffect(() => {
    if (appUser) autoRetried.current = false;
  }, [appUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#2e2a2b] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  // Session expired — show message and redirect to login
  if (sessionExpired || !user) {
    if (sessionExpired) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#2e2a2b] flex items-center justify-center p-4">
          <div className="card p-8 max-w-md w-full text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Tu sesion expiro
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Volve a ingresar para continuar trabajando.
            </p>
            <button
              onClick={() => window.location.href = '/login'}
              className="btn-primary"
            >
              Ir al login
            </button>
          </div>
        </div>
      );
    }
    return <Navigate to="/login" replace />;
  }

  // Show error when appUser failed to load (auto-retry already happened)
  if (!appUser) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#2e2a2b] flex items-center justify-center p-4">
        <div className="card p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Error al cargar perfil
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No se pudo cargar tu perfil de usuario. Esto puede deberse a un problema de conexión o permisos en la base de datos.
          </p>
          {authError && (
            <p className="text-xs text-left text-danger-600 bg-danger-50 dark:bg-danger-900/30 p-3 rounded-lg mb-6 font-mono break-all">
              {authError}
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                autoRetried.current = false;
                refreshUser();
              }}
              className="btn-secondary"
            >
              Reintentar
            </button>
            <button
              onClick={() => signOut()}
              className="btn-primary"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Super admin can access without organization
  if (!organization && appUser.role === 'super_admin') {
    return <>{children}</>;
  }

  // If user has no organization, show a message
  if (!organization) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#2e2a2b] flex items-center justify-center p-4">
        <div className="card p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Sin organización
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Tu cuenta no está asociada a ninguna organización. Contacta al administrador para obtener un código de invitación.
          </p>
          <button
            onClick={() => signOut()}
            className="btn-primary"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
