// Shaders WGSL du bootstrap (Sprint 0).
// L'aurore anime le fond et prouve que le pipeline WebGPU tourne ;
// le rendu du chat la remplacera au Sprint 1.

export const AURORA_WGSL = /* wgsl */ `
struct U {
  res  : vec2f,
  time : f32,
  _pad : f32,
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

@fragment
fn fs(in : VO) -> @location(0) vec4f {
  let uv = in.uv;
  let t  = u.time;

  var c = vec3f(0.043, 0.039, 0.078);
  c += 0.22 * vec3f(0.60, 0.48, 1.0) * (0.5 + 0.5 * sin(t * 0.5 + uv.x * 3.0 + uv.y * 2.0));
  c += 0.14 * vec3f(0.40, 0.85, 1.0) * (0.5 + 0.5 * sin(t * 0.3 + uv.y * 4.0 - uv.x));
  c += 0.10 * vec3f(1.0, 0.62, 0.81) * (0.5 + 0.5 * sin(t * 0.23 + uv.x * 5.0));

  let v = smoothstep(1.15, 0.25, length(uv - 0.5));
  return vec4f(c * v, 1.0);
}
`;
