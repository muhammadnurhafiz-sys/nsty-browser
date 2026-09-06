// Explicitly opt-in cosmetic filtering, not a network ad blocker or extension engine.
export const cosmeticScript = `(() => {
  console.info('[Nsty Shield] Applying cosmetic filtering');
  if (document.getElementById('nsty-cosmetic-shield')) return true;
  const style = document.createElement('style'); style.id = 'nsty-cosmetic-shield';
  style.textContent = 'ins.adsbygoogle, iframe[src*="doubleclick.net"], iframe[src*="googlesyndication.com"] { display:none!important; }';
  (document.head || document.documentElement).appendChild(style); return true;
})(); true;`;
export const youtubeScript = `(() => {
  console.info('[Nsty Shield] Applying optional YouTube cosmetic controls');
  if (!(location.hostname === 'youtube.com' || location.hostname.endsWith('.youtube.com'))) return true;
  if (window.__nstyYoutube) return true; window.__nstyYoutube = true;
  const style = document.createElement('style'); style.textContent = 'ytd-ad-slot-renderer,ytd-promoted-sparkles-web-renderer,ytd-in-feed-ad-layout-renderer,#masthead-ad {display:none!important}';
  (document.head || document.documentElement).appendChild(style);
  setInterval(() => { const button = document.querySelector('.ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-skip-button'); if (button && button.getClientRects().length) button.click(); }, 1500);
  return true;
})(); true;`;
