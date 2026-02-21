import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { WarriorsLogo } from '@/components/warriors-logo';
import { Button, Card, ErrorText, Field, Screen, Subtitle, Title } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { useThemeColors } from '@/lib/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { login, authNotice, consumeAuthNotice } = useAuth();
  const colors = useThemeColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.replace('/(app)/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={{ alignItems: 'center' }}>
        <WarriorsLogo size={58} />
      </View>
      <Title>Warriors HQ</Title>
      <Subtitle>Players and supporters can sign in</Subtitle>
      <Card>
        <Field value={email} placeholder="Email" onChangeText={setEmail} />
        <Field value={password} placeholder="Password" onChangeText={setPassword} secureTextEntry />
        <ErrorText message={authNotice} />
        <ErrorText message={error} />
        <Button label="Login" onPress={onSubmit} loading={loading} disabled={!email || !password} />
        {authNotice ? <Button label="Dismiss message" variant="secondary" onPress={consumeAuthNotice} /> : null}
      </Card>
      <Text style={{ color: colors.textMuted }}>
        Need access? <Link href="/(auth)/register" style={{ color: colors.link }}>Request account</Link>
      </Text>
    </Screen>
  );
}
