import { Stack } from 'expo-router';

export default function SendLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="trip" />
      <Stack.Screen name="package" />
      <Stack.Screen name="review" />
    </Stack>
  );
}
