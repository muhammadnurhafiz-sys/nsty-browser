export type BrowserTab = { id: string; url: string; title: string; privateTab?: boolean; thumbnail?: string };
export type BrowserSession = { tabs: BrowserTab[]; activeId: string };
export type SavedPage = { url: string; title: string; date: number };
export const newTab = (privateTab = false): BrowserTab => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, url: '', title: 'New tab', ...(privateTab ? { privateTab: true } : {}) });
const NON_WEB_SCHEME = /^(javascript|data|file|blob|about|vbscript|mailto|tel|sms|intent|market):/i;
const BLOCKED_SCHEME = /^(javascript|data|file|blob|vbscript):/i;
/** What a navigation request should do: load it, hand it to another app, or drop it. */
export function linkAction(url: string): 'web' | 'app' | 'blocked' {
  if (url === 'about:blank' || address(url)) return 'web';
  if (BLOCKED_SCHEME.test(url) || !/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(url)) return 'blocked';
  return 'app';
}
/** Close a tab; the active tab moves to the nearest tab of the same kind. */
export function closeTabIn(session: BrowserSession, id: string): { session: BrowserSession; leftPrivate: boolean } {
  console.info('[Session] Closing tab');
  const closing = session.tabs.find(tab => tab.id === id);
  const tabs = session.tabs.filter(tab => tab.id !== id);
  if (!tabs.length) { const tab = newTab(); return { session: { tabs: [tab], activeId: tab.id }, leftPrivate: false }; }
  if (session.activeId !== id) return { session: { tabs, activeId: session.activeId }, leftPrivate: false };
  const sameKind = tabs.filter(tab => !!tab.privateTab === !!closing?.privateTab);
  const next = sameKind[sameKind.length - 1] ?? tabs[tabs.length - 1]!;
  return { session: { tabs, activeId: next.id }, leftPrivate: !!closing?.privateTab && !next.privateTab };
}
/** Tabs that keep a live WebView: the active one plus the most recently used, newest first. */
export function mountedTabs(recent: string[], activeId: string, limit: number): Set<string> {
  const kept = new Set<string>([activeId]);
  for (const id of recent) { if (kept.size >= limit) break; kept.add(id); }
  return kept;
}
export const sameKindCount = (tabs: BrowserTab[], active: BrowserTab): number => tabs.filter(tab => !!tab.privateTab === !!active.privateTab).length;
export function address(input: string): string | null {
  console.info('[Navigation] Normalizing address');
  const value = input.trim();
  if (!value) return null;
  // A bare "word:" is not a scheme: localhost:3000 and "error: text" must not be rejected as unknown schemes.
  const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(value) || NON_WEB_SCHEME.test(value);
  const hostLike = !/\s/.test(value) && (value.includes('.') || /^[a-zA-Z\d-]+:\d+(\/|$)/.test(value));
  const candidate = hasScheme ? value : hostLike ? `https://${value}` : `https://www.google.com/search?q=${encodeURIComponent(value)}`;
  try { const parsed = new URL(candidate); return ['https:', 'http:'].includes(parsed.protocol) && parsed.hostname && !parsed.username && !parsed.password ? candidate : null; } catch { return null; }
}
export function isHost(url: string, host: string): boolean {
  try { const actual = new URL(url).hostname.toLowerCase(); return actual === host || actual.endsWith(`.${host}`); } catch { return false; }
}
/** Private tabs and captured thumbnails never reach storage. */
export function serializeSession(session: BrowserSession): string {
  console.info('[Session] Serializing public tabs');
  const tabs = session.tabs.filter(tab => !tab.privateTab).map(({ id, url, title }) => ({ id, url, title }));
  const activeId = tabs.some(tab => tab.id === session.activeId) ? session.activeId : tabs[0]?.id ?? '';
  return JSON.stringify({ tabs, activeId });
}
export function displayHost(url: string): string {
  try { const parsed = new URL(url); return parsed.host.replace(/^www\./, ''); } catch { return ''; }
}
export type TopSite = { host: string; title: string; url: string; count: number };
/** Hosts ranked by visit count; title and url come from the most recent visit. */
export function topSites(history: SavedPage[], limit: number): TopSite[] {
  console.info('[Library] Ranking top sites');
  const byHost = new Map<string, TopSite & { date: number }>();
  for (const page of history) {
    const host = displayHost(page.url);
    if (!host) continue;
    const current = byHost.get(host);
    if (!current) byHost.set(host, { host, title: page.title, url: page.url, count: 1, date: page.date });
    else { current.count += 1; if (page.date > current.date) { current.title = page.title; current.url = page.url; current.date = page.date; } }
  }
  return [...byHost.values()].sort((a, b) => b.count - a.count || b.date - a.date).slice(0, limit).map(({ host, title, url, count }) => ({ host, title, url, count }));
}
/** History entry for a committed visit; private tabs record nothing. */
export function recordVisit(history: SavedPage[], tab: BrowserTab, title: string): SavedPage[] {
  if (tab.privateTab || !tab.url) return history;
  return [{ url: tab.url, title: title || tab.url, date: Date.now() }, ...history.filter(page => page.url !== tab.url)].slice(0, 300);
}
export function restoreSession(value: string | null): BrowserSession {
  console.info('[Session] Restoring saved tabs');
  try {
    const data = JSON.parse(value || 'null');
    const ids = new Set<string>();
    const tabs: BrowserTab[] = Array.isArray(data?.tabs) ? data.tabs.slice(0, 30).filter((tab: BrowserTab) => {
      if (typeof tab?.id !== 'string' || ids.has(tab.id) || typeof tab.url !== 'string' || typeof tab.title !== 'string' || (tab.url !== '' && address(tab.url) !== tab.url)) return false;
      ids.add(tab.id); return true;
    }) : [];
    if (tabs.length) return { tabs, activeId: tabs.some(tab => tab.id === data.activeId) ? data.activeId : tabs[0].id };
  } catch { console.warn('[Session] Discarded unreadable saved session'); }
  const tab = newTab(); return { tabs: [tab], activeId: tab.id };
}
const AD_HOSTS = ['doubleclick.net', 'googlesyndication.com', 'googleadservices.com', 'adnxs.com', 'adsrvr.org', 'rubiconproject.com'];
export const blockedRequest = (url: string, enabled: boolean): boolean => enabled && AD_HOSTS.some(host => isHost(url, host));
export function restorePages(value: string | null): SavedPage[] {
  console.info('[Library] Restoring saved pages');
  try { const pages = JSON.parse(value || '[]'); return Array.isArray(pages) ? pages.filter(page => typeof page?.url === 'string' && address(page.url) === page.url && typeof page.title === 'string' && typeof page.date === 'number').slice(0, 300) : []; } catch { return []; }
}
