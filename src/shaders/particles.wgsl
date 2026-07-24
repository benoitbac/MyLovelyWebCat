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

  if (p.kind > 1.5) {
    // Accessoire (chapeau cyberpunk) → couleur néon.
    col  = u.neon.rgb;
    size = size * 0.9;
    glow = glow * 1.15;
  } else if (p.kind > 0.5) {
    // Yeux → couleur d'accent, plus gros, avec clignement périodique.
    col  = u.accent.rgb;
    size = size * 2.4;
    let ph    = fract(u.time * 0.2 + 0.35);
    let blink = select(1.0, 0.12, ph > 0.955);   // ferme les yeux ~5% du temps
    size = size * blink;
    glow = glow * 1.7;
  } else {
    // Corps → dégradé principal → néon selon la vitesse (les zones qui
    // bougent s'illuminent) et un peu de variété via la graine.
    let speed = clamp(length(p.vel) * 0.16, 0.0, 1.0);
    col = mix(u.primary.rgb, u.neon.rgb, 0.30 + speed * 0.5 + 0.15 * sin(p.seed * 9.0));
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
