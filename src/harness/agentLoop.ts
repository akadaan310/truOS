import { gatewayFor } from '../gateways/gatewayFactory';
import { GatewayError } from '../gateways/types';
import { sessionManager } from '../storage/sessionManager';
import { registerBuiltinTools } from '../tools/builtins';
import { getExposedTools, getTool } from '../tools/registry';
import type { Tool } from '../tools/types';
import type { Agent, ChatMessage, ToolCall } from '../types/models';
import { generateId } from '../utils/id';
import { buildSystemPrompt } from './systemPrompt';

// Tools register into the global registry once, the first time this module loads.
registerBuiltinTools();

const MAX_TOOL_ITERATIONS = 6;

export interface HarnessCallbacks {
  /** A new message was produced — persist it and render it. */
  onMessage: (message: ChatMessage) => Promise<void>;
  /** An earlier message (almost always a pending-approval one) was resolved in place. */
  onUpdateMessage: (messageId: string, patch: Partial<ChatMessage>) => Promise<void>;
}

export interface AgentTurnOutcome {
  /** Set when the loop stopped to wait on the user for a sensitive tool call. */
  pending?: { messageId: string; call: ToolCall };
}

function assistantMessage(agent: Agent, text: string, toolCalls?: ToolCall[], isError = false): ChatMessage {
  return {
    id: generateId(),
    agentId: agent.id,
    role: 'assistant',
    content: text,
    timestampEpochMs: Date.now(),
    toolCalls,
    isError,
  };
}

function toolMessage(
  agent: Agent,
  call: ToolCall,
  content: string,
  isError: boolean,
  pendingApproval = false,
  toolUiAction?: ChatMessage['toolUiAction'],
): ChatMessage {
  return {
    id: generateId(),
    agentId: agent.id,
    role: 'tool',
    content,
    timestampEpochMs: Date.now(),
    toolCallId: call.id,
    toolName: call.name,
    isError,
    pendingApproval,
    toolUiAction,
  };
}

async function executeToolCall(
  tool: Tool,
  call: ToolCall,
  agent: Agent,
): Promise<{ content: string; isError: boolean; toolUiAction?: ChatMessage['toolUiAction'] }> {
  try {
    const result = await tool.execute(call.arguments, { callingAgent: agent });
    return { content: result.content, isError: !result.ok, toolUiAction: result.uiAction };
  } catch (error) {
    return { content: `Tool "${call.name}" threw: ${error instanceof Error ? error.message : String(error)}`, isError: true };
  }
}

/**
 * The harness's outer loop: model call -> tool dispatch -> tool result appended -> repeat, the
 * same shape Hermes Agent and OpenClaw both use. A `sensitive`-risk tool with the agent's
 * `autoApproveTools` off pauses the loop and hands back a `pending` call instead of running it —
 * deny-by-default for anything that spends another agent's quota, hits the network, or has
 * side effects, mirroring both projects' permission layers.
 */
export async function runAgentTurn(
  agent: Agent,
  history: ChatMessage[],
  callbacks: HarnessCallbacks,
): Promise<AgentTurnOutcome> {
  const gateway = gatewayFor(agent.providerType);
  const exposedTools = gateway.supportsTools ? getExposedTools(agent) : [];
  const effectiveAgent: Agent = { ...agent, systemPrompt: buildSystemPrompt(agent, exposedTools) };
  const secret = await sessionManager.resolveSecret(agent);

  let workingHistory = history;

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    let result;
    try {
      result = await gateway.sendMessage(
        effectiveAgent,
        secret,
        workingHistory,
        exposedTools.map((t) => t.spec),
      );
    } catch (error) {
      const text =
        error instanceof GatewayError
          ? error.message
          : `Connection error: ${error instanceof Error ? error.message : String(error)}`;
      await callbacks.onMessage(assistantMessage(agent, text, undefined, true));
      return {};
    }

    if (result.toolCalls.length === 0) {
      await callbacks.onMessage(assistantMessage(agent, result.text));
      return {};
    }

    const turn = assistantMessage(agent, result.text, result.toolCalls);
    await callbacks.onMessage(turn);
    workingHistory = [...workingHistory, turn];

    for (const call of result.toolCalls) {
      const tool = getTool(call.name);

      if (!tool) {
        const message = toolMessage(agent, call, `Unknown tool "${call.name}".`, true);
        await callbacks.onMessage(message);
        workingHistory = [...workingHistory, message];
        continue;
      }

      if (tool.riskLevel === 'sensitive' && !agent.autoApproveTools) {
        const message = toolMessage(
          agent,
          call,
          `Waiting for approval to run ${call.name}(${JSON.stringify(call.arguments)}).`,
          false,
          true,
        );
        await callbacks.onMessage(message);
        return { pending: { messageId: message.id, call } };
      }

      const { content, isError, toolUiAction } = await executeToolCall(tool, call, agent);
      const message = toolMessage(agent, call, content, isError, false, toolUiAction);
      await callbacks.onMessage(message);
      workingHistory = [...workingHistory, message];
    }
  }

  await callbacks.onMessage(
    assistantMessage(agent, 'Stopped after too many tool calls in a row — ask again if you want to continue.', undefined, true),
  );
  return {};
}

/** Continues a turn that paused on `pending` once the user has approved or denied it. */
export async function resumeAgentTurn(
  agent: Agent,
  history: ChatMessage[],
  pending: { messageId: string; call: ToolCall },
  approved: boolean,
  callbacks: HarnessCallbacks,
): Promise<AgentTurnOutcome> {
  const tool = getTool(pending.call.name);

  let content: string;
  let isError: boolean;
  let toolUiAction: ChatMessage['toolUiAction'];
  if (!approved) {
    content = 'Denied by user.';
    isError = true;
  } else if (!tool) {
    content = `Unknown tool "${pending.call.name}".`;
    isError = true;
  } else {
    ({ content, isError, toolUiAction } = await executeToolCall(tool, pending.call, agent));
  }

  await callbacks.onUpdateMessage(pending.messageId, { content, isError, pendingApproval: false, toolUiAction });
  const resolved: ChatMessage = {
    id: pending.messageId,
    agentId: agent.id,
    role: 'tool',
    content,
    timestampEpochMs: Date.now(),
    toolCallId: pending.call.id,
    toolName: pending.call.name,
    isError,
    toolUiAction,
  };

  return runAgentTurn(agent, [...history, resolved], callbacks);
}
