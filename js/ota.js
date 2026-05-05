// OTA Update System v0 (Remote-First)
// Checks version.json, shows update banner, triggers reload

let _config = null;

// Pre-load config once (await-safe)
export async function initOta() {
  if (_config) return;
  const resp = await fetch('./app-config.json');
  _config = await resp.json();
}

// Sync getters (no await in non-async function)
function keyOf(suffix) {
  if (!_config) throw new Error('OTA not initialized - call initOta() first');
  return _config.storagePrefix + suffix;
}

function getStoredOtaVersion() {
  return parseInt(localStorage.getItem(keyOf('ota_version')) || '0', 10);
}

function setStoredOtaVersion(versionCode) {
  localStorage.setItem(keyOf('ota_version'), versionCode.toString());
}

function getDismissedVersion() {
  return parseInt(localStorage.getItem(keyOf('ota_dismissed')) || '0', 10);
}

function setDismissedVersion(versionCode) {
  localStorage.setItem(keyOf('ota_dismissed'), versionCode.toString());
}

export async function checkForUpdate() {
  // Only check on Android WebView
  if (!window.__APP_ENV__ || window.__APP_ENV__.platform !== 'android') {
    return;
  }

  // Ensure config loaded
  if (!_config) {
    console.warn('OTA check failed: config not initialized');
    return;
  }

  const storedVersion = getStoredOtaVersion();

  try {
    // Fetch version manifest from remote (same origin as site)
    // Use fetch with manual timeout (AbortSignal.timeout not supported on old WebView)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const resp = await fetch(_config.siteBase + 'version.json', {
      cache: 'no-cache',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!resp.ok) return;

    const manifest = await resp.json();
    const remoteVersion = manifest.otaVersionCode;

    // Check if update available
    if (remoteVersion > storedVersion) {
      const dismissedVersion = getDismissedVersion();

      // Don't show if user dismissed this version (unless force update)
      if (!manifest.forceUpdate && remoteVersion === dismissedVersion) {
        return;
      }

      // Show update banner
      showUpdateBanner(manifest);
    }
  } catch (err) {
    // Timeout or network error - fail silently
    console.warn('OTA check failed:', err.message);
  }
}

function showUpdateBanner(manifest) {
  const banner = document.getElementById('update-banner');
  const text = document.getElementById('update-text');
  const updateBtn = document.getElementById('update-btn');
  const dismissBtn = document.getElementById('update-dismiss');

  if (!banner || !text || !updateBtn || !dismissBtn) return;

  // Set text (use current language)
  const lang = localStorage.getItem('lang') || 'en';
  text.textContent = manifest.releaseNotes[lang] || manifest.releaseNotes.en;

  // Update button (force update or normal)
  if (manifest.forceUpdate) {
    dismissBtn.style.display = 'none';
    updateBtn.textContent = lang === 'zh' ? '立即更新' : 'Update Now';
  } else {
    dismissBtn.style.display = '';
    updateBtn.textContent = lang === 'zh' ? '更新' : 'Update';
  }

  // Show banner
  banner.style.display = 'flex';

  // Update button: standard SW update flow (NOT unregister)
  updateBtn.onclick = async () => {
    setStoredOtaVersion(manifest.otaVersionCode);

    // If SW available, trigger update then reload
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.update(); // Fetch new SW
          if (reg.waiting) {
            // Tell waiting SW to skipWaiting
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }
      } catch (err) {
        console.warn('SW update failed:', err);
      }
    }

    // Reload page (hard reload to bypass cache)
    window.location.reload(true);
  };

  // Dismiss button: store dismissed version
  dismissBtn.onclick = () => {
    setDismissedVersion(manifest.otaVersionCode);
    banner.style.display = 'none';
  };
}
