import { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { Alert } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { apiClient } from '@/api/client';
import { BackendStatus } from '@/components/backend-status';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appIsReady, setAppIsReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    async function prepare() {
      console.log('App preparation starting...');
      try {
        console.log('Initializing API client...');
        await apiClient.init();
        console.log('API client initialized.');
      } catch (e) {
        console.warn('App preparation error:', e);
        Alert.alert('Startup Error', String(e));
      } finally {
        console.log('Hiding splash screen...');
        setAppIsReady(true);
        await SplashScreen.hideAsync();
        console.log('App preparation finished.');
      }
    }

    prepare();
  }, []);

  if (!appIsReady) {
    return null;
  }

  if (!isConnected) {
    return (
      <>
        <BackendStatus onConnected={() => setIsConnected(true)} />
        <StatusBar style="auto" />
      </>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
