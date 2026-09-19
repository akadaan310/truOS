# truOS Hub

A React Native (Expo) app that acts as a single interface center for multiple
AI agents — Claude, Hermes-family agents, any OpenAI-compatible or custom
webhook agent, and web-only products like ChatGPT/Claude.ai/Perplexity via
an in-app browser — with **shared sessions**: log a credential in once, and
every agent configured to use it reuses that same session instead of asking
you to sign in again.

## Core idea

Two concepts drive everything else:

- **Agent** — one configured endpoint: a name, a provider protocol, a base
  URL, an optional model/system prompt, and (optionally) a credential group
  it authenticates with.
- **Credential group** — one saved login (API key, bearer/session token, or
  OAuth session). Any number of agents can point at the same credential
  group, so rotating or revoking it in one place immediately applies to
  every agent that shares it.

Secrets are never stored alongside agent/credential metadata. Metadata
(`src/storage/metadataStore.ts`, backed by AsyncStorage) is plain JSON and
safe to inspect; the actual secret material lives only in
`src/storage/secureVault.ts`, which wraps `expo-secure-store` — the platform
keystore/Keychain — keyed by credential group id.

## Architecture

```
App.tsx              Navigation container + gesture/safe-area providers
src/
  types/models.ts     Domain types: Agent, CredentialGroup, ChatMessage, ...
  storage/
    metadataStore.ts  Agent + credential *metadata* only, never secrets (AsyncStorage)
    secureVault.ts    Encrypted secret storage (expo-secure-store)
    sessionManager.ts Resolves which secret an agent should use right now, and
                       its connection status (connected / no credential / expired)
  gateways/           One adapter per provider protocol:
    anthropicGateway.ts        Anthropic Messages API
    openAiCompatibleGateway.ts POST /chat/completions (OpenAI, vLLM, LM Studio,
                                Ollama's OpenAI-compat mode, ...)
    hermesGateway.ts           Lightweight JSON protocol for locally-hosted
                                Hermes-family agents
    customWebhookGateway.ts    Generic {"message": ...} -> reply
    gatewayFactory.ts          Picks the right adapter for an agent's providerType
  hooks/              useAgents, useCredentialGroups, useChat,
                       useBrowserProfiles — bridge storage + gateways to the screens
  navigation/          RootNavigator (React Navigation native-stack)
  screens/             DashboardScreen, AgentEditScreen, VaultScreen, ChatScreen,
                       BrowsersScreen, BrowserScreen
  components/          Shared UI (StatusChip, ...)
  theme/colors.ts      Color tokens
```

Adding a new kind of agent means adding one gateway module and a
`ProviderType` entry — the UI, storage, and vault-sharing logic need no
changes.

## Screens

- **Dashboard** — every configured agent with its live connection status.
- **Agent editor** — name, provider protocol, base URL, model, system
  prompt, and which shared credential (if any) to authenticate with.
- **Vault** — create/rotate/revoke shared credentials and see exactly which
  agents are currently relying on each one.
- **Chat** — a minimal per-agent chat, persisted locally so history survives
  app restarts, that calls the agent's gateway with the resolved shared
  secret on every send.
- **Browsers** — persistent in-app browser tabs (`react-native-webview`) for
  signing into web-only AI products that have no public API — ChatGPT,
  Claude.ai, Perplexity, Gemini, or anything else — with quick presets for
  the common ones. Each tab keeps its own login exactly the way a normal
  mobile browser tab would (the WebView's own cookie jar); a tab can
  optionally be filed under a credential group purely for organization, so
  the hub shows browser tabs and API-key agents that belong to the same
  identity next to each other.

  **Deliberate boundary:** this does *not* extract a signed-in tab's session
  cookie/token and replay it against a site's internal (non-public) API to
  drive it headlessly as an "agent." That would mean using a captured
  session outside the site's own interface — against most of these
  products' Terms of Service, and fragile since it breaks on any internal
  API change. The sanctioned way to let multiple agents share one login
  stays the Vault: paste an official API key/token once, point as many
  agents at it as you want.

## Running it

```
npm install
npm run start      # opens the Expo dev tools; scan the QR with Expo Go
npm run android     # requires an Android emulator/device or Expo Go
npm run ios         # requires macOS + Xcode, or Expo Go
npm run web         # runs in the browser
npm run typecheck   # tsc --noEmit
```

No native Android/iOS project is checked in — Expo generates those on demand
(`npx expo prebuild`) only if/when you need custom native modules or an
unmanaged build.

## Roadmap

This is a working foundation, not a finished product. Natural next steps:

- OAuth flows (device code / PKCE) feeding straight into `sessionManager`
  instead of manual API-key paste, with automatic refresh-token rotation.
- Streaming responses (SSE) instead of one-shot `fetch` calls.
- A proper "agent discovery" flow (QR/deep-link pairing) so a Hermes agent
  running on a LAN box can register itself with the hub.
- Per-agent tool/permission scoping now that multiple agents can share one
  identity.
- Biometric gate (expo-local-authentication) before revealing/rotating a
  vault secret.
- Per-tab "signed in" indicator in Browsers (heuristic only — presence of a
  known cookie name — never reading the token value).
- True multi-account isolation for two browser tabs on the *same* site
  needs a custom dev client with separate native WebView data stores; the
  managed/Expo-Go-compatible WebView shares one cookie jar per domain, which
  is fine for different services but not for two logins on one service.
