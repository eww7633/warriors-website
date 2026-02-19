import { CameraView, useCameraPermissions } from 'expo-camera';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, ErrorText, Screen, Subtitle, Title } from '@/components/ui';
import { apiClient } from '@/lib/api-client';

const parseToken = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }

  try {
    const asUrl = new URL(trimmed);
    return asUrl.searchParams.get('token')?.trim() ?? '';
  } catch {
    return trimmed;
  }
};

export default function CheckInScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canScan = useMemo(() => Boolean(permission?.granted && !busy), [permission?.granted, busy]);

  const onCode = async (payload: string) => {
    if (!canScan) {
      return;
    }

    const token = parseToken(payload);
    if (!token) {
      setError('QR code missing check-in token.');
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      await apiClient.submitQrCheckIn(token);
      setMessage('Check-in complete.');
    } catch (err) {
      const nextError = err instanceof Error ? err.message : 'Check-in failed.';
      setError(nextError);
    } finally {
      setBusy(false);
    }
  };

  if (!permission) {
    return (
      <Screen>
        <Text style={{ color: '#cbd5e1' }}>Loading camera permissions...</Text>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen>
        <Title>QR Check-In</Title>
        <Subtitle>Camera permission is required to scan event QR codes.</Subtitle>
        <Button label="Enable camera" onPress={() => requestPermission()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>QR Check-In</Title>
      <Subtitle>Scan the event QR code to record attendance</Subtitle>
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
      {message ? <Text style={{ color: '#86efac' }}>{message}</Text> : null}
    </Screen>
  );
}
