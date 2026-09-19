import { agentStore } from '../../storage/metadataStore';
import { sessionManager } from '../../storage/sessionManager';
import { PROVIDER_LABELS } from '../../types/models';
import type { Tool } from '../types';

export const listAgentsTool: Tool = {
  spec: {
    name: 'list_agents',
    description:
      "List every agent configured in this hub — name, provider, and whether it's currently " +
      'connected. Use this before delegate_to_agent to find the right agent name.',
    parameters: { type: 'object', properties: {} },
  },
  riskLevel: 'safe',
  async execute(_args, context) {
    const agents = await agentStore.getAll();
    const lines = await Promise.all(
      agents.map(async (agent) => {
        const status = await sessionManager.statusFor(agent);
        const self = agent.id === context.callingAgent.id ? ' (you)' : '';
        return `- ${agent.name}${self}: ${PROVIDER_LABELS[agent.providerType]}, ${status.toLowerCase()}`;
      }),
    );
    return {
      ok: true,
      content: lines.length > 0 ? lines.join('\n') : 'No other agents are configured in this hub yet.',
    };
  },
};
