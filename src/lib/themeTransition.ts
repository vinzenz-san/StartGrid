// Shared "dip to dark" transition used whenever the global theme changes —
// a dark overlay fades in over the current page, the theme swaps underneath
// it, then it fades back out. Max opacity 0.85 keeps widgets dimmed-but-
// visible rather than fully hidden. Used by both the settings-button-cluster
// ThemeToggle and the Settings-panel theme Dropdown so the effect stays
// identical (and in one place) regardless of which control triggered it.
export function runThemeTransition(applyChange: () => void) {
  const overlay = document.createElement('div');
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:999999',
    'background:#0f1117',
    'opacity:0', 'pointer-events:none',
    'transition:opacity 0.2s ease',
  ].join(';');
  document.body.appendChild(overlay);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    overlay.style.opacity = '0.85';
    setTimeout(() => {
      applyChange();
      overlay.style.transition = 'opacity 0.9s ease';
      overlay.style.opacity = '0';
      overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    }, 160);
  }));
}
