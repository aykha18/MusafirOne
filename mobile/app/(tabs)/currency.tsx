import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View, Alert, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedButton } from '@/components/themed-button';
import { ThemedInput } from '@/components/themed-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { apiClient } from '@/api/client';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
  const borderColor = isDark ? '#333' : '#ccc';
  const [viewMode, setViewMode] = useState<'posts' | 'requests'>('posts');
  const [posts, setPosts] = useState<CurrencyPost[]>([]);
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);
  
  const [creating, setCreating] = useState(false);
  const [haveCurrency, setHaveCurrency] = useState('');
  const [needCurrency, setNeedCurrency] = useState('');
  const [amount, setAmount] = useState('');
  const [preferredRate, setPreferredRate] = useState('');
  const [city, setCity] = useState('');
  
  const [creatingBusy, setCreatingBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedMatchForRating, setSelectedMatchForRating] = useState<MatchRequest | null>(null);
  const [ratingBusy, setRatingBusy] = useState(false);

  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [selectedMatchForDispute, setSelectedMatchForDispute] = useState<MatchRequest | null>(null);
  const [disputeBusy, setDisputeBusy] = useState(false);

  const load = async () => {
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
  };

  useEffect(() => {
    if (!apiClient.getAccessToken()) {
      router.push('/');
      return;
    }
    void load();
  }, []);

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

  const handleRequestMatch = async (post: CurrencyPost) => {
    try {
      await apiClient.createMatchRequest(post.id, {});
      Alert.alert('Success', 'Match request sent!');
      await load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    }
  };

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
    } catch (e) {
      Alert.alert('Error', 'Could not start conversation');
      console.error(e);
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
    const hasPendingRequest = requests.some(
      r => r.currencyPostId === item.id && r.requesterId === myUserId && r.status === 'pending'
    );

    return (
      <ThemedView style={styles.card}>
        <View style={styles.cardHeader}>
          <ThemedText type="defaultSemiBold">{item.haveCurrency} ➡️ {item.needCurrency}</ThemedText>
          {isMyPost && <ThemedText style={[styles.badge, { backgroundColor: badgeBackgroundColor }]}>My Post</ThemedText>}
        </View>
        <ThemedText>Amount: {item.amount}</ThemedText>
        <ThemedText>Rate: {item.preferredRate}</ThemedText>
        <ThemedText>City: {item.city}</ThemedText>
        
        <View style={styles.cardActions}>
          {isMyPost ? (
            <ThemedButton 
              title="Cancel Post" 
              variant="secondary" 
              onPress={() => handleCancelPost(item.id)} 
            />
          ) : (
            <View style={styles.rowButtons}>
              {hasPendingRequest ? (
                <ThemedButton title="Request Sent" variant="secondary" disabled onPress={() => {}} style={{ flex: 1 }} />
              ) : (
                <ThemedButton title="Request Match" onPress={() => handleRequestMatch(item)} style={{ flex: 1 }} />
              )}
              <View style={{ width: 8 }} />
              <ThemedButton 
                title="Chat" 
                variant="secondary" 
                onPress={() => handleMessage(item.userId, requests.find(r => r.currencyPostId === item.id && r.requesterId === myUserId)?.id)} 
                style={{ flex: 1 }}
              />
            </View>
          )}
        </View>
      </ThemedView>
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
                    title="Chat" 
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
                    title="Chat" 
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
               style={{ flex: 1 }}
             />
             <View style={{ width: 8 }} />
             <ThemedButton 
               title="Chat" 
               variant="secondary"
               onPress={() => handleMessage(chatTargetId, item.id)} 
               style={{ flex: 1 }}
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
                 style={{ flex: 1 }}
               />
               <View style={{ width: 8 }} />
               <ThemedButton 
                 title="Chat" 
                 variant="secondary"
                 onPress={() => handleMessage(chatTargetId, item.id)} 
                 style={{ flex: 1 }}
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

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={null}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Currency</ThemedText>
        <View style={styles.headerButtons}>
          <ThemedButton
            title={creating ? 'Close form' : 'Create post'}
            onPress={() => setCreating((prev) => !prev)}
            variant="secondary"
          />
        </View>
      </ThemedView>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: borderColor }]}>
        <TouchableOpacity 
          style={[styles.tab, viewMode === 'posts' && styles.activeTab]} 
          onPress={() => setViewMode('posts')}
        >
          <ThemedText style={[styles.tabText, viewMode === 'posts' && styles.activeTabText]}>Market</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, viewMode === 'requests' && styles.activeTab]} 
          onPress={() => setViewMode('requests')}
        >
          <ThemedText style={[styles.tabText, viewMode === 'requests' && styles.activeTabText]}>
            Requests {requests.filter(r => r.status === 'pending' && r.targetUserId === myUserId).length > 0 && `(${requests.filter(r => r.status === 'pending' && r.targetUserId === myUserId).length})`}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {creating && (
        <ThemedView style={[styles.form, { backgroundColor: formBackgroundColor }]}>
          <ThemedText type="subtitle">New Post</ThemedText>
          {createError && <ThemedText style={{ color: 'red' }}>{createError}</ThemedText>}
          
          <ThemedInput
            placeholder="Have (e.g. USD)"
            value={haveCurrency}
            onChangeText={setHaveCurrency}
          />
          <ThemedInput
            placeholder="Need (e.g. TRY)"
            value={needCurrency}
            onChangeText={setNeedCurrency}
          />
          <ThemedInput
            placeholder="Amount"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <ThemedInput
            placeholder="Preferred Rate"
            keyboardType="numeric"
            value={preferredRate}
            onChangeText={setPreferredRate}
          />
          <ThemedInput
            placeholder="City"
            value={city}
            onChangeText={setCity}
          />
          
          <ThemedButton
            title={creatingBusy ? 'Creating...' : 'Submit'}
            onPress={handleCreatePost}
            disabled={creatingBusy}
          />
        </ThemedView>
      )}

      {busy && !loadedOnce && <ThemedText>Loading...</ThemedText>}
      {error && <ThemedText style={{ color: 'red' }}>{error}</ThemedText>}

      {viewMode === 'posts' ? (
        <View style={styles.list}>
          {posts.map((post) => (
            <View key={post.id}>{renderPostItem({ item: post })}</View>
          ))}
          {posts.length === 0 && loadedOnce && <ThemedText>No posts found.</ThemedText>}
        </View>
      ) : (
        <View style={styles.list}>
          {requests.map((req) => (
            <View key={req.id}>{renderRequestItem({ item: req })}</View>
          ))}
          {requests.length === 0 && loadedOnce && <ThemedText>No requests found.</ThemedText>}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerButtons: {
    flexDirection: 'row',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginRight: 10,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0a7ea4',
  },
  tabText: {
    opacity: 0.6,
  },
  activeTabText: {
    fontWeight: 'bold',
    color: '#0a7ea4',
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
