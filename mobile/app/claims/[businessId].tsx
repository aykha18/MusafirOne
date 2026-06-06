import { useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { apiClient } from '@/api/client';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { AppCard } from '@/components/ui/app-card';
import { ThemedButton } from '@/components/themed-button';
import { ThemedInput } from '@/components/themed-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ClaimBusinessScreen() {
  const router = useRouter();
  const { businessId } = useLocalSearchParams();
  const id = Array.isArray(businessId) ? businessId[0] : businessId;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [business, setBusiness] = useState<any>(null);

  const [method, setMethod] = useState<'phone_otp' | 'docs'>('phone_otp');
  const [phoneToVerify, setPhoneToVerify] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const claimable = useMemo(() => {
    const status = String(business?.claimStatus ?? 'unclaimed');
    return status === 'unclaimed' || status === 'claim_rejected';
  }, [business?.claimStatus]);

  const load = async () => {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient.getDirectoryBusiness(String(id));
      setBusiness(res);
      const phone =
        String((res as any)?.phone ?? '').trim() || String((res as any)?.whatsapp ?? '').trim();
      if (phone && !phoneToVerify) setPhoneToVerify(phone);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!apiClient.getAccessToken()) {
      router.replace('/');
      return;
    }
    void load();
  }, [id]);

  const sendOtp = async () => {
    if (!id) return;
    if (!claimable) {
      Alert.alert('Not available', 'This business cannot be claimed right now.');
      return;
    }
    const phone = phoneToVerify.trim();
    if (!phone) {
      Alert.alert('Missing phone', 'Enter a phone number to verify.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiClient.createBusinessClaim(String(id), {
        method: 'phone_otp',
        phoneToVerify: phone,
      });
      setOtpSent(true);
      Alert.alert('OTP sent', 'Enter the code you received.');
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      if (String(message).toLowerCase().includes('already pending')) {
        setOtpSent(true);
      }
    } finally {
      setBusy(false);
    }
  };

  const resendOtp = async () => {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient.resendBusinessClaimOtp(String(id));
      setOtpSent(true);
      Alert.alert('OTP sent', 'Enter the latest code you received.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (!id) return;
    const code = otpCode.trim();
    if (!code) {
      Alert.alert('Missing code', 'Enter the OTP code.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiClient.verifyBusinessClaimOtp(String(id), code);
      Alert.alert('Approved', 'Business claimed successfully.');
      router.replace(`/business/${String(id)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const submitDocsClaim = async () => {
    if (!id) return;
    if (!claimable) {
      Alert.alert('Not available', 'This business cannot be claimed right now.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiClient.createBusinessClaim(String(id), { method: 'docs' });
      Alert.alert('Submitted', 'Your claim is in review.');
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ParallaxScrollView headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }} headerImage={null}>
      <ThemedView style={{ gap: 12 }}>
        <ThemedText type="title">Claim Business</ThemedText>
        <ThemedText style={{ opacity: 0.75 }}>
          {business?.name ?? ''} {business?.type ? `• ${String(business.type).toUpperCase()}` : ''}
        </ThemedText>
        {business?.claimStatus ? (
          <ThemedText style={{ opacity: 0.75 }}>Status: {String(business.claimStatus)}</ThemedText>
        ) : null}

        {error ? <ThemedText style={{ color: 'red' }}>{error}</ThemedText> : null}

        <AppCard style={{ padding: 14, gap: 12 }}>
          <ThemedText type="defaultSemiBold">Verification method</ThemedText>
          <SegmentedControl
            value={method}
            options={[
              { value: 'phone_otp', label: 'Phone OTP' },
              { value: 'docs', label: 'Docs' },
            ]}
            onChange={(v) => setMethod(v as any)}
          />

          {method === 'phone_otp' ? (
            <ThemedView style={{ gap: 10 }}>
              <ThemedInput
                placeholder="Business phone/WhatsApp"
                value={phoneToVerify}
                onChangeText={setPhoneToVerify}
                keyboardType="phone-pad"
              />
              <ThemedButton title={busy ? 'Sending...' : 'Send OTP'} onPress={sendOtp} disabled={busy} />

              {otpSent ? (
                <ThemedView style={{ gap: 10 }}>
                  <ThemedInput placeholder="Enter OTP code" value={otpCode} onChangeText={setOtpCode} keyboardType="number-pad" />
                  <ThemedButton title={busy ? 'Verifying...' : 'Verify & Claim'} onPress={verifyOtp} disabled={busy} />
                  <ThemedButton title={busy ? 'Sending...' : 'Resend OTP'} variant="secondary" onPress={resendOtp} disabled={busy} />
                </ThemedView>
              ) : null}
            </ThemedView>
          ) : (
            <ThemedView style={{ gap: 10 }}>
              <ThemedText style={{ opacity: 0.75 }}>
                Upload flow is next. For now this submits a claim for manual review.
              </ThemedText>
              <ThemedButton title={busy ? 'Submitting...' : 'Submit for Review'} onPress={submitDocsClaim} disabled={busy} />
            </ThemedView>
          )}
        </AppCard>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <ThemedButton title="Back" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} />
          <ThemedButton title={busy ? 'Refreshing...' : 'Refresh'} variant="secondary" onPress={load} disabled={busy} style={{ flex: 1 }} />
        </View>
      </ThemedView>
    </ParallaxScrollView>
  );
}
