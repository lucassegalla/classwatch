import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { ApiRequestError, getCurrentUser, login as loginRequest, registerStudent as registerRequest, setAuthToken, setUnauthorizedHandler } from '@/services/api';
import { clearSavedSession, loadSession, saveSession } from '@/services/authSession';
import type { UserProfile } from '@/types/lecture';

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    try { await clearSavedSession(); } catch { /* The in-memory session is still cleared. */ }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => { void clearSession(); });
    let active = true;
    void (async () => {
      try {
        const session = await loadSession();
        if (!session) return;
        setAuthToken(session.token);
        if (session.user && active) setUser(session.user);
        const profile = await getCurrentUser();
        if (active) {
          setUser(profile);
          await saveSession(session.token, profile);
        }
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 401) {
          setAuthToken(null);
          try { await clearSavedSession(); } catch { /* Continue as signed out if storage is unavailable. */ }
          if (active) setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      setUnauthorizedHandler(null);
    };
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginRequest(email.trim(), password);
    await saveSession(result.accessToken, result.user);
    setAuthToken(result.accessToken);
    setUser(result.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const result = await registerRequest(name.trim(), email.trim(), password);
    await saveSession(result.accessToken, result.user);
    setAuthToken(result.accessToken);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => { await clearSession(); }, [clearSession]);
  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return value;
}
