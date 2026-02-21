import { Image, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '@/lib/theme';

const normalizeNumber = (value: number): string => {
  const rounded = Math.max(1, Math.min(99, Math.trunc(value)));
  return String(rounded).padStart(2, '0');
};

const hashToNumber = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 97;
  }
  return normalizeNumber(hash + 1);
};

export function PlayerAvatar({
  fullName,
  jerseyNumber,
  avatarUrl,
  seed,
  size = 40
}: {
  fullName: string;
  jerseyNumber: number | null;
  avatarUrl: string | null;
  seed: string;
  size?: number;
}) {
  const colors = useThemeColors();
  const displayNumber = jerseyNumber ? normalizeNumber(jerseyNumber) : hashToNumber(seed || fullName);

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
      <Text style={[styles.number, { color: colors.secondaryText }]}>{displayNumber}</Text>
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

