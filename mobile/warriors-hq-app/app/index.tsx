import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/contexts/auth-context';

export default function Index() {
  const { ready, session } = useAuth();

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b1320' }}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!session.isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(app)/dashboard" />;
}
