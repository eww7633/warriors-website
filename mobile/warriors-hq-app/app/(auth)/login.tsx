import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { useAuth } from '@/contexts/auth-context';
import { Button, Card, ErrorText, Field, Screen, Subtitle, Title } from '@/components/ui';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title>Warriors HQ</Title>
      <Subtitle>Mobile player portal login</Subtitle>
      <Card>
        <Field value={email} placeholder="Email" onChangeText={setEmail} />
        <Field value={password} placeholder="Password" secureTextEntry onChangeText={setPassword} />
        <ErrorText message={error} />
        <Button label="Login" onPress={onSubmit} loading={loading} disabled={!email || !password} />
      </Card>
      <Text style={{ color: '#cbd5e1' }}>
        Need access? <Link href="/(auth)/register" style={{ color: '#60a5fa' }}>Request account</Link>
      </Text>
    </Screen>
  );
}
