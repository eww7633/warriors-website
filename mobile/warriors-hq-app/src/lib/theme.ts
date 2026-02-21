import { usePreferences } from '@/contexts/preferences-context';

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
  primary: '#d8a333',
  primaryText: '#11151a',
  secondary: '#11151a',
  secondaryText: '#ffffff',
  danger: '#991b1b',
  dangerText: '#ffffff',
  link: '#8a6110',
  success: '#166534'
};

const darkColors: AppColors = {
  background: '#0b0f14',
  surface: '#171b22',
  text: '#f3f4f6',
  textMuted: '#c4c9d1',
  border: '#313743',
  primary: '#dbac45',
  primaryText: '#11151a',
  secondary: '#2b3240',
  secondaryText: '#f3f4f6',
  danger: '#991b1b',
  dangerText: '#ffffff',
  link: '#f1c86a',
  success: '#86efac'
};

export const getThemeColors = (theme: ThemeName): AppColors => (theme === 'light' ? lightColors : darkColors);

export const useThemeColors = (): AppColors => {
  const { resolvedTheme } = usePreferences();
  return getThemeColors(resolvedTheme);
};
