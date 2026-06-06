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

  const [editingBusiness, setEditingBusiness] = useState(false);
  const [editBusinessName, setEditBusinessName] = useState('');
  const [editBusinessDescription, setEditBusinessDescription] = useState('');
  const [editBusinessPhone, setEditBusinessPhone] = useState('');
  const [editBusinessWhatsapp, setEditBusinessWhatsapp] = useState('');
  const [editBusinessWebsite, setEditBusinessWebsite] = useState('');

  const [addingBranch, setAddingBranch] = useState(false);
  const [branchCity, setBranchCity] = useState('');
  const [branchAddress, setBranchAddress] = useState('');

  const [editingBranch, setEditingBranch] = useState(false);
  const [editBranchCity, setEditBranchCity] = useState('');
  const [editBranchAddress, setEditBranchAddress] = useState('');
  const [editBranchLat, setEditBranchLat] = useState('');
  const [editBranchLng, setEditBranchLng] = useState('');
  const [editBranchTimeZone, setEditBranchTimeZone] = useState('');
  const [editBranchHoursJson, setEditBranchHoursJson] = useState('');
  const [editBranchIsActive, setEditBranchIsActive] = useState(true);
  const [hoursMode, setHoursMode] = useState<'form' | 'raw'>('form');
  const [hoursForm, setHoursForm] = useState<
    Record<
      'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun',
      { enabled: boolean; start: string; end: string }
    >
  >({
    mon: { enabled: true, start: '09:00', end: '21:00' },
    tue: { enabled: true, start: '09:00', end: '21:00' },
    wed: { enabled: true, start: '09:00', end: '21:00' },
    thu: { enabled: true, start: '09:00', end: '21:00' },
    fri: { enabled: true, start: '14:00', end: '21:00' },
    sat: { enabled: true, start: '09:00', end: '21:00' },
    sun: { enabled: true, start: '09:00', end: '21:00' },
  });

  const [addingOffer, setAddingOffer] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
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

  const hoursDays: Array<{ key: keyof typeof hoursForm; label: string }> = [
    { key: 'mon', label: 'Mon' },
    { key: 'tue', label: 'Tue' },
    { key: 'wed', label: 'Wed' },
    { key: 'thu', label: 'Thu' },
    { key: 'fri', label: 'Fri' },
    { key: 'sat', label: 'Sat' },
    { key: 'sun', label: 'Sun' },
  ];

  const formatTimestamp = (value: string | null | undefined) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  };

  const buildHoursJsonFromForm = () => {
    const weekly: Record<string, Array<{ start: string; end: string }>> = {};
    for (const d of hoursDays) {
      const v = hoursForm[d.key];
      if (v.enabled && v.start.trim() && v.end.trim()) {
        weekly[d.key] = [{ start: v.start.trim(), end: v.end.trim() }];
      } else {
        weekly[d.key] = [];
      }
    }
    return JSON.stringify({ weekly });
  };

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

      if (found && !editingBusiness) {
        setEditBusinessName(found.name ?? '');
        setEditBusinessDescription(found.description ?? '');
        setEditBusinessPhone(found.phone ?? '');
        setEditBusinessWhatsapp(found.whatsapp ?? '');
        setEditBusinessWebsite(found.website ?? '');
      }
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
      const res =
        business?.type === 'umrah'
          ? ((await apiClient.listUmrahLeads(businessId)) as any)
          : ((await apiClient.listBusinessLeads(businessId)) as any);
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

  useEffect(() => {
    if (!selectedBranch) return;
    setEditBranchCity(selectedBranch.city ?? '');
    setEditBranchAddress(selectedBranch.address ?? '');
    setEditBranchLat(
      typeof selectedBranch.lat === 'number' ? String(selectedBranch.lat) : '',
    );
    setEditBranchLng(
      typeof selectedBranch.lng === 'number' ? String(selectedBranch.lng) : '',
    );
    setEditBranchTimeZone(selectedBranch.timeZone ?? '');
    setEditBranchHoursJson(selectedBranch.hoursJson ?? '');
    setEditBranchIsActive(!!selectedBranch.isActive);

    let parsed: any = null;
    try {
      parsed = selectedBranch.hoursJson ? JSON.parse(selectedBranch.hoursJson) : null;
    } catch {
      parsed = null;
    }
    const weekly = parsed?.weekly ?? parsed;
    if (weekly && typeof weekly === 'object') {
      setHoursForm((prev) => {
        const next = { ...prev };
        for (const d of hoursDays) {
          const intervals = weekly?.[d.key];
          if (Array.isArray(intervals) && intervals.length > 0) {
            const first = intervals[0];
            const start = typeof first?.start === 'string' ? first.start : '';
            const end = typeof first?.end === 'string' ? first.end : '';
            next[d.key] = { enabled: true, start, end };
          } else {
            next[d.key] = { ...next[d.key], enabled: false };
          }
        }
        return next;
      });
    }
  }, [selectedBranch?.id]);

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
      if (editingOfferId) {
        await apiClient.updateOffer(editingOfferId, {
          rate: offerRate.trim(),
          minAmount: offerMin.trim() ? offerMin.trim() : undefined,
          maxAmount: offerMax.trim() ? offerMax.trim() : undefined,
          feeNote: offerFeeNote.trim() ? offerFeeNote.trim() : undefined,
        });
      } else {
        await apiClient.upsertBranchOffer(selectedBranchId, {
          fromCurrency: offerFrom.trim().toUpperCase(),
          toCurrency: offerTo.trim().toUpperCase(),
          direction: offerDirection,
          rate: offerRate.trim(),
          minAmount: offerMin.trim() ? offerMin.trim() : undefined,
          maxAmount: offerMax.trim() ? offerMax.trim() : undefined,
          feeNote: offerFeeNote.trim() ? offerFeeNote.trim() : undefined,
        });
      }
      setAddingOffer(false);
      setEditingOfferId(null);
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

  const handleEditOffer = (offer: Offer) => {
    setAddingOffer(true);
    setEditingOfferId(offer.id);
    setOfferFrom(offer.fromCurrency);
    setOfferTo(offer.toCurrency);
    setOfferDirection(offer.direction);
    setOfferRate(String(offer.rate ?? ''));
    setOfferMin(offer.minAmount ? String(offer.minAmount) : '');
    setOfferMax(offer.maxAmount ? String(offer.maxAmount) : '');
    setOfferFeeNote(offer.feeNote ? String(offer.feeNote) : '');
  };

  const resetOfferForm = () => {
    setAddingOffer(false);
    setEditingOfferId(null);
    setOfferRate('');
    setOfferMin('');
    setOfferMax('');
    setOfferFeeNote('');
  };

  const handleSaveBusiness = async () => {
    if (!businessId) return;
    if (editBusinessName.trim().length < 2) {
      Alert.alert('Invalid name', 'Business name is required');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiClient.updateBusiness(businessId, {
        name: editBusinessName.trim(),
        description: editBusinessDescription.trim()
          ? editBusinessDescription.trim()
          : '',
        phone: editBusinessPhone.trim() ? editBusinessPhone.trim() : '',
        whatsapp: editBusinessWhatsapp.trim() ? editBusinessWhatsapp.trim() : '',
        website: editBusinessWebsite.trim() ? editBusinessWebsite.trim() : '',
      });
      setEditingBusiness(false);
      await loadBusiness();
      Alert.alert('Saved', 'Business updated (may require re-approval)');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveBranch = async () => {
    if (!selectedBranchId) return;
    if (editBranchCity.trim().length < 2 || editBranchAddress.trim().length < 2) {
      Alert.alert('Missing info', 'Branch city and address are required');
      return;
    }

    const parsedLat =
      editBranchLat.trim().length === 0 ? undefined : Number(editBranchLat.trim());
    const parsedLng =
      editBranchLng.trim().length === 0 ? undefined : Number(editBranchLng.trim());
    if (parsedLat !== undefined && !Number.isFinite(parsedLat)) {
      Alert.alert('Invalid latitude', 'Latitude must be a number');
      return;
    }
    if (parsedLng !== undefined && !Number.isFinite(parsedLng)) {
      Alert.alert('Invalid longitude', 'Longitude must be a number');
      return;
    }

    const hoursJsonToSave =
      hoursMode === 'form'
        ? buildHoursJsonFromForm()
        : editBranchHoursJson.trim()
          ? editBranchHoursJson.trim()
          : '';

    if (hoursJsonToSave.trim()) {
      try {
        JSON.parse(hoursJsonToSave.trim());
      } catch {
        Alert.alert('Invalid hours JSON', 'hoursJson must be valid JSON');
        return;
      }
    }

    setBusy(true);
    setError(null);
    try {
      await apiClient.updateBranch(selectedBranchId, {
        city: editBranchCity.trim(),
        address: editBranchAddress.trim(),
        lat: parsedLat,
        lng: parsedLng,
        timeZone: editBranchTimeZone.trim() ? editBranchTimeZone.trim() : '',
        hoursJson: hoursJsonToSave.trim() ? hoursJsonToSave.trim() : '',
        isActive: editBranchIsActive,
      });
      setEditingBranch(false);
      await loadBusiness();
      Alert.alert('Saved', 'Branch updated');
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
              onPress={() => {
                if (addingOffer) {
                  resetOfferForm();
                } else {
                  setAddingOffer(true);
                }
              }}
              fullWidth
            />

            {addingOffer ? (
              <ThemedView style={{ gap: 10 }}>
                {editingOfferId ? (
                  <ThemedText style={{ opacity: 0.75 }}>
                    Editing: {offerFrom} → {offerTo} ({offerDirection})
                  </ThemedText>
                ) : (
                  <>
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
                  </>
                )}
                <ThemedInput placeholder="Rate" keyboardType="numeric" value={offerRate} onChangeText={setOfferRate} />
                <ThemedInput placeholder="Min amount (optional)" keyboardType="numeric" value={offerMin} onChangeText={setOfferMin} />
                <ThemedInput placeholder="Max amount (optional)" keyboardType="numeric" value={offerMax} onChangeText={setOfferMax} />
                <ThemedInput placeholder="Fee note (optional)" value={offerFeeNote} onChangeText={setOfferFeeNote} />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <ThemedButton
                    title={busy ? 'Saving...' : editingOfferId ? 'Update Offer' : 'Save Offer'}
                    onPress={handleUpsertOffer}
                    disabled={busy || !selectedBranchId}
                    style={{ flex: 1 }}
                  />
                  {editingOfferId ? (
                    <ThemedButton
                      title="Clear"
                      variant="secondary"
                      onPress={resetOfferForm}
                      disabled={busy}
                      style={{ flex: 1 }}
                    />
                  ) : null}
                </View>
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
                  <ThemedText style={{ opacity: 0.65 }}>
                    Updated: {formatTimestamp(o.updatedAt)}
                  </ThemedText>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <ThemedButton title="Edit" variant="secondary" onPress={() => handleEditOffer(o)} disabled={busy} />
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
              {business?.type === 'umrah'
                ? leads.map((l: any) => (
                    <AppCard key={String(l.id)} variant="soft" style={{ padding: 12, gap: 6 }}>
                      <ThemedText type="defaultSemiBold">
                        {l?.user?.fullName ?? l?.fullName ?? 'User'}
                      </ThemedText>
                      <ThemedText style={{ opacity: 0.75 }}>
                        {String(l?.user?.phoneNumber ?? l?.phoneNumber ?? '')}
                      </ThemedText>
                      {l?.message ? (
                        <ThemedText style={{ opacity: 0.8 }}>{String(l.message)}</ThemedText>
                      ) : null}
                      {l?.createdAt ? (
                        <ThemedText style={{ opacity: 0.65 }}>{formatTimestamp(String(l.createdAt))}</ThemedText>
                      ) : null}
                    </AppCard>
                  ))
                : leads.map((l: any) => (
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
                        <ThemedText style={{ opacity: 0.65 }}>{formatTimestamp(String(l.createdAt))}</ThemedText>
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
            <ThemedButton
              title={editingBusiness ? 'Cancel Edit' : 'Edit Business'}
              variant="secondary"
              onPress={() => setEditingBusiness((v) => !v)}
              disabled={busy}
            />
            {editingBusiness ? (
              <ThemedView style={{ gap: 10 }}>
                <ThemedInput placeholder="Business name" value={editBusinessName} onChangeText={setEditBusinessName} />
                <ThemedInput
                  placeholder="Description"
                  value={editBusinessDescription}
                  onChangeText={setEditBusinessDescription}
                  multiline
                />
                <ThemedInput placeholder="Phone" value={editBusinessPhone} onChangeText={setEditBusinessPhone} keyboardType="phone-pad" />
                <ThemedInput placeholder="WhatsApp" value={editBusinessWhatsapp} onChangeText={setEditBusinessWhatsapp} keyboardType="phone-pad" />
                <ThemedInput placeholder="Website" value={editBusinessWebsite} onChangeText={setEditBusinessWebsite} />
                <ThemedButton title={busy ? 'Saving...' : 'Save Business'} onPress={handleSaveBusiness} disabled={busy} />
              </ThemedView>
            ) : null}

            <ThemedButton
              title={editingBranch ? 'Cancel Branch Edit' : 'Edit Selected Branch'}
              variant="secondary"
              onPress={() => setEditingBranch((v) => !v)}
              disabled={busy || !selectedBranch}
            />
            {editingBranch && selectedBranch ? (
              <ThemedView style={{ gap: 10 }}>
                <ThemedText style={{ opacity: 0.75 }}>
                  Selected: {selectedBranch.city} • {selectedBranch.address}
                </ThemedText>
                <ThemedInput placeholder="City" value={editBranchCity} onChangeText={setEditBranchCity} />
                <ThemedInput placeholder="Address" value={editBranchAddress} onChangeText={setEditBranchAddress} />
                <ThemedInput placeholder="Latitude (optional)" value={editBranchLat} onChangeText={setEditBranchLat} keyboardType="numeric" />
                <ThemedInput placeholder="Longitude (optional)" value={editBranchLng} onChangeText={setEditBranchLng} keyboardType="numeric" />
                <ThemedInput placeholder="Time zone (e.g. Asia/Dubai)" value={editBranchTimeZone} onChangeText={setEditBranchTimeZone} />
                <SegmentedControl
                  value={hoursMode}
                  options={[
                    { value: 'form', label: 'Hours Form' },
                    { value: 'raw', label: 'Raw JSON' },
                  ]}
                  onChange={(v) => setHoursMode(v as any)}
                />
                {hoursMode === 'form' ? (
                  <ThemedView style={{ gap: 8 }}>
                    {hoursDays.map((d) => {
                      const v = hoursForm[d.key];
                      return (
                        <AppCard key={d.key} variant="soft" style={{ padding: 10, gap: 8 }}>
                          <ThemedText type="defaultSemiBold">{d.label}</ThemedText>
                          <View style={{ flexDirection: 'row', gap: 10 }}>
                            <ThemedButton
                              title={v.enabled ? 'Open' : 'Closed'}
                              variant="secondary"
                              onPress={() =>
                                setHoursForm((prev) => ({
                                  ...prev,
                                  [d.key]: { ...prev[d.key], enabled: !prev[d.key].enabled },
                                }))
                              }
                              disabled={busy}
                              style={{ flex: 1 }}
                            />
                            <ThemedInput
                              placeholder="Start (HH:MM)"
                              value={v.start}
                              onChangeText={(t) =>
                                setHoursForm((prev) => ({
                                  ...prev,
                                  [d.key]: { ...prev[d.key], start: t },
                                }))
                              }
                              editable={v.enabled}
                              style={{ flex: 1 }}
                            />
                            <ThemedInput
                              placeholder="End (HH:MM)"
                              value={v.end}
                              onChangeText={(t) =>
                                setHoursForm((prev) => ({
                                  ...prev,
                                  [d.key]: { ...prev[d.key], end: t },
                                }))
                              }
                              editable={v.enabled}
                              style={{ flex: 1 }}
                            />
                          </View>
                        </AppCard>
                      );
                    })}
                    <ThemedButton
                      title="Copy as JSON"
                      variant="secondary"
                      onPress={() => {
                        const json = buildHoursJsonFromForm();
                        setEditBranchHoursJson(json);
                        setHoursMode('raw');
                      }}
                      disabled={busy}
                    />
                  </ThemedView>
                ) : (
                  <ThemedInput
                    placeholder='Hours JSON (optional). Example: {"weekly":{"mon":[{"start":"09:00","end":"21:00"}]}}'
                    value={editBranchHoursJson}
                    onChangeText={setEditBranchHoursJson}
                    multiline
                  />
                )}
                <ThemedButton
                  title={editBranchIsActive ? 'Branch Active: ON' : 'Branch Active: OFF'}
                  variant="secondary"
                  onPress={() => setEditBranchIsActive((v) => !v)}
                  disabled={busy}
                />
                <ThemedButton title={busy ? 'Saving...' : 'Save Branch'} onPress={handleSaveBranch} disabled={busy} />
              </ThemedView>
            ) : null}

            <ThemedButton title="Refresh Business" variant="secondary" onPress={loadBusiness} disabled={busy} />
          </AppCard>
        ) : null}

        <ThemedButton title="Back" variant="secondary" onPress={() => router.back()} />
      </ThemedView>
    </ParallaxScrollView>
  );
}
