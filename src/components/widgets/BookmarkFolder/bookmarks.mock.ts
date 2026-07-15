export interface BmNode {
  id:        string;
  title:     string;
  url?:      string;
  parentId?: string;
  children?: BmNode[];
}

export const MOCK_TREE: BmNode[] = [
  {
    id: '0', title: '', children: [
      {
        id: '1', title: 'Bookmarks Bar', parentId: '0', children: [
          { id: '100', title: 'GitHub',      url: 'https://github.com',          parentId: '1' },
          { id: '101', title: 'Google',      url: 'https://google.com',          parentId: '1' },
          { id: '102', title: 'ChatGPT',     url: 'https://chatgpt.com',         parentId: '1' },
          {
            id: '10', title: 'Work', parentId: '1', children: [
              { id: '1000', title: 'Jira',              url: 'https://atlassian.net',          parentId: '10' },
              { id: '1001', title: 'Confluence',        url: 'https://confluence.atlassian.com', parentId: '10' },
              { id: '1002', title: 'Slack',             url: 'https://slack.com',              parentId: '10' },
              { id: '1003', title: 'Linear',            url: 'https://linear.app',             parentId: '10' },
              { id: '1004', title: 'Notion',            url: 'https://notion.so',              parentId: '10' },
            ],
          },
          {
            id: '11', title: 'Dev Tools', parentId: '1', children: [
              { id: '1100', title: 'MDN Web Docs',         url: 'https://developer.mozilla.org',    parentId: '11' },
              { id: '1101', title: 'Can I Use',            url: 'https://caniuse.com',              parentId: '11' },
              { id: '1102', title: 'Bundlephobia',         url: 'https://bundlephobia.com',         parentId: '11' },
              { id: '1103', title: 'TypeScript Playground',url: 'https://typescriptlang.org/play',  parentId: '11' },
              { id: '1104', title: 'Excalidraw',           url: 'https://excalidraw.com',           parentId: '11' },
            ],
          },
          {
            id: '12', title: 'Social', parentId: '1', children: [
              { id: '1200', title: 'Reddit',       url: 'https://reddit.com',              parentId: '12' },
              { id: '1201', title: 'X (Twitter)',  url: 'https://x.com',                  parentId: '12' },
              { id: '1202', title: 'Hacker News',  url: 'https://news.ycombinator.com',   parentId: '12' },
              { id: '1203', title: 'Mastodon',     url: 'https://mastodon.social',        parentId: '12' },
            ],
          },
          {
            id: '13', title: 'News', parentId: '1', children: [
              { id: '1300', title: 'BBC News',     url: 'https://bbc.com/news',     parentId: '13' },
              { id: '1301', title: 'The Verge',    url: 'https://theverge.com',     parentId: '13' },
              { id: '1302', title: 'Ars Technica', url: 'https://arstechnica.com',  parentId: '13' },
            ],
          },
        ],
      },
      {
        id: '2', title: 'Other Bookmarks', parentId: '0', children: [
          { id: '200', title: 'YouTube',  url: 'https://youtube.com',  parentId: '2' },
          { id: '201', title: 'Netflix',  url: 'https://netflix.com',  parentId: '2' },
          { id: '202', title: 'Spotify',  url: 'https://spotify.com',  parentId: '2' },
        ],
      },
    ],
  },
];

export function flattenNodes(nodes: BmNode[]): BmNode[] {
  const out: BmNode[] = [];
  function walk(ns: BmNode[]) {
    for (const n of ns) { out.push(n); if (n.children) walk(n.children); }
  }
  walk(nodes);
  return out;
}

export function findNode(id: string, nodes: BmNode[]): BmNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) { const f = findNode(id, n.children); if (f) return f; }
  }
  return null;
}
