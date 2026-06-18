import { View, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@store/auth.store';
import { Colors } from '@constants/Colors';

export default function Index() {
  const { user, loadUser } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser().finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator size="large" color={Colors.blue} />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.role === 'DRIVER') return <Redirect href="/(driver)" />;
  return <Redirect href="/(customer)" />;
}
