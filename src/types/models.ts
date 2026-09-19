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
}

export type ConnectionStatus = 'CONNECTED' | 'NO_CREDENTIAL' | 'EXPIRED' | 'ERROR' | 'UNKNOWN';

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  agentId: string;
  role: ChatRole;
  content: string;
  timestampEpochMs: number;
  isError?: boolean;
}
