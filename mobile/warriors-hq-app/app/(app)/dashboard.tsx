import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button, Card, ErrorText, Screen, Subtitle, Title } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import type { DashboardSummary } from '@/lib/types';

export default function DashboardScreen() {
  const router = useRouter();
  const { session, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const response = await apiClient.getDashboard();
        setData(response);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load dashboard.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <ScrollView style={{ backgroundColor: '#0b1320' }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Title>Player Dashboard</Title>
      <Subtitle>{session.email ?? 'Signed in'}</Subtitle>

      <Card>
        <Text style={{ color: '#cbd5e1' }}>API Base URL</Text>
        <Text style={{ color: '#f8fafc' }}>{apiClient.apiBaseUrl}</Text>
      </Card>

      {loading ? (
        <Card>
          <Text style={{ color: '#cbd5e1' }}>Loading dashboard...</Text>
        </Card>
      ) : null}

      <ErrorText message={error} />

      {data ? (
        <Card>
          <Text style={{ color: '#f8fafc', fontWeight: '700', fontSize: 17 }}>{data.fullName}</Text>
          <Text style={{ color: '#cbd5e1' }}>Status: {data.status}</Text>
          <Text style={{ color: '#cbd5e1' }}>Roster ID: {data.rosterId ?? 'Not assigned'}</Text>
          <Text style={{ color: '#cbd5e1' }}>Jersey #: {data.jerseyNumber ?? 'Not assigned'}</Text>
          <View style={{ gap: 8, marginTop: 8 }}>
            {data.recentCheckIns.map((item) => (
              <View key={item.id}>
                <Text style={{ color: '#f8fafc' }}>{item.eventTitle}</Text>
                <Text style={{ color: '#cbd5e1' }}>{item.attendanceStatus}</Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <Button label="View Events" onPress={() => router.push('/(app)/events')} />
      <Button label="Scan QR Check-In" variant="secondary" onPress={() => router.push('/(app)/checkin')} />
      <Button
        label="Logout"
        variant="danger"
        onPress={async () => {
          await logout();
          router.replace('/(auth)/login');
        }}
      />

      <Text style={{ color: '#94a3b8' }}>
        Registration access: <Link href="/(auth)/register" style={{ color: '#60a5fa' }}>Request account</Link>
      </Text>
    </ScrollView>
  );
}
