/**
 * Minimal event tracking for transport PWAs (v1.5 - Session Token)
 * - Session events only (app_open)
 * - Offline queue with throttled flush (3.1s between sends)
 * - Size limits (2 KB)
 * - Client UUID only (no cookie reliance)
 * - Session token authentication (lazy bootstrap)
 * - Debug logging
 */

import { getBrowserUUID } from './uuid.js';
import { ensureSession, clearSession } from './session.js';

const QUEUE_KEY = '{app_id}_event_queue';
const MAX_QUEUE_SIZE = 50;
const EVENT_SIZE_LIMIT = 2048; // 2 KB
const RATE_LIMIT_MS = 5000;    // 5s between events
const FLUSH_DELAY_MS = 3100;   // 3.1s between flush sends

let _config = null;
let _lastEventTime = 0;
let _debugMode = false;
let _flushing = false;  // Re-entrancy guard

export function initAnalytics(config) {
  _config = config;
  _debugMode = config.debug || false;

  if (!config.features?.events) {
    _log('Events disabled in config');
    return;
  }

  // Runtime safety: warn if devMode is enabled in production
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isLocalhost && config.devMode === true) {
    console.warn('[Analytics] ⚠️  devMode is true in production origin - events will not be sent');
  }

  window.addEventListener('online', flushEventQueue);
  _log('Analytics initialized', { appId: config.appId });
}

export async function trackEvent(eventName, eventProps = {}) {
  if (!_config?.features?.events) return;

  // Rate limiting
  const now = Date.now();
  if (now - _lastEventTime < RATE_LIMIT_MS) {
    _log('Rate limited, skipping event', eventName);
    return;
  }
  _lastEventTime = now;

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const event = {
    event_type: 'session',
    event_name: eventName,
    app_id: _config.appId,
    browser_uuid: getBrowserUUID(),  // Client UUID always
    platform: _getPlatform(),
    env: isLocalhost || _config.devMode ? 'dev' : 'prod',
    origin: window.location.origin,
    event_props: _sanitizeProps(eventProps),
    timestamp_utc: new Date().toISOString(),
    submission_id: crypto.randomUUID()
  };

  // Fix #4.1: Use byte size, not character count
  const eventBytes = new TextEncoder().encode(JSON.stringify(event)).length;
  if (eventBytes > EVENT_SIZE_LIMIT) {
    _log('Event too large, truncating', { bytes: eventBytes });
    event.event_props = { error: 'props_truncated' };
  }

  // Dev mode: log but don't send (production API requires worker signature)
  if (_config.devMode) {
    _log('Dev mode: Event created (not sent)', event);
    return;
  }

  if (!navigator.onLine) {
    _queueEvent(event);
    _log('Offline, queued event', event);
    return;
  }

  try {
    await _sendEvent(event);
    _log('Event sent', event);
  } catch (e) {
    _log('Event send failed, queuing', { event, error: e.message });
    _queueEvent(event);
  }
}

async function _sendEvent(event) {
  const url = _config.apiBase + '/events';

  // Get session token (fast if cached ~50ms; bootstrap if needed ~2s)
  let sessionToken = null;
  try {
    sessionToken = await ensureSession();
  } catch (err) {
    _log('Failed to get session token:', err);
    // Continue anyway - web with Origin might not need it
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const headers = {
      'Content-Type': 'application/json',
      'X-Player-UUID': event.browser_uuid
    };

    // Add session token if available (preferred over Turnstile)
    if (sessionToken) {
      headers['X-Session-Token'] = sessionToken;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(event),
      signal: controller.signal
    });

    clearTimeout(timeout);

    // If 401 (expired/invalid token), clear cache and immediate retry
    if (response.status === 401 && sessionToken) {
      _log('Session token rejected, clearing cache and retrying...');
      clearSession();

      // Immediate retry with new session (don't wait for next event)
      try {
        const newToken = await ensureSession();
        if (newToken) {
          headers['X-Session-Token'] = newToken;
          const retryResponse = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(event),
            signal: controller.signal
          });
          if (retryResponse.ok) {
            _log('Retry succeeded with new session token');
            return await retryResponse.json();
          }
        }
      } catch (retryErr) {
        _log('Retry failed:', retryErr.message);
      }
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

function _queueEvent(event) {
  try {
    const key = QUEUE_KEY.replace('{app_id}', _config.appId);
    const queue = JSON.parse(localStorage.getItem(key) || '[]');

    if (queue.length >= MAX_QUEUE_SIZE) {
      queue.shift(); // Drop oldest
    }

    queue.push(event);
    localStorage.setItem(key, JSON.stringify(queue));
  } catch (e) {
    _log('Failed to queue event', e.message);
  }
}

export async function flushEventQueue() {
  if (!_config?.features?.events) return;
  if (_flushing) {
    _log('Flush already in progress, skipping');
    return;
  }

  _flushing = true;

  try {
    const key = QUEUE_KEY.replace('{app_id}', _config.appId);
    const queue = JSON.parse(localStorage.getItem(key) || '[]');

    if (queue.length === 0) return;

    _log('Flushing event queue', { count: queue.length });

    const flushed = [];

    for (let i = 0; i < queue.length; i++) {
      const event = queue[i];

      try {
        await _sendEvent(event);
        flushed.push(event);
        _log('Flushed event', { index: i + 1, total: queue.length });

        // Throttle: 3.1s delay between sends
        if (i < queue.length - 1) {
          await _sleep(FLUSH_DELAY_MS);
        }
      } catch (e) {
        _log('Failed to flush event, stopping', { failed_at: i, error: e.message });
        break;
      }
    }

    // Remove flushed events from queue
    if (flushed.length > 0) {
      const remaining = queue.slice(flushed.length);
      if (remaining.length === 0) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(remaining));
      }
      _log('Flush complete', { flushed: flushed.length, remaining: remaining.length });
    }
  } catch (e) {
    _log('Failed to flush event queue', e.message);
  } finally {
    _flushing = false;
  }
}

function _sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function _sanitizeProps(props) {
  const sanitized = {};

  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'function' || typeof value === 'symbol' || value === undefined) {
      continue;
    }

    if (typeof value === 'string' && value.length > 200) {
      sanitized[key] = value.substring(0, 200) + '...';
      continue;
    }

    if (typeof value === 'object' && JSON.stringify(value).length > 500) {
      sanitized[key] = '[truncated]';
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
}

function _getPlatform() {
  if (typeof window.__APP_ENV__ !== 'undefined') {
    return window.__APP_ENV__.platform || 'android';
  }
  return window.Capacitor?.getPlatform?.() || 'web';
}

function _log(...args) {
  if (_debugMode) {
    console.debug('[Analytics]', ...args);
  }
}
