import type { Agent } from '../types/models';

/** JSON Schema subset good enough for describing tool parameters to a model provider. */
export interface ToolParameterSchema {
  type: 'object';
  properties: Record<
    string,
    { type: 'string' | 'number' | 'boolean'; description?: string; enum?: string[] }
  >;
  required?: string[];
}

/** What a gateway sends a model provider so it knows a tool exists and how to call it. */
export interface ToolSpec {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
}

export type ToolRiskLevel = 'safe' | 'sensitive';

export interface ToolExecutionContext {
  /** The agent whose turn is invoking the tool — for self-delegation guards, memory scoping, etc. */
  callingAgent: Agent;
}

export interface ToolResult {
  ok: boolean;
  /** Text handed back to the model as the tool result. Keep it short — it re-enters the prompt. */
  content: string;
  /** Optional structured hint the UI can act on (e.g. a browser profile id to offer opening). */
  uiAction?: { type: 'open_browser'; profileId: string };
}

/**
 * One capability the harness can expose to an agent. Tools register into a single global
 * registry (`src/tools/registry.ts`) at import time; a *separate* per-agent `enabledTools` list
 * decides what any given run actually gets described and allowed to call — the same
 * registration/exposure split used by Hermes Agent and OpenClaw's harnesses, so a broad tool
 * library doesn't force every agent to see (or pay context tokens for) all of it.
 */
export interface Tool {
  spec: ToolSpec;
  riskLevel: ToolRiskLevel;
  execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolResult>;
}
