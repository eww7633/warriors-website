import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PlayerAvatar } from '@/components/player-avatar';
import { Card, ErrorText, Field, Screen, Subtitle, Title } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { analytics } from '@/lib/analytics';
import { apiClient } from '@/lib/api-client';
import { useThemeColors } from '@/lib/theme';
import type { MobileRosterMember } from '@/lib/types';

const teamSortWeight = (value: string | null): number => {
  if (!value) return 99;
  const text = value.toLowerCase();
  if (text.includes('dvhl')) return 1;
  if (text.includes('black')) return 2;
  if (text.includes('white')) return 3;
  if (text.includes('gold')) return 4;
  return 10;
};

const toDisplayPhone = (member: MobileRosterMember, isAdmin: boolean): string | null => {
  if (!member.phone) return null;
  return isAdmin || member.canViewPrivate || member.sharePhone ? member.phone : null;
};

const toDisplayEmail = (member: MobileRosterMember, isAdmin: boolean): string | null => {
  if (!member.email) return null;
  return isAdmin || member.canViewPrivate || member.shareEmail ? member.email : null;
};

const toDisplayAddress = (member: MobileRosterMember, isAdmin: boolean): string | null => {
  if (!member.address) return null;
  return isAdmin || member.canViewPrivate || member.shareAddress ? member.address : null;
};

export default function TeamScreen() {
  const colors = useThemeColors();
  const { session, handleApiError } = useAuth();
  const [members, setMembers] = useState<MobileRosterMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'player' | 'supporter' | 'admin'>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const isAdmin = session.user?.role === 'admin';

  const load = useCallback(async () => {
    if (!session.token) return;
    try {
      setError(null);
      const roster = await apiClient.getRoster(session.token, isAdmin);
      setMembers(roster);
      await analytics.track('team_directory_loaded', { count: roster.length, admin: isAdmin }, session.token);
    } catch (e) {
      if (await handleApiError(e)) return;
      setError(e instanceof Error ? e.message : 'Roster unavailable');
    }
  }, [isAdmin, session.token, handleApiError]);

  useEffect(() => {
    load();
  }, [load]);

  const teamChoices = useMemo(() => {
    const labels = Array.from(new Set(members.map((member) => member.teamLabel).filter(Boolean) as string[]));
    return ['all', ...labels.sort((a, b) => teamSortWeight(a) - teamSortWeight(b) || a.localeCompare(b))];
  }, [members]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return members
      .filter((member) => (roleFilter === 'all' ? true : member.role === roleFilter))
      .filter((member) => (teamFilter === 'all' ? true : member.teamLabel === teamFilter))
      .filter((member) => {
        if (!term) return true;
        const haystack = `${member.fullName} ${member.email ?? ''} ${member.position ?? ''} ${member.teamLabel ?? ''}`.toLowerCase();
        return haystack.includes(term);
      })
      .sort((a, b) => {
        const byTeam = teamSortWeight(a.teamLabel) - teamSortWeight(b.teamLabel);
        if (byTeam !== 0) return byTeam;
        return a.fullName.localeCompare(b.fullName);
      });
  }, [members, roleFilter, teamFilter, search]);

  return (
    <Screen>
      <Title>{isAdmin ? 'Roster Admin View' : 'Team Directory'}</Title>
      <Subtitle>
        {isAdmin
          ? 'Filter and contact players/supporters quickly.'
          : 'Contact details are shown based on each member privacy settings.'}
      </Subtitle>
      <ErrorText message={error} />

      <Card>
        <Field value={search} placeholder="Search name, email, role, team" onChangeText={setSearch} autoCapitalize="none" />
        <View style={styles.chips}>
          {(['all', 'player', 'supporter', 'admin'] as const).map((value) => {
            const selected = roleFilter === value;
            return (
              <Pressable
                key={value}
                style={[
                  styles.chip,
                  { borderColor: colors.border },
                  selected && { borderColor: colors.primary, backgroundColor: colors.secondary }
                ]}
                onPress={() => setRoleFilter(value)}
              >
                <Text style={{ color: selected ? colors.secondaryText : colors.text, fontWeight: '600' }}>
                  {value === 'all' ? 'All Roles' : value.charAt(0).toUpperCase() + value.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.chips}>
          {teamChoices.map((value) => {
            const selected = teamFilter === value;
            return (
              <Pressable
                key={value}
                style={[
                  styles.chip,
                  { borderColor: colors.border },
                  selected && { borderColor: colors.primary, backgroundColor: colors.secondary }
                ]}
                onPress={() => setTeamFilter(value)}
              >
                <Text style={{ color: selected ? colors.secondaryText : colors.text, fontWeight: '600' }}>
                  {value === 'all' ? 'All Teams' : value}
                </Text>
              </Pressable>
            );
          })}
        </View>
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
          {filtered.map((member) => {
            const phone = toDisplayPhone(member, isAdmin);
            const email = toDisplayEmail(member, isAdmin);
            const address = toDisplayAddress(member, isAdmin);

            return (
              <Card key={member.userId}>
                <View style={styles.row}>
                  <PlayerAvatar
                    fullName={member.fullName}
                    jerseyNumber={member.jerseyNumber}
                    avatarUrl={member.avatarUrl}
                    role={member.role}
                    size={44}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{member.fullName}</Text>
                    <Text style={{ color: colors.textMuted }}>
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      {member.teamLabel ? ` · ${member.teamLabel}` : ''}
                      {member.position ? ` · ${member.position}` : ''}
                    </Text>
                  </View>
                </View>

                {email ? <Text style={{ color: colors.textMuted }}>Email: {email}</Text> : null}
                {phone ? <Text style={{ color: colors.textMuted }}>Phone: {phone}</Text> : null}
                {address ? <Text style={{ color: colors.textMuted }}>Address: {address}</Text> : null}
                {!email && !phone && !address && !isAdmin ? (
                  <Text style={{ color: colors.textMuted }}>No contact details shared.</Text>
                ) : null}

                {isAdmin ? (
                  <View style={styles.actionsRow}>
                    {email ? (
                      <Text style={{ color: colors.link }} onPress={() => Linking.openURL(`mailto:${email}`)}>
                        Email
                      </Text>
                    ) : null}
                    {phone ? (
                      <Text style={{ color: colors.link }} onPress={() => Linking.openURL(`sms:${phone}`)}>
                        Text
                      </Text>
                    ) : null}
                    {phone ? (
                      <Text style={{ color: colors.link }} onPress={() => Linking.openURL(`tel:${phone}`)}>
                        Call
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </Card>
            );
          })}

          {!filtered.length && !error ? (
            <Card>
              <Text style={{ color: colors.textMuted }}>No roster members match current filters.</Text>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  chip: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 14
  }
});
