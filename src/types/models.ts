/**
 * The wire protocol an agent speaks. Each value maps to one gateway adapter in
 * `src/gateways` that knows how to turn a conversation into that protocol's request shape.
 */
export type ProviderType = 'ANTHROPIC' | 'OPENAI_COMPATIBLE' | 'HERMES' | 'CUSTOM_WEBHOOK';

export const PROVIDER_TYPES: ProviderType[] = [
  'ANTHROPIC',
  'OPENAI_COMPATIBLE',
  'HERMES',
  'CUSTOM_WEBHOOK',
];

export const PROVIDER_LABELS: Record<ProviderType, string> = {
  ANTHROPIC: 'Anthropic (Claude)',
  OPENAI_COMPATIBLE: 'OpenAI-compatible',
  HERMES: 'Hermes agent',
  CUSTOM_WEBHOOK: 'Custom webhook',
};

export type AuthKind = 'API_KEY' | 'BEARER_TOKEN' | 'OAUTH_SESSION' | 'NONE';

export const AUTH_KINDS: AuthKind[] = ['API_KEY', 'BEARER_TOKEN', 'OAUTH_SESSION', 'NONE'];

export const AUTH_KIND_LABELS: Record<AuthKind, string> = {
  API_KEY: 'API key',
  BEARER_TOKEN: 'Bearer / session token',
  OAUTH_SESSION: 'OAuth session',
  NONE: 'No auth',
};

/**
 * One saved login. The secret itself never lives here — it's kept only in
 * `src/storage/secureVault.ts` (Keychain / Android Keystore backed), addressed by `id`. This
 * record is just the metadata needed to display and manage it, so it's safe to keep in plain
 * AsyncStorage.
 */
export interface CredentialGroup {
  id: string;
  displayName: string;
  authKind: AuthKind;
  createdAtEpochMs: number;
  expiresAtEpochMs?: number;
  lastRefreshedEpochMs?: number;
}

/**
 * One configured agent endpoint. Multiple agents may share the same `credentialGroupId` so a
 * single sign-in is reused across all of them — that sharing is the whole point of the hub.
 *
 * `enabledTools` is the *exposure* layer on top of the harness's tool *registry*
 * (`src/tools/registry.ts`): every tool that exists is registered globally, but only the names
 * listed here are ever described to this agent's model or dispatched on its behalf. An agent
 * with no `enabledTools` gets no tools at all — tool use is strictly opt-in per agent.
 */
export interface Agent {
  id: string;
  name: string;
  providerType: ProviderType;
  baseUrl: string;
  model?: string;
  systemPrompt?: string;
  credentialGroupId?: string;
  createdAtEpochMs: number;
  enabledTools?: string[];
  autoApproveTools?: boolean;
}

export type ConnectionStatus = 'CONNECTED' | 'NO_CREDENTIAL' | 'EXPIRED' | 'ERROR' | 'UNKNOWN';

/**
 * A persistent in-app browser tab — how you sign into a web-only AI product (ChatGPT, Claude.ai,
 * Perplexity, anything without a public API) instead of an API key. The WebView's own cookie
 * jar holds the actual session; this record is just the label, home URL, and which credential
 * group it's filed under for organization. It never captures or exposes the site's session
 * cookie/token to the rest of the app — that stays inside the WebView, exactly as it would in a
 * normal mobile browser tab.
 */
export interface BrowserProfile {
  id: string;
  name: string;
  homeUrl: string;
  credentialGroupId?: string;
  createdAtEpochMs: number;
  lastOpenedAtEpochMs?: number;
  lastUrl?: string;
}

export interface BrowserPreset {
  name: string;
  homeUrl: string;
}

export const BROWSER_PRESETS: BrowserPreset[] = [
  { name: 'ChatGPT', homeUrl: 'https://chatgpt.com' },
  { name: 'Claude.ai', homeUrl: 'https://claude.ai' },
  { name: 'Perplexity', homeUrl: 'https://www.perplexity.ai' },
  { name: 'Gemini', homeUrl: 'https://gemini.google.com' },
];

export type ChatRole = 'user' | 'assistant' | 'system' | 'tool';

/** One tool invocation the model asked for, attached to the assistant turn that requested it. */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  agentId: string;
  role: ChatRole;
  /** Assistant text, user text, or (for role 'tool') the tool's result rendered as text. */
  content: string;
  timestampEpochMs: number;
  isError?: boolean;
  /** Present on an assistant message that requested one or more tool calls. */
  toolCalls?: ToolCall[];
  /** Present on a 'tool' role message: which call (by id) this is the result of. */
  toolCallId?: string;
  toolName?: string;
  /** Present on a 'tool' role message awaiting the user's decision before the loop continues. */
  pendingApproval?: boolean;
  /** Present on a 'tool' role message whose result the UI can act on, e.g. open a browser tab. */
  toolUiAction?: { type: 'open_browser'; profileId: string };
}
