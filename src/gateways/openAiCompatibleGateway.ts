import type { ToolSpec } from '../tools/types';
import type { Agent, ChatMessage, ToolCall } from '../types/models';
import { AgentGateway, GatewayError, GatewayResult } from './types';

interface OpenAiToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

interface OpenAiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: OpenAiToolCall[];
  tool_call_id?: string;
}

function toOpenAiMessages(agent: Agent, history: ChatMessage[]): OpenAiMessage[] {
  const messages: OpenAiMessage[] = [];
  if (agent.systemPrompt) messages.push({ role: 'system', content: agent.systemPrompt });

  for (const m of history) {
    if (m.role === 'user') {
      messages.push({ role: 'user', content: m.content });
    } else if (m.role === 'assistant') {
      messages.push({
        role: 'assistant',
        content: m.content || null,
        tool_calls: m.toolCalls?.map((call) => ({
          id: call.id,
          type: 'function',
          function: { name: call.name, arguments: JSON.stringify(call.arguments) },
        })),
      });
    } else if (m.role === 'tool') {
      messages.push({ role: 'tool', content: m.content, tool_call_id: m.toolCallId });
    }
  }
  return messages;
}

function toOpenAiTools(tools: ToolSpec[]) {
  return tools.map((tool) => ({
    type: 'function' as const,
    function: { name: tool.name, description: tool.description, parameters: tool.parameters },
  }));
}

/**
 * Speaks the `POST /chat/completions` shape used by OpenAI and the many local runtimes that
 * mimic it (vLLM, LM Studio, Ollama's OpenAI-compat endpoint, etc.), including tool calling.
 */
export const openAiCompatibleGateway: AgentGateway = {
  supportsTools: true,

  async sendMessage(
    agent: Agent,
    secret: string | null,
    history: ChatMessage[],
    tools: ToolSpec[],
  ): Promise<GatewayResult> {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (secret) headers.Authorization = `Bearer ${secret}`;

    const body: Record<string, unknown> = {
      model: agent.model || 'gpt-4o-mini',
      messages: toOpenAiMessages(agent, history),
    };
    if (tools.length > 0) body.tools = toOpenAiTools(tools);

    const response = await fetch(`${agent.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new GatewayError(`Server error ${response.status}: ${text}`);
    }

    const json = JSON.parse(text);
    const message = json.choices?.[0]?.message ?? {};

    const toolCalls: ToolCall[] = (message.tool_calls ?? []).map((call: OpenAiToolCall) => {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments);
      } catch {
        // leave args empty if the model returned malformed JSON
      }
      return { id: call.id, name: call.function.name, arguments: args };
    });

    return { text: message.content ?? '', toolCalls };
  },
};
