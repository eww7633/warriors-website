import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { Button, Card, ErrorText, Subtitle, Title } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import type { DashboardSummary } from '@/lib/types';

export default function DashboardScreen() {
  const router = useRouter();
  const { session, logout } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setData(await apiClient.getDashboard(session.email));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Dashboard unavailable');
      }
    };
    run();
  }, [session.email]);

  return (
    <ScrollView style={{ backgroundColor: '#0b1320' }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Title>Player Dashboard</Title>
      <Subtitle>{session.email ?? 'Signed in'}</Subtitle>
      <Card>
        <Text style={{ color: '#cbd5e1' }}>API Base URL</Text>
        <Text style={{ color: '#f8fafc' }}>{apiClient.apiBaseUrl}</Text>
      </Card>
      <ErrorText message={error} />
      {data ? (
        <Card>
          <Text style={{ color: '#f8fafc', fontWeight: '700' }}>{data.fullName}</Text>
          <Text style={{ color: '#cbd5e1' }}>Status: {data.status}</Text>
          <Text style={{ color: '#cbd5e1' }}>Roster ID: {data.rosterId ?? 'Not assigned'}</Text>
          <Text style={{ color: '#cbd5e1', marginTop: 8, fontWeight: '700' }}>Upcoming/Recent Event Context</Text>
          {data.recentCheckIns.map((item) => (
            <Text key={item.id} style={{ color: '#cbd5e1' }}>{item.eventTitle}: {item.attendanceStatus}</Text>
          ))}
        </Card>
      ) : null}
      <Button label="View Events" onPress={() => router.push('/(app)/events')} />
      <Button label="Scan QR Check-In" variant="secondary" onPress={() => router.push('/(app)/checkin')} />
      <Button label="Logout" variant="danger" onPress={async () => { await logout(); router.replace('/(auth)/login'); }} />
    </ScrollView>
  );
}
