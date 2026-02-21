import { Image } from 'react-native';
import { usePreferences } from '@/contexts/preferences-context';

const lightLogo = require('../../assets/brand/logo-light.png');
const darkLogo = require('../../assets/brand/logo-dark.png');

export function WarriorsLogo({ size = 28 }: { size?: number }) {
  const { resolvedTheme } = usePreferences();
  return <Image source={resolvedTheme === 'dark' ? darkLogo : lightLogo} style={{ width: size, height: size, borderRadius: 999 }} />;
}

