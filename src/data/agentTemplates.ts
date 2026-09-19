import type { ProviderType } from '../types/models';

export interface AgentTemplate {
  id: string;
  label: string;
  description: string;
  providerType: ProviderType;
  baseUrl: string;
  model?: string;
  systemPrompt?: string;
  enabledTools: string[];
}

/**
 * Ready-to-go agent configs so the hub isn't a blank list on first launch — pick one, drop in a
 * credential, and it's live. None of these embed a real key (that's impossible to ship safely);
 * they're just sensible defaults for provider, base URL, model, and which tools make sense for
 * that kind of agent.
 */
export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'claude',
    label: 'Claude',
    description: "Anthropic's Messages API. Needs an Anthropic API key in the Vault.",
    providerType: 'ANTHROPIC',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-sonnet-5',
    systemPrompt:
      'You are a capable assistant with access to this hub\'s tools. Use them when they ' +
      'actually help — to check on other agents, delegate a sub-task, or remember something ' +
      'for next time — otherwise just answer directly.',
    enabledTools: ['list_agents', 'delegate_to_agent', 'remember', 'recall', 'open_browser_tab'],
  },
  {
    id: 'gpt',
    label: 'GPT',
    description: 'Any OpenAI-compatible endpoint — OpenAI, vLLM, LM Studio, Ollama, etc.',
    providerType: 'OPENAI_COMPATIBLE',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    enabledTools: ['list_agents', 'delegate_to_agent', 'remember', 'recall', 'open_browser_tab'],
  },
  {
    id: 'hermes',
    label: 'Local Hermes agent',
    description: 'A self-hosted Hermes-style agent — point the base URL at wherever it runs.',
    providerType: 'HERMES',
    baseUrl: 'http://localhost:8000',
    enabledTools: ['list_agents', 'delegate_to_agent', 'fetch_url', 'remember', 'recall'],
  },
  {
    id: 'webhook',
    label: 'Custom webhook',
    description: 'Any HTTP endpoint that accepts { "message": "..." } and replies with text.',
    providerType: 'CUSTOM_WEBHOOK',
    baseUrl: 'https://',
    enabledTools: [],
  },
];
