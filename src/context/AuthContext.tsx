import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, getAccessTokenFresh, onSessionExpired } from '../lib/supabase';
import { fetchWithTimeout } from '../lib/fetchTimeout';
import type { AppUser, Organization, UserRole, UserType } from '../types';

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  organization: Organization | null;
  session: Session | null;
  loading: boolean;
  authError: string | null;
  sessionExpired: boolean;
  signUp: (email: string, password: string, fullName: string, organizationName?: string, inviteCode?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  impersonating: boolean;
  impersonateUser: (userId: string) => Promise<void>;
  stopImpersonating: () => void;
  allOrganizations: Organization[];
  fetchAllOrganizations: () => Promise<void>;
  allUsers: AppUser[];
  fetchAllUsers: () => Promise<void>;
  refreshUser: () => Promise<void>;
  orgUsers: AppUser[];
  fetchOrgUsers: () => Promise<void>;
  createOrgUser: (email: string, fullName: string, role: UserRole, jobTitle: string | null, userType?: UserType, clientId?: string | null) => Promise<{ user: AppUser; inviteSent: boolean } | null>;
  updateOrgUser: (id: string, updates: Partial<Pick<AppUser, 'fullName' | 'role' | 'jobTitle' | 'status' | 'userType' | 'clientId'>>) => Promise<void>;
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
  const [sessionExpired, setSessionExpired] = useState(false);

  // Listen for irrecoverable session expiry (refresh token dead)
  useEffect(() => {
    return onSessionExpired(() => {
      setSessionExpired(true);
      setUser(null);
      setAppUser(null);
      setOrganization(null);
      setSession(null);
    });
  }, []);

  // Super admin impersonation
  const [realUser, setRealUser] = useState<AppUser | null>(null);
  const [realOrganization, setRealOrganization] = useState<Organization | null>(null);
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);

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
          clientId: userData.client_id || null,
          birthDate: userData.birth_date || null,
          phone: userData.phone || null,
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
      setLoading(true);
      setAuthError(null);
      try {
        await fetchUserData(user.id);
      } finally {
        setLoading(false);
      }
    }
  }, [user, fetchUserData]);

  useEffect(() => {
    let isMounted = true;

    // ── Hard reload safety net (last resort) ────────────────────
    // If the app is still loading after 12 seconds, the Supabase
    // client / network state is almost certainly stuck (this happens
    // when the tab was backgrounded for a long time and the
    // WebSocket/auth token recovery hangs). Auto-reload — matches what
    // the user would do manually with F5, but without forcing them to
    // notice the eternal spinner first.
    let bootstrapResolved = false;
    const hardReloadTimeout = setTimeout(() => {
      if (!isMounted || bootstrapResolved) return;
      // Only reload if we are visibly stuck — if loading already
      // resolved (logged in or logged out), bootstrapResolved=true and
      // we skip the reload. Matches what the user would do manually
      // with F5, but without forcing them to notice the eternal spinner.
      try { window.location.reload(); } catch {}
    }, 12_000);

    // Safety timeout: if session hasn't loaded after 5s, retry once before giving up
    const timeout = setTimeout(() => {
      if (!isMounted) return;
      // Rescue ALSO when session/user are set but loading is still true
      // (e.g. fetchUserData stuck without resolving its finally callback).
      // Original guard `if (session || user) return` allowed loading to be
      // stuck indefinitely whenever the auth-state-change fired before
      // fetchUserData completed.
      if (bootstrapResolved) return;
      if (session && user) {
        // Session looks loaded but bootstrap never resolved -> just unstick
        // the spinner. Worst case: appUser is null, ProtectedRoute renders
        // its 'Error al cargar perfil' UI with a Retry button.
        bootstrapResolved = true;
        setLoading(false);
        return;
      }
      // One last attempt before giving up
      supabase.auth.getSession().then(({ data: { session: s } }) => {
        if (!isMounted) return;
        if (s?.user) {
          setSession(s);
          setUser(s.user);
          fetchUserData(s.user.id).finally(() => {
            if (isMounted) { bootstrapResolved = true; setLoading(false); }
          });
        } else {
          bootstrapResolved = true; setLoading(false);
        }
      }).catch((err) => {
        console.warn('[AuthContext] getSession (fallback) failed:', err);
        if (isMounted) { bootstrapResolved = true; setLoading(false); }
      });
    }, 5000);

    // Get initial session with retry on AbortError
    const tryGetSession = (attempt = 0) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserData(session.user.id).finally(() => {
            if (isMounted) { bootstrapResolved = true; setLoading(false); }
          });
        } else {
          bootstrapResolved = true; setLoading(false);
        }
      }).catch((err) => {
        const msg = String(err?.message || err);
        if ((msg.includes('abort') || msg.includes('Abort') || msg.includes('signal')) && attempt < 3) {
          console.warn(`getSession AbortError, retry ${attempt + 1}/3`);
          setTimeout(() => tryGetSession(attempt + 1), 500 * (attempt + 1));
          return;
        }
        console.error('Error getting session:', err);
        if (isMounted) { bootstrapResolved = true; setLoading(false); }
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

      if (isMounted) { bootstrapResolved = true; setLoading(false); }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      clearTimeout(hardReloadTimeout);
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

  const currentRole = realUser ? realUser.role : appUser?.role;
  const isSuperAdmin = currentRole === 'super_admin';
  const isAdmin = appUser?.role === 'admin' || appUser?.role === 'super_admin';
  const impersonating = !!realUser;

  const mapUserRow = (u: any): AppUser => ({
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    organizationId: u.organization_id,
    role: u.role as UserRole,
    jobTitle: u.job_title || null,
    status: u.status || 'active',
    userType: (u.user_type as UserType) || 'consultant',
    phone: u.phone || null,
    clientId: u.client_id || null,
    birthDate: u.birth_date || null,
    createdAt: u.created_at,
  });

  // ===== SUPER ADMIN =====
  const fetchAllOrganizations = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('organizations').select('*').order('name');
      if (error) throw error;
      setAllOrganizations((data || []).map((o: any) => ({ id: o.id, name: o.name, inviteCode: o.invite_code, createdAt: o.created_at })));
    } catch (err) { console.error('Error fetching all organizations:', err); }
  }, []);

  const fetchAllUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('users').select('*').order('full_name');
      if (error) throw error;
      setAllUsers((data || []).map(mapUserRow));
    } catch (err) { console.error('Error fetching all users:', err); }
  }, []);

  const impersonateUser = useCallback(async (userId: string) => {
    if (!appUser) return;
    try {
      // Save real user if not already impersonating
      if (!realUser) {
        setRealUser(appUser);
        setRealOrganization(organization);
      }

      // Fetch target user
      const { data: userData, error } = await supabase.from('users').select('*').eq('id', userId).single();
      if (error || !userData) throw error || new Error('User not found');

      const targetUser = mapUserRow(userData);
      setAppUser(targetUser);

      // Fetch target user's organization
      if (targetUser.organizationId) {
        const { data: orgData } = await supabase.from('organizations').select('*').eq('id', targetUser.organizationId).single();
        if (orgData) {
          setOrganization({ id: orgData.id, name: orgData.name, inviteCode: orgData.invite_code, createdAt: orgData.created_at });
        }
      } else {
        setOrganization(null);
      }
    } catch (err) { console.error('Error impersonating user:', err); }
  }, [appUser, organization, realUser]);

  const stopImpersonating = useCallback(() => {
    if (realUser) {
      setAppUser(realUser);
      setOrganization(realOrganization);
      setRealUser(null);
      setRealOrganization(null);
    }
  }, [realUser, realOrganization]);

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
      setOrgUsers((data || []).map(mapUserRow));
    } catch (err) {
      console.error('Error fetching org users:', err);
    }
  }, [appUser?.organizationId]);

  useEffect(() => {
    if (appUser?.organizationId) fetchOrgUsers();
  }, [appUser?.organizationId, fetchOrgUsers]);

  const createOrgUser = useCallback(async (email: string, fullName: string, role: UserRole, jobTitle: string | null, userType: UserType = 'consultant', clientId: string | null = null): Promise<AppUser | null> => {
    if (!appUser?.organizationId) return null;
    const token = await getAccessTokenFresh();
    if (!token) return null;
    try {
      const res = await fetchWithTimeout('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          // NO password — server uses inviteUserByEmail and emails the
          // user a magic link to set their own password.
          email,
          fullName,
          organizationId: appUser.organizationId,
          role,
          jobTitle,
          userType,
          clientId,
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
        clientId,
        createdAt: new Date().toISOString(),
      };

      setOrgUsers(prev => [...prev, newUser].sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '')));
      return { user: newUser, inviteSent: !!result.inviteSent };
    } catch (err: any) {
      console.error('Error creating user:', err);
      throw err;
    }
  }, [appUser?.organizationId]);

  const updateOrgUser = useCallback(async (id: string, updates: Partial<Pick<AppUser, 'fullName' | 'role' | 'jobTitle' | 'status' | 'userType' | 'clientId' | 'birthDate'>>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
      if (updates.role !== undefined) dbUpdates.role = updates.role;
      if (updates.jobTitle !== undefined) dbUpdates.job_title = updates.jobTitle;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.userType !== undefined) dbUpdates.user_type = updates.userType;
      if (updates.clientId !== undefined) dbUpdates.client_id = updates.clientId;
      if (updates.birthDate !== undefined) dbUpdates.birth_date = updates.birthDate;

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
    const token = await getAccessTokenFresh();
    if (!token) return false;
    try {
      // Try serverless function first (works on Vercel)
      const res = await fetchWithTimeout('/api/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: id }),
      });

      if (!res.ok) {
        // Fallback: soft-delete by setting status to inactive
        const { error: delErr } = await supabase.from('users').update({ status: 'inactive' }).eq('id', id);
        if (delErr) throw delErr;
      }

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
    sessionExpired,
    signUp,
    signIn,
    signOut,
    isAdmin,
    isSuperAdmin,
    impersonating,
    impersonateUser,
    stopImpersonating,
    allOrganizations,
    fetchAllOrganizations,
    allUsers,
    fetchAllUsers,
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
