import type { Agent, ChatMessage } from '../types/models';

/**
 * Adapter that knows how to speak one agent protocol. The rest of the app (chat screen, hooks)
 * never builds an HTTP request itself — it hands a conversation to a gateway and gets back plain
 * text, so adding a new kind of agent means adding one new gateway and a `ProviderType`
 * entry, nothing else.
 */
export interface AgentGateway {
  sendMessage(agent: Agent, secret: string | null, history: ChatMessage[]): Promise<string>;
}

export class GatewayError extends Error {}
