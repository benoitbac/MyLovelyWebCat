// ============================================================================
//  particles.wgsl — Rendu des particules en sprites lumineux (billboards).
//  Aucun vertex buffer : chaque particule = 2 triangles générés à la volée,
//  lus directement depuis le Storage Buffer. Blending additif = bloom néon.
// ============================================================================

struct U {
  resolution  : vec2f,
  mouse       : vec2f,
  time        : f32,
  dt          : f32,
  mouseActive : f32,
  behavior    : f32,
  primary     : vec4f,
  neon        : vec4f,
  accent      : vec4f,
  params      : vec4f,
  params2     : vec4f,
  ripple      : vec4f,
};

struct Particle {
  pos  : vec2f,
  vel  : vec2f,
  home : vec2f,
  seed : f32,
  kind : f32,
};

@group(0) @binding(0) var<uniform> u : U;
@group(0) @binding(1) var<storage, read> ps : array<Particle>;

struct VSOut {
  @builtin(position) pos   : vec4f,
  @location(0)       uv    : vec2f,   // [-1,1] dans le sprite
  @location(1)       color : vec3f,
  @location(2)       glow  : f32,
};

// Monde → clip, avec correction d'aspect (le chat garde ses proportions).
fn worldToClip(p : vec2f) -> vec2f {
  let a = u.resolution.x / u.resolution.y;
  var c = p;
  if (a >= 1.0) { c.x = p.x / a; } else { c.y = p.y * a; }
  return c;
}

@vertex
fn vs(@builtin(vertex_index) vi : u32,
      @builtin(instance_index) ii : u32) -> VSOut {
  // Les 6 sommets du quad (2 triangles).
  var corners = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0,  1.0), vec2f(1.0, -1.0), vec2f( 1.0, 1.0)
  );
  let corner = corners[vi];
  let p = ps[ii];

  var size = u.params2.z;              // rayon du sprite EN PIXELS
  var glow = u.params.w;
  var col  = u.primary.rgb;
  let k = p.kind;

  if (k > 4.5) {
    // 5 = remplissage interne : doux et discret, ne "crame" pas la silhouette.
    col  = u.primary.rgb * 0.9;
    glow = glow * 0.42;
    size = size * 1.15;
  } else if (k > 3.5) {
    // 4 = moustaches / bouche : traits fins et clairs.
    col  = vec3f(1.0, 0.96, 0.98);
    glow = glow * 0.5;
    size = size * 0.68;
  } else if (k > 2.5) {
    // 3 = rose : oreilles internes, museau, joues.
    col  = vec3f(1.0, 0.52, 0.72);
    glow = glow * 0.85;
  } else if (k > 1.5) {
    // 2 = chapeau cyberpunk → néon.
    col  = u.neon.rgb;
  } else if (k > 0.5) {
    // 1 = yeux → accent brillant, avec clignement périodique.
    col  = u.accent.rgb;
    glow = glow * 1.6;
    size = size * 1.1;
    let ph = fract(u.time * 0.18 + 0.4);
    size = size * select(1.0, 0.12, ph > 0.955);
  } else {
    // 0 = contour (pelage), net : c'est lui qui dessine le chat.
    col = u.primary.rgb;
  }

  // Centre projeté en clip, puis décalage du coin exprimé en pixels
  // (→ sprites parfaitement ronds quel que soit le ratio du canvas).
  let center = worldToClip(p.pos);
  let off = corner * size * vec2f(2.0 / u.resolution.x, 2.0 / u.resolution.y);

  var out : VSOut;
  out.pos   = vec4f(center + off, 0.0, 1.0);
  out.uv    = corner;
  out.color = col;
  out.glow  = glow;
  return out;
}

@fragment
fn fs(in : VSOut) -> @location(0) vec4f {
  let r    = length(in.uv);
  let core = smoothstep(1.0, 0.0, r);   // disque doux
  let halo = pow(core, 2.6);            // concentre l'énergie au centre
  let intensity = halo * in.glow;
  // Prémultiplié : parfait pour un blending additif (one, one).
  return vec4f(in.color * intensity, intensity);
}
