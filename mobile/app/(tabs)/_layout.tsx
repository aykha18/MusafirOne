import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePushNotifications } from '@/hooks/use-push-notifications';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  usePushNotifications();

  const tabBarHeight = 58 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: Colors[colorScheme ?? 'light'].background,
          borderTopWidth: 1,
          borderTopColor: Colors[colorScheme ?? 'light'].border,
          height: tabBarHeight,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          ...Platform.select({
            ios: {
              shadowColor: '#0B1220',
              shadowOpacity: 0.12,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 10 },
            },
            android: {
              elevation: 10,
            },
            default: {},
          }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="currency"
        options={{
          title: 'Exchange',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="arrow.left.arrow.right" color={color} />,
        }}
      />
      <Tabs.Screen
        name="parcel"
        options={{
          title: 'Parcel',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="shippingbox.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="umrah"
        options={{
          title: 'Umrah',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="airplane" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Connect',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="bubble.left.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
