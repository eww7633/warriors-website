import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button, Card, ErrorText, Field, Screen, Subtitle, Title } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import { useThemeColors } from '@/lib/theme';
import type { MobileAnnouncement } from '@/lib/types';

const audienceOptions: Array<MobileAnnouncement['audience']> = ['all', 'players', 'supporters', 'admins'];

const isExpired = (value: string | null): boolean => {
  if (!value) return false;
  return new Date(value).getTime() < Date.now();
};

export default function AnnouncementsScreen() {
  const { session, handleApiError } = useAuth();
  const colors = useThemeColors();
  const [items, setItems] = useState<MobileAnnouncement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<MobileAnnouncement['audience']>('all');
  const [expiresAt, setExpiresAt] = useState('');
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const isAdmin = session.user?.role === 'admin';

  const visibleItems = useMemo(
    () =>
      [...items]
        .filter((item) => !isExpired(item.expiresAt))
        .sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }),
    [items]
  );

  const load = useCallback(async () => {
    if (!session.token) return;
    try {
      setError(null);
      setItems(await apiClient.getAnnouncements(session.token));
    } catch (e) {
      if (await handleApiError(e)) return;
      setError(e instanceof Error ? e.message : 'Announcements unavailable');
    }
  }, [session.token, handleApiError]);

  useEffect(() => {
    load();
  }, [load]);

  const onCreate = async () => {
    if (!session.token || !title.trim() || !body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient.createAnnouncement(session.token, {
        title: title.trim(),
        body: body.trim(),
        audience,
        pinned,
        expiresAt: expiresAt.trim() || null
      });
      setTitle('');
      setBody('');
      setAudience('all');
      setPinned(false);
      setExpiresAt('');
      await load();
    } catch (e) {
      if (await handleApiError(e)) return;
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
          <Field
            value={expiresAt}
            placeholder="Expiry (optional ISO, e.g. 2026-03-10T09:00:00Z)"
            onChangeText={setExpiresAt}
            autoCapitalize="none"
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {audienceOptions.map((value) => {
              const selected = audience === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setAudience(value)}
                  style={{
                    borderWidth: 1,
                    borderColor: selected ? colors.primary : colors.border,
                    borderRadius: 16,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    backgroundColor: selected ? colors.secondary : colors.surface
                  }}
                >
                  <Text style={{ color: selected ? colors.secondaryText : colors.text, fontWeight: '600' }}>
                    {value === 'all' ? 'All' : value.charAt(0).toUpperCase() + value.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={() => setPinned((value) => !value)}
            style={{
              borderWidth: 1,
              borderColor: pinned ? colors.primary : colors.border,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 8,
              backgroundColor: pinned ? colors.secondary : colors.surface
            }}
          >
            <Text style={{ color: pinned ? colors.secondaryText : colors.text, fontWeight: '600' }}>
              {pinned ? 'Pinned announcement' : 'Pin this announcement'}
            </Text>
          </Pressable>
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
          {visibleItems.map((item) => (
            <Card key={item.id}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>
                {item.pinned ? '📌 ' : ''}
                {item.title}
              </Text>
              <Text style={{ color: colors.textMuted }}>{new Date(item.createdAt).toLocaleString()}</Text>
              <Text style={{ color: colors.textMuted }}>Audience: {item.audience}</Text>
              {item.expiresAt ? <Text style={{ color: colors.textMuted }}>Expires: {new Date(item.expiresAt).toLocaleString()}</Text> : null}
              {item.createdByName ? <Text style={{ color: colors.textMuted }}>By {item.createdByName}</Text> : null}
              <Text style={{ color: colors.textMuted }}>{item.body}</Text>
            </Card>
          ))}
          {!visibleItems.length && !error ? (
            <Card>
              <Text style={{ color: colors.textMuted }}>No announcements yet.</Text>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
