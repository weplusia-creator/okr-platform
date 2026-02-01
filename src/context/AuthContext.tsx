import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { AppUser, Organization, UserRole, UserType } from '../types';

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  organization: Organization | null;
  session: Session | null;
  loading: boolean;
  authError: string | null;
  signUp: (email: string, password: string, fullName: string, organizationName?: string, inviteCode?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
  orgUsers: AppUser[];
  fetchOrgUsers: () => Promise<void>;
  createOrgUser: (email: string, fullName: string, role: UserRole, jobTitle: string | null, userType?: UserType) => Promise<AppUser | null>;
  updateOrgUser: (id: string, updates: Partial<Pick<AppUser, 'fullName' | 'role' | 'jobTitle' | 'status' | 'userType'>>) => Promise<void>;
  deleteOrgUser: (id: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchUserData = useCallback(async (userId: string, _retryCount = 0): Promise<boolean> => {
    try {
      setAuthError(null);
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) {
        // If AbortError, retry up to 3 times
        if (userError.message?.includes('AbortError') || userError.message?.includes('abort') || userError.code === '20') {
          if (_retryCount < 3) {
            console.warn(`AbortError on fetchUserData, retry ${_retryCount + 1}/3`);
            await new Promise(r => setTimeout(r, 500 * (_retryCount + 1)));
            return fetchUserData(userId, _retryCount + 1);
          }
        }
        console.error('Error fetching user:', userError);
        setAuthError(`Error: ${userError.message}`);
        return false;
      }

      if (userData) {
        setAppUser({
          id: userData.id,
          email: userData.email,
          fullName: userData.full_name,
          organizationId: userData.organization_id,
          role: userData.role as UserRole,
          jobTitle: userData.job_title || null,
          status: userData.status || 'active',
          userType: (userData.user_type as UserType) || 'consultant',
          createdAt: userData.created_at,
        });

        if (userData.organization_id) {
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', userData.organization_id)
            .single();

          if (orgError) {
            console.error('Error fetching organization:', orgError);
          } else if (orgData) {
            setOrganization({
              id: orgData.id,
              name: orgData.name,
              inviteCode: orgData.invite_code,
              createdAt: orgData.created_at,
            });
          }
        }
        return true;
      }
      return false;
    } catch (error: any) {
      // If AbortError, retry up to 3 times
      const msg = error?.message || String(error);
      if ((msg.includes('AbortError') || msg.includes('abort') || msg.includes('signal')) && _retryCount < 3) {
        console.warn(`AbortError caught in fetchUserData, retry ${_retryCount + 1}/3`);
        await new Promise(r => setTimeout(r, 500 * (_retryCount + 1)));
        return fetchUserData(userId, _retryCount + 1);
      }
      console.error('Error in fetchUserData:', error);
      setAuthError(`Error: ${msg}`);
      return false;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  }, [user, fetchUserData]);

  useEffect(() => {
    let isMounted = true;

    // Safety timeout
    const timeout = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 5000);

    // Get initial session with retry on AbortError
    const tryGetSession = (attempt = 0) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserData(session.user.id).finally(() => {
            if (isMounted) setLoading(false);
          });
        } else {
          setLoading(false);
        }
      }).catch((err) => {
        const msg = String(err?.message || err);
        if ((msg.includes('abort') || msg.includes('Abort') || msg.includes('signal')) && attempt < 3) {
          console.warn(`getSession AbortError, retry ${attempt + 1}/3`);
          setTimeout(() => tryGetSession(attempt + 1), 500 * (attempt + 1));
          return;
        }
        console.error('Error getting session:', err);
        if (isMounted) setLoading(false);
      });
    };
    tryGetSession();

    // Listen for auth changes (skip INITIAL_SESSION to avoid race condition)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted || event === 'INITIAL_SESSION') return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        try {
          await fetchUserData(session.user.id);
        } catch (err) {
          console.error('Error fetching user data:', err);
        }
      } else {
        setAppUser(null);
        setOrganization(null);
      }

      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    organizationName?: string,
    inviteCode?: string
  ): Promise<{ error: Error | null }> => {
    try {
      if (inviteCode) {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id')
          .eq('invite_code', inviteCode)
          .single();

        if (orgError || !orgData) {
          return { error: new Error('Código de invitación inválido') };
        }
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            organization_name: organizationName,
            invite_code: inviteCode,
          }
        }
      });

      if (authError) {
        return { error: new Error(authError.message) };
      }

      if (!authData.user) {
        return { error: new Error('Error al crear el usuario') };
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      const success = await fetchUserData(authData.user.id);
      if (!success) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await fetchUserData(authData.user.id);
      }

      return { error: null };
    } catch (error) {
      console.error('SignUp error:', error);
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAppUser(null);
    setOrganization(null);
    setSession(null);
    setAuthError(null);
  };

  const isAdmin = appUser?.role === 'admin';

  // ===== ORG USER MANAGEMENT =====
  const [orgUsers, setOrgUsers] = useState<AppUser[]>([]);

  const fetchOrgUsers = useCallback(async () => {
    if (!appUser?.organizationId) return;
    try {
      const { data, error: err } = await supabase
        .from('users')
        .select('*')
        .eq('organization_id', appUser.organizationId)
        .order('full_name');

      if (err) throw err;

      setOrgUsers((data || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        fullName: u.full_name,
        organizationId: u.organization_id,
        role: u.role as UserRole,
        jobTitle: u.job_title || null,
        status: u.status || 'active',
        userType: (u.user_type as UserType) || 'consultant',
        createdAt: u.created_at,
      })));
    } catch (err) {
      console.error('Error fetching org users:', err);
    }
  }, [appUser?.organizationId]);

  const createOrgUser = useCallback(async (email: string, fullName: string, role: UserRole, jobTitle: string | null, userType: UserType = 'consultant'): Promise<AppUser | null> => {
    if (!appUser?.organizationId || !session?.access_token) return null;
    try {
      const res = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email,
          password: 'WAU2026',
          fullName,
          organizationId: appUser.organizationId,
          role,
          jobTitle,
          userType,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error creando usuario');

      const newUser: AppUser = {
        id: result.userId,
        email,
        fullName,
        organizationId: appUser.organizationId,
        role,
        jobTitle,
        status: 'active',
        userType,
        createdAt: new Date().toISOString(),
      };

      setOrgUsers(prev => [...prev, newUser].sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '')));
      return newUser;
    } catch (err) {
      console.error('Error creating user:', err);
      return null;
    }
  }, [appUser?.organizationId, session?.access_token]);

  const updateOrgUser = useCallback(async (id: string, updates: Partial<Pick<AppUser, 'fullName' | 'role' | 'jobTitle' | 'status' | 'userType'>>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
      if (updates.role !== undefined) dbUpdates.role = updates.role;
      if (updates.jobTitle !== undefined) dbUpdates.job_title = updates.jobTitle;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.userType !== undefined) dbUpdates.user_type = updates.userType;

      const { error: err } = await supabase
        .from('users')
        .update(dbUpdates)
        .eq('id', id);

      if (err) throw err;

      setOrgUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    } catch (err) {
      console.error('Error updating user:', err);
    }
  }, []);

  const deleteOrgUser = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (err) throw err;

      setOrgUsers(prev => prev.filter(u => u.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting user:', err);
      return false;
    }
  }, []);

  const value = {
    user,
    appUser,
    organization,
    session,
    loading,
    authError,
    signUp,
    signIn,
    signOut,
    isAdmin,
    refreshUser,
    orgUsers,
    fetchOrgUsers,
    createOrgUser,
    updateOrgUser,
    deleteOrgUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
