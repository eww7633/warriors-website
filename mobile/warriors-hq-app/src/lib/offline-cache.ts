import AsyncStorage from '@react-native-async-storage/async-storage';

const EVENTS_KEY = 'hq_mobile_cache_events_v1';
const ANNOUNCEMENTS_KEY = 'hq_mobile_cache_announcements_v1';

const load = async <T>(key: string): Promise<T | null> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const save = async <T>(key: string, value: T): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Cache failures should never block core app flows.
  }
};

export const offlineCache = {
  loadEvents: async <T>() => load<T>(EVENTS_KEY),
  saveEvents: async <T>(value: T) => save(EVENTS_KEY, value),
  loadAnnouncements: async <T>() => load<T>(ANNOUNCEMENTS_KEY),
  saveAnnouncements: async <T>(value: T) => save(ANNOUNCEMENTS_KEY, value)
};
