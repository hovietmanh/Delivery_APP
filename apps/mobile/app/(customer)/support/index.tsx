import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useState, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { chatApi, ChatMessage } from '@services/chat.api';
import { Colors } from '@constants/Colors';
import { Typography, Layout, Shadow } from '@constants/Layout';

const SUGGESTIONS = [
  'Giá gửi hàng từ Hà Nội vào HCM?',
  'Chính sách bồi thường hàng hỏng?',
  'Cách đóng gói hàng dễ vỡ?',
  'Tra cứu đơn hàng của tôi',
];

type Msg = ChatMessage & { id: string };

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'Xin chào! Tôi là trợ lý LT-Move. Tôi có thể giúp bạn tra cứu giá cước, tuyến xe, trạng thái đơn hàng và giải đáp các thắc mắc về dịch vụ. Bạn cần hỗ trợ gì?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const sendMessage = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;

    const userMsg: Msg = { id: Date.now().toString(), role: 'user', content };
    const history: ChatMessage[] = messages.map(({ role, content }) => ({ role, content }));

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const reply = await chatApi.send(content, history);
      const botMsg: Msg = { id: (Date.now() + 1).toString(), role: 'assistant', content: reply };
      setMessages(prev => [...prev, botMsg]);
    } catch {
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.' },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderMessage = ({ item }: { item: Msg }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
        {!isUser && (
          <View style={styles.avatar}>
            <Ionicons name="headset" size={16} color={Colors.blue} />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.botAvatar}>
              <Ionicons name="headset" size={20} color={Colors.white} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Hỗ trợ LT-Move</Text>
              <View style={styles.onlineRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Trả lời tức thì</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Loading indicator */}
        {loading && (
          <View style={styles.typingRow}>
            <View style={styles.avatar}>
              <Ionicons name="headset" size={16} color={Colors.blue} />
            </View>
            <View style={styles.typingBubble}>
              <ActivityIndicator size="small" color={Colors.blue} />
              <Text style={styles.typingText}>Đang trả lời...</Text>
            </View>
          </View>
        )}

        {/* Suggestions (only when no conversation yet) */}
        {messages.length === 1 && (
          <View style={styles.suggestions}>
            {SUGGESTIONS.map(s => (
              <TouchableOpacity key={s} style={styles.chip} onPress={() => sendMessage(s)}>
                <Text style={styles.chipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Input */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={styles.textInput}
            placeholder="Nhập câu hỏi..."
            placeholderTextColor={Colors.placeholder}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(input)}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || loading}
          >
            <Ionicons name="send" size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, paddingHorizontal: Layout.padding, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border, ...Shadow.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  botAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { ...Typography.bodyBold, color: Colors.dark },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.success },
  onlineText: { ...Typography.caption, color: Colors.success },

  msgList: { padding: Layout.padding, gap: 12 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '85%' },
  msgRowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },

  avatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.infoBg, alignItems: 'center', justifyContent: 'center',
  },
  bubble: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 18, maxWidth: '100%',
  },
  bubbleBot: {
    backgroundColor: Colors.white, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  bubbleUser: { backgroundColor: Colors.blue, borderBottomRightRadius: 4 },
  bubbleText: { ...Typography.body, color: Colors.dark, lineHeight: 20 },
  bubbleTextUser: { color: Colors.white },

  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Layout.padding, marginBottom: 8 },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderBottomLeftRadius: 4,
  },
  typingText: { ...Typography.small, color: Colors.secondary },

  suggestions: { paddingHorizontal: Layout.padding, paddingBottom: 8, gap: 8 },
  chip: {
    alignSelf: 'flex-start', backgroundColor: Colors.infoBg,
    borderWidth: 1, borderColor: Colors.blue + '40',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  chipText: { ...Typography.small, color: Colors.blue },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    backgroundColor: Colors.white, paddingHorizontal: Layout.padding, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: Colors.border, ...Shadow.sm,
  },
  textInput: {
    flex: 1, ...Typography.body, color: Colors.primary,
    backgroundColor: Colors.inputBg, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    maxHeight: 100, minHeight: 44,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.border },
});
