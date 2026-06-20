import { View, ActivityIndicator } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@store/auth.store';
import { Colors } from '@constants/Colors';

// Deep link handler: delilog://orders/{id}
// Điều hướng đến màn hình phù hợp theo role
export default function OrderDeepLink() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  if (!user) return <Redirect href="/(auth)/login" />;

  if (user.role === 'DRIVER') {
    return <Redirect href={`/(driver)/deliver/${id}` as any} />;
  }

  return <Redirect href={`/(customer)/orders/${id}` as any} />;
}
