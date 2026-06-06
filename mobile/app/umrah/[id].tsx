import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { apiClient } from '@/api/client';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedButton } from '@/components/themed-button';
import { ThemedInput } from '@/components/themed-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppCard } from '@/components/ui/app-card';

export default function UmrahAgencyScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const businessId = Array.isArray(id) ? id[0] : id;

  const [business, setBusiness] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');

  const load = async () => {
    if (!businessId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient.getDirectoryBusiness(String(businessId));
      setBusiness(res);
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
  }, [businessId]);

  const submit = async () => {
    if (!businessId) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient.createUmrahLead({
        businessId: String(businessId),
        message: message.trim() ? message.trim() : undefined,
      });
      setMessage('');
      Alert.alert('Sent', 'Your inquiry has been sent.');
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const submitReport = async () => {
    if (!businessId) return;
    const reason = reportReason.trim();
    if (!reason) {
      Alert.alert('Missing reason', 'Please enter a short reason.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiClient.reportDirectoryBusiness(String(businessId), {
        reason,
        details: reportDetails.trim() ? reportDetails.trim() : undefined,
      });
      setReporting(false);
      setReportReason('');
      setReportDetails('');
      Alert.alert('Submitted', 'Thanks. We will review this listing.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const branch = business?.branches?.[0] ?? null;

  return (
    <ParallaxScrollView headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }} headerImage={null}>
      <ThemedView style={{ gap: 12 }}>
        <ThemedText type="title">{business?.name ?? 'Umrah agency'}</ThemedText>
        {branch ? (
          <ThemedText style={{ opacity: 0.75 }}>
            {String(branch.city ?? '')} • {String(branch.address ?? '')}
          </ThemedText>
        ) : null}

        {error ? <ThemedText style={{ color: 'red' }}>{error}</ThemedText> : null}

        <AppCard style={{ padding: 14, gap: 10 }}>
          <ThemedText type="defaultSemiBold">Send inquiry</ThemedText>
          <ThemedInput
            placeholder="Your message (optional)"
            value={message}
            onChangeText={setMessage}
            multiline
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <ThemedButton
              title={busy ? 'Sending...' : 'Send'}
              onPress={submit}
              disabled={busy}
              style={{ flex: 1 }}
            />
            <ThemedButton title="Cancel" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} />
          </View>
        </AppCard>

        <AppCard style={{ padding: 14, gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <ThemedButton
              title={reporting ? 'Close Report' : 'Report listing'}
              variant="secondary"
              onPress={() => setReporting((v) => !v)}
              disabled={busy}
              style={{ flex: 1 }}
            />
            <ThemedButton title={busy ? 'Loading...' : 'Refresh'} variant="secondary" onPress={load} disabled={busy} style={{ flex: 1 }} />
          </View>

          {reporting ? (
            <View style={{ gap: 10 }}>
              <ThemedInput
                placeholder="Reason (e.g., wrong phone, duplicate, scam)"
                value={reportReason}
                onChangeText={setReportReason}
              />
              <ThemedInput
                placeholder="Details (optional)"
                value={reportDetails}
                onChangeText={setReportDetails}
                multiline
              />
              <ThemedButton title={busy ? 'Submitting...' : 'Submit report'} onPress={submitReport} disabled={busy} />
            </View>
          ) : null}
        </AppCard>
      </ThemedView>
    </ParallaxScrollView>
  );
}
