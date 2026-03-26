import { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import 'react-native-reanimated';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { apiClient } from '@/api/client';
import { BackendStatus } from '@/components/backend-status';

export const unstable_settings = {
  anchor: '(tabs)',
};

WebBrowser.maybeCompleteAuthSession();

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appIsReady, setAppIsReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    async function prepare() {
      // console.log('App preparation starting...');
      try {
        // console.log('Initializing API client...');
        await apiClient.init();
        // console.log('API client initialized.');
      } catch (e) {
        console.warn('App preparation error:', e);
        Alert.alert('Startup Error', String(e));
      } finally {
        // console.log('Hiding splash screen...');
        setAppIsReady(true);
        await SplashScreen.hideAsync();
        // console.log('App preparation finished.');
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    const store = async (url: string) => {
      try {
        await AsyncStorage.setItem('muhajirone_last_url', url);
      } catch {
      }
    };

    const subscription = Linking.addEventListener('url', (event) => {
      if (event.url) {
        store(event.url);
      }
    });

    Linking.getInitialURL().then((url) => {
      if (url) {
        store(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (!appIsReady) {
    return null;
  }

  // Non-blocking status check: render UI immediately
  // If disconnected, BackendStatus can be shown as a banner inside screens if needed
  
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
