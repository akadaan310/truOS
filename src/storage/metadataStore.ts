import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Agent, ChatMessage, CredentialGroup } from '../types/models';

/**
 * Plain (non-secret) metadata storage. Agents, credential group descriptions, and chat history
 * live here as JSON — never the credential secret itself, which stays in `secureVault.ts`. This
 * mirrors keeping metadata in a Room database while the actual token lives only in an encrypted
 * keystore-backed store.
 */
const KEYS = {
  agents: 'truos.agents',
  credentialGroups: 'truos.credentialGroups',
  chatPrefix: 'truos.chat.',
} as const;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const agentStore = {
  async getAll(): Promise<Agent[]> {
    return readJson<Agent[]>(KEYS.agents, []);
  },
  async getById(id: string): Promise<Agent | undefined> {
    const agents = await agentStore.getAll();
    return agents.find((a) => a.id === id);
  },
  async save(agent: Agent): Promise<void> {
    const agents = await agentStore.getAll();
    const index = agents.findIndex((a) => a.id === agent.id);
    if (index >= 0) {
      agents[index] = agent;
    } else {
      agents.push(agent);
    }
    await writeJson(KEYS.agents, agents);
  },
  async remove(id: string): Promise<void> {
    const agents = await agentStore.getAll();
    await writeJson(
      KEYS.agents,
      agents.filter((a) => a.id !== id),
    );
    await AsyncStorage.removeItem(KEYS.chatPrefix + id);
  },
  async byCredentialGroup(credentialGroupId: string): Promise<Agent[]> {
    const agents = await agentStore.getAll();
    return agents.filter((a) => a.credentialGroupId === credentialGroupId);
  },
};

export const credentialGroupStore = {
  async getAll(): Promise<CredentialGroup[]> {
    return readJson<CredentialGroup[]>(KEYS.credentialGroups, []);
  },
  async getById(id: string): Promise<CredentialGroup | undefined> {
    const groups = await credentialGroupStore.getAll();
    return groups.find((g) => g.id === id);
  },
  async save(group: CredentialGroup): Promise<void> {
    const groups = await credentialGroupStore.getAll();
    const index = groups.findIndex((g) => g.id === group.id);
    if (index >= 0) {
      groups[index] = group;
    } else {
      groups.push(group);
    }
    await writeJson(KEYS.credentialGroups, groups);
  },
  async remove(id: string): Promise<void> {
    const groups = await credentialGroupStore.getAll();
    await writeJson(
      KEYS.credentialGroups,
      groups.filter((g) => g.id !== id),
    );
  },
};

export const chatStore = {
  async getForAgent(agentId: string): Promise<ChatMessage[]> {
    return readJson<ChatMessage[]>(KEYS.chatPrefix + agentId, []);
  },
  async append(message: ChatMessage): Promise<ChatMessage[]> {
    const existing = await chatStore.getForAgent(message.agentId);
    const updated = [...existing, message];
    await writeJson(KEYS.chatPrefix + message.agentId, updated);
    return updated;
  },
  async clear(agentId: string): Promise<void> {
    await AsyncStorage.removeItem(KEYS.chatPrefix + agentId);
  },
};
