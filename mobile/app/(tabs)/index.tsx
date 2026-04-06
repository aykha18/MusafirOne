import { useCallback, useMemo, useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Platform, Pressable } from 'react-native';
import { router } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import * as Google from 'expo-auth-session/providers/google';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient, User } from '@/api/client';
import { ThemedButton } from '@/components/themed-button';
import { ThemedInput } from '@/components/themed-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CountrySelector } from '@/components/country-selector';
import { AppHeader } from '@/components/ui/app-header';
import { AppCard } from '@/components/ui/app-card';
import { Colors, UI } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';

WebBrowser.maybeCompleteAuthSession();

function GoogleSignInSection({
  androidClientId,
  iosClientId,
  webClientId,
  expoClientId,
  busy,
  onLogin,
  onError,
}: {
  androidClientId?: string;
  iosClientId?: string;
  webClientId?: string;
  expoClientId?: string;
  busy: boolean;
  onLogin: (idToken: string) => void;
  onError: (message: string) => void;
}) {
  const isWeb = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';
  const appOwnership = Constants.appOwnership;
  const useProxy = !isWeb && (appOwnership === 'expo' || appOwnership === 'guest');
  const hasValidAndroidClientId =
    typeof androidClientId === 'string' &&
    androidClientId.length > 0 &&
    androidClientId.includes('.apps.googleusercontent.com');
  const missingAndroidId = isAndroid && !useProxy && !hasValidAndroidClientId;

  if (missingAndroidId) {
    return (
      <>
        <View style={styles.row}>
          <ThemedButton
            title="Sign in with Google"
            onPress={() =>
              onError(
                'Google Sign-In is not configured for Android builds. Set a valid androidClientId (ends with .apps.googleusercontent.com) in app.json (expo.extra.google.androidClientId) or via EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID in EAS.',
              )
            }
            disabled={false}
            fullWidth
            variant="secondary"
          />
        </View>
      </>
    );
  }

  return (
    <GoogleSignInEnabled
      androidClientId={androidClientId}
      iosClientId={iosClientId}
      webClientId={webClientId}
      expoClientId={expoClientId}
      busy={busy}
      onLogin={onLogin}
      onError={onError}
      useProxy={useProxy}
    />
  );
}

