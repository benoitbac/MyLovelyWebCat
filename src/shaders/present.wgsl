// ============================================================================
//  present.wgsl — Composition finale vers l'écran : fond cyber + traînée HDR,
//  tone mapping ACES et vignette. C'est la passe qui "vend" le rendu.
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

@group(0) @binding(0) var samp : sampler;
@group(0) @binding(1) var tex  : texture_2d<f32>;
@group(0) @binding(2) var<uniform> u : U;

struct VO {
  @builtin(position) pos : vec4f,
  @location(0)       uv  : vec2f,
};

@vertex
fn vs(@builtin(vertex_index) i : u32) -> VO {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var o : VO;
  o.pos = vec4f(p[i], 0.0, 1.0);
  o.uv  = vec2f((p[i].x + 1.0) * 0.5, (1.0 - p[i].y) * 0.5);
  return o;
}

// Tone mapping ACES filmic (approximation de Narkowicz).
fn aces(x : vec3f) -> vec3f {
  let a = 2.51; let b = 0.03; let c = 2.43; let d = 0.59; let e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), vec3f(0.0), vec3f(1.0));
}

@fragment
fn fs(in : VO) -> @location(0) vec4f {
  let uv   = in.uv;
  let glow = textureSample(tex, samp, uv).rgb;

  // Fond : dégradé profond + grille néon très discrète.
  var bg = mix(vec3f(0.035, 0.028, 0.075), vec3f(0.006, 0.008, 0.022), uv.y);
  let cell = abs(fract(uv * u.resolution / 46.0) - 0.5);
  let grid = smoothstep(0.47, 0.5, max(cell.x, cell.y)) * 0.010;
  bg += vec3f(grid) * vec3f(0.35, 0.55, 0.95);

  var col = bg + glow;
  col = aces(col * 1.05);

  // Vignette douce pour concentrer le regard sur le chat.
  let v = smoothstep(1.15, 0.30, length(uv - 0.5));
  col *= mix(0.55, 1.0, v);

  return vec4f(col, 1.0);
}
