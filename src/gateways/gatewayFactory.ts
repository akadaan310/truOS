import type { ProviderType } from '../types/models';
import { anthropicGateway } from './anthropicGateway';
import { customWebhookGateway } from './customWebhookGateway';
import { hermesGateway } from './hermesGateway';
import { openAiCompatibleGateway } from './openAiCompatibleGateway';
import type { AgentGateway } from './types';

const gatewaysByProvider: Record<ProviderType, AgentGateway> = {
  ANTHROPIC: anthropicGateway,
  OPENAI_COMPATIBLE: openAiCompatibleGateway,
  HERMES: hermesGateway,
  CUSTOM_WEBHOOK: customWebhookGateway,
};

export function gatewayFor(providerType: ProviderType): AgentGateway {
  return gatewaysByProvider[providerType];
}
