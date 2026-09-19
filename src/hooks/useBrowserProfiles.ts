import { useCallback, useEffect, useState } from 'react';
import { browserProfileStore } from '../storage/metadataStore';
import type { BrowserProfile } from '../types/models';
import { generateId } from '../utils/id';

export function useBrowserProfiles() {
  const [profiles, setProfiles] = useState<BrowserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const all = await browserProfileStore.getAll();
    all.sort((a, b) => (b.lastOpenedAtEpochMs ?? b.createdAtEpochMs) - (a.lastOpenedAtEpochMs ?? a.createdAtEpochMs));
    setProfiles(all);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createProfile = useCallback(
    async (name: string, homeUrl: string, credentialGroupId?: string) => {
      if (!name.trim() || !homeUrl.trim()) return;
      const profile: BrowserProfile = {
        id: generateId(),
        name: name.trim(),
        homeUrl: homeUrl.trim(),
        credentialGroupId,
        createdAtEpochMs: Date.now(),
      };
      await browserProfileStore.save(profile);
      await refresh();
      return profile;
    },
    [refresh],
  );

  const deleteProfile = useCallback(
    async (id: string) => {
      await browserProfileStore.remove(id);
      await refresh();
    },
    [refresh],
  );

  const recordVisit = useCallback(async (profile: BrowserProfile, url: string) => {
    await browserProfileStore.save({ ...profile, lastUrl: url, lastOpenedAtEpochMs: Date.now() });
  }, []);

  return { profiles, isLoading, refresh, createProfile, deleteProfile, recordVisit };
}
