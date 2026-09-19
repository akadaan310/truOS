import { useCallback, useEffect, useState } from 'react';
import { agentStore } from '../storage/metadataStore';
import { sessionManager } from '../storage/sessionManager';
import type { Agent, ConnectionStatus } from '../types/models';

export interface AgentWithStatus {
  agent: Agent;
  status: ConnectionStatus;
}

export function useAgents() {
  const [agents, setAgents] = useState<AgentWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const all = await agentStore.getAll();
    const withStatus = await Promise.all(
      all.map(async (agent) => ({ agent, status: await sessionManager.statusFor(agent) })),
    );
    setAgents(withStatus);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const deleteAgent = useCallback(
    async (agentId: string) => {
      await agentStore.remove(agentId);
      await refresh();
    },
    [refresh],
  );

  return { agents, isLoading, refresh, deleteAgent };
}
