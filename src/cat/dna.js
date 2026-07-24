// ============================================================================
//  dna.js — "ADN Cosmétique" : l'état complet du chat, sérialisable dans l'URL.
//  Tout ce qui définit l'apparence/le comportement tient dans cet objet.
// ============================================================================

export const DEFAULT_DNA = {
  v: 1,
  primary: '#9a7bff',   // pelage (lavande douce)
  neon: '#66d9ff',      // glow / traînée
  accent: '#ffd24a',    // yeux (doré — regard de chat)
  behavior: 'magnet',   // 'magnet' (suit) | 'shy' (fuit)
  hat: false,           // chapeau cyberpunk
  trail: 0.38,          // longueur de la traînée [0..1]
  glow: 0.7,            // intensité lumineuse [0..1]
  density: 'medium',    // 'low' | 'medium' | 'high'
};

// Les champs qui imposent de reconstruire le buffer de particules.
export const STRUCTURAL_KEYS = ['hat', 'density'];

export function cloneDNA(dna) {
  return { ...DEFAULT_DNA, ...dna };
}

// --- Encodage compact dans l'URL (base64 URL-safe) -------------------------
export function encodeDNA(dna) {
  const json = JSON.stringify(dna);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeDNA(str) {
  try {
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(escape(atob(b64)));
    return cloneDNA(JSON.parse(json));
  } catch {
    return null;
  }
}

export function dnaFromURL() {
  const params = new URLSearchParams(location.hash.slice(1));
  const code = params.get('dna');
  return code ? decodeDNA(code) : null;
}

export function shareURL(dna) {
  const url = new URL(location.href);
  url.hash = 'dna=' + encodeDNA(dna);
  return url.toString();
}

// Hex "#rrggbb" → [r,g,b] normalisé (0..1).
export function hexToRGB(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
