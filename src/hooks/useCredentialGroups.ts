import { useCallback, useEffect, useState } from 'react';
import { credentialGroupStore } from '../storage/metadataStore';
import { sessionManager } from '../storage/sessionManager';
import type { Agent, AuthKind, CredentialGroup } from '../types/models';
import { generateId } from '../utils/id';

export interface CredentialGroupWithDetails {
  group: CredentialGroup;
  sharedByAgents: Agent[];
  hasSecret: boolean;
}

export function useCredentialGroups() {
  const [groups, setGroups] = useState<CredentialGroupWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const all = await credentialGroupStore.getAll();
    const withDetails = await Promise.all(
      all.map(async (group) => ({
        group,
        sharedByAgents: await sessionManager.agentsSharing(group.id),
        hasSecret: await sessionManager.hasSecret(group.id),
      })),
    );
    setGroups(withDetails);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createGroup = useCallback(
    async (displayName: string, authKind: AuthKind, secret: string) => {
      if (!displayName.trim()) return;
      const group: CredentialGroup = {
        id: generateId(),
        displayName: displayName.trim(),
        authKind,
        createdAtEpochMs: Date.now(),
      };
      await credentialGroupStore.save(group);
      if (secret.trim()) {
        await sessionManager.rotateSecret(group, secret.trim());
      }
      await refresh();
    },
    [refresh],
  );

  const updateSecret = useCallback(
    async (group: CredentialGroup, secret: string) => {
      if (!secret.trim()) return;
      await sessionManager.rotateSecret(group, secret.trim());
      await refresh();
    },
    [refresh],
  );

  const revoke = useCallback(
    async (group: CredentialGroup) => {
      await sessionManager.revoke(group.id);
      await refresh();
    },
    [refresh],
  );

  const deleteGroup = useCallback(
    async (group: CredentialGroup) => {
      await sessionManager.revoke(group.id);
      await credentialGroupStore.remove(group.id);
      await refresh();
    },
    [refresh],
  );

  return { groups, isLoading, refresh, createGroup, updateSecret, revoke, deleteGroup };
}
