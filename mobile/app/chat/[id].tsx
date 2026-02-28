import { StyleSheet, FlatList, TextInput, KeyboardAvoidingView, Platform, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { apiClient, Message } from '@/api/client';
import { connectSocket, getSocket } from '@/api/socket';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const conversationId = Array.isArray(id) ? id[0] : id;
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: 'Chat' });
    
    const init = async () => {
      try {
        const [me, msgs] = await Promise.all([
          apiClient.getMe(),
          apiClient.getMessages(conversationId),
        ]);
        setMyId(me.id);
        // msgs is oldest to newest. Inverted FlatList needs newest first (index 0).
        // So we reverse it.
        setMessages([...msgs].reverse()); 
        
        // Connect socket
        const socket = await connectSocket();
        if (socket) {
          socket.on('newMessage', (msg: Message) => {
            if (msg.conversationId === conversationId) {
              setMessages((prev) => [msg, ...prev]);
            }
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    init();

    return () => {
      const socket = getSocket();
      if (socket) {
        socket.off('newMessage');
      }
    };
  }, [conversationId]);

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;
    
    setSending(true);
    const content = inputText.trim();
    setInputText('');
    
    try {
      const msg = await apiClient.sendMessage(conversationId, content);
      setMessages((prev) => [msg, ...prev]);
    } catch (e) {
      console.error(e);
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
        { backgroundColor: isMe ? Colors[colorScheme ?? 'light'].tint : '#e5e5ea' }
      ]}>
        <ThemedText style={{ color: isMe ? '#fff' : '#000' }}>{item.content}</ThemedText>
        <ThemedText style={[styles.timestamp, { color: isMe ? '#eee' : '#666' }]}>
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

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ThemedView style={styles.container}>
        <FlatList
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles.listContent}
        />
        <View style={[styles.inputContainer, { borderTopColor: Colors[colorScheme ?? 'light'].icon }]}>
          <TextInput
            style={[styles.input, { color: Colors[colorScheme ?? 'light'].text, borderColor: Colors[colorScheme ?? 'light'].icon }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            multiline
          />
          <TouchableOpacity onPress={handleSend} disabled={!inputText.trim() || sending} style={styles.sendButton}>
            <IconSymbol name="paperplane.fill" size={24} color={inputText.trim() ? Colors[colorScheme ?? 'light'].tint : '#ccc'} />
          </TouchableOpacity>
        </View>
      </ThemedView>
    </KeyboardAvoidingView>
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
    padding: 16,
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
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    padding: 8,
  },
});
