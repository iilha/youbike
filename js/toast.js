/**
 * Toast notification system for Octile Universe transport PWAs
 * Follows "calm, low-distraction" design principles
 */

export function showToast(message, type = 'success', duration = 3000) {
  // 1. Create container if it doesn't exist
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  // 2. Create the toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type} calm-fade-in`;
  toast.textContent = message;

  container.appendChild(toast);

  // 3. Auto-dismiss (3s default, aligns with Octile Universe timing)
  setTimeout(() => {
    toast.classList.add('calm-fade-out');
    toast.addEventListener('transitionend', () => toast.remove());
  }, duration);
}
