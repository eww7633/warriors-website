import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button, Card, ErrorText, Field, Screen, Subtitle, Title } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import { useThemeColors } from '@/lib/theme';
import type { MobileAnnouncement } from '@/lib/types';

export default function AnnouncementsScreen() {
  const { session } = useAuth();
  const colors = useThemeColors();
  const [items, setItems] = useState<MobileAnnouncement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const isAdmin = session.user?.role === 'admin';

  const load = useCallback(async () => {
    if (!session.token) return;
    try {
      setError(null);
      setItems(await apiClient.getAnnouncements(session.token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Announcements unavailable');
    }
  }, [session.token]);

  useEffect(() => {
    load();
  }, [load]);

  const onCreate = async () => {
    if (!session.token || !title.trim() || !body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient.createAnnouncement(session.token, { title: title.trim(), body: body.trim() });
      setTitle('');
      setBody('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to publish announcement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Title>Announcements</Title>
      <Subtitle>Team updates from staff and admins</Subtitle>
      <ErrorText message={error} />

      {isAdmin ? (
        <Card>
          <Text style={{ color: colors.text, fontWeight: '700' }}>Post Announcement</Text>
          <Field value={title} placeholder="Title" onChangeText={setTitle} autoCapitalize="sentences" />
          <Field value={body} placeholder="Message" onChangeText={setBody} autoCapitalize="sentences" />
          <Button label="Publish" onPress={onCreate} loading={saving} disabled={!title.trim() || !body.trim()} />
        </Card>
      ) : null}

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={colors.text}
          />
        }
      >
        <View style={{ gap: 10, paddingBottom: 16 }}>
          {items.map((item) => (
            <Card key={item.id}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{item.title}</Text>
              <Text style={{ color: colors.textMuted }}>{new Date(item.createdAt).toLocaleString()}</Text>
              {item.createdByName ? <Text style={{ color: colors.textMuted }}>By {item.createdByName}</Text> : null}
              <Text style={{ color: colors.textMuted }}>{item.body}</Text>
            </Card>
          ))}
          {!items.length && !error ? (
            <Card>
              <Text style={{ color: colors.textMuted }}>No announcements yet.</Text>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

