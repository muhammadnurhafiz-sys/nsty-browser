export type BrowserTab = { id: string; url: string; title: string };
export type BrowserSession = { tabs: BrowserTab[]; activeId: string };
export type SavedPage = { url: string; title: string; date: number };
export const newTab = (): BrowserTab => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, url: '', title: 'New tab' });
export function address(input: string): string | null {
  console.info('[Navigation] Normalizing address');
  const value = input.trim();
  if (!value) return null;
  const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value);
  const candidate = hasScheme ? value : !/\s/.test(value) && value.includes('.') ? `https://${value}` : `https://www.google.com/search?q=${encodeURIComponent(value)}`;
  try { const parsed = new URL(candidate); return ['https:', 'http:'].includes(parsed.protocol) && parsed.hostname && !parsed.username && !parsed.password ? candidate : null; } catch { return null; }
}
export function isHost(url: string, host: string): boolean {
  try { const actual = new URL(url).hostname.toLowerCase(); return actual === host || actual.endsWith(`.${host}`); } catch { return false; }
}
export const serializeSession = (session: BrowserSession): string => JSON.stringify(session);
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
