import type { WebContents } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

// YouTube ad blocking content script
// Injected into youtube.com pages to handle ads that bypass network-level blocking
const YOUTUBE_SHIELD_SCRIPT = `
(function() {
  'use strict';

  // Skip if already injected
  if (window.__nstyYouTubeShield) return;
  window.__nstyYouTubeShield = true;

  console.log('[Nsty Shield] YouTube protection active');

  // 1. Skip ad video segments
  function skipAd() {
    const video = document.querySelector('video');
    const skipButton = document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern');
    const adOverlay = document.querySelector('.ytp-ad-overlay-close-button');

    // Click skip button if available
    if (skipButton && skipButton.offsetParent !== null) {
      skipButton.click();
      console.log('[Nsty Shield] Skipped ad via button');
      return;
    }

    // Close overlay ads
    if (adOverlay && adOverlay.offsetParent !== null) {
      adOverlay.click();
      console.log('[Nsty Shield] Closed overlay ad');
      return;
    }

    // If video is playing an ad, try to skip to end
    if (video) {
      const adContainer = document.querySelector('.ad-showing, .ad-interrupting');
      if (adContainer) {
        video.currentTime = video.duration || 0;
        video.playbackRate = 16; // Speed through unskippable ads
        console.log('[Nsty Shield] Fast-forwarded ad');
      }
    }
  }

  // 2. Hide ad UI elements
  function hideAdElements() {
    const selectors = [
      // Video ads UI
      '.ytp-ad-module',
      '.ytp-ad-overlay-container',
      '.ytp-ad-overlay-slot',
      '.ytp-ad-message-container',
      '.ytp-ad-progress-list',
      // Page ads
      '#player-ads',
      '#masthead-ad',
      'ytd-ad-slot-renderer',
      'ytd-banner-promo-renderer',
      'ytd-statement-banner-renderer',
      'ytd-in-feed-ad-layout-renderer',
      'ytd-promoted-sparkles-web-renderer',
      // Sidebar ads
      '#related ytd-compact-promoted-video-renderer',
      'ytd-promoted-video-renderer',
      // Sponsored badges
      '.badge-style-type-ad',
      '.ytd-badge-supported-renderer[aria-label="Sponsored"]',
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        if (el instanceof HTMLElement) {
          el.style.display = 'none';
        }
      }
    }
  }

  // 3. Monitor for ad state changes
  const observer = new MutationObserver(() => {
    skipAd();
    hideAdElements();
  });

  // Start observing when page is ready
  function startObserving() {
    const target = document.querySelector('#content, #page-manager, ytd-app');
    if (target) {
      observer.observe(target, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class'],
      });
      // Initial cleanup
      skipAd();
      hideAdElements();
    } else {
      // Retry if target not found yet
      setTimeout(startObserving, 500);
    }
  }

  // Also run on navigation (YouTube is SPA)
  let lastUrl = location.href;
  const urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(() => {
        skipAd();
        hideAdElements();
      }, 1000);
    }
  });
  urlObserver.observe(document.body, { childList: true, subtree: true });

  // Run periodically as backup
  setInterval(() => {
    skipAd();
    hideAdElements();
  }, 1000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserving);
  } else {
    startObserving();
  }
})();
`

export function injectYouTubeScript(webContents: WebContents): void {
  // Try to load external script first, fall back to embedded
  try {
    const externalPath = path.join(__dirname, '../../resources/content-scripts/youtube-shield.js')
    if (fs.existsSync(externalPath)) {
      const script = fs.readFileSync(externalPath, 'utf-8')
      webContents.executeJavaScript(script).catch(() => {
        // External script failed, use embedded
        webContents.executeJavaScript(YOUTUBE_SHIELD_SCRIPT).catch(() => {})
      })
      return
    }
  } catch {
    // Fall through to embedded script
  }

  webContents.executeJavaScript(YOUTUBE_SHIELD_SCRIPT).catch(() => {
    console.warn('[Shield] Failed to inject YouTube script')
  })
}
