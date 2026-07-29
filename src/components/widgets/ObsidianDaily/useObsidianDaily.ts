import { useState, useCallback, useRef } from 'react';
import { getFile, putFile, ObsidianError, type ObsidianErrorCode } from '../../../lib/obsidianApi';
import { parseMarkdown, toggleTaskLine, type MdBlock } from '../../../lib/obsidianMarkdown';
import { isExtensionEnv } from '../../../lib/permissions';

export type DailyStatus = 'idle' | 'loading' | 'success' | 'error';

interface DailyState {
  status:        DailyStatus;
  /** Raw note source — kept so a checkbox write can be composed from the exact
   *  text that was rendered, not a re-serialisation of the parsed blocks. */
  source:        string;
  blocks:        MdBlock[];
  errorCode:     ObsidianErrorCode | null;
  lastRefreshed: Date | null;
  /** Set when a write was refused because the note changed underneath us. */
  staleConflict: boolean;
}

const EMPTY: DailyState = {
  status: 'idle',
  source: '',
  blocks: [],
  errorCode: null,
  lastRefreshed: null,
  staleConflict: false,
};

// ── Mock data — the browser preview has no extension APIs and no vault ────────

const MOCK_SOURCE = [
  '# Focus',
  '',
  'Ship the **Obsidian widgets** branch. See [[Roadmap]] for the rest.',
  '',
  '## Tasks',
  '',
  '- [x] Draft the transport comparison',
  '- [ ] Wire up the connection layer',
  '- [ ] Write the setup docs #docs',
  '- [ ] Review [the plugin API](https://github.com/coddingtonbear/obsidian-local-rest-api)',
  '',
  '## Notes',
  '',
  '> Keep the new tab fast — read surfaces only.',
].join('\n');

async function fetchMock(): Promise<string> {
  await new Promise(r => setTimeout(r, 500));
  return MOCK_SOURCE;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useObsidianDaily() {
  const [state, setState] = useState<DailyState>(EMPTY);
  const [writing, setWriting] = useState(false);
  const fetchingRef = useRef(false);
  // The path in flight, so a checkbox toggle always writes back to the same
  // note that was read — not a newly-resolved one if midnight just passed.
  const pathRef = useRef('');

  const refresh = useCallback(async (path: string) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    pathRef.current = path;
    setState(s => ({ ...s, status: 'loading', errorCode: null, staleConflict: false }));

    try {
      const source = isExtensionEnv ? await getFile(path) : await fetchMock();
      setState({
        status: 'success',
        source,
        blocks: parseMarkdown(source),
        errorCode: null,
        lastRefreshed: new Date(),
        staleConflict: false,
      });
    } catch (err) {
      setState(s => ({
        ...s,
        status: 'error',
        source: '',
        blocks: [],
        errorCode: err instanceof ObsidianError ? err.code : 'HTTP_ERROR',
      }));
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  /**
   * Tick a task off.
   *
   * The plugin exposes a PATCH endpoint, but targeting one arbitrary list item
   * through it is fragile. Instead: re-read the note, confirm the target line
   * is still the same task we rendered, and only then write the whole file
   * back with that single character flipped. If it no longer matches, the note
   * was edited in Obsidian since the last refresh — refuse the write and
   * refresh, rather than clobbering that edit.
   */
  const toggleTask = useCallback(async (block: Extract<MdBlock, { kind: 'task' }>) => {
    const path = pathRef.current;
    if (!path || !isExtensionEnv) {
      // Preview build: reflect the toggle locally so the widget still demos.
      setState(s => ({
        ...s,
        blocks: s.blocks.map(b =>
          b.kind === 'task' && b.lineIndex === block.lineIndex ? { ...b, checked: !b.checked } : b,
        ),
      }));
      return;
    }

    setWriting(true);
    try {
      const current = await getFile(path);
      const updated = toggleTaskLine(current, block.lineIndex, block.text, !block.checked);

      if (updated === null) {
        setState(s => ({
          ...s,
          source: current,
          blocks: parseMarkdown(current),
          staleConflict: true,
          lastRefreshed: new Date(),
        }));
        return;
      }

      await putFile(path, updated);
      setState(s => ({
        ...s,
        source: updated,
        blocks: parseMarkdown(updated),
        staleConflict: false,
        lastRefreshed: new Date(),
      }));
    } catch (err) {
      setState(s => ({
        ...s,
        status: 'error',
        errorCode: err instanceof ObsidianError ? err.code : 'HTTP_ERROR',
      }));
    } finally {
      setWriting(false);
    }
  }, []);

  /** Create today's note when it doesn't exist yet. */
  const createNote = useCallback(async (path: string, initial = '') => {
    if (!isExtensionEnv) return;
    setWriting(true);
    try {
      await putFile(path, initial);
      await refresh(path);
    } catch (err) {
      setState(s => ({
        ...s,
        status: 'error',
        errorCode: err instanceof ObsidianError ? err.code : 'HTTP_ERROR',
      }));
    } finally {
      setWriting(false);
    }
  }, [refresh]);

  return { ...state, writing, refresh, toggleTask, createNote, isMock: !isExtensionEnv };
}
