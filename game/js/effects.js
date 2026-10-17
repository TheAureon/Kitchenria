// effects.js — little celebrations: sparkle bursts, toast messages and bounces.

const prefersReducedMotion = () =>
  document.documentElement.classList.contains('reduce-motion') ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A burst of tiny stars at a screen position (clientX/clientY). */
export function sparkleBurst(x, y, count = 14) {
  const layer = document.getElementById('fx-layer');
  if (!layer) return;
  const n = prefersReducedMotion() ? 0 : count;
  const colors = ['#ffd45e', '#ff9fb2', '#9fd9ff', '#b8f0a0', '#ffffff'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'spark';
    const ang = (i / n) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 40 + Math.random() * 50;
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
    s.style.setProperty('--dy', `${Math.sin(ang) * dist}px`);
    s.style.setProperty('--c', colors[i % colors.length]);
    s.style.setProperty('--s', `${0.6 + Math.random() * 0.8}`);
    s.addEventListener('animationend', () => s.remove());
    layer.appendChild(s);
  }
  // a soft ring of light behind the stars
  const ring = document.createElement('span');
  ring.className = 'spark-ring';
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  ring.addEventListener('animationend', () => ring.remove());
  layer.appendChild(ring);
  if (n === 0) setTimeout(() => ring.remove(), 900);
}

/**
 * Shows a small message card. kind: 'new' (big celebration), 'info' or 'soft'.
 * html is trusted text built by the game itself.
 */
export function toast({ title = '', body = '', art = '', kind = 'info', ms = 3200 }) {
  const box = document.getElementById('toasts');
  if (!box) return;
  // keep at most 3 on screen
  while (box.children.length >= 3) box.firstElementChild.remove();
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.innerHTML = `${art ? `<div class="toast-art">${art}</div>` : ''}<div class="toast-text">${title ? `<strong>${title}</strong>` : ''}${body ? `<span>${body}</span>` : ''}</div>`;
  box.appendChild(el);
  setTimeout(() => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 400);
  }, ms);
}

/** Restart a CSS animation class on an element (e.g. 'squash', 'wiggle'). */
export function bounce(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth; // forces the browser to notice the class was removed
  el.classList.add(cls);
  el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
}

/** Escape text before putting it inside HTML. */
export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
