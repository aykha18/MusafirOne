import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { apiClient } from '@/api/client';
import { PHONE_COUNTRIES } from '@/constants/phone';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedButton } from '@/components/themed-button';
import { ThemedInput } from '@/components/themed-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  const [countryIndex, setCountryIndex] = useState(0);
  const [localPhone, setLocalPhone] = useState('');
  const [code, setCode] = useState('');
  const [me, setMe] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOtp, setLastOtp] = useState<string | null>(null);
  const [loggedInPhone, setLoggedInPhone] = useState<string | null>(null);

  const handleRequestOtp = async () => {
    setBusy(true);
    setError(null);
    try {
      const country = PHONE_COUNTRIES[countryIndex];
      const fullNumber = `${country.dialCode}${localPhone}`;
      const result = await apiClient.requestOtp({ phoneNumber: fullNumber });
      setLastOtp(result.code);
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
      const country = PHONE_COUNTRIES[countryIndex];
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

  const isLoggedIn = !!apiClient.getAccessToken();

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
            <ThemedText type="subtitle">Auth demo</ThemedText>
            <View style={[styles.row, styles.countryRow]}>
              <ThemedButton
                title={`${PHONE_COUNTRIES[countryIndex].name} (${PHONE_COUNTRIES[countryIndex].dialCode})`}
                variant="secondary"
                onPress={() =>
                  setCountryIndex((countryIndex + 1) % PHONE_COUNTRIES.length)
                }
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
            {lastOtp && (
              <ThemedText>
                Latest OTP: {lastOtp}
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
