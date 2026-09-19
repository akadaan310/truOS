import { useCallback, useEffect, useState } from 'react';
import { gatewayFor } from '../gateways/gatewayFactory';
import { GatewayError } from '../gateways/types';
import { chatStore } from '../storage/metadataStore';
import { sessionManager } from '../storage/sessionManager';
import type { Agent, ChatMessage, ConnectionStatus } from '../types/models';
import { generateId } from '../utils/id';

export function useChat(agent: Agent | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('UNKNOWN');
  const [isSending, setIsSending] = useState(false);

  const refreshMessages = useCallback(async () => {
    if (!agent) return;
    setMessages(await chatStore.getForAgent(agent.id));
  }, [agent]);

  useEffect(() => {
    refreshMessages();
    if (agent) {
      sessionManager.statusFor(agent).then(setStatus);
    }
  }, [agent, refreshMessages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!agent || !text.trim()) return;
      setIsSending(true);

      const userMessage: ChatMessage = {
        id: generateId(),
        agentId: agent.id,
        role: 'user',
        content: text.trim(),
        timestampEpochMs: Date.now(),
      };
      const historyWithUserMessage = await chatStore.append(userMessage);
      setMessages(historyWithUserMessage);

      const secret = await sessionManager.resolveSecret(agent);
      const gateway = gatewayFor(agent.providerType);

      let reply: ChatMessage;
      try {
        const replyText = await gateway.sendMessage(agent, secret, historyWithUserMessage);
        reply = {
          id: generateId(),
          agentId: agent.id,
          role: 'assistant',
          content: replyText,
          timestampEpochMs: Date.now(),
        };
      } catch (error) {
        const message =
          error instanceof GatewayError
            ? error.message
            : `Connection error: ${error instanceof Error ? error.message : String(error)}`;
        reply = {
          id: generateId(),
          agentId: agent.id,
          role: 'assistant',
          content: message,
          timestampEpochMs: Date.now(),
          isError: true,
        };
      }

      const finalHistory = await chatStore.append(reply);
      setMessages(finalHistory);
      setStatus(await sessionManager.statusFor(agent));
      setIsSending(false);
    },
    [agent],
  );

  const clearHistory = useCallback(async () => {
    if (!agent) return;
    await chatStore.clear(agent.id);
    setMessages([]);
  }, [agent]);

  return { messages, status, isSending, sendMessage, clearHistory };
}
