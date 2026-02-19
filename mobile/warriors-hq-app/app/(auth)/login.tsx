import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { Button, Card, ErrorText, Field, Screen, Subtitle, Title } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';

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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to login');
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
        <Field value={password} placeholder="Password" onChangeText={setPassword} secureTextEntry />
        <ErrorText message={error} />
        <Button label="Login" onPress={onSubmit} loading={loading} disabled={!email || !password} />
      </Card>
      <Text style={{ color: '#cbd5e1' }}>Need access? <Link href="/(auth)/register" style={{ color: '#60a5fa' }}>Request account</Link></Text>
    </Screen>
  );
}
