import {
  StyleSheet,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  View,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useHeaderHeight } from '@react-navigation/elements';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { apiClient, Message, Conversation } from '@/api/client';
import { connectSocket, getSocket } from '@/api/socket';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';

type SocketMessage = Message & {
  conversationId?: string;
};

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const conversationId = Array.isArray(id) ? id[0] : id;
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const listRef = useRef<FlatList<Message> | null>(null);
  const isAtBottomRef = useRef(true);

  const scrollToBottom = useCallback((animated: boolean) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated });
    }, 60);
  }, []);

  const mergeMessages = useCallback((prev: Message[], next: Message[]) => {
    const byId = new Map<string, Message>();
    for (const m of prev) byId.set(m.id, m);
    for (const m of next) byId.set(m.id, m);
    return Array.from(byId.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, []);

  const appendMessage = useCallback(
    (prev: Message[], msg: Message) => mergeMessages(prev, [msg]),
    [mergeMessages],
  );
  const myMessageBackgroundColor =
    colorScheme === 'dark'
      ? Colors.light.tint
      : Colors[colorScheme ?? 'light'].tint;

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      if (isAtBottomRef.current) scrollToBottom(true);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [scrollToBottom]);

  useEffect(() => {
    navigation.setOptions({ title: 'Chat' });
    
    const init = async () => {
      try {
        const [me, msgs, conv] = await Promise.all([
          apiClient.getMe(),
          apiClient.getMessages(conversationId),
          apiClient.getConversation(conversationId),
        ]);
        setMyId(me.id);
        const sorted = Array.isArray(msgs)
          ? [...msgs].sort(
              (a, b) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
            )
          : [];
        setMessages(sorted);
        setConversation(conv);

        const otherUser = conv.user1.id === me.id ? conv.user2 : conv.user1;
        navigation.setOptions({ title: otherUser.fullName });
        
        const socket = await connectSocket();
        if (socket) {
          socket.on('newMessage', (msg: SocketMessage) => {
            if (!msg.conversationId || msg.conversationId === conversationId) {
              setMessages((prev) => appendMessage(prev, msg));
              if (isAtBottomRef.current) scrollToBottom(true);
            }
          });
    } } catch {
      } finally {
        setLoading(false);
        scrollToBottom(false);
      }
    };
    
    init();

    return () => {
      const socket = getSocket();
      if (socket) {
        socket.off('newMessage');
      }
    };
  }, [conversationId, navigation, appendMessage, scrollToBottom]);

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;
    
    setSending(true);
    const content = inputText.trim();
    setInputText('');
    
    try {
      const msg = await apiClient.sendMessage(conversationId, content);
      setMessages((prev) => appendMessage(prev, msg));
      scrollToBottom(true);
    } catch {
      setInputText(content);
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMe = item.senderId === myId;
    return (
      <View style={[
        styles.messageContainer, 
        isMe ? styles.myMessage : styles.theirMessage,
        { backgroundColor: isMe ? myMessageBackgroundColor : '#e5e5ea' }
      ]}>
        <ThemedText style={{ color: isMe ? '#fff' : '#000' }}>{item.content}</ThemedText>
        <ThemedText style={[styles.timestamp, { color: isMe ? '#f5f5f5' : '#666' }]}>
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </ThemedText>
      </View>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  const contextBackgroundColor = colorScheme === 'dark' ? '#333' : '#f0f0f0';
  const contextBorderColor = colorScheme === 'dark' ? '#444' : '#ccc';
  const composerPaddingBottom =
    Platform.OS === 'android' ? (keyboardVisible ? 0 : insets.bottom) : insets.bottom;

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: Colors[colorScheme ?? 'light'].surface },
      ]}
      edges={['left', 'right']}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        <ThemedView
          style={[
            styles.container,
            { backgroundColor: Colors[colorScheme ?? 'light'].surface },
          ]}
        >
          {conversation?.matchRequest?.currencyPost ? (
            <View
              style={[
                styles.contextBanner,
                { backgroundColor: contextBackgroundColor, borderBottomColor: contextBorderColor },
              ]}
            >
              <ThemedText style={styles.contextText}>
                Trading: {conversation.matchRequest.currencyPost.amount}{' '}
                {conversation.matchRequest.currencyPost.haveCurrency} for{' '}
                {conversation.matchRequest.currencyPost.needCurrency}
              </ThemedText>
            </View>
          ) : null}

          {conversation?.parcelRequest ? (
            <View
              style={[
                styles.contextBanner,
                { backgroundColor: contextBackgroundColor, borderBottomColor: contextBorderColor },
              ]}
            >
              <ThemedText style={styles.contextText}>
                Parcel: {conversation.parcelRequest.itemType} ({conversation.parcelRequest.fromCountry} ➡️{' '}
                {conversation.parcelRequest.toCountry})
              </ThemedText>
            </View>
          ) : null}

          <FlatList
            ref={listRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => {
              if (isAtBottomRef.current) scrollToBottom(false);
            }}
            scrollEventThrottle={16}
            onScroll={(e) => {
              const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
              const paddingToBottom = 80;
              isAtBottomRef.current =
                layoutMeasurement.height + contentOffset.y >=
                contentSize.height - paddingToBottom;
            }}
          />

          <View
            style={[
              styles.composer,
              {
                borderTopColor: Colors[colorScheme ?? 'light'].border,
                paddingBottom: 10 + composerPaddingBottom,
                backgroundColor: Colors[colorScheme ?? 'light'].background,
              },
            ]}
          >
            <View style={[styles.composerInner, { borderColor: Colors[colorScheme ?? 'light'].border }]}>
              <TextInput
                style={[styles.input, { color: Colors[colorScheme ?? 'light'].text }]}
                value={inputText}
                onChangeText={(t) => {
                  setInputText(t);
                  if (isAtBottomRef.current) scrollToBottom(true);
                }}
                placeholder="Type a message..."
                placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
                multiline
                onFocus={() => scrollToBottom(true)}
              />
              <Pressable
                onPress={handleSend}
                disabled={!inputText.trim() || sending}
                style={({ pressed }) => [
                  styles.sendButton,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <IconSymbol
                  name="paperplane.fill"
                  size={22}
                  color={inputText.trim() ? Colors[colorScheme ?? 'light'].tint : Colors[colorScheme ?? 'light'].tabIconDefault}
                />
              </Pressable>
            </View>
          </View>
        </ThemedView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  composer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  composerInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: 24,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    maxHeight: 120,
    padding: 0,
    margin: 0,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextBanner: {
    padding: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  contextText: {
    fontSize: 12,
    color: '#888',
  },
});
