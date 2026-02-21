import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button, Card, ErrorText, Screen, Subtitle, Title } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { analytics } from '@/lib/analytics';
import { apiClient } from '@/lib/api-client';
import { useThemeColors } from '@/lib/theme';
import type { RsvpApprovalRequest } from '@/lib/types';

export default function AdminScreen() {
  const { session, handleApiError } = useAuth();
  const router = useRouter();
  const colors = useThemeColors();
  const [approvals, setApprovals] = useState<RsvpApprovalRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session.token || session.user?.role !== 'admin') return;
    try {
      setError(null);
      const items = await apiClient.getRsvpApprovalQueue(session.token);
      setApprovals(items.filter((item) => item.status === 'pending'));
      await analytics.track('admin_approval_queue_loaded', { count: items.length }, session.token);
    } catch (e) {
      if (await handleApiError(e)) return;
      setError(e instanceof Error ? e.message : 'Approval queue unavailable');
    }
  }, [session.token, session.user?.role, handleApiError]);

  useEffect(() => {
    load();
  }, [load]);

  const onResolve = async (requestId: string, decision: 'approved' | 'denied') => {
    if (!session.token) return;
    try {
      setSavingId(requestId);
      setError(null);
      await apiClient.resolveRsvpApproval(session.token, requestId, decision);
      await analytics.track('admin_approval_resolved', { requestId, decision }, session.token);
      setApprovals((current) => current.filter((item) => item.id !== requestId));
    } catch (e) {
      if (await handleApiError(e)) return;
      setError(e instanceof Error ? e.message : 'Unable to resolve request');
    } finally {
      setSavingId(null);
    }
  };

  if (session.user?.role !== 'admin') {
    return (
      <Screen>
        <Title>Admin</Title>
        <Subtitle>Access restricted</Subtitle>
        <Card>
          <Text style={{ color: colors.textMuted }}>Only admin accounts can view admin tools.</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Admin Tools</Title>
      <Subtitle>Hockey Ops quick actions</Subtitle>
      <ErrorText message={error} />
      <Card>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Announcements</Text>
        <Text style={{ color: colors.textMuted }}>Create and publish club announcements for all mobile users.</Text>
        <Button label="Open Announcements" onPress={() => router.push('/(app)/announcements')} />
      </Card>
      <Card>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Roster</Text>
        <Text style={{ color: colors.textMuted }}>Open full roster directory with team/role filters and call/text/email actions.</Text>
        <Button label="Open Roster Directory" variant="secondary" onPress={() => router.push('/(app)/team')} />
      </Card>

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
          <Card>
            <Text style={{ color: colors.text, fontWeight: '700' }}>RSVP Approval Queue</Text>
            <Text style={{ color: colors.textMuted }}>
              Review requests from non-rostered players/supporters for on-ice events.
            </Text>
          </Card>
          {approvals.map((request) => (
            <Card key={request.id}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{request.eventTitle}</Text>
              <Text style={{ color: colors.textMuted }}>{new Date(request.eventStartsAt).toLocaleString()}</Text>
              <Text style={{ color: colors.textMuted }}>
                Requester: {request.requestedByName}
                {request.requestedByRole ? ` (${request.requestedByRole})` : ''}
              </Text>
              {request.requestedByEmail ? <Text style={{ color: colors.textMuted }}>{request.requestedByEmail}</Text> : null}
              {request.teamLabel ? <Text style={{ color: colors.textMuted }}>Team: {request.teamLabel}</Text> : null}
              {request.note ? <Text style={{ color: colors.textMuted }}>Note: {request.note}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Approve"
                    onPress={() => onResolve(request.id, 'approved')}
                    disabled={savingId === request.id}
                    loading={savingId === request.id}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Deny"
                    variant="danger"
                    onPress={() => onResolve(request.id, 'denied')}
                    disabled={savingId === request.id}
                  />
                </View>
              </View>
            </Card>
          ))}
          {!approvals.length && !error ? (
            <Card>
              <Text style={{ color: colors.textMuted }}>No pending approval requests.</Text>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
