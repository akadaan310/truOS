import type { ToolSpec } from '../tools/types';
import type { Agent, ChatMessage, ToolCall } from '../types/models';
import { generateId } from '../utils/id';
import { AgentGateway, GatewayError, GatewayResult } from './types';

/**
 * Speaks the lightweight JSON protocol used by locally-hosted Hermes-family agents:
 * `POST {baseUrl}/generate` with `{ session_token, prompt, history, tools }` and a
 * `{ "response": "...", "tool_calls"?: [{ "name": "...", "arguments": {...} }] }` reply. This is
 * our own convention (there's no single standard for self-hosted agents the way there is for
 * OpenAI/Anthropic) — a Hermes-style server opts into tool use simply by returning `tool_calls`
 * when it wants one; if it never does, it behaves exactly like a plain chat endpoint.
 */
export const hermesGateway: AgentGateway = {
  supportsTools: true,

  async sendMessage(
    agent: Agent,
    secret: string | null,
    history: ChatMessage[],
    tools: ToolSpec[],
  ): Promise<GatewayResult> {
    const lastUserMessage = [...history].reverse().find((m) => m.role === 'user')?.content ?? '';

    const body: Record<string, unknown> = {
      history: history
        .filter((m) => m.role === 'user' || m.role === 'assistant' || m.role === 'tool')
        .map((m) => ({ role: m.role, content: m.content, toolCallId: m.toolCallId })),
      prompt: lastUserMessage,
    };
    if (agent.model) body.agent = agent.model;
    if (agent.systemPrompt) body.system = agent.systemPrompt;
    if (secret) body.session_token = secret;
    if (tools.length > 0) body.tools = tools;

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
      const toolCalls: ToolCall[] = Array.isArray(json.tool_calls)
        ? json.tool_calls.map((call: { name: string; arguments?: Record<string, unknown> }) => ({
            id: generateId(),
            name: call.name,
            arguments: call.arguments ?? {},
          }))
        : [];
      return { text: json.response ?? json.output ?? '', toolCalls };
    } catch {
      return { text, toolCalls: [] };
    }
  },
};
