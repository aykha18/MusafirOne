import { useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { apiClient, type ExchangeRateAlert } from '@/api/client';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedButton } from '@/components/themed-button';
import { ThemedInput } from '@/components/themed-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppCard } from '@/components/ui/app-card';
import { SegmentedControl } from '@/components/ui/segmented-control';

export default function ExchangeAlertsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ExchangeRateAlert[]>([]);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('PKR');
  const [direction, setDirection] = useState<'buy' | 'sell'>('buy');
  const [targetRate, setTargetRate] = useState('');

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient.listExchangeRateAlerts();
      setItems(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    const fc = fromCurrency.trim().toUpperCase();
    const tc = toCurrency.trim().toUpperCase();
    const tr = targetRate.trim();
    if (!fc || !tc || !tr) {
      Alert.alert('Missing fields', 'Enter from/to currencies and target rate.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await apiClient.createExchangeRateAlert({
        fromCurrency: fc,
        toCurrency: tc,
        direction,
        targetRate: tr,
        isActive: true,
      });
      setTargetRate('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: string) => {
    Alert.alert('Delete alert?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await apiClient.deleteExchangeRateAlert(id);
            await load();
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <ParallaxScrollView headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }} headerImage={null}>
      <ThemedView style={{ gap: 12 }}>
        <ThemedText type="title">Rate Alerts</ThemedText>
        {error ? <ThemedText style={{ color: 'red' }}>{error}</ThemedText> : null}

        <AppCard style={{ padding: 14, gap: 10 }}>
          <ThemedText type="defaultSemiBold">Create alert</ThemedText>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <ThemedInput value={fromCurrency} onChangeText={setFromCurrency} placeholder="From (e.g., USD)" />
            <ThemedInput value={toCurrency} onChangeText={setToCurrency} placeholder="To (e.g., PKR)" />
          </View>
          <SegmentedControl
            value={direction}
            options={[
              { value: 'buy', label: 'Buy' },
              { value: 'sell', label: 'Sell' },
            ]}
            onChange={setDirection}
          />
          <ThemedInput
            value={targetRate}
            onChangeText={setTargetRate}
            placeholder="Target rate (e.g., 278.5)"
            keyboardType="decimal-pad"
          />
          <ThemedButton
            title={creating ? 'Creating…' : 'Create'}
            onPress={create}
            disabled={creating}
          />
        </AppCard>

        <AppCard style={{ padding: 14, gap: 10 }}>
          <ThemedText type="defaultSemiBold">Your alerts</ThemedText>
          {items.map((it) => (
            <AppCard key={it.id} variant="soft" style={{ padding: 12, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ThemedText type="defaultSemiBold" style={{ flex: 1 }}>
                  {it.fromCurrency} → {it.toCurrency} ({it.direction})
                </ThemedText>
                <Pressable onPress={() => remove(it.id)}>
                  <ThemedText style={{ color: '#FF3B30' }}>Delete</ThemedText>
                </Pressable>
              </View>
              <ThemedText style={{ opacity: 0.75 }}>Target: {it.targetRate}</ThemedText>
              <ThemedText style={{ opacity: 0.6 }}>
                Created: {String(it.createdAt)}
              </ThemedText>
            </AppCard>
          ))}
          {items.length === 0 && !busy ? (
            <ThemedText style={{ opacity: 0.75 }}>No alerts yet.</ThemedText>
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
