import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import * as Linking from 'expo-linking';

import { apiClient } from '@/api/client';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedButton } from '@/components/themed-button';
import { ThemedInput } from '@/components/themed-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppCard } from '@/components/ui/app-card';

type Branch = {
  id: string;
  city: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  timeZone?: string | null;
  hoursJson?: string | null;
  offers?: Array<{
    id: string;
    fromCurrency: string;
    toCurrency: string;
    direction: 'buy' | 'sell';
    rate: string;
    updatedAt: string;
    isStale?: boolean;
    minAmount?: string | null;
    maxAmount?: string | null;
    feeNote?: string | null;
  }>;
};

type Business = {
  id: string;
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  isVerified: boolean;
  branches: Branch[];
  ratingAvg: number | null;
  reviewCount: number;
};

export default function ExchangeDetailScreen() {
  const { id, fromCurrency, toCurrency, amount } = useLocalSearchParams();
  const businessId = Array.isArray(id) ? id[0] : id;
  const from = (Array.isArray(fromCurrency) ? fromCurrency[0] : fromCurrency) ?? '';
  const to = (Array.isArray(toCurrency) ? toCurrency[0] : toCurrency) ?? '';
  const amt = (Array.isArray(amount) ? amount[0] : amount) ?? '';

  const navigation = useNavigation();

  const [business, setBusiness] = useState<Business | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const [confirming, setConfirming] = useState(false);
  const [confirmAmount, setConfirmAmount] = useState(amt);
  const [confirmRateObserved, setConfirmRateObserved] = useState('');
  const [confirmationId, setConfirmationId] = useState<string | null>(null);

  const [reviewing, setReviewing] = useState(false);
  const [rateFairnessScore, setRateFairnessScore] = useState('5');
  const [serviceScore, setServiceScore] = useState('5');
  const [speedScore, setSpeedScore] = useState('5');
  const [comment, setComment] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');

  const selectedBranch = useMemo(() => {
    if (!business) return null;
    if (selectedBranchId) {
      return business.branches.find((b) => b.id === selectedBranchId) ?? null;
    }
    return business.branches[0] ?? null;
  }, [business, selectedBranchId]);

  const load = async () => {
    if (!businessId) return;
    setBusy(true);
    setError(null);
    try {
      const res = (await apiClient.getExchange(String(businessId))) as any;
      setBusiness(res as Business);
      navigation.setOptions({ title: res?.name ?? 'Exchange' });
      const firstBranchId = res?.branches?.[0]?.id;
      setSelectedBranchId(firstBranchId ?? null);

      try {
        const favs = await apiClient.listFavoriteExchanges();
        setIsFavorite(Array.isArray(favs) && favs.some((f) => f.id === String(businessId)));
      } catch {
        setIsFavorite(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load();
  }, [businessId]);

  const recordLead = async (channel: 'call' | 'whatsapp' | 'directions' | 'share' | 'other') => {
    if (!selectedBranch?.id) return;
    if (!from || !to || !confirmAmount) return;
    try {
      await apiClient.createExchangeLead(selectedBranch.id, {
        fromCurrency: String(from).toUpperCase(),
        toCurrency: String(to).toUpperCase(),
        amount: String(confirmAmount),
        channel,
      });
    } catch {
    }
  };

  const openPhone = async () => {
    if (!business?.phone) {
      Alert.alert('No phone number available');
      return;
    }
    await recordLead('call');
    await Linking.openURL(`tel:${business.phone}`);
  };

  const openWhatsApp = async () => {
    if (!business?.whatsapp) {
      Alert.alert('No WhatsApp number available');
      return;
    }
    await recordLead('whatsapp');
    const digits = business.whatsapp.replace(/[^\d+]/g, '');
    await Linking.openURL(`https://wa.me/${digits.replace(/^\+/, '')}`);
  };

  const openDirections = async () => {
    if (typeof selectedBranch?.lat !== 'number' || typeof selectedBranch?.lng !== 'number') {
      Alert.alert('Location not available');
      return;
    }
    await recordLead('directions');
    const label = encodeURIComponent(business?.name ?? 'Exchange');
    const url = `https://www.google.com/maps/search/?api=1&query=${selectedBranch.lat},${selectedBranch.lng}&query_place_id=${label}`;
    await Linking.openURL(url);
  };

  const submitConfirmation = async () => {
    if (!selectedBranch?.id) return;
    setBusy(true);
    setError(null);
    try {
      const res = (await apiClient.createExchangeConfirmation(selectedBranch.id, {
        fromCurrency: String(from).toUpperCase(),
        toCurrency: String(to).toUpperCase(),
        amount: String(confirmAmount),
        rateObserved: confirmRateObserved.trim() ? confirmRateObserved.trim() : undefined,
      })) as any;
      const cid = res?.id ? String(res.id) : null;
      setConfirmationId(cid);
      setConfirming(false);
      setReviewing(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const submitReview = async () => {
    if (!business?.id || !confirmationId) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient.createBusinessReview(business.id, {
        confirmationId,
        rateFairnessScore: Number(rateFairnessScore),
        serviceScore: Number(serviceScore),
        speedScore: Number(speedScore),
        comment: comment.trim() ? comment.trim() : undefined,
      });
      setReviewing(false);
      Alert.alert('Thank you', 'Review submitted');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const toggleFavorite = async () => {
    if (!businessId) return;
    setFavoriteBusy(true);
    try {
      if (isFavorite) {
        await apiClient.removeFavoriteExchange(String(businessId));
        setIsFavorite(false);
      } else {
        await apiClient.addFavoriteExchange(String(businessId));
        setIsFavorite(true);
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setFavoriteBusy(false);
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

  return (
    <ParallaxScrollView headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }} headerImage={null}>
      {busy && !business ? (
        <ThemedText>Loading...</ThemedText>
      ) : error ? (
        <ThemedText style={{ color: 'red' }}>{error}</ThemedText>
      ) : business ? (
        <ThemedView style={{ gap: 12 }}>
          <ThemedText type="title">
            {business.name} {business.isVerified ? '✓' : ''}
          </ThemedText>
          <ThemedText style={{ opacity: 0.75 }}>
            {typeof business.ratingAvg === 'number'
              ? `Rating: ${business.ratingAvg.toFixed(1)} (${business.reviewCount})`
              : `Rating: — (${business.reviewCount})`}
          </ThemedText>

          <AppCard style={styles.card}>
            <ThemedText type="defaultSemiBold">Contact</ThemedText>
            <View style={styles.actionsRow}>
              <ThemedButton title="Call" variant="secondary" onPress={openPhone} />
              <ThemedButton title="WhatsApp" variant="secondary" onPress={openWhatsApp} />
              <ThemedButton title="Directions" variant="secondary" onPress={openDirections} />
            </View>
            <View style={{ marginTop: 10 }}>
              <ThemedButton
                title={
                  favoriteBusy
                    ? 'Saving...'
                    : isFavorite
                      ? 'Remove Favorite'
                      : 'Add to Favorites'
                }
                variant="secondary"
                onPress={toggleFavorite}
                disabled={favoriteBusy}
                fullWidth
              />
            </View>
          </AppCard>

          <AppCard style={styles.card}>
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
              <View style={{ marginTop: 10, gap: 10 }}>
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

          <AppCard style={styles.card}>
            <ThemedText type="defaultSemiBold">Branches</ThemedText>
            <ThemedView style={{ gap: 10 }}>
              {business.branches.map((br) => (
                <Pressable key={br.id} onPress={() => setSelectedBranchId(br.id)}>
                  <ThemedView style={styles.branchRow}>
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
          </AppCard>

          <AppCard style={styles.card}>
            <ThemedText type="defaultSemiBold">Offers</ThemedText>
            {selectedBranch?.offers?.length ? (
              <ThemedView style={{ gap: 8 }}>
                {selectedBranch.offers.map((o) => (
                  <ThemedView key={o.id} style={{ gap: 4 }}>
                    <ThemedView style={styles.offerRow}>
                      <ThemedText>
                        {o.fromCurrency} → {o.toCurrency} ({o.direction})
                      </ThemedText>
                      <ThemedText type="defaultSemiBold">{o.rate}</ThemedText>
                    </ThemedView>
                    <ThemedText style={{ opacity: 0.65 }}>
                      Updated: {String(o.updatedAt)}
                      {o.isStale ? ' • Stale' : ''}
                    </ThemedText>
                  </ThemedView>
                ))}
              </ThemedView>
            ) : (
              <ThemedText style={{ opacity: 0.75 }}>No offers listed.</ThemedText>
            )}
          </AppCard>

          <AppCard style={styles.card}>
            <ThemedText type="defaultSemiBold">Trust</ThemedText>
            <ThemedButton
              title="I completed an exchange"
              onPress={() => {
                setConfirming((v) => !v);
                setReviewing(false);
              }}
              disabled={busy}
              fullWidth
            />
            {confirming ? (
              <ThemedView style={{ gap: 10, marginTop: 10 }}>
                <ThemedInput
                  placeholder="Amount"
                  keyboardType="numeric"
                  value={confirmAmount}
                  onChangeText={setConfirmAmount}
                />
                <ThemedInput
                  placeholder="Rate observed (optional)"
                  keyboardType="numeric"
                  value={confirmRateObserved}
                  onChangeText={setConfirmRateObserved}
                />
                <ThemedButton title={busy ? 'Submitting...' : 'Confirm'} onPress={submitConfirmation} disabled={busy} />
              </ThemedView>
            ) : null}
            {reviewing && confirmationId ? (
              <ThemedView style={{ gap: 10, marginTop: 10 }}>
                <ThemedText type="defaultSemiBold">Leave a review</ThemedText>
                <ThemedInput
                  placeholder="Rate fairness (1-5)"
                  keyboardType="numeric"
                  value={rateFairnessScore}
                  onChangeText={setRateFairnessScore}
                />
                <ThemedInput
                  placeholder="Service (1-5)"
                  keyboardType="numeric"
                  value={serviceScore}
                  onChangeText={setServiceScore}
                />
                <ThemedInput
                  placeholder="Speed (1-5)"
                  keyboardType="numeric"
                  value={speedScore}
                  onChangeText={setSpeedScore}
                />
                <ThemedInput placeholder="Comment (optional)" value={comment} onChangeText={setComment} />
                <ThemedButton title={busy ? 'Submitting...' : 'Submit review'} onPress={submitReview} disabled={busy} />
              </ThemedView>
            ) : null}
          </AppCard>
        </ThemedView>
      ) : null}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    gap: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  branchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  offerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
});
