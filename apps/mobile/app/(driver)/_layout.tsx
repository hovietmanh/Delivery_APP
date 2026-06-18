import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { Colors } from '@constants/Colors';

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 22 }}>{emoji}</Text>;
}

export default function DriverLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.blue,
        tabBarInactiveTintColor: Colors.secondary,
        tabBarStyle: {
          height: 64, paddingBottom: 8, paddingTop: 4,
          backgroundColor: '#0F172A',
          borderTopColor: 'rgba(255,255,255,0.08)',
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarActiveTintColor: '#60A5FA',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarLabel: 'Đơn chờ', tabBarIcon: () => <TabIcon emoji="📦" /> }}
      />
      <Tabs.Screen
        name="trip"
        options={{ tabBarLabel: 'Hành trình', tabBarIcon: () => <TabIcon emoji="🚌" /> }}
      />
      <Tabs.Screen
        name="complaints"
        options={{ tabBarLabel: 'Khiếu nại', tabBarIcon: () => <TabIcon emoji="⚠️" /> }}
      />
      <Tabs.Screen
        name="routes"
        options={{ tabBarLabel: 'Tuyến hôm nay', tabBarIcon: () => <TabIcon emoji="🗺️" /> }}
      />
      <Tabs.Screen
        name="account"
        options={{ tabBarLabel: 'Tài khoản', tabBarIcon: () => <TabIcon emoji="👤" /> }}
      />
      {/* Hidden screens — không hiển thị trong tab bar, ẩn tab bar */}
      <Tabs.Screen name="order/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="pickup/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="deliver/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}
