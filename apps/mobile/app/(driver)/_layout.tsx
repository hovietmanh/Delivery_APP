import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@constants/Colors';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, focused, color }: { name: IoniconsName; focused: boolean; color: string }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={focused ? name : `${name}-outline` as IoniconsName} size={22} color={color} />
    </View>
  );
}

export default function DriverLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#60A5FA',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.45)',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Đơn chờ',
          tabBarIcon: ({ focused, color }) => <TabIcon name="clipboard" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="trip"
        options={{
          tabBarLabel: 'Hành trình',
          tabBarIcon: ({ focused, color }) => <TabIcon name="map" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="complaints"
        options={{
          tabBarLabel: 'Khiếu nại',
          tabBarIcon: ({ focused, color }) => <TabIcon name="warning" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="routes"
        options={{
          tabBarLabel: 'Tuyến xe',
          tabBarIcon: ({ focused, color }) => <TabIcon name="navigate" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          tabBarLabel: 'Tài khoản',
          tabBarIcon: ({ focused, color }) => <TabIcon name="person" focused={focused} color={color} />,
        }}
      />
      {/* Hidden screens */}
      <Tabs.Screen name="order/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="pickup/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="deliver/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="qr-scan" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 68,
    paddingBottom: 10,
    paddingTop: 6,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  tabItem: { paddingTop: 2 },
  iconWrap: {
    width: 44,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  iconWrapActive: {
    backgroundColor: 'rgba(96,165,250,0.15)',
  },
});
