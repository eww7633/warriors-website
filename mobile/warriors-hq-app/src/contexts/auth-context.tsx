import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiClient, SessionExpiredError } from '@/lib/api-client';
import { analytics } from '@/lib/analytics';
import { captureException } from '@/lib/monitoring';
import { registerForPushNotificationsAsync } from '@/lib/notifications';
import type { MobileUser, SessionState } from '@/lib/types';

type AuthContextValue = {
  ready: boolean;
  session: SessionState;
  authNotice: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { fullName: string; email: string; password: string; phone?: string; position?: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<MobileUser>) => Promise<void>;
  consumeAuthNotice: () => void;
  handleApiError: (error: unknown) => Promise<boolean>;
};

const KEY = 'hq_mobile_auth_state_v2';
const defaultSession: SessionState = { isAuthenticated: false, token: null, user: null };
const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<SessionState>(defaultSession);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const raw = await SecureStore.getItemAsync(KEY);
      if (raw) {
        setSession(JSON.parse(raw) as SessionState);
      }
      setReady(true);
    };

    run();
  }, []);

  useEffect(() => {
    const syncPushToken = async () => {
      if (!session.isAuthenticated || !session.token) return;
      try {
        const pushToken = await registerForPushNotificationsAsync();
        if (!pushToken) return;
        await apiClient.registerPushToken(session.token, pushToken);
      } catch {
        // Push token sync is best-effort; app auth flow should continue.
      }
    };
    syncPushToken();
  }, [session.isAuthenticated, session.token]);

  const persist = async (value: SessionState) => {
    setSession(value);
    await SecureStore.setItemAsync(KEY, JSON.stringify(value));
  };

  const forceRelogin = async (message = 'Session expired. Please sign in again.') => {
    await persist(defaultSession);
    setAuthNotice(message);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      session,
      authNotice,
      login: async (email, password) => {
        const result = await apiClient.login(email, password);
        const nextSession: SessionState = {
          isAuthenticated: true,
          token: result.token,
          user: result.user as MobileUser
        };
        await persist(nextSession);
        setAuthNotice(null);
        await analytics.track('auth_login_success', { role: result.user.role }, nextSession.token);
        try {
          const pushToken = await registerForPushNotificationsAsync();
          if (pushToken) {
            await apiClient.registerPushToken(nextSession.token as string, pushToken);
          }
        } catch {
          // Ignore push registration failures.
        }
      },
      register: async (input) => {
        await apiClient.register(input);
        await analytics.track('auth_register_submitted', { hasPhone: Boolean(input.phone), hasPosition: Boolean(input.position) });
      },
      logout: async () => {
        if (session.token) {
          try {
            await apiClient.logout(session.token);
          } catch {
            // Best effort logout: clear local session even if remote logout fails.
          }
        }
        await persist(defaultSession);
        setAuthNotice(null);
        await analytics.track('auth_logout');
      },
      updateUser: async (patch) => {
        if (!session.user) return;
        await persist({
          ...session,
          user: {
            ...session.user,
            ...patch
          }
        });
      },
      consumeAuthNotice: () => {
        setAuthNotice(null);
      },
      handleApiError: async (error) => {
        if (error instanceof SessionExpiredError) {
          await forceRelogin(error.message);
          await analytics.track('auth_session_expired');
          return true;
        }
        await captureException(error, { scope: 'api' });
        return false;
      }
    }),
    [ready, session, authNotice]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
