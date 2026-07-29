import { useState, useCallback, useRef } from 'react';
import { getFile, ObsidianError, type ObsidianErrorCode } from '../../../lib/obsidianApi';
import { parseMarkdown, type MdBlock } from '../../../lib/obsidianMarkdown';
import { isExtensionEnv } from '../../../lib/permissions';

export interface NoteState {
  status:        'idle' | 'loading' | 'success' | 'error';
  blocks:        MdBlock[];
  errorCode:     ObsidianErrorCode | null;
  lastRefreshed: Date | null;
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
  });
  const fetchingRef = useRef(false);

  const refresh = useCallback(async (path: string) => {
    if (fetchingRef.current) return;
    if (!path) {
      setState({ status: 'error', blocks: [], errorCode: 'NOT_CONFIGURED', lastRefreshed: null });
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
      });
    } catch (err) {
      setState({
        status: 'error',
        blocks: [],
        errorCode: err instanceof ObsidianError ? err.code : 'HTTP_ERROR',
        lastRefreshed: null,
      });
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  return { ...state, refresh, isMock: !isExtensionEnv };
}
