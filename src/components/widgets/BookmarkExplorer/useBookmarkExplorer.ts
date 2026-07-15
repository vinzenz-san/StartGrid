import type { BmNode } from './bookmarks.mock';
import { MOCK_TREE, flattenNodes, findNode } from './bookmarks.mock';

const isExtension = typeof chrome !== 'undefined' && !!chrome.bookmarks;

export function useBookmarkExplorer() {
  async function getChildren(folderId: string): Promise<BmNode[]> {
    if (isExtension) {
      const { default: browser } = await import('webextension-polyfill');
      return browser.bookmarks.getChildren(folderId) as Promise<BmNode[]>;
    }
    return findNode(folderId, MOCK_TREE)?.children ?? [];
  }

  async function search(query: string): Promise<BmNode[]> {
    if (isExtension) {
      const { default: browser } = await import('webextension-polyfill');
      return browser.bookmarks.search(query) as Promise<BmNode[]>;
    }
    const q = query.toLowerCase();
    return flattenNodes(MOCK_TREE).filter(n =>
      !n.children &&
      (n.title.toLowerCase().includes(q) || (n.url ?? '').toLowerCase().includes(q))
    );
  }

  async function getNode(nodeId: string): Promise<BmNode | null> {
    if (isExtension) {
      try {
        const { default: browser } = await import('webextension-polyfill');
        const results = await browser.bookmarks.get(nodeId);
        return (results[0] as BmNode) ?? null;
      } catch {
        return null;
      }
    }
    return findNode(nodeId, MOCK_TREE);
  }

  async function getTree(): Promise<BmNode[]> {
    if (isExtension) {
      const { default: browser } = await import('webextension-polyfill');
      return browser.bookmarks.getTree() as Promise<BmNode[]>;
    }
    return MOCK_TREE;
  }

  async function openUrl(url: string): Promise<void> {
    if (isExtension) {
      const { default: browser } = await import('webextension-polyfill');
      await browser.tabs.create({ url });
    } else {
      window.open(url, '_blank', 'noopener');
    }
  }

  return { getChildren, search, getNode, getTree, openUrl, isMock: !isExtension };
}
