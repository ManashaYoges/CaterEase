import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, Calendar, Users, MoreHorizontal, UtensilsCrossed } from 'lucide-react-native';
import Colors from '@/constants/Colors';

function EventsIcon({ color, size }: { color: string; size: number }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: size * 0.7, height: size * 0.85, borderWidth: 1.5, borderColor: color, borderRadius: 3 }}>
        <View style={{ flexDirection: 'row', gap: 3, marginTop: 5, marginLeft: 4 }}>
          <View style={{ width: 3, height: 3, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ width: 3, height: 3, backgroundColor: color, borderRadius: 1 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 3, marginTop: 2, marginLeft: 4 }}>
          <View style={{ width: 3, height: 3, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ width: 3, height: 3, backgroundColor: color, borderRadius: 1 }} />
        </View>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/(auth)');
    }
  }, [user, loading]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1B5E20',
          borderTopWidth: 1,
          borderTopColor: '#143326',
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.6)',
        tabBarItemStyle: {
          paddingHorizontal: 0,
          marginHorizontal: 0,
        },
        tabBarLabelStyle: {
          fontSize: 6.8,
          fontWeight: '600',
          marginTop: -2,
          paddingHorizontal: 0,
          marginHorizontal: 0,
          letterSpacing: -0.3,
        },
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t('Dashboard'),
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: t('Events'),
          tabBarIcon: ({ color, size }) => <EventsIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t('Calendar'),
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: t('Customers'),
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="dishes"
        options={{
          title: t('Dishes'),
          tabBarIcon: ({ color, size }) => <UtensilsCrossed size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('More'),
          tabBarIcon: ({ color, size }) => <MoreHorizontal size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
