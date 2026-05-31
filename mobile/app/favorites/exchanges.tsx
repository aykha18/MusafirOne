import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { apiClient, type FavoriteExchange } from '@/api/client';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedButton } from '@/components/themed-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppCard } from '@/components/ui/app-card';

export default function FavoriteExchangesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<FavoriteExchange[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient.listFavoriteExchanges();
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

  return (
    <ParallaxScrollView headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }} headerImage={null}>
      <ThemedView style={{ gap: 12 }}>
        <ThemedText type="title">Favorite Exchanges</ThemedText>
        {error ? <ThemedText style={{ color: 'red' }}>{error}</ThemedText> : null}

        <AppCard style={{ padding: 14, gap: 10 }}>
          {items.map((it) => (
            <Pressable
              key={it.id}
              onPress={() => router.push({ pathname: `/exchanges/${it.id}` })}
            >
              <AppCard variant="soft" style={{ padding: 12, gap: 4 }}>
                <ThemedText type="defaultSemiBold">
                  {it.name} {it.isVerified ? '✓' : ''}
                </ThemedText>
                <ThemedText style={{ opacity: 0.75 }}>
                  {it.city} • {it.address}
                </ThemedText>
                <ThemedText style={{ opacity: 0.6 }}>
                  Favorited: {String(it.favoritedAt)}
                </ThemedText>
              </AppCard>
            </Pressable>
          ))}
          {items.length === 0 && !busy ? (
            <ThemedText style={{ opacity: 0.75 }}>No favorites yet.</ThemedText>
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

