// Backend health check system
// Config-aware, foreground-only polling

let _config = null;

async function loadConfig() {
  if (_config) return _config;
  const resp = await fetch('./app-config.json');
  _config = await resp.json();
  return _config;
}

export async function refreshBackendStatus() {
  const config = await loadConfig();
  try {
    // Manual timeout (AbortSignal.timeout not supported on old WebView)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const resp = await fetch(config.apiBase + '/health', {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    return resp.ok;
  } catch (err) {
    console.warn('Health check failed:', err.message);
    return false;
  }
}

export function startHealthPoll() {
  // Only poll when foreground (visibility change)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      refreshBackendStatus().then(ok => {
        const indicator = document.getElementById('health-indicator');
        if (indicator) {
          indicator.classList.toggle('offline', !ok);
        }
      });
    }
  });

  // Initial check
  refreshBackendStatus().then(ok => {
    const indicator = document.getElementById('health-indicator');
    if (indicator) {
      indicator.classList.toggle('offline', !ok);
    }
  });
}
