// Rendu du compagnon en SDF (signed distance fields) : le chat est décrit par
// des formes mathématiques fusionnées, ce qui donne un rendu net, lisse et
// scalable à toute résolution — bien plus « mignon » qu'un nuage de points.
// L'expression (yeux, bouche, oreilles, rougeur) et le regard sont pilotés
// par les uniformes, eux-mêmes alimentés par la machine à humeurs.

export const CAT_WGSL = /* wgsl */ `
struct U {
  res        : vec2f,
  mouse      : vec2f,
  time       : f32,
  mouseActive: f32,
  eyeOpen    : f32,
  mouthCurve : f32,
  earPerk    : f32,
  blush      : f32,
  sleepy     : f32,
  breathe    : f32,
  furA   : vec4f,
  furB   : vec4f,
  belly  : vec4f,
  eyeCol : vec4f,
  accent : vec4f,
  morph  : vec4f,   // x = taille oreilles, y = rondeur
};
@group(0) @binding(0) var<uniform> u : U;

struct VO {
  @builtin(position) pos : vec4f,
  @location(0)       uv  : vec2f,
};

@vertex
fn vs(@builtin(vertex_index) i : u32) -> VO {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var o : VO;
  o.pos = vec4f(p[i], 0.0, 1.0);
  o.uv  = (p[i] + 1.0) * 0.5;
  return o;
}

fn sdCircle(p : vec2f, r : f32) -> f32 {
  return length(p) - r;
}
fn sdEllipse(p : vec2f, r : vec2f) -> f32 {
  let pp = abs(p) + vec2f(1e-4);
  let k1 = length(pp / r);
  let k2 = length(pp / (r * r));
  return k1 * (k1 - 1.0) / k2;
}
fn sdSegment(p : vec2f, a : vec2f, b : vec2f) -> f32 {
  let pa = p - a;
  let ba = b - a;
  let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
fn smin(a : f32, b : f32, k : f32) -> f32 {
  let h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
// Masque plein (1 à l'intérieur), anti-aliasé sur ~un pixel.
fn fillMask(d : f32, px : f32) -> f32 {
  return 1.0 - smoothstep(-px, px, d);
}

@fragment
fn fs(in : VO) -> @location(0) vec4f {
  let aspect = u.res.x / u.res.y;
  var p = in.uv * 2.0 - 1.0;
  p.x *= aspect;
  p *= 1.15;                       // léger zoom pour cadrer le chat

  let t  = u.time;
  let px = fwidth(p.x) * 1.2;      // taille pixel (pour l'AA)

  // Fond doux.
  var col = mix(vec3f(0.05, 0.045, 0.09), vec3f(0.02, 0.02, 0.04), clamp(length(p) * 0.4, 0.0, 1.0));

  // Respiration : on inspire/expire en dilatant légèrement le repère.
  let br = 1.0 + 0.02 * sin(t * 1.4) * u.breathe;
  let q = p / br;

  // --- Corps (union lisse : tête + corps + oreilles) ---
  let rd = clamp(u.morph.y, -1.0, 1.0);          // rondeur
  let es = clamp(u.morph.x, 0.6, 1.4);           // taille des oreilles
  let head = sdCircle(q - vec2f(0.0, 0.18), 0.42 * (1.0 + 0.05 * rd));
  let body = sdEllipse(q - vec2f(0.0, -0.5), vec2f(0.4 * (1.0 + 0.02 * rd), 0.42 * (1.0 + 0.04 * rd)));
  let earTy = 0.36 + (0.16 + 0.08 * u.earPerk) * es;
  let elTip = vec2f(-0.26 - 0.08 * es, earTy);
  let erTip = vec2f(0.26 + 0.08 * es, earTy);
  let earL = sdSegment(q, vec2f(-0.26, 0.36), elTip) - 0.1;
  let earR = sdSegment(q, vec2f(0.26, 0.36), erTip) - 0.1;
  var d = smin(head, body, 0.18);
  d = smin(d, earL, 0.06);
  d = smin(d, earR, 0.06);

  let bodyMask = fillMask(d, px);

  // Pelage : dégradé vertical + ventre plus clair.
  var fur = mix(u.furB.rgb, u.furA.rgb, clamp(q.y * 0.7 + 0.6, 0.0, 1.0));
  let belly = sdEllipse(q - vec2f(0.0, -0.52), vec2f(0.24, 0.30));
  fur = mix(fur, u.belly.rgb, fillMask(belly, px) * 0.9);
  col = mix(col, fur, bodyMask);

  // Halo doux autour de la silhouette.
  let glow = fillMask(abs(d) - 0.05, px * 2.0) * 0.18;
  col += u.furA.rgb * glow;

  // Oreilles internes roses.
  let iEarL = sdSegment(q, vec2f(-0.26, 0.39), elTip) - 0.045;
  let iEarR = sdSegment(q, vec2f(0.26, 0.39), erTip) - 0.045;
  col = mix(col, u.accent.rgb, fillMask(iEarL, px) * 0.85);
  col = mix(col, u.accent.rgb, fillMask(iEarR, px) * 0.85);

  // --- Yeux (avec clignement + regard qui suit la souris) ---
  let eyeY = 0.2;
  var bp = fract(t * 0.3);
  var blink = 1.0;
  if (bp < 0.06) { blink = abs(bp - 0.03) / 0.03; }   // clignement triangulaire
  let eo = clamp(u.eyeOpen * blink, 0.05, 1.0);

  let elC = vec2f(-0.15, eyeY);
  let erC = vec2f(0.15, eyeY);
  let eyeR = vec2f(0.085, 0.11 * eo);

  var gaze = vec2f(0.0);
  if (u.mouseActive > 0.5) {
    gaze = clamp((u.mouse - vec2f(0.0, eyeY)) * 0.10, vec2f(-0.03), vec2f(0.03));
  }

  let scleraL = fillMask(sdEllipse(q - elC, eyeR), px);
  let scleraR = fillMask(sdEllipse(q - erC, eyeR), px);
  col = mix(col, vec3f(0.96, 0.97, 1.0) * 0.92, max(scleraL, scleraR));

  let irisL = fillMask(sdCircle(q - elC - gaze, 0.055 * eo + 0.002), px);
  let irisR = fillMask(sdCircle(q - erC - gaze, 0.055 * eo + 0.002), px);
  col = mix(col, u.eyeCol.rgb, max(irisL, irisR));

  let pupL = fillMask(sdCircle(q - elC - gaze, 0.028 * eo + 0.002), px);
  let pupR = fillMask(sdCircle(q - erC - gaze, 0.028 * eo + 0.002), px);
  col = mix(col, vec3f(0.05, 0.04, 0.08), max(pupL, pupR));

  let hlL = fillMask(sdCircle(q - elC - gaze - vec2f(0.02, 0.02), 0.013), px);
  let hlR = fillMask(sdCircle(q - erC - gaze - vec2f(0.02, 0.02), 0.013), px);
  col = mix(col, vec3f(1.0), max(hlL, hlR) * 0.9);

  // --- Museau ---
  let nose = sdSegment(q, vec2f(-0.02, 0.06), vec2f(0.02, 0.06)) - 0.02;
  col = mix(col, u.accent.rgb, fillMask(nose, px));

  // --- Bouche (:3), coins relevés selon le sourire ---
  let mo = 0.055;
  let mcy = 0.02 * u.mouthCurve;
  let mL = sdSegment(q, vec2f(0.0, 0.005), vec2f(-mo, 0.005 + mcy)) - 0.006;
  let mR = sdSegment(q, vec2f(0.0, 0.005), vec2f(mo, 0.005 + mcy)) - 0.006;
  col = mix(col, vec3f(0.28, 0.13, 0.22), max(fillMask(mL, px), fillMask(mR, px)) * 0.7);

  // --- Joues roses ---
  let blL = sdCircle(q - vec2f(-0.26, 0.09), 0.06);
  let blR = sdCircle(q - vec2f(0.26, 0.09), 0.06);
  col = mix(col, u.accent.rgb, fillMask(blL, 0.05) * 0.35 * u.blush);
  col = mix(col, u.accent.rgb, fillMask(blR, 0.05) * 0.35 * u.blush);

  // Petit "Zzz" symbolique quand il dort (points qui montent).
  if (u.sleepy > 0.5) {
    let zc = vec2f(0.34, 0.42);
    let zz = fillMask(sdCircle(q - zc - vec2f(0.03 * sin(t * 2.0), 0.05 * fract(t * 0.5)), 0.012), px);
    col = mix(col, vec3f(0.8, 0.85, 1.0), zz * u.sleepy * 0.6);
  }

  // Vignette.
  col *= mix(0.7, 1.0, smoothstep(1.5, 0.3, length(p)));
  return vec4f(col, 1.0);
}
`;
