import { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export const Screen = ({ children }: PropsWithChildren) => {
  return <View style={styles.screen}>{children}</View>;
};

export const Title = ({ children }: PropsWithChildren) => {
  return <Text style={styles.title}>{children}</Text>;
};

export const Subtitle = ({ children }: PropsWithChildren) => {
  return <Text style={styles.subtitle}>{children}</Text>;
};

export const Card = ({ children }: PropsWithChildren) => {
  return <View style={styles.card}>{children}</View>;
};

export const Field = ({
  value,
  placeholder,
  onChangeText,
  secureTextEntry = false,
  autoCapitalize = 'none'
}: {
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) => {
  return (
    <TextInput
      value={value}
      placeholder={placeholder}
      placeholderTextColor="#6b7280"
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      autoCapitalize={autoCapitalize}
      style={styles.field}
    />
  );
};

export const Button = ({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary'
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}) => {
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={[styles.button, styles[variant], (disabled || loading) && styles.buttonDisabled]}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{label}</Text>}
    </Pressable>
  );
};

export const ErrorText = ({ message }: { message: string | null }) => {
  if (!message) {
    return null;
  }

  return <Text style={styles.error}>{message}</Text>;
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0b1320',
    padding: 16,
    gap: 12
  },
  title: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '700'
  },
  subtitle: {
    color: '#cbd5e1',
    fontSize: 15
  },
  card: {
    backgroundColor: '#162238',
    borderRadius: 12,
    padding: 14,
    gap: 10
  },
  field: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 16
  },
  button: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  primary: {
    backgroundColor: '#2563eb'
  },
  secondary: {
    backgroundColor: '#334155'
  },
  danger: {
    backgroundColor: '#b91c1c'
  },
  buttonDisabled: {
    opacity: 0.65
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  },
  error: {
    color: '#fda4af',
    fontSize: 14
  }
});
