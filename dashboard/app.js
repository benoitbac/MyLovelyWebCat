'use strict';

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

const TASK_STATES = [
  { key: 'done', label: 'fait', color: '#4fae7c', opacity: 1 },
  { key: 'doing', label: 'en cours', color: '#e9bb3c', opacity: 1 },
  { key: 'todo', label: 'à faire', color: '#4f90b8', opacity: 0.5 },
  { key: 'blocked', label: 'bloqué', color: '#c4322a', opacity: 0.6 },
];
const stateOf = (key) => TASK_STATES.find((s) => s.key === key) ?? TASK_STATES[2];

const iso = (ms) => {
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// ---------------------------------------------------------------------
// Gantt SVG fait main — pas de librairie de graphes dans ce dépôt.
// ---------------------------------------------------------------------
function renderGantt(roadmap) {
  const rows = [];
  let tMin = Infinity;
  let tMax = -Infinity;

  for (const sprint of roadmap.sprints ?? []) {
    const s0 = Date.parse(sprint.start);
    const s1 = Date.parse(sprint.end);
    if (Number.isNaN(s0) || Number.isNaN(s1)) continue;
    tMin = Math.min(tMin, s0);
    tMax = Math.max(tMax, s1);

    rows.push({ kind: 'sprint', label: `${sprint.id} · ${sprint.title}`, a: s0, b: s1 });

    const tasks = sprint.tasks ?? [];
    const span = Math.max(s1 - s0, 1);
    tasks.forEach((task, i) => {
      const a = task.start ? Date.parse(task.start) : s0 + (span * i) / tasks.length;
      const b = task.end ? Date.parse(task.end) : s0 + (span * (i + 1)) / tasks.length;
      rows.push({ kind: 'task', label: task.title, a, b, status: task.status, id: task.id });
    });
  }

  if (!rows.length) return '<p class="sub">Aucun sprint daté.</p>';

  // Une journée de marge de part et d'autre, sinon les barres touchent le cadre.
  const day = 86400000;
  tMin -= day / 2;
  tMax += day / 2;

  const W = 1040;
  const leftLabel = 300;
  const rightPad = 18;
  const topAxis = 34;
  const rowH = 15;
  const rowGap = 6;
  const innerW = W - leftLabel - rightPad;
  const totalMs = Math.max(tMax - tMin, 1);
  const H = topAxis + rows.length * (rowH + rowGap) + 16;
  const x = (ms) => leftLabel + ((ms - tMin) / totalMs) * innerW;

  let g = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Feuille de route">`;

  // Grille quotidienne + étiquettes de jour.
  const firstTick = Math.ceil(tMin / day) * day;
  for (let t = firstTick; t <= tMax; t += day) {
    const gx = x(t);
    g += `<line x1="${gx}" y1="${topAxis - 8}" x2="${gx}" y2="${H - 6}" stroke="#2a2522" stroke-dasharray="3 4"/>`;
    g += `<text x="${gx + 3}" y="${topAxis - 12}" fill="#625950" style="font-size:9px">${iso(t)}</text>`;
  }

  const now = Date.now();
  if (now >= tMin && now <= tMax) {
    const tx = x(now);
    g += `<line x1="${tx}" y1="${topAxis - 8}" x2="${tx}" y2="${H - 6}" stroke="#e9bb3c" stroke-width="1.5" stroke-dasharray="4 4"/>`;
    g += `<text x="${tx + 4}" y="${topAxis - 22}" fill="#e9bb3c" style="font-size:9px;font-weight:700;letter-spacing:.12em">AUJOURD’HUI</text>`;
  }

  rows.forEach((r, i) => {
    const y = topAxis + i * (rowH + rowGap);
    const x1 = x(r.a);
    // Largeur plancher : un sprint d'une journée doit rester lisible.
    const x2 = Math.max(x(r.b), x1 + 7);

    if (r.kind === 'sprint') {
      g += `<rect x="${leftLabel - 8}" y="${y - 3}" width="${innerW + 26}" height="${rowH + 6}" fill="rgba(233,187,60,0.05)"/>`;
      g += `<text x="8" y="${y + 11}" fill="#ece3d2" style="font-size:10px;font-weight:700">${esc(r.label)}</text>`;
      g += `<rect x="${x1}" y="${y + 5}" width="${x2 - x1}" height="4" rx="2" fill="#3d3631"/>`;
      return;
    }

    const st = stateOf(r.status);
    const label = r.label.length > 44 ? `${r.label.slice(0, 43)}…` : r.label;
    g += `<text x="22" y="${y + 11}" fill="#9c9184" style="font-size:9.5px">${esc(r.id)} ${esc(label)}</text>`;
    g += `<rect x="${x1}" y="${y}" width="${x2 - x1}" height="${rowH}" rx="3" ry="3" fill="${st.color}" fill-opacity="${st.opacity}"><title>${esc(r.label)} — ${st.label} (${iso(r.a)} → ${iso(r.b)})</title></rect>`;
  });

  return `${g}</svg>`;
}

// ---------------------------------------------------------------------
// Burn-up SVG fait main.
// ---------------------------------------------------------------------
function renderBurnup(changelog) {
  const history = changelog.history ?? [];
  if (history.length < 2) return '';
  const goal = changelog.goal ?? Math.max(...history.map((h) => h.done));

  const W = 340;
  const H = 110;
  const pad = { l: 26, r: 12, t: 12, b: 22 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const max = Math.max(goal, ...history.map((h) => h.done)) || 1;
  const px = (i) => pad.l + (i / (history.length - 1)) * iw;
  const py = (v) => pad.t + ih - (v / max) * ih;

  const line = history.map((h, i) => `${px(i)},${py(h.done)}`).join(' ');
  const area = `${pad.l},${py(0)} ${line} ${px(history.length - 1)},${py(0)}`;

  let g = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Burn-up">`;
  g += `<polygon points="${area}" fill="#4fae7c22"/>`;
  g += `<polyline points="${line}" fill="none" stroke="#4fae7c" stroke-width="2"/>`;
  g += `<line x1="${pad.l}" y1="${py(goal)}" x2="${W - pad.r}" y2="${py(goal)}" stroke="#e9bb3c" stroke-dasharray="4 4"/>`;
  g += `<text x="${W - pad.r}" y="${py(goal) - 4}" text-anchor="end" fill="#e9bb3c" style="font-size:9px">objectif ${goal}</text>`;

  history.forEach((h, i) => {
    g += `<circle cx="${px(i)}" cy="${py(h.done)}" r="3" fill="#4fae7c"><title>${esc(h.label)} — ${h.done} tâches</title></circle>`;
    if (i === 0 || i === history.length - 1) {
      g += `<text x="${px(i)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : 'end'}" fill="#625950" style="font-size:9px">${esc(h.label)}</text>`;
    }
  });
  return `${g}</svg>`;
}

// ---------------------------------------------------------------------
// Rendu des sections déclaratives
// ---------------------------------------------------------------------
async function load() {
  const [roadmap, changelog, system] = await Promise.all(
    ['roadmap.json', 'changelog.json', 'system.json'].map((u) =>
      fetch(u, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ),
  );

  if (roadmap) {
    $('epic').textContent = roadmap.epic ?? '';
    $('goal').textContent = roadmap.goal ?? '';
    $('updated').textContent = `mis à jour ${roadmap.updated ?? '—'}`;
    $('gantt').innerHTML = renderGantt(roadmap);
    $('gantt-legend').innerHTML = TASK_STATES.map(
      (s) =>
        `<span class="chip"><span class="swatch" style="background:${s.color};opacity:${s.opacity}"></span>${s.label}</span>`,
    ).join('');

    const all = (roadmap.sprints ?? []).flatMap((s) => s.tasks ?? []);
    const done = all.filter((t) => t.status === 'done').length;
    $('kpis').innerHTML = [
      ['tâches faites', `${done}/${all.length}`],
      ['sprints', String((roadmap.sprints ?? []).length)],
      ['réserve', String((roadmap.backlog ?? []).length)],
      ['mis à jour', roadmap.updated ?? '—'],
    ]
      .map(
        ([l, v]) =>
          `<div class="kpi"><div class="kpi__v">${esc(v)}</div><div class="kpi__l">${esc(l)}</div></div>`,
      )
      .join('');

    $('backlog').innerHTML = (roadmap.backlog ?? [])
      .map(
        (b) =>
          `<li><b style="color:var(--txt)">${esc(b.title)}</b><br><span style="color:var(--txt-faint)">${esc(b.note ?? '')}</span></li>`,
      )
      .join('');
  }

  if (changelog) {
    $('narrative').textContent = changelog.narrative ?? '';
    $('focus').textContent = changelog.focus ?? '';
    $('burnup').innerHTML = renderBurnup(changelog);
    $('journal').innerHTML = (changelog.sessions ?? [])
      .map(
        (s) => `<article class="entry">
          <div class="entry__head">
            <span class="entry__date">${esc(s.date)}</span>
            <span class="entry__title">${esc(s.title)}</span>
          </div>
          ${(s.items ?? [])
            .map(
              (i) =>
                `<div class="item ${esc(i.status)}"><span class="tag">${esc(i.tag ?? '')}</span><span>${esc(i.text)}</span></div>`,
            )
            .join('')}
        </article>`,
      )
      .join('');
    $('next').innerHTML = (changelog.next ?? [])
      .map(
        (n) =>
          `<li>${esc(n.text)}${n.blocked ? `<span class="blocked">⛔ bloqué par : ${esc(n.blocked)}</span>` : ''}</li>`,
      )
      .join('');
  }

  if (system) {
    $('stack').textContent = system.stack ?? '—';
    $('system-summary').textContent = system.summary ?? '';
    $('system').innerHTML = (system.layers ?? [])
      .map(
        (layer) => `<div class="layer">
          <div class="layer__name">${esc(layer.name)} <span>— ${esc(layer.desc ?? '')}</span></div>
          <div class="grid">
            ${(layer.bricks ?? [])
              .map(
                (b) => `<div class="card">
                  <div class="card__title">${esc(b.title ?? b.name)}</div>
                  <div class="card__path">${esc(b.path ?? '')}</div>
                  <div class="card__role">${esc(b.role ?? '')}</div>
                  <div class="card__ports">${(b.ports ?? []).map((p) => `<span class="port">${esc(p)}</span>`).join('')}</div>
                </div>`,
              )
              .join('')}
          </div>
        </div>`,
      )
      .join('');

    $('edges').innerHTML = (system.edges ?? [])
      .map(
        (e) =>
          `<div><b style="color:var(--txt)">${esc(e.from)}</b> <span class="arrow">→</span> <b style="color:var(--txt)">${esc(e.to)}</b> <span style="color:var(--txt-faint)">${esc(e.label ?? '')}</span></div>`,
      )
      .join('');
  }
}

load();
