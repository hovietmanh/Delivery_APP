import { Tabs } from 'expo-router';
import { useRouteNode } from 'expo-router/build/Route';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@constants/Colors';
import { useOrderStore } from '@store/order.store';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, nameOutline, focused, color }: { name: IoniconsName; nameOutline: IoniconsName; focused: boolean; color: string }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={focused ? name : nameOutline} size={22} color={color} />
    </View>
  );
}

export default function CustomerLayout() {
  const resetDraft = useOrderStore((s) => s.resetDraft);
  const node = useRouteNode();
  console.log('[TAB ROUTES]', node?.children?.map((c) => c.route));

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.blue,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ focused, color }) => <TabIcon name="home" nameOutline="home-outline" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="send"
        options={{
          title: 'Gửi hàng',
          tabBarIcon: ({ focused, color }) => <TabIcon name="cube" nameOutline="cube-outline" focused={focused} color={color} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            resetDraft();
            navigation.navigate('send', { screen: 'index' });
          },
        })}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Đơn hàng',
          tabBarIcon: ({ focused, color }) => <TabIcon name="list" nameOutline="list-outline" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="support"
        options={{
          title: 'Hỗ trợ',
          tabBarIcon: ({ focused, color }) => <TabIcon name="headset" nameOutline="headset-outline" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Tài khoản',
          tabBarIcon: ({ focused, color }) => <TabIcon name="person" nameOutline="person-outline" focused={focused} color={color} />,
        }}
      />
      {/* Hidden screens — registered here so Tabs knows about them but they're stack-pushed from root */}
      <Tabs.Screen name="home" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null, unmountOnBlur: false }} />
      <Tabs.Screen name="payment" options={{ href: null }} />
      <Tabs.Screen name="success" options={{ href: null }} />
      <Tabs.Screen name="profile-edit" options={{ href: null }} />
      <Tabs.Screen name="saved-addresses" options={{ href: null }} />
      <Tabs.Screen name="my-vouchers" options={{ href: null }} />
      <Tabs.Screen name="terms" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 68,
    paddingBottom: 10,
    paddingTop: 6,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    elevation: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 16,
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
    backgroundColor: Colors.blueGlass,
  },
});
