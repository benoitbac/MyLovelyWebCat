// ============================================================================
//  silhouette.js — Génère un chat CHARMANT (et pas une boule de lumière).
//  Principe : un CONTOUR net dessine la silhouette, un intérieur DOUX la
//  remplit sans l'éblouir, et des traits de visage (yeux, oreilles roses,
//  museau, moustaches, joues) lui donnent du caractère.
//
//  kinds :
//    0 = contour (pelage, net)     3 = rose (oreilles/nez/joues)
//    1 = yeux (accent, brillant)   4 = moustaches / bouche (doux)
//    2 = chapeau (néon)            5 = remplissage interne (doux)
//
//  Chaque particule = 8 floats : [posX,posY, velX,velY, homeX,homeY, seed, kind]
// ============================================================================

const FLOATS = 8;
const TAU = Math.PI * 2;

// --- Tests d'appartenance (pour le remplissage intérieur) ------------------
const inCircle = (x, y, cx, cy, r) => { const dx = x - cx, dy = y - cy; return dx * dx + dy * dy <= r * r; };
const inEllipse = (x, y, cx, cy, rx, ry) => { const dx = (x - cx) / rx, dy = (y - cy) / ry; return dx * dx + dy * dy <= 1; };
const edge = (px, py, ax, ay, bx, by) => (px - bx) * (ay - by) - (ax - bx) * (py - by);
function inTri(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = edge(px, py, ax, ay, bx, by), d2 = edge(px, py, bx, by, cx, cy), d3 = edge(px, py, cx, cy, ax, ay);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}
function inCapsule(px, py, ax, ay, bx, by, r) {
  const pax = px - ax, pay = py - ay, bax = bx - ax, bay = by - ay;
  const h = Math.min(1, Math.max(0, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  const dx = pax - bax * h, dy = pay - bay * h;
  return dx * dx + dy * dy <= r * r;
}

// Zone pleine du chat (pour le remplissage doux).
function inCat(x, y) {
  return inCircle(x, y, 0, 0.16, 0.36)                       // tête
      || inEllipse(x, y, 0, -0.40, 0.34, 0.36)               // corps
      || inTri(x, y, -0.34, 0.34, -0.05, 0.44, -0.28, 0.74)  // oreille G
      || inTri(x, y, 0.34, 0.34, 0.05, 0.44, 0.28, 0.74)     // oreille D
      || inCircle(x, y, -0.15, -0.66, 0.12)                  // patte G
      || inCircle(x, y, 0.15, -0.66, 0.12)                   // patte D
      || inCapsule(x, y, 0.30, -0.58, 0.54, -0.10, 0.08)     // queue (bas)
      || inCapsule(x, y, 0.54, -0.10, 0.33, 0.15, 0.07);     // queue (haut)
}
// Emplacement des yeux — évidé du remplissage pour que le regard ressorte.
function inEye(x, y) {
  return inEllipse(x, y, -0.13, 0.16, 0.075, 0.10) || inEllipse(x, y, 0.13, 0.16, 0.075, 0.10);
}

export function buildParticleData(dna) {
  const P = [];                                  // [x, y, kind]
  const scale = { low: 0.6, medium: 1.0, high: 1.7 }[dna.density] ?? 1.0;
  const feat = Math.min(1.3, Math.max(0.75, scale));
  const N = (base, mul = scale) => Math.max(2, Math.round(base * mul));

  // --- Générateurs ----------------------------------------------------------
  const ring = (cx, cy, rx, ry, a0, a1, n, k) => {
    for (let i = 0; i < n; i++) { const t = a0 + (a1 - a0) * (i / n); P.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry, k]); }
  };
  const line = (x1, y1, x2, y2, n, k) => {
    for (let i = 0; i < n; i++) { const t = i / (n - 1); P.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, k]); }
  };
  const disk = (cx, cy, rx, ry, n, k) => {
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, r = Math.sqrt(Math.random()); P.push([cx + Math.cos(a) * r * rx, cy + Math.sin(a) * r * ry, k]); }
  };
  const tri = (ax, ay, bx, by, cx, cy, n, k) => {
    for (let i = 0; i < n; i++) { let r1 = Math.random(), r2 = Math.random(); if (r1 + r2 > 1) { r1 = 1 - r1; r2 = 1 - r2; } P.push([ax + r1 * (bx - ax) + r2 * (cx - ax), ay + r1 * (by - ay) + r2 * (cy - ay), k]); }
  };
  // Courbe de Bézier quadratique "épaisse" → la queue.
  const bez = (p0, pc, p1, n, thick, k) => {
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), u = 1 - t;
      const x = u * u * p0[0] + 2 * u * t * pc[0] + t * t * p1[0];
      const y = u * u * p0[1] + 2 * u * t * pc[1] + t * t * p1[1];
      const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * thick;
      P.push([x + Math.cos(a) * r, y + Math.sin(a) * r, k]);
    }
  };

  // --- CONTOUR (net) --------------------------------------------------------
  ring(0, 0.16, 0.36, 0.36, 0, TAU, N(820), 0);            // tête
  ring(0, -0.40, 0.34, 0.36, 0, TAU, N(720), 0);           // corps
  // oreilles (les 2 arêtes extérieures en V)
  line(-0.34, 0.34, -0.28, 0.74, N(150), 0); line(-0.28, 0.74, -0.05, 0.44, N(150), 0);
  line(0.34, 0.34, 0.28, 0.74, N(150), 0); line(0.28, 0.74, 0.05, 0.44, N(150), 0);
  ring(-0.15, -0.66, 0.12, 0.12, 0, TAU, N(120), 0);       // pattes
  ring(0.15, -0.66, 0.12, 0.12, 0, TAU, N(120), 0);
  // queue (2 segments courbes)
  bez([0.30, -0.58], [0.64, -0.42], [0.54, -0.08], N(240), 0.05, 0);
  bez([0.54, -0.08], [0.48, 0.12], [0.33, 0.16], N(180), 0.045, 0);

  // --- REMPLISSAGE interne (doux) ------------------------------------------
  const fillTarget = N(2400);
  let tries = 0;
  while (P.filter(p => p[2] === 5).length < fillTarget && tries < fillTarget * 40) {
    tries++;
    const x = -0.7 + Math.random() * 1.4, y = -0.95 + Math.random() * 1.9;
    if (!inCat(x, y) || inEye(x, y)) continue;
    P.push([x, y, 5]);
  }

  // --- VISAGE ---------------------------------------------------------------
  disk(-0.13, 0.16, 0.055, 0.075, N(240, feat), 1);        // oeil G
  disk(0.13, 0.16, 0.055, 0.075, N(240, feat), 1);         // oeil D
  disk(-0.155, 0.20, 0.015, 0.015, N(24, feat), 1);        // reflet (sparkle) G
  disk(0.105, 0.20, 0.015, 0.015, N(24, feat), 1);         // reflet D
  tri(-0.035, 0.055, 0.035, 0.055, 0, 0.005, N(80, feat), 3); // museau
  ring(-0.03, -0.01, 0.03, 0.02, 0, Math.PI, N(24, feat), 4);  // bouche :3
  ring(0.03, -0.01, 0.03, 0.02, 0, Math.PI, N(24, feat), 4);
  disk(-0.25, 0.0, 0.055, 0.045, N(110, feat), 3);         // joue G
  disk(0.25, 0.0, 0.055, 0.045, N(110, feat), 3);          // joue D
  tri(-0.30, 0.40, -0.10, 0.47, -0.26, 0.66, N(120, feat), 3); // oreille interne G
  tri(0.30, 0.40, 0.10, 0.47, 0.26, 0.66, N(120, feat), 3);    // oreille interne D
  // moustaches (3 de chaque côté)
  line(-0.17, 0.05, -0.46, 0.12, N(26, feat), 4); line(-0.18, 0.01, -0.48, 0.02, N(26, feat), 4); line(-0.17, -0.03, -0.46, -0.07, N(26, feat), 4);
  line(0.17, 0.05, 0.46, 0.12, N(26, feat), 4); line(0.18, 0.01, 0.48, 0.02, N(26, feat), 4); line(0.17, -0.03, 0.46, -0.07, N(26, feat), 4);

  // --- Chapeau cyberpunk (optionnel) ---------------------------------------
  if (dna.hat) {
    ring(0, 0.52, 0.30, 0.07, 0, TAU, N(300), 2);          // bord
    disk(0, 0.65, 0.16, 0.12, N(420), 2);                  // couronne
    line(-0.15, 0.55, 0.15, 0.55, N(60), 2);               // bandeau néon
  }

  // --- Sérialisation --------------------------------------------------------
  const count = P.length;
  const data = new Float32Array(count * FLOATS);
  for (let i = 0; i < count; i++) {
    const [x, y, k] = P[i];
    const o = i * FLOATS;
    const j = k === 5 ? 0.012 : 0.006;                     // fill un peu plus flou
    data[o] = x + (Math.random() - 0.5) * j;
    data[o + 1] = y + (Math.random() - 0.5) * j;
    data[o + 2] = 0; data[o + 3] = 0;
    data[o + 4] = x; data[o + 5] = y;
    data[o + 6] = Math.random() * TAU;
    data[o + 7] = k;
  }
  return { data, count };
}
