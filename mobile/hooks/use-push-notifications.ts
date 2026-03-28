import { useState, useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient } from '@/api/client';
import { useRouter } from 'expo-router';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const router = useRouter();

  async function registerForPushNotificationsAsync() {
    if (Platform.OS === 'web') {
      console.log('Push notifications skipped on web');
      return;
    }

    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      
      try {
          const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
          token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      } catch (e: any) {
          console.error('Error getting push token:', e);
          if (e.message?.includes('projectId')) {
              console.log('Project ID not found. Please run "eas build:configure" to set up your EAS project.');
          }
      }
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  }

  useEffect(() => {
    let isMounted = true;
    
    registerForPushNotificationsAsync().then(token => {
      if (!isMounted) return;
      setExpoPushToken(token);
      if (token) {
        apiClient.registerPushToken(token).catch(err => {
            // Ignore 401 errors (not logged in)
            if (err.status !== 401) {
                console.error("Failed to register token", err);
            }
        });
      }
    });

    try {
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        if (!isMounted) return;
        setNotification(notification);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        if (!isMounted) return;
        const data = response.notification.request.content.data as Record<string, unknown>;
        const conversationId = typeof data.conversationId === 'string' ? data.conversationId : undefined;
        const type = typeof data.type === 'string' ? data.type : '';

        if (conversationId) {
          router.push(`/chat/${conversationId}`);
        } else if (type.startsWith('parcel_')) {
          router.push('/parcel');
        } else if (type.startsWith('currency_')) {
          router.push('/currency');
        }
      });
    } catch (error) {
      console.error('Error setting up notification listeners:', error);
    }

    return () => {
      isMounted = false;
      try {
        notificationListener.current?.remove();
        responseListener.current?.remove();
      } catch (error) {
        console.error('Error removing notification listeners:', error);
      }
    };
  }, []);

  return {
    expoPushToken,
    notification,
  };
}
