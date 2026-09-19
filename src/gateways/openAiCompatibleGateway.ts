import type { Agent, ChatMessage } from '../types/models';
import { AgentGateway, GatewayError } from './types';

/**
 * Speaks the `POST /chat/completions` shape used by OpenAI and the many local runtimes that
 * mimic it (vLLM, LM Studio, Ollama's OpenAI-compat endpoint, etc.).
 */
export const openAiCompatibleGateway: AgentGateway = {
  async sendMessage(agent: Agent, secret: string | null, history: ChatMessage[]): Promise<string> {
    const messages: { role: string; content: string }[] = [];
    if (agent.systemPrompt) messages.push({ role: 'system', content: agent.systemPrompt });
    messages.push(...history.map((m) => ({ role: m.role, content: m.content })));

    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (secret) headers.Authorization = `Bearer ${secret}`;

    const response = await fetch(`${agent.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: agent.model || 'gpt-4o-mini', messages }),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new GatewayError(`Server error ${response.status}: ${text}`);
    }

    const json = JSON.parse(text);
    return json.choices?.[0]?.message?.content ?? '';
  },
};
