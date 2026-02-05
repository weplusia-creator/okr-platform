import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Building2, Key, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type JoinMode = 'create' | 'join';

export function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [joinMode, setJoinMode] = useState<JoinMode>('create');
  const [organizationName, setOrganizationName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await signUp(
      email,
      password,
      fullName,
      joinMode === 'create' ? organizationName : undefined,
      joinMode === 'join' ? inviteCode : undefined
    );

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Registro exitoso, redirigir al dashboard
      navigate('/home');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#2e2a2b] flex flex-col">
      {/* WAU Brand accent bar */}
      <div className="wau-accent-bar" />

      <div className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <img
              src="/wau-logo.png"
              alt="WAU"
              className="w-20 h-20 object-contain"
            />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Crear cuenta
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            ¿Ya tienes cuenta?{' '}
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
            >
              Inicia sesión
            </Link>
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="card py-8 px-6 sm:px-10">
            {error && (
              <div className="mb-6 p-4 rounded-lg bg-danger-50 dark:bg-danger-900/30 border border-danger-200 dark:border-danger-800">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-danger-500 dark:text-danger-400 flex-shrink-0" />
                  <p className="text-sm text-danger-600 dark:text-danger-300">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="label">Nombre completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input pl-10"
                    placeholder="Juan Pérez"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-10"
                    placeholder="tu@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-10"
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {/* Join Mode Toggle */}
              <div>
                <label className="label mb-3">Organización</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setJoinMode('create')}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      joinMode === 'create'
                        ? 'border-success-300 bg-success-300/20 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Building2 className={`w-5 h-5 mb-2 ${joinMode === 'create' ? 'text-primary-600' : 'text-gray-400'}`} />
                    <p className={`text-sm font-medium ${joinMode === 'create' ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}`}>
                      Crear nueva
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Serás administrador
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setJoinMode('join')}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      joinMode === 'join'
                        ? 'border-success-300 bg-success-300/20 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Key className={`w-5 h-5 mb-2 ${joinMode === 'join' ? 'text-primary-600' : 'text-gray-400'}`} />
                    <p className={`text-sm font-medium ${joinMode === 'join' ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}`}>
                      Unirme con código
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Tengo una invitación
                    </p>
                  </button>
                </div>
              </div>

              {joinMode === 'create' ? (
                <div>
                  <label className="label">Nombre de la organización</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      className="input pl-10"
                      placeholder="Mi Empresa"
                      required={joinMode === 'create'}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="label">Código de invitación</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      className="input pl-10 font-mono"
                      placeholder="abc123def456"
                      required={joinMode === 'join'}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Pide el código al administrador de tu organización
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-wau w-full py-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  'Crear cuenta'
                )}
              </button>
            </form>
          </div>

          {/* WAU branding footer */}
          <p className="mt-8 text-center text-sm text-gray-500">
            Powered by <span className="font-semibold text-gray-900">WAU</span>
          </p>
        </div>
      </div>
    </div>
  );
}
