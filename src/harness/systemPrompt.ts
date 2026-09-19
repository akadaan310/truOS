import type { Tool } from '../tools/types';
import type { Agent } from '../types/models';

/**
 * Assembles the prompt the gateway actually sends, tiered the way Hermes Agent's harness does:
 * a stable identity/tool-guidance layer, then the agent's own project/persona instructions.
 * Tool descriptions are already sent structurally via each protocol's `tools` field — this text
 * layer is a second, provider-agnostic nudge, since not every backend (especially a
 * self-hosted Hermes-style one) reliably surfaces structured tool schemas into its own prompt.
 */
export function buildSystemPrompt(agent: Agent, exposedTools: Tool[]): string | undefined {
  const parts: string[] = [];

  if (exposedTools.length > 0) {
    const toolLines = exposedTools.map((tool) => `- ${tool.spec.name}: ${tool.spec.description}`);
    parts.push(
      [
        'You have access to the following tools. Call one only when it actually helps answer ' +
          'the current request — otherwise just respond normally in plain text.',
        ...toolLines,
      ].join('\n'),
    );
  }

  if (agent.systemPrompt) parts.push(agent.systemPrompt);

  return parts.length > 0 ? parts.join('\n\n') : undefined;
}
