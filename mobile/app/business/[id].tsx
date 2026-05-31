import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { apiClient, type MyBusiness } from '@/api/client';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedButton } from '@/components/themed-button';
import { ThemedInput } from '@/components/themed-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppCard } from '@/components/ui/app-card';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { CurrencySelector } from '@/components/currency-selector';

type Offer = {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  direction: 'buy' | 'sell';
  rate: string;
  minAmount?: string | null;
  maxAmount?: string | null;
  feeNote?: string | null;
  updatedAt: string;
};

export default function BusinessDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const businessId = Array.isArray(id) ? id[0] : id;

  const [business, setBusiness] = useState<MyBusiness | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [leads, setLeads] = useState<any[]>([]);

  const [tab, setTab] = useState<'offers' | 'leads' | 'settings'>('offers');

  const [addingBranch, setAddingBranch] = useState(false);
  const [branchCity, setBranchCity] = useState('');
  const [branchAddress, setBranchAddress] = useState('');

  const [addingOffer, setAddingOffer] = useState(false);
  const [offerFrom, setOfferFrom] = useState('SAR');
  const [offerTo, setOfferTo] = useState('INR');
  const [offerDirection, setOfferDirection] = useState<'buy' | 'sell'>('sell');
  const [offerRate, setOfferRate] = useState('');
  const [offerMin, setOfferMin] = useState('');
  const [offerMax, setOfferMax] = useState('');
  const [offerFeeNote, setOfferFeeNote] = useState('');

  const selectedBranch = useMemo(() => {
    if (!business) return null;
    if (selectedBranchId) {
      return business.branches.find((b) => b.id === selectedBranchId) ?? null;
    }
    return business.branches[0] ?? null;
  }, [business, selectedBranchId]);

  const loadBusiness = async () => {
    if (!businessId) return;
    setBusy(true);
    setError(null);
    try {
      const mine = await apiClient.listMyBusinesses();
      const found = mine.find((b) => b.id === businessId) ?? null;
      setBusiness(found);
      const firstBranch = found?.branches?.[0]?.id ?? null;
      setSelectedBranchId((prev) => prev ?? firstBranch);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const loadOffers = async () => {
    if (!businessId || !selectedBranchId) return;
    try {
      const res = (await apiClient.listExchangeOffers(businessId, selectedBranchId)) as any;
      const branch = (res?.branches ?? []).find((b: any) => b.id === selectedBranchId);
      setOffers((branch?.offers ?? []) as Offer[]);
    } catch {
      setOffers([]);
    }
  };

  const loadLeads = async () => {
    if (!businessId) return;
    try {
      const res = (await apiClient.listBusinessLeads(businessId)) as any;
      setLeads(Array.isArray(res) ? res : []);
    } catch {
      setLeads([]);
    }
  };

  useEffect(() => {
    if (!apiClient.getAccessToken()) {
      router.replace('/');
      return;
    }
    void loadBusiness();
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    if (tab === 'offers') {
      void loadOffers();
    } else if (tab === 'leads') {
      void loadLeads();
    }
  }, [businessId, selectedBranchId, tab]);

  const handleAddBranch = async () => {
    if (!businessId) return;
    if (branchCity.trim().length < 2 || branchAddress.trim().length < 2) {
      Alert.alert('Missing info', 'Enter branch city and address');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = (await apiClient.createBusinessBranch(businessId, {
        city: branchCity.trim(),
        address: branchAddress.trim(),
      })) as any;
      setAddingBranch(false);
      setBranchCity('');
      setBranchAddress('');
      await loadBusiness();
      setSelectedBranchId(String(created?.id ?? selectedBranchId));
      await loadOffers();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleUpsertOffer = async () => {
    if (!selectedBranchId) return;
    if (!offerRate.trim()) {
      Alert.alert('Missing rate', 'Enter a rate');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiClient.upsertBranchOffer(selectedBranchId, {
        fromCurrency: offerFrom.trim().toUpperCase(),
        toCurrency: offerTo.trim().toUpperCase(),
        direction: offerDirection,
        rate: offerRate.trim(),
        minAmount: offerMin.trim() ? offerMin.trim() : undefined,
        maxAmount: offerMax.trim() ? offerMax.trim() : undefined,
        feeNote: offerFeeNote.trim() ? offerFeeNote.trim() : undefined,
      });
      setAddingOffer(false);
      setOfferRate('');
      setOfferMin('');
      setOfferMax('');
      setOfferFeeNote('');
      await loadOffers();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    Alert.alert('Delete offer', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          setError(null);
          try {
            await apiClient.deleteOffer(offerId);
            await loadOffers();
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  if (!business) {
    return (
      <ParallaxScrollView headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }} headerImage={null}>
        <ThemedView style={{ gap: 12 }}>
          <ThemedText type="title">Business</ThemedText>
          {error ? <ThemedText style={{ color: 'red' }}>{error}</ThemedText> : null}
          <ThemedButton title={busy ? 'Loading...' : 'Retry'} onPress={loadBusiness} disabled={busy} />
          <ThemedButton title="Back" variant="secondary" onPress={() => router.back()} />
        </ThemedView>
      </ParallaxScrollView>
    );
  }

  return (
    <ParallaxScrollView headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }} headerImage={null}>
      <ThemedView style={{ gap: 12 }}>
        <ThemedText type="title">
          {business.name} {business.isVerified ? '✓' : ''}
        </ThemedText>
        <ThemedText style={{ opacity: 0.75 }}>
          {business.type.toUpperCase()} • {business.status.toUpperCase()}
        </ThemedText>

        <SegmentedControl
          value={tab}
          options={[
            { value: 'offers', label: 'Offers' },
            { value: 'leads', label: 'Leads' },
            { value: 'settings', label: 'Settings' },
          ]}
          onChange={(v) => setTab(v as any)}
        />

        {error ? <ThemedText style={{ color: 'red' }}>{error}</ThemedText> : null}

        <AppCard style={{ padding: 14, gap: 10 }}>
          <ThemedText type="defaultSemiBold">Branches</ThemedText>
          <ThemedView style={{ gap: 8 }}>
            {business.branches.map((br) => (
              <Pressable key={br.id} onPress={() => setSelectedBranchId(br.id)}>
                <ThemedView style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                  <ThemedText type="defaultSemiBold">
                    {br.city} • {br.address}
                  </ThemedText>
                  <ThemedText style={{ opacity: 0.7 }}>
                    {selectedBranchId === br.id ? 'Selected' : ''}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            ))}
          </ThemedView>

          <ThemedButton
            title={addingBranch ? 'Cancel' : 'Add Branch'}
            variant="secondary"
            onPress={() => setAddingBranch((v) => !v)}
          />
          {addingBranch ? (
            <ThemedView style={{ gap: 10 }}>
              <ThemedInput placeholder="Branch city" value={branchCity} onChangeText={setBranchCity} />
              <ThemedInput placeholder="Branch address" value={branchAddress} onChangeText={setBranchAddress} />
              <ThemedButton title={busy ? 'Saving...' : 'Save Branch'} onPress={handleAddBranch} disabled={busy} />
            </ThemedView>
          ) : null}
        </AppCard>

        {tab === 'offers' ? (
          <AppCard style={{ padding: 14, gap: 10 }}>
            <ThemedText type="defaultSemiBold">Offers</ThemedText>
            <ThemedText style={{ opacity: 0.75 }}>
              Branch: {selectedBranch ? `${selectedBranch.city} • ${selectedBranch.address}` : '—'}
            </ThemedText>

            <ThemedButton
              title={addingOffer ? 'Cancel' : 'Add / Update Offer'}
              onPress={() => setAddingOffer((v) => !v)}
              fullWidth
            />

            {addingOffer ? (
              <ThemedView style={{ gap: 10 }}>
                <CurrencySelector placeholder="From" value={offerFrom} onChange={setOfferFrom} />
                <CurrencySelector placeholder="To" value={offerTo} onChange={setOfferTo} />
                <SegmentedControl
                  value={offerDirection}
                  options={[
                    { value: 'buy', label: 'Buy' },
                    { value: 'sell', label: 'Sell' },
                  ]}
                  onChange={(v) => setOfferDirection(v as any)}
                />
                <ThemedInput placeholder="Rate" keyboardType="numeric" value={offerRate} onChangeText={setOfferRate} />
                <ThemedInput placeholder="Min amount (optional)" keyboardType="numeric" value={offerMin} onChangeText={setOfferMin} />
                <ThemedInput placeholder="Max amount (optional)" keyboardType="numeric" value={offerMax} onChangeText={setOfferMax} />
                <ThemedInput placeholder="Fee note (optional)" value={offerFeeNote} onChangeText={setOfferFeeNote} />
                <ThemedButton title={busy ? 'Saving...' : 'Save Offer'} onPress={handleUpsertOffer} disabled={busy || !selectedBranchId} />
              </ThemedView>
            ) : null}

            <ThemedView style={{ gap: 10 }}>
              {offers.map((o) => (
                <AppCard key={o.id} variant="soft" style={{ padding: 12, gap: 8 }}>
                  <ThemedText type="defaultSemiBold">
                    {o.fromCurrency} → {o.toCurrency} ({o.direction})
                  </ThemedText>
                  <ThemedText style={{ opacity: 0.8 }}>
                    Rate: {o.rate}
                    {o.minAmount ? ` • min ${o.minAmount}` : ''}
                    {o.maxAmount ? ` • max ${o.maxAmount}` : ''}
                  </ThemedText>
                  {o.feeNote ? <ThemedText style={{ opacity: 0.75 }}>{o.feeNote}</ThemedText> : null}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <ThemedButton title="Delete" variant="secondary" onPress={() => handleDeleteOffer(o.id)} disabled={busy} />
                  </View>
                </AppCard>
              ))}
              {offers.length === 0 ? (
                <ThemedText style={{ opacity: 0.75 }}>No offers yet.</ThemedText>
              ) : null}
            </ThemedView>

            <ThemedButton title={busy ? 'Refreshing...' : 'Refresh'} variant="secondary" onPress={loadOffers} disabled={busy} />
          </AppCard>
        ) : null}

        {tab === 'leads' ? (
          <AppCard style={{ padding: 14, gap: 10 }}>
            <ThemedText type="defaultSemiBold">Leads</ThemedText>
            <ThemedButton title={busy ? 'Refreshing...' : 'Refresh'} variant="secondary" onPress={loadLeads} disabled={busy} />
            <ThemedView style={{ gap: 10 }}>
              {leads.map((l: any) => (
                <AppCard key={String(l.id)} variant="soft" style={{ padding: 12, gap: 6 }}>
                  <ThemedText type="defaultSemiBold">
                    {l?.user?.fullName ?? 'User'} • {String(l?.channel ?? '').toUpperCase()}
                  </ThemedText>
                  <ThemedText style={{ opacity: 0.75 }}>
                    {String(l?.fromCurrency ?? '')} → {String(l?.toCurrency ?? '')} • {String(l?.amount ?? '')}
                  </ThemedText>
                  <ThemedText style={{ opacity: 0.75 }}>
                    {l?.branch ? `${l.branch.city} • ${l.branch.address}` : ''}
                  </ThemedText>
                  {l?.createdAt ? (
                    <ThemedText style={{ opacity: 0.65 }}>{String(l.createdAt)}</ThemedText>
                  ) : null}
                </AppCard>
              ))}
              {leads.length === 0 ? (
                <ThemedText style={{ opacity: 0.75 }}>No leads yet.</ThemedText>
              ) : null}
            </ThemedView>
          </AppCard>
        ) : null}

        {tab === 'settings' ? (
          <AppCard style={{ padding: 14, gap: 10 }}>
            <ThemedText type="defaultSemiBold">Settings</ThemedText>
            <ThemedText style={{ opacity: 0.75 }}>
              Editing business details triggers re-approval if currently active.
            </ThemedText>
            <ThemedButton title="Refresh Business" variant="secondary" onPress={loadBusiness} disabled={busy} />
          </AppCard>
        ) : null}

        <ThemedButton title="Back" variant="secondary" onPress={() => router.back()} />
      </ThemedView>
    </ParallaxScrollView>
  );
}

