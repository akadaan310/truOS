import type { Agent, ChatMessage } from '../types/models';
import { AgentGateway, GatewayError } from './types';

/** Speaks the Anthropic Messages API (`POST /v1/messages`). */
export const anthropicGateway: AgentGateway = {
  async sendMessage(agent: Agent, secret: string | null, history: ChatMessage[]): Promise<string> {
    if (!secret) throw new GatewayError(`No API key configured for ${agent.name}`);

    const body: Record<string, unknown> = {
      model: agent.model || 'claude-sonnet-5',
      max_tokens: 2048,
      messages: history
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
    };
    if (agent.systemPrompt) body.system = agent.systemPrompt;

    const response = await fetch(`${agent.baseUrl.replace(/\/$/, '')}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': secret,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new GatewayError(`Anthropic error ${response.status}: ${text}`);
    }

    const json = JSON.parse(text);
    const content = Array.isArray(json.content) ? json.content : [];
    return content.map((block: { text?: string }) => block.text ?? '').join('');
  },
};
