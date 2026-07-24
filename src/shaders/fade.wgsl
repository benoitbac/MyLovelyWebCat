// ============================================================================
//  fade.wgsl — Passe de "feedback" : recopie la traînée précédente en
//  l'assombrissant légèrement. C'est ce qui crée la trainée lumineuse
//  (motion trails / persistance) sans stocker d'historique.
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
  params      : vec4f,   // z = trailDecay
  params2     : vec4f,
  ripple      : vec4f,
};

@group(0) @binding(0) var samp : sampler;
@group(0) @binding(1) var prev : texture_2d<f32>;
@group(0) @binding(2) var<uniform> u : U;

struct VO {
  @builtin(position) pos : vec4f,
  @location(0)       uv  : vec2f,
};

// Triangle plein écran (astuce classique : 3 sommets couvrent tout l'écran).
@vertex
fn vs(@builtin(vertex_index) i : u32) -> VO {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var o : VO;
  o.pos = vec4f(p[i], 0.0, 1.0);
  o.uv  = vec2f((p[i].x + 1.0) * 0.5, (1.0 - p[i].y) * 0.5);
  return o;
}

@fragment
fn fs(in : VO) -> @location(0) vec4f {
  return textureSample(prev, samp, in.uv) * u.params.z;   // decay ∈ [0.80,0.97]
}
