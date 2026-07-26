'use strict';

const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

const fmtDate = (d) =>
  d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

// ---------------------------------------------------------------- roadmap

function renderHeader(data, sprints) {
  $('#tagline').textContent = data.tagline;

  const totals = sprints.reduce(
    (acc, s) => {
      s.items.forEach((i) => {
        acc.all++;
        if (i.state === 'done') acc.done++;
      });
      return acc;
    },
    { all: 0, done: 0 }
  );

  const current = sprints.find((s) => s.id === data.currentSprint);
  const pct = totals.all ? Math.round((100 * totals.done) / totals.all) : 0;

  const meta = $('#meta');
  meta.innerHTML = '';
  const chips = [
    ['Current', current ? `${current.id} — ${current.name}` : '—'],
    ['Overall', `${totals.done}/${totals.all} tasks (${pct}%)`],
    ['Sprints', String(sprints.length)],
    ['Updated', data.updated],
  ];
  chips.forEach(([k, v]) => {
    const c = el('span', 'chip');
    c.append(document.createTextNode(k + ' '), el('b', null, v));
    meta.append(c);
  });

  $('#overall-fill').style.width = pct + '%';
}

function renderGantt(sprints) {
  const host = $('#gantt');
  host.innerHTML = '';

  const starts = sprints.map((s) => new Date(s.start).getTime());
  const ends = sprints.map((s) => new Date(s.end).getTime());
  const min = Math.min(...starts);
  const max = Math.max(...ends);
  const span = Math.max(1, max - min);
  const now = Date.now();

  const table = el('table');
  const thead = el('thead');
  const hr = el('tr');
  ['Sprint', 'Window', 'Progress', ''].forEach((h) => hr.append(el('th', null, h)));
  thead.append(hr);
  table.append(thead);

  const tbody = el('tbody');
  sprints.forEach((s) => {
    const from = new Date(s.start);
    const to = new Date(s.end);
    const done = s.items.filter((i) => i.state === 'done').length;
    const pct = s.items.length ? Math.round((100 * done) / s.items.length) : 0;

    const tr = el('tr');

    const nameCell = el('td', 'sname');
    nameCell.append(el('span', 'sid', s.id), document.createTextNode(s.name));
    tr.append(nameCell);

    tr.append(el('td', null, `${fmtDate(from)} → ${fmtDate(to)}`));
    tr.append(el('td', null, `${done}/${s.items.length}`));

    const trackCell = el('td');
    const track = el('div', 'track');
    const widthPct = Math.max(3, (100 * (to.getTime() - from.getTime())) / span);

    const bar = el('div', 'bar ' + s.status);
    bar.style.left = (100 * (from.getTime() - min)) / span + '%';
    bar.style.width = widthPct + '%';
    bar.title = `${s.id} — ${s.goal}`;
    track.append(bar);

    // A short sprint in a long timeline gets a bar too narrow to hold its own label.
    // Below that width the percentage sits just outside the bar instead of spilling over it.
    if (pct > 0) {
      const roomy = widthPct > 12;
      const label = el('span', 'bar-pct' + (roomy ? ' inside' : ' outside'), pct + '%');
      if (roomy) {
        bar.append(label);
      } else {
        label.style.left = `calc(${(100 * (from.getTime() - min)) / span + widthPct}% + 6px)`;
        track.append(label);
      }
    }

    // "Today" marker, only when the window actually contains today.
    if (now >= min && now <= max) {
      const marker = el('div', 'today');
      marker.style.left = (100 * (now - min)) / span + '%';
      marker.title = 'Today';
      track.append(marker);
    }

    trackCell.append(track);
    tr.append(trackCell);
    tbody.append(tr);
  });

  table.append(tbody);
  host.append(table);
}

function renderCards(sprints, currentId) {
  const host = $('#cards');
  host.innerHTML = '';

  sprints.forEach((s) => {
    const done = s.items.filter((i) => i.state === 'done').length;
    const pct = s.items.length ? (100 * done) / s.items.length : 0;

    const card = el('div', 'card' + (s.id === currentId ? ' is-active' : ''));

    const h3 = el('h3');
    h3.append(el('em', null, s.id), document.createTextNode(s.name));
    card.append(h3);
    card.append(el('div', 'goal', s.goal));

    const prog = el('div', 'prog');
    const fill = el('i');
    fill.style.width = pct + '%';
    prog.append(fill);
    card.append(prog);

    const ul = el('ul', 'items');
    s.items.forEach((item) => {
      const li = el('li');
      li.append(el('span', 'dot ' + item.state));
      const body = el('div');
      body.append(el('div', item.state === 'done' ? 'strike' : null, item.title));
      if (item.note) body.append(el('div', 'it-note', item.note));
      li.append(body);
      ul.append(li);
    });
    card.append(ul);
    host.append(card);
  });
}

// ---------------------------------------------------------------- bootstrap

async function fetchJson(path) {
  try {
    const res = await fetch(path, { cache: 'no-store' });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

(async function init() {
  const roadmap = await fetchJson('roadmap.json');
  if (!roadmap) {
    $('#tagline').textContent = 'Could not load roadmap.json';
    return;
  }

  renderHeader(roadmap, roadmap.sprints);
  renderGantt(roadmap.sprints);
  renderCards(roadmap.sprints, roadmap.currentSprint);
})();
