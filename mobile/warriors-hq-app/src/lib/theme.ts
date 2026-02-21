import { useColorScheme } from 'react-native';

type ThemeName = 'light' | 'dark';

export type AppColors = {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryText: string;
  secondary: string;
  secondaryText: string;
  danger: string;
  dangerText: string;
  link: string;
  success: string;
};

const lightColors: AppColors = {
  background: '#f4f6f8',
  surface: '#ffffff',
  text: '#101418',
  textMuted: '#4b5563',
  border: '#d1d5db',
  primary: '#c8102e',
  primaryText: '#ffffff',
  secondary: '#111827',
  secondaryText: '#ffffff',
  danger: '#991b1b',
  dangerText: '#ffffff',
  link: '#0f4c81',
  success: '#166534'
};

const darkColors: AppColors = {
  background: '#0b0f14',
  surface: '#171b22',
  text: '#f3f4f6',
  textMuted: '#c4c9d1',
  border: '#313743',
  primary: '#c8102e',
  primaryText: '#ffffff',
  secondary: '#2b3240',
  secondaryText: '#f3f4f6',
  danger: '#991b1b',
  dangerText: '#ffffff',
  link: '#7db8ff',
  success: '#86efac'
};

export const getThemeColors = (theme: ThemeName): AppColors => (theme === 'light' ? lightColors : darkColors);

export const useThemeColors = (): AppColors => {
  const scheme = useColorScheme();
  return getThemeColors(scheme === 'light' ? 'light' : 'dark');
};

