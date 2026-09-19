import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusChip } from '../components/StatusChip';
import { useChat } from '../hooks/useChat';
import { agentStore } from '../storage/metadataStore';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import type { Agent, ChatMessage } from '../types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export function ChatScreen({ navigation, route }: Props) {
  const { agentId } = route.params;
  const [agent, setAgent] = useState<Agent | undefined>(undefined);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    agentStore.getById(agentId).then(setAgent);
  }, [agentId]);

  const { messages, status, isSending, pending, sendMessage, resolvePendingTool, clearHistory } = useChat(agent);

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages.length]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerAction}>Back</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>{agent?.name ?? 'Agent'}</Text>
          <StatusChip status={status} />
        </View>
        <TouchableOpacity
          onPress={() =>
            Alert.alert('Clear history?', 'This deletes this chat locally.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: clearHistory },
            ])
          }
        >
          <Text style={[styles.headerAction, styles.clearAction]}>Clear</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messages}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isPending={pending?.messageId === item.id}
            onApprove={() => resolvePendingTool(true)}
            onDeny={() => resolvePendingTool(false)}
            onOpenBrowser={(profileId) => navigation.navigate('Browser', { profileId })}
          />
        )}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Message this agent…"
          placeholderTextColor={colors.textMuted}
          multiline
          editable={!pending}
        />
        {isSending ? (
          <ActivityIndicator color={colors.primary} style={styles.sendButton} />
        ) : (
          <TouchableOpacity
            style={[styles.sendButton, !!pending && styles.sendButtonDisabled]}
            disabled={!!pending}
            onPress={() => {
              const text = draft;
              setDraft('');
              sendMessage(text);
            }}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({
  message,
  isPending,
  onApprove,
  onDeny,
  onOpenBrowser,
}: {
  message: ChatMessage;
  isPending: boolean;
  onApprove: () => void;
  onDeny: () => void;
  onOpenBrowser: (profileId: string) => void;
}) {
  if (message.role === 'tool') {
    return (
      <View style={styles.toolRow}>
        <View style={[styles.toolPill, message.isError && styles.toolPillError]}>
          <Text style={styles.toolPillLabel}>🔧 {message.toolName}</Text>
          <Text style={styles.toolPillContent}>{message.content}</Text>
          {isPending && (
            <View style={styles.toolApprovalRow}>
              <TouchableOpacity style={styles.approveButton} onPress={onApprove}>
                <Text style={styles.approveButtonText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.denyButton} onPress={onDeny}>
                <Text style={styles.denyButtonText}>Deny</Text>
              </TouchableOpacity>
            </View>
          )}
          {message.toolUiAction?.type === 'open_browser' && (
            <TouchableOpacity
              style={styles.openBrowserButton}
              onPress={() => onOpenBrowser(message.toolUiAction!.profileId)}
            >
              <Text style={styles.openBrowserButtonText}>Open browser ›</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  const isUser = message.role === 'user';
  const isToolRequest = message.role === 'assistant' && (message.toolCalls?.length ?? 0) > 0;

  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAgent,
          message.isError && styles.bubbleError,
        ]}
      >
        {!!message.content && <Text style={styles.bubbleText}>{message.content}</Text>}
        {isToolRequest && (
          <Text style={styles.toolRequestText}>
            🔧 calling {message.toolCalls!.map((c) => c.name).join(', ')}…
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  headerAction: { fontSize: 15, color: colors.textMuted },
  clearAction: { color: colors.danger },
  messages: { padding: 16, paddingBottom: 20 },
  bubbleRow: { width: '100%', marginBottom: 10, alignItems: 'flex-start' },
  bubbleRowUser: { alignItems: 'flex-end' },
  bubble: { maxWidth: '80%', borderRadius: 16, padding: 12 },
  bubbleUser: { backgroundColor: colors.primaryContainer },
  bubbleAgent: { backgroundColor: colors.surfaceVariant },
  bubbleError: { backgroundColor: '#3A1F1F' },
  bubbleText: { color: colors.text, fontSize: 15, lineHeight: 20 },
  toolRequestText: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic', marginTop: 4 },
  toolRow: { width: '100%', marginBottom: 10, alignItems: 'flex-start' },
  toolPill: {
    maxWidth: '90%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
  },
  toolPillError: { borderColor: colors.danger },
  toolPillLabel: { color: colors.secondary, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  toolPillContent: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  toolApprovalRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  approveButton: { backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6 },
  approveButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  denyButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  denyButtonText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
  openBrowserButton: { marginTop: 10 },
  openBrowserButtonText: { color: colors.secondary, fontWeight: '700', fontSize: 13 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
    maxHeight: 120,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { opacity: 0.4 },
  sendButtonText: { color: '#fff', fontWeight: '700' },
});
