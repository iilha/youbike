/**
 * Session Token Management (v1.5)
 *
 * Manages Worker session token lifecycle:
 * - Bootstrap: Turnstile → Worker JWT (once per 24h)
 * - Cache: localStorage with 1h expiry buffer
 * - Refresh: transparent when expired
 *
 * Architecture: Proof → Session → Trust
 * - Turnstile proves humanness ONCE at session start
 * - Worker issues 24h JWT bound to device/IP
 * - All subsequent events use JWT (no repeated challenges)
 */

let _config = null;
let _turnstileModule = null;
let _sessionKey = null;
let _sessionExpiryKey = null;

/**
 * Initialize session manager
 * @param {Object} config - App config with apiBase and turnstileSiteKey
 */
export function initSession(config) {
  if (!config?.appId) {
    throw new Error('[Session] config.appId required for session token isolation');
  }

  _config = config;

  // Auto-generate storage keys from appId (prevent cross-app pollution)
  const prefix = config.appId + '_';
  _sessionKey = prefix + 'session_token';
  _sessionExpiryKey = prefix + 'session_expires';
}

/**
 * Ensure valid session token exists (cached or bootstrap new)
 * @returns {Promise<string|null>} Session JWT or null if failed
 */
export async function ensureSession() {
  if (!_sessionKey) {
    throw new Error('[Session] Not initialized - call initSession() first');
  }

  // Check localStorage cache
  const storedToken = localStorage.getItem(_sessionKey);
  const storedExpiry = localStorage.getItem(_sessionExpiryKey);

  if (storedToken && storedExpiry) {
    const expiryTime = new Date(storedExpiry).getTime();
    const now = Date.now();

    // Token still valid with 30min buffer (6h TTL, refresh at 5.5h)
    if (expiryTime > now + 1800000) {
      console.log('[Session] Using cached token');
      return storedToken;
    }
  }

  // Need new session
  console.log('[Session] Bootstrapping new session...');
  return await bootstrapSession();
}

/**
 * Bootstrap new session (Turnstile → JWT)
 * @returns {Promise<string|null>}
 */
async function bootstrapSession() {
  if (!_config?.turnstileSiteKey) {
    console.error('[Session] No Turnstile site key configured');
    return null;
  }

  try {
    // Lazy-load turnstile module
    if (!_turnstileModule) {
      _turnstileModule = await import('./turnstile.js');
    }

    // Step 1: Get Turnstile token
    await _turnstileModule.initTurnstile(_config.turnstileSiteKey);
    const turnstileToken = await _turnstileModule.getTurnstileToken();

    if (!turnstileToken) {
      console.error('[Session] Failed to get Turnstile token');
      return null;
    }

    // Step 2: Exchange for session token
    const response = await fetch(`${_config.apiBase}/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        turnstile_token: turnstileToken,
        device_info: getDeviceInfo(),
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[Session] Bootstrap failed:', response.status, text);
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Step 3: Cache session token
    localStorage.setItem(_sessionKey, data.session_token);
    localStorage.setItem(_sessionExpiryKey, data.expires_at);

    console.log('[Session] New session bootstrapped, expires:', data.expires_at);
    return data.session_token;

  } catch (err) {
    console.error('[Session] Bootstrap failed:', err);
    return null;
  }
}

/**
 * Collect device fingerprint (privacy-safe, non-intrusive)
 * @returns {Object}
 */
function getDeviceInfo() {
  if (!_config?.appId) {
    throw new Error('[Session] config.appId required for device info');
  }

  // Get or create browser UUID (app-scoped key)
  const uuidKey = _config.appId + '_browser_uuid';
  let browserUUID = localStorage.getItem(uuidKey);
  if (!browserUUID) {
    browserUUID = crypto.randomUUID ? crypto.randomUUID() : generateUUID();
    localStorage.setItem(uuidKey, browserUUID);
  }

  return {
    browser_uuid: browserUUID,
    platform: window.__APP_ENV__?.platform || 'web',
    app_version: window.__APP_ENV__?.nativeVersionName || '1.0.0',
    fingerprint: {
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: navigator.language,
      webview_version: navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || 'unknown',
    },
  };
}

/**
 * Fallback UUID generator for old browsers
 * @returns {string}
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

/**
 * Clear session (logout / force re-bootstrap)
 */
export function clearSession() {
  if (_sessionKey) {
    localStorage.removeItem(_sessionKey);
    localStorage.removeItem(_sessionExpiryKey);
    console.log('[Session] Cleared');
  }
}
