import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '@/lib/api-client';
import type { MobileUser, SessionState } from '@/lib/types';

type AuthContextValue = {
  ready: boolean;
  session: SessionState;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { fullName: string; email: string; password: string; phone?: string; position?: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<MobileUser>) => Promise<void>;
};

const KEY = 'hq_mobile_auth_state_v2';
const defaultSession: SessionState = { isAuthenticated: false, token: null, user: null };
const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<SessionState>(defaultSession);

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

  const persist = async (value: SessionState) => {
    setSession(value);
    await SecureStore.setItemAsync(KEY, JSON.stringify(value));
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      session,
      login: async (email, password) => {
        const result = await apiClient.login(email, password);
        await persist({
          isAuthenticated: true,
          token: result.token,
          user: result.user as MobileUser
        });
      },
      register: async (input) => {
        await apiClient.register(input);
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
      }
    }),
    [ready, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
