import { Redirect } from 'expo-router';
import { useAuthStore } from '@store/auth.store';

export default function Index() {
  const { user } = useAuthStore();

  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.role === 'DRIVER') return <Redirect href="/(driver)" />;
  return <Redirect href="/(customer)" />;
}
