import { useState, useRef, useEffect } from 'react';
import { Plus, Target, Menu, X, LogOut, User, Copy, Check, Shield, Building2 } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { ObjectiveForm } from './ObjectiveForm';
import { useAuth } from '../context/AuthContext';

export function Header() {
  const { appUser, organization, signOut, isAdmin } = useAuth();
  const [showNewObjective, setShowNewObjective] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const copyInviteCode = async () => {
    if (organization?.inviteCode) {
      await navigator.clipboard.writeText(organization.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src="/wau-logo.png" alt="WAU" className="w-10 h-10 rounded-xl object-contain" />
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  WAU Platform
                </h1>
                {organization && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {organization.name}
                  </p>
                )}
              </div>
            </div>

            {/* Desktop actions */}
            <div className="hidden sm:flex items-center gap-4">
              <ThemeToggle />
              <button
                onClick={() => setShowNewObjective(true)}
                className="btn-primary"
              >
                <Plus className="w-5 h-5" />
                Nuevo Objetivo
              </button>

              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
                    {appUser?.fullName || appUser?.email}
                  </span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 animate-scale-in">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {appUser?.fullName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {appUser?.email}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {isAdmin ? (
                          <span className="badge-primary flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Admin
                          </span>
                        ) : (
                          <span className="badge-gray">Miembro</span>
                        )}
                      </div>
                    </div>

                    {/* Organization Info */}
                    {organization && (
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <Building2 className="w-4 h-4" />
                          <span>{organization.name}</span>
                        </div>

                        {isAdmin && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              Código de invitación:
                            </p>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-800 dark:text-gray-200">
                                {organization.inviteCode}
                              </code>
                              <button
                                onClick={copyInviteCode}
                                className="p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                                title="Copiar código"
                              >
                                {copied ? (
                                  <Check className="w-4 h-4 text-success-500" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              Comparte este código para invitar usuarios
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sign Out */}
                    <div className="px-2 py-1">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="flex sm:hidden items-center gap-2">
              <ThemeToggle />
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="btn-ghost p-2"
                aria-label="Menú"
              >
                {showMobileMenu ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {showMobileMenu && (
            <div className="sm:hidden py-4 border-t border-gray-200 dark:border-gray-700 animate-slide-down space-y-3">
              {/* User Info */}
              <div className="flex items-center gap-3 px-2 py-2">
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {appUser?.fullName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {appUser?.email}
                  </p>
                </div>
              </div>

              {/* Invite Code for Admin */}
              {isAdmin && organization && (
                <div className="px-2 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Código de invitación:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs font-mono">
                      {organization.inviteCode}
                    </code>
                    <button
                      onClick={copyInviteCode}
                      className="p-1.5 rounded text-gray-400 hover:text-primary-600"
                    >
                      {copied ? <Check className="w-4 h-4 text-success-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setShowNewObjective(true);
                  setShowMobileMenu(false);
                }}
                className="btn-primary w-full"
              >
                <Plus className="w-5 h-5" />
                Nuevo Objetivo
              </button>

              <button
                onClick={handleSignOut}
                className="btn-secondary w-full"
              >
                <LogOut className="w-5 h-5" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </header>

      <ObjectiveForm
        isOpen={showNewObjective}
        onClose={() => setShowNewObjective(false)}
      />
    </>
  );
}
