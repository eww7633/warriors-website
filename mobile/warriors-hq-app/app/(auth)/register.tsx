import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { useAuth } from '@/contexts/auth-context';
import { Button, Card, ErrorText, Field, Screen, Subtitle, Title } from '@/components/ui';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      await register({ fullName, email, password, phone, position });
      setMessage('Request submitted. You can sign in after approval.');
    } catch (err) {
      const nextError = err instanceof Error ? err.message : 'Unable to submit request.';
      setError(nextError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title>Request Access</Title>
      <Subtitle>Submit registration for Hockey Ops approval</Subtitle>
      <Card>
        <Field value={fullName} placeholder="Full name" autoCapitalize="words" onChangeText={setFullName} />
        <Field value={email} placeholder="Email" onChangeText={setEmail} />
        <Field value={password} placeholder="Password (8+ chars)" secureTextEntry onChangeText={setPassword} />
        <Field value={phone} placeholder="Phone (optional)" onChangeText={setPhone} />
        <Field value={position} placeholder="Requested position (optional)" onChangeText={setPosition} />
        <ErrorText message={error} />
        {message ? <Text style={{ color: '#86efac' }}>{message}</Text> : null}
        <Button
          label="Submit request"
          onPress={onSubmit}
          loading={loading}
          disabled={!fullName || !email || password.length < 8}
        />
        <Button label="Back to login" variant="secondary" onPress={() => router.replace('/(auth)/login')} />
      </Card>
      <Text style={{ color: '#cbd5e1' }}>
        Already approved? <Link href="/(auth)/login" style={{ color: '#60a5fa' }}>Go to login</Link>
      </Text>
    </Screen>
  );
}
