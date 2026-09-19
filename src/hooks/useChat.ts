import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { runAgentTurn, resumeAgentTurn, type HarnessCallbacks } from '../harness/agentLoop';
import { chatStore } from '../storage/metadataStore';
import { sessionManager } from '../storage/sessionManager';
import type { Agent, ChatMessage, ConnectionStatus, ToolCall } from '../types/models';
import { generateId } from '../utils/id';

export function useChat(agent: Agent | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('UNKNOWN');
  const [isSending, setIsSending] = useState(false);
  const [pending, setPending] = useState<{ messageId: string; call: ToolCall } | undefined>(undefined);

  const setAll = useCallback((list: ChatMessage[]) => {
    messagesRef.current = list;
    setMessages(list);
  }, []);

  const refreshMessages = useCallback(async () => {
    if (!agent) return;
    setAll(await chatStore.getForAgent(agent.id));
  }, [agent, setAll]);

  useEffect(() => {
    refreshMessages();
    setPending(undefined);
    if (agent) sessionManager.statusFor(agent).then(setStatus);
  }, [agent, refreshMessages]);

  const callbacks: HarnessCallbacks = useMemo(
    () => ({
      onMessage: async (message) => {
        setAll(await chatStore.append(message));
      },
      onUpdateMessage: async (messageId, patch) => {
        if (!agent) return;
        setAll(await chatStore.update(agent.id, messageId, patch));
      },
    }),
    [agent, setAll],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!agent || !text.trim()) return;
      setIsSending(true);
      setPending(undefined);

      const userMessage: ChatMessage = {
        id: generateId(),
        agentId: agent.id,
        role: 'user',
        content: text.trim(),
        timestampEpochMs: Date.now(),
      };
      const historyWithUser = await chatStore.append(userMessage);
      setAll(historyWithUser);

      const outcome = await runAgentTurn(agent, historyWithUser, callbacks);
      setPending(outcome.pending);
      setStatus(await sessionManager.statusFor(agent));
      setIsSending(false);
    },
    [agent, callbacks, setAll],
  );

  const resolvePendingTool = useCallback(
    async (approved: boolean) => {
      if (!agent || !pending) return;
      setIsSending(true);

      const index = messagesRef.current.findIndex((m) => m.id === pending.messageId);
      const historyBeforePending = index >= 0 ? messagesRef.current.slice(0, index) : messagesRef.current;

      const outcome = await resumeAgentTurn(agent, historyBeforePending, pending, approved, callbacks);
      setPending(outcome.pending);
      setStatus(await sessionManager.statusFor(agent));
      setIsSending(false);
    },
    [agent, pending, callbacks],
  );

  const clearHistory = useCallback(async () => {
    if (!agent) return;
    await chatStore.clear(agent.id);
    setAll([]);
    setPending(undefined);
  }, [agent, setAll]);

  return { messages, status, isSending, pending, sendMessage, resolvePendingTool, clearHistory };
}