function GoogleSignInEnabled({
  androidClientId,
  iosClientId,
  webClientId,
  expoClientId,
  busy,
  onLogin,
  onError,
  useProxy,
}: {
  androidClientId?: string;
  iosClientId?: string;
  webClientId?: string;
  expoClientId?: string;
  busy: boolean;
  onLogin: (idToken: string) => void;
  onError: (message: string) => void;
  useProxy: boolean;
}) {
  const isWeb = Platform.OS === 'web';
  const googleNativeScheme =
    typeof androidClientId === 'string' && androidClientId.includes('.apps.googleusercontent.com')
      ? `com.googleusercontent.apps.${androidClientId.replace(
          '.apps.googleusercontent.com',
          '',
        )}`
      : undefined;
  const redirectUri = isWeb
    ? AuthSession.makeRedirectUri({ path: 'auth/callback' })
    : useProxy
      ? AuthSession.makeRedirectUri()
      : AuthSession.makeRedirectUri({
          native: `${googleNativeScheme ?? 'mobile'}:/oauthredirect`,
        });

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId,
    iosClientId,
    webClientId,
    clientId: isWeb || !useProxy ? undefined : expoClientId,
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
    selectAccount: true,
  });

  useEffect(() => {
    if (!response) {
      return;
    }
    if (response?.type === 'success') {
      const params = (response as any)?.params ?? {};
      const idToken = params.id_token as string | undefined;
      if (!idToken) {
        const keys = Object.keys(params).join(', ');
        onError(
          `Google did not return id_token. Response keys: ${keys || '(none)'}`,
        );
        return;
      }
      onLogin(idToken);
    } else if (response?.type === 'error') {
      onError('Google Sign-In failed');
    }
  }, [response, onLogin, onError]);

  return (
    <>
      <View style={styles.row}>
        <ThemedButton
          title="Sign in with Google"
          onPress={async () => {
            if (!request) {
              onError(
                'Google Sign-In is not ready. Double-check google.androidClientId in app.json or EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID in EAS, then rebuild the APK.',
              );
              return;
            }
            const isAndroid = Platform.OS === 'android';
            const isIos = Platform.OS === 'ios';
            const clientId = isWeb
              ? webClientId
              : useProxy
                ? expoClientId ?? webClientId ?? androidClientId ?? iosClientId
                : isAndroid
                  ? androidClientId
                  : isIos
                    ? iosClientId
                    : webClientId;
            try {
              await AsyncStorage.setItem(
                'muhajirone_google_oauth',
                JSON.stringify({
                  redirectUri,
                  clientId,
                  codeVerifier: (request as any)?.codeVerifier ?? null,
                  createdAt: new Date().toISOString(),
                }),
              );
            } catch {
            }
            promptAsync();
          }}
          disabled={busy}
          fullWidth
          variant="secondary"
        />
      </View>
    </>
  );
}

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const [country, setCountry] = useState({ name: 'United Arab Emirates', code: 'AE', dialCode: '+971' });
  const [localPhone, setLocalPhone] = useState('');
  const [code, setCode] = useState('');
  const [me, setMe] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [dashboardItems, setDashboardItems] = useState<
    { key: string; title: string; subtitle: string; badge?: string; route?: string }[]
  >([]);

  const extra = ((Constants as any)?.expoConfig?.extra ??
    (Constants as any)?.easConfig?.extra ??
    (Constants as any)?.manifest?.extra ??
    (Constants as any)?.manifest2?.extra ??
    {}) as any;
  const googleExtra = extra?.google ?? {};
  const webClientId =
    googleExtra.webClientId ||
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    undefined;
  const androidClientId =
    (googleExtra.androidClientId ||
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
      '')?.trim() || undefined;
  const iosClientId =
    googleExtra.iosClientId ||
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
    undefined;
  const expoClientId =
    googleExtra.expoClientId ||
    process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID ||
    webClientId ||
    undefined;

  const isLoggedIn = !!apiClient.getAccessToken();

  useEffect(() => {
    if (isLoggedIn && !me) {
      handleLoadProfile();
    }
  }, [isLoggedIn, me]);

  const verificationLabel = useMemo(() => {
    const level = me?.verificationLevel ?? 0;
    if (level >= 2) return 'Level 2 Verified';
    if (level >= 1) return 'Level 1 Verified';
    return 'Unverified';
  }, [me?.verificationLevel]);

  const handleGoogleLogin = async (token: string) => {
    setBusy(true);
    setError(null);
    try {
      await apiClient.googleLogin(token, 'demo-device');
      await handleLoadProfile(); // Refresh profile to get user info
      router.replace('/currency');
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
      router.push('/currency');
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

  const loadDashboard = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const [currencyRequests, myParcelRequests, myParcelTrips] = await Promise.all([
        apiClient.listMatchRequests('all'),
        apiClient.listMyParcelRequests(),
        apiClient.listMyParcelTrips(),
      ]);

      const items: { key: string; title: string; subtitle: string; badge?: string; route?: string }[] = [];

      const pendingCurrency = (currencyRequests as any[])
        .filter((r) => r.status === 'pending' || r.status === 'accepted')
        .slice(0, 1);
      for (const r of pendingCurrency) {
        items.push({
          key: `currency-${r.id}`,
          title: 'Currency exchange request',
          subtitle: r.status === 'accepted' ? 'Matched' : 'Matching',
          badge: r.status === 'accepted' ? 'Matched' : 'Matching',
          route: '/currency',
        });
      }

      const activeParcelReq = (myParcelRequests as any[])
        .filter((p) => p.status === 'active' || p.status === 'pending' || p.status === 'accepted')
        .slice(0, 1);
      for (const p of activeParcelReq) {
        items.push({
          key: `parcel-req-${p.id}`,
          title: `${p.fromCountry} to ${p.toCountry}`,
          subtitle: p.status === 'accepted' ? 'Trip scheduled' : 'Active request',
          badge: p.status === 'accepted' ? 'Trip scheduled' : 'Active',
          route: '/parcel',
        });
      }

      const activeTrip = (myParcelTrips as any[])
        .filter((t) => t.status === 'active')
        .slice(0, items.length === 0 ? 2 : 1);
      for (const t of activeTrip) {
        items.push({
          key: `parcel-trip-${t.id}`,
          title: `${t.fromCountry} to ${t.toCountry}`,
          subtitle: 'Trip scheduled',
          badge: 'Trip scheduled',
          route: '/parcel',
        });
      }

      setDashboardItems(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      loadDashboard();
    }
  }, [isLoggedIn, loadDashboard]);

  return (
    <ThemedView style={[styles.screen, { backgroundColor: Colors[colorScheme].surface }]}>
      {isLoggedIn ? (
        <>
          <AppHeader title="MuhajirOne" subtitle={verificationLabel} rightIconName="bell" onPressRightIcon={() => {}} />
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <AppCard style={[styles.trustCard, { backgroundColor: '#0B2A6F', borderColor: 'transparent' }]}>
              <View style={styles.trustTopRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.trustLabel} lightColor="#D7E6FF" darkColor="#D7E6FF">
                    Your Trust Score
                  </ThemedText>
                  <View style={styles.trustScoreRow}>
                    <ThemedText style={styles.trustScore} lightColor="#fff" darkColor="#fff">
                      {me?.trustScore ?? 0}
                    </ThemedText>
                    <ThemedText style={styles.trustOutOf} lightColor="#D7E6FF" darkColor="#D7E6FF">
                      / 100
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.trustIconWrap}>
                  <IconSymbol size={44} name="checkmark.seal.fill" color="rgba(255,255,255,0.25)" />
                </View>
              </View>
              <View style={styles.trustBarBg}>
                <View
                  style={[
                    styles.trustBarFill,
                    { width: `${Math.min(100, Math.max(0, me?.trustScore ?? 0))}%` },
                  ]}
                />
              </View>
              <ThemedText style={styles.trustHint} lightColor="#D7E6FF" darkColor="#D7E6FF">
                {me?.trustScore && me.trustScore >= 80
                  ? 'Excellent standing.'
                  : 'Complete more transactions to improve your trust score.'}
              </ThemedText>
            </AppCard>

            <View style={styles.quickActions}>
              <Pressable onPress={() => router.push('/currency')} style={{ flex: 1 }}>
                <AppCard style={styles.actionCard}>
                  <View style={[styles.actionIcon, { backgroundColor: 'rgba(77, 163, 255, 0.18)' }]}>
                    <IconSymbol size={22} name="arrow.left.arrow.right" color={Colors[colorScheme].tint} />
                  </View>
                  <ThemedText type="defaultSemiBold" style={styles.actionTitle}>
                    Exchange
                  </ThemedText>
                  <ThemedText style={styles.actionSubtitle}>Currency</ThemedText>
                </AppCard>
              </Pressable>
              <Pressable onPress={() => router.push('/parcel')} style={{ flex: 1 }}>
                <AppCard style={styles.actionCard}>
                  <View style={[styles.actionIcon, { backgroundColor: 'rgba(255, 165, 0, 0.18)' }]}>
                    <IconSymbol size={22} name="shippingbox.fill" color="#E98100" />
                  </View>
                  <ThemedText type="defaultSemiBold" style={styles.actionTitle}>
                    Send Parcel
                  </ThemedText>
                  <ThemedText style={styles.actionSubtitle}>Find travelers</ThemedText>
                </AppCard>
              </Pressable>
            </View>

            <View style={styles.sectionHeaderRow}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Active Requests
              </ThemedText>
              <Pressable onPress={() => router.push('/currency')}>
                <ThemedText style={{ color: Colors[colorScheme].tint }}>View all</ThemedText>
              </Pressable>
            </View>

            {dashboardItems.length === 0 ? (
              <AppCard variant="soft">
                <ThemedText style={{ opacity: 0.9 }}>
                  No active requests yet. Create a post to get started.
                </ThemedText>
              </AppCard>
            ) : (
              <View style={{ gap: UI.spacing.sm }}>
                {dashboardItems.map((item) => (
                  <Pressable key={item.key} onPress={() => (item.route ? router.push(item.route) : undefined)}>
                    <AppCard style={styles.listRowCard}>
                      <View style={styles.listRow}>
                        <View style={[styles.listIcon, { backgroundColor: Colors[colorScheme].surface }]}>
                          <IconSymbol
                            size={18}
                            name={item.key.startsWith('currency') ? 'arrow.left.arrow.right' : 'shippingbox.fill'}
                            color={Colors[colorScheme].icon}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
                          <ThemedText style={styles.listSubtitle}>{item.subtitle}</ThemedText>
                        </View>
                        {item.badge ? (
                          <View style={[styles.badge, { backgroundColor: Colors[colorScheme].surface }]}>
                            <ThemedText style={styles.badgeText}>{item.badge}</ThemedText>
                          </View>
                        ) : null}
                        <IconSymbol size={18} name="chevron.right" color={Colors[colorScheme].icon} />
                      </View>
                    </AppCard>
                  </Pressable>
                ))}
              </View>
            )}

            {me?.isAdmin ? (
              <View style={{ marginTop: UI.spacing.lg }}>
                <ThemedButton title="Admin Dashboard" variant="secondary" onPress={() => router.push('/admin')} fullWidth />
              </View>
            ) : null}
            {error ? <ThemedText style={{ marginTop: UI.spacing.sm, color: '#d00' }}>{error}</ThemedText> : null}
          </ScrollView>
        </>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText type="title" style={{ fontSize: 30, lineHeight: 34 }}>
            MuhajirOne
          </ThemedText>
          <ThemedText style={{ opacity: 0.85, marginTop: 6 }}>
            Sign in to exchange currency, send parcels, and build trust.
          </ThemedText>

          <View style={{ marginTop: UI.spacing.lg, gap: UI.spacing.md }}>
            <GoogleSignInSection
              androidClientId={androidClientId}
              iosClientId={iosClientId}
              webClientId={webClientId}
              expoClientId={expoClientId}
              busy={busy}
              onLogin={handleGoogleLogin}
              onError={setError}
            />

            <ThemedText style={{ textAlign: 'center', opacity: 0.75 }}>OR</ThemedText>

            <CountrySelector value={country} onChange={setCountry} />
            <ThemedInput
              placeholder="Phone number (without country code)"
              keyboardType="phone-pad"
              value={localPhone}
              onChangeText={setLocalPhone}
            />
            <ThemedButton title={busy ? 'Sending...' : 'Request OTP'} onPress={handleRequestOtp} disabled={busy || !localPhone} fullWidth />
            {otpSent ? (
              <ThemedText style={{ color: '#1b8f3a' }}>OTP sent. Check your SMS.</ThemedText>
            ) : null}
            <ThemedInput placeholder="OTP code" keyboardType="number-pad" value={code} onChangeText={setCode} />
            <ThemedButton title={busy ? 'Verifying...' : 'Verify OTP'} onPress={handleVerifyOtp} disabled={busy || !code || !localPhone} fullWidth />
            {error ? <ThemedText style={{ color: '#d00' }}>{error}</ThemedText> : null}
          </View>
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: UI.spacing.lg,
    paddingBottom: 90,
  },
  trustCard: {
    padding: UI.spacing.lg,
  },
  trustTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI.spacing.md,
  },
  trustLabel: {
    fontSize: 13,
    lineHeight: 16,
    opacity: 0.95,
  },
  trustScoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginTop: 6,
  },
  trustScore: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '800',
  },
  trustOutOf: {
    fontSize: 14,
    lineHeight: 18,
    paddingBottom: 8,
  },
  trustIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: UI.spacing.md,
  },
  trustBarFill: {
    height: '100%',
    backgroundColor: '#22D18B',
    borderRadius: 999,
  },
  trustHint: {
    marginTop: UI.spacing.sm,
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.95,
  },
  quickActions: {
    marginTop: UI.spacing.lg,
    flexDirection: 'row',
    gap: UI.spacing.md,
  },
  actionCard: {
    padding: UI.spacing.lg,
    gap: 6,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionTitle: {
    fontSize: 16,
    lineHeight: 20,
  },
  actionSubtitle: {
    fontSize: 13,
    lineHeight: 16,
    opacity: 0.85,
  },
  sectionHeaderRow: {
    marginTop: UI.spacing.lg,
    marginBottom: UI.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
  },
  listRowCard: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  listIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listSubtitle: {
    fontSize: 12,
    lineHeight: 14,
    opacity: 0.8,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    lineHeight: 14,
    opacity: 0.85,
  },
});
