/* UK Ultimate Tracker — static site. Data comes from data/*.json, built by pipeline/export_site.py.
   Each view loads only the files it needs; everything already loaded is cached for the session. */
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const VIEW = $('#view');
const CACHE = new Map();
const VER = ((document.currentScript && document.currentScript.src.match(/[?&]v=(\w+)/)) || [])[1] || '';
const getJSON = (p) => { if (!CACHE.has(p)) CACHE.set(p, fetch('data/' + p + (VER ? '?v=' + VER : '')).then((r) => { if (!r.ok) throw new Error(p + ' ' + r.status); return r.json(); })); return CACHE.get(p); };
let IDX = null;
const index = () => IDX || (IDX = getJSON('index.json'));
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const COL = () => ['--c0', '--c1', '--c2', '--c3', '--c4', '--c5', '--c6', '--c7'].map(css);
const MEDAL = (p) => p === 1 ? css('--gold') : p === 2 ? css('--silver') : p === 3 ? css('--bronze') : null;
const f0 = (v) => v == null ? '—' : d3.format('.0f')(v);
const f1 = (v) => v == null ? '—' : d3.format('.1f')(v);
const trj = (t, a, b) => t == null ? '—' : h('span', { 'data-tip': JSON.stringify(['Trajectory: ' + (t > 0 ? '+' : '') + d3.format('.1f')(t) + ' Quality points per season', `Team part ${a > 0 ? '+' : ''}${a ?? '—'} · individual part ${b > 0 ? '+' : ''}${b ?? '—'}`]), class: 'hasinfo' }, (t > 0 ? '+' : '') + d3.format('.1f')(t));
const pct = (v) => v == null ? '—' : d3.format('.0%')(v);
const sgn = (v) => v == null ? '—' : d3.format('+.0f')(v);
const sgn1 = (v) => v == null ? '—' : d3.format('+.1f')(v);
const nth = (n) => (n % 100 >= 11 && n % 100 <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
const ord = (n) => n == null ? '—' : n + nth(n);
const enc = encodeURIComponent;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (k === 'html') e.innerHTML = v; else e.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return e;
}
const card = (title, note, ...kids) => h('section', { class: 'card' }, title ? (() => { const it = typeof title === 'string' ? infoTip(title) : {}; return h('h2', it.class ? { 'data-tip': it['data-tip'], class: 'hasinfo' } : null, title, it.class ? h('span', { class: 'ii' }, ' ⓘ') : null); })() : null, note ? h('p', { class: 'note' }, note) : null, ...kids);
const tiles = (items) => h('div', { class: 'tiles' }, items.map(([k, v, s, extra]) => { const it = typeof k === 'string' ? infoTip(k, extra) : {}; return h('div', { class: 'tile' + (it.class ? ' hasinfo' : ''), 'data-tip': it['data-tip'] || null }, h('div', { class: 'k' }, k, it.class ? h('span', { class: 'ii' }, ' ⓘ') : null), h('div', { class: 'v' }, v ?? '—'), s ? h('div', { class: 's' }, s) : null); }));
const legend = (items) => h('div', { class: 'legend' }, items.map(([t, c, kind]) => h('span', null, h('i', { style: `background:${c};${kind === 'line' ? 'height:2px;vertical-align:3px;width:14px' : ''}${kind === 'dot' ? ';border-radius:50%' : ''}` }), t)));
const playerLink = (k, n) => h('a', { href: '#/p/' + enc(k) }, n);
const teamLink = (id, n) => id ? h('a', { href: '#/t/' + enc(id) }, n) : n;
// team badge: the club's own logo when one has been added to site/logos, otherwise a monogram
const initials = (n) => String(n).replace(/\(.*?\)/g, '').replace(/\b(ultimate|open|women|mixed|club|ufc|the|of|masters)\b/gi, '').split(/[\s-]+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 3).toUpperCase() || String(n)[0];
function badge(t, size = 28) {
  if (t && t.lg) return h('img', { class: 'badge', src: t.lg, alt: '', width: size, height: size, loading: 'lazy', style: `width:${size}px;height:${size}px` });
  return h('span', { class: 'badge mono', 'aria-hidden': 'true', style: `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.38)}px` }, initials(t ? t.n || t.team : '?'));
}

function table(head, rows, opts = {}) {
  const num = new Set(opts.num || []);
  return h('div', { class: 'tbox', style: opts.max ? `max-height:${opts.max}` : '' }, h('table', { class: 't' },
    h('thead', null, h('tr', null, head.map((c, i) => { const it = infoTip(c instanceof Node ? c.textContent : c); return h('th', { class: [num.has(i) ? 'n' : '', it.class || ''].join(' ').trim() || null, 'data-tip': it['data-tip'] || null }, c, it.class ? h('span', { class: 'ii' }, ' ⓘ') : null); }))),
    h('tbody', null, rows.map((r) => h('tr', { class: r.go || r.onclick ? 'click' : null, onclick: r.onclick || (r.go ? () => { location.hash = r.go; } : null) },
      r.cells.map((c, i) => h('td', { class: num.has(i) ? 'n' : null }, c == null ? '—' : c)))))));
}

// tooltip
const CLICK = 'Click to see the players';
const TIP = $('#tip');
function tip(ev, lines) { TIP.replaceChildren(...lines.map((l, i) => i === 0 ? h('b', null, l) : h('div', null, l))); TIP.hidden = false; const w = TIP.offsetWidth, x = Math.min(ev.clientX + 12, innerWidth - w - 8); TIP.style.left = x + 'px'; TIP.style.top = (ev.clientY + 14) + 'px'; }
const untip = () => { TIP.hidden = true; };
// ---------- what each score means (hover any heading, tile label or ⓘ) ----------
const EXPLAIN = {
  'quality': ['Quality (finish-based)', 'A player-season score from 0 to 100, from four parts:', '• Team (50%): how strong their main team was that season (best finish at Nationals, EUCF, Elite Invite or WUCC, scaled so the top UK team = 100), scaled by how much of the team’s big-event season they played.', '• GB selection (20%): GB squads, worth less each season after the squad.', '• Production (20%): share of the team’s goals and assists, as a percentile, where stat sheets exist.', '• Role (10%): how much of the team’s season they played.', 'Missing parts are left out and the rest re-weighted.'],
  'results quality': ['Results quality (game-rated)', 'The same recipe as Quality, but the team part comes from the results-based team rating: game scores (EUCS 2024+, WUCC) and finishing orders (UKU Nationals, Tours, Regionals, EUCF), on a 0–100 scale where the UK average is 50.', 'Teams without a rating that season fall back to the finish-based team level.', 'Compare the two: a big gap means the team’s best finish and its game record tell different stories.'],
  'level': ['Level (team side)', 'Where the player is trusted to play: 80% team credit (team strength × share of the season played) + 20% role.'],
  'impact': ['Impact (individual)', 'What the player adds, against teammates: 60% production (goals + assists share percentile) + 40% team impact (how the team’s results change with them in or out, where there is enough data).'],
  'team level': ['Team level', 'Strength of the team that season from its best finish (Nationals, EUCF, Elite Invite, WUCC; Div 2 below Div 1), scaled so the top UK team in the division = 100.'],
  'team credit': ['Team credit', 'Team level × how much of the team’s big-event season the player played (40% just for being on the team, up to 100% for playing all of it).'],
  'gb selection': ['GB selection', 'Points for GB squads: senior and World Games highest, then U24, U20, U17, beach and masters. Worth less each season after the squad.'],
  'production': ['Production', 'Share of the team’s goals and assists at events with stat sheets (EUCF, WUCC, UKU Nationals 2026 and others), shrunk towards average for small samples, as a percentile within the division.'],
  'role': ['Role', 'How much of the team’s season they played: share of the team’s big events they were at, and share of games where known.'],
  'change 25→26': ['Change 25→26', 'Quality in 2026 minus quality in 2025. Hover the profile tile for what drove it.'],
  'standing': ['Standing (career)', 'How established a player is, from every season we have: a weighted average of their season Quality, newest season counting most (1, 0.8, 0.6, 0.45, 0.35…), pulled towards 45 until there is enough evidence.', 'One great season at 86 gives about 61; five seasons at 86 give about 76. Years missing from the data are skipped, not counted against the player. Sits next to Quality: Quality = how good this season, Standing = how proven.'],
  'trajectory': ['Trajectory (2022–26)', 'Points of Quality gained or lost per season: the slope of a straight line through every season we have. Needs 3+ seasons.', 'Split into two parts that add up to it: Team part = the team they play for got stronger or weaker (often a club move); Individual part = their own GB selection, production and role.'],
  'trajectory (team part)': ['Trajectory: team part', 'The part of the trajectory that comes from the team: the strength of the team they play for and how much of its season they play. A move to a stronger club shows up here.'],
  'trajectory (individual part)': ['Trajectory: individual part', 'The part that comes from the player themselves: GB selection, production (goals + assists share) and role.'],
  'squad standing': ['Squad standing', 'Average Standing (career score) of the players on that roster at the time.'],
  'roster quality': ['Roster quality', 'Average player Quality of the players at that event (2022+ scores).'],
  'top-15 individual quality': ['Top-15 quality', 'Average Quality of the team’s 15 best players that season.'],
  'confidence': ['Confidence', 'How much data sits behind the score: High = 15+ stat games and all four parts; Medium = some stats or three parts; Low = little data.'],
  'team strength from results': ['Team strength from results', 'UK-only team rating from game scores and finishing orders. 1000 = UK average for that division and season; ±150 is a typical spread. Dashed lines/ranges = uncertainty.'],
  'rating': ['Team rating', 'Results-based team rating: 1000 = UK average that season, ±150 a typical spread.'],
  'gb players': ['GB players', 'Players on the roster who were in a GB squad in recent seasons.'],
  'average retention': ['Average retention', 'Share of the previous season’s squad who came back, averaged over seasons.'],
  'players used': ['Players used', 'Everyone who played for the team at least once in the data.'],
  'experience': ['Experience', 'Average number of earlier seasons each player had on this squad.'],
  'carried over': ['Carried over', 'Share of a GB squad who were in the previous edition.'],
};
const explainFor = (label) => { const t = String(label || '').toLowerCase().replace(/\s*\(.*\)$/, '').replace(/[▲▼ⓘ]/g, '').trim(); return EXPLAIN[t] || EXPLAIN[String(label || '').toLowerCase().trim()] || null; };
document.addEventListener('mousemove', (ev) => { const el = ev.target.closest && ev.target.closest('[data-tip]'); if (!el) { if (TIP.dataset.from === 'html') { untip(); TIP.dataset.from = ''; } return; } TIP.dataset.from = 'html'; tip(ev, JSON.parse(el.dataset.tip)); });
const infoTip = (label, extra) => { const e = explainFor(label); return e ? { 'data-tip': JSON.stringify(extra ? [...e, ...extra] : e), class: 'hasinfo' } : {}; };
const onTip = (sel, fn) => sel.on('mousemove', (ev, d) => tip(ev, fn(d))).on('mouseleave', untip);

// ---------- chart helpers ----------
function svgBox(W, H) { const box = h('div', { class: 'chart' }); const svg = d3.select(box).append('svg').attr('viewBox', `0 0 ${W} ${H}`); return { box, svg }; }
function axes(svg, x, y, W, H, m, o = {}) {
  svg.append('g').attr('transform', `translate(0,${H - m.b})`).call((o.xAxis || d3.axisBottom(x)).tickSize(0).tickPadding(8)).call((g) => { g.select('.domain').attr('stroke', css('--axis')); });
  svg.append('g').attr('transform', `translate(${m.l},0)`).call((o.yAxis || d3.axisLeft(y).ticks(o.yTicks || 5)).tickSize(-(W - m.l - m.r)).tickPadding(6))
    .call((g) => { g.select('.domain').remove(); g.selectAll('line').attr('stroke', css('--grid')); });
}
/** series: [{name, color, pts:[{x,y,tip}] }]; x categorical (years) */
function lineChart(series, o = {}) {
  const W = o.W || 560, H = o.H || 260, m = Object.assign({ l: 40, r: o.labels ? 130 : 14, t: 12, b: 26 }, o.m || {});
  const { box, svg } = svgBox(W, H);
  const xs = o.xs || [...new Set(series.flatMap((s) => s.pts.map((p) => p.x)))].sort((a, b) => a - b);
  const x = d3.scalePoint(xs, [m.l, W - m.r]).padding(0.3);
  const ys = series.flatMap((s) => s.pts.map((p) => p.y)).filter((v) => v != null);
  const y = (o.yScale || d3.scaleLinear)(o.yDomain || [Math.min(0, d3.min(ys) ?? 0), (d3.max(ys) ?? 1) * 1.08], [H - m.b, m.t]);
  if (!o.yScale && !o.yDomain) y.nice(); else y.clamp(true);
  axes(svg, x, y, W, H, m, { yAxis: o.yFmt ? d3.axisLeft(y).ticks(5).tickFormat(o.yFmt) : o.yAxis, xAxis: d3.axisBottom(x).tickValues(xs.length > 12 ? xs.filter((v, i) => i % 2 === 0) : xs).tickFormat(o.xFmt || ((v) => v)) });
  const ends = [];
  series.forEach((s) => {
    const pts = s.pts.filter((p) => p.y != null && xs.includes(p.x));
    const linePts = s.bridge ? s.pts.slice().sort((a, b) => a.x - b.x) : xs.map((v) => s.pts.find((p) => p.x === v) || { x: v, y: null });   // a missing season breaks the line instead of bridging it
    if (s.line !== false) svg.append('path').datum(linePts).attr('fill', 'none').attr('stroke', s.color).attr('stroke-width', s.w || 2).attr('stroke-dasharray', s.dash || null).attr('d', d3.line((p) => x(p.x), (p) => y(p.y)).defined((p) => p.y != null));
    onTip(svg.append('g').selectAll('circle').data(pts).join('circle').attr('cx', (p) => x(p.x)).attr('cy', (p) => y(p.y)).attr('r', (p) => p.r || (s.dots === false ? 0 : 3.5)).attr('fill', (p) => p.fill || s.color).attr('stroke', s.color).attr('stroke-width', (p) => p.fill ? 1.5 : 0)
      .style('cursor', (p) => p.go || p.onclick ? 'pointer' : null).on('click', (ev, p) => { if (p.onclick) p.onclick(ev); else if (p.go) location.hash = p.go; }), (p) => [...(p.tip || [s.name, `${p.x}: ${o.yFmt ? o.yFmt(p.y) : f1(p.y)}`]), ...(p.onclick ? [CLICK] : [])]);
    if (o.labels && pts.length) ends.push({ y: y(pts[pts.length - 1].y), t: s.name, c: s.color });
  });
  ends.sort((a, b) => a.y - b.y); for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13;
  ends.forEach((e) => svg.append('text').attr('x', W - m.r + 8).attr('y', e.y + 4).style('fill', e.c).text(e.t.length > 20 ? e.t.slice(0, 19) + '…' : e.t));
  if (o.legend !== false && !o.labels && series.length > 1) box.append(legend(series.map((s) => [s.name, s.color, 'line'])));
  return box;
}
/** stacked or grouped bars. cats: x values; keys: [{key,name,color}]; data: [{x, [key]: value}] */
function barChart(data, keys, o = {}) {
  const W = o.W || 560, H = o.H || 240, m = Object.assign({ l: 40, r: 10, t: 12, b: 26 }, o.m || {});
  const { box, svg } = svgBox(W, H);
  const x = d3.scaleBand(data.map((d) => d.x), [m.l, W - m.r]).padding(0.3);
  const lo = o.diverge ? d3.max(data, (d) => d3.sum(keys.filter((k) => k.neg), (k) => d[k.key] || 0)) : 0;
  const hi = d3.max(data, (d) => d3.sum(keys.filter((k) => !k.neg), (k) => d[k.key] || 0)) || 1;
  const y = d3.scaleLinear([-(lo || 0), hi], [H - m.b, m.t]).nice();
  axes(svg, x, y, W, H, m, { yAxis: o.yFmt ? d3.axisLeft(y).ticks(5).tickFormat(o.yFmt) : null });
  data.forEach((d) => {
    let up = 0, dn = 0;
    keys.forEach((k) => { const v = d[k.key] || 0; if (!v) return;
      const y0 = k.neg ? -dn : up, y1 = k.neg ? -(dn += v) : (up += v);
      onTip(svg.append('rect').datum(d).attr('x', x(d.x)).attr('width', x.bandwidth()).attr('y', y(Math.max(y0, y1))).attr('height', Math.abs(y(y0) - y(y1))).attr('fill', k.color).attr('rx', 2).style('cursor', o.onClick ? 'pointer' : null).on('click', (ev) => { if (o.onClick) o.onClick(d, k, ev); }), () => [String(d.x), `${k.name}: ${o.vFmt ? o.vFmt(v) : v}`, ...(d.tip ? [d.tip] : []), ...(o.onClick ? [CLICK] : [])]); });
  });
  if (keys.length > 1) box.append(legend(keys.map((k) => [k.name, k.color])));
  return box;
}
/** horizontal bars: rows [{label, v, color, tip, go}] */
function hbars(rows, o = {}) {
  const W = o.W || 560, rh = 22, labW = o.labW || 170, H = rows.length * rh + 10, mx = d3.max(rows, (r) => Math.abs(r.v)) || 1, mn = d3.min(rows, (r) => r.v) || 0;
  const { box, svg } = svgBox(W, H);
  const x = d3.scaleLinear([Math.min(0, mn), mx], [labW + 6, W - 40]);
  rows.forEach((r, i) => { const g = svg.append('g').attr('transform', `translate(0,${i * rh + 4})`).style('cursor', r.go || r.onclick ? 'pointer' : null).on('click', (ev) => { if (r.onclick) r.onclick(ev); else if (r.go) location.hash = r.go; });
    g.append('text').attr('x', labW).attr('y', 13).attr('text-anchor', 'end').style('fill', css('--fg')).text(r.label.length > (o.maxLab || 28) ? r.label.slice(0, (o.maxLab || 28) - 1) + '…' : r.label);
    onTip(g.append('rect').attr('x', Math.min(x(0), x(r.v))).attr('y', 3).attr('width', Math.max(2, Math.abs(x(r.v) - x(0)))).attr('height', 13).attr('rx', 3).attr('fill', r.color || COL()[0]), () => [...(r.tip || [r.label, String(r.v)]), ...(r.onclick ? [CLICK] : [])]);
    g.append('text').attr('x', r.v >= 0 ? x(r.v) + 4 : x(0) + 4).attr('y', 13).attr('text-anchor', 'start').text(o.fmt ? o.fmt(r.v) : r.v); });
  return box;
}
/** donut: items [{label, v, color?, tip?, onclick?}] with a clickable legend; small slices fold into "Other" */
function hbarsStack(rows, o = {}) {
  const W = o.W || 1000, labW = o.labW || 300, rh = 26, H = rows.length * rh + 6;
  const { box, svg } = svgBox(W, H); const x = d3.scaleLinear([0, 1], [labW, W - 10]);
  rows.forEach((r, i) => { const y = i * rh + 3; let acc = 0;
    svg.append('text').attr('x', labW - 8).attr('y', y + rh / 2 + 2).attr('text-anchor', 'end').style('fill', css('--fg')).style('font-size', '12px').text(r.label);
    r.parts.forEach((p) => { if (!p.v) return; const x0 = x(acc), x1 = x(acc + p.v); acc += p.v;
      const rect = svg.append('rect').attr('x', x0).attr('y', y).attr('width', Math.max(0, x1 - x0 - 1)).attr('height', rh - 6).attr('fill', p.color).style('cursor', p.onclick ? 'pointer' : null).on('click', (ev) => p.onclick && p.onclick(ev));
      if (x1 - x0 > 30) svg.append('text').attr('x', (x0 + x1) / 2).attr('y', y + rh / 2 + 1).attr('text-anchor', 'middle').style('font-size', '10.5px').style('fill', '#fff').style('pointer-events', 'none').text(d3.format('.0%')(p.v));
      onTip(rect, () => [r.label, `${p.lab}: ${p.n} (${d3.format('.0%')(p.v)})`, ...(p.onclick ? [CLICK] : [])]); }); });
  return box;
}
function donut(items, o = {}) {
  const C = COL(), max = o.max || 8, W = o.W || 520, R = o.R || 92, H = Math.max(2 * R + 20, 0);
  let L = items.slice().sort((a, b) => b.v - a.v);
  if (L.length > max) { const rest = L.slice(max - 1); L = L.slice(0, max - 1).concat([{ label: `Other (${rest.length})`, v: d3.sum(rest, (d) => d.v), color: css('--axis'), tip: ['Other', rest.map((d) => d.label + ' ' + d.v).join(', ')], onclick: o.otherClick ? (ev) => o.otherClick(ev, rest) : null }]); }
  L.forEach((d, i) => { d.color = d.color || C[i % 8]; });
  const tot = d3.sum(L, (d) => d.v) || 1, rowH = 20, legH = L.length * rowH;
  const { box, svg } = svgBox(W, Math.max(H, legH + 10));
  const g = svg.append('g').attr('transform', `translate(${R + 10},${Math.max(H, legH + 10) / 2})`);
  const arcs = d3.pie().sort(null).value((d) => d.v)(L), arc = d3.arc().innerRadius(R * 0.58).outerRadius(R).padAngle(0.012).cornerRadius(2);
  arcs.forEach((a) => { const d = a.data; const el = g.append('path').attr('d', arc(a)).attr('fill', d.color).style('cursor', d.onclick ? 'pointer' : null).on('click', (ev) => d.onclick && d.onclick(ev));
    onTip(el, () => [...(d.tip || [d.label]), `${d.v} · ${Math.round(100 * d.v / tot)}%`, ...(d.onclick ? [CLICK] : [])]); });
  g.append('text').attr('text-anchor', 'middle').attr('y', 6).style('font-size', '20px').style('font-weight', 600).style('fill', css('--fg')).text(o.centre ?? tot);
  if (o.centreLab) g.append('text').attr('text-anchor', 'middle').attr('y', 24).style('fill', css('--muted')).text(o.centreLab);
  const lx = 2 * R + 34, ly = Math.max(H, legH + 10) / 2 - legH / 2;
  L.forEach((d, i) => { const r = svg.append('g').attr('transform', `translate(${lx},${ly + i * rowH})`).style('cursor', d.onclick ? 'pointer' : null).on('click', (ev) => d.onclick && d.onclick(ev));
    r.append('rect').attr('width', 12).attr('height', 12).attr('y', 2).attr('rx', 3).attr('fill', d.color);
    r.append('text').attr('x', 18).attr('y', 12).style('fill', css('--fg')).text(`${d.label.length > 30 ? d.label.slice(0, 29) + '…' : d.label}  ${d.v} (${Math.round(100 * d.v / tot)}%)`); });
  return box;
}
/** heat grid: rows [{label}], cols [labels], cell(r, c) -> {v, share, tip, onclick} */
function heatGrid(rows, cols, cell, o = {}) {
  const labW = o.labW || 70, cw = o.cw || 92, rh = 26, W = labW + cols.length * cw + 4, H = 24 + rows.length * rh, base = o.color || COL()[0];
  const { box, svg } = svgBox(W, H);
  cols.forEach((c, j) => svg.append('text').attr('x', labW + j * cw + cw / 2).attr('y', 14).attr('text-anchor', 'middle').style('fill', css('--muted')).text(c));
  rows.forEach((r, i) => { const y = 22 + i * rh;
    svg.append('text').attr('x', labW - 8).attr('y', y + 16).attr('text-anchor', 'end').style('fill', css('--fg')).text(r.label);
    cols.forEach((c, j) => { const d = cell(r, c) || {}; const g = svg.append('g').style('cursor', d.onclick && d.v ? 'pointer' : null).on('click', (ev) => d.onclick && d.v && d.onclick(ev));
      const rect = g.append('rect').attr('x', labW + j * cw + 2).attr('y', y).attr('width', cw - 4).attr('height', rh - 4).attr('rx', 4).attr('fill', d.v ? `color-mix(in srgb, ${base} ${Math.round(15 + 85 * Math.min(1, d.share || 0))}%, transparent)` : css('--grid'));
      if (d.v) g.append('text').attr('x', labW + j * cw + cw / 2).attr('y', y + 15).attr('text-anchor', 'middle').style('fill', (d.share || 0) > 0.5 ? '#fff' : css('--fg')).style('pointer-events', 'none').text(o.fmt ? o.fmt(d) : d.v);
      onTip(rect, () => [...(d.tip || [r.label + ' · ' + c, String(d.v || 0)]), ...(d.onclick && d.v ? [CLICK] : [])]); }); });
  return box;
}
/** two-column flow: links [{a, b, v, tip?, onclick?}] from left nodes to right nodes; colour by left node */
function flow2(links, o = {}) {
  const C = COL(), W = o.W || 1000, gap = 8, labW = o.labW || 170, nw = 12;
  const L = [...new Set(links.map((l) => l.a))], Rn = [...new Set(links.map((l) => l.b))];
  const sumBy = (k, n) => d3.sum(links.filter((l) => l[k] === n), (l) => l.v);
  const order = (ns, k) => ns.sort((x, y) => (o.order ? o.order.indexOf(x) - o.order.indexOf(y) : 0) || sumBy(k, y) - sumBy(k, x));
  order(L, 'a'); order(Rn, 'b');
  const tot = d3.sum(links, (l) => l.v) || 1, H0 = o.H || Math.max(220, 26 * Math.max(L.length, Rn.length)), k = (H0 - gap * (Math.max(L.length, Rn.length) - 1)) / tot;
  const col = o.color || ((n) => C[L.indexOf(n) % 8]);
  const pos = (ns, key) => { let y = 4; return Object.fromEntries(ns.map((n) => { const h = sumBy(key, n) * k, r = [n, { y, h, oy: y }]; y += h + gap; return r; })); };
  const PL = pos(L, 'a'), PR = pos(Rn, 'b'), H = Math.max(...Object.values(PL).map((p) => p.y + p.h), ...Object.values(PR).map((p) => p.y + p.h)) + 6;
  const x0 = labW + nw, x1 = W - labW - nw;
  const { box, svg } = svgBox(W, H);
  links.slice().sort((p, q) => L.indexOf(p.a) - L.indexOf(q.a) || Rn.indexOf(p.b) - Rn.indexOf(q.b)).forEach((l) => {
    const t = l.v * k, ya = PL[l.a].oy + t / 2, yb = PR[l.b].oy + t / 2; PL[l.a].oy += t; PR[l.b].oy += t;
    const pth = svg.append('path').attr('d', d3.linkHorizontal()({ source: [x0, ya], target: [x1, yb] })).attr('fill', 'none').attr('stroke', col(l.a)).attr('stroke-width', Math.max(1.5, t)).attr('stroke-opacity', 0.45).style('cursor', l.onclick ? 'pointer' : null).on('click', (ev) => l.onclick && l.onclick(ev));
    onTip(pth, () => [...(l.tip || [`${l.a} → ${l.b}`]), `${l.v} player${l.v === 1 ? '' : 's'}`, ...(l.onclick ? [CLICK] : [])]); });
  const node = (P, x, anchor, tx, key) => Object.entries(P).forEach(([n, p]) => { svg.append('rect').attr('x', x).attr('y', p.y).attr('width', nw).attr('height', Math.max(2, p.h)).attr('rx', 2).attr('fill', key === 'a' ? col(n) : css('--axis'));
    svg.append('text').attr('x', tx).attr('y', p.y + p.h / 2 + 4).attr('text-anchor', anchor).style('fill', css('--fg')).text(`${n.length > 24 ? n.slice(0, 23) + '…' : n} (${sumBy(key, n)})`); });
  node(PL, labW, 'end', labW - 6, 'a'); node(PR, x1, 'start', x1 + nw + 6, 'b');
  return box;
}
/** medal grid: rows [{label, go, cells:{year:{place, tip, n}}}], years */
function medalGrid(rows, years, o = {}) {
  const labW = o.labW || 190, W = Math.max(o.W || 760, labW + years.length * 34), cw = (W - labW - (o.sumW || 0)) / Math.max(1, years.length), rh = 26, H = 20 + rh * rows.length;
  const { box, svg } = svgBox(W, H);
  years.forEach((y, j) => svg.append('text').attr('x', labW + j * cw + cw / 2).attr('y', 12).attr('text-anchor', 'middle').text(years.length > 12 ? "'" + String(y).slice(2) : y));
  rows.forEach((r, i) => { const g = svg.append('g').attr('transform', `translate(0,${18 + i * rh})`);
    if (i % 2 === 0) g.append('rect').attr('width', W).attr('height', rh).attr('fill', css('--bg')).attr('opacity', 0.7);
    const t = g.append('text').attr('x', labW - 8).attr('y', rh / 2 + 4).attr('text-anchor', 'end').style('fill', r.go ? css('--c0') : css('--fg')).text(r.label);
    if (r.go) t.style('cursor', 'pointer').on('click', () => { location.hash = r.go; });
    years.forEach((y, j) => { const c = r.cells[y]; if (!c) return; const col = MEDAL(c.place);
      const cg = g.append('g').attr('transform', `translate(${labW + j * cw + cw / 2},${rh / 2})`).style('cursor', c.go || c.onclick ? 'pointer' : 'default').on('click', (ev) => { if (c.onclick) c.onclick(ev); else if (c.go) location.hash = c.go; });
      onTip(cg, () => [...(c.tip || [r.label + ' ' + y, c.place ? ord(c.place) : 'no placing']), ...(c.onclick ? [CLICK] : [])]);
      cg.append('circle').attr('r', 10).attr('fill', col || css('--panel')).attr('stroke', c.sel ? css('--fg') : col ? 'none' : css('--axis')).attr('stroke-width', c.sel ? 2.5 : 1);
      cg.append('text').attr('y', 4).attr('text-anchor', 'middle').style('fill', col ? '#1b1b1b' : css('--muted')).style('font-weight', col ? 700 : 400).style('font-size', '10px').text(c.place || '•');
      if (c.n > 1) cg.append('text').attr('x', 13).attr('y', -4).style('font-size', '9px').text('×' + c.n); });
    if (r.sum) r.sum.forEach((v, k) => g.append('text').attr('x', W - (o.sumW || 0) + 10 + k * ((o.sumW - 10) / r.sum.length) + 14).attr('y', rh / 2 + 4).attr('text-anchor', 'middle').style('fill', css('--fg')).text(v || '–'));
  });
  if (o.sumHead) o.sumHead.forEach((t, k) => svg.append('text').attr('x', W - o.sumW + 10 + k * ((o.sumW - 10) / o.sumHead.length) + 14).attr('y', 12).attr('text-anchor', 'middle').text(t));
  box.append(legend([['Gold', MEDAL(1), 'dot'], ['Silver', MEDAL(2), 'dot'], ['Bronze', MEDAL(3), 'dot'], ['Other finish (number)', css('--axis'), 'dot']]));
  return box;
}
/** rows × columns presence grid (who played when) */
function presenceGrid(rows, cols, o = {}) {
  const nameW = 190, W = Math.max(o.W || 1000, nameW + cols.length * 40), cw = (W - nameW - 8) / cols.length, rh = 18, H = 22 + rh * rows.length;
  const { box, svg } = svgBox(W, H);
  cols.forEach((c, j) => svg.append('text').attr('x', nameW + 8 + j * cw + cw / 2).attr('y', 13).attr('text-anchor', 'middle').text(c));
  rows.forEach((r, i) => { const gy = 20 + i * rh;
    const t = svg.append('text').attr('x', nameW).attr('y', gy + 12).attr('text-anchor', 'end').style('fill', r.go ? css('--c0') : css('--fg')).text(r.label.length > 26 ? r.label.slice(0, 25) + '…' : r.label);
    if (r.go) t.style('cursor', 'pointer').on('click', () => { location.hash = r.go; });
    cols.forEach((c, j) => { const v = r.cells[c]; if (!v) return;
      onTip(svg.append('rect').attr('x', nameW + 8 + j * cw + 2).attr('y', gy + 2).attr('width', cw - 4).attr('height', rh - 4).attr('rx', 3).attr('fill', v.color).attr('opacity', v.op ?? 1), () => v.tip || [r.label, String(c)]); }); });
  return box;
}

// ---------- search ----------
const Q = $('#q'), QR = $('#qres');
let qSel = -1;
Q.addEventListener('input', async () => {
  const s = Q.value.trim().toLowerCase(); if (s.length < 2) { QR.hidden = true; return; }
  const I = await index();
  const ps = I.players.filter((p) => p.n.toLowerCase().includes(s)).slice(0, 12).map((p) => ['#/p/' + enc(p.k), p.n, (p.t || '') + (p.h ? ' · before 2022' : '')]);
  const ts = I.teams.filter((t) => t.n.toLowerCase().includes(s)).sort((a, b) => (!!a.h - !!b.h) || (b.nr || 0) - (a.nr || 0)).slice(0, 6).map((t) => ['#/t/' + enc(t.id), t.n, t.d + ' team', t]);
  const gs = I.gb.filter((g) => g.n.toLowerCase().includes(s)).slice(0, 4).map((g) => ['#/g/' + enc(g.id), g.n, 'GB squad']);
  const cs = (I.clubs || []).filter((c) => c.s > 1 && c.n.toLowerCase().includes(s)).slice(0, 3).map((c) => ['#/c/' + enc(c.id), c.n, `club · ${c.s} teams`, { n: c.n }]);
  const all = [...cs, ...ts, ...gs, ...ps]; qSel = -1;
  QR.replaceChildren(...(all.length ? all.map(([href, n, sub, t]) => h('a', { href, class: t ? 'withbadge' : null, onclick: () => { QR.hidden = true; Q.value = ''; } }, t ? badge(t, 22) : null, h('span', null, n, h('small', null, sub)))) : [h('div', { class: 'note', style: 'padding:8px' }, 'No match')]));
  QR.hidden = false;
});
Q.addEventListener('keydown', (e) => { const a = [...QR.querySelectorAll('a')]; if (!a.length) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); qSel = (qSel + (e.key === 'ArrowDown' ? 1 : -1) + a.length) % a.length; a.forEach((x, i) => x.classList.toggle('sel', i === qSel)); }
  if (e.key === 'Enter') { (a[qSel] || a[0]).click(); location.hash = (a[qSel] || a[0]).getAttribute('href'); }
  if (e.key === 'Escape') QR.hidden = true; });
document.addEventListener('click', (e) => { if (!e.target.closest('.search')) QR.hidden = true; });

// ---------- router ----------
const ROUTES = {};
async function route() {
  untip();
  const [_, view = '', ...rest] = location.hash.replace(/^#/, '').split('/');
  const arg = rest.length ? decodeURIComponent(rest.join('/')) : null;
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('on', a.getAttribute('href').split('/')[1] === ({ p: 'players', tree: 'players', t: 'teams', c: 'teams', g: 'gb', gc: 'gb', pathway: 'gb', programme: 'gb', e: 'events' }[view] || view)));
  const fn = ROUTES[view] || ROUTES[''];
  VIEW.replaceChildren(h('p', { class: 'loading' }, 'Loading…'));
  try { const out = await fn(arg); VIEW.replaceChildren(...[out].flat().filter(Boolean)); } catch (e) { console.error(e); VIEW.replaceChildren(card('Something went wrong', String(e.message || e))); }
  if (!arg || view !== (route.last || [])[0]) window.scrollTo(0, 0);
  route.last = [view, arg];
}
// back button: keeps its own trail of pages visited in this tab, so it only shows when there is somewhere to go back to
const TRAIL = [location.hash || '#/'];
const BACK = h('button', { class: 'back', hidden: true, 'aria-label': 'Back to the previous page', onclick: () => history.back() }, '← Back');
document.body.append(BACK);
window.addEventListener('hashchange', () => {
  const now = location.hash || '#/';
  if (TRAIL.length > 1 && TRAIL[TRAIL.length - 2] === now) TRAIL.pop(); else if (TRAIL[TRAIL.length - 1] !== now) TRAIL.push(now);
  BACK.hidden = TRAIL.length < 2; route();
});
// ---------- password screen ----------
// gate.json (written only on the public GitHub Pages copy) holds a salted SHA-256 of the site password.
// No gate.json (local copies, the Claude preview) means no password screen. It keeps casual visitors out; it is not encryption.
async function gate() {
  let g = null;
  try { const r = await fetch('gate.json' + (VER ? '?v=' + VER : ''), { cache: 'no-store' }); if (r.ok) g = await r.json(); } catch (e) {}
  if (!g || !g.hash) return;
  const KEY = 'ukut-gate';
  try { if (localStorage.getItem(KEY) === g.hash) return; } catch (e) {}
  const digest = async (pw) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(g.salt + pw)))].map((b) => b.toString(16).padStart(2, '0')).join('');
  document.body.classList.add('gated');
  await new Promise((done) => {
    const inp = h('input', { type: 'password', autocomplete: 'current-password', 'aria-label': 'Password', placeholder: 'Password', required: true });
    const msg = h('p', { class: 'gate-msg', 'aria-live': 'polite' });
    const keep = h('input', { type: 'checkbox', checked: true });
    const form = h('form', { class: 'gate-box', onsubmit: async (e) => { e.preventDefault();
      if (await digest(inp.value) === g.hash) { try { if (keep.checked) localStorage.setItem(KEY, g.hash); } catch (er) {} wrap.remove(); document.body.classList.remove('gated'); done(); }
      else { msg.textContent = 'That password isn’t right.'; inp.select(); } } },
      h('div', { class: 'gate-flag', 'aria-hidden': 'true' }), h('h1', null, 'UK Ultimate Tracker'), h('p', { class: 'note' }, g.note || 'Players, teams, GB squads and results from UK club ultimate. Enter the password to continue.'),
      inp, h('label', { class: 'note gate-keep' }, keep, ' Remember me on this device'), h('button', { class: 'btn primary', type: 'submit' }, 'Enter'), msg);
    const wrap = h('div', { class: 'gate' }, form); document.body.append(wrap); inp.focus();
  });
}
document.addEventListener('DOMContentLoaded', () => gate().then(route));
index().then((I) => { $('#built').textContent = 'Data built ' + I.built + ' · ' + I.players.length.toLocaleString() + ' players'; });

// ---------- shared: player profiles ----------
async function profile(k) { const I = await index(); const e = I.players.find((p) => p.k === k); if (!e) return null; const b = await getJSON('p/' + String(e.b).padStart(2, '0') + '.json'); return b[k] || null; }
// ---------- FMP / MMP (matching) filter ----------
// m codes from the build: F = women's division seen (hard rule), M = open + mixed seen, Mo = open only, f/m = first-name guess, '' = unknown
const MPL = { F: 'FMP', f: 'FMP (name guess)', M: 'MMP', Mo: 'MMP (open only)', m: 'MMP (name guess)', '': 'unknown' };
const mpSide = (m) => m === 'F' || m === 'f' ? 'F' : m === 'M' || m === 'Mo' || m === 'm' ? 'M' : '';
let MP = ''; try { MP = localStorage.getItem('mp') || ''; } catch (e) {}
let MPMAP = null;
const mpMap = async () => MPMAP || (MPMAP = new Map((await index()).players.map((p) => [p.k, p.m || ''])));
const mpPass = (k) => !MP || mpSide(MPMAP ? MPMAP.get(k) || '' : '') === MP;
const MPCTL = h('div', { class: 'mpctl', title: 'Show only female-matching or male-matching players across the site' }, [['', 'All'], ['F', 'FMP'], ['M', 'MMP']].map(([v, l]) => h('button', { class: 'chip' + (MP === v ? ' on' : ''), onclick: () => { MP = v; try { localStorage.setItem('mp', v); } catch (e) {} MPCTL.querySelectorAll('.chip').forEach((c, j) => c.classList.toggle('on', ['', 'F', 'M'][j] === v)); route(); } }, l)));
document.querySelector('header.top').insertBefore(MPCTL, document.querySelector('header.top .search'));
const mpNote = () => MP ? h('p', { class: 'note mpnote' }, `Showing ${MP === 'F' ? 'FMP' : 'MMP'} players only. `, h('a', { href: '#', onclick: (e) => { e.preventDefault(); MPCTL.querySelectorAll('.chip')[0].click(); } }, 'Show everyone')) : null;
const CMP = (() => { let s = []; try { s = JSON.parse(localStorage.getItem('cmp') || '[]'); } catch (e) {} return { list: () => s, has: (k) => s.includes(k), toggle(k) { s = s.includes(k) ? s.filter((x) => x !== k) : [...s, k].slice(-5); try { localStorage.setItem('cmp', JSON.stringify(s)); } catch (e) {} }, clear() { s = []; try { localStorage.setItem('cmp', '[]'); } catch (e) {} } }; })();
const CTX_COL = (tt) => /Overseas|Other national/i.test(tt) ? COL()[3] : /GB|national/i.test(tt) ? COL()[1] : /Training/i.test(tt) ? COL()[2] : /Masters/i.test(tt) ? COL()[6] : /Secondary|second/i.test(tt) ? COL()[5] : COL()[0];

// ---------- home ----------
ROUTES[''] = async () => {
  const I = await index();
  const cur = I.players.filter((p) => !p.h);
  return [h('h1', null, 'UK club ultimate, 2010–2026'),
    h('p', { class: 'sub' }, `${cur.length.toLocaleString()} players with rosters from 2022 onwards, ${(I.players.length - cur.length).toLocaleString()} more from earlier history, ${I.teams.length} teams, ${I.gb.length} GB squad lines and ${I.comps.length} competitions.`),
    h('div', { class: 'home-links' },
      [['#/players', 'Players', 'Search, open a player’s career, compare players'], ['#/teams', 'Teams', 'One club at a time: honours, results, roster changes, who played when'], ['#/gb', 'GB squads', 'Every GB squad since 2010 and how players came through'],
       ['#/events', 'Events', 'Who finished where at each competition, every year'], ['#/trends', 'Trends', 'What’s changing across UK club ultimate'], ['#/moves', 'Moves', 'Where players move, when, and what comes before a move'], ['#/connections', 'Connections', 'Which teams share players, across divisions and seasons']]
        .map(([href, b, s]) => h('a', { href }, h('b', null, b), h('span', null, s)))),
    (() => { const st = { n: 15, s: 'q' }; const tb = h('div'), C = COL();
      const yoy = (p) => (p.qs || []).slice(1).map((x, i) => [x[0], x[1] - p.qs[i][1]]);
      const jump = (p) => d3.max(yoy(p), (d) => d[1]) ?? -999;
      const spark = (p) => { const q = p.qs || []; if (q.length < 2) return h('span', { class: 'muted' }, q.length ? 'one season' : '—');
        const W = 110, H = 26, x = d3.scaleLinear([2022, 2026], [4, W - 4]), y = d3.scaleLinear([0, 100], [H - 3, 3]);
        const { box, svg } = svgBox(W, H); box.classList.add('spark');
        svg.append('path').attr('d', d3.line().x((d) => x(d[0])).y((d) => y(d[1]))(q)).attr('fill', 'none').attr('stroke', C[0]).attr('stroke-width', 1.8);
        q.forEach((d, i) => svg.append('circle').attr('cx', x(d[0])).attr('cy', y(d[1])).attr('r', i === q.length - 1 ? 2.8 : 1.8).attr('fill', C[0]));
        box.setAttribute('data-tip', JSON.stringify([p.n + ': Quality by season', ...q.map((d, i) => `${d[0]}: ${d[1]}` + (i ? `  (${d[1] - q[i - 1][1] >= 0 ? '+' : ''}${d[1] - q[i - 1][1]} on ${q[i - 1][0]})` : '')), p.tr != null ? `Trajectory ${p.tr > 0 ? '+' : ''}${d3.format('.1f')(p.tr)}/season (team ${p.trt > 0 ? '+' : ''}${p.trt}, individual ${p.tri > 0 ? '+' : ''}${p.tri})` : 'Trajectory needs 3+ seasons']));
        box.classList.add('hasinfo'); return box; };
      const SORTS = { q: ['Quality (this season)', (a, b) => (b.q ?? -1) - (a.q ?? -1)], st: ['Standing (career)', (a, b) => (b.st ?? -1) - (a.st ?? -1)], tr: ['Trajectory (rising fastest)', (a, b) => (b.tr ?? -999) - (a.tr ?? -999)], j: ['Biggest one-year jump', (a, b) => jump(b) - jump(a)] };
      const draw = () => { const L = cur.slice().sort(SORTS[st.s][1]).slice(0, st.n);
        tb.replaceChildren(h('div', { class: 'tscroll' }, table(['#', 'Player', 'Team', 'Division', 'Quality', 'Standing', 'Trajectory', 'Quality over time', 'Biggest jump'], L.map((p, i) => { const j = jump(p), jy = (yoy(p).find((d) => d[1] === j) || [])[0];
          return { go: '#/p/' + enc(p.k), cells: [i + 1, p.n, p.t, p.d, f0(p.q), f0(p.st), trj(p.tr, p.trt, p.tri), spark(p), j > -999 ? `${j >= 0 ? '+' : ''}${j} (${jy})` : '—'] }; }), { num: [0, 4, 5, 6, 8] }))); };
      const ctl = h('div', { class: 'controls' },
        h('select', { onchange: (e) => { st.s = e.target.value; draw(); } }, Object.entries(SORTS).map(([k, [l]]) => h('option', { value: k }, 'Rank by: ' + l))),
        h('select', { onchange: (e) => { st.n = +e.target.value; draw(); } }, [15, 25, 50, 100].map((n) => h('option', { value: n }, 'Top ' + n))));
      draw();
      return card('Top players right now', 'Quality = how good this season; Standing = how proven over every season we have; Trajectory = points gained or lost per season (3+ seasons). Hover the little line for each year’s score and the change from the year before. Click a name for the full profile.', ctl, tb); })()];
};

// ---------- players list + compare ----------
ROUTES.players = async () => {
  const I = await index(); await mpMap();
  const wrap = h('div');
  const st = { q: '', d: '', t: '', s: 'q', hist: false };
  const teamsAll = [...new Set(I.players.filter((p) => !p.h).flatMap((p) => (p.t || '').split(' + ')))].filter(Boolean).sort();
  const list = h('div'), cmpBox = h('div');
  const draw = () => {
    let L = I.players.filter((p) => mpPass(p.k) && (st.hist || !p.h) && (!st.q || p.n.toLowerCase().includes(st.q)) && (!st.d || p.d === st.d) && (!st.t || (p.t || '').split(' + ').includes(st.t)));
    L = L.slice().sort(st.s === 'q' ? (a, b) => (b.q ?? -1) - (a.q ?? -1) : st.s === 'qr' ? (a, b) => (b.qr ?? -1) - (a.qr ?? -1) : st.s === 'st' ? (a, b) => (b.st ?? -1) - (a.st ?? -1) : st.s === 'tr' ? (a, b) => (b.tr ?? -999) - (a.tr ?? -999) : st.s === 'g' ? (a, b) => (b.g ?? -999) - (a.g ?? -999) : st.s === 'gb' ? (a, b) => b.gb - a.gb : (a, b) => a.n.localeCompare(b.n));
    list.replaceChildren(h('p', { class: 'note' }, `${L.length.toLocaleString()} players` + (L.length > 300 ? ' (first 300 shown)' : '')),
      table(['', 'Player', 'Team (latest)', 'Division', 'Matching', 'Quality', 'Results quality', 'Standing', 'Trajectory', 'GB squads', 'Latest season'], L.slice(0, 300).map((p) => ({ go: '#/p/' + enc(p.k), cells: [
        h('input', { type: 'checkbox', title: 'Compare', checked: CMP.has(p.k) || null, onclick: (e) => { e.stopPropagation(); CMP.toggle(p.k); drawCmp(); } }), p.n + (p.h ? ' ·' : ''), p.t, p.d, MPL[p.m || ''], f0(p.q), f0(p.qr), f0(p.st), trj(p.tr, p.trt, p.tri), p.gb || '—', p.y] })), { num: [5, 6, 7, 8, 9, 10], max: '42rem' }));
  };
  const drawCmp = async () => {
    const ks = CMP.list();
    if (!ks.length) { cmpBox.replaceChildren(); return; }
    const ps = (await Promise.all(ks.map(profile))).filter(Boolean);
    const C = COL();
    const series = ps.map((p, i) => ({ name: p.n, color: C[i % 8], pts: p.seasons.map((s) => ({ x: s.year, y: s.quality, tip: [p.n + ' ' + s.year, (s.teams || '') + ' · quality ' + f0(s.quality)] })) }));
    const rows = [['Latest team', (p) => p.info?.latest_teams], ['Division', (p) => p.info?.division], ['Quality', (p) => f0(p.info?.quality)], ['Results quality', (p) => f0(p.info?.quality_r)], ['Level (team side)', (p) => f0(p.info?.level)], ['Impact (individual)', (p) => f0(p.info?.impact)],
      ['Standing', (p) => f0(p.info?.standing)], ['Trajectory (team / individual)', (p) => p.info?.traj == null ? '—' : `${sgn1(p.info.traj)}/season (${sgn1(p.info.traj_team)} / ${sgn1(p.info.traj_ind)})`], ['Change 25→26', (p) => p.info?.growth == null ? '—' : sgn(p.info.growth)], ['GB squads', (p) => p.gb.length], ['Seasons in data', (p) => p.seasons.length], ['Club games / goals / assists', (p) => { const c = p.stats.find((s) => s.scope === 'Club'); return c ? `${c.games_incl_estimate ?? c.games} / ${c.goals ?? '—'} / ${c.assists ?? '—'}` : '—'; }],
      ['Clubs', (p) => [...new Set(p.apps.filter((a) => /Club/.test(a.team_type)).map((a) => a.team))].join(', ')]];
    cmpBox.replaceChildren(card('Comparing ' + ps.length + ' players', 'Tick players in the list to add them (up to 5).',
      h('div', { class: 'controls' }, ps.map((p, i) => h('span', { class: 'pill x', style: `border-color:${C[i % 8]}`, onclick: () => { CMP.toggle(p.k); drawCmp(); draw(); } }, p.n + ' ✕')), h('button', { onclick: () => { CMP.clear(); drawCmp(); draw(); } }, 'Clear')),
      h('div', { class: 'grid2' }, lineChart(series, { yDomain: [0, 100], H: 240, xs: [2022, 2023, 2024, 2025, 2026] }),
        table(['', ...ps.map((p) => playerLink(p.k, p.n))], rows.map(([l, f]) => ({ cells: [l, ...ps.map(f)] }))))));
  };
  const ctl = h('div', { class: 'controls' },
    h('input', { type: 'search', placeholder: 'Filter by name', oninput: (e) => { st.q = e.target.value.trim().toLowerCase(); draw(); } }),
    h('select', { onchange: (e) => { st.d = e.target.value; draw(); } }, ['', 'Open', 'Women', 'Mixed'].map((d) => h('option', { value: d }, d || 'All divisions'))),
    h('select', { onchange: (e) => { st.t = e.target.value; draw(); } }, h('option', { value: '' }, 'All teams'), teamsAll.map((t) => h('option', { value: t }, t))),
    h('select', { onchange: (e) => { st.s = e.target.value; draw(); } }, [['q', 'Sort: quality'], ['qr', 'Sort: results quality'], ['st', 'Sort: standing'], ['tr', 'Sort: trajectory'], ['g', 'Sort: change 25→26'], ['gb', 'Sort: most GB squads'], ['n', 'Sort: name']].map(([v, l]) => h('option', { value: v }, l))),
    h('label', { class: 'note' }, h('input', { type: 'checkbox', onchange: (e) => { st.hist = e.target.checked; draw(); } }), ' include players only seen before 2022 (·)'));
  draw(); drawCmp();
  const mpCard = (() => { const cur = I.players.filter((p) => !p.h && p.q != null), C = COL();
    const side = (p) => mpSide(p.m || ''), G = [['F', 'FMP', C[1]], ['M', 'MMP', C[0]]];
    const row = (lab, f) => ({ cells: [lab, ...G.map(([v]) => f(cur.filter((p) => side(p) === v)))] });
    const rows = [row('Players (2022+ with a score)', (L) => L.length), row('Hard rule', (L) => L.filter((p) => ['F', 'M', 'Mo'].includes(p.m)).length), row('Name guess only', (L) => L.filter((p) => ['f', 'm'].includes(p.m)).length),
      row('Average quality', (L) => f0(d3.mean(L, (p) => p.q))), row('Average results quality', (L) => f0(d3.mean(L, (p) => p.qr))), row('Average standing', (L) => f0(d3.mean(L, (p) => p.st))), row('Average trajectory (3+ seasons)', (L) => { const v = d3.mean(L.filter((p) => p.tr != null), (p) => p.tr); return v == null ? '—' : sgn(Math.round(v * 10) / 10) + '/season'; }), row('Quality 70+', (L) => L.filter((p) => p.q >= 70).length), row('Played GB', (L) => L.filter((p) => p.gb).length + ' (' + pct(L.length ? L.filter((p) => p.gb).length / L.length : 0) + ')'),
      ...['Open', 'Women', 'Mixed'].map((d) => row('Latest division: ' + d, (L) => L.filter((p) => p.d === d).length))];
    const unk = cur.filter((p) => !side(p)).length;
    const ds = [[0, 20], [20, 40], [40, 60], [60, 80], [80, 101]].map(([a, b]) => ({ label: a + '–' + Math.min(100, b), F: cur.filter((p) => side(p) === 'F' && p.q >= a && p.q < b).length, M: cur.filter((p) => side(p) === 'M' && p.q >= a && p.q < b).length }));
    return card('FMP vs MMP', `Female-matching vs male-matching players. Hard rule: any women's-division appearance = FMP; open and mixed = MMP; open only = MMP (open only). The rest are a first-name guess, marked as such. ${unk} players can't be placed. Use the FMP / MMP switch in the header to filter every page.`,
      h('div', { class: 'grid2' }, table(['', 'FMP', 'MMP'], rows, { num: [1, 2] }), h('div', null, h('p', { class: 'note' }, 'Players by quality band'), barChart(ds.map((d) => ({ x: d.label, F: d.F, M: d.M })), [{ key: 'F', name: 'FMP', color: C[1] }, { key: 'M', name: 'MMP', color: C[0] }], { W: 460, H: 220 })))); })();
  wrap.append(h('h1', null, 'Players'), h('p', { class: 'sub' }, 'Every player in the data. Click a name for their full profile, or tick players to compare them.'), ...[mpNote()].filter(Boolean), cmpBox, card(null, null, ctl, list), mpCard);
  return wrap;
};

// ---------- player profile ----------
ROUTES.p = async (k) => {
  const p = await profile(k); if (!p) { const I = await index(), w = k.replace(/^h:/, '').toLowerCase().split(/\s+/).filter(Boolean);
    const m = I.players.filter((x) => w.every((t) => (x.n + ' ' + x.k).toLowerCase().includes(t))).slice(0, 12);
    return card('Player not found', m.length ? null : k, m.length ? h('div', null, h('p', null, 'No profile under “' + k + '”. Did you mean:'), h('ul', null, m.map((x) => h('li', null, h('a', { href: '#/p/' + encodeURIComponent(x.k) }, x.n), x.t ? ' · ' + x.t : '')))) : null); }
  const C = COL(), i = p.info || {};
  const out = [h('h1', null, p.n), h('p', { class: 'sub' }, [i.latest_teams, i.division, i.latest_season ? 'latest season ' + i.latest_season : null, p.history.length && !p.seasons.length ? 'seen before 2022 only' : null].filter(Boolean).join(' · '),
    ' ', h('button', { onclick: (e) => { CMP.toggle(p.k); e.target.textContent = CMP.has(p.k) ? 'In comparison ✓' : 'Add to comparison'; } }, CMP.has(p.k) ? 'In comparison ✓' : 'Add to comparison'), ' ', h('a', { href: '#/players' }, 'Compare →'))];
  const lastS = p.seasons[p.seasons.length - 1] || {};
  const brk = (s, rs) => [`This player (${s.year || ''}): team ${f0(rs ? s.team_rating_level : s.team_level)}${s.team_credit != null && !rs ? ' → team credit ' + f0(s.team_credit) : ''} · GB selection ${s.selection ?? 0}${s.selection_level ? ' (' + s.selection_level + ')' : ''} · production ${s.production == null ? 'no stats' : f0(s.production)} · role ${s.role == null ? '—' : f0(s.role)}`];
  out.push(h('p', { class: 'sub' }, 'Matching: ' + MPL[p.m || ''] + (p.m === 'F' ? ' — played in a women\'s division' : p.m === 'M' ? ' — played open and mixed' : p.m === 'Mo' ? ' — open division only so far' : p.m === 'f' || p.m === 'm' ? ' — guessed from the first name only; tell Max if wrong' : ' — no division evidence and no name match')));
  { const I1 = await index(), cbi = new Map((I1.clubs || []).map((c) => [c.id, c])), tc = new Map(I1.teams.filter((t) => t.c).map((t) => [t.n, t.c]));
    const seen = new Map(); [...p.apps.map((a) => [a.team, a.year]), ...p.history.map((x) => [x.team, x.year])].forEach(([tm, y]) => { const cid = tc.get(tm); if (!cid || !cbi.get(cid) || cbi.get(cid).s < 2) return; const e = seen.get(cid) || { ts: new Set(), ys: new Set() }; e.ts.add(tm); e.ys.add(+y); seen.set(cid, e); });
    if (seen.size) out.push(h('p', { class: 'sub' }, 'Club' + (seen.size > 1 ? 's' : '') + ': ', ...[...seen].sort((a, b) => d3.max(b[1].ys) - d3.max(a[1].ys)).flatMap(([cid, e], j) => { const ys = [...e.ys].sort(); return [j ? ' · ' : '', h('a', { href: '#/c/' + enc(cid) }, cbi.get(cid).n), ` → ${[...e.ts].join(', ')} (${ys[0] === ys[ys.length - 1] ? ys[0] : ys[0] + '–' + ys[ys.length - 1]})`]; }))); }
  if (p.info) out.push(tiles([['Quality', f0(i.quality), i.profile, brk(lastS, false)], ['Results quality', f0(i.quality_r), lastS.team_rated ? 'team part from game results' : 'team not rated: same as Quality', brk(lastS, true)], ['Standing', f0(i.standing), `career, ${p.seasons.length} season${p.seasons.length === 1 ? '' : 's'} of evidence`, [`Season Quality: ${p.seasons.map((x) => x.year + ' ' + f0(x.quality)).join(', ')}`]], ['Level (team side)', f0(i.level), 'where they’re trusted to play'], ['Impact (individual)', f0(i.impact), 'what they add there'],
    ['Trajectory', i.traj == null ? '—' : sgn1(i.traj) + '/season', i.traj == null ? `needs 3+ seasons (has ${p.seasons.length})` : `team ${sgn1(i.traj_team)} · individual ${sgn1(i.traj_ind)} (${i.traj_from}–${i.traj_to})`],
    ['Change 25→26', i.growth == null ? '—' : sgn(i.growth), i.growth_drivers || ''], ['GB squads', p.gb.length, p.gb.length ? p.gb.map((g) => g.year).filter((v, j, a) => a.indexOf(v) === j).join(', ') : 'none in the data'], ['Seasons', p.seasons.length + (p.history.length ? ' + ' + new Set(p.history.map((x) => x.year)).size + ' earlier' : ''), 'with rosters']]));
  // trajectory
  if (p.seasons.length) {
    const yrs = [2022, 2023, 2024, 2025, 2026];
    out.push(card('Trajectory', 'Quality each season (finish-based, solid), Results quality (team part from game results, dashed) and Standing (career score to that season), with Level (the team they play for and how much they play) and Impact (what they add, measured against teammates). Hover a point for the breakdown.',
      lineChart([['Quality', C[0], 3, 'quality'], ['Results quality', C[5], 2, 'quality_r'], ['Standing', C[3], 2.5, 'standing'], ['Level', C[1], 2, 'level'], ['Impact', C[2], 2, 'impact']].map(([nm, c, w, key]) => ({ name: nm, color: c, w, dash: key === 'quality_r' ? '5 3' : null, pts: p.seasons.filter((s) => s[key] != null).map((s) => ({ x: s.year, y: s[key], tip: [nm + ' ' + s.year, (s.teams || '') + ' · ' + f0(s[key]) + (s.selection_level ? ' · GB: ' + s.selection_level : ''), ...(key.startsWith('quality') ? brk(s, key === 'quality_r') : [])] })) })), { yDomain: [0, 100], xs: yrs, W: 1000, H: 260 })));
  }
  // career grid
  const rowsMap = new Map();
  const add = (team, year, kind, tipLine, go) => { const key = team; if (!rowsMap.has(key)) rowsMap.set(key, { label: team, cells: {}, kind, go, first: year }); const r = rowsMap.get(key); r.first = Math.min(r.first, year); (r.cells[year] = r.cells[year] || { color: CTX_COL(kind), tips: [] }).tips.push(tipLine); };
  const ourTeams = new Set([...p.apps.map((a) => a.team), ...(await index()).teams.map((t) => t.n)]);
  const histName = (t) => { const s = t.replace(/^(London|Birmingham|Bristol|Glasgow|Durham|Royal Leamington Spa|South London|Epsom|Edinburgh|Reading|Cambridge|Oxford|Manchester|Leeds|Sheffield|Brighton|Southampton|Nottingham) /, ''); const b = s.replace(/ Ultimate$/, ''); if (ourTeams.has(t)) return t; if (ourTeams.has(s)) return s; if (b && ourTeams.has(b)) return b; return t; };
  p.history.filter((x) => !/^GB/.test(x.division)).forEach((x) => add((() => { const n = histName(x.team); if (!/master/i.test(x.age || '')) return n; const b = x.team.replace(/^(London|Birmingham|Bristol|Glasgow|Durham|Royal Leamington Spa|South London|Epsom|Edinburgh|Reading|Cambridge|Oxford|Manchester|Leeds|Sheffield|Brighton|Southampton|Nottingham) /, ''); return [n, b, b.replace(/ Ultimate$/, '')].map((c) => c + ' Masters').find((c) => ourTeams.has(c)) || n; })(), x.year, 'Club', (x.events || '') + (x.goals !== '' && x.goals != null ? ` · ${x.goals}G ${x.assists}A` : '')));
  p.apps.forEach((a) => add(a.team, a.year, a.team_type || '', `${a.event}${a.place ? ' · ' + ord(a.place) : ''}${a.games ? ` · ${a.games} games, ${a.goals ?? 0}G ${a.assists ?? 0}A` : ''}${/inferred/.test(a.team_type) ? ' (assumed from squad)' : ''}`));
  p.gb.forEach((g) => { const r = rowsMap.get(g.team); if (!(r && r.cells[g.year])) add(g.team, g.year, 'GB', `${g.team} ${g.year}${g.place ? ' · ' + ord(g.place) : ''}`, '#/g/' + enc(g.line)); else if (!r.go) r.go = '#/g/' + enc(g.line); });   // every GB squad-season, even when the squad already has a row
  const years = [...new Set([...rowsMap.values()].flatMap((r) => Object.keys(r.cells).map(Number)))].sort((a, b) => a - b);
  const rws = [...rowsMap.values()].sort((a, b) => a.first - b.first).map((r) => ({ label: r.label, go: r.go, cells: Object.fromEntries(Object.entries(r.cells).map(([y, c]) => [y, { color: c.color, tip: [r.label + ' · ' + y, ...c.tips.slice(0, 8)] }])) }));
  out.push(card('Career', 'Every team in the data, by season. Hover a square for the events.', presenceGrid(rws, years), legend([['Club', C[0]], ['GB squad', C[1]], ['Training player', C[2]], ['Overseas / other nation', C[3]], ['Secondary team', C[5]], ['Masters side', C[6]]])));
  // GB
  if (p.gb.length) out.push(card('GB squads', null, table(['Year', 'Squad', 'Finish', 'Club then', 'GB squad no.'], p.gb.map((g) => ({ go: '#/g/' + enc(g.line), cells: [g.year, g.team, ord(g.place), g.club || '—', ord(g.caps)] })), { num: [0, 4] })));
  // stats + events
  const ev = p.apps.slice().sort((a, b) => b.year - a.year || String(b.event).localeCompare(String(a.event)));
  if (p.apps.length || p.stats.length) out.push(h('div', { class: 'grid2' },
    card('Stats', 'Games include an estimate where an event published no stats.', p.stats.length ? table(['Scope', 'Events', 'Games', 'Goals', 'Assists', 'Pts / game'], p.stats.map((s) => ({ cells: [s.scope, s.events, s.games_incl_estimate ?? s.games, s.goals, s.assists, f1(s.points_per_game)] })), { num: [1, 2, 3, 4, 5] }) : h('p', { class: 'note' }, 'No stats.')),
    card('Moves', 'Changes of club between seasons.', p.moves.length ? table(['Season', 'From', 'To', 'Type'], p.moves.map((m) => ({ cells: [`${m.from_year}→${m.to_year}`, m.from_team, m.to_team, m.category.replace(/^[A-Z]\. /, '')] }))) : h('p', { class: 'note' }, 'No club moves in the data.'))));
  if (ev.length) out.push(card('Every event', ev.length + ' appearances from 2022' + (p.history.length ? '; earlier seasons are in the career grid above' : ''), table(['Season', 'Event', 'Team', 'Finish', 'Games', 'Goals', 'Assists', 'Type'], ev.map((a) => ({ cells: [a.year, a.event, a.team, ord(a.place), a.games, a.goals, a.assists, a.team_type] })), { num: [0, 3, 4, 5, 6], max: '24rem' })));
  out.push(card('Teammate tree', 'Everyone in the data linked to ' + p.n + ' through teammates, ring by ring: teammates, teammates of teammates, and so on.',
    h('p', null, h('a', { class: 'btn', href: '#/tree/' + enc(p.k) }, 'Open ' + p.n + '’s teammate tree →'))));
  if (p.mates.length) out.push(card('Closest teammates', 'Ranked by events played together. Click a name to open them.', hbars(p.mates.slice(0, 20).map((m) => ({ label: m.n, v: m.e, go: '#/p/' + enc(m.k), tip: [m.n, m.e + ' events together · ' + m.y.join(', '), m.t] })), { fmt: (v) => v + ' events', W: 1000 })));
  if (i.other_nations || i.training_2025 || i.training_2026) out.push(card('Notes', null, h('p', null, [i.other_nations && 'Other nations: ' + i.other_nations, i.training_2025 && 'Training player 2025: ' + i.training_2025, i.training_2026 && 'Training player 2026: ' + i.training_2026].filter(Boolean).join(' · '))));
  return out;
};

// ---------- teammate tree ----------
// Radial tree: the player in the middle, then a ring per degree of separation. Each person hangs off the teammate
// that gives the most certain chain back to the centre. Link certainty: both on a published roster = 100%,
// one only assumed from the squad (no roster published) = 70%, only linked as a training player = 50%;
// a chain's confidence is the product of its links.
const LINK_CONF = { 3: 1, 2: 0.7, 1: 0.5 };
const LINK_WORD = { 3: 'both on a published roster', 2: 'squad assumed (no roster published)', 1: 'training player link' };
let GRAPH = null;
async function graph() {
  if (GRAPH) return GRAPH;
  const g = await getJSON('graph.json'); const n = g.keys.length; const adj = Array.from({ length: n }, () => []);
  for (let i = 0; i < g.e.length; i += 6) { const [a, b, l, c, t, y] = g.e.slice(i, i + 6); adj[a].push([b, l, c, t, y]); adj[b].push([a, l, c, t, y]); }
  return (GRAPH = { keys: g.keys, teams: g.teams, adj, idx: new Map(g.keys.map((k, i) => [k, i])) });
}
function spread(G, root) {
  const n = G.keys.length, depth = new Int16Array(n).fill(-1), conf = new Float32Array(n), par = new Int32Array(n).fill(-1), via = new Array(n);
  depth[root] = 0; conf[root] = 1; let layer = [root], d = 0;
  while (layer.length) {
    const best = new Map();
    for (const u of layer) for (const [v, l, c, t, y] of G.adj[u]) {
      if (depth[v] !== -1) continue; const cf = conf[u] * LINK_CONF[l]; const b = best.get(v);
      if (!b || cf > b[0] || (cf === b[0] && c > b[2])) best.set(v, [cf, u, c, l, t, y]);
    }
    d++; layer = [];
    for (const [v, [cf, u, c, l, t, y]] of best) { depth[v] = d; conf[v] = cf; par[v] = u; via[v] = { l, c, t: G.teams[t], y: 2000 + y }; layer.push(v); }
  }
  return { depth, conf, par, via };
}
ROUTES.tree = async (k) => {
  const [G, I] = await Promise.all([graph(), index()]); const C = COL();
  const pk = new Map(I.players.map((p) => [p.k, p]));
  const root = G.idx.get(k); const P = pk.get(k);
  if (root == null) return [h('h1', null, (P && P.n) || k), card('No teammate links', 'This player has no teammates in the data yet.')];
  const S = spread(G, root);
  const name = (i) => (pk.get(G.keys[i]) || {}).n || G.keys[i].replace(/^h:/, '');
  const divCol = (i) => { const d = (pk.get(G.keys[i]) || {}).d || ''; return /Women/.test(d) ? C[3] : /Mixed/.test(d) ? C[2] : /Open/.test(d) ? C[0] : C[7]; };
  const kidsOf = new Map(); let maxD = 0, reach = 0; const byDeg = [];
  for (let i = 0; i < G.keys.length; i++) if (S.depth[i] > 0) { reach++; maxD = Math.max(maxD, S.depth[i]); byDeg[S.depth[i]] = (byDeg[S.depth[i]] || 0) + 1; (kidsOf.get(S.par[i]) || kidsOf.set(S.par[i], []).get(S.par[i])).push(i); }
  const strength = (i) => S.via[i] ? S.via[i].c : 0;
  for (const v of kidsOf.values()) v.sort((a, b) => S.conf[b] - S.conf[a] || strength(b) - strength(a));
  const direct = (kidsOf.get(root) || []).slice().sort((a, b) => strength(b) - strength(a) || name(a).localeCompare(name(b)));
  const chain = (i) => { const c = []; while (i !== -1) { c.push(i); i = S.par[i]; } return c; };
  let show = 1, sel = null; const open = new Set();
  const box = h('div', { class: 'treebox' }); const panel = h('div', { class: 'tpanel' });
  const W = 1000, R = W / 2 - 70;
  const svg = d3.select(box).append('svg').attr('viewBox', `${-W / 2} ${-W / 2} ${W} ${W}`).attr('class', 'tree');
  const bg = svg.append('rect').attr('x', -W / 2).attr('y', -W / 2).attr('width', W).attr('height', W).attr('fill', 'transparent');
  const gz = svg.append('g'); let K = 1, nodes = [], byI = new Map(), xy = () => [0, 0], dots, links, labs, hl;
  const labelFont = () => Math.max(6, Math.min(11, (show === 1 ? 0.8 : 0.5) * R * 2 * Math.PI / Math.max(1, (kidsOf.get(root) || []).length) * 0.85));
  function draw() {
    gz.selectAll('*').remove();
    const build = (i, d) => ({ i, children: (d < show || open.has(i)) ? (kidsOf.get(i) || []).map((j) => build(j, d + 1)) : [] });
    const hr = d3.hierarchy(build(root, 0));
    // equal slice of the circle per teammate (grouped by the team they share, strongest first), each branch fanning out inside its parent's slice
    const order = (i) => S.via[i] ? S.via[i].t : '';
    hr.children && hr.children.sort((a, b) => order(a.data.i).localeCompare(order(b.data.i)) || strength(b.data.i) - strength(a.data.i));
    const place = (nd, a0, a1) => { nd.x = (a0 + a1) / 2; const c = nd.children || [];
      // an opened branch fans out wider than its own slice so its names are readable
      if (open.has(nd.data.i) && nd.depth >= show) { const span = Math.min(Math.PI * 0.9, Math.max(a1 - a0, c.length * 0.045)); a0 = nd.x - span / 2; a1 = nd.x + span / 2; }
      c.forEach((ch, j) => place(ch, a0 + (a1 - a0) * j / c.length, a0 + (a1 - a0) * (j + 1) / c.length)); };
    place(hr, 0, 2 * Math.PI);
    const depthShown = Math.max(show, ...[...open].map((i) => S.depth[i] + ((kidsOf.get(i) || []).length ? 1 : 0)));
    const ring = (d) => d === 0 ? 0 : depthShown === 1 ? R * 0.8 : R * (0.5 + 0.5 * (d - 1) / Math.max(1, depthShown - 1));
    hr.each((nd) => { nd.y = ring(nd.depth); });
    xy = (nd) => [nd.y * Math.cos(nd.x - Math.PI / 2), nd.y * Math.sin(nd.x - Math.PI / 2)];
    nodes = hr.descendants(); byI = new Map(nodes.map((nd) => [nd.data.i, nd]));
    for (let d = 1; d <= depthShown; d++) { gz.append('circle').attr('r', ring(d)).attr('class', 'ring'); gz.append('text').attr('class', 'ringlab').attr('y', -ring(d) - 4).attr('text-anchor', 'middle').text(ord(d) + ' degree'); }
    links = gz.append('g').attr('class', 'links').selectAll('path').data(hr.links()).join('path')
      .attr('d', d3.linkRadial().angle((d) => d.x).radius((d) => d.y))
      .attr('stroke-width', (l) => (l.target.depth === 1 ? 0.8 : 0.5) + Math.log2(1 + strength(l.target.data.i)) * 0.6)
      .attr('stroke-dasharray', (l) => S.via[l.target.data.i].l < 3 ? '3 2' : null);
    hl = gz.append('g').attr('class', 'pathhl');
    dots = gz.append('g').selectAll('circle').data(nodes).join('circle').attr('class', 'tnode')
      .attr('cx', (nd) => xy(nd)[0]).attr('cy', (nd) => xy(nd)[1])
      .attr('fill', (nd) => nd.depth === 0 ? css('--fg') : divCol(nd.data.i))
      .attr('fill-opacity', (nd) => nd.depth === 0 ? 1 : 0.35 + 0.65 * S.conf[nd.data.i]);
    const ring1 = nodes.filter((nd) => nd.depth === 1);
    const topN = new Set(ring1.slice().sort((a, b) => strength(b.data.i) - strength(a.data.i)).slice(0, show === 1 ? 260 : 60).map((nd) => nd.data.i));
    labs = gz.append('g').attr('class', 'tlabs').selectAll('text').data(nodes.filter((nd) => nd.depth >= 1)).join('text')
      .attr('class', (nd) => nd.depth === 1 && (topN.has(nd.data.i) || ring1.length <= 60) ? 'lab1 top' : 'lab' + Math.min(nd.depth, 3))
      .attr('dy', '0.32em').text((nd) => name(nd.data.i))
      .style('cursor', 'pointer').on('click', (ev, nd) => { ev.stopPropagation(); pick(nd.data.i); }).on('dblclick', (ev, nd) => { location.hash = '#/p/' + enc(G.keys[nd.data.i]); });
    gz.append('text').attr('class', 'rootlab').attr('text-anchor', 'middle').text(name(root));
    dots.on('mousemove', (ev, nd) => { if (nd.depth === 0) return tip(ev, [name(root), reach.toLocaleString() + ' people within ' + maxD + ' steps']); const v = S.via[nd.data.i];
        tip(ev, [name(nd.data.i), `${ord(nd.depth)} degree · ${pct(S.conf[nd.data.i])} confidence`, `via ${name(S.par[nd.data.i])} · ${v.t} ${v.y}${v.c > 1 ? ` · ${v.c} seasons together` : ''}`, 'Click for details · double-click to open profile']); if (sel == null) emphasise(nd.data.i, true); })
      .on('mouseleave', () => { untip(); if (sel == null) emphasise(null); })
      .on('click', (ev, nd) => { ev.stopPropagation(); if (nd.depth > 0) pick(nd.data.i); })
      .on('dblclick', (ev, nd) => { ev.stopPropagation(); location.hash = '#/p/' + enc(G.keys[nd.data.i]); });
    rescale(); emphasise(sel);
  }
  function rescale() {
    dots.attr('r', (nd) => (nd.depth === 0 ? 10 : nd.depth === 1 ? 2.6 + Math.min(4, Math.sqrt(strength(nd.data.i))) : 2.4) / Math.sqrt(K));
    const f = labelFont() / Math.max(1, K * 0.85);
    labs.style('font-size', f + 'px')
      .attr('transform', (nd) => { const a = nd.x * 180 / Math.PI - 90; const [x, y] = xy(nd); return `translate(${x},${y}) rotate(${nd.x > Math.PI ? a + 180 : a})`; })
      .attr('x', (nd) => (nd.x > Math.PI ? -1 : 1) * (7 / Math.sqrt(K))).attr('text-anchor', (nd) => nd.x > Math.PI ? 'end' : 'start');
    box.classList.toggle('z1', K >= 1.8); box.classList.toggle('z2', K >= 4); box.classList.toggle('z3', K >= 8);
    gz.select('.rootlab').style('font-size', 18 / Math.max(1, K * 0.8) + 'px').attr('y', 28 / Math.sqrt(K));
    gz.selectAll('.ringlab').style('font-size', 11 / K + 'px');
  }
  // emphasis: the chosen person, the chain back to the centre and their own branch stand out; the rest fades
  function emphasise(i, hover) {
    const on = new Set();
    if (i != null && byI.has(i)) { chain(i).forEach((j) => on.add(j)); byI.get(i).descendants().forEach((nd) => on.add(nd.data.i)); }
    const dim = i != null;
    box.classList.toggle('focus', dim);
    dots.classed('on', (nd) => on.has(nd.data.i)); labs.classed('on', (nd) => on.has(nd.data.i)); links.classed('on', (l) => on.has(l.target.data.i) && on.has(l.source.data.i));
    hl.selectAll('*').remove(); dots.classed('nb', false);
    // chords from the chosen person to every teammate of theirs that is on screen
    if (i != null && !hover && byI.has(i)) { const a = xy(byI.get(i)); const nb = new Set();
      for (const [j, l, c] of G.adj[i]) { const nd = byI.get(j); if (!nd || j === S.par[i]) continue; nb.add(j); const b = xy(nd);
        hl.append('path').attr('class', 'chord').attr('d', `M${a[0]},${a[1]} Q${(a[0] + b[0]) * 0.25},${(a[1] + b[1]) * 0.25} ${b[0]},${b[1]}`).style('stroke-width', (0.6 + Math.log2(1 + c) * 0.7) / Math.sqrt(K)).style('stroke-dasharray', l < 3 ? '3 2' : null); }
      dots.classed('nb', (nd) => nb.has(nd.data.i)); labs.classed('nb', (nd) => nb.has(nd.data.i)); }
  }
  function pick(i) {
    sel = i; open.clear(); chain(i).forEach((j) => open.add(j)); draw(); emphasise(i); describe(i);
  }
  function clear() { sel = null; const had = open.size; open.clear(); if (had) draw(); emphasise(null); home(); }
  bg.on('click', clear);
  const zoom = d3.zoom().scaleExtent([0.6, 16]).on('zoom', (ev) => { gz.attr('transform', ev.transform); K = ev.transform.k; rescale(); if (sel != null) emphasise(sel); });
  svg.call(zoom).on('dblclick.zoom', null);
  const flyTo = (i) => { const nd = byI.get(i); if (!nd) return; if (nd.depth <= 1) return svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity); const [x, y] = xy(nd); const k2 = Math.max(K, nd.depth >= 2 ? 3 : 1.8); svg.transition().duration(650).call(zoom.transform, d3.zoomIdentity.scale(k2).translate(-x, -y)); };
  // side panel
  const mateRow = (j, extra) => h('li', { onmouseenter: () => sel == null && emphasise(j, true), onmouseleave: () => sel == null && emphasise(null) },
    h('a', { href: 'javascript:void 0', onclick: () => { pick(j); flyTo(j); } }, name(j)), h('span', { class: 'muted' }, ' · ' + extra));
  function home() {
    panel.replaceChildren(h('h3', null, 'Direct teammates'), h('p', { class: 'note' }, `${direct.length} people. Bigger dot = more seasons together. Click a name to see their branch, double-click a dot to open a profile.`),
      h('ol', { class: 'mates' }, direct.slice(0, 40).map((j) => mateRow(j, `${S.via[j].c} season${S.via[j].c > 1 ? 's' : ''} · latest ${S.via[j].t} ${S.via[j].y}`))),
      ...(direct.length > 40 ? [h('p', { class: 'note' }, `+ ${direct.length - 40} more on the ring`)] : []));
  }
  function describe(i) {
    const c = chain(i).reverse(); const steps = [];
    for (let j = 1; j < c.length; j++) { const v = S.via[c[j]]; steps.push(h('li', null, h('b', null, name(c[j - 1])), ' and ', h('b', null, name(c[j]))
      , h('div', { class: 'muted' }, `${v.t} ${v.y}${v.c > 1 ? ` + ${v.c - 1} more season${v.c > 2 ? 's' : ''} together` : ''} · ${LINK_WORD[v.l]}`))); }
    const e = pk.get(G.keys[i]) || {}; const kids = kidsOf.get(i) || [];
    panel.replaceChildren(...[
      h('div', { class: 'tp-head' }, h('h3', null, name(i)), h('button', { class: 'x', 'aria-label': 'Close', onclick: clear }, '×')),
      h('p', { class: 'note' }, [e.t, e.d, e.y ? 'last seen ' + e.y : null].filter(Boolean).join(' · ')),
      h('p', { class: 'tp-actions' }, h('a', { class: 'btn primary', href: '#/p/' + enc(G.keys[i]) }, 'Open profile →'), ' ', h('a', { class: 'btn', href: '#/tree/' + enc(G.keys[i]) }, 'Their tree')),
      h('p', null, h('b', null, ord(S.depth[i]) + ' degree'), ' · chain confidence ', h('b', null, pct(S.conf[i]))),
      h('h4', null, 'How they connect'), h('ol', { class: 'chain' }, steps),
      h('h4', null, `Played with (${G.adj[i].length})`), h('p', { class: 'note' }, 'Orange lines on the tree. Click a name to jump to them.'),
      h('ol', { class: 'mates' }, G.adj[i].slice().sort((a, b) => b[2] - a[2] || name(a[0]).localeCompare(name(b[0]))).slice(0, 30).map(([j, l, c, t, y]) => mateRow(j, `${c} season${c > 1 ? 's' : ''} · latest ${G.teams[t]} ${2000 + y}${l < 3 ? ' (assumed)' : ''}`))),
      G.adj[i].length > 30 ? h('p', { class: 'note' }, `+ ${G.adj[i].length - 30} more — see their tree`) : null,
      kids.length ? [h('h4', null, `Placed under ${name(i)} on this tree (${kids.length})`), h('ol', { class: 'mates' }, kids.slice(0, 25).map((j) => mateRow(j, `${S.via[j].t} ${S.via[j].y}`))), kids.length > 25 ? h('p', { class: 'note' }, `+ ${kids.length - 25} more`) : null] : null].flat().filter(Boolean));
  }
  // controls
  const segBox = h('div', { class: 'seg', role: 'group', 'aria-label': 'How far out to show' });
  function seg() { segBox.replaceChildren(...[[1, 'Teammates'], [2, '+ their teammates'], [maxD, 'Everyone']].filter(([d], j, a) => j === 0 || d > a[j - 1][0]).map(([d, t]) => h('button', { class: show === d ? 'on' : null, onclick: () => { show = d; seg(); draw(); svg.call(zoom.transform, d3.zoomIdentity); } }, t))); }
  const opts = []; for (let i = 0; i < G.keys.length; i++) if (S.depth[i] > 0) opts.push(i); opts.sort((a, b) => name(a).localeCompare(name(b)));
  const dl = h('datalist', { id: 'tree-people' }, opts.map((i) => h('option', { value: name(i) })));
  const find = h('input', { type: 'search', list: 'tree-people', placeholder: 'How is someone connected? Type a name', style: 'min-width:min(100%,300px)',
    onchange: (e) => { const i = opts.find((j) => name(j).toLowerCase() === e.target.value.trim().toLowerCase()); if (i == null) return; pick(i); setTimeout(() => flyTo(i), 50); } });
  seg(); draw(); home();
  const conf1 = direct.filter((j) => S.via[j].l === 3).length;
  return [h('h1', null, name(root) + ' — teammate tree'),
    h('p', { class: 'sub' }, h('a', { href: '#/p/' + enc(k) }, '← back to profile'), ' · scroll or pinch to zoom, drag to move · click a name or dot for their branch, double-click to open their profile'),
    tiles([['Within reach', reach.toLocaleString(), 'of ' + (G.keys.length - 1).toLocaleString() + ' players with links'], ...byDeg.slice(1, 5).map((v, d) => [ord(d + 1) + ' degree', v.toLocaleString(), d === 0 ? conf1 + ' on a shared published roster' : null])]),
    h('div', { class: 'controls' }, segBox, find, dl, h('button', { onclick: () => { svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity); clear(); } }, 'Reset')),
    h('div', { class: 'treewrap' }, box, panel),
    legend([['Open', C[0], 'dot'], ['Mixed', C[2], 'dot'], ['Women', C[3], 'dot'], ['GB / other', C[7], 'dot']]),
    h('p', { class: 'note' }, 'Solid line: both players on a published roster for the same team at the same event (or the same team-season before 2022). Dashed: at least one of them is only assumed to have played, because that event published no roster (70%), or the link is through a training-player listing (50%). Thicker lines = more seasons together. A chain’s confidence is its links multiplied together; each person sits under the teammate that gives the most certain route back to the centre.')];
};

// ---------- teams ----------
const KORDER = ['WUCC', 'EUCF', 'Elite Invite', 'E2CF', 'UKU Nationals', 'Masters (worlds)', 'Masters (EMUCC)', 'UKU Masters', 'Spring Tour', 'Summer Tour', 'Windmill', "Tom's Tourney", 'Vienna Spring Break', 'Bad Skid', 'UKU Nationals Div 2', 'UKU Regionals / Qualifier', 'UKU Tour', 'Invite', 'Beach club', 'Indoor club'];
const MAJOR = new Set(['WUCC', 'EUCF', 'Elite Invite', 'UKU Nationals', 'Masters (worlds)']);
ROUTES.teams = async () => {
  const I = await index();
  const st = { q: '', d: '', h: true, club: true }; const list = h('div'); const cnt = h('p', { class: 'note' });
  const divs = [...new Set(I.teams.map((t) => t.d))].sort((a, b) => (['Open', 'Women', 'Mixed'].indexOf(a) + 1 || 9) - (['Open', 'Women', 'Mixed'].indexOf(b) + 1 || 9) || a.localeCompare(b));
  const yrs = (t) => (t.first ?? t.y0) === (t.last ?? t.y1) ? String(t.first ?? t.y0) : `${t.first ?? t.y0}–${t.last ?? t.y1}`;
  const teamTable = (L) => table(['Team', 'Division', 'Rosters', 'Players used', 'Results', 'Titles', 'Seen'], L.map((t) => ({ go: '#/t/' + enc(t.id), cells: [h('span', { class: 'withbadge' }, badge(t, 20), t.n), t.d, t.h ? 'results only' : `${t.y0}–${t.y1}`, t.p ?? '—', t.nr ?? '—', t.ti || '—', yrs(t)] })), { num: [3, 4, 5], max: '44rem' });
  const clubsById = new Map((I.clubs || []).map((c) => [c.id, c]));
  const draw = () => { const L = I.teams.filter((t) => !t.ov && (st.h || !t.h) && (!st.d || t.d === st.d)).sort((a, b) => (b.last ?? b.y1) - (a.last ?? a.y1) || (b.nr || 0) - (a.nr || 0) || a.n.localeCompare(b.n));
    if (!st.club) { const M = L.filter((t) => !st.q || t.n.toLowerCase().includes(st.q));
      cnt.textContent = `${M.length} UK teams (${M.filter((t) => !t.h).length} with rosters, ${M.filter((t) => t.h).length} with results only). Overseas clubs that play UK events (e.g. Irish teams) are left out; their results stay on the event pages.`;
      list.replaceChildren(teamTable(M)); return; }
    const by = d3.group(L, (t) => t.c || 't:' + t.id);
    const G = [...by].map(([cid, ts]) => ({ c: clubsById.get(cid), ts })).filter((g) => !st.q || (g.c && g.c.n.toLowerCase().includes(st.q)) || g.ts.some((t) => t.n.toLowerCase().includes(st.q)))
      .sort((a, b) => (b.c ? b.c.p : 0) - (a.c ? a.c.p : 0) || d3.max(b.ts, (t) => t.last ?? t.y1) - d3.max(a.ts, (t) => t.last ?? t.y1) || (a.c ? a.c.n : a.ts[0].n).localeCompare(b.c ? b.c.n : b.ts[0].n));
    cnt.textContent = `${G.length} clubs, ${L.length} teams. Clubs are grouped by name only (Reading Ultimate holds Reading Open, Reading Ultimate 2, Reading Masters…); open one to see its teams, or go to the club view for the tree, players and results. Overseas clubs are left out.`;
    list.replaceChildren(h('div', { class: 'clublist' }, G.map(({ c, ts }) => {
      if (!c || (c.s <= 1 && ts.length === 1)) { const t = ts[0]; return h('a', { class: 'clubrow single', href: '#/t/' + enc(t.id) }, badge(t, 22), h('span', { class: 'cn' }, t.n), h('span', { class: 'cm' }, t.d + ' · ' + yrs(t) + (t.p ? ' · ' + t.p + ' players' : ''))); }
      const d = h('details', { class: 'clubrow' }, h('summary', null, badge(ts.find((t) => t.lg) || { n: c.n }, 22), h('span', { class: 'cn' }, c.n), h('span', { class: 'cm' }, `${c.s} teams · ${c.f.join(', ').toLowerCase()} · ${c.y0}–${c.y1} · ${c.p} players`),
        c.chk ? h('span', { class: 'cm warn', title: 'A name link Max still needs to confirm' }, ' · to check') : null, h('a', { class: 'btn', href: '#/c/' + enc(c.id), onclick: (e) => e.stopPropagation() }, 'Club view →')), teamTable(ts));
      if (st.q && !c.n.toLowerCase().includes(st.q)) d.open = true; return d; }))); };
  draw();
  return [h('h1', null, 'Teams'), h('p', { class: 'sub' }, 'Clubs and the teams under them. Pick a team for its honours, results, roster changes and who played when; pick a club view for everything under that banner.'),
    card(null, null, h('div', { class: 'controls' }, h('input', { type: 'search', placeholder: 'Filter clubs or teams', oninput: (e) => { st.q = e.target.value.trim().toLowerCase(); draw(); } }),
      h('select', { onchange: (e) => { st.d = e.target.value; draw(); } }, ['', ...divs].map((d) => h('option', { value: d }, d || 'All divisions'))),
      h('div', { class: 'seg' }, ...[['Grouped by club', true], ['All teams', false]].map(([l, v]) => h('button', { class: v === st.club ? 'on' : null, onclick: (e) => { st.club = v; e.target.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.target)); draw(); } }, l))),
      h('label', { class: 'note' }, h('input', { type: 'checkbox', checked: true, onchange: (e) => { st.h = e.target.checked; draw(); } }), ' include teams we only have results for')), cnt, list)];
};

function honours(results, o = {}) {
  const ev = results.filter((r) => r.place);
  if (!ev.length) return h('p', { class: 'note' }, 'No placings recorded.');
  const kinds = [...new Set(ev.map((r) => r.kind))].sort((a, b) => (KORDER.indexOf(a) + 1 || 99) - (KORDER.indexOf(b) + 1 || 99));
  const years = [...new Set(ev.map((r) => r.year))].sort((a, b) => a - b);
  const rows = kinds.map((k) => { const es = ev.filter((r) => r.kind === k); const cells = {};
    years.forEach((y) => { const ye = es.filter((r) => r.year === y).sort((a, b) => a.place - b.place); if (ye.length) cells[y] = { place: ye[0].place, n: ye.length, tip: [k + ' ' + y, ...ye.map((r) => `${r.event}: ${ord(r.place)}${r.field ? ' of ' + r.field : ''}`)], go: o.compGo ? '#/e/' + enc(o.compGo(k)) : null }; });
    return { label: k, cells, sum: [es.filter((r) => r.place === 1).length, es.filter((r) => r.place <= 3).length, new Set(es.map((r) => r.year)).size] }; });
  return medalGrid(rows, years, { sumW: 170, sumHead: ['Titles', 'Podiums', 'Seasons'], labW: 180 });
}

// ---------- squad flow: a team's seasons as columns, each bar stacked by intake year, bands carrying each intake on ----------
// rows: [{k, n, ys:[seasons on the roster], ev:{year: events}}]; players missing a season and coming back run underneath; leavers end in grey-to-black blocks
function squadFlow(rows, seasons, o = {}) {
  const I = o.index; const pInfo = new Map((I ? I.players : []).map((p) => [p.k, p]));
  const PAL = ['#2b56a8', '#e07b24', '#2a9d6a', '#8e5bb5', '#c2417a', '#1c9aa8', '#b8860b', '#6b7f2a', '#a0522d', '#5f6fd0'];
  const intakes = [...new Set(rows.map((r) => r.ys[0]))].sort(); const ICOL = Object.fromEntries(intakes.map((y, i) => [y, PAL[i % PAL.length]]));
  const ilab = (y) => y === seasons[0] ? `${y} roster` : `${y} intake`;
  const last = seasons[seasons.length - 1];
  const grp = (f) => { const m = new Map(); rows.forEach((r) => f(r).forEach((key) => { if (!m.has(key.id)) m.set(key.id, Object.assign(key, { ps: [] })); m.get(key.id).ps.push(r); })); return [...m.values()]; };
  const SI = Object.fromEntries(seasons.map((y, i) => [y, i]));   // gaps are by column, so 2016 → 2019 with nothing between isn't a gap
  const links = grp((r) => r.ys.slice(1).map((b, j) => ({ id: r.ys[0] + '|' + r.ys[j] + '|' + b, e: r.ys[0], a: r.ys[j], b, gap: SI[b] - SI[r.ys[j]] > 1 })));
  const stops = grp((r) => { const l = r.ys[r.ys.length - 1]; return l === last ? [] : [{ id: r.ys[0] + '|' + l, e: r.ys[0], s: l }]; });
  const tot = Object.fromEntries(seasons.map((s) => [s, rows.filter((r) => r.ys.includes(s)).length]));
  const W = 1000, nw = 16, colH = 260, k = colH / (d3.max(Object.values(tot)) || 1), top = 40, SW = 18;
  const X = (i) => 50 + i * ((W - 150 - nw) / Math.max(1, seasons.length - 1));
  const node = Object.fromEntries(seasons.map((s, i) => [s, { x: X(i), y: top + (colH - tot[s] * k) / 2 }]));
  links.forEach((l) => { l.t = l.ps.length * k; }); stops.forEach((t) => { t.t = t.ps.length * k; });
  const segs = [];
  seasons.forEach((s) => { let y = node[s].y;
    intakes.forEach((e) => { const ps = rows.filter((r) => r.ys[0] === e && r.ys.includes(s)); if (!ps.length) return;
      segs.push({ s, e, ps, x: node[s].x, y, h: ps.length * k });
      let yi = y; links.filter((l) => l.b === s && l.e === e).sort((p, q) => p.gap - q.gap || q.a - p.a).forEach((l) => { l.y1 = yi; yi += l.t; });
      let yo = y; links.filter((l) => l.a === s && l.e === e).sort((p, q) => p.gap - q.gap || p.b - q.b).forEach((l) => { l.y0 = yo; yo += l.t; });
      stops.filter((t) => t.s === s && t.e === e).forEach((t) => { t.y = yo; yo += t.t; });
      y += ps.length * k; }); });
  const curve = d3.line().curve(d3.curveBumpX);
  const lane = top + colH + 24;
  // players who skip a season: a short stub out of the season they left and a short stub into the season they came back, not a long loop
  links.forEach((l) => { const xa = node[l.a].x + nw, xb = node[l.b].x, ya = l.y0 + l.t / 2, yb = l.y1 + l.t / 2;
    l.d = l.gap ? curve([[xa, ya], [xa + 26, ya + 22]]) + curve([[xb - 26, yb + 22], [xb, yb]]) : curve([[xa, ya], [xb, yb]]); });
  const { box, svg } = svgBox(W, lane + 14);
  const gid = 'sfgrad' + Math.random().toString(36).slice(2, 7);
  const gr = svg.append('defs').append('linearGradient').attr('id', gid); gr.append('stop').attr('offset', 0).attr('stop-color', '#9aa0a6'); gr.append('stop').attr('offset', 1).attr('stop-color', '#111');
  seasons.forEach((s) => { svg.append('text').attr('x', node[s].x + nw / 2).attr('y', 16).attr('text-anchor', 'middle').style('font-weight', 600).style('fill', css('--fg')).text(s);
    svg.append('text').attr('x', node[s].x + nw / 2).attr('y', 30).attr('text-anchor', 'middle').style('fill', css('--muted')).style('font-size', '11px').text(tot[s] + ' players'); });
  if (links.some((l) => l.gap)) svg.append('text').attr('x', 4).attr('y', top + colH + 18).style('fill', css('--muted')).style('font-size', '11px').text('Short dashed stubs: players who missed a season and came back (out where they left, in where they returned)');
  const nm = (rs) => rs.map((r) => r.n);
  const drill = (ev, title, note, rs) => showDrill(anchorOf(ev), { title, note, sum: [['Players', rs.length]], head: ['Player', 'Seasons here', 'Joined', 'Events per season', 'Latest club'], num: [],
    rows: rs.slice().sort((a, b) => b.ys.length - a.ys.length || a.n.localeCompare(b.n)).map((r) => { const e = pInfo.get(r.k) || {};
      return { cells: [playerLink(r.k, r.n), r.ys.join(', '), r.ys[0] === seasons[0] ? `${seasons[0]} or earlier` : r.ys[0], r.ys.map((y) => `${y}: ${(r.ev || {})[y] ?? '—'}`).join(' · '), e.y ? `${e.t || '—'} (${e.y})` : '—'], sv: [r.n, r.ys.length, r.ys[0]] }; }) });
  const gT = svg.append('g'), gL = svg.append('g'), gN = svg.append('g'), gX = svg.append('g');
  const st = gT.selectAll('rect').data(stops).join('rect').attr('x', (t) => node[t.s].x + nw).attr('y', (t) => t.y).attr('width', SW).attr('height', (t) => Math.max(1, t.t)).attr('fill', `url(#${gid})`).style('cursor', 'pointer')
    .on('click', (ev, t) => drill(ev, `Left after ${t.s} (${ilab(t.e)})`, `Players whose last season on this roster was ${t.s}.`, t.ps));
  onTip(st, (t) => [`${t.ps.length} left after ${t.s}`, ilab(t.e), ...(t.ps.length <= 6 ? nm(t.ps) : []), CLICK]);
  seasons.forEach((s) => { const ts = stops.filter((t) => t.s === s); if (!ts.length) return; const n = d3.sum(ts, (t) => t.ps.length), y0 = d3.min(ts, (t) => t.y), y1 = d3.max(ts, (t) => t.y + t.t);
    gX.append('text').attr('x', node[s].x + nw + SW + 5).attr('y', (y0 + y1) / 2 + 4).style('fill', css('--fg')).style('font-size', '11px').style('font-weight', 600).style('paint-order', 'stroke').style('stroke', css('--panel')).style('stroke-width', '4px').style('stroke-linejoin', 'round').text(`${n} left`); });
  const fl = gL.selectAll('path').data(links).join('path').attr('d', (l) => l.d).attr('fill', 'none').attr('stroke', (l) => ICOL[l.e]).attr('stroke-width', (l) => Math.max(1.5, l.t)).attr('stroke-opacity', (l) => l.gap ? 0.75 : 0.5).attr('stroke-dasharray', (l) => l.gap ? '3 2' : null).attr('stroke-linecap', 'butt').style('cursor', 'pointer')
    .on('click', (ev, l) => drill(ev, `${l.a} → ${l.b} (${ilab(l.e)})`, l.gap ? `On the roster in ${l.a}, not in ${seasons.slice(SI[l.a] + 1, SI[l.b]).join(', ')}, back in ${l.b}.` : `On the roster in ${l.a} and back in ${l.b}.`, l.ps));
  onTip(fl, (l) => [`${l.a} → ${l.b}${l.gap ? ' (missed a season)' : ''}`, `${l.ps.length} from the ${ilab(l.e)}`, ...(l.ps.length <= 6 ? nm(l.ps) : []), CLICK]);
  const sg = gN.selectAll('rect').data(segs).join('rect').attr('x', (g) => g.x).attr('y', (g) => g.y).attr('width', nw).attr('height', (g) => Math.max(1, g.h)).attr('fill', (g) => ICOL[g.e]).attr('stroke', css('--panel')).attr('stroke-width', 0.6).style('cursor', 'pointer')
    .on('click', (ev, g) => drill(ev, `${g.s} roster: ${ilab(g.e)}`, g.e === g.s && g.s !== seasons[0] ? `New to the roster in ${g.s}.` : `Players from the ${ilab(g.e)} still here in ${g.s}.`, g.ps));
  onTip(sg, (g) => [`${g.s}: ${g.ps.length} from the ${ilab(g.e)}`, g.e === g.s && g.s !== seasons[0] ? 'new this season' : '', CLICK].filter(Boolean));
  box.append(legend(intakes.map((y) => [y === seasons[0] ? `${y} roster (incl. earlier)` : `Joined ${y}`, ICOL[y]]).concat([['Left the roster', '#444']])));
  return box;
}
// EUCS ranking as a reference: the European Ultimate Federation's own game-by-game rating (ranking.ultimatefederation.eu). Not used in our scores.
function eucsCard(L, all, team, division) {
  const C = COL(), last = L[L.length - 1], best = L.filter((r) => r.rank).sort((a, b) => a.rank - b.rank)[0];
  const others = d3.groups((all || []).filter((r) => r.division === division && r.team !== team && r.rank), (r) => r.team);
  const mx = Math.max(10, d3.max([...L, ...(all || []).filter((r) => r.division === division)], (r) => r.rank || 0) || 10);
  const series = others.map(([t, v]) => ({ name: t, color: css('--axis'), w: 1, pts: v.sort((a, b) => a.season - b.season).map((r) => ({ x: r.season, y: r.rank, r: 2.5, tip: [t + ' · ' + r.season, `${ord(r.rank)} of ${r.of} in Europe`] })) }))
    .concat([{ name: team, color: C[0], w: 3, pts: L.filter((r) => r.rank).map((r) => ({ x: r.season, y: r.rank, r: 6, tip: [team + ' · ' + r.season, `${ord(r.rank)} of ${r.of} in Europe`, `rating ${d3.format('.0f')(r.rating)} · record ${r.record} · ${r.tournaments} tournaments`] })) }]);
  return card('EUCS ranking (reference)', `Where ${team} sits in the EUF’s European ranking each season (higher = better), against the other UK ${division} teams in grey. For reference only: not used in our scores. The latest season can be a mid-season ranking.`,
    tiles([['Latest', last && last.rank ? ord(last.rank) : '—', last ? `of ${last.of} in Europe, ${last.season}` : ''], ['Best', best ? ord(best.rank) : '—', best ? String(best.season) : ''], ['Rating', last && last.rating != null ? d3.format('.0f')(last.rating) : '—', last ? 'record ' + last.record : ''],
      ['Among UK teams', last && last.rank ? ord(1 + (all || []).filter((r) => r.division === division && r.season === last.season && r.rank && r.rank < last.rank && r.team !== team).length) : '—', last ? `UK ${division}, ${last.season}` : '']]),
    lineChart(series, { W: 1000, H: 240, yDomain: [mx, 1], yFmt: (v) => Number.isInteger(v) ? ord(v) : '', xs: [...new Set((all || []).concat(L).map((r) => r.season))].sort(), legend: false }),
    h('p', { class: 'note' }, h('a', { href: 'https://ranking.ultimatefederation.eu/', target: '_blank', rel: 'noopener' }, 'Open the EUCS ranking ↗')));
}
function ratingCard(t, TS) {
  const C = COL(), L = (t.rating || []).filter((r) => r.comparable), last = L[L.length - 1], best = L.slice().sort((a, b) => a.uk_rank - b.uk_rank)[0];
  const ev = (r) => [r.games ? `${r.games} scored games` : '', r.implied ? `${r.implied} placing comparisons` : ''].filter(Boolean).join(' + ');
  return card('Team strength from results', `A UK-only rating built from game scores where we have them (EUCS games 2024+, WUCC) and from finishing orders where we don’t (UKU Nationals, Tours, Regionals, EUCF). 1000 = an average UK ${t.division} team that season; the dashed lines show the uncertainty, which is wider when there are only placings. Not yet used in player scores.`,
    tiles([['Latest', last ? d3.format('.0f')(last.rating) : '—', last ? `${last.season}: ${ord(last.uk_rank)} of ${last.uk_n} UK ${t.division} teams` : ''], ['Best season', best ? `${ord(best.uk_rank)} in ${best.season}` : '—', best ? 'rating ' + d3.format('.0f')(best.rating) : ''], ['Evidence', last ? ev(last) || '—' : '—', 'latest season']]),
    lineChart([...Object.entries(TS || {}).filter(([k]) => k.startsWith(t.division + '|') && k !== t.division + '|' + t.team && d3.max(k && TS[k], (p) => p[1]) > 1100).map(([k, v]) => ({ name: k.split('|')[1], color: css('--grid'), w: 1, pts: v.filter((p) => L.some((r) => r.season === p[0])).map(([y, r]) => ({ x: y, y: r, r: 0, tip: [k.split('|')[1] + ' · ' + y, 'rating ' + r] })) })), { name: 'Low', color: css('--axis'), dash: '3 3', w: 1, pts: L.map((r) => ({ x: r.season, y: r.low, r: 0 })) }, { name: 'High', color: css('--axis'), dash: '3 3', w: 1, pts: L.map((r) => ({ x: r.season, y: r.high, r: 0 })) },
      { name: t.team, color: C[0], w: 2.5, pts: L.map((r) => ({ x: r.season, y: r.rating, r: r.games ? 5 : 3.5, tip: [`${t.team} · ${r.season}`, `rating ${d3.format('.0f')(r.rating)} (${d3.format('.0f')(r.low)}–${d3.format('.0f')(r.high)})`, `${ord(r.uk_rank)} of ${r.uk_n} UK ${t.division} teams`, ev(r)] })) }], { W: 1000, H: 260, legend: false, xs: L.map((r) => r.season), yDomain: [Math.min(d3.min(L, (r) => r.low) - 40, 850), Math.max(d3.max(L, (r) => r.high) + 40, 1300)] }),
    h('p', { class: 'note' }, 'Grey lines: other strong UK ' + t.division + ' teams, for comparison.'),
    (t.rating || []).some((r) => !r.comparable) ? h('p', { class: 'note' }, `Not rated in ${(t.rating || []).filter((r) => !r.comparable).map((r) => r.season).join(', ')}: that season’s results only link this team to teams with no scored games, so its rating couldn’t be compared with the rest of the UK.`) : null);
}
const teamDrill = (ev, title, L, t) => showDrill(anchorOf(ev), { title, head: ['Player', 'Seasons here', 'First', 'Last'], num: [1, 2, 3], rows: L.map((r) => ({ cells: [playerLink(r.k, r.n), r.ys.length, r.ys[0], r.ys[r.ys.length - 1]], sv: [r.n, r.ys.length, r.ys[0], r.ys[r.ys.length - 1]] })) });
// ---------- clubs (display only: Quality and team ratings never use these groupings) ----------
const FMT_COL = (f) => f === 'Beach' ? css('--c5') : f === 'Indoor' ? css('--c6') : css('--c2');
const sideGroup = (s) => s.yo ? 'Youth' : /aster/.test(s.d + ' ' + s.n) ? 'Masters' : ['Open', 'Mixed', 'Women'].includes(s.d) ? s.d : 'Other';
const sideLabel = (s) => s.lab || s.n + (s.f !== 'Grass' ? ` (${s.f.toLowerCase()})` : '') + (/aster/.test(s.d) && !/aster/.test(s.n) ? ` (${s.d})` : '');
async function clubOfTeam(teamName) { const I = await index(); const t = I.teams.find((x) => x.n === teamName && x.c); return t ? (I.clubs || []).find((c) => c.id === t.c) : null; }
function clubTree(c) {
  const fm = ['Grass', 'Beach', 'Indoor'].filter((f) => c.sides.some((s) => s.f === f));
  const root = { name: c.n, kind: 'club', children: fm.map((f) => ({ name: f, kind: 'fmt', f, children: ['Open', 'Mixed', 'Women', 'Masters', 'Youth', 'Other'].filter((g) => c.sides.some((s) => s.f === f && sideGroup(s) === g)).map((g) => ({ name: g, kind: 'grp', f,
    children: c.sides.map((s, i) => ({ s, i })).filter(({ s }) => s.f === f && sideGroup(s) === g).map(({ s, i }) => ({ name: sideLabel(s).replace(/ \((beach|indoor)\)$/, ''), kind: 'side', s, i })) })) })) };
  const H = d3.hierarchy(root); const leaves = H.leaves().length; const rowH = 22, W = 1000, Hh = Math.max(120, leaves * rowH + 20);
  d3.tree().size([Hh - 20, W - 420])(H);
  const { box, svg } = svgBox(W, Hh); const g = svg.append('g').attr('transform', 'translate(110,10)');
  g.selectAll('path').data(H.links()).join('path').attr('fill', 'none').attr('stroke', css('--axis')).attr('stroke-width', 1.2)
    .attr('d', d3.linkHorizontal().x((d) => d.y).y((d) => d.x));
  const n = g.selectAll('g.n').data(H.descendants()).join('g').attr('transform', (d) => `translate(${d.y},${d.x})`);
  n.append('circle').attr('r', (d) => d.data.kind === 'club' ? 7 : d.data.kind === 'side' ? 4.5 : 5.5).attr('fill', (d) => d.data.kind === 'club' ? css('--fg') : FMT_COL(d.data.f || (d.data.s && d.data.s.f)))
    .attr('stroke', (d) => d.data.s && d.data.s.chk ? css('--c3') : 'none').attr('stroke-width', 2);
  n.append('text').attr('x', (d) => d.children ? -10 : 9).attr('y', 4).attr('text-anchor', (d) => d.children ? 'end' : 'start')
    .style('font-weight', (d) => d.data.kind === 'side' ? 400 : 700).style('fill', (d) => d.data.kind === 'side' && d.data.s.id ? css('--c0') : css('--fg'))
    .style('cursor', (d) => d.data.kind === 'side' && d.data.s.id ? 'pointer' : null)
    .text((d) => d.data.kind === 'side' ? `${d.data.name}  ·  ${d.data.s.y0 === d.data.s.y1 ? d.data.s.y0 : d.data.s.y0 + '–' + d.data.s.y1}` + (d.data.s.chk ? '  (name link to check)' : '') : d.data.name)
    .on('click', (ev, d) => { if (d.data.kind === 'side' && d.data.s.id) location.hash = '#/t/' + enc(d.data.s.id); });
  n.filter((d) => d.data.kind === 'side').each(function (d) { onTip(d3.select(this), () => [sideLabel(d.data.s), `${d.data.s.d} · ${d.data.s.f} · seasons ${d.data.s.ys.join(', ')}`, ...(d.data.s.id ? ['Click for the team page'] : ['No team page (squad lists only)'])]); });
  box.append(legend([['Grass', FMT_COL('Grass'), 'dot'], ['Beach', FMT_COL('Beach'), 'dot'], ['Indoor', FMT_COL('Indoor'), 'dot']]));
  return box;
}
const relLine = (lab, rel) => h('p', { class: 'note' }, lab, ...rel.flatMap(([rid, rn], j) => [j ? ', ' : '', h('a', { href: '#/c/' + enc(rid) }, rn)]), ' — ', [...new Set(rel.map((r) => (r[2] || '').replace(/ \(Max, [^)]*\)$/, '')).filter(Boolean))].join('; '));
// Club page: players flowing between the club's teams season to season (each player counted once per season, on their highest team)
function clubTeamFlow(c, P, seasons, S, showBox) {
  const PAL = ['#2b56a8', '#e07b24', '#2a9d6a', '#8e5bb5', '#c2417a', '#1c9aa8', '#b8860b', '#6b7f2a', '#a0522d', '#5f6fd0'];
  const prim = (p, y) => { const ss = (p.ys[y] || []).filter((i) => S[i].f === 'Grass'); return (p.pk || []).includes(+y) || !ss.length ? null : Math.min(...ss); };
  const used = [...new Set(seasons.flatMap((y) => P.map((p) => prim(p, y)).filter((v) => v != null)))].sort((a, b) => a - b);
  const COL = Object.fromEntries(used.map((i, j) => [i, PAL[j % PAL.length]]));
  const W = 1000, nw = 14, colH = 300, top = 34, gap = 10, stub = 46;
  const X = (j) => 60 + j * ((W - 140 - nw) / Math.max(1, seasons.length - 1));
  const cols = seasons.map((y) => { const ns = used.map((i) => ({ i, y, ps: P.filter((p) => prim(p, y) === i) })).filter((n) => n.ps.length); return { y, ns, tot: d3.sum(ns, (n) => n.ps.length) }; });
  const k = (colH - gap * (d3.max(cols, (c0) => c0.ns.length) - 1)) / (d3.max(cols, (c0) => c0.tot) || 1);
  cols.forEach((col, j) => { let yy = top; col.ns.forEach((n) => { n.x = X(j); n.y = yy; n.h = n.ps.length * k; n.oy = yy; n.iy = yy; yy += n.h + gap; }); });
  const H = top + colH + 60;
  const { box, svg } = svgBox(W, H);
  const band = (x0, a0, a1, x1, b0, b1) => { const m = (x0 + x1) / 2; return `M${x0},${a0}C${m},${a0} ${m},${b0} ${x1},${b0}L${x1},${b1}C${m},${b1} ${m},${a1} ${x0},${a1}Z`; };
  const show = (title, ps) => showBox.replaceChildren(h('p', null, h('b', null, title + ` (${ps.length})`), ': ', ...ps.sort((a, b) => a.n.localeCompare(b.n)).flatMap((p, j) => [j ? ', ' : '', playerLink(p.k, p.n)])));
  cols.forEach((col, j) => {
    svg.append('text').attr('x', X(j) + nw / 2).attr('y', 14).attr('text-anchor', 'middle').style('font-weight', 700).text(col.y);
    svg.append('text').attr('x', X(j) + nw / 2).attr('y', 27).attr('text-anchor', 'middle').style('fill', css('--muted')).style('font-size', '11px').text(col.tot + ' players');
    const nxt = cols[j + 1], prv = cols[j - 1];
    col.ns.forEach((n) => {
      // outgoing: to each team next season, then a grey stub for players who left the club
      if (nxt) { nxt.ns.forEach((m) => { const ps = n.ps.filter((p) => prim(p, nxt.y) === m.i); if (!ps.length) return; const t = ps.length * k;
          const path = svg.append('path').attr('d', band(n.x + nw, n.oy, n.oy + t, m.x, m.iy, m.iy + t)).attr('fill', COL[n.i]).attr('opacity', n.i === m.i ? 0.32 : 0.62).style('cursor', 'pointer')
            .on('click', () => show(`${sideLabel(S[n.i])} ${col.y} → ${sideLabel(S[m.i])} ${nxt.y}`, ps));
          onTip(path, () => [`${sideLabel(S[n.i])} ${col.y} → ${sideLabel(S[m.i])} ${nxt.y}`, `${ps.length} player${ps.length === 1 ? '' : 's'}${n.i === m.i ? ' stayed on the team' : ' moved team inside the club'}`, CLICK]);
          n.oy += t; m.iy += t; });
        const gone = n.ps.filter((p) => prim(p, nxt.y) == null); if (gone.length) { const t = gone.length * k;
          const g = svg.append('path').attr('d', band(n.x + nw, n.oy, n.oy + t, n.x + nw + stub, n.oy + 6, n.oy + 6 + t)).attr('fill', '#555').attr('opacity', 0.45).style('cursor', 'pointer').on('click', () => show(`${sideLabel(S[n.i])} ${col.y}: not with the club in ${nxt.y}`, gone));
          onTip(g, () => [`${sideLabel(S[n.i])} ${col.y}`, `${gone.length} not on any of the club's teams in ${nxt.y} (left, took a season out, or only picked up)`, CLICK]); n.oy += t; } }
      if (prv) { const fresh = n.ps.filter((p) => prim(p, prv.y) == null); if (fresh.length) { const t = fresh.length * k; const y0 = n.y + n.h - t;
          const g = svg.append('path').attr('d', band(n.x - stub, y0 - 6, y0 - 6 + t, n.x, y0, y0 + t)).attr('fill', COL[n.i]).attr('opacity', 0.25).style('cursor', 'pointer').on('click', () => show(`New to ${sideLabel(S[n.i])} from outside the club in ${col.y}`, fresh));
          onTip(g, () => [`${sideLabel(S[n.i])} ${col.y}`, `${fresh.length} new to the club (or back after a gap)`, CLICK]); } }
      const r = svg.append('rect').attr('x', n.x).attr('y', n.y).attr('width', nw).attr('height', Math.max(1, n.h)).attr('fill', COL[n.i]).style('cursor', S[n.i].id ? 'pointer' : null).on('click', () => { if (S[n.i].id) location.hash = '#/t/' + enc(S[n.i].id); });
      onTip(r, () => [sideLabel(S[n.i]) + ' · ' + col.y, `${n.ps.length} players`, S[n.i].id ? 'Click for the team page and its own squad flow' : '']);
      if (n.h >= 11) svg.append('text').attr('x', j === cols.length - 1 ? n.x + nw + 4 : n.x - 4).attr('y', n.y + n.h / 2 + 4).attr('text-anchor', j === cols.length - 1 ? 'start' : 'end').style('font-size', '10px').style('fill', css('--muted')).text(n.ps.length);
    }); });
  box.append(legend([...used.map((i) => [sideLabel(S[i]), COL[i]]), ['Not with the club next season', '#555']]));
  return box;
}
ROUTES.c = async (id) => {
  const I = await index(); const ix = (I.clubs || []).find((x) => x.id === id); if (!ix) throw new Error('Club not found');
  const c = (await getJSON('c/' + String(ix.b).padStart(2, '0') + '.json'))[id]; await mpMap(); const C = COL();
  const S = c.sides, P = MP ? c.players.filter((p) => mpPass(p.k)) : c.players;
  const _nc = d3.rollup(S, (v) => v.length, (s) => s.n + '|' + s.f);
  S.forEach((s) => { s.lab = s.n + (s.f !== 'Grass' ? ` (${s.f.toLowerCase()})` : '') + ((_nc.get(s.n + '|' + s.f) > 1 || (/aster/.test(s.d) && !/aster/.test(s.n))) ? ` (${s.d})` : ''); });
  const years = Object.keys(c.seasons).map(Number).sort((a, b) => a - b);
  const out = [h('div', { class: 'teamhead' }, badge({ n: c.n, lg: (I.teams.find((t) => t.c === id && t.lg) || {}).lg }, 56), h('h1', null, c.n)), mpNote(),
    h('p', { class: 'sub' }, `Club · ${S.length} team${S.length === 1 ? '' : 's'} · ${ix.f.join(', ').toLowerCase()} · ${years[0]}–${years[years.length - 1]} · ${P.length} players in the data`),
    h('p', { class: 'note' }, 'A club is the banner over its teams: each team enters events on its own, and the team pages, Quality and team ratings stay exactly as they are. Teams are grouped by name only' + (c.check ? '; the ones marked with a red ring are a name link Max still needs to confirm.' : '.'))];
  if (c.rel) out.push(relLine('Related clubs: ', c.rel));
  if (c.check) out.push(h('p', { class: 'mpnote' }, 'To confirm: ' + c.check.join(', ') + ' grouped here (or kept apart) from the name alone.'));
  const pk = P.filter((p) => p.pk), last = years[years.length - 1], lastS = c.seasons[last] || {};
  out.push(tiles([['Teams', S.length, ix.f.join(' · ')], ['Players', P.length, `${P.filter((p) => Object.keys(p.ys).length >= 3).length} with 3+ seasons at the club`], ['Players ' + last, lastS.p ?? '—', lastS.pk ? `incl. ${lastS.pk} one-event pickup${lastS.pk === 1 ? '' : 's'}` : ''],
    ['Moves between its teams', c.inner.length, 'next season on a different grass team of the club'], ['Pickup player-seasons', d3.sum(P, (p) => (p.pk || []).length), 'one event for the club, their main club elsewhere']]));
  out.push(card('The club tree', 'Every team that has played under this club’s name, by format (grass, beach, indoor) and division. Click a team for its own page.', clubTree(c)));
  // season grid: best placing per team each season; ring = the club's strongest grass team that season (team level)
  const rows = S.map((s, i) => { const cells = {};
    s.ys.forEach((y) => { const rs = c.results.filter((r) => r.s === i && r.y === y); const best = rs.filter((r) => r.p).sort((a, b) => a.p - b.p)[0]; const top = (c.seasons[y] || {}).top === i;
      cells[y] = { place: best ? best.p : null, sel: top, go: s.id ? '#/t/' + enc(s.id) : null, tip: [sideLabel(s) + ' · ' + y, ...(rs.length ? rs.map((r) => `${r.e}: ${r.p ? ord(r.p) : 'played'}${r.fl ? ' of ' + r.fl : ''}`) : ['On a roster, no placing in the data']), ...(top ? ['Strongest team in the club this season (team level ' + c.seasons[y].lv[i] + ')'] : [])] }; });
    return { label: sideLabel(s).length > 30 ? sideLabel(s).slice(0, 29) + '…' : sideLabel(s), go: s.id ? '#/t/' + enc(s.id) : null, cells }; });
  out.push(card('Every team, season by season', 'Best finish each season (hover for every event). The ringed circle is the club’s strongest grass team that season by team level. A dot means the team was on a roster but has no placing in the data.', medalGrid(rows, years, { W: 1000, labW: 230 })));
  // players
  const st = { y: '', s: '', pk: false, q: '' }, box = h('div'), cnt = h('p', { class: 'note' });
  const ys = (p) => Object.keys(p.ys).map(Number);
  const draw = () => { let L = P.filter((p) => (!st.y || p.ys[st.y]) && (st.s === '' || Object.entries(p.ys).some(([y, ss]) => (!st.y || y === st.y) && ss.includes(+st.s))) && (!st.pk || (p.pk || []).some((y) => !st.y || String(y) === st.y)) && (!st.q || p.n.toLowerCase().includes(st.q)));
    cnt.textContent = `${L.length} players` + (st.y ? ` in ${st.y}` : '') + '. “Pickup” = one event for this club that season, not on its published squad or kit list, with their main club elsewhere that season or on a composite side (e.g. Deep Space & Friends). Seasons before 2022 come from European/world-event squad lists and club lists (e.g. Reading kit numbers), so they’re patchier.';
    box.replaceChildren(table(['Player', 'Seasons', 'Years', st.y ? 'Team(s) ' + st.y : 'Teams played for', 'Pickup'], L.map((p) => { const yy = ys(p); const tset = st.y ? p.ys[st.y] : [...new Set(Object.values(p.ys).flat())];
      return { go: '#/p/' + enc(p.k), cells: [p.n, yy.length, yy.length ? (yy[0] === yy[yy.length - 1] ? yy[0] : yy[0] + '–' + yy[yy.length - 1]) : '—', tset.map((i) => sideLabel(S[i])).join(', ') || '—', (p.pk || []).filter((y) => !st.y || String(y) === st.y).join(', ') || ''] }; }), { num: [1], max: '34rem' })); };
  draw();
  out.push(card('Players', 'Everyone who has played for any of the club’s teams. Filter by season or team; tick “pickups only” for players who joined for a single event.',
    h('div', { class: 'controls' }, h('input', { type: 'search', placeholder: 'Filter players', oninput: (e) => { st.q = e.target.value.trim().toLowerCase(); draw(); } }),
      h('select', { onchange: (e) => { st.y = e.target.value; draw(); } }, ['', ...years.slice().reverse().map(String)].map((y) => h('option', { value: y }, y || 'All seasons'))),
      h('select', { onchange: (e) => { st.s = e.target.value; draw(); } }, [h('option', { value: '' }, 'All teams'), ...S.map((s, i) => h('option', { value: i }, sideLabel(s)))]),
      h('label', { class: 'note' }, h('input', { type: 'checkbox', onchange: (e) => { st.pk = e.target.checked; draw(); } }), ' pickups only')), cnt, box));
  // movement inside the club
  if (c.inner.length) {
    const pn = new Map(P.map((p) => [p.k, p.n]));
    const pairs = d3.rollups(c.inner.filter((m) => pn.has(m[0])), (v) => v, (m) => m[2].map((i) => sideLabel(S[i])).join(' + ') + ' → ' + m[3].map((i) => sideLabel(S[i])).join(' + ')).sort((a, b) => b[1].length - a[1].length);
    out.push(card('Moving between the club’s teams', 'Players whose grass team changed from one season to the next while staying in the club (for example from the second team to the first). These are not counted as leaving the club anywhere on the site.',
      table(['Move', 'Players', 'Who (season of the move)'], pairs.map(([k, v]) => ({ cells: [k, v.length, h('span', null, ...v.flatMap((m, j) => [j ? ', ' : '', playerLink(m[0], pn.get(m[0])), ' ' + m[1]]))] })), { num: [1], max: '26rem' })));
  }
  // club retention: who stays at the club (any of its teams) from season to season, and the squad flow at club level
  { const core = P.map((p) => ({ k: p.k, n: p.n, ys: Object.keys(p.ys).map(Number).filter((y) => !(p.pk || []).includes(y)).sort((a, b) => a - b) })).filter((r) => r.ys.length);
    const seen = years.filter((y) => core.some((r) => r.ys.includes(y)));
    if (seen.length >= 2) {
      const pairs = seen.slice(1).map((y, i) => { const a = seen[i], on = core.filter((r) => r.ys.includes(a)), back = on.filter((r) => r.ys.includes(y));
        const same = on.filter((r) => { const pa = P.find((q) => q.k === r.k); const A = new Set(pa.ys[a] || []); return (pa.ys[y] || []).some((ix) => A.has(ix)); });
        return { a, y, on: on.length, back: back.length, same: same.length }; });
      const IX = await index(), flowBox = h('div'), fromSel = h('select', { onchange: () => drawFlow() }, seen.slice(0, -1).map((y) => h('option', { value: y }, 'From ' + y)));
      let st0 = seen.length - 1; while (st0 > 0 && seen[st0] - seen[st0 - 1] <= 2 && seen.length - st0 < 8) st0--; fromSel.value = seen[st0];
      const drawFlow = () => { const yrs = seen.filter((y) => y >= +fromSel.value); flowBox.replaceChildren(squadFlow(core.map((r) => ({ ...r, ys: r.ys.filter((y) => yrs.includes(y)) })).filter((r) => r.ys.length), yrs, { index: IX })); };
      drawFlow();
      const FD = await getJSON('findings.json').catch(() => null); const lg = FD && FD.base && FD.base.retention ? FD.base.retention : null; const lastP = pairs[pairs.length - 1];
      if (lg && lastP) out.push(tiles([[`Back at the club, ${lastP.a} → ${lastP.y}`, pct(lastP.back / lastP.on), `${lastP.back} of ${lastP.on} players (any team of the club)`], ['Back on the same team', pct(lastP.same / lastP.on), 'stricter, team-level view'], ['League, all clubs', pct(lg.All), `club players from ${FD.base.lists_from} seen again anywhere`], ...['Open', 'Mixed', 'Women'].filter((d) => lg[d] != null && S.some((s) => s.d === d)).map((d) => [`League, ${d}`, pct(lg[d]), 'same season, that division'])]));
      out.push(card('Club retention: who stays at the club', 'Retention counted at club level: a player who moves from the second team to the first (or to the masters side) has stayed. The dashed line is the stricter team-level view (back on the same team). One-event pickups are left out. Seasons before 2022 come from European/world-event squads and any club lists we hold, so treat them as rough.',
        lineChart([{ name: 'Back at the club (any team)', color: C[0], w: 2.5, pts: pairs.map((d) => ({ x: d.y, y: d.on ? d.back / d.on : null, tip: [`${d.a} → ${d.y}`, `${d.back} of ${d.on} back at ${c.n}`] })) },
          { name: 'Back on the same team', color: C[7], w: 2, dash: '5 3', pts: pairs.map((d) => ({ x: d.y, y: d.on ? d.same / d.on : null, tip: [`${d.a} → ${d.y}`, `${d.same} of ${d.on} back on the same team`] })) }], { W: 1000, H: 240, yDomain: [0, 1], yFmt: d3.format('.0%'), legend: true })));
      { const gs = seen.filter((y) => P.some((p) => (p.ys[y] || []).some((i) => S[i].f === 'Grass'))); const nTeams = new Set(P.flatMap((p) => Object.values(p.ys).flat()).filter((i) => S[i].f === 'Grass')).size;
        if (gs.length >= 2 && nTeams >= 2) { const tfBox = h('div'), tfShow = h('div', { class: 'note' }, 'Click a band for the players.');
          const tfSel = h('select', { onchange: () => tfDraw() }, gs.slice(0, -1).map((y) => h('option', { value: y }, 'From ' + y)));
          tfSel.value = gs[Math.max(0, gs.length - 5)];
          const tfDraw = () => tfBox.replaceChildren(clubTeamFlow(c, P, gs.filter((y) => y >= +tfSel.value).map(String), S, tfShow)); tfDraw();
          out.push(card('Flow between the club’s teams', 'Each column is a season; each block is one of the club’s grass teams (each player counted once a season, on the first of the club’s teams they played for, in the order of the club tree). Bands show where that team’s players were the next season: same team (pale), another team in the club (bold), or not with the club (grey stub). Pale stubs coming in are players new to the club. Click a team block to open that team and its own squad flow.',
            h('div', { class: 'controls' }, tfSel), tfBox, tfShow)); } }
      out.push(card('Club squad flow', 'Everyone who played for any of the club’s teams each season, split by the year they first joined the club. Bands carry each intake into the next season, short dashed stubs are players who missed a season and came back, and the grey-to-black blocks are players who left the club. Click any part for the players.',
        h('div', { class: 'controls' }, fromSel, h('span', { class: 'note' }, ' starts at the most recent run of seasons without big gaps')), flowBox));
    } }
  // players per season by format
  const fm = ix.f; if (years.length > 1) out.push(card('Players each season', 'Distinct players on any of the club’s teams each season, split by format. Pickups included. Before 2022 the data only has squads at European/world events plus any club lists we’ve been given (Reading’s kit-number lists 2017–21), so early seasons are patchy.',
    barChart(years.map((y) => Object.assign({ x: y }, ...fm.map((f) => ({ [f]: P.filter((p) => (p.ys[y] || []).some((i) => S[i].f === f)).length })))), fm.map((f) => ({ key: f, name: f, color: FMT_COL(f) })), { W: 1000, H: 220 })));
  // results
  const rbox = h('div'), rst = { f: '' };
  const rdraw = () => rbox.replaceChildren(table(['Season', 'Event', 'Team', 'Division', 'Format', 'Finish'], c.results.filter((r) => !rst.f || r.f === rst.f).slice().reverse().map((r) => ({ go: r.s != null && S[r.s].id ? '#/t/' + enc(S[r.s].id) : null, cells: [r.y, r.e, r.t, r.d, r.f, r.p ? ord(r.p) + (r.fl ? ' / ' + r.fl : '') : '—'] })), { num: [0], max: '30rem' }));
  rdraw();
  out.push(card('All results', null, fm.length > 1 ? h('div', { class: 'controls' }, h('select', { onchange: (e) => { rst.f = e.target.value; rdraw(); } }, ['', ...fm].map((f) => h('option', { value: f }, f || 'All formats')))) : null, rbox));
  return out;
};
ROUTES.t = async (id) => {
  const ix0 = (await index()).teams.find((x) => x.id === id); if (!ix0) throw new Error('Team not found');
  const t0 = (await getJSON('t/' + String(ix0.b).padStart(2, '0') + '.json'))[id]; const C = COL(); await mpMap();
  const t = MP ? { ...t0, grid: (t0.grid || []).filter((g) => mpPass(g.k)) } : t0;
  const S = (t.seasons || []).slice().sort((a, b) => a.year - b.year), res = t.results || [];
  const majors = res.filter((r) => r.place === 1 && MAJOR.has(r.kind));
  const ret = S.filter((s) => s.retention != null);
  const slug = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const ix = (await index()).teams.find((x) => x.id === id) || { n: t.team };
  const I0 = await index(); const _club = ix0.c ? (I0.clubs || []).find((x) => x.id === ix0.c) : null; const _sibs = _club ? I0.teams.filter((x) => x.c === _club.id && x.id !== id) : [];
  const out = [h('div', { class: 'teamhead' }, badge(ix, 56), h('h1', null, t.team)), mpNote(), _club && _club.rel ? relLine('Related: ', _club.rel) : null, _club && _club.s > 1 ? h('p', { class: 'note' }, 'Part of ', h('a', { href: '#/c/' + enc(_club.id) }, h('b', null, _club.n + ' (club view →)')), _sibs.length ? ' · other teams: ' : '', ..._sibs.slice(0, 12).flatMap((x, i) => [i ? ', ' : '', h('a', { href: '#/t/' + enc(x.id) }, x.n + (x.d !== t.division ? ' (' + x.d + ')' : ''))]), _sibs.length > 12 ? ` and ${_sibs.length - 12} more` : '') : null, h('p', { class: 'sub' }, `${t.division} · ` + (t.history_only ? ((t.results || []).length ? `results ${t.first_year}–${t.last_year}` : `squad lists ${t.first_year}–${t.last_year}`) + ((t.grid || []).length ? ' (earlier seasons only)' : ' (no rosters in the data yet)') : `rosters ${t.first_year}–${t.last_year}, results from ${d3.min(res, (r) => r.year) ?? t.first_year}`)),
    tiles([['Seasons with rosters', t.history_only ? '—' : new Set((t.grid || []).flatMap((r) => Object.keys(r.cells))).size], ['Players used', MP ? (t.grid || []).length : t.players_used ?? '—', MP ? (MP === 'F' ? 'FMP' : 'MMP') + ' players on the rosters' : 'everyone who played at least once'], ['Average retention', ret.length ? pct(d3.mean(ret, (s) => s.retention)) : '—', 'of last season’s core roster back'],
      ['Major titles', majors.length, majors.length ? d3.rollups(majors, (v) => v.length, (r) => r.kind).map(([k, n]) => n + '× ' + k).join(', ') : 'Nationals, EUCF, WUCC, Elite Invite, masters worlds'], ['Podiums', res.filter((r) => r.place && r.place <= 3).length, 'all competitions in the data']]),
    card('Honours by competition', 'Every finish we have, by competition and season. Gold, silver and bronze mark medals; a number is the place. Hover for the events; click to open the competition.', honours(res, { compGo: (k) => slug(k) }))];
  if (t.rating && t.rating.some((r) => r.comparable)) out.push(ratingCard(t, (await getJSON('trends.json')).ratings_ts));
  if (t.eucs && t.eucs.length) out.push(eucsCard(t.eucs, (await getJSON('trends.json')).eucs_uk, t.team, t.division));
  if (t.history_only && !(t.grid || []).length) return out;
  if (t.history_only) { out.push(whoPlayed(t, C)); return out; }
  // results
  const evPts = S.flatMap((s) => (s.events || []).map((e) => ({ x: s.year, y: e.pct, tip: [e.event, `${ord(e.place)}${e.field ? ' of ' + e.field : ''} · percentile ${f0(e.pct)}`], fill: MEDAL(e.place) || C[0], r: 4 })));
  out.push(card('Results each season', 'Each dot is an event: finish as a percentile of the field (100 = won it). The line is the season average.',
    lineChart([{ name: 'Season average', color: C[0], w: 2.5, pts: S.map((s) => ({ x: s.year, y: s.mean_percentile, tip: ['Season ' + s.year, 'average ' + f0(s.mean_percentile)] })) }, { name: 'Events', color: C[7], line: false, pts: evPts }], { yDomain: [0, 100], legend: false, W: 1000, H: 260 })));
  // retention and stay
  const ALLY = [...new Set((t.grid || []).flatMap((r) => Object.keys(r.cells).map(Number)))].sort((a, b) => a - b);
  let core = (t.grid || []).map((r) => ({ n: r.n, k: r.k, ys: ALLY.filter((y) => r.cells[y] === 'team' || r.cells[y] === 'hist') })).filter((r) => r.ys.length);
  const ycount = (y) => core.filter((r) => r.ys.includes(y)).length, ymed = d3.median(ALLY.map(ycount).filter((n) => n)) || 0;
  const thin = ALLY.filter((y) => ycount(y) && ycount(y) < Math.max(8, 0.4 * ymed));   // incomplete older rosters (e.g. one name known)
  const seen = ALLY.filter((y) => ycount(y) && !thin.includes(y));
  core.forEach((r) => { r.ys = r.ys.filter((y) => !thin.includes(y)); }); core = core.filter((r) => r.ys.length);
  const streak = (r, y) => { let n = 0, i = seen.indexOf(y); while (i >= 0 && r.ys.includes(seen[i])) { n++; i--; } return n; };
  const ten = seen.map((y) => { const on = core.filter((r) => r.ys.includes(y)); const c = [0, 0, 0, 0, 0]; on.forEach((r) => c[Math.min(5, streak(r, y)) - 1]++); return { x: y, a: c[0], b: c[1], c: c[2], d: c[3], e: c[4] }; });
  const coh = seen.slice(0, -1).map((y0, i) => { const g = core.filter((r) => r.ys[0] === y0); return { name: (y0 === seen[0] ? y0 + ' roster' : y0 + ' intake') + ` (${g.length})`, color: C[i % 8], n: g.length, pts: seen.filter((y) => y >= y0).map((y) => ({ x: y, y: g.length ? g.filter((r) => r.ys.includes(y)).length / g.length : null, tip: [(y0 === 2022 ? 'On the 2022 roster' : 'Joined ' + y0), `${y}: ${g.filter((r) => r.ys.includes(y)).length} still here`] })) }; }).filter((c) => c.n >= 3);
  const TR = await getJSON('trends.json');
  const lg = TR.retention.years.map((y, i) => ({ x: y, y: TR.retention.all[i] }));
  const stays = core.map((r) => r.ys.length);
  out.push(card('Retention and how long players stay', 'Left: share of the previous season’s squad that came back, against the whole league from 2023 (dashed). Right: each squad split by how many seasons in a row each player has been on it. Seasons before 2022 come from older rosters and kit lists' + (thin.length ? `; ${thin.join(', ')} left out (too few names known)` : '') + '. Click any point or bar for the players.',
    tiles([['Average stay', stays.length ? f1(d3.mean(stays)) + ' seasons' : '—', `seasons per player, ${seen[0] || ''}–${seen[seen.length - 1] || ''}`], ['Long-stayers', core.length ? pct(core.filter((r) => r.ys.length >= 3).length / core.length) : '—', '3+ core seasons'], ['Same core in ' + (seen[seen.length - 1] || ''), ten.length ? pct((ten[ten.length - 1].c + ten[ten.length - 1].d + ten[ten.length - 1].e) / Math.max(1, d3.sum(Object.values(ten[ten.length - 1]).slice(1)))) : '—', 'of the roster in their 3rd+ season in a row']]),
    h('div', { class: 'grid2' },
      lineChart([{ name: t.team, color: C[0], w: 2.5, pts: seen.slice(1).map((y, i) => { const p = core.filter((r) => r.ys.includes(seen[i])), b = p.filter((r) => r.ys.includes(y)); return { x: y, y: p.length ? b.length / p.length : null, tip: [`${seen[i]} → ${y}`, `${b.length} of ${p.length} came back`], onclick: (ev) => teamDrill(ev, `${t.team}: back from ${seen[i]} for ${y}`, b, t) }; }) }, { name: 'All teams (2023+)', color: C[7], dash: '4 3', pts: lg }], { yDomain: [0, 1], yFmt: pct, xs: seen.slice(1), W: 520 }),
      barChart(ten, [['a', '1st season', C[2]], ['b', '2nd', C[0]], ['c', '3rd', C[5]], ['d', '4th', C[1]], ['e', '5th+', C[3]]].map(([k, n, c]) => ({ key: k, name: n, color: c })), { W: 520, onClick: (d, k, ev) => { const n = 'abcde'.indexOf(k.key) + 1; teamDrill(ev, `${t.team} ${d.x}: ${k.name.replace('+', ' or more')} season in a row`, core.filter((r) => r.ys.includes(d.x) && Math.min(5, streak(r, d.x)) === n), t); } }))));
  if (seen.length >= 2) {
    const IX = await index(), flowBox = h('div'), noteEl = h('p', { class: 'note' });
    const fromSel = h('select', { onchange: () => drawFlow() }, seen.slice(0, -1).map((y) => h('option', { value: y }, 'From ' + y)));
    let st0 = seen.length - 1; while (st0 > 0 && seen[st0] - seen[st0 - 1] <= 2 && seen.length - st0 < 8) st0--; fromSel.value = seen[st0];
    const drawFlow = () => { const yrs = seen.filter((y) => y >= +fromSel.value);
      const rows = core.map((r) => ({ ...r, ys: r.ys.filter((y) => yrs.includes(y)), ev: ((t.grid || []).find((g) => g.k === r.k) || {}).ev })).filter((r) => r.ys.length);
      noteEl.textContent = `Each season’s squad, split by the year players joined (${yrs[0]} includes anyone who joined earlier). Bands carry each intake into the next season, short dashed stubs are players who missed a season and came back, and the grey-to-black blocks are players who left. Click any part for the players.`;
      flowBox.replaceChildren(squadFlow(rows, yrs, { index: IX })); };
    drawFlow();
    out.push(card('Squad flow', null, noteEl, h('div', { class: 'controls' }, fromSel, h('span', { class: 'note' }, ' starts at the most recent run of seasons without big gaps; older seasons come from incomplete rosters')), flowBox));
  }
  // where from / where to: from the same squads as the squad flow (back to the earliest season we have)
  if (seen.length >= 2) {
    const G0 = new Map((t.grid || []).map((g) => [g.k, g]));
    const before = (r, y) => r.ys.some((x) => x < y), prevOf = (y) => seen[seen.indexOf(y) - 1], nextOf = (y) => seen[seen.indexOf(y) + 1];
    const srcOf = (r, y) => { const g = G0.get(r.k) || {}, o = g.oth || {}, p = prevOf(y);
      if (before(r, y)) return 'Back after a gap';
      for (let x = y - 1; x >= (p ?? y - 1); x--) if (o[x]) return o[x];
      const earlier = Object.keys(o).map(Number).filter((x) => x < y).sort((a, b) => b - a)[0];
      return earlier ? o[earlier] + ' (earlier)' : 'New to the data'; };
    const dstOf = (r, y) => { const g = G0.get(r.k) || {}, o = g.oth || {}, n = nextOf(y);
      if (r.ys.some((x) => x > y)) return 'Back later';
      for (let x = y + 1; x <= (n ?? y + 1); x++) if (o[x]) return o[x];
      const later = Object.keys(o).map(Number).filter((x) => x > y).sort((a, b) => a - b)[0];
      return later ? o[later] + ' (later)' : 'Not seen since'; };
    const ysel = h('select'), inB = h('div'), outB = h('div');
    const pie = (L, f, title) => { const G = d3.groups(L, f).map(([k, v]) => ({ label: k, v: v.length, color: k === 'New to the data' || k === 'Not seen since' ? css('--axis') : k.startsWith('Back') ? C[5] : null, tip: [k, v.map((r) => r.n).join(', ')], onclick: (ev) => teamDrill(ev, `${title}: ${k}`, v, t) }));
      return G.length ? donut(G, { W: 520, R: 80, max: 9, centreLab: 'players', otherClick: (ev, rest) => teamDrill(ev, `${title}: other clubs`, L.filter((r) => rest.some((d) => d.label === f(r))), t) }) : h('p', { class: 'note' }, 'Nobody.'); };
    const drawIO = () => { const y = +ysel.value, p = prevOf(y);
      const joined = core.filter((r) => r.ys.includes(y) && !r.ys.includes(p)), left = core.filter((r) => r.ys.includes(p) && !r.ys.includes(y));
      inB.replaceChildren(h('h3', null, `Joined for ${y} (${joined.length})`), pie(joined, (r) => srcOf(r, y), `Joined for ${y}`));
      outB.replaceChildren(h('h3', null, `Left after ${p} (${left.length})`), pie(left, (r) => dstOf(r, p), `Left after ${p}`)); };
    ysel.replaceChildren(...seen.slice(1).reverse().map((y) => h('option', { value: y }, y))); ysel.onchange = drawIO; drawIO();
    out.push(card('Where players came from and went', 'Same squads as the squad flow above. Joined: where each new player was the season before (or earlier). Left: where they went next. Click a slice for the players.', h('div', { class: 'controls' }, ysel), h('div', { class: 'grid2' }, inB, outB)));
    // squad strength over time, from the same squads
    const G1 = (y) => core.filter((r) => r.ys.includes(y));
    const pts = (f, fmt) => seen.map((y) => { const v = f(y); return { x: y, y: v, tip: [String(y), fmt(v)] }; });
    const gbN = (y) => G1(y).filter((r) => ((G0.get(r.k) || {}).gb || []).some((g) => g <= y && g > y - 4)).length;
    const expA = (y) => d3.mean(G1(y), (r) => r.ys.filter((x) => x < y).length) || 0;
    const q15 = S.filter((x) => x.top15 != null).map((x) => ({ x: x.year, y: x.top15, tip: [String(x.year), f0(x.top15)] }));
    out.push(card('Squad strength over time', `From the same squads as the squad flow (${seen[0]}–${seen[seen.length - 1]}). Squads before 2022 come from older rosters and kit lists, so treat early values as rough. Top-15 quality needs 2022+ player scores.`, h('div', { class: 'grid2' },
      h('div', null, h('h3', null, 'Squad size'), lineChart([{ name: 'Squad size', color: C[0], pts: pts((y) => G1(y).length, (v) => v + ' players') }], { W: 520, H: 200, legend: false, xs: seen })),
      h('div', null, h('h3', null, 'GB players (in a GB squad in the last 4 seasons)'), lineChart([{ name: 'GB players', color: C[1], pts: pts(gbN, (v) => v + ' players') }], { W: 520, H: 200, legend: false, xs: seen })),
      h('div', null, h('h3', null, 'Experience (average earlier seasons on this squad)'), lineChart([{ name: 'Experience', color: C[2], pts: pts(expA, (v) => f1(v) + ' seasons') }], { W: 520, H: 200, legend: false, xs: seen })),
      (() => { const sc = (y, i) => { const v = G1(y).map((r) => ((G0.get(r.k) || {}).sc || {})[y]).filter((x) => x && x[i] != null).map((x) => x[i]).sort((a, b) => b - a).slice(0, 15); return v.length >= 5 ? d3.mean(v) : null; };
        const ser = [['Quality', C[0], 0], ['Results quality', C[5], 1], ['Standing', C[3], 2]].map(([nm, c, i]) => ({ name: nm, color: c, dash: i === 1 ? '5 3' : null, pts: seen.map((y) => ({ x: y, y: sc(y, i), tip: [`${y}: top 15 by ${nm.toLowerCase()}`, f0(sc(y, i))] })).filter((p) => p.y != null) })).filter((x) => x.pts.length);
        return ser.length ? h('div', null, h('h3', { class: 'hasinfo', 'data-tip': JSON.stringify(['Top-15 averages', 'Average of the 15 best players on the squad that season (needs 5+ scored players; scores start in 2022). Standing = career score, so it lags behind a quick rise.']) }, 'Top-15: quality, results quality and standing ⓘ'), lineChart(ser, { W: 520, H: 220, yDomain: [0, 100], xs: seen })) : (q15.length ? h('div', null, h('h3', null, 'Top-15 individual quality'), lineChart([{ name: 'Top-15 quality', color: C[3], pts: q15 }], { W: 520, H: 200, legend: false, yDomain: [0, 100] })) : null); })())));
  }
  out.push(whoPlayed(t, C));
  return out;
};

// team page: who played when, including earlier seasons from the history layer
function whoPlayed(t, C) {
  const YRS = [...new Set([...(t.hist_years || []), ...((t.seasons || []).length ? [2022, 2023, 2024, 2025, 2026] : []), ...(t.unnamed || []).map((u) => u.y)])].sort((a, b) => a - b);
  const cell = (c, ev) => c === 'team' ? { color: C[0], op: ev <= 1 ? 0.55 : 1 } : c === 'hist' ? { color: C[0], op: 0.45 } : c === 'squad' ? { color: C[0], op: 0.25 } : c === 'training' ? { color: C[2], op: 0.8 } : c && c.startsWith('other:') ? { color: C[7], op: 0.35 } : null;
  const G = (t.grid || []).slice().sort((a, b) => a.first - b.first || b.seasons - a.seasons || a.n.localeCompare(b.n));
  // names on a squad list with no full name: shown here only, no profile
  const UN = d3.rollups(t.unnamed || [], (v) => v.map((u) => u.y), (u) => u.n).map(([n, ys]) => ({ label: n + ' (name unknown)', go: null, cells: Object.fromEntries(ys.map((y) => [y, { color: C[7], op: 0.6, tip: [n + ' · ' + y, 'On the squad list by nickname or first name only; no profile until the full name is known'] }])) }));
  return card('Who played when', `${G.length} players${UN.length ? ` (plus ${UN.length} listed by nickname only, at the bottom)` : ''}. Solid = core roster (lighter if one event), pale = played but not at roster-locked events, green = training player, grey = with another club that season. Seasons before 2022 come from older rosters and kit lists, so they're less complete. Click a name for their profile.`,
    h('div', { class: 'tbox', style: 'max-height:40rem' }, presenceGrid(G.map((r) => ({ label: r.n, go: '#/p/' + enc(r.k), cells: Object.fromEntries(Object.entries(r.cells).map(([y, c]) => { const v = cell(c, (r.ev || {})[y] || 0); return [y, v && { ...v, tip: [r.n + ' · ' + y, c.startsWith('other:') ? 'With ' + c.slice(6) : c === 'team' ? ((r.ev || {})[y] || 0) + ' events (core roster)' : c === 'squad' ? 'Played, not at locked events' : c === 'hist' ? 'On the squad (earlier season: roster or kit list)' : 'Training player'] }]; }).filter(([, v]) => v)) })).concat(UN), YRS)));
}

// ---------- GB squads ----------
ROUTES.gb = async () => {
  const I = await index(); const C = COL();
  const FAM = [['Senior', 'Grass senior (EUC + WUGC/WUC)'], ['World Games', 'World Games'], ['U24', 'U24'], ['U20', 'U20 (Euros + Worlds)'], ['U17', 'U17'], ['Masters', 'Masters (Euros + Worlds)'], ['Beach', 'Beach'], ['Indoor', 'Indoor']];
  const st = { fam: 'Senior' }; const cbox = h('div'), ybox = h('div');
  const startOf = (l) => +String(l).slice(0, 4);
  const famSel = h('div', { class: 'seg famseg' }, FAM.filter(([f]) => (I.gbc || []).some((c) => c.fam === f)).map(([f, l]) => h('button', { class: f === st.fam ? 'on' : '', onclick: (e) => { st.fam = f; famSel.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.currentTarget)); draw(); } }, l.replace(/ \(.*\)$/, ''))));
  // one row per division, one column per cycle: Euros finish then Worlds finish, coloured by medal; click a cell for that cycle
  const cycleGrid = (rows) => {
    const cols = [...new Set(rows.flatMap((r) => r.cyc.map((c) => String(c[0]))))].sort((a, b) => startOf(a) - startOf(b));
    const labW = 150, cw = 104, rh = 58, W = labW + cols.length * cw + 8, H = 30 + rows.length * rh;
    const { box, svg } = svgBox(W, H); box.classList.add('cyclegrid'); box.style.maxWidth = (W * 1.15) + 'px';
    cols.forEach((c, j) => svg.append('text').attr('x', labW + j * cw + cw / 2).attr('y', 16).attr('text-anchor', 'middle').style('fill', css('--fg')).style('font-weight', 600).text(c));
    rows.forEach((r, i) => { const y = 26 + i * rh;
      svg.append('text').attr('x', labW - 10).attr('y', y + rh / 2 + 4).attr('text-anchor', 'end').style('fill', css('--fg')).style('font-weight', 600).style('cursor', 'pointer').text(r.label).on('click', () => { location.hash = '#/gc/' + enc(r.id); });
      cols.forEach((c, j) => { const cy = r.cyc.find((x) => String(x[0]) === c); const x0 = labW + j * cw;
        const g = svg.append('g').style('cursor', cy ? 'pointer' : null).on('click', () => { if (cy) location.hash = '#/gc/' + enc(r.id) + '/' + enc(c); });
        g.append('rect').attr('x', x0 + 3).attr('y', y + 3).attr('width', cw - 6).attr('height', rh - 8).attr('rx', 8).attr('fill', cy ? css('--panel2') || css('--grid') : 'none').attr('stroke', cy ? css('--line') : 'none');
        if (!cy) return;
        const [, e, w, n] = cy; const dot = (cx, p, lab) => { g.append('circle').attr('cx', cx).attr('cy', y + rh / 2 - 6).attr('r', 12).attr('fill', MEDAL(p) || css('--panel')).attr('stroke', p ? (MEDAL(p) ? 'none' : css('--axis')) : css('--grid')).attr('stroke-dasharray', p ? null : '2 2');
          g.append('text').attr('x', cx).attr('y', y + rh / 2 - 2).attr('text-anchor', 'middle').style('font-size', '11px').style('font-weight', 700).style('fill', MEDAL(p) ? '#222' : css('--fg')).text(p ?? '–');
          g.append('text').attr('x', cx).attr('y', y + rh - 10).attr('text-anchor', 'middle').style('font-size', '9px').style('fill', css('--muted')).text(lab); };
        if (r.paired) { dot(x0 + cw / 2 - 20, e, 'Euros'); dot(x0 + cw / 2 + 20, w, 'Worlds'); }
        else dot(x0 + cw / 2, e ?? w, r.single);
        onTip(g.select('rect'), () => r.paired ? [`${r.label} · ${c} cycle`, `Euros: ${e ? ord(e) : '—'} · Worlds: ${w ? ord(w) : '—'}`, `${n} players across the cycle`, CLICK] : [`${r.label} · ${r.single} ${c}`, `Finish: ${(e ?? w) ? ord(e ?? w) : '—'}`, `${n} players`, CLICK]); }); });
    return box; };
  const draw = () => {
    const rows = (I.gbc || []).filter((c) => c.fam === st.fam).map((c) => ({ id: c.id, label: c.n.replace(/^GB (U\d+ |Beach |Indoor |World Games )?/, '').replace(/^Senior /, ''), cyc: c.cyc, paired: c.lines.length > 1, single: /World Games/.test(c.n) ? 'World Games' : /Indoor/.test(c.n) ? 'Indoor Euros' : /U17/.test(c.n) ? 'U17 Euros' : /U24/.test(c.n) ? 'U24 Worlds' : /Beach/.test(c.n) ? (c.lines[0].includes('euro') ? 'Euro Beach' : 'Beach Worlds') : /Master/.test(c.n) ? (c.lines[0].includes('euro') ? 'Euro Masters' : 'Masters Worlds') : 'Euros' }))
      .sort((a, b) => ['Open', 'Women', 'Mixed'].indexOf(a.label) - ['Open', 'Women', 'Mixed'].indexOf(b.label) || a.label.localeCompare(b.label));
    // how each cycle went across the divisions
    const cols = [...new Set(rows.flatMap((r) => r.cyc.map((c) => String(c[0]))))].sort((a, b) => startOf(a) - startOf(b));
    const summ = cols.slice(-4).reverse().map((c) => { const xs = rows.map((r) => [r.label, r.cyc.find((x) => String(x[0]) === c)]).filter(([, x]) => x); const med = xs.filter(([, x]) => (x[1] && x[1] <= 3) || (x[2] && x[2] <= 3));
      return h('li', null, h('b', null, c + ': '), xs.map(([l, x]) => `${l} ${[x[1], x[2]].filter((v) => v != null).map(ord).join(' / ') || '—'}`).join(' · '), med.length ? h('span', { class: 'muted' }, ` — medals for ${med.map(([l]) => l).join(', ')}`) : ''); });
    const single = rows.length && rows.every((r) => !r.paired);
    cbox.replaceChildren(...[single ? h('p', { class: 'note' }, `${rows[0].single} is a single tournament, not a Euros + Worlds cycle: each column is one edition.`) : null, rows.length ? h('div', { class: 'chartwide' }, cycleGrid(rows)) : h('p', { class: 'note' }, 'No cycles here.'), rows.length ? h('ul', { class: 'cycsum' }, summ) : null].filter(Boolean));
    const lines = I.gb.filter((g) => { const n = g.n; return st.fam === 'Senior' ? /WUGC|EUC/.test(n) && !/U\d|Beach|Master|Indoor/.test(n) : st.fam === 'World Games' ? /World Games/.test(n) : st.fam === 'U20' ? /U20/.test(n) : st.fam === 'U17' ? /U17/.test(n) : st.fam === 'U24' ? /U24/.test(n) : st.fam === 'Masters' ? /Master/.test(n) && !/Beach/.test(n) : st.fam === 'Beach' ? /Beach/.test(n) : /Indoor/.test(n); });
    const years = [...new Set(lines.flatMap((g) => g.ed.map((e) => e[0])))].sort((a, b) => a - b);
    ybox.replaceChildren(lines.length ? medalGrid(lines.map((g) => ({ label: g.n.replace(/^GB /, ''), go: '#/g/' + enc(g.id), cells: Object.fromEntries(g.ed.map(([y, p]) => [y, { place: p, go: '#/g/' + enc(g.id) + '/' + y, tip: [g.n + ' ' + y, p ? ord(p) : 'no placing'] }])) })), years, { labW: 210 }) : h('p', { class: 'note' }, 'No squads.'));
  };
  draw();
  return [h('h1', null, 'GB squads'), h('p', { class: 'sub' }, 'How each GB programme has done, cycle by cycle. A cycle is a Euros followed by the next Worlds (e.g. 2023 EUC + 2024 WUC). Pick a format, read across a row for one division’s story, read down a column to compare divisions in the same cycle. Click any cycle for its squads, crossover and players.'),
    card(null, null, famSel, cbox),
    card('Every squad, year by year', 'The same format, one circle per tournament. Click a row to follow that squad over time, a circle for that year’s squad.', ybox),
    card('GB as a whole', 'Who comes through the youth squads, who stays in the sport, where they play, and whether starting young predicts making a senior grass, beach or indoor squad.', h('div', { class: 'controls' }, h('a', { class: 'btn primary', href: '#/programme' }, 'Open the GB programme →'), h('a', { class: 'btn', href: '#/pathway' }, 'Pathway flow →'))),
    (() => { const grp = (n) => /Master/.test(n) ? 'Masters' : /U17/.test(n) ? 'U17' : /U20/.test(n) ? 'U20' : /U24/.test(n) ? 'U24' : /Beach|Indoor/.test(n) ? null : 'Senior';
      const gsel = h('select', null, ['Senior', 'U24', 'U20', 'U17', 'Masters'].map((g) => h('option', { value: g }, g))), gbox = h('div');
      const drawG = () => { const L = I.gb.filter((g) => grp(g.n) === gsel.value && (g.cs || []).length);
        gbox.replaceChildren(L.length ? lineChart(L.map((g, i) => ({ name: g.n.replace(/^GB /, ''), color: COL()[i % 8], w: 2.5, bridge: true, pts: g.cs.map(([y, v]) => ({ x: y, y: v, r: 5, tip: [g.n + ' ' + y, 'club strength ' + f0(v)], go: '#/g/' + enc(g.id) + '/' + y })) })), { W: 1000, H: 280, labels: true, yDomain: [0, 100] }) : h('p', { class: 'note' }, 'No club data for these squads.')); };
      gsel.onchange = drawG; drawG();
      return card('GB squad strength over time', 'Average results-based strength of the clubs each squad’s players were on that year (0–100, UK average club = 50), by squad level. Covers squads where we know players’ clubs, mostly 2014 on. Click a point for the squad; each squad page also shows what happened to its players afterwards.', h('div', { class: 'controls' }, gsel), gbox); })(),
    card('Most-capped players', 'By number of GB squads in the data (all levels).', await capsTable())];
};
// ---------- GB pathway: U17 -> U20 -> U24 -> Senior -> Masters as a flow ----------
ROUTES.pathway = async () => {
  const D = await getJSON('gbpath.json'); const I = await index(); const C = COL();
  const pInfo = new Map(I.players.map((p) => [p.k, p]));
  const MAIN = D.stages, SCOL = { U17: C[1], U20: C[6], U24: C[2], Senior: C[0], Masters: C[5] };
  const LAB = { U17: 'U17', U20: 'U20', U24: 'U24', Senior: 'Senior (EUC, WUGC, World Games)', Masters: 'Masters (incl. beach masters)' };
  const P = D.players.map(([k, n, sq, oth]) => { const first = {}; sq.forEach(([s, y]) => { if (!(s in first)) first[s] = y; });
    return { k, n, sq, oth, first, stages: MAIN.filter((s) => s in first), y0: d3.min(sq, (x) => x[1]), divs: new Set(sq.map((x) => (x[2].match(/(Open|Women|Mixed)$/) || [])[1]).filter(Boolean)) }; });
  const st = { era: '', div: '' };
  const ERAS = [['', 'All years'], ['2010-2014', 'First GB squad 2010–14'], ['2015-2019', 'First GB squad 2015–19'], ['2020-2026', 'First GB squad 2020–26']];
  const pathTxt = (p) => p.stages.slice().sort((a, b) => p.first[a] - p.first[b] || MAIN.indexOf(a) - MAIN.indexOf(b)).map((s) => `${s} ${p.first[s]}`).join(' → ');
  const squads = (p) => p.sq.map(([s, y, t, pl]) => `${t.replace(/^GB /, '')} ${y}${pl ? ' (' + ord(pl) + ')' : ''}`).join('; ');
  const rowsFor = (L) => L.slice().sort((a, b) => b.stages.length - a.stages.length || a.y0 - b.y0).map((p) => { const e = pInfo.get(p.k) || {};
    return { cells: [playerLink(p.k, p.n), pathTxt(p) || '—', squads(p), [...new Set(p.sq.map((x) => x[4]).filter(Boolean))].join(', ') || '—', p.oth || '', e.y ? `${e.t || '—'} (${e.y})` : '—'], sv: [p.n, p.stages.length, null, null, p.oth ? 1 : 0, e.y] }; });
  const HEAD = ['Player', 'Pathway (first season at each level)', 'Every GB squad', 'Clubs at the time', 'Also played for', 'Latest club'];
  const open = (ev, title, note, L) => showDrill(anchorOf(ev), { title, note, sum: [['Players', L.length], ['Reached Senior', L.filter((p) => 'Senior' in p.first).length], ['Also another nation', L.filter((p) => p.oth).length]], head: HEAD, num: [], rows: rowsFor(L) });
  const box = h('div'), side = h('div', { class: 'controls' }), sumBox = h('div'), info = h('p', { class: 'note pathinfo' }), jbox = h('div');
  const ECOL = { U17: '#e07b24', U20: '#8e5bb5', U24: '#2a9d6a', Senior: '#2b56a8', Masters: '#c2417a' };   // entry colours, kept all the way through
  const IX = (s) => MAIN.indexOf(s);
  const draw = () => {
    const L = P.filter((p) => (!st.era || (p.y0 >= +st.era.slice(0, 4) && p.y0 <= +st.era.slice(5))) && (!st.div || p.divs.has(st.div)));
    const J = L.filter((p) => p.stages.length);
    J.forEach((p) => { p.seq = p.stages; p.entry = p.seq[0];   // levels in order of seniority; the entry level is the lowest reached
      const chron = p.stages.slice().sort((a, b) => p.first[a] - p.first[b] || IX(a) - IX(b)); p.back = chron.some((s, i) => i && IX(s) < IX(chron[i - 1])); });
    // groups
    const grp = (f) => { const m = new Map(); J.forEach((p) => f(p).forEach((key) => { if (!m.has(key.id)) m.set(key.id, Object.assign(key, { ps: [] })); m.get(key.id).ps.push(p); })); return [...m.values()]; };
    const links = grp((p) => p.seq.slice(1).map((b, j) => ({ id: p.entry + '|' + p.seq[j] + '|' + b, e: p.entry, a: p.seq[j], b })));
    links.forEach((l) => { l.skip = IX(l.b) > IX(l.a) + 1; });
    const stops = grp((p) => p.seq[p.seq.length - 1] === 'Masters' ? [] : [{ id: p.entry + '|' + p.seq[p.seq.length - 1], e: p.entry, s: p.seq[p.seq.length - 1] }]);
    const tot = Object.fromEntries(MAIN.map((s) => [s, J.filter((p) => s in p.first).length]));
    // geometry: each level bar is stacked by where its players entered GB (earliest entry level at the top), in the entry colours.
    // Inside each coloured block: arriving from the level below first, then skips arriving from underneath;
    // leaving: up one level first, then skips (which drop to the lanes underneath), then the grey-to-black "stopped" band.
    const W = 1000, nw = 16, colH = 300, k = colH / (d3.max(Object.values(tot)) || 1), top = 40;
    const X = (i) => 60 + i * ((W - 170 - nw) / (MAIN.length - 1));
    const node = Object.fromEntries(MAIN.map((s, i) => [s, { s, x: X(i), y: top + (colH - tot[s] * k) / 2, h: tot[s] * k }]));
    links.forEach((l) => { l.t = l.ps.length * k; }); stops.forEach((t) => { t.t = t.ps.length * k; });
    const segs = [];
    MAIN.forEach((s) => { let y = node[s].y;
      MAIN.forEach((e) => { const ps = J.filter((p) => p.entry === e && s in p.first); if (!ps.length) return;
        const g = { s, e, ps, x: node[s].x, y, h: ps.length * k }; segs.push(g);
        let yi = y; links.filter((l) => l.b === s && l.e === e).sort((p, q) => (p.skip - q.skip) || IX(q.a) - IX(p.a)).forEach((l) => { l.y1 = yi; yi += l.t; });
        let yo = y; links.filter((l) => l.a === s && l.e === e).sort((p, q) => (p.skip - q.skip) || IX(p.b) - IX(q.b)).forEach((l) => { l.y0 = yo; yo += l.t; });
        stops.filter((t) => t.s === s && t.e === e).forEach((t) => { t.y = yo; yo += t.t; });
        y += g.h; }); });
    const curve = d3.line().curve(d3.curveBumpX);
    let lane = top + colH + 26;
    links.filter((l) => l.skip).sort((p, q) => (IX(q.b) - IX(q.a)) - (IX(p.b) - IX(p.a)) || IX(p.a) - IX(q.a) || IX(p.e) - IX(q.e)).forEach((l) => { l.lane = lane + l.t / 2; lane += Math.max(l.t, 1.5) + 3; });
    links.forEach((l) => { const xa = node[l.a].x + nw, xb = node[l.b].x, ya = l.y0 + l.t / 2, yb = l.y1 + l.t / 2;
      l.d = l.skip ? curve([[xa, ya], [xa + 36, l.lane], [xb - 36, l.lane], [xb, yb]]) : curve([[xa, ya], [xb, yb]]); });
    const H = lane + 16;
    const { box: b, svg } = svgBox(W, H);
    const gid = 'stopgrad' + Math.random().toString(36).slice(2, 7);
    const grad = svg.append('defs').append('linearGradient').attr('id', gid).attr('x1', 0).attr('x2', 1).attr('y1', 0).attr('y2', 0);
    grad.append('stop').attr('offset', 0).attr('stop-color', '#9aa0a6'); grad.append('stop').attr('offset', 1).attr('stop-color', '#111');
    MAIN.forEach((s) => svg.append('text').attr('x', node[s].x + nw / 2).attr('y', 18).attr('text-anchor', 'middle').style('font-weight', 600).style('fill', css('--fg')).text(s));
    MAIN.forEach((s) => svg.append('text').attr('x', node[s].x + nw / 2).attr('y', 32).attr('text-anchor', 'middle').style('fill', css('--muted')).style('font-size', '11px').text(tot[s] + ' players'));
    if (links.some((l) => l.skip)) svg.append('text').attr('x', 4).attr('y', top + colH + 20).style('fill', css('--muted')).style('font-size', '11px').text('Skipped a level ⤵');
    const gT = svg.append('g'), gL = svg.append('g'), gN = svg.append('g'), gX = svg.append('g');   // stops under the bands, labels on top
    const why = (l) => l.skip ? `skipped ${MAIN.slice(IX(l.a) + 1, IX(l.b)).join(' and ')}` : 'up one level';
    const flows = gL.selectAll('path').data(links).join('path').attr('d', (l) => l.d).attr('fill', 'none').attr('stroke', (l) => ECOL[l.e]).attr('stroke-width', (l) => Math.max(1.5, l.t)).attr('stroke-opacity', 0.5).style('cursor', 'pointer')
      .on('click', (ev, l) => open(ev, `${l.a} → ${l.b}, entered GB at ${l.e}`, `Players who entered GB at ${l.e} and went from ${l.a} to ${l.b} (${why(l)}).`, l.ps));
    onTip(flows, (l) => [`${l.a} → ${l.b} (${why(l)})`, `${l.ps.length} player${l.ps.length === 1 ? '' : 's'} who entered GB at ${l.e}`, ...(l.ps.length <= 6 ? l.ps.map((p) => p.n) : []), CLICK]);
    // stopped: a straight band out of the level that fades from grey to black
    const SW = 18;
    const stopG = gT.selectAll('rect.stop').data(stops).join('rect').attr('class', 'stop').attr('x', (t) => node[t.s].x + nw).attr('y', (t) => t.y).attr('width', SW).attr('height', (t) => Math.max(1, t.t)).attr('fill', `url(#${gid})`).style('cursor', 'pointer')
      .on('click', (ev, t) => open(ev, `Went no further than ${t.s} (entered at ${t.e})`, `Players whose highest GB level is ${t.s}. Recent players may still go on.`, t.ps));
    onTip(stopG, (t) => [`${t.ps.length} went no further than ${t.s}`, `entered GB at ${t.e}`, CLICK]);
    MAIN.forEach((s) => { const ts = stops.filter((t) => t.s === s); if (!ts.length) return; const n = d3.sum(ts, (t) => t.ps.length), y0 = d3.min(ts, (t) => t.y), y1 = d3.max(ts, (t) => t.y + t.t);
      gX.append('text').attr('x', node[s].x + nw + SW + 5).attr('y', (y0 + y1) / 2 + 4).style('fill', css('--fg')).style('font-size', '11px').style('font-weight', 600).style('paint-order', 'stroke').style('stroke', css('--panel')).style('stroke-width', '4px').style('stroke-linejoin', 'round').text(`${n} stopped`); });
    const segR = gN.selectAll('rect').data(segs).join('rect').attr('x', (g) => g.x).attr('y', (g) => g.y).attr('width', nw).attr('height', (g) => Math.max(1, g.h)).attr('fill', (g) => ECOL[g.e]).attr('stroke', css('--panel')).attr('stroke-width', 0.6).style('cursor', 'pointer')
      .on('click', (ev, g) => open(ev, g.e === g.s ? `Entered GB at ${g.s}` : `Reached ${g.s}, entered GB at ${g.e}`, null, g.ps));
    onTip(segR, (g) => [`${g.s}: ${g.ps.length} player${g.ps.length === 1 ? '' : 's'}`, g.e === g.s ? 'entered GB here' : `entered GB at ${g.e}`, CLICK]);
    const startG = segR;
    const focus = (p) => { flows.attr('stroke-opacity', (l) => !p ? 0.5 : l.ps.includes(p) ? 0.95 : 0.05); stopG.attr('opacity', (t) => !p || t.ps.includes(p) ? 1 : 0.12); segR.attr('opacity', (g) => !p || g.ps.includes(p) ? 1 : 0.2);
      jrows.attr('opacity', (r) => !p || r.ps.includes(p) ? 1 : 0.15);
      info.replaceChildren(...(p ? [h('b', null, p.n), ': ', p.stages.slice().sort((a, c) => p.first[a] - p.first[c]).map((s) => `${s} ${p.first[s]}`).join(' → '), p.seq.length === 1 ? ' (one level so far)' : '', ' · ', h('a', { href: '#/p/' + enc(p.k) }, 'profile')] : [])); };
    box.replaceChildren(b, legend(MAIN.map((s) => [`Entered GB at ${s}`, ECOL[s]]).concat([['Stopped (no higher level yet)', '#444']])),
      h('p', { class: 'note' }, 'Each level’s bar is split by where its players entered GB, in that colour, and the bands keep the colour all the way through. Bands to the right went up one level; bands along the bottom skipped a level; the grey-to-black blocks are players who went no further. Click any part for the players.'));
    // journeys: one row per route
    const routes = grp((p) => [{ id: p.seq.join('>'), seq: p.seq, e: p.entry }]).sort((a, c) => c.ps.length - a.ps.length);
    const RW = 1000, rh = 24, colX = (i) => 40 + i * 70, barX = 40 + 4 * 70 + 50, RH = 34 + rh * routes.length;
    const { box: jb, svg: js } = svgBox(RW, RH);
    MAIN.forEach((s, i) => js.append('text').attr('x', colX(i)).attr('y', 14).attr('text-anchor', 'middle').style('font-weight', 600).style('fill', css('--fg')).text(s));
    js.append('text').attr('x', barX).attr('y', 14).style('fill', css('--muted')).text('Players');
    const mxr = d3.max(routes, (r) => r.ps.length) || 1, bx = d3.scaleLinear([0, mxr], [0, RW - barX - 60]);
    const jrows = js.selectAll('g.jr').data(routes).join('g').attr('class', 'jr').attr('transform', (r, i) => `translate(0,${28 + i * rh})`).style('cursor', 'pointer')
      .on('click', (ev, r) => open(ev, r.seq.join(' → '), r.seq.length === 1 ? `Played GB ${r.seq[0]} only.` : `Reached exactly these GB levels${r.seq.some((s, i) => i && IX(s) > IX(r.seq[i - 1]) + 1) ? ', skipping the ones in between' : ''}.`, r.ps));
    jrows.append('rect').attr('x', 0).attr('y', 0).attr('width', RW).attr('height', rh).attr('fill', (r, i) => i % 2 ? 'transparent' : css('--bg')).attr('opacity', 0.6);
    jrows.each(function (r) { const g = d3.select(this), c = ECOL[r.e], cy = rh / 2;
      MAIN.forEach((s, i) => g.append('circle').attr('cx', colX(i)).attr('cy', cy).attr('r', 3).attr('fill', css('--grid')));
      r.seq.slice(1).forEach((s, j) => { const a = IX(r.seq[j]), bb = IX(s); g.append('line').attr('x1', colX(a)).attr('x2', colX(bb)).attr('y1', cy).attr('y2', cy).attr('stroke', c).attr('stroke-width', 3).attr('stroke-dasharray', bb > a + 1 ? '5 4' : null); });
      r.seq.forEach((s) => g.append('circle').attr('cx', colX(IX(s))).attr('cy', cy).attr('r', 6).attr('fill', c));
      g.append('rect').attr('x', barX).attr('y', 5).attr('height', rh - 10).attr('width', Math.max(2, bx(r.ps.length))).attr('rx', 3).attr('fill', c).attr('opacity', 0.75);
      g.append('text').attr('x', barX + bx(r.ps.length) + 6).attr('y', cy + 4).style('fill', css('--fg')).text(r.ps.length);
      g.append('text').attr('x', RW - 4).attr('y', cy + 4).attr('text-anchor', 'end').style('fill', css('--muted')).style('font-size', '11px').text(r.seq.length > 1 && r.seq.some((s, i) => i && IX(s) > IX(r.seq[i - 1]) + 1) ? 'skipped a level' : ''); });
    onTip(jrows, (r) => [r.seq.join(' → '), `${r.ps.length} player${r.ps.length === 1 ? '' : 's'}`, ...(r.ps.length <= 6 ? r.ps.map((p) => p.n) : []), CLICK]);
    jbox.replaceChildren(jb, h('p', { class: 'note' }, 'Each row is one route through GB, with a dot for every level reached. A dashed line means levels were skipped. Click a row for the players.'));
    const byName = new Map(J.map((p) => [p.n.toLowerCase(), p]));
    find.oninput = () => focus(byName.get(find.value.trim().toLowerCase()) || null);
    dl.replaceChildren(...J.map((p) => h('option', { value: p.n })));
    focus(byName.get(find.value.trim().toLowerCase()) || null);
    const beach = L.filter((p) => p.sq.some((x) => x[0] === 'Beach')), indoor = L.filter((p) => p.sq.some((x) => x[0] === 'Indoor')), oth = L.filter((p) => p.oth), back = J.filter((p) => p.back);
    const chip = (t, arr, note) => h('button', { class: 'btn', onclick: (ev) => open(ev, t, note, arr) }, `${t} (${arr.length})`);
    side.replaceChildren(h('span', { class: 'muted' }, 'Also:'), chip('Went back down a level', back, 'Players who played a lower GB level after a higher one (e.g. U24, then U20 the next year).'), chip('GB beach', beach, 'Players in a senior GB beach squad (beach masters count as Masters above).'), chip('GB indoor', indoor, 'Players in a GB indoor squad.'), chip('Played for another nation', oth, 'Players who also appear for another national team.'));
    const yth = J.filter((p) => 'U17' in p.first || 'U20' in p.first), ythS = yth.filter((p) => 'Senior' in p.first), sen = J.filter((p) => 'Senior' in p.first), senY = sen.filter((p) => 'U17' in p.first || 'U20' in p.first || 'U24' in p.first);
    sumBox.replaceChildren(tiles([['Players', J.length], ['Youth (U17/U20) who reached Senior', `${ythS.length} of ${yth.length}`, pct(ythS.length / (yth.length || 1))], ['Senior players who came through U17/U20/U24', `${senY.length} of ${sen.length}`, pct(senY.length / (sen.length || 1))], ['Skipped at least one level', J.filter((p) => p.seq.some((s, i) => i && IX(s) > IX(p.seq[i - 1]) + 1)).length]]));
  };
  const dl = h('datalist', { id: 'pathnames' }), find = h('input', { type: 'search', list: 'pathnames', placeholder: 'Trace a player…', 'aria-label': 'Trace a player', class: 'pathfind' });
  draw();
  // how the pathway has changed: cohorts by first GB squad
  const cohorts = d3.range(2010, 2027, 2).map((y) => { const c = P.filter((p) => p.y0 >= y && p.y0 < y + 2 && ('U17' in p.first || 'U20' in p.first)); return { x: `${y}–${String(y + 1).slice(2)}`, y, n: c.length, u24: c.filter((p) => 'U24' in p.first).length / (c.length || 1), sen: c.filter((p) => 'Senior' in p.first).length / (c.length || 1), c }; }).filter((r) => r.n >= 5);
  const coh = lineChart([{ name: 'Went on to U24', color: C[2], pts: cohorts.map((r) => ({ x: r.y, y: r.u24, tip: [`Youth players first capped ${r.x}`, `${pct(r.u24)} of ${r.n} went on to U24`], onclick: (ev) => open(ev, `Youth players first capped ${r.x}`, 'Their whole GB pathway so far.', r.c) })) },
    { name: 'Went on to Senior', color: C[0], pts: cohorts.map((r) => ({ x: r.y, y: r.sen, tip: [`Youth players first capped ${r.x}`, `${pct(r.sen)} of ${r.n} reached Senior`], onclick: (ev) => open(ev, `Youth players first capped ${r.x}`, 'Their whole GB pathway so far.', r.c) })) }], { W: 1000, H: 220, yDomain: [0, 1], yFmt: pct, xFmt: (v) => `${v}–${String(v + 1).slice(2)}` });
  const ctl = h('div', { class: 'controls' },
    h('select', { onchange: (e) => { st.era = e.target.value; draw(); } }, ERAS.map(([v, l]) => h('option', { value: v }, l))),
    h('select', { onchange: (e) => { st.div = e.target.value; draw(); } }, [['', 'All divisions'], ['Open', 'Played a GB Open squad'], ['Women', 'Played a GB Women’s squad'], ['Mixed', 'Played a GB Mixed squad']].map(([v, l]) => h('option', { value: v }, l))), find, dl);
  return [h('h1', null, 'GB pathway'), h('p', { class: 'sub' }, 'How players move up through GB squads: U17, U20, U24, Senior, then Masters. Built from every GB roster we have since 2010; rosters before about 2017 are incomplete, so early flows are undercounted.'),
    card(null, null, ctl, info, sumBox, box, side),
    card('Every route through GB', 'The same players, one row per route, most common first. This is the clearest way to see who skipped levels and where people stopped.', jbox),
    card('Do youth players go on?', 'Players whose first GB squad was U17 or U20, grouped by when they were first capped: the share who later made a U24 and a senior squad. Recent groups haven’t had time to get there yet. Click a point for the players.', coh)];
};
async function capsTable() {
  const I = await index(); const L = I.players.filter((p) => p.gb >= 3).sort((a, b) => b.gb - a.gb).slice(0, 60);
  return table(['Player', 'GB squads', 'Latest team'], L.map((p) => ({ go: '#/p/' + enc(p.k), cells: [p.n, p.gb, p.t] })), { num: [1], max: '26rem' });
}
// ---------- GB programme: journeys, retention, what youth GB predicts ----------
// Programme: average scores by how players first entered GB, one row per route, values printed on the bars
function entryBars(rows, C) {
  const LAB = { U17: 'First GB squad: U17', U20: 'First GB squad: U20', U24: 'First GB squad: U24', 'Senior/other GB only': 'Straight into senior / other GB', 'No GB': 'Never in a GB squad' };
  const M = [['q', 'Quality (latest season)', C[0]], ['st', 'Standing (career)', C[3]]];
  const labW = 230, W = 760, bh = 13, gap = 6, rh = M.length * (bh + 3) + gap * 2 + 14, H = 30 + rows.length * rh + 24;
  const x = d3.scaleLinear().domain([0, 100]).range([labW, W - 50]);
  const { box, svg } = svgBox(W, H);
  [0, 25, 50, 75, 100].forEach((v) => { svg.append('line').attr('x1', x(v)).attr('x2', x(v)).attr('y1', 22).attr('y2', H - 22).attr('stroke', css('--grid'));
    svg.append('text').attr('x', x(v)).attr('y', H - 8).attr('text-anchor', 'middle').style('fill', css('--muted')).text(v); });
  svg.append('text').attr('x', x(50)).attr('y', 14).attr('text-anchor', 'middle').style('fill', css('--muted')).text('average score of the players in each group (0–100)');
  rows.forEach((r, i) => { const y0 = 30 + i * rh;
    if (i % 2 === 0) svg.append('rect').attr('x', 0).attr('y', y0 - 4).attr('width', W).attr('height', rh - 4).attr('fill', css('--bg')).attr('opacity', 0.7);
    svg.append('text').attr('x', labW - 10).attr('y', y0 + 12).attr('text-anchor', 'end').style('font-weight', 600).style('fill', css('--fg')).text(LAB[r.g] || r.g);
    svg.append('text').attr('x', labW - 10).attr('y', y0 + 27).attr('text-anchor', 'end').style('fill', css('--muted')).style('font-size', '11px').text(`${r.n} players · ${pct(r.sen / r.n)} made senior grass`);
    M.forEach(([k, nm, col], j) => { const v = r[k]; if (v == null) return; const yy = y0 + j * (bh + 3);
      const b = svg.append('rect').attr('x', x(0)).attr('y', yy).attr('width', x(v) - x(0)).attr('height', bh).attr('rx', 2).attr('fill', col);
      onTip(b, () => [LAB[r.g] || r.g, `${nm}: average ${f0(v)} across ${r.n} players`]);
      svg.append('text').attr('x', x(v) + 5).attr('y', yy + bh - 2).style('font-size', '11px').style('fill', css('--fg')).text(f0(v)); }); });
  box.append(legend(M.map(([, nm, col]) => [nm, col])));
  return h('div', null, h('h3', null, 'Average scores by how players first entered GB'), h('p', { class: 'note' }, 'Each row is a group of players scored in 2022+, by their first GB squad (or none). Bars are that group’s average Quality and Standing; the small line under each label says how many players are in the group and how many reached a senior grass squad. Higher = the group plays at a higher level on average.'), box);
}
ROUTES.programme = async () => {
  const D = await getJSON('programme.json'); const I = await index(); const C = COL(); await mpMap();
  const LV = ['U17', 'U20', 'U24', 'Senior'], LCOL = { U17: '#e07b24', U20: '#8e5bb5', U24: '#2a9d6a', Senior: '#2b56a8', Other: '#9aa3b2' };
  const pInfo = new Map(I.players.map((p) => [p.k, p]));
  const P0 = D.players.filter((p) => mpPass(p.k)).map((p) => {
    const core = p.sq.filter((s) => LV.includes(s[0]));
    const entry = core.length ? core.slice().sort((a, b) => a[1] - b[1] || LV.indexOf(a[0]) - LV.indexOf(b[0]))[0] : p.sq[0];
    const yrs = new Set([...p.sq.map((s) => s[1]), ...p.cy.map((c) => c[0])]);
    return { ...p, entry: LV.includes(entry[0]) ? entry[0] : 'Other', y0: entry[1], yrs, senior: p.sq.some((s) => s[0] === 'Senior'), beachSen: p.sq.some((s) => /Beach Senior/.test(s[2])), indoor: p.sq.some((s) => s[0] === 'Indoor'), seniorY: d3.min(p.sq.filter((s) => s[0] === 'Senior'), (s) => s[1]),
      peak: d3.max(p.cy, (c) => c[3]), club: (pInfo.get(p.k)?.t || '').replace(/^(Great Britain|GB)$/, ''), still: p.last >= D.lasty - 1 };
  });
  const st = { era: '', lvl: '', div: '' };
  const divOf = (p) => new Set(p.sq.map((s) => (s[2].match(/(Open|Women|Mixed)$/) || [])[1]).filter(Boolean));
  const ctl = h('div', { class: 'controls' },
    h('select', { onchange: (e) => { st.era = e.target.value; draw(); } }, [['', 'All entry years'], ['2010-2014', 'First GB squad 2010–14'], ['2015-2019', 'First GB squad 2015–19'], ['2020-2026', 'First GB squad 2020–26']].map(([v, l]) => h('option', { value: v }, l))),
    h('select', { onchange: (e) => { st.lvl = e.target.value; draw(); } }, [['', 'All entry levels'], ['U17', 'Entered at U17'], ['U20', 'Entered at U20'], ['U24', 'Entered at U24'], ['Senior', 'Entered at senior'], ['Other', 'Beach / masters / indoor only']].map(([v, l]) => h('option', { value: v }, l))),
    h('select', { onchange: (e) => { st.div = e.target.value; draw(); } }, [['', 'All GB divisions'], ['Open', 'Open'], ['Women', 'Women'], ['Mixed', 'Mixed']].map(([v, l]) => h('option', { value: v }, l))));
  const box = h('div');
  const HEAD = ['Player', 'Entry', 'First GB', 'GB squads', 'Senior grass', 'Senior beach / indoor', 'Peak quality (2022+)', 'Standing', 'Trajectory', 'Last seen', 'Latest club'];
  const prow = (p) => { const e = pInfo.get(p.k) || {}; return { cells: [playerLink(p.k, p.n), p.entry, p.y0, p.sq.length, p.senior ? 'yes' + (p.seniorY ? ' (' + p.seniorY + ')' : '') : '', [p.beachSen ? 'beach' : '', p.indoor ? 'indoor' : ''].filter(Boolean).join(' + '), f0(p.peak), f0(e.st), trj(e.tr, e.trt, e.tri), p.last, p.club || '—'], sv: [p.n, LV.indexOf(p.entry), p.y0, p.sq.length, p.senior ? 1 : 0, (p.beachSen ? 2 : 0) + (p.indoor ? 1 : 0), p.peak, e.st, e.tr, p.last, p.club] }; };
  const drill = (ev, title, note, L) => showDrill(anchorOf(ev), { title, note, sum: [['Players', L.length], ['Senior grass', L.filter((p) => p.senior).length], ['Senior beach', L.filter((p) => p.beachSen).length], ['Indoor', L.filter((p) => p.indoor).length], ['Seen in the last two seasons', L.filter((p) => p.still).length]], head: HEAD, num: [2, 3, 6, 7, 8, 9], rows: L.map(prow) });
  const draw = () => {
    const P = P0.filter((p) => (!st.era || (p.y0 >= +st.era.slice(0, 4) && p.y0 <= +st.era.slice(5))) && (!st.lvl || p.entry === st.lvl) && (!st.div || divOf(p).has(st.div)));
    const youth = P.filter((p) => ['U17', 'U20', 'U24'].includes(p.entry)), jun = P.filter((p) => ['U17', 'U20'].includes(p.entry));
    const mature = (p, n) => p.y0 + n <= D.lasty;   // cohort old enough to judge n years on
    const conv = (L, n) => { const M = L.filter((p) => mature(p, n)); return M.length ? [M.filter((p) => p.senior).length / M.length, M.length] : [null, 0]; };
    const c5 = conv(jun, 6), c24 = conv(youth.filter((p) => p.entry === 'U24'), 4);
    const stillL = P.filter((p) => mature(p, 3));
    const tiles1 = tiles([['GB players', P.length, 'in the squads we have, 2010–' + D.lasty], ['Came in through youth', youth.length, `${jun.length} at U17/U20, ${youth.length - jun.length} at U24`],
      ['Junior → senior grass', pct(c5[0]), `of ${c5[1]} U17/U20 entrants whose first squad was 6+ years ago`, ['Share of U17/U20 entrants who later made a senior grass squad (EUC, WUGC, World Games). Grass is the top format; beach and indoor are counted separately. Only cohorts old enough to have had the chance (first squad at least 6 years ago) are counted.']],
      ['U24 → senior grass', pct(c24[0]), `of ${c24[1]} U24 entrants, first squad 4+ years ago`],
      (() => { const M6 = jun.concat(youth.filter((p) => p.entry === 'U24')).filter((p) => mature(p, 4)); return ['Youth → senior beach / indoor', M6.length ? pct(M6.filter((p) => p.beachSen).length / M6.length) + ' / ' + pct(M6.filter((p) => p.indoor).length / M6.length) : '—', `of ${M6.length} youth entrants, first squad 4+ years ago`, ['Beach senior (WBUC / Euro Beach) and indoor squads, counted separately from grass.']]; })(),
      ['Still around', stillL.length ? pct(stillL.filter((p) => p.still).length / stillL.length) : '—', `seen playing in ${D.lasty - 1}–${D.lasty}, of ${stillL.length} with a first squad 3+ years ago`, ['"Seen" = on any club roster, kit list or GB squad in the data. Club rosters before about 2020 are thin, so older cohorts look like they left more than they did.']]]);
    // 1. survival: share seen N years after first GB squad, by entry level
    const N = d3.range(0, 11);
    const surv = ['U17', 'U20', 'U24', 'Senior'].map((lv) => { const L = P.filter((p) => p.entry === lv);
      return { name: lv, color: LCOL[lv], pts: N.map((n) => { const M = L.filter((p) => mature(p, n)); if (M.length < 8) return null; const v = M.filter((p) => p.yrs.has(p.y0 + n) || p.last >= p.y0 + n).length / M.length;
        return { x: n, y: v, tip: [`${lv} entrants, ${n} year${n === 1 ? '' : 's'} after their first squad`, `${pct(v)} still seen (${M.length} players old enough to count)`], go: null }; }).filter(Boolean) }; }).filter((s) => s.pts.length > 1);
    const survCard = card('Still in the game', 'Share of each entry group still seen playing (any club roster, kit list or GB squad) N years after their first GB squad — cumulative, so it only counts the last year they were seen or later. Groups need 8+ players old enough to count. Older cohorts are undercounted because club rosters before 2020 are thin.',
      lineChart(surv, { W: 620, H: 280, yDomain: [0, 1], yFmt: d3.format('.0%'), xLabel: 'years after first GB squad' }),
      h('p', { class: 'note' }, 'Hover a point for the number of players behind it.'));
    // 2. what youth entrants are doing N years on
    const doing = (p, y) => { if (y > D.lasty) return null; const sq = p.sq.filter((s) => s[1] === y); if (sq.some((s) => s[0] === 'Senior')) return 'GB senior (grass)'; if (sq.some((s) => ['U17', 'U20', 'U24'].includes(s[0]))) return 'GB youth'; if (sq.length) return 'GB beach / masters / indoor';
      const cy = p.cy.filter((c) => c[0] === y); if (cy.length) { const d = cy.map((c) => c[4]).find(Boolean); return d ? 'Club: ' + d : 'Club'; } return p.last >= y ? 'Not seen that year' : 'Gone from the data'; };
    const KEYS = ['GB senior (grass)', 'GB youth', 'GB beach / masters / indoor', 'Club: Open', 'Club: Women', 'Club: Mixed', 'Club', 'Not seen that year', 'Gone from the data'];
    const KC = { 'GB senior (grass)': C[0], 'GB youth': C[1], 'GB beach / masters / indoor': C[6], 'Club: Open': C[2], 'Club: Women': C[3], 'Club: Mixed': C[4], Club: C[5], 'Not seen that year': '#cfd4dc', 'Gone from the data': '#eceff3' };
    const yrsOn = d3.range(1, 9);
    const dd = yrsOn.map((n) => { const M = youth.filter((p) => mature(p, n)); const o = { x: n + ' yr' + (n === 1 ? '' : 's'), n, _ps: {} }; M.forEach((p) => { const k = doing(p, p.y0 + n); if (!k) return; o[k] = (o[k] || 0) + 1 / M.length; (o._ps[k] = o._ps[k] || []).push(p); }); return o; }).filter((o) => d3.sum(KEYS, (k) => o[k] || 0) > 0);
    const doingCard = card('What youth entrants are doing, year by year', 'For everyone whose first GB squad was U17, U20 or U24: what the data shows them doing 1–8 years later, as a share of the players old enough to count. "Not seen that year" = still appears later; "gone" = never seen again. Click a block for the players.',
      barChart(dd, KEYS.map((k) => ({ key: k, name: k, color: KC[k] })), { W: 680, H: 280, yFmt: d3.format('.0%'), onClick: (d, k, ev) => drill(ev, `${k.name}, ${d.x} after first GB squad`, null, d._ps[k.key] || []) }),
      null);
    // 3. does starting young predict quality? (population comparison, 2022+ scored players)
    const PG = ['U17', 'U20', 'U24', 'Senior/other GB only', 'No GB'], pop = D.pop;
    const popRows = [['Players (2022+ with a score)', (g) => g.n], ['Average quality', (g) => f0(g.q)], ['Average results quality', (g) => f0(g.qr)], ['Average standing', (g) => f0(g.st)], ['Average trajectory (3+ seasons)', (g) => g.tr == null ? '—' : sgn1(g.tr) + '/season'], ['Quality 70+', (g) => `${g.q70} (${pct(g.q70 / g.n)})`], ['On a top-rated club (70+)', (g) => `${g.top} (${pct(g.top / g.n)})`], ['Made a senior grass squad', (g) => `${g.sen} (${pct(g.sen / g.n)})`], ['Made a senior beach squad', (g) => `${g.senB} (${pct(g.senB / g.n)})`], ['Made an indoor squad', (g) => `${g.senI} (${pct(g.senI / g.n)})`]];
    const popCard = card('Does starting young predict later quality?', 'Players scored in 2022+ grouped by how they first entered GB (their lowest youth level) against those who never played GB. A selection effect is built in: GB youth squads pick the strongest juniors, so this shows what the programme\'s players go on to do, not what the programme causes.',
      h('div', null, table(['', ...PG.map((g) => g.replace('Senior/other GB only', 'Senior / other GB only'))], popRows.map(([l, f]) => ({ cells: [l, ...PG.map((g) => pop[g] ? f(pop[g]) : '—')] })), { num: [1, 2, 3, 4, 5] }),
        entryBars(PG.filter((g) => pop[g]).map((g) => ({ g, ...pop[g] })), C)));
    // 4. entry year cohorts: outcome grid
    const cohorts = d3.groups(P.filter((p) => p.entry !== 'Other'), (p) => p.y0).sort((a, b) => a[0] - b[0]);
    const OUT = ['Players', 'Senior grass', 'Senior beach', 'Indoor', 'Played 3+ GB squads', 'Still seen ' + (D.lasty - 1) + '–' + D.lasty, 'Peak quality 70+'];
    const cohortCard = card('Each entry-year cohort', 'Everyone whose first GB squad (U17–senior) was in that year, and what became of them. Click a cell for the players.',
      heatGrid(cohorts.map(([y, L]) => ({ label: String(y), L })), OUT, (r, c) => { const L = c === 'Players' ? r.L : c === 'Senior grass' ? r.L.filter((p) => p.senior) : c === 'Senior beach' ? r.L.filter((p) => p.beachSen) : c === 'Indoor' ? r.L.filter((p) => p.indoor) : c === 'Played 3+ GB squads' ? r.L.filter((p) => p.sq.length >= 3) : c.startsWith('Still') ? r.L.filter((p) => p.still) : r.L.filter((p) => p.peak >= 70);
        return { v: L.length, share: c === 'Players' ? 0.25 : L.length / (r.L.length || 1), tip: [`${r.label}: ${c}`, `${L.length}${c === 'Players' ? '' : ' of ' + r.L.length + ' (' + pct(L.length / (r.L.length || 1)) + ')'}`], onclick: (ev) => drill(ev, `${c}, first GB squad ${r.label}`, null, L) }; }, { labW: 60, cw: 104 }));
    // 5. where youth alumni play
    const clubSeasons = youth.flatMap((p) => p.cy.filter((c) => c[0] > p.y0).map((c) => ({ p, club: c[1] })));
    const clubs = d3.rollups(clubSeasons, (v) => v, (d) => d.club).map(([label, v]) => ({ label, v: new Set(v.map((d) => d.p.k)).size, _ps: [...new Map(v.map((d) => [d.p.k, d.p])).values()] })).sort((a, b) => b.v - a.v);
    const clubCard = card('Where youth entrants play afterwards', 'Clubs that U17/U20/U24 entrants have played for in any season after their first GB squad (players, not seasons). Click a slice for the players.',
      clubs.length ? donut(clubs.map((c, i) => ({ ...c, color: C[i % 8], tip: [c.label, c.v + ' players'], onclick: (ev) => drill(ev, c.label + ': youth GB entrants who played there', null, c._ps) })), { W: 560, R: 86, max: 12, centreLab: 'players', otherClick: (ev, rest) => drill(ev, 'Other clubs', null, [...new Map(rest.flatMap((r) => r._ps).map((p) => [p.k, p])).values()]) }) : h('p', { class: 'note' }, 'Nobody.'));
    // 6. entry level vs peak quality
    const pk = ['U17', 'U20', 'U24', 'Senior'].map((lv) => { const L = P.filter((p) => p.entry === lv && p.peak != null); return { lv, n: L.length, q: d3.mean(L, (p) => p.peak), q70: L.filter((p) => p.peak >= 70).length, L }; }).filter((d) => d.n);
    const peakCard = card('Entry level and peak quality', 'Highest season quality (2022+) reached by players who entered GB at each level. Players seen only before 2022 have no score and are left out. Click a bar for the players.',
      barChart(pk.map((d) => ({ x: `${d.lv} (${d.n})`, q: d.q, _ps: d.L })), [{ key: 'q', name: 'Average peak quality', color: C[0] }], { W: 460, H: 220, onClick: (d, k, ev) => drill(ev, 'Peak quality: entered at ' + d.x, null, d._ps) }),
      table(['Entry level', 'Players scored', 'Average peak quality', 'Peak 70+'], pk.map((d) => ({ cells: [d.lv, d.n, f0(d.q), `${d.q70} (${pct(d.q70 / d.n)})`] })), { num: [1, 2, 3] }));
    // 7. full table
    const tbl = card('Every GB player in the data', `${P.length} players. Click a heading to sort.`, sortTable(HEAD, P.map(prow), [2, 3, 6, 7, 8, 9]));
    box.replaceChildren(tiles1, h('div', { class: 'grid2' }, survCard, doingCard), popCard, h('div', { class: 'grid2' }, cohortCard, peakCard), clubCard, tbl);
  };
  draw();
  return [h('h1', null, 'GB programme'), h('p', { class: 'sub' }, 'What happens to the people who play for GB: who comes through the youth squads, who stays in the sport, where they play, and whether starting young says anything about how good they get. ', h('a', { href: '#/pathway' }, 'Pathway flow →'), ' · ', h('a', { href: '#/gb' }, 'Squads →')),
    ...[mpNote()].filter(Boolean), h('p', { class: 'note' }, 'Caveats: GB rosters before 2017 are often incomplete on ultimate-reference, club rosters before 2020 are thin, and quality scores exist only from 2022. "Left the sport" can also mean "played somewhere we don\'t see".'),
    card(null, null, ctl), box];
};

ROUTES.gc = async (arg) => {
  const [id, want] = String(arg).split('/'); const P = await getJSON('gc/' + enc(id) + '.json'); const C = COL(); const cs = P.cycles;
  const plink = (p) => h('a', { href: '#/p/' + enc(p.k) }, p.n);
  const evName = (x, w) => x ? `${w ? 'Worlds' : 'Euros'} ${x.year}` : null;
  const out = [h('h1', null, P.name + (P.paired ? ' — cycles' : '')), MP ? h('p', { class: 'note mpnote' }, 'The FMP / MMP switch does not apply to cycle summaries yet: this page shows the whole squad.') : null, h('p', { class: 'sub' }, P.paired ? 'Each cycle is a Euros followed by the next Worlds. Players on either roster count as part of that cycle’s squad.' : 'Each edition is its own cycle.', ' ', h('a', { href: '#/gb' }, '← all GB squads'))];
  // summary table
  out.push(card('Cycle by cycle', 'Where the squad came from: carried over from the previous cycle, back after missing a cycle, or new to this programme (some new players had played another GB division or U24 first).',
    table(['Cycle', 'Euros', 'Worlds', 'Squad', 'Both events', 'Euros only', 'Worlds only', 'From last cycle', 'Returning', 'New', 'Kept into next'],
      cs.map((c) => ({ cells: [c.label + (c.note ? ' *' : ''), c.euros ? `${ord(c.euros.place)} (${c.euros.n})` : '—', c.worlds ? `${ord(c.worlds.place)} (${c.worlds.n})` : (c.note ? 'cancelled' : '—'), c.n, P.paired ? c.both : '—', P.paired ? c.e_only : '—', P.paired ? c.w_only : '—', c.carried, c.returning, `${c.new}${c.from_other || c.from_u24 ? ` (${[c.from_other ? c.from_other + ' other div' : '', c.from_u24 ? c.from_u24 + ' ex-U24' : ''].filter(Boolean).join(', ')})` : ''}`, c.kept_next ?? '—'] })), { num: [3, 4, 5, 6, 7, 8, 10] }),
    cs.some((c) => c.note) ? h('p', { class: 'note' }, '* ' + cs.filter((c) => c.note).map((c) => c.label + ': ' + c.note).join('; ')) : null,
    cs.some((c) => (c.euros && !c.euros.n)) ? h('p', { class: 'note' }, 'No roster found for: ' + cs.filter((c) => c.euros && !c.euros.n).map((c) => 'Euros ' + c.euros.year).join(', ') + ' (placing only).') : null));
  out.push(card('Where each squad came from', null, barChart(cs.map((c) => ({ x: c.label, carried: c.carried, returning: c.returning, other: c.from_other, u24: Math.max(0, c.from_u24 - 0), fresh: Math.max(0, c.new - c.from_other - c.from_u24) })),
    [{ key: 'carried', name: 'From last cycle', color: C[0] }, { key: 'returning', name: 'Back after a gap', color: C[5] }, { key: 'other', name: 'New here, from another GB division', color: C[3] }, { key: 'u24', name: 'New here, ex-U24', color: C[1] }, { key: 'fresh', name: 'Brand new', color: C[7] }], { W: 1000, H: 240 }),
    h('p', { class: 'note' }, 'Someone new who had played both another division and U24 is counted under “another GB division”.')));
  // cohort carry-through matrix
  if (cs.length > 1) {
    const sets = cs.map((c) => new Set(c.players.map((p) => p.k)));
    out.push(card('How each squad carries through', 'Share of each cycle’s squad (row) who are also in a later cycle (column).',
      table(['Squad of', ...cs.map((c) => c.label)], cs.map((c, i) => ({ cells: [c.label + ` (${c.n})`, ...cs.map((d, j) => j <= i ? '' : (sets[i].size ? `${pct([...sets[i]].filter((k) => sets[j].has(k)).length / sets[i].size)} (${[...sets[i]].filter((k) => sets[j].has(k)).length})` : '—'))] })), { num: cs.map((_, j) => j + 1) })));
  }
  // presence grid: every player x every event
  const cols = cs.flatMap((c) => [c.euros && `${c.euros.year} E`, c.worlds && `${c.worlds.year} W`].filter(Boolean));
  const all = new Map();
  cs.forEach((c) => c.players.forEach((p) => { const r = all.get(p.k) || { p, cells: {}, first: c.start, n: 0 }; r.n++;
    if (p.e) r.cells[`${c.euros.year} E`] = { color: C[0], tip: [p.n, `Euros ${c.euros.year}${p.ce ? ' · ' + p.ce : ''}`] };
    if (p.w) r.cells[`${c.worlds.year} W`] = { color: C[2], tip: [p.n, `Worlds ${c.worlds.year}${p.cw ? ' · ' + p.cw : ''}`] };
    all.set(p.k, r); }));
  const grid = [...all.values()].sort((a, b) => a.first - b.first || b.n - a.n || a.p.n.localeCompare(b.p.n));
  out.push(card('Who played when', `${grid.length} players across ${cs.length} cycles. E = Euros, W = Worlds. Hover a square for their club at the time; click a name for the profile.`,
    presenceGrid(grid.map((r) => ({ label: r.p.n, go: '#/p/' + enc(r.p.k), cells: r.cells })), cols, { W: 1000 }), legend([['Euros', C[0]], ['Worlds', C[2]]])));
  // one cycle in detail
  const _wi = cs.findIndex((c) => String(c.label) === want); const sel = h('select', null, cs.map((c, i) => h('option', { value: i, selected: i === (_wi >= 0 ? _wi : cs.length - 1) ? true : null }, c.label)));
  const box = h('div');
  const routeWord = (p) => p.route === 'carried' ? 'from last cycle' : p.route === 'returning' ? 'back after a gap' : p.other ? 'new · was ' + p.other.replace(/^GB /, '') : p.u24 ? 'new · ex-U24 ' + p.u24 : p.jun ? 'new · ex-junior ' + p.jun : 'new';
  const list = (ps, club) => ps.length ? h('ul', { class: 'plist' }, ps.map((p) => h('li', null, plink(p), h('span', { class: 'muted' }, ` · ${club(p) || 'club unknown'} · ${routeWord(p)}`)))) : h('p', { class: 'note' }, 'Nobody.');
  const show = () => { const c = cs[+sel.value];
    const both = c.players.filter((p) => p.e && p.w), eo = c.players.filter((p) => p.e && !p.w), wo = c.players.filter((p) => p.w && !p.e);
    box.replaceChildren(
      tiles([['Euros', c.euros ? ord(c.euros.place) : '—', c.euros ? c.euros.event : ''], ['Worlds', c.worlds ? ord(c.worlds.place) : (c.note ? 'cancelled' : '—'), c.worlds ? c.worlds.event : c.note], ['Squad', c.n, P.paired ? `${c.both} on both rosters` : ''], ['From last cycle', c.carried, `${c.returning} back after a gap`], ['New', c.new, [c.from_other ? c.from_other + ' from another division' : '', c.from_u24 ? c.from_u24 + ' ex-U24' : ''].filter(Boolean).join(' · ')], ['Kept into next', c.kept_next ?? '—', c.kept_next != null ? pct(c.kept_next / c.n) + ' of this squad' : 'no later cycle yet']]),
      P.paired ? h('div', { class: 'grid3' },
        card(`Euros only (${eo.length})`, 'Not in the Worlds squad.', list(eo, (p) => p.ce)),
        card(`Both (${both.length})`, 'The core of the cycle.', list(both, (p) => p.ce || p.cw)),
        card(`Worlds only (${wo.length})`, 'Added after the Euros.', list(wo, (p) => p.cw))) : card('Squad', null, list(c.players, (p) => p.ce || p.cw)),
      card('Clubs they came from', 'Club at the time of the event (from rosters that year). Click a slice for the players.', c.clubs.length ? donut(c.clubs.map(([t, n]) => ({ label: t, v: n, onclick: (ev) => { const L = c.players.filter((p) => (p.ce || p.cw) === t); showDrill(anchorOf(ev), { title: `${c.label}: from ${t}`, head: ['Player', 'Route into the squad'], num: [], rows: L.map((p) => ({ cells: [plink(p), routeWord(p)], sv: [p.n] })) }); } })), { W: 620, centreLab: 'players', max: 10 }) : h('p', { class: 'note' }, 'No club data for this cycle.'))); };
  sel.onchange = show; show();
  out.push(h('h2', { style: 'margin-top:18px' }, 'One cycle in detail'), h('div', { class: 'controls' }, h('span', { class: 'muted' }, 'Cycle:'), sel), box);
  return out;
};
const gbDrill = (ev, title, L) => showDrill(anchorOf(ev), { title, head: ['Player', 'Club then', 'GB squad no.', 'GB squads in total'], num: [2, 3], rows: L.map((r) => ({ cells: [playerLink(r.known ? r.k : 'h:' + r.k, r.n), r.club || '—', ord(r.caps), r.total ?? '—'], sv: [r.n, r.club, r.caps, r.total] })) });
ROUTES.g = async (arg) => {
  const [id, yr] = arg.split('/'); const L = await getJSON('g/' + enc(id) + '.json'); const C = COL(); await mpMap();
  const E = L.editions.map((e) => ({ ...e, R: (e.roster || []).filter((r) => mpPass(r.known ? r.k : 'h:' + r.k)) }));
  const hist = new Map(); const all = await Promise.all((await index()).gb.filter((g) => g.lvl !== 'zz').map((g) => getJSON('g/' + enc(g.id) + '.json')));
  all.forEach((l) => l.editions.forEach((e) => (e.roster || []).forEach((r) => { if (!hist.has(r.k)) hist.set(r.k, []); hist.get(r.k).push({ y: e.year, t: e.team }); })));
  E.forEach((e, i) => { const prev = i ? new Set(E[i - 1].R.map((r) => r.k)) : null; e.back = prev ? e.R.filter((r) => prev.has(r.k)).length : null; e.ret = prev && e.R.length ? e.back / e.R.length : null;
    e.exp = [0, 0, 0, 0]; e.expL = [[], [], [], []]; e.R.forEach((r) => { const b = (hist.get(r.k) || []).filter((x) => x.y < e.year).length; e.exp[Math.min(3, b)]++; e.expL[Math.min(3, b)].push(r); });
    const before = new Set(E.slice(0, Math.max(0, i - 1)).flatMap((x) => x.R.map((r) => r.k))); e.cont = prev ? e.R.filter((r) => prev.has(r.k)) : []; e.gap = e.R.filter((r) => !(prev && prev.has(r.k)) && before.has(r.k)); e.newc = e.R.filter((r) => !(prev && prev.has(r.k)) && !before.has(r.k)); });
  const pl = E.filter((e) => e.place), best = d3.min(pl, (e) => e.place), allP = new Set(E.flatMap((e) => e.R.map((r) => r.k)));
  const sel = E.find((e) => String(e.year) === yr) || E[E.length - 1];
  const kindOf = (t) => /U17/.test(t) ? 'U17' : /U20/.test(t) ? 'U20' : /U24/.test(t) ? 'U24' : /Beach/.test(t) ? 'Beach' : /Master/.test(t) ? 'Masters' : /Indoor/.test(t) ? 'Indoor' : 'Senior';
  const mine = kindOf(L.team), KINDS = ['U17', 'U20', 'U24', 'Senior', 'Beach', 'Indoor', 'Masters'].filter((k) => k !== mine);
  const pt = E.map((e) => { const o = { year: e.year, n: e.R.length }; KINDS.forEach((k) => { o[k] = e.R.filter((r) => (hist.get(r.k) || []).some((x) => x.y < e.year && kindOf(x.t) === k)).length; }); return o; });
  const used = KINDS.filter((k) => pt.some((p) => p[k]));
  const prog = ((await index()).gbc || []).find((c) => (c.lines || []).includes(id));
  if (!allP.size) return [h('h1', null, L.team), h('p', { class: 'sub' }, prog ? h('a', { class: 'btn', href: '#/gc/' + enc(prog.id) }, 'See ' + prog.n + ' by cycle →') : null),
    card('Results only', 'No roster has been found for this squad yet, so only its finishes are shown. A squad list (screenshot or link) would fill in the rest.',
      sortTable(['Year', 'Squad', 'Finish'], E.map((e) => ({ cells: [e.year, e.team || L.team, e.place ? ord(e.place) : '—'], sv: [e.year, null, e.place] })), [0, 2]))];
  const out = [h('h1', null, L.team), h('p', { class: 'sub' }, `${E.length} editions, ${E[0].year}–${E[E.length - 1].year}. Rosters before 2017 are often incomplete on ultimate-reference.com.`, prog ? [' ', h('a', { class: 'btn', href: '#/gc/' + enc(prog.id) }, 'See ' + prog.n + ' by cycle →')] : null),
    tiles([['Editions', E.length], ['Players used', allP.size], ['Best finish', ord(best), (() => { const n = pl.filter((e) => e.place <= 3).length; return n + (n === 1 ? ' medal' : ' medals'); })()], ['Carried over', E.some((e) => e.ret != null) ? pct(d3.mean(E.filter((e) => e.ret != null), (e) => e.ret)) : '—', 'average share of a squad who were in the one before']]),
    h('div', { class: 'grid3' },
      card('Finish', null, lineChart([{ name: 'Finish', color: C[0], pts: pl.map((e) => ({ x: e.year, y: e.place, fill: MEDAL(e.place), r: e.place <= 3 ? 6 : 4, tip: [e.team + ' ' + e.year, ord(e.place)], go: '#/g/' + enc(id) + '/' + e.year })) }], { W: 360, yDomain: [Math.max(4, d3.max(pl, (e) => e.place) || 4), 1], yFmt: (v) => Number.isInteger(v) ? ord(v) : '', legend: false })),
      card('Carried over from the squad before', 'Each squad split by who was in the previous one, who came back after a gap, and who was new to this squad. Click a bar for the players.', barChart(E.map((e) => ({ x: e.year, a: e.cont.length, b: e.gap.length, c: e.newc.length })), [{ key: 'a', name: 'In the squad before', color: C[0] }, { key: 'b', name: 'Back after a gap', color: C[5] }, { key: 'c', name: 'New to this squad', color: C[2] }], { W: 360, onClick: (d, k, ev) => { const e = E.find((x) => x.year === d.x); const L = { a: e.cont, b: e.gap, c: e.newc }[k.key]; gbDrill(ev, `${e.team} ${e.year}: ${{ a: 'in the squad before', b: 'back after a gap', c: 'new to this squad' }[k.key]}`, L); } })),
      card('GB experience in the squad', 'How many GB squads (any kind) each player had been in before this one. Click a bar for the players.', barChart(E.map((e) => ({ x: e.year, a: e.expL[0].length, b: e.expL[1].length, c: e.expL[2].length, d: e.expL[3].length })), [['a', 'First GB squad', C[2]], ['b', '2nd', C[0]], ['c', '3rd', C[5]], ['d', '4th+', C[1]]].map(([k, n, c]) => ({ key: k, name: n, color: c })), { W: 360, onClick: (d, k, ev) => { const e = E.find((x) => x.year === d.x); gbDrill(ev, `${e.team} ${e.year}: ${{ a: 'first GB squad', b: '2nd GB squad', c: '3rd GB squad', d: '4th+ GB squad' }[k.key]}`, e.expL['abcd'.indexOf(k.key)]); } })))];
  // GB squad success, two ways: (1) results (Finish above) and (2) what happened to the players next
  const AFT = [['Stayed at the same club', C[0]], ['Moved to a stronger club', C[2]], ['Moved to a similar club', C[5]], ['Moved to a weaker club', C[1]], ['Moved club (strength unknown)', C[7]], ['Still playing (GB only)', C[3]], ['Not seen playing', css('--axis')], ['Too recent to tell', css('--grid')]];
  const aftRows = (e, st) => e.R.filter((r) => r.after === st);
  const aftDrill = (ev, e, st) => showDrill(anchorOf(ev), { title: `${e.team} ${e.year}: ${st.toLowerCase()}`, note: 'The three seasons after the squad. Club strength is the results-based team rating on a 0–100 scale (UK average 50).', head: ['Player', 'Club then', 'Club strength then', 'Clubs in the next 3 seasons', 'Best new-club strength'], num: [2, 4],
    rows: aftRows(e, st).map((r) => ({ cells: [playerLink(r.known ? r.k : 'h:' + r.k, r.n), r.club || '—', f0(r.club_lvl), r.after_clubs || '—', f0(r.after_lvl)], sv: [r.n, r.club, r.club_lvl, r.after_clubs, r.after_lvl] })) });
  const kept = (e) => { const a = e.after || {}, n = d3.sum(Object.entries(a).filter(([k]) => k !== 'Too recent to tell'), ([, v]) => v); return n ? 1 - (a['Not seen playing'] || 0) / n : null; };
  out.push(h('div', { class: 'grid2' },
    card('After the squad: who kept playing, and where', 'For each squad, what players did in the three seasons after: stayed at the same club, moved to a different club (stronger, similar or weaker, by results-based club strength), kept playing only for GB, or weren’t seen playing anywhere in the data. Before about 2020 the club rosters are thin, so “not seen” is overstated. Click a bar for the players.',
      barChart(E.map((e) => Object.assign({ x: e.year }, ...AFT.map(([k], i) => ({ ['a' + i]: (e.after || {})[k] || 0 })))), AFT.map(([k, c], i) => ({ key: 'a' + i, name: k, color: c })), { W: 520, onClick: (d, k, ev) => { const e = E.find((x) => x.year === d.x); aftDrill(ev, e, AFT[+k.key.slice(1)][0]); } }),
      finding(E.filter((e) => kept(e) != null).slice(-3).map((e) => `${e.year}: ${pct(kept(e))} kept playing`).join(' · ') || 'Too recent to tell.', 'flat')),
    card('Squad strength', 'Average strength of the clubs the players were on that year (results-based, 0–100, UK average 50) average player Quality and Results quality, and average career Standing (2022+ scores only). Hover a point for how many players it covers.',
      lineChart([{ name: 'Club strength', color: C[0], w: 2.5, bridge: true, pts: E.filter((e) => e.club_strength != null).map((e) => ({ x: e.year, y: e.club_strength, tip: [`${e.team} ${e.year}`, `average club strength ${f0(e.club_strength)} (${e.club_strength_n} of ${e.R.length} players with a rated club)`] })) },
        { name: 'Player quality', color: C[5], w: 2, bridge: true, pts: E.filter((e) => e.quality != null).map((e) => ({ x: e.year, y: e.quality, tip: [`${e.team} ${e.year}`, `average player Quality ${f0(e.quality)}`] })) },
        { name: 'Results quality', color: C[2], w: 2, dash: '5 3', bridge: true, pts: E.filter((e) => e.quality_r != null).map((e) => ({ x: e.year, y: e.quality_r, tip: [`${e.team} ${e.year}`, `average Results quality ${f0(e.quality_r)}`] })) },
        { name: 'Squad standing', color: C[3], w: 2, bridge: true, pts: E.filter((e) => e.standing != null).map((e) => ({ x: e.year, y: e.standing, tip: [`${e.team} ${e.year}`, `average career Standing ${f0(e.standing)}`] })) }], { W: 520, yDomain: [0, 100], xs: E.map((e) => e.year) }))));
  if (used.length) out.push(card('Where the players came through', 'How many players in each edition had already been in each other kind of GB squad (a player can count in more than one column). Darker = bigger share of the squad. Click a cell for the players.', h('div', { class: 'tbox' }, heatGrid(pt.map((p) => ({ label: String(p.year), p })), used, (r, k) => { const e = E.find((x) => x.year === r.p.year); const L = e.R.filter((x) => (hist.get(x.k) || []).some((z) => z.y < e.year && kindOf(z.t) === k)); return { v: L.length, share: L.length / (r.p.n || 1), tip: [`${e.team} ${e.year}`, `${L.length} of ${r.p.n} had played ${k}`], onclick: (ev) => gbDrill(ev, `${e.team} ${e.year}: had played ${k}`, L) }; }, { fmt: (d) => `${d.v} · ${Math.round(100 * d.share)}%` }))));
  // the selected edition
  const clubs = d3.rollups(sel.R.filter((r) => r.club), (v) => v, (r) => r.club).sort((a, b) => b[1].length - a[1].length); const v_of = (c) => (clubs.find(([x]) => x === c) || [0, []])[1];
  const edSel = h('select', { onchange: (e) => { location.hash = '#/g/' + enc(id) + '/' + e.target.value; } }, E.slice().reverse().map((e) => h('option', { value: e.year, selected: e === sel || null }, `${e.year} — ${e.place ? ord(e.place) : 'no placing'}`)));
  out.push(card(`${sel.team} ${sel.year}`, sel.event + (sel.place ? ' · finished ' + ord(sel.place) : ''), h('div', { class: 'controls' }, edSel),
    tiles([['Players', sel.R.length], ['First GB squad', sel.R.filter((r) => r.caps === 1).length], ['Average squads', sel.R.length ? f1(d3.mean(sel.R, (r) => r.caps)) : '—', 'GB squads per player, this one included'], ['Roster quality', f0(sel.quality), 'average club-season quality (2022+)'], ['Squad standing', f0(sel.standing), 'average career standing at the time']]),
    h('div', { class: 'grid2' }, h('div', null, h('h3', null, 'Clubs at the time'), clubs.length ? donut(clubs.map(([c, v]) => ({ label: c, v: v.length, tip: [c, v.map((r) => r.n).join(', ')], onclick: (ev) => gbDrill(ev, `${sel.team} ${sel.year}: from ${c}`, v) })), { W: 520, centreLab: 'players', max: 9, otherClick: (ev, rest) => gbDrill(ev, `${sel.team} ${sel.year}: other clubs`, rest.flatMap((d) => v_of(d.label))) }) : h('p', { class: 'note' }, 'Clubs are known where the player has a club roster that season.')),
      h('div', null, h('h3', null, 'Roster'), table(['Player', 'Club then', 'Quality', 'Results quality', 'Standing', 'GB squad no.', 'Total'], sel.R.map((r) => ({ go: '#/p/' + enc(r.known ? r.k : 'h:' + r.k), cells: [r.n, r.club || '—', f0(r.q), f0(r.qr), f0(r.st), ord(r.caps), r.total] })), { num: [2, 3, 4, 5, 6], max: '26rem' })))));
  // who played when
  const P = [...allP].map((k) => { const ed = E.filter((e) => e.R.some((r) => r.k === k)); const r0 = ed[0].R.find((r) => r.k === k); return { k, n: r0.n, known: r0.known, ed, first: ed[0].year }; }).sort((a, b) => a.first - b.first || b.ed.length - a.ed.length || a.n.localeCompare(b.n));
  out.push(card('Who played when', P.length + ' players. Lighter = their first GB squad.', h('div', { class: 'tbox', style: 'max-height:36rem' }, presenceGrid(P.map((p) => ({ label: p.n, go: '#/p/' + enc(p.known ? p.k : 'h:' + p.k), cells: Object.fromEntries(p.ed.map((e) => { const r = e.R.find((x) => x.k === p.k); return [e.year, { color: C[0], op: r.caps === 1 ? 0.45 : 1, tip: [p.n + ' · ' + e.year, (r.club ? r.club + ' · ' : '') + (r.caps === 1 ? 'first GB squad' : ord(r.caps) + ' GB squad')] }]; })) })), E.map((e) => e.year)))));
  return out;
};

// ---------- events ----------
ROUTES.events = async () => {
  const I = await index();
  return [h('h1', null, 'Events'), h('p', { class: 'sub' }, 'Pick a competition to see every UK team’s finish over the years, or one year’s standings.'),
    card(null, null, table(['Competition', 'Results', 'Years'], I.comps.map((c) => ({ go: '#/e/' + enc(c.id), cells: [c.n, c.c, `${c.y0}–${c.y1}`] })), { num: [1] }))];
};
ROUTES.e = async (arg) => {
  const [id, yr] = arg.split('/'); const E = await getJSON('e/' + enc(id) + '.json'); const C = COL(); const I = await index();
  const tid = new Map(I.teams.map((t) => [t.n + '|' + t.d, t.id]));
  const divs = [...new Set(E.results.map((r) => String(r.division)))].sort();
  const st = { d: divs.includes('Open') ? 'Open' : divs[0], y: yr || '', sub: '' }; const box = h('div'), medBox = h('div');
  // competitions with several separate events in one season (North / South regionals...): each is its own event, shown side by side
  const subOf = (r) => String(r.event).replace(/\b20\d\d\b/g, '').replace(/^\s*(UKU|UK)\s+/, '').replace(/^(Regionals|Qualifier|Regionals \/ Qualifier)\s*/i, '').trim() || 'Main';
  const subs = (() => { const per = d3.rollups(E.results, (v) => new Set(v.map(subOf)).size, (r) => r.year, (r) => r.division); const multi = per.some(([, ds]) => ds.some(([, n]) => n > 1)); const all = [...new Set(E.results.map(subOf))]; return multi && all.length <= 8 ? all.sort() : []; })();
  const sbox = h('select', { onchange: (e) => { st.sub = e.target.value; draw(); } });
  const draw = () => {
    const RA0 = E.results.filter((r) => String(r.division) === st.d), RA = st.sub && st.sub !== '*' ? RA0.filter((r) => subOf(r) === st.sub) : RA0, R = RA.filter((r) => !r.ov);
    sbox.hidden = !subs.length; if (subs.length) sbox.replaceChildren(h('option', { value: '', selected: !st.sub || null }, 'Each event side by side'), h('option', { value: '*', selected: st.sub === '*' || null }, 'All events combined'), ...subs.filter((x) => RA0.some((r) => subOf(r) === x)).map((x) => h('option', { value: x, selected: st.sub === x || null }, x)));
    const best = d3.rollups(R, (v) => v.slice().sort((a, b) => (a.place || 999) - (b.place || 999))[0], (r) => r.team, (r) => r.year);
    const yrs = [...new Set(R.map((r) => r.year))].sort((a, b) => a - b);
    ys.replaceChildren(h('option', { value: '' }, 'All years'), ...yrs.slice().reverse().map((y) => h('option', { value: y, selected: String(y) === st.y || null }, y)));
    if (!st.y && subs.length && !st.sub) {   // side by side: one chart per event, so two winners in one season are both visible
      const parts = subs.filter((x) => R.some((r) => subOf(r) === x));
      box.replaceChildren(h('div', { class: parts.length > 1 ? 'grid2' : '' }, parts.map((x) => { const Rx = R.filter((r) => subOf(r) === x), yx = [...new Set(Rx.map((r) => r.year))].sort((a, b) => a - b);
        const bx = d3.rollups(Rx, (v) => v.slice().sort((a, b) => (a.place || 999) - (b.place || 999))[0], (r) => r.team, (r) => r.year).sort((a, b) => b[1].length - a[1].length).slice(0, 8);
        const mx = Math.max(4, d3.max(bx.flatMap(([, v]) => v.map(([, r]) => r.place || 1))) || 4);
        return h('div', null, h('h3', null, x + ` (${yx.length} season${yx.length === 1 ? '' : 's'})`), lineChart(bx.map(([t, v], i) => ({ name: t, color: C[i % 8], pts: v.map(([y, r]) => ({ x: y, y: r.place, r: r.place <= 3 ? 6 : 3.5, fill: MEDAL(r.place), tip: [t + ' · ' + y, `${r.event}: ${ord(r.place)}${r.field ? ' of ' + r.field : ''}`], go: '#/e/' + enc(id) + '/' + y })).filter((p) => p.y) })), { xs: yx, W: 560, H: 260, labels: true, yScale: d3.scaleLog, yDomain: [mx, 1], yAxis: d3.axisLeft(d3.scaleLog([mx, 1], [234, 12])).tickValues([1, 2, 3, 5, 10, 20].filter((v) => v <= mx)).tickFormat(ord) })); })),
        h('p', { class: 'note' }, 'Each event is its own chart, so teams that win different events in the same season are all visible. Pick one event, or all combined, above.'));
    } else if (!st.y) {
      const teams = best.map(([t, v]) => ({ t, pts: v.map(([y, r]) => ({ x: y, y: r.place, r: r.place <= 3 ? 6 : 3.5, fill: MEDAL(r.place), tip: [t + ' · ' + y, `${r.event}: ${ord(r.place)}${r.field ? ' of ' + r.field : ''}`, r.players ? r.players + ' players' : ''].filter(Boolean), go: '#/e/' + enc(id) + '/' + y })).filter((p) => p.y).sort((a, b) => a.x - b.x) })).filter((d) => d.pts.length).sort((a, b) => b.pts.length - a.pts.length || d3.min(a.pts, (p) => p.y) - d3.min(b.pts, (p) => p.y)).slice(0, 10);
      const mx = Math.max(4, d3.max(teams.flatMap((d) => d.pts), (p) => p.y) || 4);
      box.replaceChildren(lineChart(teams.map((d, i) => ({ name: d.t, color: C[i % 8], pts: d.pts })), { xs: yrs, W: 1000, H: 320, labels: true, yScale: d3.scaleLog, yDomain: [mx, 1], yAxis: d3.axisLeft(d3.scaleLog([mx, 1], [294, 12])).tickValues([1, 2, 3, 5, 10, 20, 40].filter((v) => v <= mx)).tickFormat(ord) }),
        h('p', { class: 'note' }, 'Higher = better. Medal colours mark podiums. Click a point for that year’s standings. Showing the ' + teams.length + ' UK teams with the most finishes here.'));
    } else {
      const rows = RA.filter((r) => String(r.year) === st.y).sort((a, b) => String(a.event).localeCompare(String(b.event)) || (a.place || 999) - (b.place || 999));
      const multi = new Set(rows.map((r) => r.event)).size > 1;
      box.replaceChildren(table([...(multi ? ['Event'] : []), 'Place', 'Team', 'Players', 'Roster quality', 'GB players', 'Back from last year', 'Top players'],
        rows.map((r) => ({ go: tid.get(r.team + '|' + r.division) ? '#/t/' + enc(tid.get(r.team + '|' + r.division)) : null, cls: r.ov ? 'muted' : null, cells: [...(multi ? [r.event] : []), ord(r.place) + (r.field ? ' / ' + r.field : ''), r.ov ? h('span', { class: 'muted' }, r.team) : h('b', null, r.team), r.players ?? '—', f0(r.quality), r.gb_players ?? '—', pct(r.returning), r.top || ''] })), { max: '40rem' }));
    }
    const bt = best.map(([t, v]) => { const ps = v.map(([, r]) => r.place).filter(Boolean); return { t, g: ps.filter((p) => p === 1).length, pod: ps.filter((p) => p <= 3).length, n: v.length, yrs: R.filter((r) => r.team === t && r.place === 1).map((r) => r.year + (subs.length && st.sub !== '' && st.sub !== '*' ? '' : subs.length ? ' (' + subOf(r) + ')' : '')).sort().join(', '), g2: R.filter((r) => r.team === t && r.place === 1).length }; }).filter((d) => d.pod).sort((a, b) => b.g - a.g || b.pod - a.pod);
    medBox.replaceChildren(bt.length ? table(['Team', 'Titles', 'Podiums', 'Seasons with a result', 'Title years'], bt.map((d) => ({ go: tid.get(d.t + '|' + st.d) ? '#/t/' + enc(tid.get(d.t + '|' + st.d)) : null, cells: [d.t, d.g, d.pod, d.n, d.yrs] })), { num: [1, 2, 3] }) : h('p', { class: 'note' }, 'No UK podiums recorded.'));
  };
  const ys = h('select', { onchange: (e) => { st.y = e.target.value; draw(); } });
  const dv = h('select', { onchange: (e) => { st.d = e.target.value; draw(); } }, divs.map((d) => h('option', { value: d, selected: d === st.d || null }, d)));
  draw();
  return [h('h1', null, E.kind), h('p', { class: 'sub' }, 'Charts show UK teams. A single year shows the full standings where we have them (EUCS schedule site for 2023+ EUCS events; UK teams in bold). Years before 2022 come from ultimate-reference.com and UKU results.'), card(null, null, h('div', { class: 'controls' }, dv, sbox, ys), box), card('Titles and podiums', 'UK teams with a top-three finish here.', medBox)];
};

// ---------- drill-down: the players behind any bar, point, cell or row ----------
let DRX = null;
async function drill() {
  if (DRX) return DRX;
  const [d, I] = await Promise.all([getJSON('drill.json'), index()]);
  const pn = new Map(I.players.map((p) => [p.k, p]));
  const tm = (i) => d.teams[i] ?? '';
  const who = (i) => { if (typeof i === 'string') return { k: null, n: i }; const k = d.keys[i], e = pn.get(k); return { k, n: e ? e.n : String(k).replace(/^h:/, ''), now: e ? e.t : '', last: e ? e.y : null, gb: e ? e.gb : 0 }; };
  const ps = d.ps.map(([p, y, t, dv, q, nw, ev]) => ({ p, y, t: tm(t), dv, q, nw, ev }));
  const mv = d.mv.map(([p, y, f, t, dir, a, b, dl, ten, drop, gb, cross]) => ({ p, y, frm: tm(f), to: tm(t), dir: dir || '', a, b, dl, ten, drop, gb, cross }));
  const lv = d.lv.map(([p, y, t, dv, q, n, gb]) => ({ p, y, t: tm(t), dv, q, n, gb }));
  const hp = d.hp.map(([p, f, l, t, n]) => ({ p, f, l, t: tm(t), n }));
  const hr = d.hr.map(([p, y, t]) => ({ p, y, t: tm(t) }));
  const nat = d.nat.map(([y, dv, t, pl]) => ({ y, dv, t: tm(t), pl }));
  const eu = d.eu.map(([y, dv, t, pl]) => ({ y, dv, t: tm(t), pl }));
  const gbp = d.gbp.map(([sq, y, p, jr, club]) => ({ sq, y, p, jr, club }));
  const yrsOf = d3.rollup(ps, (v) => [...new Set(v.map((r) => r.y))].sort(), (r) => r.p);
  const tnorm = (s) => String(s).toLowerCase().replace(/\b(ultimate|club|ufc|the|open|mixed|women)\b/g, '').replace(/[^a-z0-9]/g, '');
  // who played for a team in a season: club rosters from 2022; before that, the rosters listed for European / world events
  const roster = (team, y, dv) => {
    let a = ps.filter((r) => r.t === team && r.y === y); if (dv && a.some((r) => r.dv === dv)) a = a.filter((r) => r.dv === dv);
    if (a.length || y >= 2022) return a;
    const n = tnorm(team); return hr.filter((r) => r.y === y && n && (tnorm(r.t) === n || tnorm(r.t).startsWith(n) || n.startsWith(tnorm(r.t)))).map((r) => ({ ...r, hist: 1 }));
  };
  DRX = { who, ps, mv, lv, hp, hr, nat, eu, gbp, yrsOf, roster, upTo: (p, y) => (yrsOf.get(p) || []).filter((x) => x <= y).length,
    tid: new Map(I.teams.map((t) => [t.n + '|' + t.d, t.id])), tidN: new Map(I.teams.map((t) => [t.n, t.id])) };
  return DRX;
}
const pcell = (w) => w.k ? playerLink(w.k, w.n) : w.n;
const nowOf = (w) => w.last ? `${w.now || '—'} (${w.last})` : '—';
const anchorOf = (ev) => { let n = ev && (ev.currentTarget instanceof Element ? ev.currentTarget : ev.target); while (n && n.parentElement && n.parentElement !== VIEW) n = n.parentElement; return n && n.parentElement === VIEW ? n : null; };
/** open a players panel under the section that was clicked. build(D) returns {title, note, head, rows:[{cells, sv}], num, sum, extra} */
function dr(ev, build) {
  const at = anchorOf(ev);
  drill().then((D) => showDrill(at, build(D))).catch((e) => { console.error(e); showDrill(at, { title: 'Couldn’t load the players', rows: [], empty: String(e.message || e) }); });
}
function sortTable(head, rows, num) {
  const st = { c: -1, dir: 1 }, wrap = h('div');
  const val = (r, i) => r.sv && r.sv[i] !== undefined && r.sv[i] !== null ? r.sv[i] : (r.cells[i] instanceof Node ? r.cells[i].textContent : r.cells[i]);
  const draw = () => {
    const R = st.c < 0 ? rows : rows.slice().sort((a, b) => { const x = val(a, st.c), y = val(b, st.c); if (x == null || x === '—') return 1; if (y == null || y === '—') return -1; return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * st.dir; });
    wrap.replaceChildren(table(head.map((c, i) => h('span', { class: 'sorth', title: 'Sort', onclick: () => { st.dir = st.c === i ? -st.dir : (num.includes(i) ? -1 : 1); st.c = i; draw(); } }, c, st.c === i ? (st.dir > 0 ? ' ▲' : ' ▼') : '')), R, { num, max: '32rem' }));
  };
  draw(); return wrap;
}
function showDrill(at, o) {
  VIEW.querySelectorAll('.drill').forEach((x) => x.remove());
  const rows = o.rows || [];
  const el = h('section', { class: 'card drill' },
    h('div', { class: 'drillhead' }, h('div', null, h('h2', null, o.title), o.note ? h('p', { class: 'note' }, o.note) : null), h('button', { class: 'btn', onclick: () => el.remove() }, 'Close ✕')),
    o.sum ? tiles(o.sum) : null, ...(o.extra || []),
    rows.length ? [sortTable(o.head, rows, o.num || []), h('p', { class: 'note' }, `${rows.length} row${rows.length === 1 ? '' : 's'}. Click a column heading to sort, a name for the profile.`)] : h('p', { class: 'note' }, o.empty || 'No players recorded for this.'));
  if (at) at.after(el); else VIEW.append(el);
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
const DIRW = { up: 'to a stronger team', level: 'similar level', down: 'to a weaker team', '': 'level unknown' };
const mvRows = (D, L, o = {}) => L.slice().sort((a, b) => b.y - a.y || (b.dl ?? -999) - (a.dl ?? -999)).map((m) => { const w = D.who(m.p);
  return { cells: [pcell(w), m.y, m.frm, m.to, f0(m.a), f0(m.b), sgn(m.dl), m.ten, ...(o.extra ? o.extra(m) : [])], sv: [w.n, m.y, null, null, m.a, m.b, m.dl, m.ten] }; });
const MVHEAD = ['Player', 'Into season', 'From', 'To', 'Old team level', 'New team level', 'Change', 'Seasons at old team'];
const lvRows = (D, L) => L.slice().sort((a, b) => (b.q ?? -1) - (a.q ?? -1)).map((r) => { const w = D.who(r.p);
  return { cells: [pcell(w), r.y, r.t || '—', r.dv || '—', f0(r.q), r.n, r.gb ? 'yes' : ''], sv: [w.n, r.y, null, null, r.q, r.n, r.gb] }; });
const LVHEAD = ['Player', 'Last season', 'Team that season', 'Division', 'Quality that season', 'Seasons in the data', 'Played GB'];
const playerSeasonRows = (D, L, y) => d3.groups(L, (r) => r.p).map(([p, rs]) => { const w = D.who(p), q = d3.max(rs, (r) => r.q), ev = d3.sum(rs, (r) => r.ev || 0);
  return { cells: [pcell(w), [...new Set(rs.map((r) => r.t))].join(', '), ev || '—', f0(q), D.upTo(p, y), w.gb ? w.gb : '', nowOf(w)], sv: [w.n, null, ev, q, D.upTo(p, y), w.gb, w.last] }; }).sort((a, b) => (b.sv[3] ?? -1) - (a.sv[3] ?? -1));
const PSHEAD = ['Player', 'Team', 'Events', 'Quality that season', 'Seasons 2022+ (to then)', 'GB squads', 'Latest team'];

// ---------- trends ----------
const finding = (txt, tone) => h('p', { class: 'finding ' + (tone || '') }, txt);
function scatter(pts, o = {}) {
  const W = o.W || 520, H = o.H || 300, m = { l: 44, r: 12, t: 12, b: 34 };
  const { box, svg } = svgBox(W, H);
  const x = d3.scaleLinear(o.xDomain || d3.extent(pts, (p) => p.x), [m.l, W - m.r]).nice(), y = d3.scaleLinear(o.yDomain || d3.extent(pts, (p) => p.y), [H - m.b, m.t]).nice();
  axes(svg, x, y, W, H, m, { xAxis: d3.axisBottom(x).ticks(5).tickFormat(o.xFmt || null), yAxis: d3.axisLeft(y).ticks(5).tickFormat(o.yFmt || null) });
  if (o.xLab) svg.append('text').attr('x', W - m.r).attr('y', H - 2).attr('text-anchor', 'end').text(o.xLab);
  if (o.yLab) svg.append('text').attr('x', m.l + 4).attr('y', m.t + 10).text(o.yLab);
  onTip(svg.append('g').selectAll('circle').data(pts).join('circle').attr('cx', (p) => x(p.x)).attr('cy', (p) => y(p.y)).attr('r', 4).attr('fill', (p) => p.color || COL()[0]).attr('fill-opacity', 0.65).style('cursor', (p) => p.go || p.onclick ? 'pointer' : null).on('click', (e, p) => { if (p.onclick) p.onclick(e); else if (p.go) location.hash = p.go; }), (p) => [...p.tip, ...(p.onclick ? [CLICK] : [])]);
  if (pts.length > 4) { const mx = d3.mean(pts, (p) => p.x), my = d3.mean(pts, (p) => p.y), b = d3.sum(pts, (p) => (p.x - mx) * (p.y - my)) / (d3.sum(pts, (p) => (p.x - mx) ** 2) || 1);
    const [x0, x1] = x.domain(); svg.append('line').attr('x1', x(x0)).attr('x2', x(x1)).attr('y1', y(my + b * (x0 - mx))).attr('y2', y(my + b * (x1 - mx))).attr('stroke', css('--muted')).attr('stroke-dasharray', '4 3'); }
  return box;
}
const change = (a, b) => b == null || a == null ? null : b - a;
// ---------- findings: what the data can and cannot say ----------
const GRADE = { strong: ['Strong', 'large n, clear gap, survives the obvious split'], suggestive: ['Suggestive', 'clear gap but small n or an obvious selection story'], weak: ['Weak', 'visible, but could be noise or selection'] };
function findingChart(ch, C) {
  const pf = (v) => v == null ? '—' : d3.format('.0%')(v);
  const fmtv = ch.yfmt === 'pct' ? pf : (v) => v == null ? '—' : d3.format('.1f')(v);
  if (ch.type === 'lines') return lineChart(ch.series.map((s, i) => ({ name: s.name, color: C[i % 8], w: s.w || 2, dash: s.dash ? '5 3' : null, pts: s.pts.filter((p) => p[1] != null).map((p) => ({ x: p[0], y: p[1], tip: [s.name + ' · ' + p[0], fmtv(p[1]) + (p[2] ? ` (n=${p[2]})` : '')] })) })), { W: 1000, H: 300, yDomain: ch.yfmt === 'pct' ? [0, 1] : null, yFmt: ch.yfmt === 'pct' ? d3.format('.0%') : null, legend: true, xLabel: ch.xlabel });
  if (ch.type === 'bars') return barChart(ch.rows.map((r) => Object.assign({ x: r.x }, ...ch.keys.map((k) => ({ [k.key]: r[k.key] })), { tip: r.n ? `n=${r.n}` : null })), ch.keys.map((k, i) => ({ key: k.key, name: k.name, color: C[i % 8] })), { W: 1000, H: 260, yFmt: ch.yfmt === 'pct' ? d3.format('.0%') : null, vFmt: ch.yfmt === 'pct' ? pf : null, stacked: false });
  if (ch.type === 'grouped') { const box = h('div', { class: ch.keys.length > 2 ? 'grid3' : 'grid2' }); ch.keys.forEach((k, i) => box.append(h('div', null, h('h3', null, k.name), barChart(ch.rows.map((r) => ({ x: r.x, v: r[k.key], tip: r.n ? `n=${(r.n || {})[k.key] ?? '—'}` : null })), [{ key: 'v', name: k.name, color: C[i % 8] }], { W: ch.keys.length > 2 ? 330 : 480, H: 220, yFmt: ch.yfmt === 'pct' ? d3.format('.0%') : null, vFmt: ch.yfmt === 'pct' ? pf : null })))); return box; }
  if (ch.type === 'hbars') return hbars(ch.rows.filter((r) => r.v != null).map((r, i) => ({ label: r.label, v: r.v, color: C[0], tip: [r.label, (ch.yfmt === 'pct' ? pf(r.v) : d3.format('.1f')(r.v)) + (r.n ? ` · n=${r.n}` : '') + (r.sub ? ' · ' + r.sub : '')] })), { W: 1000, labW: 400, maxLab: 62, fmt: ch.yfmt === 'pct' ? pf : d3.format('.1f') });
  if (ch.type === 'table') return table(ch.head, ch.rows.map((r) => ({ cells: r.map((v, i) => { const f = (ch.fmt || [])[i]; return f === 'pct' ? pf(v) : f === 'sgn' ? sgn1(v) : v == null ? '—' : v; }) })), { num: ch.head.map((_, i) => i).filter((i) => i > 0) });
  if (ch.type === 'scatter') { const gcol = (g) => ({ Senior: C[0], U24: C[1], Junior: C[2], Other: C[7] }[g] || C[0]);
    const sc = scatter(ch.pts.map((p, i) => ({ x: p[0], y: p[1], color: ch.groups ? gcol(ch.groups[i]) : C[0], tip: [p[2], `${ch.xlabel}: ${p[0]}`, `${ch.ylabel}: ${p[1]}`] })), { W: 1000, H: 340, xLab: ch.xlabel, yLab: ch.ylabel, yDomain: ch.flipy ? [d3.max(ch.pts, (p) => p[1]) + 1, 1] : null });
    if (ch.groups) sc.append(legend([...new Set(ch.groups)].map((g) => [g === 'Other' ? 'Beach / masters / indoor' : g, gcol(g), 'dot']))); return sc; }
  return null;
}
ROUTES.findings = async () => {
  const D = await getJSON('findings.json'); const C = COL();
  const st = { level: 'All' }; const list = h('div');
  const draw = () => { list.replaceChildren(...D.findings.filter((f) => st.level === 'All' || f.level === st.level).map((f) => {
    const g = GRADE[f.grade] || [f.grade, ''];
    const el = card(null, null,
      h('div', { class: 'fhead' }, h('span', { class: 'fgrade ' + f.grade, 'data-tip': JSON.stringify(['Evidence: ' + g[0], g[1]]) }, g[0]), h('span', { class: 'flevel' }, f.level + ' · ' + f.group), f.n ? h('span', { class: 'flevel' }, 'n = ' + d3.format(',')(f.n)) : null),
      h('h2', null, f.q),
      h('p', { class: 'fhyp' }, h('b', null, 'Hypothesis. '), f.hyp),
      h('p', { class: 'finding flat' }, h('b', null, 'What the data shows. '), f.result),
      findingChart(f.chart, C),
      f.lists ? h('div', { class: 'grid2' }, f.lists.gone_while_good ? h('div', null, h('h3', null, 'Gone while good: left in their best season (Quality 50+)'), table(['Player', 'Peak season', 'Peak Quality'], f.lists.gone_while_good.map(([k, n, y, q]) => ({ go: '#/p/' + enc(k), cells: [n, y, q] })), { num: [1, 2], max: '18rem' })) : null,
        f.lists.long_tail ? h('div', null, h('h3', null, 'Long tails: 2+ seasons past a 50+ peak'), table(['Player', 'Peak', 'Peak Quality', 'Last seen'], f.lists.long_tail.map(([k, n, y, q, l]) => ({ go: '#/p/' + enc(k), cells: [n, y, q, l] })), { num: [1, 2, 3], max: '18rem' })) : null) : null,
      h('details', { class: 'fmeta' }, h('summary', null, 'How it was measured, what could produce the same pattern, and what would settle it'),
        h('p', null, h('b', null, 'Method. '), f.method),
        h('p', null, h('b', null, 'Could also be explained by: ')), h('ul', null, f.confounds.map((c) => h('li', null, c))),
        h('p', null, h('b', null, 'Data that would settle it: ')), h('ul', null, f.gaps.map((c) => h('li', null, c)))));
    return el; })); };
  draw();
  return [h('h1', null, 'Findings'), h('p', { class: 'sub' }, `What the data can and cannot say about retention, careers, clubs and GB. Each finding is a question, a hypothesis, the test, the result and an honest grade. Built ${D.built} from seasons up to ${D.now}. Nothing here feeds player or team scores.`),
    card(null, null, h('div', { class: 'controls' }, h('div', { class: 'seg' }, ...['All', 'Community', 'Club', 'GB'].map((l) => h('button', { class: l === st.level ? 'on' : null, onclick: (e) => { st.level = l; e.target.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.target)); draw(); } }, l))),
      h('span', { class: 'note' }, 'Grades: ', ...Object.entries(GRADE).flatMap(([k, [n, d]], i) => [i ? ' · ' : '', h('span', { class: 'fgrade ' + k }, n), ' ' + d]))),
      h('details', null, h('summary', null, 'Definitions used throughout'), h('pre', { class: 'defs' }, D.defs))),
    list,
    card('Questions we cannot answer yet', 'Each of these is a standard question in participation and talent-development research. The data to answer it does not exist in what we hold; the right-hand column is what would.',
      table(['Question', 'Why not', 'What would answer it'], D.cannot.map((c) => ({ cells: [h('b', null, c.q), c.why, c.need] })))),
    card('Who to ask', 'The findings point at specific groups a short survey would learn most from. Each list is already on this site.',
      h('ul', null, h('li', null, h('b', null, 'Gone while good: '), 'players who left in their best season (list above under “Do players leave soon after their best season”). Ask why.'),
        h('li', null, h('b', null, 'Missed one season: '), 'a quarter come back, three quarters do not. Ask the ones who came back what brought them back, and the ones who did not what would.'),
        h('li', null, h('b', null, 'One-event players: '), 'half are never seen again. Ask at the event, not after.'),
        h('li', null, h('b', null, 'Moved to a weaker team: '), 'a quarter are gone the next season, against a tenth after a move up. Ask whether the move was the first step out or a way to keep playing.'),
        h('li', null, h('b', null, 'Division switchers: '), 'Open → Mixed and Mixed → Women both come with a Quality jump and high retention. Ask what made the switch work.')))];
};
ROUTES.trends = async () => {
  const T = await getJSON('trends.json'); const I = await index(); const C = COL(); const out = [h('h1', null, 'Trends'), h('p', { class: 'sub' }, 'What’s changing across UK club ultimate. Each chart comes with a plain reading of what it shows and how far to trust it. Click any bar, point or cell to see the players behind it.')];
  const tid = new Map(I.teams.map((t) => [t.n + '|' + t.d, t.id]));
  const teamBtn = (t, d) => { const id = tid.get(t + '|' + d) || I.teams.find((x) => x.n === t)?.id; return id ? h('a', { class: 'btn', href: '#/t/' + enc(id) }, t + ' team page →') : null; };
  // 1 players
  const P = T.players, y0 = P.years[0], y1 = P.years[P.years.length - 1];
  out.push(card('How many players are in the data', 'Players on a club roster at least once that season, by division, and how many appear for the first time. Click a bar or point for the players.',
    h('div', { class: 'grid2' }, barChart(P.years.map((y, i) => ({ x: y, Open: P.by_div.Open?.[i], Women: P.by_div.Women?.[i], Mixed: P.by_div.Mixed?.[i] })), [['Open', C[0]], ['Women', C[3]], ['Mixed', C[2]]].map(([k, c]) => ({ key: k, name: k, color: c })), { W: 520,
      onClick: (d, k, ev) => dr(ev, (D) => { const L = D.ps.filter((r) => r.y === d.x && r.dv === k.key); const R = playerSeasonRows(D, L, d.x);
        return { title: `${k.key} players in ${d.x}`, note: `Everyone on a ${k.key} club roster in ${d.x}, highest quality first.`, sum: [['Players', R.length], ['New to the data', new Set(L.filter((r) => r.nw).map((r) => r.p)).size], ['Teams', new Set(L.map((r) => r.t)).size]], head: PSHEAD, num: [2, 3, 4, 5], rows: R }; }) }),
      lineChart([{ name: 'New to the data', color: C[1], pts: P.years.map((y, i) => ({ x: y, y: P.new[i], onclick: (ev) => dr(ev, (D) => { const L = D.ps.filter((r) => r.y === y && r.nw);
        const R = d3.groups(L, (r) => r.p).map(([p, rs]) => { const w = D.who(p), ys = D.yrsOf.get(p) || [], q = d3.max(rs, (r) => r.q);
          return { cells: [pcell(w), [...new Set(rs.map((r) => r.t))].join(', '), [...new Set(rs.map((r) => r.dv))].join(', '), f0(q), ys.length, ys[ys.length - 1] > y ? 'yes, last ' + ys[ys.length - 1] : 'not yet' , nowOf(w)], sv: [w.n, null, null, q, ys.length, ys[ys.length - 1]] }; }).sort((a, b) => (b.sv[3] ?? -1) - (a.sv[3] ?? -1));
        return { title: `New to the data in ${y}`, note: `Players whose first club roster in the data is ${y}, and whether they played on after it.`, sum: [['New players', R.length], ['Played another season', R.filter((r) => r.sv[5] > y).length]], head: ['Player', 'Team', 'Division', 'Quality that season', 'Seasons in the data', 'Played on?', 'Latest team'], num: [3, 4], rows: R }; }) })) }], { W: 520, legend: false })),
    finding(`The count rises from ${P.total[0]} in ${y0} to ${P.total[P.total.length - 1]} in ${y1}. Most of that is better coverage (more events and roster posts collected for recent seasons), not necessarily more people playing, so read it as “how much we can see”. New players each year stay between ${d3.min(P.new.slice(1))} and ${d3.max(P.new.slice(1))} after 2022.`, 'flat')));
  // 2 nationals field
  const NF = T.nationals_field;
  const natDrill = (dv, y) => (ev) => dr(ev, (D) => { const L = D.nat.filter((r) => r.y === y && r.dv === dv).sort((a, b) => (a.pl ?? 99) - (b.pl ?? 99));
    const R = L.flatMap((t) => { const ro = D.roster(t.t, y, dv.split(' ')[0]); return ro.length ? d3.groups(ro, (r) => r.p).map(([p, rs]) => { const w = D.who(p), q = d3.max(rs, (r) => r.q);
      return { cells: [pcell(w), t.t, ord(t.pl), f0(q), rs[0].hist ? 'listed at a European/world event that year' : 'club roster', nowOf(w)], sv: [w.n, t.t, t.pl, q] }; }) : [{ cells: [h('span', { class: 'muted' }, 'no roster in the data'), t.t, ord(t.pl), '—', '', ''], sv: ['~', t.t, t.pl] }]; });
    return { title: `${dv} Nationals ${y}: the teams and their players`, note: y < 2022 ? 'Before 2022 we only have rosters for teams that also went to a European or world event that season, so most teams show no players.' : 'Players on each team’s roster that season (UKU didn’t publish Nationals rosters, so this is the squad we know of).', sum: [['Teams', L.length], ['Players we can name', new Set(R.filter((r) => r.sv[0] !== '~').map((r) => r.sv[0])).size]], head: ['Player', 'Team', 'Finish', 'Quality that season', 'Source', 'Latest team'], num: [2, 3], rows: R }; });
  out.push(card('Teams at UKU Nationals', 'Teams in each division’s Nationals (Division 1) each year. Click a point for the teams and players.', lineChart(Object.entries(NF.by_div).map(([d, v], i) => ({ name: d, color: /Open/.test(d) ? C[0] : /Women/.test(d) ? C[3] : /Mixed/.test(d) ? C[2] : C[i], pts: NF.years.map((y, j) => ({ x: y, y: v[j], onclick: natDrill(d, y) })) })), { W: 1000, H: 240, xs: d3.range(d3.min(NF.years), d3.max(NF.years) + 1) }),
    finding(Object.entries(NF.by_div).map(([d, v]) => `${d}: ${v[0]} teams in ${NF.years[0]}, ${v[v.length - 1]} in ${NF.years[NF.years.length - 1]}`).join('; ') + '. Mixed Nationals was open entry until 2011 (40+ teams), then a fixed Division 1 of 8; Open and Women went to 8-team Division 1s later. Gaps are years with no Nationals in the data (2018, and 2020–21 for Covid). So the field size reflects the format, not the size of the scene.', 'flat')));
  // 3 retention
  const RT = T.retention; const dr0 = change(RT.all[0], RT.all[RT.all.length - 1]);
  const retDrill = (Y) => (ev) => dr(ev, (D) => { const teamsY = new Set(D.ps.filter((r) => r.y === Y).map((r) => r.t));
    const prev = D.ps.filter((r) => r.y === Y - 1 && teamsY.has(r.t)); const seen = new Map();
    prev.forEach((r) => { const kk = r.p + '|' + r.t; if (!seen.has(kk)) seen.set(kk, r); });
    const R = [...seen.values()].map((r) => { const w = D.who(r.p), now = D.ps.filter((x) => x.p === r.p && x.y === Y), ys = D.yrsOf.get(r.p) || [];
      const st = now.some((x) => x.t === r.t) ? 'Stayed' : now.length ? 'Moved to ' + [...new Set(now.map((x) => x.t))].join(', ') : ys.some((x) => x > Y) ? `Not on a roster in ${Y} (back ${ys.find((x) => x > Y)})` : `Not seen in ${Y} or since`;
      return { cells: [pcell(w), r.t, st, f0(r.q), nowOf(w)], sv: [w.n, r.t, st, r.q], st }; }).sort((a, b) => a.sv[1].localeCompare(b.sv[1]) || a.st.localeCompare(b.st));
    const n = R.length, s = R.filter((r) => r.st === 'Stayed').length, m = R.filter((r) => r.st.startsWith('Moved')).length;
    return { title: `Who stayed into ${Y}`, note: `Every player on a ${Y - 1} roster of a team that also has a ${Y} roster, and where they were in ${Y}.`, sum: [['Stayed', `${s} (${pct(s / n)})`], ['Moved club', m], ['Not on a roster', n - s - m]], head: ['Player', `Team in ${Y - 1}`, `In ${Y}`, `Quality ${Y - 1}`, 'Latest team'], num: [3], rows: R }; });
  out.push(card('How many players stay with their team', 'Across all clubs: the share of last season’s roster that came back. Click a point for who stayed, moved or stopped.', lineChart([{ name: 'All clubs', color: C[0], pts: RT.years.map((y, i) => ({ x: y, y: RT.all[i], onclick: retDrill(y) })) }], { W: 1000, H: 220, yDomain: [0, 1], yFmt: pct, legend: false }),
    finding(`Retention runs between ${pct(d3.min(RT.all))} and ${pct(d3.max(RT.all))} a season, ${RT.years[RT.years.length - 1]} ${pct(RT.all[RT.all.length - 1])}. ` + (Math.abs(dr0) < 0.05 ? 'No clear trend: roughly two in five players move on or stop each year.' : dr0 > 0 ? 'Rosters are getting more stable.' : 'Rosters are turning over more.'), Math.abs(dr0) < 0.05 ? 'flat' : dr0 > 0 ? 'pos' : 'neg')));
  // 4 UK in Europe
  const EU = T.eucf; const per = (d, a, b) => (EU[d] || []).filter((x) => x.year >= a && x.year <= b);
  const euDrill = (dv, y) => (ev) => dr(ev, (D) => { const L = D.eu.filter((r) => r.y === y && r.dv === dv).sort((a, b) => a.pl - b.pl);
    const R = L.flatMap((t) => { const ro = D.roster(t.t, y, dv); return ro.length ? d3.groups(ro, (r) => r.p).map(([p, rs]) => { const w = D.who(p), q = d3.max(rs, (r) => r.q);
      return { cells: [pcell(w), t.t, ord(t.pl), f0(q), w.gb || '', nowOf(w)], sv: [w.n, t.t, t.pl, q, w.gb] }; }) : [{ cells: [h('span', { class: 'muted' }, 'no roster in the data'), t.t, ord(t.pl), '—', '', ''], sv: ['~', t.t, t.pl] }]; });
    return { title: `UK teams at EUCF ${y} (${dv})`, note: 'Each UK team’s players that season, with their finish.', extra: [h('div', { class: 'controls' }, h('a', { class: 'btn', href: '#/e/eucf/' + y }, 'EUCF ' + y + ' event page →'))], head: ['Player', 'Team', 'Finish', 'Quality that season', 'GB squads', 'Latest team'], num: [2, 3, 4], rows: R }; });
  const eu = h('div', { class: 'grid3' }, ['Open', 'Women', 'Mixed'].filter((d) => EU[d]).map((d, i) => h('div', null, h('h3', null, d),
    lineChart([{ name: 'Best UK finish', color: [C[0], C[3], C[2]][i], pts: EU[d].map((x) => ({ x: x.year, y: x.best, fill: MEDAL(x.best), r: x.best <= 3 ? 6 : 3.5, tip: [d + ' ' + x.year, x.names, x.teams + ' UK teams'], onclick: euDrill(d, x.year) })) }], { W: 360, H: 220, yDomain: [Math.max(8, d3.max(EU[d], (x) => x.best)), 1], yFmt: (v) => Number.isInteger(v) ? ord(v) : '', legend: false, xs: EU[d].map((x) => x.year) }))));
  const read = ['Open', 'Women', 'Mixed'].filter((d) => EU[d]).map((d) => { const a = per(d, 2010, 2019), b = per(d, 2021, 2026); const ga = a.filter((x) => x.best === 1).length, gb = b.filter((x) => x.best === 1).length;
    return `${d}: UK won ${ga} of ${a.length} EUCFs 2010–19 and ${gb} of ${b.length} since 2021 (best finish ${ord(d3.min(b, (x) => x.best))} recently)`; });
  out.push(card('UK clubs in Europe since 2010', 'Best UK finish at each European Club Finals (EUCF), by division. Medal colours mark podiums. Click a point for the UK teams and their players that year.', eu, finding(read.join('. ') + '.', 'flat')));
  // 5 nationals podiums
  const pod = T.nationals_podiums; const pyears = [...new Set(pod.map((p) => p.year))].sort();
  const teamDrill = (t, d, y, place, what) => (ev) => dr(ev, (D) => { const ro = D.roster(t, y, d);
    const R = d3.groups(ro, (r) => r.p).map(([p, rs]) => { const w = D.who(p), q = d3.max(rs, (r) => r.q), atClub = D.ps.filter((r) => r.p === p && r.t === t && r.y <= y).length;
      return { cells: [pcell(w), d3.sum(rs, (r) => r.ev || 0) || '—', f0(q), rs[0].hist ? '—' : atClub, w.gb || '', nowOf(w)], sv: [w.n, d3.sum(rs, (r) => r.ev || 0), q, atClub, w.gb] }; }).sort((a, b) => (b.sv[2] ?? -1) - (a.sv[2] ?? -1));
    return { title: `${t}, ${what}`, note: ro.some((r) => r.hist) ? 'No club roster for this season; these are the players listed for the club at a European or world event that year.' : `Players on ${t}’s ${y} roster.`, extra: [h('div', { class: 'controls' }, teamBtn(t, d))], head: ['Player', 'Events that season', 'Quality that season', 'Seasons at the club (2022+)', 'GB squads', 'Latest team'], num: [1, 2, 3, 4], rows: R, empty: `No roster for ${t} in ${y} in the data.` }; });
  out.push(card('Who wins at home', 'UKU Nationals podiums by division. Click a medal for that squad, or a team name to open it.', h('div', { class: 'grid3' }, ['Open', 'Women', 'Mixed'].map((d) => { const L = pod.filter((p) => p.division === d); const teams = [...new Set(L.map((p) => p.team))];
    return h('div', null, h('h3', null, d), medalGrid(teams.map((t) => ({ label: t, go: tid.get(t + '|' + d) ? '#/t/' + enc(tid.get(t + '|' + d)) : null, cells: Object.fromEntries(L.filter((p) => p.team === t).map((p) => [p.year, { place: p.place, onclick: teamDrill(t, d, p.year, p.place, `${ord(p.place)} at ${d} Nationals ${p.year}`) }])) })), pyears, { W: 360, labW: 150 })); })),
    finding(['Open', 'Women', 'Mixed'].map((d) => { const L = pod.filter((p) => p.division === d && p.place === 1); const w = d3.rollups(L, (v) => v.length, (p) => p.team).sort((a, b) => b[1] - a[1]); return `${d}: ${w.map(([t, n]) => `${t} ${n}`).join(', ')}`; }).join('. ') + ' (titles, 2022–26).', 'flat')));
  // 6 rising / falling
  const TT = T.team_trends; const top = TT.slice(0, 8), bot = TT.slice(-8).reverse();
  const trendDrill = (t) => (ev) => dr(ev, (D) => { const L = D.ps.filter((r) => r.t === t.team && r.dv === t.division);
    const R = d3.groups(L, (r) => r.p).map(([p, rs]) => { rs.sort((a, b) => a.y - b.y); const w = D.who(p), ys = rs.map((r) => r.y), qa = rs[0].q, qb = rs[rs.length - 1].q;
      return { cells: [pcell(w), ys.join(', '), ys.length, f0(qa), f0(qb), sgn(qa != null && qb != null && ys.length > 1 ? qb - qa : null), nowOf(w)], sv: [w.n, ys[0], ys.length, qa, qb, qa != null && qb != null && ys.length > 1 ? qb - qa : null] }; }).sort((a, b) => b.sv[2] - a.sv[2] || (b.sv[4] ?? -1) - (a.sv[4] ?? -1));
    const yrs = [...new Set(L.map((r) => r.y))].sort(); const per = yrs.map((y) => { const a = new Set(L.filter((r) => r.y === y).map((r) => r.p)), b = new Set(L.filter((r) => r.y === y - 1).map((r) => r.p)); return { x: y, kept: [...a].filter((p) => b.has(p)).length, new: [...a].filter((p) => !b.has(p)).length }; });
    return { title: `${t.team} (${t.division}): who played, 2022–26`, note: `Team level ${f0(t.first)} → ${f0(t.last)} over ${t.seasons} seasons. Each player’s seasons here and their quality in the first and latest of them.`, extra: [h('div', { class: 'controls' }, teamBtn(t.team, t.division)), barChart(per, [{ key: 'kept', name: 'Back from last season', color: C[0] }, { key: 'new', name: 'New to the roster', color: C[2] }], { W: 1000, H: 170 })],
      head: ['Player', 'Seasons', 'Count', 'First quality', 'Latest quality', 'Change', 'Latest team'], num: [2, 3, 4, 5], rows: R }; });
  out.push(card('Rising and falling clubs', 'Change in team level per season (100 = strongest UK team in the division), fitted across 2022–26, for clubs with 3+ seasons of results. Click a bar for the players.',
    h('div', { class: 'grid2' }, h('div', null, h('h3', null, 'Rising'), hbars(top.map((t) => ({ label: `${t.team} (${t.division})`, v: t.slope, color: C[2], onclick: trendDrill(t), tip: [t.team, `level ${f0(t.first)} → ${f0(t.last)} over ${t.seasons} seasons`] })), { W: 520, fmt: (v) => sgn(v) + '/yr' })),
      h('div', null, h('h3', null, 'Falling'), hbars(bot.map((t) => ({ label: `${t.team} (${t.division})`, v: t.slope, color: C[4], onclick: trendDrill(t), tip: [t.team, `level ${f0(t.first)} → ${f0(t.last)} over ${t.seasons} seasons`] })), { W: 520, fmt: (v) => sgn(v) + '/yr' }))),
    finding(`Biggest climbers: ${top.slice(0, 3).map((t) => t.team).join(', ')}. Biggest drops: ${bot.slice(0, 3).map((t) => t.team).join(', ')}. A falling level often follows heavy roster turnover; check the team page’s retention panel.`, 'flat')));
  // 7 turnover vs results
  const tp = T.turnover.points.filter((p) => p.returning_share != null && p.mean_percentile != null);
  const rho = (() => { const r = (a) => { const s = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]); const o = []; s.forEach(([, i], j) => { o[i] = j; }); return o; }; const a = r(tp.map((p) => p.returning_share)), b = r(tp.map((p) => p.mean_percentile)); const ma = d3.mean(a), mb = d3.mean(b); return d3.sum(a, (v, i) => (v - ma) * (b[i] - mb)) / Math.sqrt(d3.sum(a, (v) => (v - ma) ** 2) * d3.sum(b, (v) => (v - mb) ** 2)); })();
  const tsDrill = (p) => (ev) => dr(ev, (D) => { const ro = D.roster(p.team, p.year, p.division);
    const R = d3.groups(ro, (r) => r.p).map(([k, rs]) => { const w = D.who(k), q = d3.max(rs, (r) => r.q), last = D.ps.filter((r) => r.p === k && r.y === p.year - 1), ys = D.yrsOf.get(k) || [];
      const st = last.some((r) => r.t === p.team) ? 'Returning' : last.length ? 'From ' + [...new Set(last.map((r) => r.t))].join(', ') : ys[0] === p.year ? 'New to the data' : 'Back after a gap';
      return { cells: [pcell(w), st, d3.sum(rs, (r) => r.ev || 0) || '—', f0(q), nowOf(w)], sv: [w.n, st, d3.sum(rs, (r) => r.ev || 0), q], st }; }).sort((a, b) => (b.sv[3] ?? -1) - (a.sv[3] ?? -1));
    const c = (f) => R.filter(f).length;
    return { title: `${p.team} ${p.year}: who was back`, note: `${pct(p.returning_share)} of the roster returning; average finish percentile ${f0(p.mean_percentile)}.`, sum: [['Returning', c((r) => r.st === 'Returning')], ['From other clubs', c((r) => r.st.startsWith('From'))], ['New to the data', c((r) => r.st === 'New to the data')], ['Back after a gap', c((r) => r.st === 'Back after a gap')]], extra: [h('div', { class: 'controls' }, teamBtn(p.team, p.division))], head: ['Player', 'Status', 'Events', 'Quality that season', 'Latest team'], num: [2, 3], rows: R }; });
  out.push(card('Does keeping a roster together go with better results?', 'Each dot is a team-season: share of the roster back from last season vs average finish percentile. Click a dot for that squad.',
    h('div', { class: 'grid2' }, scatter(tp.map((p) => ({ x: p.returning_share, y: p.mean_percentile, color: [C[0], C[3], C[2]][['Open', 'Women', 'Mixed'].indexOf(p.division)], tip: [`${p.team} ${p.year}`, `${pct(p.returning_share)} back · finish percentile ${f0(p.mean_percentile)}`], onclick: tsDrill(p) })), { xFmt: pct, xLab: 'share of roster returning →', yLab: '↑ average finish percentile', xDomain: [0, 1], yDomain: [0, 100] }),
      h('div', null, h('h3', null, 'What goes with results'), table(['Roster measure', 'Result', 'Strength', 'Reading'], T.turnover.correlations.map((c) => ({ cells: [c.roster_metric, c.result, d3.format('+.2f')(c.spearman_rho), c.reading] }))), legend([['Open', C[0], 'dot'], ['Women', C[3], 'dot'], ['Mixed', C[2], 'dot']]))),
    finding(`Correlation ${d3.format('+.2f')(rho)} across ${tp.length} team-seasons: teams that keep more of their roster ${rho > 0.3 ? 'clearly' : rho > 0.1 ? 'tend to' : 'don’t clearly'} finish higher. It’s an association: strong teams also keep players because players want to stay.`, rho > 0.1 ? 'pos' : 'flat')));
  // 8 GB pipeline
  const GP = T.gb_pipeline; const lines = d3.groups(GP, (g) => g.team);
  const gbDrill = (g) => (ev) => dr(ev, (D) => { const L = D.gbp.filter((r) => r.sq === g.team && r.y === g.year);
    const R = L.map((r) => { const w = D.who(r.p); return { cells: [pcell(w), r.club || '—', r.jr ? 'yes' : 'no', r.jr || '—', nowOf(w)], sv: [w.n, r.club, r.jr ? 1 : 0, r.jr] }; }).sort((a, b) => b.sv[2] - a.sv[2] || a.sv[0].localeCompare(b.sv[0]));
    return { title: `${g.team} ${g.year}`, note: `${g.junior} of ${g.players} had played a GB U17 or U20 squad before.`, extra: [h('div', { class: 'controls' }, h('a', { class: 'btn', href: '#/g/' + enc(g.team.toLowerCase().replace(/[^a-z0-9]+/g, '-')) }, 'Squad page →'))], head: ['Player', 'Club then', 'Came through juniors', 'Junior squads before', 'Latest team'], num: [], rows: R }; });
  out.push(card('GB pathway: senior and U24 players who came through junior squads', ['Share of each squad who had played a GB U17 or U20 squad before. Rosters before about 2017 are incomplete, so early values are low partly for that reason. Click a point for the squad. ', h('a', { href: '#/pathway' }, 'Full pathway flow →')],
    lineChart(lines.map(([t, v], i) => ({ name: t.replace(/^GB /, ''), color: C[i % 8], pts: v.map((g) => ({ x: g.year, y: g.share, tip: [g.team + ' ' + g.year, `${g.junior} of ${g.players} had played U17/U20`], onclick: gbDrill(g) })) })), { W: 1000, H: 280, yDomain: [0, 1], yFmt: pct, labels: true }),
    finding(`Most recent: ${lines.map(([t, v]) => `${t.replace(/^GB /, '')} ${pct(v[v.length - 1].share)}`).slice(0, 6).join(', ')}. U24 squads draw much more on the junior programme than senior squads do.`, 'flat')));
  if (T.ratings && T.ratings.length) {
    const tidN = new Map(I.teams.map((t) => [t.n + '|' + t.d, t.id]));
    const ck = T.rating_check || {}, vs = Object.values(ck.vs_eucs || {}).map((v) => v.spearman);
    const yrs = [...new Set(T.ratings.map((r) => r.season))].sort((a, b) => b - a), ysel = h('select', null, yrs.map((y) => h('option', { value: y }, y))), rbox = h('div', { class: 'grid3' });
    const dots = (L, d) => { const W = 360, rh = 22, labW = 140, H = 24 + L.length * rh, lo = d3.min(L, (r) => r.low), hi = d3.max(L, (r) => r.high);
      const { box, svg } = svgBox(W, H); const x = d3.scaleLinear([Math.min(lo, 950), Math.max(hi, 1050)], [labW + 8, W - 12]).nice();
      svg.append('line').attr('x1', x(1000)).attr('x2', x(1000)).attr('y1', 14).attr('y2', H).attr('stroke', css('--axis')).attr('stroke-dasharray', '3 3');
      svg.append('text').attr('x', x(1000)).attr('y', 10).attr('text-anchor', 'middle').style('fill', css('--muted')).style('font-size', '10px').text('UK average');
      L.forEach((r, i) => { const y = 24 + i * rh + 8, go = tidN.get(r.team + '|' + d); const g = svg.append('g').style('cursor', go ? 'pointer' : null).on('click', () => { if (go) location.hash = '#/t/' + enc(go); });
        g.append('text').attr('x', labW).attr('y', y + 4).attr('text-anchor', 'end').style('fill', css('--fg')).text(`${r.uk_rank}. ${r.team.length > 18 ? r.team.slice(0, 17) + '…' : r.team}`);
        g.append('line').attr('x1', x(r.low)).attr('x2', x(r.high)).attr('y1', y).attr('y2', y).attr('stroke', COL()[0]).attr('stroke-opacity', 0.35).attr('stroke-width', 5).attr('stroke-linecap', 'round');
        onTip(g.append('circle').attr('cx', x(r.rating)).attr('cy', y).attr('r', r.games ? 5 : 4).attr('fill', r.games ? COL()[0] : css('--panel')).attr('stroke', COL()[0]).attr('stroke-width', 2), () => [`${r.team} · ${r.season}`, `rating ${d3.format('.0f')(r.rating)} (${d3.format('.0f')(r.low)}–${d3.format('.0f')(r.high)})`, r.games ? `${r.games} scored games + ${r.implied} placing comparisons` : `${r.implied} placing comparisons, no scored games`, go ? CLICK : '']); });
      return box; };
    const drawR = () => rbox.replaceChildren(...['Open', 'Mixed', 'Women'].map((d) => { const L = T.ratings_all.filter((r) => r.division === d && r.season === +ysel.value).sort((a, b) => b.rating - a.rating).slice(0, 14);
      return h('div', null, h('h3', null, d), L.length ? dots(L, d) : h('p', { class: 'note' }, 'No results for that season.')); }));
    const mode = h('select', null, h('option', { value: 's' }, 'By season'), h('option', { value: 't' }, 'Over time')), dsel = h('select', null, ['Open', 'Mixed', 'Women'].map((d) => h('option', { value: d }, d))), tpick = h('div', { class: 'controls' });
    const TS = T.ratings_ts || {}, chosen = { Open: null, Mixed: null, Women: null };
    const drawT = () => { const d = dsel.value; const all = Object.keys(TS).filter((k) => k.startsWith(d + '|')).map((k) => k.slice(d.length + 1));
      const lastOf = (t) => (TS[d + '|' + t] || []).slice(-1)[0] || [0, 0]; all.sort((a, b) => lastOf(b)[0] - lastOf(a)[0] || lastOf(b)[1] - lastOf(a)[1]);
      if (!chosen[d]) chosen[d] = new Set(all.filter((t) => lastOf(t)[0] >= 2025).sort((a, b) => lastOf(b)[1] - lastOf(a)[1]).slice(0, 6));
      tpick.replaceChildren(h('span', { class: 'note' }, 'Teams: '), ...all.slice(0, 40).map((t) => h('label', { class: 'chip' + (chosen[d].has(t) ? ' on' : '') }, h('input', { type: 'checkbox', checked: chosen[d].has(t) || null, onchange: (e) => { e.target.checked ? chosen[d].add(t) : chosen[d].delete(t); drawT(); } }), ' ' + t)));
      rbox.replaceChildren(lineChart([...chosen[d]].map((t, i) => ({ name: t, color: C[i % 8], w: 2.5, pts: (TS[d + '|' + t] || []).map(([y, v]) => ({ x: y, y: v, tip: [t + ' · ' + y, 'rating ' + v], go: tidN.get(t + '|' + d) ? '#/t/' + enc(tidN.get(t + '|' + d)) : null })) })), { W: 1000, H: 320, labels: true }), tpick); };
    const drawAny = () => { ysel.hidden = mode.value !== 's'; dsel.hidden = mode.value !== 't'; rbox.className = mode.value === 's' ? 'grid3' : ''; (mode.value === 's' ? drawR : drawT)(); };
    mode.onchange = drawAny; dsel.onchange = drawAny; ysel.onchange = drawAny; dsel.hidden = true; drawR();
    out.push(card('UK team strength from results', 'A UK-only rating from game scores (EUCS games 2024+, WUCC) and finishing orders (UKU Nationals, Tours, Regionals, EUCF), back to 2010. 1000 = the average UK team in that division and season. Filled dots had scored games; hollow dots are placings only, with wider ranges. Top 14 per division; click a team for its page.',
      h('div', { class: 'controls' }, mode, ysel, dsel), rbox,
      vs.length ? finding(`Check against the EUF’s own EUCS rating (2024–26, UK teams): the two put UK teams in almost the same order (rank agreement ${d3.min(vs).toFixed(2)}–${d3.max(vs).toFixed(2)}, where 1 = identical). Ours uses UK results only and goes back to 2010.`, 'flat') : null));
  }
  if (T.eucs_uk && T.eucs_uk.length) {
    const E = T.eucs_uk, seasons = [...new Set(E.map((r) => r.season))].sort();
    const tidN = new Map(I.teams.map((t) => [t.n, t.id]));
    out.push(card('UK teams in the EUCS ranking (reference)', 'Each UK team’s European rank by season (higher = better), top 8 per division. Click a point for the team. Shown for context only: our scores don’t use this rating. The latest season can be a mid-season ranking.',
      h('div', { class: 'grid3' }, ['Mixed', 'Open', 'Women'].map((d) => { const L = E.filter((r) => r.division === d && r.rank); const teams = d3.groups(L, (r) => r.team).sort((a, b) => d3.min(a[1], (r) => r.rank) - d3.min(b[1], (r) => r.rank)).slice(0, 8);
        const mx = Math.max(10, d3.max(L, (r) => r.rank) || 10);
        return h('div', null, h('h3', null, d), lineChart(teams.map(([t, v], i) => ({ name: t, color: C[i % 8], pts: v.sort((a, b) => a.season - b.season).map((r) => ({ x: r.season, y: r.rank, tip: [t + ' · ' + r.season, `${ord(r.rank)} of ${r.of} in Europe`, `rating ${d3.format('.0f')(r.rating)} · ${r.record}`], go: tidN.get(t) ? '#/t/' + enc(tidN.get(t)) : null })) })), { W: 360, H: 260, yDomain: [mx, 1], yFmt: (v) => Number.isInteger(v) ? ord(v) : '', xs: seasons, legend: true })); })),
      h('p', { class: 'note' }, h('a', { href: 'https://ranking.ultimatefederation.eu/', target: '_blank', rel: 'noopener' }, 'Open the EUCS ranking ↗'))));
  }
  out.push(h('p', { class: 'note' }, 'Movement between clubs has its own page: ', h('a', { href: '#/moves' }, 'Moves →')));
  // player trajectories: who is rising, who is established
  { const DC = { Open: C[0], Women: C[3], Mixed: C[2] }; const st = { part: 'tr', div: '' }; const sb = h('div');
    const parts = h('select', { onchange: (e) => { st.part = e.target.value; draw(); } }, [['tr', 'Trajectory (total)'], ['tri', 'Individual part only'], ['trt', 'Team part only']].map(([v, l]) => h('option', { value: v }, l)));
    const dsel = h('select', { onchange: (e) => { st.div = e.target.value; draw(); } }, ['', 'Open', 'Women', 'Mixed'].map((d) => h('option', { value: d }, d || 'All divisions')));
    const draw = () => { const P = I.players.filter((p) => p.tr != null && p.st != null && (!st.div || p.d === st.div) && mpPass(p.k));
      const pts = P.map((p) => ({ x: p.st, y: p[st.part], color: DC[p.d] || C[7], go: '#/p/' + enc(p.k), tip: [p.n, `${p.t || ''} · ${p.d || ''}`, `Standing ${f0(p.st)} · Quality ${f0(p.q)}`, `Trajectory ${sgn1(p.tr)}/season (team ${sgn1(p.trt)}, individual ${sgn1(p.tri)})`, 'Click for the profile'] }));
      const risers = P.slice().sort((a, b) => b[st.part] - a[st.part]).slice(0, 8);
      sb.replaceChildren(h('div', { class: 'grid2' }, scatter(pts, { W: 620, H: 380, xLab: 'Standing (career) →', yLab: '↑ points per season', xDomain: [20, 90] }),
        h('div', null, h('h3', null, 'Rising fastest'), table(['Player', 'Team', 'Standing', st.part === 'tr' ? 'Trajectory' : st.part === 'tri' ? 'Individual' : 'Team part'], risers.map((p) => ({ go: '#/p/' + enc(p.k), cells: [p.n, p.t, f0(p.st), sgn1(p[st.part])] })), { num: [2, 3] }))),
        legend([['Open', C[0]], ['Women', C[3]], ['Mixed', C[2]]])); };
    draw();
    out.push(card('Player trajectories', 'Every player with 3+ scored seasons: how established they are (Standing, across) against how fast they are improving (Trajectory, up). Top right = established and still rising; top left = rising newer players; bottom right = established but past their peak. Switch to the individual part to take club moves out of it. Click a dot for the profile.', h('div', { class: 'controls' }, parts, dsel), sb)); }
  return out;
};

// ---------- moves ----------
ROUTES.moves = async () => {
  const M = await getJSON('moves.json'); const I = await index(); const C = COL();
  const tid = new Map(I.teams.map((t) => [t.n, t.id]));
  const all = M.context[0];
  const tbtn = (t) => tid.get(t) ? h('a', { class: 'btn', href: '#/t/' + enc(tid.get(t)) }, t + ' team page →') : null;
  const out = [h('h1', null, 'Moves'), h('p', { class: 'sub' }, `${M.total} moves between clubs from one season to the next (2022–26)${M.inner ? `; another ${M.inner.n} were switches between teams of the same club (e.g. Reading Ultimate 2 → Reading Ultimate), shown separately at the bottom and never counted as leaving` : ''}. “Up” means moving to a team at least 10 points higher in team level that season, “down” at least 10 lower. Click any bar, row or point to see the players behind it.`)];
  const DKEY = (k) => k === 'unknown' ? '' : k;
  out.push(card('Up, across or down, each season', 'Click a bar segment for those moves.', barChart(M.by_year.map((y) => ({ x: y.year, up: y.up, level: y.level, down: y.down, unknown: y.unknown })), [{ key: 'up', name: 'To a stronger team', color: C[2] }, { key: 'level', name: 'Similar level', color: C[7] }, { key: 'down', name: 'To a weaker team', color: C[4] }, { key: 'unknown', name: 'Level unknown', color: css('--grid') }], { W: 1000, H: 240,
    onClick: (d, k, ev) => dr(ev, (D) => { const L = D.mv.filter((m) => m.y === d.x && m.dir === DKEY(k.key)); return { title: `Moves into ${d.x}: ${k.name.toLowerCase()}`, note: 'Team level is 0–100 (100 = strongest UK team in the division that season).', head: MVHEAD, num: [1, 4, 5, 6, 7], rows: mvRows(D, L) }; }) }),
    finding(`Of moves where both teams’ levels are known, ${pct(all.up)} were to a stronger team and ${pct(all.down)} to a weaker one. ${M.by_year[M.by_year.length - 1].cross} of the ${M.by_year[M.by_year.length - 1].up + M.by_year[M.by_year.length - 1].level + M.by_year[M.by_year.length - 1].down + M.by_year[M.by_year.length - 1].unknown} moves into ${M.by_year[M.by_year.length - 1].year} also changed division.`, 'flat')));
  const CTX = [() => true, (m) => m.drop === 1, (m) => !!m.gb, (m) => !!m.cross, (m) => m.ten === 1, (m) => m.ten >= 3];
  out.push(card('What comes before a move', 'How the direction of a move changes with the situation. Compare each row with “All moves”. Click a row for the moves.', table(['Situation', 'Moves', 'To a stronger team', 'To a weaker team'], M.context.map((c, i) => ({ onclick: (ev) => dr(ev, (D) => { const L = D.mv.filter((m) => m.dir && CTX[i](m));
      return { title: c.label, note: 'Moves where both teams’ levels are known.', sum: [['Moves', L.length], ['To a stronger team', L.filter((m) => m.dir === 'up').length], ['Similar', L.filter((m) => m.dir === 'level').length], ['To a weaker team', L.filter((m) => m.dir === 'down').length]], head: [...MVHEAD, 'Direction'], num: [1, 4, 5, 6, 7], rows: mvRows(D, L, { extra: (m) => [DIRW[m.dir]] }) }; }), cells: [c.label, c.n, pct(c.up), pct(c.down)] })), { num: [1, 2, 3] }),
    finding((() => { const g = M.context.find((c) => /GB/.test(c.label)), t3 = M.context.find((c) => /3\+/.test(c.label)); return `Players in a GB squad around the time of a move go to a stronger team ${pct(g.up)} of the time (vs ${pct(all.up)} overall). After 3+ seasons at one club, moves are more often down (${pct(t3.down)}), which fits players stepping back later in their time at a club. Small numbers in some rows, so treat these as signals.`; })(), 'flat')));
  if (M.next_step) {
    const NS = M.next_step, OK = [['stayed', 'Stayed on the same team', C[0]], ['moved_within', 'Switched team inside the club', C[1]], ['moved_up', 'Moved to a stronger team', C[2]], ['moved_level', 'Moved, similar level', C[7]], ['moved_down', 'Moved to a weaker team', C[4]], ['gap', 'Took a season out', C[6]], ['left', 'Left the sport', C[3]]];
    const nsDrill = (row, o, lab) => (ev) => dr(ev, (D) => { const ks = (row.who || {})[o] || []; const pn2 = new Map(I.players.map((p) => [p.k, p]));
      return { title: `${row.label}: ${lab.toLowerCase()}`, note: 'Season = the season before the change.', head: ['Player', 'Season', 'Team then', 'Latest team'], num: [1], rows: ks.map(([k, y, t]) => { const p = pn2.get(k) || { n: k }; return { cells: [playerLink(k, p.n), y, t, p.t || '—'], sv: [p.n, y, t, p.t] }; }) }; });
    out.push(card('What happens next: stay, move or leave', 'Every player-season on a club roster from 2022, and what the same player did the next season, by situation. Compare each row with “All players”. 2025 → 2026 leavers are provisional. Click a coloured segment (leavers and big moves) for the players.',
      hbarsStack(NS.map((r) => ({ label: `${r.label} (${r.n})`, parts: OK.map(([o, lab, c]) => ({ v: r.n ? r[o] / r.n : 0, n: r[o], color: c, lab, onclick: ['left', 'moved_up', 'moved_down'].includes(o) && r.who && r.who[o] ? nsDrill(r, o, lab) : null })) })), { W: 1000 }),
      legend(OK.map(([, l, c]) => [l, c])),
      finding((() => { const a = NS[0], g = NS.find((r) => /GB/.test(r.label)), lo = NS.find((r) => /under 30/.test(r.label)); return `Across everyone, ${pct(a.left / a.n)} of player-seasons are followed by leaving the sport. For players in a GB squad that drops to ${pct(g.left / g.n)}; for players with Quality under 30 it rises to ${pct(lo.left / lo.n)}.`; })(), 'flat')));
  }
  out.push(h('div', { class: 'grid2' },
    card('How long players stay before moving', 'Each move between seasons, grouped by how many seasons in a row the player had been at the club they left (1 = they moved after their first season there). Colours show whether they moved to a stronger, similar or weaker team. Click a bar for the moves.', barChart(M.tenure.map((t) => ({ x: t.seasons + (t.seasons >= 4 ? '+' : ''), s: t.seasons, up: t.up, level: t.level, down: t.down })), [{ key: 'up', name: 'Stronger', color: C[2] }, { key: 'level', name: 'Similar', color: C[7] }, { key: 'down', name: 'Weaker', color: C[4] }], { W: 520,
      onClick: (d, k, ev) => dr(ev, (D) => { const L = D.mv.filter((m) => m.ten === d.s && m.dir === k.key); return { title: `Moves after ${d.s} season${d.s > 1 ? 's' : ''} at the old team: ${k.name.toLowerCase()}`, head: MVHEAD, num: [1, 4, 5, 6, 7], rows: mvRows(D, L) }; }) }),
      finding(`Most moves (${pct(M.tenure[0] ? (M.tenure[0].up + M.tenure[0].level + M.tenure[0].down) / d3.sum(M.tenure, (t) => t.up + t.level + t.down) : null)}) happen after a single season, partly because the data only starts in 2022.`, 'flat')),
    null));

  if (M.inner && M.inner.routes.length) {
    const pn3 = new Map(I.players.map((p) => [p.k, p.n]));
    out.push(card('Moves inside a club', `${M.inner.n} times a player switched between two teams of the same club from one season to the next (grouped by club name, see Teams). These are internal shuffles, not players leaving, so they are left out of every chart above. Click a club for its club view.`,
      table(['Club', 'From', 'To', 'Players', 'Who'], M.inner.routes.slice(0, 80).map((r) => ({ go: '#/c/' + enc(r.club_id), cells: [r.club, r.frm, r.to, r.n, r.ps.slice(0, 6).map((x) => x[1]).join(', ') + (r.ps.length > 6 ? ` +${r.ps.length - 6}` : '')] })), { num: [3], max: '26rem' })));
  }
  // ---- clubs: routes, talent in vs out, strength over time ----
  out.push(h('p', { class: 'note mpnote' }, 'A note on Reading: before 2022 Reading’s players come from the club’s kit-number lists, which cover the whole club rather than one squad. That links more players to Reading than to clubs where we only have event rosters, so Reading shows bigger arrivals and departures than any other team. The counts are right for “associated with the club that year”; they are not squad-level.'));
  {
    const R = M.all_routes.map(([a, b, n]) => ({ a, b, n }));
    const clubs = [...new Set(R.flatMap((r) => [r.a, r.b]))].sort();
    const csel = h('select', null, clubs.map((c) => h('option', { value: c, selected: c === 'Deep Space' || null }, c)));
    const cbox = h('div');
    const drawC = () => { const c = csel.value, inn = R.filter((r) => r.b === c), outR = R.filter((r) => r.a === c);
      const links = [...inn.map((r) => ({ a: r.a, b: c + ' ', v: r.n, tip: [`${r.a} → ${c}`, r.n + ' players'], onclick: (ev) => dr(ev, (D) => { const L = D.mv.filter((m) => m.frm === r.a && m.to === c); return { title: `${r.a} → ${c}`, head: MVHEAD, num: [1, 4, 5, 6, 7], rows: mvRows(D, L) }; }) })),
                     ...outR.map((r) => ({ a: c, b: r.b + '  ', v: r.n, tip: [`${c} → ${r.b}`, r.n + ' players'], onclick: (ev) => dr(ev, (D) => { const L = D.mv.filter((m) => m.frm === c && m.to === r.b); return { title: `${c} → ${r.b}`, head: MVHEAD, num: [1, 4, 5, 6, 7], rows: mvRows(D, L) }; }) }))];
      cbox.replaceChildren(h('div', { class: 'grid2' },
        h('div', null, h('h3', null, `Came to ${c} from (${d3.sum(inn, (r) => r.n)})`), inn.length ? flow2(inn.sort((x, y) => y.n - x.n).map((r) => ({ a: r.a, b: c + ' ', v: r.n, tip: [`${r.a} → ${c}`, r.n + ' players'], onclick: links.find((l) => l.a === r.a && l.b === c + ' ').onclick })), { W: 520, labW: 150 }) : h('p', { class: 'note' }, 'No arrivals recorded.')),
        h('div', null, h('h3', null, `Left ${c} for (${d3.sum(outR, (r) => r.n)})`), outR.length ? flow2(outR.sort((x, y) => y.n - x.n).map((r) => ({ a: c, b: r.b + ' ', v: r.n, tip: [`${c} → ${r.b}`, r.n + ' players'], onclick: links.find((l) => l.a === c && l.b === r.b + '  ').onclick })), { W: 520, labW: 150 }) : h('p', { class: 'note' }, 'No departures recorded.')))); };
    csel.onchange = drawC; drawC();
    out.push(h('div', { class: 'grid2' },
      card('Most common routes (whole league)', 'The club-to-club moves that happened most often. A club whose leavers spread across many clubs (Deep Space, for example) won’t show here: use the club view alongside. Click a band for the players.', flow2(M.routes.slice(0, 20).map((r) => ({ a: r.frm, b: r.to + ' ', v: r.n, tip: [`${r.frm} → ${r.to}`, r.n + ' players: ' + r.names], onclick: (ev) => dr(ev, (D) => { const L = D.mv.filter((m) => m.frm === r.frm && m.to === r.to); return { title: `${r.frm} → ${r.to}`, head: MVHEAD, num: [1, 4, 5, 6, 7], rows: mvRows(D, L) }; }) })), { W: 560, labW: 150 })),
      card('One club: where players came from and went', 'Every route for the club you pick, however small. Click a band for the players.', h('div', { class: 'controls' }, csel), cbox)));
  }
  {
    const T = M.talent, I2 = new Map(I.players.map((p) => [p.k, p]));
    const sum = (L, i) => d3.sum(L, (x) => x[i] || 0), cnt = (L, i) => L.filter((x) => x[i] != null).length;
    const rowsT = d3.rollups(T, (v) => v, (d) => d.team).map(([team, v]) => ({ team, by: v.sort((a, b) => a.y - b.y).map((d) => ({ y: d.y, inQ: sum(d.inn, 1), outQ: sum(d.out, 1), inS: sum(d.inn, 2), outS: sum(d.out, 2), nIn: d.inn.length, nOut: d.out.length, d })) }))
      .map((r) => ({ ...r, net: d3.sum(r.by, (b) => b.inQ - b.outQ), netS: d3.sum(r.by, (b) => b.inS - b.outS), moves: d3.sum(r.by, (b) => b.nIn + b.nOut) })).filter((r) => r.moves >= 6);
    const mode = h('select', null, h('option', { value: 'q' }, 'Measured by Quality'), h('option', { value: 's' }, 'Measured by Standing'));
    const tbox = h('div');
    const plist = (L, lab) => L.map(([k, q, st]) => { const p = I2.get(k) || { n: k }; return { cells: [playerLink(k, p.n), lab, f0(q), f0(st)], sv: [p.n, lab, q, st] }; });
    const drawT = () => { const S_ = mode.value === 's'; const key = S_ ? 'netS' : 'net';
      const top = rowsT.slice().sort((a, b) => b[key] - a[key]); const pick = top.slice(0, 10).concat(top.slice(-8));
      tbox.replaceChildren(hbars(pick.map((r) => ({ label: r.team, v: Math.round(r[key] / 10), color: r[key] >= 0 ? C[2] : C[4], tip: [r.team, `talent in minus out, 2022–26: ${sgn(r[key] / 10)} (in tens of ${S_ ? 'Standing' : 'Quality'} points)`, ...r.by.map((b) => `${b.y}: in ${b.nIn} (${f0((S_ ? b.inS : b.inQ) / 10)}), out ${b.nOut} (${f0((S_ ? b.outS : b.outQ) / 10)})`)],
        onclick: (ev) => showDrill(anchorOf(ev), { title: `${r.team}: who arrived and who left`, note: `${S_ ? 'Standing' : 'Quality'} shown is the player’s score in the season they arrived (arrivals) or their last season at the club (departures).`, sum: [['Arrived', d3.sum(r.by, (b) => b.nIn)], ['Left', d3.sum(r.by, (b) => b.nOut)], ['Net talent', sgn(r[key] / 10)]], head: ['Player', 'Arrived / left', 'Quality', 'Standing'], num: [2, 3], rows: r.by.flatMap((b) => [...plist(b.d.inn, 'Arrived ' + b.y), ...plist(b.d.out, 'Left after ' + (b.y - 1))]) }) })), { W: 560, fmt: (v) => sgn(v) })); };
    mode.onchange = drawT; drawT();
    // club strength over time (results-based rating), rising / falling highlighted
    const TR = await getJSON('trends.json'); const RT = TR.ratings_ts || {};
    const dsel = h('select', null, ['Open', 'Mixed', 'Women'].map((d) => h('option', { value: d }, d))), sbox = h('div');
    const drawS = () => { const d = dsel.value; const ser = Object.entries(RT).filter(([k]) => k.startsWith(d + '|')).map(([k, pts]) => ({ team: k.split('|')[1], pts: pts.filter((p) => p[0] >= 2018) })).filter((x) => x.pts.length >= 3);
      ser.forEach((x) => { const xs = x.pts.map((p) => p[0]), ys = x.pts.map((p) => p[1]); const mx = d3.mean(xs), my = d3.mean(ys); x.slope = d3.sum(xs, (v, i) => (v - mx) * (ys[i] - my)) / (d3.sum(xs, (v) => (v - mx) ** 2) || 1); x.last = ys[ys.length - 1]; });
      const top = ser.sort((a, b) => b.last - a.last).slice(0, 14); const rise = top.slice().sort((a, b) => b.slope - a.slope).slice(0, 3).map((x) => x.team), fall = top.slice().sort((a, b) => a.slope - b.slope).slice(0, 3).map((x) => x.team);
      sbox.replaceChildren(lineChart(top.map((x) => ({ name: x.team, color: rise.includes(x.team) ? C[2] : fall.includes(x.team) ? C[4] : css('--axis'), w: rise.includes(x.team) || fall.includes(x.team) ? 2.5 : 1.2, pts: x.pts.map(([y, v]) => ({ x: y, y: v, tip: [`${x.team} ${y}`, `rating ${f0(v)} · trend ${sgn(x.slope)}/season`] })) })), { W: 620, H: 380, labels: true, yDomain: [Math.floor((d3.min(top.flatMap((x) => x.pts.map((p) => p[1]))) || 800) / 50) * 50, Math.ceil((d3.max(top.flatMap((x) => x.pts.map((p) => p[1]))) || 1500) / 50) * 50] }),
        h('p', { class: 'note' }, `Green = the three fastest-rising of the current top 14 (${rise.join(', ')}); red = the three fastest-falling (${fall.join(', ')}); grey = the rest. Rating: 1000 = an average UK team that season, from game scores and finishing orders (same as Trends).`)); };
    dsel.onchange = drawS; drawS();
    out.push(h('div', { class: 'grid2' },
      card('Talent in vs talent out', 'For each club, 2022–26: the Quality (or Standing) of the players who arrived, minus the players who left. A club on the rise gains better players than it loses, even if the headcount is level. Shown in tens of points: +10 means arrivals outweigh departures by about one 100-point player. Click a bar for everyone who came and went.', h('div', { class: 'controls' }, mode), tbox),
      card('Club strength over time', 'Each club’s results-based rating each season since 2018, so you can see which clubs are building and which are fading. The talent chart says why; this says whether it showed up in results.', h('div', { class: 'controls' }, dsel), sbox)));
  }
  if (M.div_flow && M.div_flow.length) {
    const DIVS = ['Open', 'Mixed', 'Women', 'Masters'], DC = { Open: C[0], Mixed: C[2], Women: C[4], Masters: C[5] };
    const yrs = [...new Set(M.div_flow.map((d) => d.y))].sort(), dsel = h('select', null, h('option', { value: '' }, 'All seasons'), ...yrs.slice().reverse().map((y) => h('option', { value: y }, 'Into ' + y)));
    const chg = h('label', { class: 'note' }, h('input', { type: 'checkbox' }), ' include players who stayed in the same division'), dbox = h('div');
    const draw = () => { const F = M.div_flow.filter((d) => (!dsel.value || d.y === +dsel.value) && (chg.firstChild.checked || d.a !== d.b));
      const agg = d3.rollups(F, (v) => v.flatMap((d) => d.ps.map((p) => [...p, d.y])), (d) => d.a, (d) => d.b).flatMap(([a, m]) => m.map(([b, ps]) => ({ a, b, v: ps.length, tip: [`${a} → ${b}`], onclick: (ev) => showDrill(anchorOf(ev), { title: `${a} → ${b}${dsel.value ? ' into ' + dsel.value : ''}`, head: ['Player', 'Into season'], num: [1], rows: ps.map(([k, n, y]) => ({ cells: [playerLink(k, n), y], sv: [n, y] })) }) })));
      dbox.replaceChildren(agg.length ? flow2(agg.map((l) => ({ ...l, b: l.b + ' ' })), { W: 1000, labW: 150, order: DIVS.concat(DIVS.map((d) => d + ' ')), color: (n) => DC[n.trim()] || C[7] }) : h('p', { class: 'note' }, 'No moves for that choice.')); };
    dsel.onchange = draw; chg.firstChild.onchange = draw; draw();
    out.push(card('Moves between divisions', 'Each player’s main division one season (left) and the next season they played (right), from 2022 rosters and the older history rosters. Click a band for the players.', h('div', { class: 'controls' }, dsel, chg), dbox));
  }
  if (M.multi && M.multi.length) {
    const top = M.multi.slice(0, 16);
    out.push(card('Playing for more than one club in a season', 'Club pairs where the same player was on both rosters in the same season (training-player entries left out). Click a bar for the players.',
      h('div', { class: 'grid2' }, hbars(top.map((d) => ({ label: `${d.a} + ${d.b}`, v: d.n, color: C[5], tip: [`${d.a} + ${d.b}`, d.ps.slice(0, 8).map((p) => p[1] + ' ' + p[2]).join(', ')], onclick: (ev) => showDrill(anchorOf(ev), { title: `${d.a} + ${d.b} in the same season`, head: ['Player', 'Season'], num: [1], rows: d.ps.map(([k, n, y]) => ({ cells: [playerLink(k, n), y], sv: [n, y] })) }) })), { W: 560, labW: 300 }),
        h('div', null, h('h3', null, 'Players on two or more clubs, by season'), barChart(Object.entries(M.multi_by_year).map(([y, n]) => ({ x: +y, n })), [{ key: 'n', name: 'Players', color: C[5] }], { W: 440, H: 220 })))));
  }
  out.push(card('Biggest steps up', 'Moves with the largest jump in team level. Click for the profile.', table(['Player', 'From', 'To', 'Into season', 'Level change'], M.biggest_up.map((r) => ({ go: r.k ? '#/p/' + enc(r.k) : null, cells: [r.n, r.frm, r.to, r.year, sgn(r.delta)] })), { num: [3, 4] })));
  // ---- leaving the scene ----
  const L = M.leavers;
  if (L) {
    out.push(h('h2', { style: 'margin-top:22px' }, 'Leaving the scene'));
    out.push(h('p', { class: 'sub' }, 'A player “leaves” in the last season they appear anywhere in the data (any UK club, GB or other squad). The latest season is provisional: some of those players will turn up again once the next season’s rosters are in.'));
    const by = L.by_year, last = by[by.length - 1], prev = by[by.length - 2];
    const lvDrill = (title, f, note) => (ev) => dr(ev, (D) => { const X = D.lv.filter(f); return { title, note, sum: [['Players', X.length], ['Played GB', X.filter((r) => r.gb).length], ['One season only', X.filter((r) => r.n === 1).length]], head: LVHEAD, num: [1, 4, 5], rows: lvRows(D, X) }; });
    out.push(card('Who didn’t come back, each season', 'Click a bar or a row for the players.',
      barChart(by.map((y) => ({ x: y.year + (y.provisional ? '*' : ''), yr: y.year, Open: y.div.Open, Mixed: y.div.Mixed, Women: y.div.Women })), [{ key: 'Open', name: 'Open', color: C[0] }, { key: 'Mixed', name: 'Mixed', color: C[2] }, { key: 'Women', name: 'Women', color: C[3] }], { W: 1000, H: 240,
        onClick: (d, k, ev) => lvDrill(`${k.key} players not seen after ${d.yr}`, (r) => r.y === d.yr && r.dv === k.key, d.yr === last.year ? 'Provisional: some will reappear when more rosters are in.' : null)(ev) }),
      table(['Last season', 'Players that season', 'Not seen again', 'Share', 'Had played GB', 'Avg quality: left', 'Avg quality: stayed'], by.map((y) => ({ onclick: lvDrill(`Players not seen after ${y.year}`, (r) => r.y === y.year, y.provisional ? 'Provisional: some will reappear when more rosters are in.' : null), cells: [y.year + (y.provisional ? ' (provisional)' : ''), y.players, y.left, pct(y.share), y.gb, f0(y.q_left), f0(y.q_stayed)] })), { num: [1, 2, 3, 4, 5, 6] }),
      finding(`Each settled season, about ${pct(d3.mean(by.filter((y) => !y.provisional), (y) => y.share))} of players don’t appear again. Leavers are mostly lower-rated: their average quality (${f0(prev.q_left)} in ${prev.year}) sits well below those who stayed (${f0(prev.q_stayed)}). The ${last.year} figure (${pct(last.share)}) is inflated until more ${last.year + 1} rosters are in.`, 'flat')));
    const yrSel = h('select', null, by.map((y) => h('option', { value: y.year, selected: y === prev ? true : null }, y.year + (y.provisional ? ' (provisional)' : ''))));
    const box = h('div');
    const showYear = () => { const y = by.find((r) => r.year === +yrSel.value);
      box.replaceChildren(h('div', { class: 'grid2' },
        card('Highest-rated players not seen after ' + y.year, 'Ranked by their quality that season. Click for the profile.', y.top.length ? table(['Player', 'Team that season', 'Quality'], y.top.map((r) => ({ go: '#/p/' + enc(r.k), cells: [r.n, r.t, f0(r.q)] })), { num: [2] }) : h('p', { class: 'note' }, 'No rated players.')),
        card('How long they had played', 'Seasons in the data (including pre-2022 history) up to and including ' + y.year + '. Click a slice for the players.', donut(Object.entries(y.seasons).map(([s_, n], i) => ({ label: s_ === '5' ? '5+ seasons' : s_ + (s_ === '1' ? ' season' : ' seasons'), v: n, color: COL()[i % 8],
            onclick: lvDrill(`Leavers after ${y.year} with ${s_ === '5' ? '5+' : s_} season${s_ === '1' ? '' : 's'} in the data`, (r) => r.y === y.year && Math.min(r.n, 5) === +s_) })), { W: 520, R: 86, centreLab: 'leavers' }),
          finding(`${pct((y.seasons['1'] || 0) / y.left)} of ${y.year}’s leavers had only one season in the data: most drop-off is players trying club ultimate for a year.`, 'flat')))); };
    yrSel.onchange = showYear; showYear();
    out.push(h('div', { class: 'controls' }, h('span', { class: 'muted' }, 'Season:'), yrSel), box);
    { const TL = L.team_loss_by_year || {}; const ys = Object.keys(TL).sort().slice(-4);
      out.push(card('Squads that lost the most players to the sport', 'Each season: the team every leaver was on in their last season in the data. One ring per season, the most recent first (the latest is provisional: some will reappear). Click a slice for the players.',
        h('div', { class: 'grid2' }, ys.reverse().map((y) => { const items = TL[y] || [];
          return h('div', null, h('h3', null, `After ${y}${+y === last.year ? ' (provisional)' : ''}: ${d3.sum(items, (d) => d[1])} players`), donut(items.map(([t, n], i) => ({ label: t, v: n, color: COL()[i % 8], onclick: lvDrill(`${t}: players not seen after ${y}`, (r) => r.t === t && r.y === +y, +y === last.year ? 'Provisional.' : null) })), { W: 520, R: 80, max: 9, centreLab: 'leavers', otherClick: (ev, rest) => lvDrill(`Other teams: players not seen after ${y}`, (r) => r.y === +y && rest.some((d) => d.label === r.t))(ev) })); })))); }
    const H = L.history;
    const BAND = { '2010–13': [2010, 2013], '2014–17': [2014, 2017], '2018–21': [2018, 2021] };
    const hpRows = (D, X) => X.slice().sort((a, b) => b.l - a.l || b.n - a.n).map((r) => { const w = D.who(r.p); return { cells: [pcell(w), r.f, r.l, r.t || '—', r.n, r.l >= 2022 ? 'yes' : ''], sv: [w.n, r.f, r.l, r.t, r.n, r.l >= 2022 ? 1 : 0] }; });
    const HPHEAD = ['Player', 'First seen', 'Last seen', 'Last seen with', 'Seasons seen', 'Played 2022+'];
    out.push(card('Looking back: players from 2010–2021 and when they stopped', `${H.players.toLocaleString()} players appear in the 2010–21 history (GB squads, and club rosters at European and world events). This shows the last year each one appears anywhere in the data, including 2022 onwards. Before 2022 we only see the big international events, so “last seen” there means their last one of those, not necessarily their last game. Click a bar or row for the players.`,
      barChart(H.last_seen.map((r) => ({ x: r.year, n: r.n })), [{ key: 'n', name: 'Players last seen that year', color: C[6] }], { W: 1000, H: 220,
        onClick: (d, k, ev) => dr(ev, (D) => ({ title: `History players last seen in ${d.x}`, head: HPHEAD, num: [1, 2, 4], rows: hpRows(D, D.hp.filter((r) => r.l === d.x)) })) }),
      table(['First seen', 'Players', 'Still playing 2022+', 'Share'], H.cohorts.map((c) => ({ onclick: (ev) => dr(ev, (D) => { const [a, b] = BAND[c.first] || [0, 0]; const X = D.hp.filter((r) => r.f >= a && r.f <= b); return { title: `First seen ${c.first}`, sum: [['Players', X.length], ['Played 2022+', X.filter((r) => r.l >= 2022).length]], head: HPHEAD, num: [1, 2, 4], rows: hpRows(D, X) }; }), cells: [c.first, c.players, c.still, pct(c.share)] })), { num: [1, 2, 3] }),
      finding(`${pct(H.cohorts[0].share)} of players first seen in 2010–13 still appear from 2022 on, rising to ${pct(H.cohorts[H.cohorts.length - 1].share)} of the 2018–21 group. The dip in 2020–21 is Covid (no events), and the spike at 2026 is everyone still active.`, 'flat')));
    out.push(card('Longest careers in the data', 'First and last season seen.', table(['Player', 'First', 'Last', 'Span'], H.longest.map((r) => ({ go: '#/p/' + enc(r.k), cells: [r.n, r.first, r.last, (r.last - r.first + 1) + ' seasons'] })), { num: [1, 2] })));
  }
  return out;
};

// ---------- connections ----------
ROUTES.connections = async () => {
  const Cn = await getJSON('conn.json'); const C = COL(); const I = await index();
  const tid = new Map(I.teams.map((t) => [t.n, t.id]));
  const ks = Object.keys(Cn.years); const scopes = ['all', ...ks.filter((k) => /^\d{4}$/.test(k)).sort(), ...ks.filter((k) => k.includes('>')).sort()];
  const st = { s: 'all', min: 2, div: '', masters: false, focus: '' }; const box = h('div'), top = h('div');
  const draw = () => {
    const flow = st.s.includes('>');
    const L = Cn.years[st.s].filter((x) => x[2] >= st.min);
    const used = new Set(L.flatMap((x) => [x[0], x[1]]));
    const nb = st.focus ? new Set([st.focus, ...L.filter((x) => x[0] === st.focus || x[1] === st.focus).flatMap((x) => [x[0], x[1]])]) : null;
    const T = Cn.teams.filter((t) => used.has(t.t) && (!nb || nb.has(t.t)) && (st.masters || ['Open', 'Women', 'Mixed'].includes(t.d)) && (!st.div || t.d === st.div || L.some((x) => (x[0] === t.t || x[1] === t.t) && Cn.teams.find((u) => u.t === (x[0] === t.t ? x[1] : x[0]))?.d === st.div)));
    const order = ['Open', 'Women', 'Mixed']; T.sort((a, b) => (order.indexOf(a.d) + 1 || 9) - (order.indexOf(b.d) + 1 || 9) || b.n - a.n);
    const idx = new Map(T.map((t, i) => [t.t, i])), n = T.length;
    if (!n) { box.replaceChildren(h('p', { class: 'note' }, 'No links at this setting.')); top.replaceChildren(); return; }
    const labW = 150, cell = Math.max(9, Math.min(20, (1000 - labW) / n)), W = labW + cell * n + 10, H = 110 + cell * n + 10;
    const { box: b, svg: svg0 } = svgBox(W, H); const svg = svg0.append('g'); const mx = d3.max(L, (x) => x[2]) || 1, op = d3.scaleSqrt([0, mx], [0.12, 1]);
    // zoom: scroll / pinch to zoom, drag to pan, buttons for touch-pads and phones
    const zm = d3.zoom().scaleExtent([1, 8]).translateExtent([[0, 0], [W, H]]).on('zoom', (e) => svg.attr('transform', e.transform)); svg0.call(zm).on('dblclick.zoom', null); svg0.style('cursor', 'grab').style('touch-action', 'none');
    const zbar = h('div', { class: 'controls zoombar' }, h('button', { onclick: () => svg0.transition().call(zm.scaleBy, 1.6) }, 'Zoom in +'), h('button', { onclick: () => svg0.transition().call(zm.scaleBy, 1 / 1.6) }, 'Zoom out −'), h('button', { onclick: () => svg0.transition().call(zm.transform, d3.zoomIdentity) }, 'Reset'), h('span', { class: 'note' }, 'Scroll or pinch to zoom, drag to move around.'));
    const dcol = (d) => ({ Open: C[0], Women: C[3], Mixed: C[2] }[d] || C[7]);
    T.forEach((t, i) => { svg.append('text').attr('x', labW - 4).attr('y', 110 + i * cell + cell * 0.72).attr('text-anchor', 'end').style('fill', dcol(t.d)).style('font-size', Math.min(11, cell * 0.8) + 'px').text(t.t.length > 22 ? t.t.slice(0, 21) + '…' : t.t).style('cursor', 'pointer').on('click', () => { if (tid.get(t.t)) location.hash = '#/t/' + enc(tid.get(t.t)); });
      svg.append('text').attr('transform', `translate(${labW + i * cell + cell * 0.7},106) rotate(-60)`).style('fill', dcol(t.d)).style('font-size', Math.min(11, cell * 0.8) + 'px').text(t.t.length > 18 ? t.t.slice(0, 17) + '…' : t.t); });
    // division blocks
    let start = 0; order.concat(['']).forEach((d) => { const cnt = T.filter((t) => (d ? t.d === d : !order.includes(t.d))).length; if (!cnt) return; svg.append('rect').attr('x', labW + start * cell).attr('y', 110 + start * cell).attr('width', cnt * cell).attr('height', cnt * cell).attr('fill', 'none').attr('stroke', css('--axis')); start += cnt; });
    L.forEach(([a, bb, v]) => { if (!idx.has(a) || !idx.has(bb)) return; const cells = flow ? [[idx.get(a), idx.get(bb)]] : [[idx.get(a), idx.get(bb)], [idx.get(bb), idx.get(a)]];
      cells.forEach(([i, j]) => onTip(svg.append('rect').attr('class', 'ccell').attr('x', labW + j * cell + 0.5).attr('y', 110 + i * cell + 0.5).attr('width', cell - 1).attr('height', cell - 1).attr('rx', 2).attr('fill', C[0]).attr('fill-opacity', op(v)).style('cursor', 'pointer').on('click', () => showPair(a, bb)), () => [flow ? `${a} → ${bb}` : `${a} ↔ ${bb}`, flow ? `${v} played for ${a} in ${st.s.slice(0, 4)} and ${bb} in ${st.s.slice(5)}` : `${v} shared player${v > 1 ? 's' : ''}`, 'Click to see who'])); });
    if (st.focus) svg.selectAll('text').filter(function () { return this.textContent.startsWith(st.focus.slice(0, 17)); }).style('font-weight', 700);
    box.replaceChildren(zbar, b, legend([['Open', C[0]], ['Women', C[3]], ['Mixed', C[2]]]), h('p', { class: 'note' }, flow ? 'Rows = the team they left (or also played for) that season; columns = the team in the next season.' : 'Darker = more shared players. Boxes group the divisions; squares outside a box are links across divisions.'));
    const tops = L.slice().sort((x, y) => y[2] - x[2]).slice(0, 15);
    top.replaceChildren(h('h3', null, 'Strongest links'), h('p', { class: 'note' }, 'Click a row or any square for the players.'), table([flow ? 'From' : 'Team', flow ? 'To' : 'Team', 'Players'], tops.map(([a, bb, v]) => ({ onclick: () => showPair(a, bb), cells: [a, bb, v] })), { num: [2] }));
  };
  const pairBox = h('div', { id: 'pairbox' });
  const pName = new Map(I.players.map((p) => [p.k, p.n]));
  const pInfo = new Map(I.players.map((p) => [p.k, p]));
  const yrs = (d) => [...String(d ?? "")].map((c) => 2020 + +c);
  const span = (ys) => ys.length ? (ys.length === 1 ? String(ys[0]) : ys.length === ys[ys.length - 1] - ys[0] + 1 ? `${ys[0]}–${String(ys[ys.length - 1]).slice(2)}` : ys.join(', ')) : '—';
  async function showPair(a, b) {
    const CP = await getJSON('conn_players.json');
    const [x, y] = [a, b].sort(); const rows = (CP[x + '|' + y] || []).map(([k, ya, yb]) => ({ k, n: pName.get(k) || k, A: yrs(ya), B: yrs(yb) }));
    const A = x, B = y; const seasons = [...new Set(rows.flatMap((r) => [...r.A, ...r.B]))].sort((p, q) => p - q);
    const allY = d3.range(d3.min(seasons) ?? 2022, (d3.max(seasons) ?? 2026) + 1);
    // what happened, per player
    const story = (r) => { const both = r.A.filter((v) => r.B.includes(v)); const out = [];
      if (both.length) out.push(`both in ${span(both)}`);
      const lastA = d3.max(r.A), firstB = d3.min(r.B), lastB = d3.max(r.B), firstA = d3.min(r.A);
      if (firstB > lastA) out.push(`${A} → ${B} (${lastA}→${firstB})`); else if (firstA > lastB) out.push(`${B} → ${A} (${lastB}→${firstA})`);
      else if (!both.length) out.push('back and forth'); return out.join(' · '); };
    const per = allY.map((yy) => ({ x: yy, both: rows.filter((r) => r.A.includes(yy) && r.B.includes(yy)).length,
      ab: rows.filter((r) => r.A.includes(yy - 1) && r.B.includes(yy) && !r.A.includes(yy)).length, ba: rows.filter((r) => r.B.includes(yy - 1) && r.A.includes(yy) && !r.B.includes(yy)).length }));
    rows.sort((p, q) => d3.min([...p.A, ...p.B]) - d3.min([...q.A, ...q.B]) || p.n.localeCompare(q.n));
    const grid = rows.map((r) => ({ label: r.n, go: '#/p/' + enc(r.k), cells: Object.fromEntries(allY.filter((yy) => r.A.includes(yy) || r.B.includes(yy)).map((yy) => [yy, { color: r.A.includes(yy) && r.B.includes(yy) ? C[1] : r.A.includes(yy) ? C[0] : C[2], tip: [r.n + ' · ' + yy, r.A.includes(yy) && r.B.includes(yy) ? `both ${A} and ${B}` : r.A.includes(yy) ? A : B] }])) }));
    pairBox.replaceChildren(card(`${A} ↔ ${B}`, `${rows.length} player${rows.length === 1 ? '' : 's'} have played for both (2022 on). Click a name for their profile.`,
      h('div', { class: 'controls' }, tid.get(A) ? h('a', { class: 'btn', href: '#/t/' + enc(tid.get(A)) }, A + ' →') : null, tid.get(B) ? h('a', { class: 'btn', href: '#/t/' + enc(tid.get(B)) }, B + ' →') : null, h('button', { onclick: () => pairBox.replaceChildren() }, 'Close')),
      h('div', { class: 'grid2' },
        h('div', null, h('h3', null, 'When the crossovers happened'), barChart(per, [{ key: 'both', name: 'On both that season', color: C[1] }, { key: 'ab', name: `Moved ${A} → ${B}`, color: C[2] }, { key: 'ba', name: `Moved ${B} → ${A}`, color: C[0] }], { W: 520, H: 220 })),
        h('div', null, h('h3', null, 'Who, season by season'), presenceGrid(grid, allY, { W: 520 }), legend([[A, C[0]], [B, C[2]], ['Both that season', C[1]]]))),
      sortTable(['Player', 'Seasons at ' + A, 'Seasons at ' + B, 'What happened', 'Quality now', 'GB squads', 'Latest team'], rows.map((r) => { const e = pInfo.get(r.k) || {}; return { cells: [playerLink(r.k, r.n), span(r.A), span(r.B), story(r), f0(e.q), e.gb || '', e.y ? `${e.t || '—'} (${e.y})` : '—'], sv: [r.n, d3.min(r.A), d3.min(r.B), null, e.q, e.gb, e.y] }; }), [4, 5])));
    pairBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  const ctl = h('div', { class: 'controls' },
    h('select', { onchange: (e) => { st.s = e.target.value; draw(); } }, scopes.map((s) => h('option', { value: s }, s === 'all' ? 'All seasons (players who played for both)' : s.includes('>') ? `Moved: ${s.slice(0, 4)} → ${s.slice(5)}` : `Same season: ${s}`))),
    h('select', { onchange: (e) => { st.div = e.target.value; draw(); } }, ['', 'Open', 'Women', 'Mixed'].map((d) => h('option', { value: d }, d ? 'Involving ' + d : 'All divisions'))),
    h('select', { onchange: (e) => { st.min = +e.target.value; draw(); } }, [[1, 'Any overlap'], [2, '2+ players'], [3, '3+ players'], [5, '5+ players']].map(([v, l]) => h('option', { value: v, selected: v === 2 || null }, l))),
    h('select', { onchange: (e) => { st.focus = e.target.value; draw(); } }, h('option', { value: '' }, 'All clubs'), ...Cn.teams.slice().sort((a, b) => a.t.localeCompare(b.t)).map((t) => h('option', { value: t.t }, 'Focus: ' + t.t))),
    h('label', { class: 'note' }, h('input', { type: 'checkbox', onchange: (e) => { st.masters = e.target.checked; draw(); } }), ' include masters sides'));
  draw();
  return [h('h1', null, 'Connections'), h('p', { class: 'sub' }, 'Which teams share players, across divisions and over time. Click any square or row to see the players and when they crossed over. Pick “All seasons” for the overall picture, a single season for players on two teams at once (e.g. open and mixed), or “Moved” to see where each team’s players went the next season.'),
    card(null, null, ctl, h('div', { class: 'grid2', style: 'grid-template-columns:minmax(0,3fr) minmax(220px,1fr)' }, h('div', { style: 'overflow:auto' }, box), top)), pairBox];
};

// ---------- data checks ----------
ROUTES.checks = async () => {
  const K = await getJSON('checks.json');
  const groups = d3.groups(K.open, (d) => d.type);
  return [h('h1', null, 'Data checks'), h('p', { class: 'sub' }, `${K.open.length} items still open; ${K.info} more were checked and resolved. Decisions are recorded in the repository’s rules files.`),
    ...groups.map(([t, L]) => card(`${t} (${L.length})`, L[0].check, table(['Player', 'Season', 'Detail', 'Evidence'], L.map((d) => ({ go: d.key ? '#/p/' + enc(d.key) : null, cells: [d.player, d.year, d.detail, d.evidence] })), { max: '24rem' })))];
};

// ---------- method ----------
ROUTES.method = async () => [h('h1', null, 'How it works'),
  card('Clubs and teams', 'A club (Reading Ultimate) is the banner over the teams that enter events separately: first and second teams, open/mixed/women sides, masters and youth sides, and its beach and indoor teams. Teams are grouped by name only; renamed clubs keep one history (Glasgow Ultimate → Hillhead). Anything grouped from a looser name match is marked “to check” until Max confirms it. Switching between two teams of the same club is shown as an internal move and is never counted as leaving. A pickup is a player with one event for the club in a season who is not on its published squad or kit list that season, and whose main club that season was elsewhere (2+ events or a published squad there) or who played on a composite side such as Deep Space & Friends. Clubs are display only: Quality, Standing, Trajectory and team ratings do not use them.'),
  card('Four player numbers, side by side', null, h('ul', null,
    h('li', null, 'Quality: how good a player was this season (team strength 50%, GB selection 20%, production 20%, role 10%).'),
    h('li', null, 'Results quality: the same, with the team part taken from the game-results team rating instead of finishing positions.'),
    h('li', null, 'Standing: how proven they are. A recency-weighted average of every season’s Quality, pulled towards 45 until there is enough evidence; missing years are skipped. One season at 86 is about 61, five seasons at 86 about 76.'),
    h('li', null, 'Trajectory: points of Quality gained or lost per season across 2022–26 (3+ seasons needed), split into a team part (the team got stronger or they moved club) and an individual part (their own selection, production and role).'))),
  card('Club- and UKU-reported placings', 'Some placings come from a club’s own website (e.g. Glasgow Ultimate’s results history) or UKU news posts that only name winners. They appear on event and team pages, marked with their source, but are not used in the team rating because the rest of the field isn’t known. Where they overlap with standings we already hold, every one agreed.'),
  card('Where the data comes from', null, h('ul', null,
    h('li', null, 'Official results and rosters: EUF and WFDF results sites (EUCF, Elite Invite, EUCS tours, WUCC, WUGC, U24, U20, U17, beach and masters championships), UKU schedule sheets, USA Ultimate Club Nationals, ultie.org for invites.'),
    h('li', null, 'Club roster and team-sheet posts on Instagram, transcribed from screenshots. Team sheets for events with an official roster are only used to cross-check it.'),
    h('li', null, 'History from 2010: ultimate-reference.com (placings at every World and European championship and the rosters it lists for British teams); ulti.info for WUCC game scores.'),
    h('li', null, 'Where an event published standings but no rosters (UKU Nationals 2022–24, Regionals), each team’s known squad that season is assumed to have played. Those appearances are marked “assumed”.'))),
  card('Scores', null, h('ul', null,
    h('li', null, 'Quality (0–100) per player-season = team level 50% + national squad 20% + production 20% + role 10%. Team level comes from finishes at WUCC, EUCF, Elite Invite and UKU Nationals; 100 = the strongest UK team in the division that season.'),
    h('li', null, 'National squads count by level (World Games 100, WUGC 85, EUC 75, U24 45, senior beach 45, U20 25, masters beach 20, U17 15) and fade over two seasons. A squad for another country counts like the GB squad at the same level.'),
    h('li', null, 'Level = where a player is trusted to play (team strength and how much of the big-event season they played). Impact = what they add there (production against teammates, blended with an experimental with/without estimate).'),
    h('li', null, 'Retention = share of last season’s core roster (players at roster-locked events) who are back. Moves are classed up/down when team level differs by 10+ points.'))),
  card('Limits', null, h('ul', null,
    h('li', null, 'Coverage grows each year, so counts of players rise partly because more was collected, not only because more people play.'),
    h('li', null, 'Rosters on ultimate-reference.com before about 2017 are often incomplete, and some Ultimate Central rosters are hidden by players’ privacy settings; those are respected.'),
    h('li', null, 'Names are matched carefully but a few same-name players may remain; open questions are listed under Data checks.')))];
