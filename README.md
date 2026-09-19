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
  gateways/           One adapter per provider protocol, each carrying tool calls
                      where the protocol supports them:
    anthropicGateway.ts        Anthropic Messages API (native tool use)
    openAiCompatibleGateway.ts POST /chat/completions incl. `tools`/`tool_calls`
                                (OpenAI, vLLM, LM Studio, Ollama's OpenAI-compat mode, ...)
    hermesGateway.ts           Lightweight JSON protocol for locally-hosted
                                Hermes-family agents, with an opt-in tool_calls extension
    customWebhookGateway.ts    Generic {"message": ...} -> reply, text-only (no tool protocol)
    gatewayFactory.ts          Picks the right adapter for an agent's providerType
  tools/              The harness's tool ecosystem:
    types.ts            Tool / ToolSpec / ToolResult contracts
    registry.ts          Global registration + per-agent exposure (agent.enabledTools)
    builtins/            list_agents, delegate_to_agent, fetch_url, remember,
                         recall, open_browser_tab
  harness/            The agent loop itself:
    agentLoop.ts         model call -> tool dispatch -> result appended -> repeat,
                         pausing for approval on sensitive tools
    systemPrompt.ts       Tiered prompt assembly (tool guidance + agent's own prompt)
  hooks/              useAgents, useCredentialGroups, useChat (drives the harness),
                       useBrowserProfiles — bridge storage + harness to the screens
  navigation/          RootNavigator (React Navigation native-stack)
  screens/             DashboardScreen, AgentEditScreen, VaultScreen, ChatScreen,
                       BrowsersScreen, BrowserScreen
  components/          Shared UI (StatusChip, ...)
  theme/colors.ts      Color tokens
```

Adding a new kind of agent means adding one gateway module and a
`ProviderType` entry — the UI, storage, and vault-sharing logic need no
changes. Adding a new tool means adding one file under `tools/builtins/` and
registering it — no agent, gateway, or harness code changes.

## The harness

truOS Hub isn't just a chat proxy — it runs its own agent loop, the same
core shape used by [Hermes Agent](https://hermes-agent.nousresearch.com/)
(Nous Research's open-source harness) and
[OpenClaw](https://openclaw.ai/): call the model, check whether it asked for
a tool, run the tool, append the result, repeat until it answers in plain
text (capped at 6 tool round-trips per turn, `MAX_TOOL_ITERATIONS` in
`agentLoop.ts`).

A few decisions carried over directly from studying those two systems:

- **Registration vs. exposure.** Every tool registers into one global
  registry at app boot (`tools/registry.ts`), but an agent only ever sees
  the tools listed in its own `enabledTools` — off by default. This is the
  same split Hermes Agent's harness uses to keep a broad tool library
  without bloating every single run's context or attack surface.
- **Deny-by-default on anything sensitive.** Each tool declares a
  `riskLevel`. A `sensitive` tool (delegating to another agent, fetching a
  URL — anything with a side effect or that spends another agent's quota)
  pauses the loop and renders an Approve/Deny prompt in the chat instead of
  running automatically, unless the agent has `autoApproveTools` on. This
  mirrors OpenClaw's and Hermes's permission layers, scaled to what a human
  tapping a phone screen can reasonably review — there's no shell or
  filesystem access here, only tools written for this app.
- **One-hop delegation, not recursive agents calling agents.**
  `delegate_to_agent` calls the target agent's gateway directly rather than
  re-entering the harness, so the delegate never gets tools of its own and
  can't delegate again. That's the whole guard against runaway multi-agent
  recursion, and it's the feature that makes this a genuinely *unified* hub
  — one agent can hand a sub-task to another configured agent and use the
  answer.

### Built-in tools

| Tool | Risk | What it does |
| --- | --- | --- |
| `list_agents` | safe | Lists every agent in the hub and its connection status |
| `delegate_to_agent` | sensitive | Sends a message to another configured agent, one-shot |
| `fetch_url` | sensitive | GET/POST an `https://` URL, returns the (truncated) body |
| `remember` / `recall` | safe | Per-agent key/value notes, persisted locally |
| `open_browser_tab` | safe | Prepares a Browsers tab at a URL; nothing opens without the user tapping it |

### What this harness deliberately doesn't do

OpenClaw's skills can run shell commands, drive a real browser, and touch
the filesystem because it runs as a persistent process on hardware you
control. A phone app sandboxed by the OS can't respect that model safely —
so there's no shell tool, no arbitrary file access, and (as covered in
Browsers below) no lifting a signed-in web session out of its tab to drive
a site headlessly. Every tool here is one this app wrote and owns end to
end.

## Screens

- **Dashboard** — every configured agent with its live connection status.
- **Agent editor** — name, provider protocol, base URL, model, system
  prompt, which shared credential (if any) to authenticate with, which tools
  it's allowed to call, and whether sensitive tool calls need your approval
  each time.
- **Vault** — create/rotate/revoke shared credentials and see exactly which
  agents are currently relying on each one.
- **Chat** — a per-agent conversation, persisted locally, driven by the
  harness: tool calls show as their own pills inline (with Approve/Deny
  when one is waiting on you), and the final answer renders as a normal
  bubble once the loop settles.
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
- MCP client support so a self-hosted MCP server's tools can register into
  the same tool registry alongside the built-ins.
- Streaming tool-call deltas instead of waiting for a full non-streaming
  response before the loop can see whether a tool was requested.
- Biometric gate (expo-local-authentication) before revealing/rotating a
  vault secret.
- Per-tab "signed in" indicator in Browsers (heuristic only — presence of a
  known cookie name — never reading the token value).
- True multi-account isolation for two browser tabs on the *same* site
  needs a custom dev client with separate native WebView data stores; the
  managed/Expo-Go-compatible WebView shares one cookie jar per domain, which
  is fine for different services but not for two logins on one service.
