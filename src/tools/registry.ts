import type { Agent } from '../types/models';
import type { Tool } from './types';

const registry = new Map<string, Tool>();

/** Called once per tool module at import time — see `src/tools/builtins/index.ts`. */
export function registerTool(tool: Tool): void {
  registry.set(tool.spec.name, tool);
}

export function getTool(name: string): Tool | undefined {
  return registry.get(name);
}

export function getAllTools(): Tool[] {
  return Array.from(registry.values());
}

/** The exposure layer: only the tools this agent has explicitly turned on. */
export function getExposedTools(agent: Agent): Tool[] {
  const enabled = new Set(agent.enabledTools ?? []);
  if (enabled.size === 0) return [];
  return getAllTools().filter((tool) => enabled.has(tool.spec.name));
}
