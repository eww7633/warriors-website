import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '@/lib/api-client';

type SessionState = {
  isAuthenticated: boolean;
  email: string | null;
};

type AuthContextValue = {
  ready: boolean;
  session: SessionState;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    position?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const AUTH_KEY = 'hq_mobile_auth_state_v1';

const AuthContext = createContext<AuthContextValue | null>(null);

const defaultSession: SessionState = {
  isAuthenticated: false,
  email: null
};

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<SessionState>(defaultSession);

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await SecureStore.getItemAsync(AUTH_KEY);
        if (raw) {
          setSession(JSON.parse(raw) as SessionState);
        }
      } finally {
        setReady(true);
      }
    };

    load();
  }, []);

  const persist = async (next: SessionState) => {
    setSession(next);
    await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(next));
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      session,
      login: async (email, password) => {
        await apiClient.login(email, password);
        await persist({ isAuthenticated: true, email });
      },
      register: async (input) => {
        await apiClient.register(input);
      },
      logout: async () => {
        await apiClient.logout();
        await persist(defaultSession);
      }
    }),
    [ready, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
};
