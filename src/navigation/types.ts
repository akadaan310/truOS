export type RootStackParamList = {
  Dashboard: undefined;
  AgentEdit: { agentId?: string; templateId?: string };
  Vault: undefined;
  Chat: { agentId: string };
  Browsers: undefined;
  Browser: { profileId: string };
};
