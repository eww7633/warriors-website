import { Image, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '@/lib/theme';

const normalizeNumber = (value: number): string => {
  const rounded = Math.max(1, Math.min(99, Math.trunc(value)));
  return String(rounded).padStart(2, '0');
};

const initialFromName = (fullName: string): string => {
  const trimmed = fullName.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
};

export function PlayerAvatar({
  fullName,
  jerseyNumber,
  avatarUrl,
  role,
  size = 40
}: {
  fullName: string;
  jerseyNumber: number | null;
  avatarUrl: string | null;
  role?: 'player' | 'admin' | 'supporter' | null;
  size?: number;
}) {
  const colors = useThemeColors();
  const shouldShowInitial = role === 'supporter' || !jerseyNumber;
  const displayText = shouldShowInitial ? initialFromName(fullName) : normalizeNumber(jerseyNumber);

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={[styles.image, { width: size, height: size, borderColor: colors.border }]}
      />
    );
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderColor: colors.border, backgroundColor: colors.secondary }]}>
      <Text style={[styles.number, { color: colors.secondaryText }]}>{displayText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    borderRadius: 999,
    borderWidth: 1
  },
  fallback: {
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  number: {
    fontSize: 12,
    fontWeight: '700'
  }
});
