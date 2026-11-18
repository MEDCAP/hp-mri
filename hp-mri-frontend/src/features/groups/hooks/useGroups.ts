import { useCallback, useEffect, useState } from 'react';
import { listGroups } from '../../../api/groups';
import { getApiErrorMessage } from '../../../api/client';
import { Group } from '../../../types/group';

/**
 * The groups the signed-in user belongs to. Loads whenever `enabled` turns
 * true (GET /groups needs a session, so pass false for guests).
 */
export function useGroups(enabled = true) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setGroups(await listGroups());
      setError(null);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError(getApiErrorMessage(err, 'Failed to load groups'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) refresh();
  }, [enabled, refresh]);

  return { groups, loading, error, refresh };
}
