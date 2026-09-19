import type { Agent, ChatMessage } from '../types/models';
import { AgentGateway, GatewayError, GatewayResult } from './types';

/**
 * Fallback adapter for any agent that just wants `{ "message": "..." }` posted to its base URL
 * and either a raw text reply or `{ "reply": "..." }` back. Used for arbitrary automation
 * webhooks that don't speak one of the well-known protocols — there's no agreed tool-calling
 * shape for an arbitrary webhook, so this gateway never declares or parses tool calls; the
 * harness skips the tool loop entirely for `supportsTools: false` gateways.
 */
export const customWebhookGateway: AgentGateway = {
  supportsTools: false,

  async sendMessage(agent: Agent, secret: string | null, history: ChatMessage[]): Promise<GatewayResult> {
    const lastMessage = history[history.length - 1]?.content ?? '';

    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (secret) headers.Authorization = `Bearer ${secret}`;

    const response = await fetch(agent.baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message: lastMessage }),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new GatewayError(`Webhook error ${response.status}: ${text}`);
    }

    try {
      const json = JSON.parse(text);
      return { text: json.reply ?? text, toolCalls: [] };
    } catch {
      return { text, toolCalls: [] };
    }
  },
};
