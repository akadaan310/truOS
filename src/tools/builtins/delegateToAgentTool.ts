import { gatewayFor } from '../../gateways/gatewayFactory';
import { GatewayError } from '../../gateways/types';
import { agentStore } from '../../storage/metadataStore';
import { sessionManager } from '../../storage/sessionManager';
import type { ChatMessage } from '../../types/models';
import type { Tool } from '../types';

/**
 * The multi-agent-hub payoff of the harness: one agent can hand a sub-task to another
 * configured agent and use its answer. This is a single, isolated exchange — it calls the
 * target's gateway directly rather than the harness loop, so the delegate never gets tools of
 * its own and can't delegate again. That one-hop cap is the whole guard against agents calling
 * agents calling agents.
 */
export const delegateToAgentTool: Tool = {
  spec: {
    name: 'delegate_to_agent',
    description:
      'Send a message to a different agent configured in this hub and get its reply back. ' +
      'Use list_agents first to see valid agent names. The target agent answers in isolation — ' +
      "it can't use tools or delegate further.",
    parameters: {
      type: 'object',
      properties: {
        agentName: { type: 'string', description: 'Exact name of the agent to delegate to.' },
        message: { type: 'string', description: 'The message to send it.' },
      },
      required: ['agentName', 'message'],
    },
  },
  riskLevel: 'sensitive',
  async execute(args, context) {
    const agentName = String(args.agentName ?? '').trim();
    const message = String(args.message ?? '').trim();
    if (!agentName || !message) {
      return { ok: false, content: 'agentName and message are both required.' };
    }

    const allAgents = await agentStore.getAll();
    const target = allAgents.find((a) => a.name.toLowerCase() === agentName.toLowerCase());
    if (!target) {
      return { ok: false, content: `No agent named "${agentName}" is configured in this hub.` };
    }
    if (target.id === context.callingAgent.id) {
      return { ok: false, content: 'An agent cannot delegate to itself.' };
    }

    const secret = await sessionManager.resolveSecret(target);
    const gateway = gatewayFor(target.providerType);
    const oneShotHistory: ChatMessage[] = [
      {
        id: 'delegate',
        agentId: target.id,
        role: 'user',
        content: message,
        timestampEpochMs: Date.now(),
      },
    ];

    try {
      const result = await gateway.sendMessage(target, secret, oneShotHistory, []);
      return { ok: true, content: result.text || '(empty reply)' };
    } catch (error) {
      const detail = error instanceof GatewayError ? error.message : String(error);
      return { ok: false, content: `${target.name} failed to respond: ${detail}` };
    }
  },
};
