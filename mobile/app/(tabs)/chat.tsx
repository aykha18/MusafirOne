import { StyleSheet, FlatList, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { apiClient, Conversation } from '@/api/client';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ChatListScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      // Don't set loading true if refreshing, to keep list visible
      if (!refreshing) setLoading(true);
      
      const [me, chats] = await Promise.all([
        apiClient.getMe(),
        apiClient.getConversations(),
      ]);
      setMyId(me.id);
      setConversations(chats);
    } catch (e) {
      // console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const renderItem = ({ item }: { item: Conversation }) => {
    const otherUser = item.user1.id === myId ? item.user2 : item.user1;
    const lastMessage = item.messages?.[0];
    
    return (
      <TouchableOpacity 
        style={[styles.item, { borderBottomColor: Colors[colorScheme ?? 'light'].icon }]} 
        onPress={() => router.push(`/chat/${item.id}`)}
      >
        <ThemedView style={styles.avatar}>
          <ThemedText style={styles.avatarText}>
            {otherUser.fullName.charAt(0).toUpperCase()}
          </ThemedText>
        </ThemedView>
        <View style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="defaultSemiBold">{otherUser.fullName}</ThemedText>
            <ThemedText style={styles.time}>
              {new Date(item.updatedAt).toLocaleDateString()}
            </ThemedText>
          </View>
          <ThemedText numberOfLines={1} style={styles.messagePreview}>
            {lastMessage ? (
              lastMessage.senderId === myId ? `You: ${lastMessage.content}` : lastMessage.content
            ) : (
              'No messages yet'
            )}
          </ThemedText>
        </View>
      </TouchableOpacity>
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
    <ThemedView style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={conversations.length === 0 ? styles.emptyContainer : undefined}
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  item: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: '#666',
  },
  messagePreview: {
    color: '#888',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
  },
});
