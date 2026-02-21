import { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useThemeColors } from '@/lib/theme';

export const Screen = ({ children }: PropsWithChildren) => {
  const colors = useThemeColors();
  return <View style={[styles.screen, { backgroundColor: colors.background }]}>{children}</View>;
};
export const Title = ({ children }: PropsWithChildren) => {
  const colors = useThemeColors();
  return <Text style={[styles.title, { color: colors.text }]}>{children}</Text>;
};
export const Subtitle = ({ children }: PropsWithChildren) => {
  const colors = useThemeColors();
  return <Text style={[styles.subtitle, { color: colors.textMuted }]}>{children}</Text>;
};
export const Card = ({ children }: PropsWithChildren) => {
  const colors = useThemeColors();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>{children}</View>;
};

export const Field = ({ value, placeholder, onChangeText, secureTextEntry = false, autoCapitalize = 'none' }: {
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) => {
  const colors = useThemeColors();
  return (
    <TextInput
      value={value}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      autoCapitalize={autoCapitalize}
      style={[styles.field, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
    />
  );
};

export const Button = ({ label, onPress, disabled, loading, variant = 'primary' }: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}) => {
  const colors = useThemeColors();
  const toneStyle =
    variant === 'primary'
      ? { backgroundColor: colors.primary }
      : variant === 'danger'
        ? { backgroundColor: colors.danger }
        : { backgroundColor: colors.secondary };
  const textColor =
    variant === 'secondary' ? colors.secondaryText : variant === 'danger' ? colors.dangerText : colors.primaryText;

  return (
    <Pressable disabled={disabled || loading} onPress={onPress} style={[styles.button, toneStyle, (disabled || loading) && styles.buttonDisabled]}>
      {loading ? <ActivityIndicator color={textColor} /> : <Text style={[styles.buttonText, { color: textColor }]}>{label}</Text>}
    </Pressable>
  );
};

export const ErrorText = ({ message }: { message: string | null }) => {
  const colors = useThemeColors();
  return message ? <Text style={[styles.error, { color: colors.danger }]}>{message}</Text> : null;
};

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 15 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 },
  field: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  button: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { fontWeight: '600', fontSize: 16 },
  error: { fontSize: 14 }
});
