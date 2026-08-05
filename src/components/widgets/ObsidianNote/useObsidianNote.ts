import { useState, useCallback, useRef } from 'react';
import { getFile, ObsidianError, type ObsidianErrorCode } from '../../../lib/obsidianApi';
import { parseMarkdown, type MdBlock } from '../../../lib/obsidianMarkdown';
import { isExtensionEnv } from '../../../lib/permissions';
import { storageLocal } from '../../../lib/storageLocal';

export interface NoteState {
  status:        'idle' | 'loading' | 'success' | 'error';
  blocks:        MdBlock[];
  errorCode:     ObsidianErrorCode | null;
  lastRefreshed: Date | null;
  isStale:       boolean;
}

interface NoteCache {
  source: string;
  fetchedAt: number;
}

function cacheKey(path: string): string {
  return `sg:obsidian:note:cache:${path}`;
}

const MOCK_SOURCE = [
  '## This week',
  '',
  'Ship the connection layer, then the read widgets.',
  '',
  '- Groceries: oat milk, coffee, rye bread',
  '- Call the bike shop about the service slot',
  '- [ ] Renew the domain #admin',
  '',
  '> A pinned note is a notice board you keep from inside Obsidian.',
].join('\n');

export function useObsidianNote() {
  const [state, setState] = useState<NoteState>({
    status: 'idle',
    blocks: [],
    errorCode: null,
    lastRefreshed: null,
    isStale: false,
  });
  const fetchingRef = useRef(false);

  const refresh = useCallback(async (path: string) => {
    if (fetchingRef.current) return;
    if (!path) {
      setState({ status: 'error', blocks: [], errorCode: 'NOT_CONFIGURED', lastRefreshed: null, isStale: false });
      return;
    }
    fetchingRef.current = true;
    setState(s => ({ ...s, status: 'loading', errorCode: null }));

    try {
      let source: string;
      if (isExtensionEnv) {
        source = await getFile(path);
      } else {
        await new Promise(r => setTimeout(r, 450));
        source = MOCK_SOURCE;
      }
      setState({
        status: 'success',
        blocks: parseMarkdown(source),
        errorCode: null,
        lastRefreshed: new Date(),
        isStale: false,
      });
      storageLocal.set(cacheKey(path), { source, fetchedAt: Date.now() } satisfies NoteCache);
    } catch (err) {
      // Fall back to the last cached content for this exact path rather than
      // a bare error when one exists — same reasoning as useObsidianDaily.ts.
      const cached = await storageLocal.get(cacheKey(path));
      const c = cached as NoteCache | undefined;
      if (c) {
        setState({
          status: 'success',
          blocks: parseMarkdown(c.source),
          errorCode: null,
          lastRefreshed: new Date(c.fetchedAt),
          isStale: true,
        });
      } else {
        setState({
          status: 'error',
          blocks: [],
          errorCode: err instanceof ObsidianError ? err.code : 'HTTP_ERROR',
          lastRefreshed: null,
          isStale: false,
        });
      }
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  return { ...state, refresh, isMock: !isExtensionEnv };
}
