import type { Tool } from '../types';

const MAX_RESPONSE_CHARS = 8000;

export const fetchUrlTool: Tool = {
  spec: {
    name: 'fetch_url',
    description:
      'Fetch an HTTPS URL and return its response body as text (truncated). Use for reading a ' +
      'web page, JSON API, or document the user has referenced.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Must start with https://' },
        method: { type: 'string', enum: ['GET', 'POST'], description: 'Defaults to GET.' },
        body: { type: 'string', description: 'Request body, only used when method is POST.' },
      },
      required: ['url'],
    },
  },
  riskLevel: 'sensitive',
  async execute(args) {
    const url = String(args.url ?? '');
    const method = args.method === 'POST' ? 'POST' : 'GET';
    if (!url.startsWith('https://')) {
      return { ok: false, content: 'Only https:// URLs are allowed.' };
    }

    try {
      const response = await fetch(url, {
        method,
        body: method === 'POST' && typeof args.body === 'string' ? args.body : undefined,
      });
      const text = await response.text();
      const truncated =
        text.length > MAX_RESPONSE_CHARS
          ? `${text.slice(0, MAX_RESPONSE_CHARS)}\n[truncated, ${text.length} chars total]`
          : text;
      return { ok: response.ok, content: `HTTP ${response.status}\n${truncated}` };
    } catch (error) {
      return { ok: false, content: `Fetch failed: ${error instanceof Error ? error.message : String(error)}` };
    }
  },
};
