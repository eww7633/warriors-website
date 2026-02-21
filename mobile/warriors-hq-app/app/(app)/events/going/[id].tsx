import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, ErrorText, Screen, Subtitle, Title } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import type { MobileEvent } from '@/lib/types';

type SortMode = 'priority' | 'alpha';

const isGoalie = (value: string | null): boolean => {
  if (!value) return false;
  return value.toLowerCase().includes('goal');
};

export default function GoingListScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [event, setEvent] = useState<MobileEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('priority');

  const load = useCallback(async () => {
    try {
      if (!params.id) throw new Error('Missing event id');
      if (!session.token) throw new Error('Session missing. Please sign in again.');
      setEvent(await apiClient.getEventDetail(session.token, params.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load going list');
    }
  }, [params.id, session.token]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!event) return [];

    const normalizedQuery = query.trim().toLowerCase();
    const matches = event.goingMembers.filter((member) =>
      !normalizedQuery ? true : member.fullName.toLowerCase().includes(normalizedQuery)
    );

    if (sortMode === 'alpha') {
      return [...matches].sort((a, b) => a.fullName.localeCompare(b.fullName));
    }

    return [...matches].sort((a, b) => {
      const aWeight = (a.isManager ? 0 : 1) + (isGoalie(a.requestedPosition) ? 0 : 2);
      const bWeight = (b.isManager ? 0 : 1) + (isGoalie(b.requestedPosition) ? 0 : 2);
      if (aWeight !== bWeight) return aWeight - bWeight;
      return a.fullName.localeCompare(b.fullName);
    });
  }, [event, query, sortMode]);

  return (
    <Screen>
      <Title>Who&apos;s Going</Title>
      <Subtitle>{event ? `${event.title} · ${event.goingCount} going` : 'Loading...'}</Subtitle>
      <ErrorText message={error} />

      <Card>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search players"
          placeholderTextColor="#64748b"
          style={styles.search}
        />
        <View style={styles.row}>
          <Pressable style={[styles.chip, sortMode === 'priority' && styles.chipActive]} onPress={() => setSortMode('priority')}>
            <Text style={styles.chipText}>Manager/Goalie First</Text>
          </Pressable>
          <Pressable style={[styles.chip, sortMode === 'alpha' && styles.chipActive]} onPress={() => setSortMode('alpha')}>
            <Text style={styles.chipText}>Alphabetical</Text>
          </Pressable>
        </View>
      </Card>

      <ScrollView>
        <View style={{ gap: 10, paddingBottom: 16 }}>
          {filtered.map((member) => (
            <Card key={member.userId}>
              <Text style={{ color: '#f8fafc', fontWeight: '700' }}>{member.fullName}</Text>
              <Text style={{ color: '#cbd5e1' }}>
                {member.isManager ? 'Manager' : 'Player'}
                {member.requestedPosition ? ` · ${member.requestedPosition}` : ''}
              </Text>
            </Card>
          ))}
          {event && !filtered.length ? (
            <Card>
              <Text style={{ color: '#cbd5e1' }}>No matching players.</Text>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc'
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  chip: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  chipActive: {
    borderColor: '#60a5fa',
    backgroundColor: '#1e3a8a'
  },
  chipText: {
    color: '#e2e8f0',
    fontWeight: '600',
    fontSize: 12
  }
});
