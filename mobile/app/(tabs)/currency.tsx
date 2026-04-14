import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Alert, Pressable } from 'react-native';
import { router } from 'expo-router';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedButton } from '@/components/themed-button';
import { ThemedInput } from '@/components/themed-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CitySelector } from '@/components/city-selector';
import { CurrencySelector } from '@/components/currency-selector';
import { apiClient } from '@/api/client';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, UI } from '@/constants/theme';
import { AppCard } from '@/components/ui/app-card';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { IconSymbol } from '@/components/ui/icon-symbol';

import { RatingModal, RatingData } from '@/components/rating-modal';
import { DisputeModal } from '@/components/dispute-modal';

type CurrencyPost = {
  id: string;
  haveCurrency: string;
  needCurrency: string;
  amount: number;
  preferredRate: number;
  city: string;
  userId: string;
  status: string;
  user?: { id: string; fullName: string; verificationLevel: number };
  ratingAvg?: number | null;
  ratingCount?: number;
  tradeCount?: number;
};

type MatchRequest = {
  id: string;
  currencyPostId: string;
  requesterId: string;
  targetUserId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed' | 'disputed';
  createdAt: string;
};

export default function CurrencyScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const formBackgroundColor = isDark ? '#1E1E1E' : '#f9f9f9';
  const badgeBackgroundColor = isDark ? '#3A3A3C' : '#ddd';
  const [viewMode, setViewMode] = useState<'posts' | 'requests'>('posts');
  const [posts, setPosts] = useState<CurrencyPost[]>([]);
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);
  
  const [creating, setCreating] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [haveCurrency, setHaveCurrency] = useState('');
  const [needCurrency, setNeedCurrency] = useState('');
  const [amount, setAmount] = useState('');
  const [preferredRate, setPreferredRate] = useState('');
  const [city, setCity] = useState('');
  const [note, setNote] = useState('');

  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filterMineOnly, setFilterMineOnly] = useState(false);
  const [filterHaveCurrency, setFilterHaveCurrency] = useState('');
  const [filterNeedCurrency, setFilterNeedCurrency] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterPostStatus, setFilterPostStatus] = useState('');
  const [filterRequestStatus, setFilterRequestStatus] = useState('');
  const [filterIncoming, setFilterIncoming] = useState(true);
  const [filterOutgoing, setFilterOutgoing] = useState(true);
  
  const [creatingBusy, setCreatingBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedMatchForRating, setSelectedMatchForRating] = useState<MatchRequest | null>(null);
  const [ratingBusy, setRatingBusy] = useState(false);

  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [selectedMatchForDispute, setSelectedMatchForDispute] = useState<MatchRequest | null>(null);
  const [disputeBusy, setDisputeBusy] = useState(false);

  const rateCacheRef = useRef(
    new Map<
      string,
      { rate: number; fetchedAtMs: number; updatedAtIso?: string | null }
    >(),
  );
  const rateRequestRef = useRef(0);

  const [marketRate, setMarketRate] = useState<number | null>(null);
  const [marketRateUpdatedAt, setMarketRateUpdatedAt] = useState<string | null>(
    null,
  );
  const [marketRateLoading, setMarketRateLoading] = useState(false);
  const [marketRateError, setMarketRateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      // 1. Get Me (for ID) if not set
      if (!myUserId) {
        const me = await apiClient.getMe();
        if ((me as any).id) {
          setMyUserId((me as any).id);
        }
      }

      // 2. Load Posts
      const result = await apiClient.listCurrencyPosts();
      const items = (result as any).items ?? [];
      setPosts(items);

      // 3. Load Requests
      const reqResult = await apiClient.listMatchRequests('all');
      setRequests((reqResult as any) ?? []);

      setLoadedOnce(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [myUserId]);

  const formatRate = (value: number) => {
    if (!Number.isFinite(value)) return '—';
    if (value === 0) return '0';
    if (value >= 100) return value.toFixed(2);
    if (value >= 10) return value.toFixed(3);
    if (value >= 1) return value.toFixed(4);
    return value.toFixed(6);
  };

  const fetchMarketRate = useCallback(async (from: string, to: string) => {
    const fromCur = from.trim().toUpperCase();
    const toCur = to.trim().toUpperCase();
    if (!fromCur || !toCur) {
      setMarketRate(null);
      setMarketRateUpdatedAt(null);
      setMarketRateError(null);
      return;
    }
    if (fromCur === toCur) {
      setMarketRate(1);
      setMarketRateUpdatedAt(null);
      setMarketRateError(null);
      return;
    }

    const cacheKey = `${fromCur}->${toCur}`;
    const cached = rateCacheRef.current.get(cacheKey);
    const now = Date.now();
    const cacheTtlMs = 30 * 60 * 1000;
    if (cached && now - cached.fetchedAtMs < cacheTtlMs) {
      setMarketRate(cached.rate);
      setMarketRateUpdatedAt(cached.updatedAtIso ?? null);
      setMarketRateError(null);
      return;
    }

    const requestId = ++rateRequestRef.current;
    setMarketRateLoading(true);
    setMarketRateError(null);
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${fromCur}`);
      if (!res.ok) {
        throw new Error(`Rate request failed (${res.status})`);
      }
      const json = (await res.json()) as any;
      const rates = json?.rates as Record<string, number> | undefined;
      const rate = rates?.[toCur];
      if (!Number.isFinite(rate)) {
        throw new Error('Rate not available');
      }
      if (requestId !== rateRequestRef.current) {
        return;
      }
      const updatedAtIso =
        typeof json?.time_last_update_utc === 'string'
          ? json.time_last_update_utc
          : null;
      rateCacheRef.current.set(cacheKey, {
        rate,
        fetchedAtMs: now,
        updatedAtIso,
      });
      setMarketRate(rate);
      setMarketRateUpdatedAt(updatedAtIso);
    } catch (e) {
      if (requestId !== rateRequestRef.current) {
        return;
      }
      setMarketRate(null);
      setMarketRateUpdatedAt(null);
      setMarketRateError(e instanceof Error ? e.message : String(e));
    } finally {
      if (requestId === rateRequestRef.current) {
        setMarketRateLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!apiClient.getAccessToken()) {
      router.push('/');
      return;
    }
    void load();
  }, [load]);

  const activeFromCurrency = (haveCurrency || filterHaveCurrency).trim();
  const activeToCurrency = (needCurrency || filterNeedCurrency).trim();

  useEffect(() => {
    if (!activeFromCurrency || !activeToCurrency) {
      setMarketRate(null);
      setMarketRateUpdatedAt(null);
      setMarketRateError(null);
      return;
    }
    void fetchMarketRate(activeFromCurrency, activeToCurrency);
  }, [activeFromCurrency, activeToCurrency, fetchMarketRate]);

  const handleCreatePost = async () => {
    setCreatingBusy(true);
    setCreateError(null);
    try {
      const amountNumber = Number(amount);
      const preferredRateNumber = Number(preferredRate);
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 7);
      const created = await apiClient.createCurrencyPost({
        haveCurrency,
        needCurrency,
        amount: amountNumber,
        preferredRate: preferredRateNumber,
        city,
        expiryDate: expiry.toISOString(),
      });
      const id = (created as any).id as string | undefined;
      if (id) {
        await apiClient.activateCurrencyPost(id);
      }
      setHaveCurrency('');
      setNeedCurrency('');
      setAmount('');
      setPreferredRate('');
      setCity('');
      setCreating(false);
      await load();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreatingBusy(false);
    }
  };

  const handleUpdatePost = async () => {
    if (!editingPostId) return;
    setCreatingBusy(true);
    setCreateError(null);
    try {
      const amountNumber = Number(amount);
      const preferredRateNumber = Number(preferredRate);
      if (Number.isNaN(amountNumber) || amountNumber <= 0) {
        throw new Error('Amount must be a valid number greater than 0');
      }
      if (Number.isNaN(preferredRateNumber) || preferredRateNumber < 0) {
        throw new Error('Preferred rate must be a valid number');
      }
      await apiClient.updateCurrencyPost(editingPostId, {
        haveCurrency,
        needCurrency,
        amount: amountNumber,
        preferredRate: preferredRateNumber,
        city,
      });
      closeForm();
      await load();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreatingBusy(false);
    }
  };

  const startEditPost = (post: CurrencyPost) => {
    setFormMode('edit');
    setEditingPostId(post.id);
    setHaveCurrency(post.haveCurrency);
    setNeedCurrency(post.needCurrency);
    setAmount(String(post.amount));
    setPreferredRate(String(post.preferredRate));
    setCity(post.city);
    setCreateError(null);
    setCreating(true);
  };

  const closeForm = () => {
    setCreating(false);
    setFormMode('create');
    setEditingPostId(null);
    setHaveCurrency('');
    setNeedCurrency('');
    setAmount('');
    setPreferredRate('');
    setCity('');
    setNote('');
    setCreateError(null);
  };

  useEffect(() => {
    if (viewMode === 'requests') {
      setFormMode('create');
      setEditingPostId(null);
      setCreateError(null);
      setCreating(true);
      if (!haveCurrency && filterHaveCurrency) setHaveCurrency(filterHaveCurrency);
      if (!needCurrency && filterNeedCurrency) setNeedCurrency(filterNeedCurrency);
    } else {
      setCreating(false);
    }
  }, [viewMode, filterHaveCurrency, filterNeedCurrency, haveCurrency, needCurrency]);

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await apiClient.acceptMatchRequest(requestId);
      Alert.alert('Success', 'Request accepted!');
      await load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await apiClient.rejectMatchRequest(requestId);
      Alert.alert('Success', 'Request rejected');
      await load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await apiClient.cancelMatchRequest(requestId);
      Alert.alert('Success', 'Request cancelled');
      await load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    }
  };

  const handleCompleteRequest = async (requestId: string) => {
    try {
      await apiClient.completeMatchRequest(requestId);
      Alert.alert('Success', 'Match completed! You can now rate your experience.');
      await load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    }
  };

  const handleRateRequest = async (data: RatingData) => {
    if (!selectedMatchForRating) return;
    setRatingBusy(true);
    try {
      await apiClient.createRating({
        matchRequestId: selectedMatchForRating.id,
        reliabilityScore: data.reliabilityScore,
        communicationScore: data.communicationScore,
        timelinessScore: data.timelinessScore,
        comment: data.comment,
      });
      Alert.alert('Success', 'Rating submitted!');
      setRatingModalVisible(false);
      setSelectedMatchForRating(null);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setRatingBusy(false);
    }
  };

  const handleDisputeRequest = async (reason: string) => {
    if (!selectedMatchForDispute) return;
    setDisputeBusy(true);
    try {
      await apiClient.createDispute({
        matchRequestId: selectedMatchForDispute.id,
        reason,
      });
      Alert.alert('Success', 'Dispute reported. Support will review it.');
      setDisputeModalVisible(false);
      setSelectedMatchForDispute(null);
      // Optimistically update status
      setRequests((prev) =>
        prev.map((r) =>
          r.id === selectedMatchForDispute.id ? { ...r, status: 'disputed' } : r
        )
      );
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setDisputeBusy(false);
    }
  };

  const handleMessage = async (targetUserId: string, matchRequestId?: string) => {
    try {
      setBusy(true);
      const conversation = await apiClient.createConversation({
        targetUserId,
        matchRequestId,
      });
      router.push(`/chat/${conversation.id}`);
    } catch {
      Alert.alert('Error', 'Could not start conversation');
      // console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const handleCancelPost = async (postId: string) => {
    Alert.alert(
      'Cancel Post',
      'Are you sure you want to cancel this post?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await apiClient.cancelCurrencyPost(postId);
              Alert.alert('Success', 'Post cancelled');
              await load();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : String(e));
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const renderPostItem = ({ item }: { item: CurrencyPost }) => {
    const isMyPost = item.userId === myUserId;
    const displayName = item.user?.fullName || (isMyPost ? 'You' : 'User');
    const ratingAvg = typeof item.ratingAvg === 'number' ? item.ratingAvg : null;
    const tradeCount = typeof item.tradeCount === 'number' ? item.tradeCount : 0;
    const isVerified = (item.user?.verificationLevel ?? 0) >= 2;

    return (
      <AppCard style={styles.postCard}>
        <View style={styles.postHeaderRow}>
          <View style={[styles.userCircle, { backgroundColor: 'rgba(77, 163, 255, 0.18)' }]}>
            <ThemedText type="defaultSemiBold" style={{ color: Colors[colorScheme ?? 'light'].tint }}>
              {displayName.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="defaultSemiBold" numberOfLines={1}>
              {displayName}{isVerified ? ' ✓' : ''}
            </ThemedText>
            <ThemedText style={styles.postMeta} numberOfLines={1}>
              {(ratingAvg ? `★ ${ratingAvg.toFixed(1)}` : '★ —') + ` · ${tradeCount} trades`}
            </ThemedText>
          </View>
          <View style={[styles.ratePill, { backgroundColor: Colors[colorScheme ?? 'light'].surface }]}>
            <ThemedText style={styles.ratePillText}>@ {item.preferredRate}</ThemedText>
          </View>
        </View>

        <View style={styles.postMainRow}>
          <ThemedText type="defaultSemiBold" style={styles.postAmountText}>
            {item.haveCurrency} {item.amount.toLocaleString()} → {item.needCurrency}
          </ThemedText>
        </View>

        <View style={styles.cardActions}>
          {isMyPost ? (
            <View style={styles.rowButtons}>
              <ThemedButton
                title="Edit"
                variant="secondary"
                onPress={() => startEditPost(item)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <ThemedButton 
                title="Cancel" 
                variant="secondary" 
                onPress={() => handleCancelPost(item.id)} 
                style={{ flex: 1 }}
              />
            </View>
          ) : (
            <View style={styles.rowButtons}>
              <ThemedButton
                title="Connect"
                onPress={() => handleMessage(item.userId)}
                fullWidth
                style={{ flex: 1 }}
              />
            </View>
          )}
        </View>
      </AppCard>
    );
  };

  const renderRequestItem = ({ item }: { item: MatchRequest }) => {
    const isIncoming = item.targetUserId === myUserId;
    const isOutgoing = item.requesterId === myUserId;
    const chatTargetId = isIncoming ? item.requesterId : item.targetUserId;
    
    // Find associated post details (optional, if we had them fully joined)
    // For now, just show ID or basic info
    
    return (
      <ThemedView style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.rowButtons}>
            <ThemedText type="defaultSemiBold">Match Request</ThemedText>
            <ThemedText style={[styles.statusBadge, { color: getStatusColor(item.status) }]}>
              {item.status.toUpperCase()}
            </ThemedText>
          </View>
          {isIncoming ? (
            <ThemedText style={[styles.badge, { backgroundColor: badgeBackgroundColor }]}>Incoming</ThemedText>
          ) : (
            <ThemedText style={[styles.badge, { backgroundColor: badgeBackgroundColor }]}>Outgoing</ThemedText>
          )}
        </View>
        
        <ThemedText style={{ fontSize: 12, color: '#666' }}>
          {new Date(item.createdAt).toLocaleString()}
        </ThemedText>

        <View style={styles.cardActions}>
          {item.status === 'pending' && (
            <>
              {isIncoming && (
                <>
                  <View style={styles.rowButtons}>
                    <ThemedButton 
                      title="Accept" 
                      onPress={() => handleAcceptRequest(item.id)} 
                      style={{ marginRight: 8, flex: 1 }}
                    />
                    <ThemedButton 
                      title="Reject" 
                      variant="secondary" 
                      onPress={() => handleRejectRequest(item.id)}
                      style={{ flex: 1 }}
                    />
                  </View>
                  <View style={{ height: 8 }} />
                  <ThemedButton 
                    title="Connect" 
                    variant="secondary" 
                    onPress={() => handleMessage(chatTargetId, item.id)}
                  />
                </>
              )}
              {isOutgoing && (
                <View style={styles.rowButtons}>
                  <ThemedButton 
                    title="Cancel" 
                    variant="secondary" 
                    onPress={() => handleCancelRequest(item.id)} 
                    style={{ flex: 1 }}
                  />
                  <View style={{ width: 8 }} />
                  <ThemedButton 
                    title="Connect" 
                    variant="secondary" 
                    onPress={() => handleMessage(chatTargetId, item.id)}
                    style={{ flex: 1 }}
                  />
                </View>
              )}
            </>
          )}
          {item.status === 'accepted' && (
            <View style={styles.rowButtons}>
             <ThemedButton 
               title="Complete" 
               onPress={() => handleCompleteRequest(item.id)} 
               style={{ flex: 1 }}
             />
             <View style={{ width: 8 }} />
             <ThemedButton 
               title="Dispute" 
               variant="secondary"
               onPress={() => {
                 setSelectedMatchForDispute(item);
                 setDisputeModalVisible(true);
               }} 
               style={{ flex: 1, minWidth: 80 }}
               textStyle={{ fontSize: 12 }}
             />
             <View style={{ width: 8 }} />
             <ThemedButton 
               title="Connect" 
               variant="secondary"
               onPress={() => handleMessage(chatTargetId, item.id)} 
               style={{ flex: 1, minWidth: 60 }}
               textStyle={{ fontSize: 12 }}
             />
            </View>
          )}
          {item.status === 'completed' && (
             <View style={styles.rowButtons}>
               <ThemedButton 
                 title="Rate" 
                 onPress={() => {
                   setSelectedMatchForRating(item);
                   setRatingModalVisible(true);
                 }} 
                 style={{ flex: 1 }}
               />
               <View style={{ width: 8 }} />
               <ThemedButton 
                 title="Dispute" 
                 variant="secondary"
                 onPress={() => {
                   setSelectedMatchForDispute(item);
                   setDisputeModalVisible(true);
                 }} 
                 style={{ flex: 1, minWidth: 80 }}
                 textStyle={{ fontSize: 12 }}
               />
               <View style={{ width: 8 }} />
               <ThemedButton 
                 title="Connect" 
                 variant="secondary"
                 onPress={() => handleMessage(chatTargetId, item.id)} 
                 style={{ flex: 1, minWidth: 60 }}
                 textStyle={{ fontSize: 12 }}
               />
             </View>
          )}
        </View>
      </ThemedView>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'accepted': return 'green';
      case 'rejected': return 'red';
      case 'cancelled': return 'gray';
      default: return 'black';
    }
  };

  const normalize = (value: string) => value.trim().toLowerCase();

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      if (filterMineOnly && myUserId && p.userId !== myUserId) return false;
      if (filterHaveCurrency && normalize(p.haveCurrency) !== normalize(filterHaveCurrency)) return false;
      if (filterNeedCurrency && normalize(p.needCurrency) !== normalize(filterNeedCurrency)) return false;
      if (filterCity && !normalize(p.city).includes(normalize(filterCity))) return false;
      if (filterPostStatus && !normalize(p.status).includes(normalize(filterPostStatus))) return false;
      return true;
    });
  }, [posts, filterMineOnly, myUserId, filterHaveCurrency, filterNeedCurrency, filterCity, filterPostStatus]);

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const isIncoming = r.targetUserId === myUserId;
      const isOutgoing = r.requesterId === myUserId;

      if (myUserId && !isIncoming && !isOutgoing) return false;
      if (isIncoming && !filterIncoming) return false;
      if (isOutgoing && !filterOutgoing) return false;
      if (filterRequestStatus && !normalize(r.status).includes(normalize(filterRequestStatus))) return false;
      return true;
    });
  }, [requests, myUserId, filterIncoming, filterOutgoing, filterRequestStatus]);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#F5F7FB', dark: '#15181B' }}
      headerImage={null}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <ThemedText type="title" style={styles.screenTitle}>Currency Exchange</ThemedText>
            <ThemedText style={styles.screenSubtitle}>Peer-to-peer, zero fees</ThemedText>
          </View>
          <Pressable
            onPress={() => Alert.alert('Info', 'Browse listings or post a request to connect with verified users.')}
            style={({ pressed }) => [
              styles.iconButton,
              {
                backgroundColor: Colors[colorScheme ?? 'light'].background,
                borderColor: Colors[colorScheme ?? 'light'].border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            hitSlop={8}
          >
            <IconSymbol name="info.circle" size={18} color={Colors[colorScheme ?? 'light'].icon} />
          </Pressable>
        </View>

        <AppCard style={styles.exchangeCard}>
          <View style={styles.exchangeTopRow}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.exchangeLabel}>YOU SEND</ThemedText>
              <CurrencySelector
                placeholder="Select"
                value={filterHaveCurrency}
                onChange={(v) => {
                  setFilterHaveCurrency(v);
                  if (viewMode === 'requests') setHaveCurrency(v);
                }}
              />
            </View>

            <Pressable
              onPress={() => {
                const nextHave = filterNeedCurrency;
                const nextNeed = filterHaveCurrency;
                setFilterHaveCurrency(nextHave);
                setFilterNeedCurrency(nextNeed);
                if (viewMode === 'requests') {
                  setHaveCurrency(nextHave);
                  setNeedCurrency(nextNeed);
                }
              }}
              style={({ pressed }) => [
                styles.swapButtonSmall,
                { backgroundColor: Colors[colorScheme ?? 'light'].tint, opacity: pressed ? 0.8 : 1 },
              ]}
              hitSlop={8}
            >
              <IconSymbol name="arrow.left.arrow.right" size={16} color="#fff" />
            </Pressable>

            <View style={{ flex: 1 }}>
              <ThemedText style={styles.exchangeLabel}>THEY RECEIVE</ThemedText>
              <CurrencySelector
                placeholder="Select"
                value={filterNeedCurrency}
                onChange={(v) => {
                  setFilterNeedCurrency(v);
                  if (viewMode === 'requests') setNeedCurrency(v);
                }}
              />
            </View>
          </View>

          <View style={styles.marketRateInlineRow}>
            <ThemedText style={styles.marketRateInlineLabel}>Live Market Rate</ThemedText>
            <ThemedText style={styles.marketRateInlineValue}>
              {filterHaveCurrency && filterNeedCurrency
                ? marketRateLoading
                  ? 'Loading…'
                  : marketRate
                    ? `1 ${filterHaveCurrency} ≈ ${formatRate(marketRate)} ${filterNeedCurrency}`
                    : marketRateError
                      ? 'Unavailable'
                      : '—'
                : '—'}
            </ThemedText>
          </View>
          {marketRateUpdatedAt ? (
            <ThemedText style={{ marginTop: 6, fontSize: 12, opacity: 0.65 }}>
              Updated: {marketRateUpdatedAt}
            </ThemedText>
          ) : null}

          
        </AppCard>

        <AppCard variant="soft" style={styles.trendCard}>
          <View style={styles.trendRow}>
            <ThemedText type="defaultSemiBold">7-Day Rate Trend</ThemedText>
            <View style={[styles.trendPill, { backgroundColor: 'rgba(34, 209, 139, 0.12)' }]}>
              <ThemedText style={{ color: '#1b8f3a', fontSize: 12 }}>+0.00%</ThemedText>
            </View>
          </View>
          <View style={styles.trendBars}>
            {Array.from({ length: 7 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.trendBar,
                  {
                    height: 10 + i * 4,
                    backgroundColor:
                      i === 6 ? Colors[colorScheme ?? 'light'].tint : Colors[colorScheme ?? 'light'].border,
                  },
                ]}
              />
            ))}
          </View>
        </AppCard>

        <View style={styles.primaryActionsRow}>
          <SegmentedControl
            value={viewMode}
            options={[
              { value: 'posts', label: 'Browse Listings' },
            { value: 'requests', label: 'Post Request' },
            ]}
            onChange={setViewMode}
          />
        </View>
      </View>

      {viewMode === 'posts' ? (
        <View style={styles.filterButtons}>
          <ThemedButton
            title={filtersVisible ? 'Hide filters' : 'Filters'}
            variant="secondary"
            onPress={() => setFiltersVisible((v) => !v)}
            disabled={busy}
            style={{ flex: 1, marginRight: 8 }}
          />
          <ThemedButton
            title="Clear"
            variant="secondary"
            onPress={() => {
              setFilterMineOnly(false);
              setFilterHaveCurrency('');
              setFilterNeedCurrency('');
              setFilterCity('');
              setFilterPostStatus('');
              setFilterRequestStatus('');
              setFilterIncoming(true);
              setFilterOutgoing(true);
            }}
            disabled={busy}
            style={{ width: 110 }}
          />
        </View>
      ) : null}

      {filtersVisible && (
        <ThemedView style={[styles.form, { backgroundColor: formBackgroundColor }]}>
          {viewMode === 'posts' ? (
            <>
              <View style={styles.filterRow}>
                <ThemedButton
                  title={filterMineOnly ? 'Mine only: ON' : 'Mine only: OFF'}
                  variant="secondary"
                  onPress={() => setFilterMineOnly((v) => !v)}
                  disabled={busy}
                  fullWidth
                />
              </View>
              <CurrencySelector
                placeholder="Have currency"
                value={filterHaveCurrency}
                onChange={setFilterHaveCurrency}
              />
              <CurrencySelector
                placeholder="Need currency"
                value={filterNeedCurrency}
                onChange={setFilterNeedCurrency}
              />
              <CitySelector placeholder="City" value={filterCity} onChange={setFilterCity} />
              <ThemedInput
                placeholder="Status (e.g. active, cancelled)"
                value={filterPostStatus}
                onChangeText={setFilterPostStatus}
              />
            </>
          ) : (
            <>
              <View style={styles.rowButtons}>
                <ThemedButton
                  title={filterIncoming ? 'Incoming: ON' : 'Incoming: OFF'}
                  variant="secondary"
                  onPress={() => setFilterIncoming((v) => !v)}
                  disabled={busy}
                  style={{ flex: 1 }}
                />
                <ThemedButton
                  title={filterOutgoing ? 'Outgoing: ON' : 'Outgoing: OFF'}
                  variant="secondary"
                  onPress={() => setFilterOutgoing((v) => !v)}
                  disabled={busy}
                  style={{ flex: 1 }}
                />
              </View>
              <ThemedInput
                placeholder="Request status (e.g. pending, accepted, completed)"
                value={filterRequestStatus}
                onChangeText={setFilterRequestStatus}
              />
            </>
          )}
        </ThemedView>
      )}

      {creating && (
        <AppCard style={styles.requestFormCard}>
          <View style={styles.requestFormHeaderRow}>
            <ThemedText type="defaultSemiBold" style={styles.requestFormTitle}>
              {formMode === 'edit' ? 'Edit Request' : 'Post Request'}
            </ThemedText>
            <Pressable onPress={closeForm} hitSlop={8}>
              <ThemedText style={{ color: Colors[colorScheme ?? 'light'].tint }}>Close</ThemedText>
            </Pressable>
          </View>

          {createError ? <ThemedText style={{ color: 'red' }}>{createError}</ThemedText> : null}

          <View style={{ gap: 10 }}>
            <View style={styles.fieldBlock}>
              <ThemedText style={styles.fieldLabel}>AMOUNT TO EXCHANGE</ThemedText>
              <View style={styles.amountRow}>
                <View style={{ flex: 1 }}>
                  <ThemedInput
                    placeholder="e.g. 5,000"
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                  />
                </View>
                <View style={[styles.currencyPill, { backgroundColor: Colors[colorScheme ?? 'light'].surface }]}>
                  <ThemedText type="defaultSemiBold">{haveCurrency || filterHaveCurrency || '---'}</ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <ThemedText style={styles.fieldLabel}>YOUR RATE</ThemedText>
              <View style={styles.rateRow}>
                <View style={{ flex: 1 }}>
                  <ThemedInput
                    placeholder="e.g. 22.81"
                    keyboardType="numeric"
                    value={preferredRate}
                    onChangeText={setPreferredRate}
                  />
                </View>
                <View style={[styles.currencyPill, { backgroundColor: Colors[colorScheme ?? 'light'].surface }]}>
                  <ThemedText type="defaultSemiBold">{needCurrency || filterNeedCurrency || '---'}</ThemedText>
                </View>
              </View>
              {activeFromCurrency && activeToCurrency && marketRate ? (
                <ThemedText style={styles.marketRateLine}>
                  Today: 1 {activeFromCurrency} ≈ {formatRate(marketRate)} {activeToCurrency}
                </ThemedText>
              ) : null}
              {haveCurrency && needCurrency && preferredRate ? (
                <ThemedText style={[styles.marketRateLine, { opacity: 0.75 }]}>
                  Yours: 1 {haveCurrency} ≈ {preferredRate} {needCurrency}
                </ThemedText>
              ) : null}
            </View>

            <View style={styles.fieldBlock}>
              <ThemedText style={styles.fieldLabel}>NOTE (OPTIONAL)</ThemedText>
              <ThemedInput
                placeholder="Any special instructions..."
                value={note}
                onChangeText={setNote}
              />
            </View>

            <View style={styles.fieldBlock}>
              <ThemedText style={styles.fieldLabel}>CITY (OPTIONAL)</ThemedText>
              <CitySelector
                placeholder="City"
                value={city}
                onChange={setCity}
                onSelectCity={(item) => {
                  if (!haveCurrency) setHaveCurrency(item.currency);
                }}
              />
            </View>

            <ThemedButton
              title={creatingBusy ? 'Posting...' : 'Post Exchange Request'}
              onPress={formMode === 'edit' ? handleUpdatePost : handleCreatePost}
              disabled={creatingBusy}
              fullWidth
            />
          </View>
        </AppCard>
      )}

      {busy && !loadedOnce && <ThemedText>Loading...</ThemedText>}
      {error && <ThemedText style={{ color: 'red' }}>{error}</ThemedText>}

      {viewMode === 'posts' ? (
        <View style={styles.list}>
          <ThemedText type="subtitle">Active Posts</ThemedText>
          <ThemedText style={{ marginBottom: 10, fontSize: 12, color: '#666' }}>
            Browse posts from other users. Tap &quot;Request Match&quot; to initiate a trade.
          </ThemedText>
          {filteredPosts.map((post) => (
            <View key={post.id}>{renderPostItem({ item: post })}</View>
          ))}
          {filteredPosts.length === 0 && loadedOnce && <ThemedText>No posts found.</ThemedText>}
        </View>
      ) : (
        <View style={styles.list}>
          <ThemedText type="subtitle" style={{ marginTop: 4 }}>My Requests</ThemedText>
          {filteredRequests.map((req) => (
            <View key={req.id}>{renderRequestItem({ item: req })}</View>
          ))}
          {filteredRequests.length === 0 && loadedOnce && <ThemedText>No requests found.</ThemedText>}
        </View>
      )}

      <RatingModal
        visible={ratingModalVisible}
        onClose={() => {
          setRatingModalVisible(false);
          setSelectedMatchForRating(null);
        }}
        onSubmit={handleRateRequest}
        isLoading={ratingBusy}
      />

      <DisputeModal
        visible={disputeModalVisible}
        onClose={() => {
          setDisputeModalVisible(false);
          setSelectedMatchForDispute(null);
        }}
        onSubmit={handleDisputeRequest}
        isLoading={disputeBusy}
      />
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: UI.spacing.sm,
    paddingBottom: UI.spacing.sm,
    gap: UI.spacing.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: UI.spacing.md,
  },
  screenTitle: {
    fontSize: 28,
    lineHeight: 32,
  },
  screenSubtitle: {
    fontSize: 13,
    lineHeight: 16,
    opacity: 0.75,
    marginTop: 6,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exchangeCard: {
    padding: UI.spacing.lg,
    gap: UI.spacing.md,
  },
  exchangeBlock: {
    gap: 8,
  },
  exchangeTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  swapButtonSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginBottom: 6,
  },
  exchangeLabel: {
    fontSize: 11,
    lineHeight: 14,
    opacity: 0.65,
    letterSpacing: 0.6,
  },
  marketRateInlineRow: {
    marginTop: UI.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  marketRateInlineLabel: {
    fontSize: 12,
    lineHeight: 14,
    opacity: 0.7,
  },
  marketRateInlineValue: {
    fontSize: 12,
    lineHeight: 14,
    opacity: 0.9,
  },
  trendCard: {
    padding: UI.spacing.lg,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trendPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  trendBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: UI.spacing.md,
  },
  trendBar: {
    flex: 1,
    borderRadius: 6,
  },
  primaryActionsRow: {
    gap: UI.spacing.sm,
  },
  requestFormCard: {
    marginHorizontal: UI.spacing.lg,
    marginBottom: UI.spacing.lg,
    padding: UI.spacing.lg,
    gap: UI.spacing.md,
  },
  requestFormHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  requestFormTitle: {
    fontSize: 16,
    lineHeight: 20,
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 11,
    lineHeight: 14,
    opacity: 0.65,
    letterSpacing: 0.6,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  currencyPill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marketRateLine: {
    fontSize: 12,
    lineHeight: 14,
    opacity: 0.75,
    marginTop: 4,
  },
  filterButtons: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  filterRow: {
    width: '100%',
  },
  form: {
    gap: 12,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  list: {
    gap: 16,
  },
  postCard: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  postHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postMeta: {
    fontSize: 12,
    lineHeight: 14,
    opacity: 0.75,
    marginTop: 2,
  },
  ratePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  ratePillText: {
    fontSize: 12,
    lineHeight: 14,
    opacity: 0.9,
  },
  postMainRow: {},
  postAmountText: {
    fontSize: 16,
    lineHeight: 20,
  },
  card: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardActions: {
    marginTop: 8,
  },
  rowButtons: {
    flexDirection: 'row',
    gap: 8,
  },
});
