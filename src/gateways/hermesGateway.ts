import type { Agent, ChatMessage } from '../types/models';
import { AgentGateway, GatewayError } from './types';

/**
 * Speaks the lightweight JSON protocol used by locally-hosted Hermes-family agents:
 * `POST {baseUrl}/generate` with `{ session_token, prompt, history }` and a
 * `{ "response": "..." }` reply. The session token is the shared credential, so one Hermes
 * login covers every agent config pointed at that credential group.
 */
export const hermesGateway: AgentGateway = {
  async sendMessage(agent: Agent, secret: string | null, history: ChatMessage[]): Promise<string> {
    const lastUserMessage = [...history].reverse().find((m) => m.role === 'user')?.content ?? '';

    const body: Record<string, unknown> = {
      history: history.map((m) => ({ role: m.role, content: m.content })),
      prompt: lastUserMessage,
    };
    if (agent.model) body.agent = agent.model;
    if (agent.systemPrompt) body.system = agent.systemPrompt;
    if (secret) body.session_token = secret;

    const response = await fetch(`${agent.baseUrl.replace(/\/$/, '')}/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new GatewayError(`Hermes agent error ${response.status}: ${text}`);
    }

    try {
      const json = JSON.parse(text);
      return json.response ?? json.output ?? text;
    } catch {
      return text;
    }
  },
};
