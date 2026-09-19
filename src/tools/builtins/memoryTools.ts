import { memoryStore } from '../../storage/metadataStore';
import type { Tool } from '../types';

export const rememberTool: Tool = {
  spec: {
    name: 'remember',
    description: 'Save a short note under a key, for this agent to recall in a later conversation.',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Short identifier, e.g. "user_timezone".' },
        value: { type: 'string', description: 'The note to save.' },
      },
      required: ['key', 'value'],
    },
  },
  riskLevel: 'safe',
  async execute(args, context) {
    const key = String(args.key ?? '').trim();
    const value = String(args.value ?? '').trim();
    if (!key || !value) return { ok: false, content: 'key and value are both required.' };
    await memoryStore.set(context.callingAgent.id, key, value);
    return { ok: true, content: `Saved "${key}".` };
  },
};

export const recallTool: Tool = {
  spec: {
    name: 'recall',
    description: 'Retrieve a note previously saved with remember. Omit key to list everything saved.',
    parameters: {
      type: 'object',
      properties: { key: { type: 'string', description: 'The key to look up.' } },
    },
  },
  riskLevel: 'safe',
  async execute(args, context) {
    const all = await memoryStore.getAll(context.callingAgent.id);
    const key = typeof args.key === 'string' ? args.key.trim() : '';
    if (!key) {
      const entries = Object.entries(all);
      if (entries.length === 0) return { ok: true, content: 'Nothing saved yet.' };
      return { ok: true, content: entries.map(([k, v]) => `${k}: ${v}`).join('\n') };
    }
    const value = all[key];
    return { ok: value != null, content: value ?? `No note saved under "${key}".` };
  },
};
