import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';

import { apiClient, type DirectoryBusinessListItem } from '@/api/client';
import { CitySelector } from '@/components/city-selector';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedButton } from '@/components/themed-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppCard } from '@/components/ui/app-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';

export default function UmrahScreen() {
  const [items, setItems] = useState<DirectoryBusinessListItem[]>([]);
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async (opts?: { nextCity?: string }) => {
    if (!apiClient.getAccessToken()) {
      setError('Please sign in to view Umrah agencies.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let chosenCity = (opts?.nextCity ?? city).trim();
      if (!chosenCity) {
        const me = await apiClient.getMe();
        chosenCity = String((me as any)?.city ?? '').trim();
        if (chosenCity) setCity(chosenCity);
      }
      const res = await apiClient.listDirectoryBusinesses({
        type: 'umrah',
        city: chosenCity || undefined,
      });
      setItems(Array.isArray(res?.items) ? res.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void (async () => {
      if (!apiClient.getAccessToken()) {
        setError('Please sign in to view Umrah agencies.');
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const me = await apiClient.getMe();
        const initialCity = String((me as any)?.city ?? '').trim();
        if (initialCity) setCity(initialCity);
        const res = await apiClient.listDirectoryBusinesses({
          type: 'umrah',
          city: initialCity || undefined,
        });
        setItems(Array.isArray(res?.items) ? res.items : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    })();
  }, []);

  const openPhone = async (phone?: string | null) => {
    if (!phone) {
      Alert.alert('No phone number available');
      return;
    }
    await Linking.openURL(`tel:${phone}`);
  };

  const openWhatsApp = async (whatsapp?: string | null) => {
    if (!whatsapp) {
      Alert.alert('No WhatsApp number available');
      return;
    }
    const digits = whatsapp.replace(/[^\d+]/g, '');
    await Linking.openURL(`https://wa.me/${digits.replace(/^\+/, '')}`);
  };

  const openWebsite = async (website?: string | null) => {
    if (!website) {
      Alert.alert('No website available');
      return;
    }
    const url = website.startsWith('http://') || website.startsWith('https://') ? website : `https://${website}`;
    await Linking.openURL(url);
  };

  const openDirections = async (it: DirectoryBusinessListItem) => {
    if (typeof it.lat !== 'number' || typeof it.lng !== 'number') {
      Alert.alert('Location not available');
      return;
    }
    const label = encodeURIComponent(it.name ?? 'Umrah agency');
    const url = `https://www.google.com/maps/search/?api=1&query=${it.lat},${it.lng}&query_place_id=${label}`;
    await Linking.openURL(url);
  };

  const claimLabel = (status: DirectoryBusinessListItem['claimStatus']) => {
    if (status === 'claim_requested') return 'Claim in review';
    if (status === 'claim_rejected') return 'Claim rejected';
    if (status === 'claimed') return 'Claimed';
    return 'Unclaimed';
  };

  const canClaim = (status: DirectoryBusinessListItem['claimStatus']) => {
    return status === 'unclaimed' || status === 'claim_rejected';
  };

  const submitClaim = async (businessId: string) => {
    Alert.alert('Claim this business?', 'We will review your request.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Submit',
        onPress: async () => {
          setBusy(true);
          setError(null);
          try {
            await apiClient.createBusinessClaim(businessId, { method: 'docs' });
            await refresh();
            Alert.alert('Submitted', 'Your claim is in review.');
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol size={310} color="#808080" name="airplane" style={styles.headerImage} />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title" style={{ fontFamily: Fonts.rounded }}>
          Umrah
        </ThemedText>
      </ThemedView>
      <ThemedText style={styles.subtitle}>Browse Umrah agencies. Claim + inquiry flows are next.</ThemedText>

      <AppCard style={{ gap: 12 }}>
        <View style={{ gap: 8 }}>
          <ThemedText type="defaultSemiBold">City</ThemedText>
          <CitySelector
            value={city}
            onChange={(v) => {
              setCity(v);
              void refresh({ nextCity: v });
            }}
            placeholder="Select city"
          />
        </View>

        {error ? <ThemedText style={{ color: 'red' }}>{error}</ThemedText> : null}
        {busy ? <ThemedText style={{ opacity: 0.75 }}>Loading…</ThemedText> : null}

        <View style={{ gap: 10 }}>
          {items.map((it) => (
            <AppCard key={it.id} variant="soft" style={{ padding: 12, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ThemedText type="defaultSemiBold" style={{ flex: 1 }}>
                  {it.name} {it.isVerified ? '✓' : ''}
                </ThemedText>
                <ThemedText style={{ opacity: 0.7 }}>{claimLabel(it.claimStatus)}</ThemedText>
              </View>
              <ThemedText style={{ opacity: 0.75 }}>
                {it.city} • {it.address}
              </ThemedText>
              <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
                <Pressable onPress={() => void openPhone(it.phone)}>
                  <ThemedText style={styles.link}>Call</ThemedText>
                </Pressable>
                <Pressable onPress={() => void openWhatsApp(it.whatsapp)}>
                  <ThemedText style={styles.link}>WhatsApp</ThemedText>
                </Pressable>
                <Pressable onPress={() => void openWebsite(it.website)}>
                  <ThemedText style={styles.link}>Website</ThemedText>
                </Pressable>
                <Pressable onPress={() => void openDirections(it)}>
                  <ThemedText style={styles.link}>Directions</ThemedText>
                </Pressable>
                {canClaim(it.claimStatus) ? (
                  <Pressable onPress={() => void submitClaim(it.id)}>
                    <ThemedText style={styles.link}>Claim</ThemedText>
                  </Pressable>
                ) : null}
                <ThemedText style={{ opacity: 0.6 }}>
                  {it.openNow === null ? '' : it.openNow ? 'Open now' : 'Closed'}
                </ThemedText>
              </View>
            </AppCard>
          ))}

          {items.length === 0 && !busy ? (
            <ThemedText style={{ opacity: 0.75 }}>No agencies found.</ThemedText>
          ) : null}
        </View>

        <ThemedView style={styles.actionsRow}>
          <ThemedButton
            title={busy ? 'Refreshing...' : 'Refresh'}
            variant="secondary"
            onPress={() => void refresh()}
            disabled={busy}
            style={{ flex: 1 }}
          />
          <ThemedButton title="Coming soon" variant="secondary" disabled style={{ flex: 1 }} />
        </ThemedView>
      </AppCard>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  subtitle: {
    marginBottom: 12,
    opacity: 0.8,
  },
  actionsRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 10,
  },
  link: {
    color: '#007AFF',
  },
});
