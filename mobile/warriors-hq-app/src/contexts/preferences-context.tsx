import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { ThemeMode } from '@/lib/types';

type NotificationPrefs = {
  eventReminders: boolean;
  announcements: boolean;
};

type PreferencesState = {
  themeMode: ThemeMode;
  notifications: NotificationPrefs;
};

type PreferencesContextValue = {
  ready: boolean;
  preferences: PreferencesState;
  resolvedTheme: 'light' | 'dark';
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setNotificationPref: (key: keyof NotificationPrefs, value: boolean) => Promise<void>;
};

const KEY = 'hq_mobile_preferences_v1';
const defaultPrefs: PreferencesState = {
  themeMode: 'system',
  notifications: {
    eventReminders: true,
    announcements: true
  }
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export const PreferencesProvider = ({ children }: PropsWithChildren) => {
  const systemScheme = useColorScheme();
  const [ready, setReady] = useState(false);
  const [preferences, setPreferences] = useState<PreferencesState>(defaultPrefs);

  useEffect(() => {
    const load = async () => {
      const raw = await SecureStore.getItemAsync(KEY);
      if (raw) {
        setPreferences({
          ...defaultPrefs,
          ...(JSON.parse(raw) as PreferencesState)
        });
      }
      setReady(true);
    };

    load();
  }, []);

  const persist = async (next: PreferencesState) => {
    setPreferences(next);
    await SecureStore.setItemAsync(KEY, JSON.stringify(next));
  };

  const resolvedTheme: 'light' | 'dark' =
    preferences.themeMode === 'system'
      ? systemScheme === 'light'
        ? 'light'
        : 'dark'
      : preferences.themeMode;

  const value = useMemo<PreferencesContextValue>(
    () => ({
      ready,
      preferences,
      resolvedTheme,
      setThemeMode: async (mode) => {
        await persist({ ...preferences, themeMode: mode });
      },
      setNotificationPref: async (key, value) => {
        await persist({
          ...preferences,
          notifications: {
            ...preferences.notifications,
            [key]: value
          }
        });
      }
    }),
    [ready, preferences, resolvedTheme]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

export const usePreferences = (): PreferencesContextValue => {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used inside PreferencesProvider');
  return ctx;
};
