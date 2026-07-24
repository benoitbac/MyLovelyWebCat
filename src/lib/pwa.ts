// Enregistrement du service worker (PWA). Silencieux en cas d'échec :
// l'app reste pleinement fonctionnelle sans lui.

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return; // pas de SW en développement (HMR)

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* hors-ligne non critique */
    });
  });
}
