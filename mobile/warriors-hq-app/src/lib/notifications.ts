import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import type { ReservationStatus } from '@/lib/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

export const registerForPushNotificationsAsync = async (): Promise<string | null> => {
  if (!Device.isDevice) {
    // Simulators can run app flows but cannot receive APNs/FCM push tokens.
    return null;
  }

  const existing = await Notifications.getPermissionsAsync();
  let finalStatus = existing.status;

  if (finalStatus !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT
    });
  }

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
};

export const scheduleRsvpConfirmationNotification = async (
  title: string,
  status: ReservationStatus,
  startsAt: string
): Promise<void> => {
  const label = status === 'not_going' ? 'Not Going' : status === 'going' ? 'Going' : 'Maybe';
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'RSVP Updated',
      body: `${title}: ${label}. Event starts ${new Date(startsAt).toLocaleString()}.`
    },
    trigger: null
  });
};

export const scheduleCheckInConfirmationNotification = async (eventTitle?: string): Promise<void> => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Check-In Confirmed',
      body: eventTitle ? `You are checked in for ${eventTitle}.` : 'You are checked in.'
    },
    trigger: null
  });
};
