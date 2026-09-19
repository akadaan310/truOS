import type { ToolSpec } from '../tools/types';
import type { Agent, ChatMessage, ToolCall } from '../types/models';

export interface GatewayResult {
  text: string;
  toolCalls: ToolCall[];
}

/**
 * Adapter that knows how to speak one agent protocol. The harness (`src/harness/agentLoop.ts`)
 * never builds an HTTP request itself — it hands a conversation and the agent's exposed tool
 * list to a gateway and gets back text and/or tool calls, so adding a new kind of agent means
 * adding one new gateway and a `ProviderType` entry, nothing else.
 */
export interface AgentGateway {
  /** Whether this protocol can carry `tools`/`tool_calls` at all — gates the harness's tool loop. */
  supportsTools: boolean;
  sendMessage(
    agent: Agent,
    secret: string | null,
    history: ChatMessage[],
    tools: ToolSpec[],
  ): Promise<GatewayResult>;
}

export class GatewayError extends Error {}
