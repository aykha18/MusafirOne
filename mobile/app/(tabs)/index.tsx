import { useState, useEffect } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { router } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import * as Google from 'expo-auth-session/providers/google';
import { apiClient, User } from '@/api/client';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedButton } from '@/components/themed-button';
import { ThemedInput } from '@/components/themed-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CountrySelector } from '@/components/country-selector';

WebBrowser.maybeCompleteAuthSession();

export default function HomeScreen() {
  const [country, setCountry] = useState({ name: 'United Arab Emirates', code: 'AE', dialCode: '+971' });
  const [localPhone, setLocalPhone] = useState('');
  const [code, setCode] = useState('');
  const [me, setMe] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggedInPhone, setLoggedInPhone] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);

  const extra = (Constants?.expoConfig?.extra ?? {}) as any;
  const googleExtra = extra?.google ?? {};
  const webClientId =
    googleExtra.webClientId ||
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    undefined;
  const androidClientId =
    googleExtra.androidClientId ||
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
    undefined;
  const iosClientId =
    googleExtra.iosClientId ||
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
    undefined;
  const expoClientId =
    googleExtra.expoClientId ||
    process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID ||
    webClientId ||
    undefined;
  const isWeb = Platform.OS === 'web';
  const appOwnership = Constants.appOwnership;
  const useProxy =
    !isWeb && (appOwnership === 'expo' || appOwnership === 'guest');
  const redirectUri = isWeb
    ? AuthSession.makeRedirectUri({ path: 'auth/callback' })
    : AuthSession.makeRedirectUri({ scheme: 'mobile', useProxy });
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId,
    iosClientId,
    webClientId,
    expoClientId: isWeb || !useProxy ? undefined : expoClientId,
    redirectUri,
    responseType: AuthSession.ResponseType.IdToken,
    scopes: ['openid', 'profile', 'email'],
  });

  const isLoggedIn = !!apiClient.getAccessToken();

  useEffect(() => {
    if (isLoggedIn && !me) {
      handleLoadProfile();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (response?.type === 'success') {
      const params = (response as any)?.params ?? {};
      const idToken = params.id_token as string | undefined;
      if (!idToken) {
        const keys = Object.keys(params).join(', ');
        setError(`Google did not return id_token. Response keys: ${keys || '(none)'}`);
        return;
      }
      handleGoogleLogin(idToken);
    } else if (response?.type === 'error') {
      setError('Google Sign-In failed');
    }
  }, [response]);

  const handleGoogleLogin = async (token: string) => {
    setBusy(true);
    setError(null);
    try {
      await apiClient.googleLogin(token, 'demo-device');
      await handleLoadProfile(); // Refresh profile to get user info
      router.replace('/(tabs)/currency');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleRequestOtp = async () => {
    setBusy(true);
    setError(null);
    try {
      const fullNumber = `${country.dialCode}${localPhone}`;
      const result = await apiClient.requestOtp({ phoneNumber: fullNumber });
      setOtpSent(true);
      setError(result.message); // Show success message temporarily in error field or dedicated field
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async () => {
    setBusy(true);
    setError(null);
    try {
      const fullNumber = `${country.dialCode}${localPhone}`;
      await apiClient.verifyOtp({
        phoneNumber: fullNumber,
        code,
        deviceFingerprint: 'demo-device',
      });
      setLoggedInPhone(fullNumber);
      router.push('/(tabs)/currency');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleLoadProfile = async () => {
    setBusy(true);
    setError(null);
    try {
      const profile = await apiClient.getMe();
      setMe(profile);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={null}>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">MuhajirOne</ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        {!isLoggedIn && (
          <>
            <ThemedText type="subtitle">Sign In</ThemedText>
            
            {/* Google Sign-In */}
            <View style={styles.row}>
              <ThemedButton
                title="Sign in with Google"
                onPress={() => promptAsync({ useProxy })}
                disabled={!request || busy}
                fullWidth
                variant="secondary"
              />
            </View>
            <ThemedText numberOfLines={2}>
              Redirect URI: {redirectUri}
            </ThemedText>

            <ThemedText style={{ textAlign: 'center', marginVertical: 10 }}>OR</ThemedText>

            <View style={[styles.row, styles.countryRow]}>
              <CountrySelector
                value={country}
                onChange={setCountry}
              />
            </View>
            <View style={styles.row}>
              <ThemedInput
                placeholder="Phone number (without country code)"
                keyboardType="phone-pad"
                value={localPhone}
                onChangeText={setLocalPhone}
              />
            </View>
            <View style={styles.row}>
              <ThemedButton
                title="Request OTP"
                onPress={handleRequestOtp}
                disabled={busy || !localPhone}
                fullWidth
              />
            </View>
            <View style={styles.row}>
              <ThemedInput
                placeholder="OTP code"
                keyboardType="number-pad"
                value={code}
                onChangeText={setCode}
              />
            </View>
            <View style={styles.row}>
              <ThemedButton
                title="Verify OTP"
                onPress={handleVerifyOtp}
                disabled={busy || !code || !localPhone}
                fullWidth
              />
            </View>
            {otpSent && (
              <ThemedText style={{ color: 'green' }}>
                OTP Sent! Please check your SMS.
              </ThemedText>
            )}
          </>
        )}
        {isLoggedIn && (
          <>
            <ThemedText type="subtitle">Dashboard</ThemedText>
            <ThemedText>
              Logged in as {loggedInPhone ?? 'your phone'}
            </ThemedText>
            <View style={styles.row}>
              <ThemedButton
                title="View profile"
                onPress={handleLoadProfile}
                disabled={busy}
                fullWidth
              />
            </View>
            <View style={styles.row}>
              <ThemedButton
                title="Currency activity"
                onPress={() => router.push('/(tabs)/currency')}
                fullWidth
              />
            </View>
            <View style={styles.row}>
              <ThemedButton
                title="Parcel activity"
                onPress={() => router.push('/(tabs)/parcel')}
                fullWidth
              />
            </View>
            {me?.isAdmin && (
              <View style={styles.row}>
                <ThemedButton
                  title="Admin Dashboard"
                  onPress={() => router.push('/admin')}
                  fullWidth
                  variant="secondary"
                />
              </View>
            )}
          </>
        )}
        {apiClient.getAccessToken() && (
          <ThemedText numberOfLines={1}>
            Access token: {apiClient.getAccessToken()?.slice(0, 16)}…
          </ThemedText>
        )}
        {me && (
          <ThemedText>
            Profile loaded
          </ThemedText>
        )}
        {error && <ThemedText>{error}</ThemedText>}
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  row: {
    width: '100%',
    marginBottom: 8,
  },
  countryRow: {
    marginBottom: 4,
  },
});
