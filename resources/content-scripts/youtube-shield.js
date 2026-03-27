/**
 * Nsty Shield — YouTube Ad Blocker
 * Content script injected into youtube.com pages.
 * Handles ads that bypass network-level blocking.
 */
(function() {
  'use strict';

  if (window.__nstyYouTubeShield) return;
  window.__nstyYouTubeShield = true;

  console.log('[Nsty Shield] YouTube protection active');

  function skipAd() {
    const skipButton = document.querySelector(
      '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, button.ytp-skip-ad-button'
    );
    const adOverlay = document.querySelector('.ytp-ad-overlay-close-button');

    if (skipButton && skipButton.offsetParent !== null) {
      skipButton.click();
      return;
    }

    if (adOverlay && adOverlay.offsetParent !== null) {
      adOverlay.click();
      return;
    }

    const video = document.querySelector('video');
    if (video) {
      const adContainer = document.querySelector('.ad-showing, .ad-interrupting');
      if (adContainer) {
        video.currentTime = video.duration || 0;
        video.playbackRate = 16;
      }
    }
  }

  function hideAdElements() {
    const selectors = [
      '.ytp-ad-module',
      '.ytp-ad-overlay-container',
      '.ytp-ad-overlay-slot',
      '.ytp-ad-message-container',
      '.ytp-ad-progress-list',
      '#player-ads',
      '#masthead-ad',
      'ytd-ad-slot-renderer',
      'ytd-banner-promo-renderer',
      'ytd-statement-banner-renderer',
      'ytd-in-feed-ad-layout-renderer',
      'ytd-promoted-sparkles-web-renderer',
      '#related ytd-compact-promoted-video-renderer',
      'ytd-promoted-video-renderer',
      '.badge-style-type-ad',
      '.ytd-badge-supported-renderer[aria-label="Sponsored"]',
    ];

    for (const selector of selectors) {
      for (const el of document.querySelectorAll(selector)) {
        if (el instanceof HTMLElement) el.style.display = 'none';
      }
    }
  }

  const observer = new MutationObserver(() => {
    skipAd();
    hideAdElements();
  });

  function startObserving() {
    const target = document.querySelector('#content, #page-manager, ytd-app');
    if (target) {
      observer.observe(target, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class'],
      });
      skipAd();
      hideAdElements();
    } else {
      setTimeout(startObserving, 500);
    }
  }

  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(() => { skipAd(); hideAdElements(); }, 1000);
    }
  }).observe(document.body, { childList: true, subtree: true });

  setInterval(() => { skipAd(); hideAdElements(); }, 1000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserving);
  } else {
    startObserving();
  }
})();
