import { browserProfileStore } from '../../storage/metadataStore';
import { generateId } from '../../utils/id';
import type { Tool } from '../types';

/**
 * Prepares a browser tab pointed at a URL and hands the UI a `uiAction` so the chat screen can
 * offer an explicit "Open browser" button on the result. The tool itself never navigates
 * anything — nothing opens without the user tapping it, same as tapping a link in a chat app.
 */
export const openBrowserTabTool: Tool = {
  spec: {
    name: 'open_browser_tab',
    description:
      'Prepare a browser tab pointed at a URL (creating one named profileName if it does not ' +
      'exist yet) for the user to open. Use for web-only sites you cannot fetch directly, like ' +
      'ones needing a signed-in session.',
    parameters: {
      type: 'object',
      properties: {
        profileName: { type: 'string', description: 'e.g. "ChatGPT" or "Claude.ai".' },
        url: { type: 'string', description: 'Full https:// URL to navigate to.' },
      },
      required: ['profileName', 'url'],
    },
  },
  riskLevel: 'safe',
  async execute(args) {
    const profileName = String(args.profileName ?? '').trim();
    const url = String(args.url ?? '').trim();
    if (!profileName || !url.startsWith('https://')) {
      return { ok: false, content: 'profileName and an https:// url are both required.' };
    }

    const all = await browserProfileStore.getAll();
    const existing = all.find((p) => p.name.toLowerCase() === profileName.toLowerCase());
    const profile = existing
      ? { ...existing, lastUrl: url }
      : {
          id: generateId(),
          name: profileName,
          homeUrl: url,
          lastUrl: url,
          createdAtEpochMs: Date.now(),
        };
    await browserProfileStore.save(profile);

    return {
      ok: true,
      content: `Ready to open "${profileName}" at ${url}.`,
      uiAction: { type: 'open_browser', profileId: profile.id },
    };
  },
};
