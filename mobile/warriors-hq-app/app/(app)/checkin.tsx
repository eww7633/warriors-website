import { CameraView, useCameraPermissions } from 'expo-camera';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, ErrorText, Screen, Subtitle, Title } from '@/components/ui';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import { scheduleCheckInConfirmationNotification } from '@/lib/notifications';
import { useThemeColors } from '@/lib/theme';

const parseToken = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed);
    return url.searchParams.get('token')?.trim() ?? '';
  } catch {
    return trimmed;
  }
};

export default function CheckInScreen() {
  const { session } = useAuth();
  const colors = useThemeColors();
  const isSupporter = session.user?.role === 'supporter';
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canScan = useMemo(() => Boolean(permission?.granted && !busy), [permission?.granted, busy]);

  const onCode = async (value: string) => {
    if (!canScan) return;
    if (!session.token) {
      setError('Session missing. Please sign in again.');
      return;
    }

    const token = parseToken(value);
    if (!token) {
      setError('QR code missing check-in token.');
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await apiClient.submitQrCheckIn(session.token, token);
      await scheduleCheckInConfirmationNotification();
      setMessage('Check-in complete.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check-in failed');
    } finally {
      setBusy(false);
    }
  };

  if (isSupporter) {
    return (
      <Screen>
        <Title>QR Check-In</Title>
        <Subtitle>Player-only feature</Subtitle>
        <Card>
          <Text style={{ color: colors.textMuted }}>
            Supporters can browse events, but QR attendance check-in is only available for players and staff.
          </Text>
        </Card>
      </Screen>
    );
  }

  if (!permission) return <Screen><Text style={{ color: colors.textMuted }}>Loading camera permission...</Text></Screen>;
  if (!permission.granted) {
    return (
      <Screen>
        <Title>QR Check-In</Title>
        <Subtitle>Camera permission is required.</Subtitle>
        <Button label="Enable camera" onPress={() => requestPermission()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>QR Check-In</Title>
      <Subtitle>Scan event QR code</Subtitle>
      <Card>
        <View style={{ height: 320, overflow: 'hidden', borderRadius: 10 }}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={canScan ? (event) => onCode(event.data) : undefined}
          />
        </View>
      </Card>
      <ErrorText message={error} />
      {message ? <Text style={{ color: colors.success }}>{message}</Text> : null}
    </Screen>
  );
}
