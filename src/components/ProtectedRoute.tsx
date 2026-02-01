import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';
import { useState, useEffect, type ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, appUser, organization, signOut, refreshUser, authError } = useAuth();
  const [retried, setRetried] = useState(false);

  // If user exists but appUser is null and we're done loading, retry once
  useEffect(() => {
    if (!loading && user && !appUser && !retried) {
      setRetried(true);
      refreshUser();
    }
  }, [loading, user, appUser, retried, refreshUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Wait for appUser to load, but if already retried, show error
  if (!appUser) {
    if (!retried) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary-500 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Cargando perfil...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
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
                setRetried(false);
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

  // If user has no organization, show a message
  if (!organization) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
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
