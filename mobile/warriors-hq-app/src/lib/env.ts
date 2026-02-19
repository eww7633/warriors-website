import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
const candidate = process.env.EXPO_PUBLIC_API_BASE_URL ?? extra?.apiBaseUrl ?? '';

export const API_BASE_URL = candidate.replace(/\/$/, '') || 'http://localhost:3000';
