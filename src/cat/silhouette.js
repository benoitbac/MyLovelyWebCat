// ============================================================================
//  silhouette.js — Génère les positions "maison" des particules qui forment
//  le chat assis. On teste l'appartenance à une union de formes simples
//  (corps, tête, oreilles, queue) par échantillonnage par rejet.
//  Chaque particule = 8 floats : [posX,posY, velX,velY, homeX,homeY, seed, kind]
// ============================================================================

const FLOATS_PER_PARTICLE = 8;

const DENSITY = { low: 22000, medium: 48000, high: 90000 };

// --- Tests d'appartenance géométriques -------------------------------------
const inCircle = (x, y, cx, cy, r) => { const dx = x - cx, dy = y - cy; return dx * dx + dy * dy <= r * r; };

const inEllipse = (x, y, cx, cy, rx, ry) => { const dx = (x - cx) / rx, dy = (y - cy) / ry; return dx * dx + dy * dy <= 1; };

const edge = (px, py, ax, ay, bx, by) => (px - bx) * (ay - by) - (ax - bx) * (py - by);
function inTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = edge(px, py, ax, ay, bx, by);
  const d2 = edge(px, py, bx, by, cx, cy);
  const d3 = edge(px, py, cx, cy, ax, ay);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function inCapsule(px, py, ax, ay, bx, by, r) {
  const pax = px - ax, pay = py - ay, bax = bx - ax, bay = by - ay;
  const h = Math.min(1, Math.max(0, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  const dx = pax - bax * h, dy = pay - bay * h;
  return dx * dx + dy * dy <= r * r;
}

// Silhouette d'un chat assis, dans un espace "monde" centré (y vers le haut).
function inCat(x, y) {
  if (inEllipse(x, y, 0.0, -0.35, 0.42, 0.50)) return true;   // corps
  if (inCircle(x, y, 0.0, 0.33, 0.30)) return true;            // tête
  if (inTriangle(x, y, -0.30, 0.45, -0.05, 0.55, -0.20, 0.86)) return true; // oreille G
  if (inTriangle(x, y, 0.30, 0.45, 0.05, 0.55, 0.20, 0.86)) return true;    // oreille D
  if (inCapsule(x, y, 0.34, -0.55, 0.60, -0.18, 0.10)) return true;  // queue (bas)
  if (inCapsule(x, y, 0.60, -0.18, 0.63, 0.22, 0.09)) return true;   // queue (haut)
  return false;
}

// Trous à évider pour que les yeux/le museau ressortent en négatif.
function isHole(x, y) {
  if (inCircle(x, y, -0.11, 0.37, 0.05)) return true;
  if (inCircle(x, y, 0.11, 0.37, 0.05)) return true;
  if (inTriangle(x, y, -0.028, 0.27, 0.028, 0.27, 0.0, 0.225)) return true; // museau
  return false;
}

export function buildParticleData(dna) {
  const total = DENSITY[dna.density] ?? DENSITY.medium;
  const eyeCount = 520;
  const hatCount = dna.hat ? Math.floor(total * 0.08) : 0;
  const bodyCount = total - eyeCount - hatCount;

  const data = new Float32Array(total * FLOATS_PER_PARTICLE);
  let idx = 0;

  const put = (hx, hy, kind) => {
    const o = idx * FLOATS_PER_PARTICLE;
    const jx = (Math.random() - 0.5) * 0.02;
    const jy = (Math.random() - 0.5) * 0.02;
    data[o] = hx + jx; data[o + 1] = hy + jy;   // pos initiale (avec jitter)
    data[o + 2] = 0; data[o + 3] = 0;           // vel
    data[o + 4] = hx; data[o + 5] = hy;         // home (cible)
    data[o + 6] = Math.random() * 6.2831853;    // seed
    data[o + 7] = kind;
    idx++;
  };

  // Corps : échantillonnage par rejet dans la boîte englobante.
  let tries = 0;
  const maxTries = bodyCount * 60;
  while (idx < bodyCount && tries < maxTries) {
    tries++;
    const x = -0.72 + Math.random() * 1.44;
    const y = -0.95 + Math.random() * 1.90;
    if (!inCat(x, y) || isHole(x, y)) continue;
    put(x, y, 0);
  }
  // Filet de sécurité si le rejet n'a pas convergé (rare).
  while (idx < bodyCount) put((Math.random() - 0.5) * 0.3, -0.35 + (Math.random() - 0.5) * 0.3, 0);

  // Yeux : deux petits disques d'accent.
  for (let i = 0; i < eyeCount; i++) {
    const side = i < eyeCount / 2 ? -0.11 : 0.11;
    const a = Math.random() * 6.2831853;
    const r = Math.sqrt(Math.random()) * 0.045;
    put(side + Math.cos(a) * r, 0.37 + Math.sin(a) * r * 0.85, 1);
  }

  // Chapeau cyberpunk : bord (anneau) + couronne (boîte au-dessus de la tête).
  for (let i = 0; i < hatCount; i++) {
    if (Math.random() < 0.42) {
      const a = Math.random() * 6.2831853;
      const rr = 0.30 + Math.random() * 0.06;
      put(Math.cos(a) * rr, 0.60 + Math.sin(a) * 0.05, 2);
    } else {
      put((Math.random() - 0.5) * 0.34, 0.63 + Math.random() * 0.22, 2);
    }
  }

  return { data, count: idx };
}
