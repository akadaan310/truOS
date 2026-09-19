import type { ToolSpec } from '../tools/types';
import type { Agent, ChatMessage, ToolCall } from '../types/models';
import { AgentGateway, GatewayError, GatewayResult } from './types';

interface AnthropicContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
  is_error?: boolean;
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
}

/** Anthropic requires every tool_use in an assistant turn answered in ONE following user message
 * containing all the matching tool_result blocks — so consecutive 'tool' ChatMessages collapse
 * into a single message here rather than one message each. */
function toAnthropicMessages(history: ChatMessage[]): AnthropicMessage[] {
  const messages: AnthropicMessage[] = [];

  for (const m of history) {
    if (m.role === 'system') continue;

    if (m.role === 'user') {
      messages.push({ role: 'user', content: m.content });
      continue;
    }

    if (m.role === 'assistant') {
      const blocks: AnthropicContentBlock[] = [];
      if (m.content) blocks.push({ type: 'text', text: m.content });
      for (const call of m.toolCalls ?? []) {
        blocks.push({ type: 'tool_use', id: call.id, name: call.name, input: call.arguments });
      }
      messages.push({ role: 'assistant', content: blocks.length > 0 ? blocks : m.content });
      continue;
    }

    if (m.role === 'tool') {
      const block: AnthropicContentBlock = {
        type: 'tool_result',
        tool_use_id: m.toolCallId,
        content: m.content,
        is_error: m.isError,
      };
      const last = messages[messages.length - 1];
      if (last?.role === 'user' && Array.isArray(last.content) && last.content[0]?.type === 'tool_result') {
        last.content.push(block);
      } else {
        messages.push({ role: 'user', content: [block] });
      }
    }
  }

  return messages;
}

function toAnthropicTools(tools: ToolSpec[]) {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters,
  }));
}

/** Speaks the Anthropic Messages API (`POST /v1/messages`), including tool use. */
export const anthropicGateway: AgentGateway = {
  supportsTools: true,

  async sendMessage(
    agent: Agent,
    secret: string | null,
    history: ChatMessage[],
    tools: ToolSpec[],
  ): Promise<GatewayResult> {
    if (!secret) throw new GatewayError(`No API key configured for ${agent.name}`);

    const body: Record<string, unknown> = {
      model: agent.model || 'claude-sonnet-5',
      max_tokens: 2048,
      messages: toAnthropicMessages(history),
    };
    if (agent.systemPrompt) body.system = agent.systemPrompt;
    if (tools.length > 0) body.tools = toAnthropicTools(tools);

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
    const blocks: AnthropicContentBlock[] = Array.isArray(json.content) ? json.content : [];

    const replyText = blocks
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('');

    const toolCalls: ToolCall[] = blocks
      .filter((b) => b.type === 'tool_use')
      .map((b) => ({ id: b.id ?? '', name: b.name ?? '', arguments: b.input ?? {} }));

    return { text: replyText, toolCalls };
  },
};
