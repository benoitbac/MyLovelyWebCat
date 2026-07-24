// ============================================================================
//  simulate.wgsl — Coeur du moteur : simulation massivement parallèle.
//  Chaque particule est un ressort attiré vers sa position "maison" (home)
//  qui, toutes ensemble, dessinent la silhouette du chat. Souris + clics +
//  respiration viennent perturber ce champ de forces.
// ============================================================================

// Bloc uniforme partagé par TOUS les shaders — l'ordre/alignement doit
// correspondre exactement au Float32Array côté JS (voir engine.js).
struct U {
  resolution  : vec2f,   // taille du canvas en pixels device
  mouse       : vec2f,   // position souris en coord. "monde"
  time        : f32,
  dt          : f32,
  mouseActive : f32,     // 1 si la souris survole le canvas
  behavior    : f32,     // 0 = aimant (attire), 1 = timide (fuit)
  primary     : vec4f,   // couleur principale du pelage
  neon        : vec4f,   // couleur néon / glow
  accent      : vec4f,   // couleur des yeux / accessoires
  params      : vec4f,   // x=breatheAmp y=breatheSpeed z=trailDecay w=glow
  params2     : vec4f,   // x=mouseRadius y=mouseStrength z=sizePx w=idle
  ripple      : vec4f,   // x,y=centre  z=âge(s, <0 = inactif)  w=force
};

struct Particle {
  pos  : vec2f,
  vel  : vec2f,
  home : vec2f,
  seed : f32,
  kind : f32,   // 0 = corps, 1 = oeil, 2 = accessoire (chapeau)
};

@group(0) @binding(0) var<uniform> u : U;
@group(0) @binding(1) var<storage, read_write> ps : array<Particle>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid : vec3u) {
  let i = gid.x;
  if (i >= arrayLength(&ps)) { return; }

  var p = ps[i];
  let t  = u.time;
  let dt = clamp(u.dt, 0.0, 0.033);   // borne le pas pour rester stable

  // --- Respiration : on dilate/contracte la silhouette autour du centre.
  let centroid = vec2f(0.0, -0.05);
  let breathe  = 1.0 + u.params.x * sin(t * u.params.y + p.seed * 0.4);
  var home = centroid + (p.home - centroid) * breathe;

  // Léger balancement quand le chat est au repos (idle).
  home.y += u.params2.w * 0.03 * sin(t * 0.8 + p.seed);

  // --- Force de rappel élastique vers la position cible (ce qui "tient" le chat).
  var accel = (home - p.pos) * 55.0;

  // --- Scintillement organique (plus fort au repos) pour éviter l'effet figé.
  accel += vec2f(sin(t * 1.3 + p.seed * 7.0),
                 cos(t * 1.1 + p.seed * 5.0)) * (0.4 + u.params2.w * 0.8);

  // --- Interaction souris : aimant (attire) ou timide (repousse).
  if (u.mouseActive > 0.5) {
    let d    = p.pos - u.mouse;
    let dist = max(length(d), 1e-4);
    let radius = u.params2.x;
    if (dist < radius) {
      let dir = d / dist;
      let f   = (1.0 - dist / radius);       // 1 au centre → 0 au bord
      let s   = u.params2.y * f * f;
      if (u.behavior < 0.5) {
        accel -= dir * s;   // aimant : on va vers la souris
      } else {
        accel += dir * s;   // timide : on fuit
      }
    }
  }

  // --- Onde de choc au clic : anneau qui se propage (caresse / pet).
  let rAge = u.ripple.z;
  if (rAge >= 0.0 && rAge < 1.2) {
    let rd    = p.pos - u.ripple.xy;
    let rdist = length(rd);
    let ringR = rAge * 1.9;                 // rayon de l'anneau qui grandit
    let band  = 0.20;
    let infl  = exp(-pow((rdist - ringR) / band, 2.0)) * (1.0 - rAge / 1.2);
    if (rdist > 1e-4) {
      accel += (rd / rdist) * infl * u.ripple.w;
    }
  }

  // --- Intégration semi-implicite + amortissement indépendant du framerate.
  var vel = p.vel + accel * dt;
  vel = vel * exp(-dt * 5.5);

  let sp = length(vel);
  if (sp > 7.0) { vel = vel / sp * 7.0; }   // clamp anti-explosion

  p.vel = vel;
  p.pos = p.pos + vel * dt;
  ps[i] = p;
}
