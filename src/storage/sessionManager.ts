import type { Agent, ConnectionStatus, CredentialGroup } from '../types/models';
import { agentStore, credentialGroupStore } from './metadataStore';
import { secureVault } from './secureVault';

/**
 * Resolves what credential (if any) an agent should authenticate with right now, and reports
 * whether that shared session is usable. This is the layer that makes "sign in once, use
 * everywhere" real: any number of agents can point at the same credential group, and rotating
 * or revoking it here immediately affects all of them.
 */
export const sessionManager = {
  async resolveSecret(agent: Agent): Promise<string | null> {
    if (!agent.credentialGroupId) return null;
    return secureVault.getSecret(agent.credentialGroupId);
  },

  async statusFor(agent: Agent): Promise<ConnectionStatus> {
    if (!agent.credentialGroupId) return 'NO_CREDENTIAL';
    const group = await credentialGroupStore.getById(agent.credentialGroupId);
    if (!group) return 'NO_CREDENTIAL';
    if (!(await secureVault.hasSecret(group.id))) return 'NO_CREDENTIAL';
    if (group.expiresAtEpochMs && group.expiresAtEpochMs < Date.now()) return 'EXPIRED';
    return 'CONNECTED';
  },

  async agentsSharing(credentialGroupId: string): Promise<Agent[]> {
    return agentStore.byCredentialGroup(credentialGroupId);
  },

  async rotateSecret(group: CredentialGroup, newSecret: string): Promise<void> {
    await secureVault.putSecret(group.id, newSecret);
    await credentialGroupStore.save({ ...group, lastRefreshedEpochMs: Date.now() });
  },

  async revoke(credentialGroupId: string): Promise<void> {
    await secureVault.removeSecret(credentialGroupId);
  },

  async hasSecret(credentialGroupId: string): Promise<boolean> {
    return secureVault.hasSecret(credentialGroupId);
  },
};
