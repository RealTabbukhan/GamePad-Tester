// Global Toast Notification System
(function() {
  'use strict';

  // Create container on load
  let container;
  function ensureContainer() {
    if (container) return container;
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
    return container;
  }

  /**
   * Show a toast notification
   * @param {string} message - Text to display
   * @param {'success'|'info'|'warning'|'error'} type - Toast type
   * @param {number} duration - Auto-dismiss time in ms (default 2500)
   */
  window.showToast = function(message, type = 'success', duration = 2500) {
    const c = ensureContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;

    const icons = { success: '✓', info: 'ℹ', warning: '⚠', error: '✕' };
    toast.innerHTML = `<span class="toast__icon">${icons[type] || '✓'}</span><span class="toast__msg">${message}</span>`;

    c.appendChild(toast);

    // Trigger entrance animation
    requestAnimationFrame(() => toast.classList.add('toast--visible'));

    // Auto dismiss
    setTimeout(() => {
      toast.classList.remove('toast--visible');
      toast.classList.add('toast--exit');
      toast.addEventListener('animationend', () => toast.remove());
    }, duration);
  };
})();
