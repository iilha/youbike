// UUID generation and management
// Generates persistent UUID for session/browser tracking

export function getBrowserUUID() {
  const stored = localStorage.getItem('youbike_browser_uuid');
  if (stored) return stored;

  const uuid = generateUUID();
  localStorage.setItem('youbike_browser_uuid', uuid);
  return uuid;
}

export function getCookieUUID() {
  return localStorage.getItem('youbike_cookie_uuid') || null;
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
