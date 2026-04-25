import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiClient } from '@/api/client';
import { ThemedButton } from '@/components/themed-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function OAuthRedirect() {
  const handledRef = useRef(false);
  const [message, setMessage] = useState<string>('Completing sign-in…');
  const [error, setError] = useState<string | null>(null);
  const localParams = useLocalSearchParams<Record<string, string | string[]>>();

  useEffect(() => {
    if (handledRef.current) {
      return;
    }
    handledRef.current = true;

    const parseParams = (url: string) => {
      const [beforeHash, hashPartRaw] = url.split('#');
      const query = beforeHash.includes('?') ? beforeHash.split('?').slice(1).join('?') : '';
      const hashPart = hashPartRaw ?? '';

      const out = new URLSearchParams();
      if (query) {
        new URLSearchParams(query).forEach((value, key) => out.set(key, value));
      }
      if (hashPart) {
        new URLSearchParams(hashPart).forEach((value, key) => out.set(key, value));
      }
      return out;
    };

    const getRedirectUrl = async (): Promise<string | null> => {
      const initial = await Linking.getInitialURL();
      if (initial) {
        return initial;
      }

      return await new Promise((resolve) => {
        const subscription = Linking.addEventListener('url', (event) => {
          subscription.remove();
          resolve(event.url ?? null);
        });

        setTimeout(() => {
          subscription.remove();
          resolve(null);
        }, 4000);
      });
    };

    const complete = async () => {
      try {
        const params = new URLSearchParams();
        let chosenUrl: string | null = null;
        Object.entries(localParams ?? {}).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            if (value.length > 0) {
              params.set(key, String(value[0]));
            }
            return;
          }
          if (typeof value === 'string') {
            params.set(key, value);
          }
        });

        if (params.keys().next().done) {
          const url = await getRedirectUrl();
          const storedUrl = await AsyncStorage.getItem('muhajirone_last_url');
          const chosen = url ?? storedUrl ?? null;
          chosenUrl = chosen;
          if (!chosen) {
            setError('Missing redirect URL');
            setMessage('Sign-in did not complete');
            return;
          }
          parseParams(chosen).forEach((value, key) => params.set(key, value));
          await AsyncStorage.removeItem('muhajirone_last_url');
        }

        const googleError = params.get('error');
        if (googleError) {
          const description = params.get('error_description');
          setError(description ? `${googleError}: ${description}` : googleError);
          setMessage('Google Sign-In failed');
          return;
        }

        const idTokenFromRedirect = params.get('id_token');
        let code = params.get('code');
        if (!code && params.has('code') && chosenUrl) {
          const parsed = Linking.parse(chosenUrl);
          const fromLinking = (parsed?.queryParams as any)?.code;
          if (typeof fromLinking === 'string' && fromLinking.length > 0) {
            code = fromLinking;
          } else {
            const match = chosenUrl.match(/[?#&]code=([^&#]+)/);
            if (match && typeof match[1] === 'string') {
              try {
                const decoded = decodeURIComponent(match[1]);
                if (decoded.length > 0) {
                  code = decoded;
                }
              } catch {
              }
            }
          }
        }

        let idToken = idTokenFromRedirect;
        if (!idToken && code) {
          const raw = await AsyncStorage.getItem('muhajirone_google_oauth');
          const stored = raw ? (JSON.parse(raw) as any) : null;
          const clientId = stored?.clientId as string | undefined;
          const redirectUri = stored?.redirectUri as string | undefined;
          const codeVerifier = stored?.codeVerifier as string | null | undefined;

          if (!clientId || !redirectUri) {
            setError('Missing stored OAuth context (clientId/redirectUri). Please try again from the Sign In screen.');
            setMessage('Sign-in did not complete');
            return;
          }

          const body = new URLSearchParams();
          body.set('grant_type', 'authorization_code');
          body.set('code', code);
          body.set('client_id', clientId);
          body.set('redirect_uri', redirectUri);
          if (typeof codeVerifier === 'string' && codeVerifier.length > 0) {
            body.set('code_verifier', codeVerifier);
          }

          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
          });
          const responseText = await tokenResponse.text();
          let tokenJson: any = {};
          try {
            tokenJson = JSON.parse(responseText);
          } catch (e) {
            // console.error('Failed to parse token response:', responseText);
          }
          const exchangedIdToken = tokenJson?.id_token as string | undefined;
          if (!exchangedIdToken) {
            const details =
              typeof tokenJson?.error_description === 'string'
                ? tokenJson.error_description
                : typeof tokenJson?.error === 'string'
                  ? tokenJson.error
                  : `status ${tokenResponse.status} - ${responseText.substring(0, 100)}`;
            setError(`Failed to exchange auth code for id_token (${details})`);
            setMessage('Sign-in did not complete');
            return;
          }
          idToken = exchangedIdToken;
          await AsyncStorage.removeItem('muhajirone_google_oauth');
        }

        if (!idToken) {
          const keys = Array.from(params.keys()).join(', ');
          setError(
            `Google redirect missing id_token. Response keys: ${keys || '(none)'}`,
          );
          setMessage('Sign-in did not complete');
          return;
        }

        setMessage('Signing into MusafirOne…');
        await apiClient.googleLogin(idToken, 'demo-device');
        try {
          const profile = await apiClient.getMe();
          router.replace(profile?.isAdmin ? '/admin' : '/currency');
        } catch {
          router.replace('/currency');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setMessage('Sign-in did not complete');
      }
    };

    complete();
  }, []);

  return (
    <ThemedView style={{ flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
      <ThemedText style={{ marginTop: 12, textAlign: 'center' }}>{message}</ThemedText>
      {error ? (
        <>
          <ThemedText style={{ marginTop: 12, textAlign: 'center', color: '#d00' }}>
            {error}
          </ThemedText>
          <View style={{ height: 16 }} />
          <ThemedButton title="Back to Sign In" onPress={() => router.replace('/')} />
        </>
      ) : null}
    </ThemedView>
  );
}
