import { StyleSheet, FlatList, View, ActivityIndicator, Pressable } from 'react-native';
import { useMemo, useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemedInput } from '@/components/themed-input';
import { apiClient, Conversation } from '@/api/client';
import { Colors, UI } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppCard } from '@/components/ui/app-card';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function ChatListScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'exchange' | 'parcel'>('all');

  const loadData = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      const [me, chats] = await Promise.all([
        apiClient.getMe(),
        apiClient.getConversations(),
      ]);
      setMyId(me.id);
      setConversations(chats);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations
      .filter((c) => {
        if (filter === 'exchange') return Boolean(c.matchRequestId);
        if (filter === 'parcel') return Boolean(c.parcelRequestId);
        return true;
      })
      .filter((c) => {
        if (!q) return true;
        const other = c.user1.id === myId ? c.user2 : c.user1;
        const last = c.messages?.[0]?.content ?? '';
        return (
          other.fullName.toLowerCase().includes(q) ||
          last.toLowerCase().includes(q)
        );
      });
  }, [conversations, filter, myId, search]);

  const renderItem = ({ item }: { item: Conversation }) => {
    const otherUser = item.user1.id === myId ? item.user2 : item.user1;
    const lastMessage = item.messages?.[0];
    const isExchange = Boolean(item.matchRequestId);
    const tagLabel = isExchange ? 'Exchange' : item.parcelRequestId ? 'Parcel' : 'Chat';
    const timeLabel = new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <Pressable onPress={() => router.push(`/chat/${item.id}`)} style={{ marginBottom: UI.spacing.sm }}>
        <AppCard style={styles.threadCard}>
          <View style={styles.threadRow}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: isExchange ? 'rgba(77, 163, 255, 0.18)' : 'rgba(255, 165, 0, 0.18)' },
              ]}
            >
              <ThemedText type="defaultSemiBold" style={{ color: isExchange ? Colors[colorScheme ?? 'light'].tint : '#E98100' }}>
                {otherUser.fullName.charAt(0).toUpperCase()}
              </ThemedText>
            </View>

            <View style={{ flex: 1 }}>
              <View style={styles.threadTop}>
                <ThemedText type="defaultSemiBold" numberOfLines={1} style={{ flex: 1 }}>
                  {otherUser.fullName}
                </ThemedText>
                <ThemedText style={styles.time}>{timeLabel}</ThemedText>
              </View>
              <View style={styles.threadBottom}>
                <View style={[styles.tag, { backgroundColor: Colors[colorScheme ?? 'light'].surface }]}>
                  <IconSymbol
                    size={14}
                    name={isExchange ? 'arrow.left.arrow.right' : 'shippingbox.fill'}
                    color={Colors[colorScheme ?? 'light'].icon}
                  />
                  <ThemedText style={styles.tagText}>{tagLabel}</ThemedText>
                </View>
                <ThemedText numberOfLines={1} style={styles.preview}>
                  {lastMessage
                    ? lastMessage.senderId === myId
                      ? `You: ${lastMessage.content}`
                      : lastMessage.content
                    : 'No messages yet'}
                </ThemedText>
              </View>
            </View>
          </View>
        </AppCard>
      </Pressable>
    );
  };

  if (loading && !refreshing && conversations.length === 0) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].surface }]}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>
          Messages
        </ThemedText>
        <View style={[styles.unreadPill, { backgroundColor: Colors[colorScheme ?? 'light'].background, borderColor: Colors[colorScheme ?? 'light'].border }]}>
          <ThemedText style={styles.unreadText}>0 unread</ThemedText>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <ThemedInput placeholder="Search messages..." value={search} onChangeText={setSearch} />
      </View>

      <View style={styles.filtersWrap}>
        <SegmentedControl
          value={filter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'exchange', label: 'Exchange' },
            { value: 'parcel', label: 'Parcel' },
          ]}
          onChange={setFilter}
        />
      </View>

      <FlatList
        data={filteredConversations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={[
          styles.listContent,
          filteredConversations.length === 0 ? styles.emptyContainer : undefined,
        ]}
        ListEmptyComponent={
          !loading ? <ThemedText style={styles.emptyText}>No conversations yet</ThemedText> : null
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: UI.spacing.lg,
    paddingTop: UI.spacing.lg,
    paddingBottom: UI.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 32,
  },
  unreadPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  unreadText: {
    fontSize: 12,
    lineHeight: 14,
    opacity: 0.85,
  },
  searchWrap: {
    paddingHorizontal: UI.spacing.lg,
    marginTop: UI.spacing.sm,
  },
  filtersWrap: {
    paddingHorizontal: UI.spacing.lg,
    marginTop: UI.spacing.md,
    marginBottom: UI.spacing.md,
  },
  listContent: {
    paddingHorizontal: UI.spacing.lg,
    paddingBottom: 90,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  threadCard: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  threadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  threadTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    fontSize: 12,
    opacity: 0.7,
  },
  threadBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 12,
    lineHeight: 14,
    opacity: 0.85,
  },
  preview: {
    flex: 1,
    fontSize: 13,
    lineHeight: 16,
    opacity: 0.8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    opacity: 0.7,
  },
});
