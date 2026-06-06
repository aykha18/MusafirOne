import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { apiClient, type BusinessClaim } from '@/api/client';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedButton } from '@/components/themed-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppCard } from '@/components/ui/app-card';

export default function MyClaimsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<BusinessClaim[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient.listMyClaims();
      setItems(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openClaim = (claim: BusinessClaim) => {
    if (claim.status === 'approved' || claim.businessClaimStatus === 'claimed') {
      router.push(`/business/${claim.businessId}`);
      return;
    }
    router.push(`/claims/${claim.businessId}`);
  };

  return (
    <ParallaxScrollView headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }} headerImage={null}>
      <ThemedView style={{ gap: 12 }}>
        <ThemedText type="title">My Claims</ThemedText>
        {error ? <ThemedText style={{ color: 'red' }}>{error}</ThemedText> : null}

        <AppCard style={{ padding: 14, gap: 10 }}>
          {items.map((it) => (
            <Pressable key={it.id} onPress={() => openClaim(it)}>
              <AppCard variant="soft" style={{ padding: 12, gap: 4 }}>
                <ThemedText type="defaultSemiBold">
                  {it.businessName} • {String(it.businessType).toUpperCase()}
                </ThemedText>
                <ThemedText style={{ opacity: 0.75 }}>
                  Request: {it.status} • Business: {it.businessClaimStatus} • Method: {it.method}
                </ThemedText>
                {it.rejectionReason ? (
                  <ThemedText style={{ opacity: 0.75 }}>Reason: {it.rejectionReason}</ThemedText>
                ) : null}
                <ThemedText style={{ opacity: 0.6 }}>Created: {String(it.createdAt)}</ThemedText>
              </AppCard>
            </Pressable>
          ))}
          {items.length === 0 && !busy ? (
            <ThemedText style={{ opacity: 0.75 }}>No claims yet.</ThemedText>
          ) : null}
        </AppCard>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <ThemedButton title={busy ? 'Refreshing...' : 'Refresh'} variant="secondary" onPress={load} disabled={busy} style={{ flex: 1 }} />
          <ThemedButton title="Back" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} />
        </View>
      </ThemedView>
    </ParallaxScrollView>
  );
}
