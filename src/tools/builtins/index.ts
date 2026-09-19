import { registerTool } from '../registry';
import { delegateToAgentTool } from './delegateToAgentTool';
import { fetchUrlTool } from './fetchUrlTool';
import { listAgentsTool } from './listAgentsTool';
import { recallTool, rememberTool } from './memoryTools';
import { openBrowserTabTool } from './openBrowserTabTool';

/** Import this module once (from `src/harness/agentLoop.ts`) to populate the tool registry. */
export function registerBuiltinTools(): void {
  registerTool(listAgentsTool);
  registerTool(delegateToAgentTool);
  registerTool(fetchUrlTool);
  registerTool(rememberTool);
  registerTool(recallTool);
  registerTool(openBrowserTabTool);
}
