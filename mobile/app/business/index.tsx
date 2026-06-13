import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { apiClient, type BusinessType, type MyBusiness } from '@/api/client';
import { ThemedButton } from '@/components/themed-button';
import { ThemedInput } from '@/components/themed-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { AppCard } from '@/components/ui/app-card';
import { SegmentedControl } from '@/components/ui/segmented-control';

export default function BusinessIndexScreen() {
  const router = useRouter();
  const [items, setItems] = useState<MyBusiness[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [type, setType] = useState<BusinessType>('exchange');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [website, setWebsite] = useState('');
  const [branchCity, setBranchCity] = useState('');
  const [branchAddress, setBranchAddress] = useState('');

  const canCreate = useMemo(() => {
    return name.trim().length >= 2 && branchCity.trim().length >= 2 && branchAddress.trim().length >= 2;
  }, [branchAddress, branchCity, name]);

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient.listMyBusinesses();
      setItems(res);
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
  }, []);

  const handleCreate = async () => {
    if (!canCreate) return;
    setBusy(true);
    setError(null);
    try {
      const created = await apiClient.createBusiness({
        type,
        name: name.trim(),
        description: description.trim() ? description.trim() : undefined,
        phone: phone.trim() ? phone.trim() : undefined,
        whatsapp: whatsapp.trim() ? whatsapp.trim() : undefined,
        website: website.trim() ? website.trim() : undefined,
        branchCity: branchCity.trim(),
        branchAddress: branchAddress.trim(),
      });
      setCreating(false);
      setName('');
      setDescription('');
      setPhone('');
      setWhatsapp('');
      setWebsite('');
      setBranchCity('');
      setBranchAddress('');
      await load();
      router.push(`/business/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ParallaxScrollView headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }} headerImage={null}>
      <ThemedView style={{ gap: 12 }}>
        <ThemedText type="title">Business Dashboard</ThemedText>
        <ThemedText style={{ opacity: 0.75 }}>
          Manage your claimed businesses, or submit a missing exchange/Umrah agency for
          admin review.
        </ThemedText>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <ThemedButton
            title={creating ? 'Close' : 'Register Missing Business'}
            onPress={() => setCreating((v) => !v)}
            fullWidth
          />
        </View>

        {creating ? (
          <AppCard style={{ padding: 14, gap: 10 }}>
            <ThemedText type="defaultSemiBold">Missing Business Request</ThemedText>
            <ThemedText style={{ opacity: 0.75 }}>
              If the business already exists in the directory, claim it instead of creating a
              new request.
            </ThemedText>
            <SegmentedControl
              value={type}
              options={[
                { value: 'exchange', label: 'Exchange' },
                { value: 'umrah', label: 'Umrah' },
              ]}
              onChange={(v) => setType(v as BusinessType)}
            />
            <ThemedInput placeholder="Business name" value={name} onChangeText={setName} />
            <ThemedInput placeholder="Description (optional)" value={description} onChangeText={setDescription} multiline />
            <ThemedInput placeholder="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <ThemedInput placeholder="WhatsApp (optional)" value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" />
            <ThemedInput placeholder="Website (optional)" value={website} onChangeText={setWebsite} />
            <ThemedInput placeholder="Branch city" value={branchCity} onChangeText={setBranchCity} />
            <ThemedInput placeholder="Branch address" value={branchAddress} onChangeText={setBranchAddress} />
            {error ? <ThemedText style={{ color: 'red' }}>{error}</ThemedText> : null}
            <ThemedButton
              title={busy ? 'Creating...' : 'Submit for Approval'}
              onPress={handleCreate}
              disabled={!canCreate || busy}
              fullWidth
            />
          </AppCard>
        ) : null}

        <ThemedView style={{ gap: 10 }}>
          <ThemedText type="subtitle">My Businesses</ThemedText>
          {error ? <ThemedText style={{ color: 'red' }}>{error}</ThemedText> : null}
          {items.map((b) => (
            <Pressable key={b.id} onPress={() => router.push(`/business/${b.id}`)}>
              <AppCard style={{ padding: 14, gap: 6 }}>
                <ThemedText type="defaultSemiBold">
                  {b.name} {b.isVerified ? '✓' : ''}
                </ThemedText>
                <ThemedText style={{ opacity: 0.75 }}>
                  {b.type.toUpperCase()} • {b.status.toUpperCase()} • {b.branches.length} branch(es)
                </ThemedText>
                {b.trialEndsAt ? (
                  <ThemedText style={{ opacity: 0.75 }}>Trial ends: {String(b.trialEndsAt).slice(0, 10)}</ThemedText>
                ) : null}
              </AppCard>
            </Pressable>
          ))}
          {items.length === 0 && !busy ? (
            <ThemedText style={{ opacity: 0.75 }}>
              No businesses yet. Claim an existing listing or submit a missing business for
              review.
            </ThemedText>
          ) : null}
        </ThemedView>

        <ThemedButton title={busy ? 'Refreshing...' : 'Refresh'} variant="secondary" onPress={load} disabled={busy} />
      </ThemedView>
    </ParallaxScrollView>
  );
}
