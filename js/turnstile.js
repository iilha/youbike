/**
 * Cloudflare Turnstile Widget Wrapper
 *
 * Manages invisible Turnstile widget lifecycle:
 * - Initialize: render widget on page load
 * - Get token: returns valid token (cached or wait for new)
 * - Auto-refresh: handles expiration callback
 */

let currentToken = null;
let widgetId = null;
let tokenExpiryTime = null;
let initPromise = null;

/**
 * Initialize Turnstile invisible widget
 * @param {string} siteKey - Turnstile site key
 * @returns {Promise<void>}
 */
export async function initTurnstile(siteKey) {
  // Return existing init promise if already initializing
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    // Check if widget already rendered
    if (widgetId !== null && typeof window.turnstile !== 'undefined') {
      resolve();
      return;
    }

    // Wait for turnstile script to load
    const checkTurnstile = setInterval(() => {
      if (typeof window.turnstile === 'undefined') return;
      clearInterval(checkTurnstile);

      try {
        // Create invisible container if not exists
        let container = document.getElementById('cf-turnstile');
        if (!container) {
          container = document.createElement('div');
          container.id = 'cf-turnstile';
          container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';
          document.body.appendChild(container);
        }

        // Render invisible widget
        widgetId = window.turnstile.render('#cf-turnstile', {
          sitekey: siteKey,
          callback: (token) => {
            currentToken = token;
            tokenExpiryTime = Date.now() + 280000; // 4min 40s (20s buffer before 5min expiry)
            console.log('[Turnstile] Token obtained');
          },
          'error-callback': (errorCode) => {
            console.error('[Turnstile] Challenge failed:', errorCode);
            currentToken = null;
            tokenExpiryTime = null;
            // 110xxx = config error (domain not authorized) — don't retry
            if (typeof errorCode === 'string' && errorCode.startsWith('110')) {
              reject(new Error(`Turnstile config error: ${errorCode}`));
            }
          },
          'expired-callback': () => {
            console.warn('[Turnstile] Token expired, refreshing...');
            currentToken = null;
            tokenExpiryTime = null;
            if (widgetId !== null) {
              window.turnstile.reset(widgetId);
            }
          },
          size: 'invisible',
          theme: 'light',
        });

        console.log('[Turnstile] Widget initialized');
        resolve();
      } catch (err) {
        console.error('[Turnstile] Init failed:', err);
        reject(err);
      }
    }, 100);

    // Timeout after 10s
    setTimeout(() => {
      clearInterval(checkTurnstile);
      reject(new Error('Turnstile script load timeout'));
    }, 10000);
  });

  return initPromise;
}

/**
 * Get valid Turnstile token (cached or wait for new)
 * @returns {Promise<string|null>}
 */
export async function getTurnstileToken() {
  // Return cached token if still valid
  if (currentToken && Date.now() < tokenExpiryTime) {
    return currentToken;
  }

  // Token expired or doesn't exist, wait for refresh
  return new Promise((resolve) => {
    let attempts = 0;
    const checkToken = setInterval(() => {
      attempts++;

      if (currentToken && Date.now() < tokenExpiryTime) {
        clearInterval(checkToken);
        resolve(currentToken);
      }

      // Timeout after 5s (50 attempts × 100ms)
      if (attempts >= 50) {
        clearInterval(checkToken);
        console.error('[Turnstile] Token wait timeout');
        resolve(null);
      }
    }, 100);
  });
}

/**
 * Force refresh Turnstile token
 */
export function resetTurnstile() {
  if (widgetId !== null && typeof window.turnstile !== 'undefined') {
    currentToken = null;
    tokenExpiryTime = null;
    window.turnstile.reset(widgetId);
    console.log('[Turnstile] Widget reset');
  }
}
