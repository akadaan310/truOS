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
  /** Whether `sendMessage`'s `onTextDelta` is honored for a live, token-by-token reply. */
  supportsStreaming: boolean;
  sendMessage(
    agent: Agent,
    secret: string | null,
    history: ChatMessage[],
    tools: ToolSpec[],
    /** Called with the accumulated text so far as it streams in. Only ever used when `tools` is
     * empty — the harness never streams a turn that could produce a tool call, to keep tool-call
     * accumulation simple and reliable. */
    onTextDelta?: (textSoFar: string) => void,
  ): Promise<GatewayResult>;
}

export class GatewayError extends Error {}
