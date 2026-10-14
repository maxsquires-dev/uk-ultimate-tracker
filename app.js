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
const pct = (v) => v == null ? '—' : d3.format('.0%')(v);
const sgn = (v) => v == null ? '—' : d3.format('+.0f')(v);
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
const card = (title, note, ...kids) => h('section', { class: 'card' }, title ? h('h2', null, title) : null, note ? h('p', { class: 'note' }, note) : null, ...kids);
const tiles = (items) => h('div', { class: 'tiles' }, items.map(([k, v, s]) => h('div', { class: 'tile' }, h('div', { class: 'k' }, k), h('div', { class: 'v' }, v ?? '—'), s ? h('div', { class: 's' }, s) : null)));
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
    h('thead', null, h('tr', null, head.map((c, i) => h('th', { class: num.has(i) ? 'n' : null }, c)))),
    h('tbody', null, rows.map((r) => h('tr', { class: r.go || r.onclick ? 'click' : null, onclick: r.onclick || (r.go ? () => { location.hash = r.go; } : null) },
      r.cells.map((c, i) => h('td', { class: num.has(i) ? 'n' : null }, c == null ? '—' : c)))))));
}

// tooltip
const CLICK = 'Click to see the players';
const TIP = $('#tip');
function tip(ev, lines) { TIP.replaceChildren(...lines.map((l, i) => i === 0 ? h('b', null, l) : h('div', null, l))); TIP.hidden = false; const w = TIP.offsetWidth, x = Math.min(ev.clientX + 12, innerWidth - w - 8); TIP.style.left = x + 'px'; TIP.style.top = (ev.clientY + 14) + 'px'; }
const untip = () => { TIP.hidden = true; };
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
    const linePts = xs.map((v) => s.pts.find((p) => p.x === v) || { x: v, y: null });   // a missing season breaks the line instead of bridging it
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
    g.append('text').attr('x', labW).attr('y', 13).attr('text-anchor', 'end').style('fill', css('--fg')).text(r.label.length > 28 ? r.label.slice(0, 27) + '…' : r.label);
    onTip(g.append('rect').attr('x', Math.min(x(0), x(r.v))).attr('y', 3).attr('width', Math.max(2, Math.abs(x(r.v) - x(0)))).attr('height', 13).attr('rx', 3).attr('fill', r.color || COL()[0]), () => [...(r.tip || [r.label, String(r.v)]), ...(r.onclick ? [CLICK] : [])]);
    g.append('text').attr('x', r.v >= 0 ? x(r.v) + 4 : x(0) + 4).attr('y', 13).attr('text-anchor', 'start').text(o.fmt ? o.fmt(r.v) : r.v); });
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
  const all = [...ts, ...gs, ...ps]; qSel = -1;
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
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('on', a.getAttribute('href').split('/')[1] === ({ p: 'players', tree: 'players', t: 'teams', g: 'gb', gc: 'gb', pathway: 'gb', e: 'events' }[view] || view)));
  const fn = ROUTES[view] || ROUTES[''];
  VIEW.replaceChildren(h('p', { class: 'loading' }, 'Loading…'));
  try { const out = await fn(arg); VIEW.replaceChildren(...[out].flat()); } catch (e) { console.error(e); VIEW.replaceChildren(card('Something went wrong', String(e.message || e))); }
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
    card('Highest current quality', 'Latest season’s quality score (team level, GB selection, production and role). Click a name for the full profile.',
      table(['Player', 'Team', 'Division', 'Quality', 'Season'], cur.slice(0, 15).map((p) => ({ go: '#/p/' + enc(p.k), cells: [p.n, p.t, p.d, f0(p.q), p.y] })), { num: [3, 4] }))];
};

// ---------- players list + compare ----------
ROUTES.players = async () => {
  const I = await index();
  const wrap = h('div');
  const st = { q: '', d: '', t: '', s: 'q', hist: false };
  const teamsAll = [...new Set(I.players.filter((p) => !p.h).flatMap((p) => (p.t || '').split(' + ')))].filter(Boolean).sort();
  const list = h('div'), cmpBox = h('div');
  const draw = () => {
    let L = I.players.filter((p) => (st.hist || !p.h) && (!st.q || p.n.toLowerCase().includes(st.q)) && (!st.d || p.d === st.d) && (!st.t || (p.t || '').split(' + ').includes(st.t)));
    L = L.slice().sort(st.s === 'q' ? (a, b) => (b.q ?? -1) - (a.q ?? -1) : st.s === 'g' ? (a, b) => (b.g ?? -999) - (a.g ?? -999) : st.s === 'gb' ? (a, b) => b.gb - a.gb : (a, b) => a.n.localeCompare(b.n));
    list.replaceChildren(h('p', { class: 'note' }, `${L.length.toLocaleString()} players` + (L.length > 300 ? ' (first 300 shown)' : '')),
      table(['', 'Player', 'Team (latest)', 'Division', 'Quality', 'Change 25→26', 'GB squads', 'Latest season'], L.slice(0, 300).map((p) => ({ go: '#/p/' + enc(p.k), cells: [
        h('input', { type: 'checkbox', title: 'Compare', checked: CMP.has(p.k) || null, onclick: (e) => { e.stopPropagation(); CMP.toggle(p.k); drawCmp(); } }), p.n + (p.h ? ' ·' : ''), p.t, p.d, f0(p.q), p.g == null ? '—' : sgn(p.g), p.gb || '—', p.y] })), { num: [4, 5, 6, 7], max: '42rem' }));
  };
  const drawCmp = async () => {
    const ks = CMP.list();
    if (!ks.length) { cmpBox.replaceChildren(); return; }
    const ps = (await Promise.all(ks.map(profile))).filter(Boolean);
    const C = COL();
    const series = ps.map((p, i) => ({ name: p.n, color: C[i % 8], pts: p.seasons.map((s) => ({ x: s.year, y: s.quality, tip: [p.n + ' ' + s.year, (s.teams || '') + ' · quality ' + f0(s.quality)] })) }));
    const rows = [['Latest team', (p) => p.info?.latest_teams], ['Division', (p) => p.info?.division], ['Quality', (p) => f0(p.info?.quality)], ['Level (team side)', (p) => f0(p.info?.level)], ['Impact (individual)', (p) => f0(p.info?.impact)],
      ['Change 25→26', (p) => p.info?.growth == null ? '—' : sgn(p.info.growth)], ['GB squads', (p) => p.gb.length], ['Seasons in data', (p) => p.seasons.length], ['Club games / goals / assists', (p) => { const c = p.stats.find((s) => s.scope === 'Club'); return c ? `${c.games_incl_estimate ?? c.games} / ${c.goals ?? '—'} / ${c.assists ?? '—'}` : '—'; }],
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
    h('select', { onchange: (e) => { st.s = e.target.value; draw(); } }, [['q', 'Sort: quality'], ['g', 'Sort: biggest risers'], ['gb', 'Sort: most GB squads'], ['n', 'Sort: name']].map(([v, l]) => h('option', { value: v }, l))),
    h('label', { class: 'note' }, h('input', { type: 'checkbox', onchange: (e) => { st.hist = e.target.checked; draw(); } }), ' include players only seen before 2022 (·)'));
  draw(); drawCmp();
  wrap.append(h('h1', null, 'Players'), h('p', { class: 'sub' }, 'Every player in the data. Click a name for their full profile, or tick players to compare them.'), cmpBox, card(null, null, ctl, list));
  return wrap;
};

// ---------- player profile ----------
ROUTES.p = async (k) => {
  const p = await profile(k); if (!p) return card('Player not found', k);
  const C = COL(), i = p.info || {};
  const out = [h('h1', null, p.n), h('p', { class: 'sub' }, [i.latest_teams, i.division, i.latest_season ? 'latest season ' + i.latest_season : null, p.history.length && !p.seasons.length ? 'seen before 2022 only' : null].filter(Boolean).join(' · '),
    ' ', h('button', { onclick: (e) => { CMP.toggle(p.k); e.target.textContent = CMP.has(p.k) ? 'In comparison ✓' : 'Add to comparison'; } }, CMP.has(p.k) ? 'In comparison ✓' : 'Add to comparison'), ' ', h('a', { href: '#/players' }, 'Compare →'))];
  if (p.info) out.push(tiles([['Quality', f0(i.quality), i.profile], ['Level (team side)', f0(i.level), 'where they’re trusted to play'], ['Impact (individual)', f0(i.impact), 'what they add there'],
    ['Change 25→26', i.growth == null ? '—' : sgn(i.growth), i.growth_drivers || ''], ['GB squads', p.gb.length, p.gb.length ? p.gb.map((g) => g.year).filter((v, j, a) => a.indexOf(v) === j).join(', ') : 'none in the data'], ['Seasons', p.seasons.length + (p.history.length ? ' + ' + new Set(p.history.map((x) => x.year)).size + ' earlier' : ''), 'with rosters']]));
  // trajectory
  if (p.seasons.length) {
    const yrs = [2022, 2023, 2024, 2025, 2026];
    out.push(card('Trajectory', 'Quality each season, split into Level (the team they play for and how much they play) and Impact (what they add, measured against teammates). Hover a point for the team.',
      lineChart([['Quality', C[0], 3], ['Level', C[1], 2], ['Impact', C[2], 2]].map(([nm, c, w]) => ({ name: nm, color: c, w, pts: p.seasons.map((s) => ({ x: s.year, y: s[nm.toLowerCase()], tip: [nm + ' ' + s.year, (s.teams || '') + ' · ' + f0(s[nm.toLowerCase()]) + (s.selection_level ? ' · GB: ' + s.selection_level : '')] })) })), { yDomain: [0, 100], xs: yrs, W: 1000, H: 260 })));
  }
  // career grid
  const rowsMap = new Map();
  const add = (team, year, kind, tipLine, go) => { const key = team; if (!rowsMap.has(key)) rowsMap.set(key, { label: team, cells: {}, kind, go, first: year }); const r = rowsMap.get(key); r.first = Math.min(r.first, year); (r.cells[year] = r.cells[year] || { color: CTX_COL(kind), tips: [] }).tips.push(tipLine); };
  const ourTeams = new Set(p.apps.map((a) => a.team));
  const histName = (t) => { const s = t.replace(/^(London|Birmingham|Bristol|Glasgow|Durham|Royal Leamington Spa|South London|Epsom|Edinburgh|Reading|Cambridge|Oxford|Manchester|Leeds|Sheffield|Brighton|Southampton|Nottingham) /, ''); const b = s.replace(/ Ultimate$/, ''); if (ourTeams.has(t)) return t; if (ourTeams.has(s)) return s; if (b && ourTeams.has(b)) return b; return t; };
  p.history.filter((x) => !/^GB/.test(x.division)).forEach((x) => add(histName(x.team), x.year, 'Club', (x.events || '') + (x.goals !== '' && x.goals != null ? ` · ${x.goals}G ${x.assists}A` : '')));
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
const KORDER = ['WUCC', 'EUCF', 'Elite Invite', 'E2CF', 'UKU Nationals', 'Masters (worlds)', 'Masters (EMUCC)', 'UKU Masters', 'Spring Tour', 'Summer Tour', 'UKU Nationals Div 2', 'UKU Regionals / Qualifier', 'UKU Tour', 'Invite', 'Beach club', 'Indoor club'];
const MAJOR = new Set(['WUCC', 'EUCF', 'Elite Invite', 'UKU Nationals', 'Masters (worlds)']);
ROUTES.teams = async () => {
  const I = await index();
  const st = { q: '', d: '', h: true }; const list = h('div'); const cnt = h('p', { class: 'note' });
  const divs = [...new Set(I.teams.map((t) => t.d))].sort((a, b) => (['Open', 'Women', 'Mixed'].indexOf(a) + 1 || 9) - (['Open', 'Women', 'Mixed'].indexOf(b) + 1 || 9) || a.localeCompare(b));
  const draw = () => { const L = I.teams.filter((t) => (st.h || !t.h) && (!st.d || t.d === st.d) && (!st.q || t.n.toLowerCase().includes(st.q))).sort((a, b) => (b.last ?? b.y1) - (a.last ?? a.y1) || (b.nr || 0) - (a.nr || 0) || a.n.localeCompare(b.n));
    cnt.textContent = `${L.length} teams (${L.filter((t) => !t.h).length} with rosters, ${L.filter((t) => t.h).length} with results only).`;
    list.replaceChildren(table(['Team', 'Division', 'Rosters', 'Players used', 'Results', 'Titles', 'Seen'], L.map((t) => ({ go: '#/t/' + enc(t.id), cells: [h('span', { class: 'withbadge' }, badge(t, 20), t.n), t.d, t.h ? 'results only' : `${t.y0}–${t.y1}`, t.p ?? '—', t.nr ?? '—', t.ti || '—', (t.first ?? t.y0) === (t.last ?? t.y1) ? String(t.first ?? t.y0) : `${t.first ?? t.y0}–${t.last ?? t.y1}`] })), { num: [3, 4, 5], max: '44rem' })); };
  draw();
  return [h('h1', null, 'Teams'), h('p', { class: 'sub' }, 'Pick a team to see its honours, results, how its roster changed and who played when.'),
    card(null, null, h('div', { class: 'controls' }, h('input', { type: 'search', placeholder: 'Filter teams', oninput: (e) => { st.q = e.target.value.trim().toLowerCase(); draw(); } }),
      h('select', { onchange: (e) => { st.d = e.target.value; draw(); } }, ['', ...divs].map((d) => h('option', { value: d }, d || 'All divisions'))),
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
  const PAL = ['#2b56a8', '#e07b24', '#2a9d6a', '#8e5bb5', '#c2417a', '#1c9aa8', '#b8860b'];
  const intakes = [...new Set(rows.map((r) => r.ys[0]))].sort(); const ICOL = Object.fromEntries(intakes.map((y, i) => [y, PAL[i % PAL.length]]));
  const ilab = (y) => y === seasons[0] ? `${y} roster` : `${y} intake`;
  const last = seasons[seasons.length - 1];
  const grp = (f) => { const m = new Map(); rows.forEach((r) => f(r).forEach((key) => { if (!m.has(key.id)) m.set(key.id, Object.assign(key, { ps: [] })); m.get(key.id).ps.push(r); })); return [...m.values()]; };
  const links = grp((r) => r.ys.slice(1).map((b, j) => ({ id: r.ys[0] + '|' + r.ys[j] + '|' + b, e: r.ys[0], a: r.ys[j], b, gap: b - r.ys[j] > 1 })));
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
  let lane = top + colH + 24;
  links.filter((l) => l.gap).sort((p, q) => (q.b - q.a) - (p.b - p.a) || p.a - q.a).forEach((l) => { l.lane = lane + l.t / 2; lane += Math.max(1.5, l.t) + 3; });
  links.forEach((l) => { const xa = node[l.a].x + nw, xb = node[l.b].x, ya = l.y0 + l.t / 2, yb = l.y1 + l.t / 2;
    l.d = l.gap ? curve([[xa, ya], [xa + 34, l.lane], [xb - 34, l.lane], [xb, yb]]) : curve([[xa, ya], [xb, yb]]); });
  const { box, svg } = svgBox(W, lane + 14);
  const gid = 'sfgrad' + Math.random().toString(36).slice(2, 7);
  const gr = svg.append('defs').append('linearGradient').attr('id', gid); gr.append('stop').attr('offset', 0).attr('stop-color', '#9aa0a6'); gr.append('stop').attr('offset', 1).attr('stop-color', '#111');
  seasons.forEach((s) => { svg.append('text').attr('x', node[s].x + nw / 2).attr('y', 16).attr('text-anchor', 'middle').style('font-weight', 600).style('fill', css('--fg')).text(s);
    svg.append('text').attr('x', node[s].x + nw / 2).attr('y', 30).attr('text-anchor', 'middle').style('fill', css('--muted')).style('font-size', '11px').text(tot[s] + ' players'); });
  if (links.some((l) => l.gap)) svg.append('text').attr('x', 4).attr('y', top + colH + 18).style('fill', css('--muted')).style('font-size', '11px').text('Missed a season, came back ⤵');
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
  const fl = gL.selectAll('path').data(links).join('path').attr('d', (l) => l.d).attr('fill', 'none').attr('stroke', (l) => ICOL[l.e]).attr('stroke-width', (l) => Math.max(1.5, l.t)).attr('stroke-opacity', 0.5).style('cursor', 'pointer')
    .on('click', (ev, l) => drill(ev, `${l.a} → ${l.b} (${ilab(l.e)})`, l.gap ? `Missed ${d3.range(l.a + 1, l.b).join(', ')} and came back in ${l.b}.` : `On the roster in ${l.a} and back in ${l.b}.`, l.ps));
  onTip(fl, (l) => [`${l.a} → ${l.b}${l.gap ? ' (missed a season)' : ''}`, `${l.ps.length} from the ${ilab(l.e)}`, ...(l.ps.length <= 6 ? nm(l.ps) : []), CLICK]);
  const sg = gN.selectAll('rect').data(segs).join('rect').attr('x', (g) => g.x).attr('y', (g) => g.y).attr('width', nw).attr('height', (g) => Math.max(1, g.h)).attr('fill', (g) => ICOL[g.e]).attr('stroke', css('--panel')).attr('stroke-width', 0.6).style('cursor', 'pointer')
    .on('click', (ev, g) => drill(ev, `${g.s} roster: ${ilab(g.e)}`, g.e === g.s && g.s !== seasons[0] ? `New to the roster in ${g.s}.` : `Players from the ${ilab(g.e)} still here in ${g.s}.`, g.ps));
  onTip(sg, (g) => [`${g.s}: ${g.ps.length} from the ${ilab(g.e)}`, g.e === g.s && g.s !== seasons[0] ? 'new this season' : '', CLICK].filter(Boolean));
  box.append(legend(intakes.map((y) => [y === seasons[0] ? `${y} roster (incl. earlier)` : `Joined ${y}`, ICOL[y]]).concat([['Left the roster', '#444']])));
  return box;
}
// EUCS ranking as a reference: the European Ultimate Federation's own game-by-game rating (ranking.ultimatefederation.eu). Not used in our scores.
function eucsCard(L) {
  return card('EUCS ranking (reference)', 'The EUF’s own rating of every team in the European Ultimate Club Season, from all its EUCS games. Shown for reference only; it is not used in any of our scores, which stay UK-focused. The latest season can be a mid-season ranking.',
    table(['Season', 'EUCS rank', 'Rating', 'Record (W-L)', 'Tournaments', 'Ranking date'], L.map((r) => ({ cells: [r.season, r.rank ? `${ord(r.rank)} of ${r.of}` : '—', r.rating != null ? d3.format('.0f')(r.rating) : '—', r.record, r.tournaments, r.date] })), { num: [2] }),
    h('p', { class: 'note' }, h('a', { href: 'https://ranking.ultimatefederation.eu/', target: '_blank', rel: 'noopener' }, 'Open the EUCS ranking ↗')));
}
ROUTES.t = async (id) => {
  const ix0 = (await index()).teams.find((x) => x.id === id); if (!ix0) throw new Error('Team not found');
  const t = (await getJSON('t/' + String(ix0.b).padStart(2, '0') + '.json'))[id]; const C = COL();
  const S = (t.seasons || []).slice().sort((a, b) => a.year - b.year), res = t.results || [];
  const majors = res.filter((r) => r.place === 1 && MAJOR.has(r.kind));
  const ret = S.filter((s) => s.retention != null);
  const slug = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const ix = (await index()).teams.find((x) => x.id === id) || { n: t.team };
  const out = [h('div', { class: 'teamhead' }, badge(ix, 56), h('h1', null, t.team)), h('p', { class: 'sub' }, `${t.division} · ` + (t.history_only ? ((t.results || []).length ? `results ${t.first_year}–${t.last_year}` : `squad lists ${t.first_year}–${t.last_year}`) + ((t.grid || []).length ? ' (earlier seasons only)' : ' (no rosters in the data yet)') : `rosters ${t.first_year}–${t.last_year}, results from ${d3.min(res, (r) => r.year) ?? t.first_year}`)),
    tiles([['Seasons with rosters', t.history_only ? '—' : t.n_seasons], ['Players used', t.players_used ?? '—', 'everyone who played at least once'], ['Average retention', ret.length ? pct(d3.mean(ret, (s) => s.retention)) : '—', 'of last season’s core roster back'],
      ['Major titles', majors.length, majors.length ? d3.rollups(majors, (v) => v.length, (r) => r.kind).map(([k, n]) => n + '× ' + k).join(', ') : 'Nationals, EUCF, WUCC, Elite Invite, masters worlds'], ['Podiums', res.filter((r) => r.place && r.place <= 3).length, 'all competitions in the data']]),
    card('Honours by competition', 'Every finish we have, by competition and season. Gold, silver and bronze mark medals; a number is the place. Hover for the events; click to open the competition.', honours(res, { compGo: (k) => slug(k) }))];
  if (t.eucs && t.eucs.length) out.push(eucsCard(t.eucs));
  if (t.history_only && !(t.grid || []).length) return out;
  if (t.history_only) { out.push(whoPlayed(t, C)); return out; }
  // results
  const evPts = S.flatMap((s) => (s.events || []).map((e) => ({ x: s.year, y: e.pct, tip: [e.event, `${ord(e.place)}${e.field ? ' of ' + e.field : ''} · percentile ${f0(e.pct)}`], fill: MEDAL(e.place) || C[0], r: 4 })));
  out.push(h('div', { class: 'grid2' },
    card('Results each season', 'Each dot is an event: finish as a percentile of the field (100 = won it). The line is the season average.',
      lineChart([{ name: 'Season average', color: C[0], w: 2.5, pts: S.map((s) => ({ x: s.year, y: s.mean_percentile, tip: ['Season ' + s.year, 'average ' + f0(s.mean_percentile)] })) }, { name: 'Events', color: C[7], line: false, pts: evPts }], { yDomain: [0, 100], legend: false })),
    card('Roster flow', 'Above the line: this season’s core roster, split into players who stayed and new arrivals. Below: last season’s players who didn’t return.',
      barChart(S.map((s) => ({ x: s.year, stayed: s.stayed, joined: s.stayed == null ? s.roster_size : s.joined, left: s.left })), [{ key: 'stayed', name: 'Stayed', color: C[0] }, { key: 'joined', name: 'Joined', color: C[2] }, { key: 'left', name: 'Left', color: C[4], neg: true }], { diverge: true }))));
  // retention and stay
  const core = (t.grid || []).map((r) => ({ n: r.n, k: r.k, ys: [2022, 2023, 2024, 2025, 2026].filter((y) => r.cells[y] === 'team') })).filter((r) => r.ys.length);
  const seen = [2022, 2023, 2024, 2025, 2026].filter((y) => core.some((r) => r.ys.includes(y)));
  const streak = (r, y) => { let n = 0; for (let x = y; r.ys.includes(x); x--) n++; return n; };
  const ten = seen.map((y) => { const on = core.filter((r) => r.ys.includes(y)); const c = [0, 0, 0, 0, 0]; on.forEach((r) => c[Math.min(5, streak(r, y)) - 1]++); return { x: y, a: c[0], b: c[1], c: c[2], d: c[3], e: c[4] }; });
  const coh = seen.slice(0, -1).map((y0, i) => { const g = core.filter((r) => r.ys[0] === y0); return { name: (y0 === 2022 ? '2022 roster' : y0 + ' intake') + ` (${g.length})`, color: C[i % 8], n: g.length, pts: seen.filter((y) => y >= y0).map((y) => ({ x: y, y: g.length ? g.filter((r) => r.ys.includes(y)).length / g.length : null, tip: [(y0 === 2022 ? 'On the 2022 roster' : 'Joined ' + y0), `${y}: ${g.filter((r) => r.ys.includes(y)).length} still here`] })) }; }).filter((c) => c.n >= 3);
  const TR = await getJSON('trends.json');
  const lg = TR.retention.years.map((y, i) => ({ x: y, y: TR.retention.all[i] }));
  const stays = core.map((r) => r.ys.length);
  out.push(card('Retention and how long players stay', 'Left: share of last season’s core roster that came back, against the whole league (dashed). Right: each core roster split by how many seasons in a row each player has been on it.',
    tiles([['Average stay', stays.length ? f1(d3.mean(stays)) + ' seasons' : '—', 'core seasons per player, 2022–26'], ['Long-stayers', core.length ? pct(core.filter((r) => r.ys.length >= 3).length / core.length) : '—', '3+ core seasons'], ['Same core in ' + (seen[seen.length - 1] || ''), ten.length ? pct((ten[ten.length - 1].c + ten[ten.length - 1].d + ten[ten.length - 1].e) / Math.max(1, d3.sum(Object.values(ten[ten.length - 1]).slice(1)))) : '—', 'of the roster in their 3rd+ season in a row']]),
    h('div', { class: 'grid2' },
      lineChart([{ name: t.team, color: C[0], w: 2.5, pts: ret.map((s) => ({ x: s.year, y: s.retention })) }, { name: 'All teams', color: C[7], dash: '4 3', pts: lg }], { yDomain: [0, 1], yFmt: pct, xs: [2023, 2024, 2025, 2026], W: 520 }),
      barChart(ten, [['a', '1st season'], ['b', '2nd'], ['c', '3rd'], ['d', '4th'], ['e', '5th']].map(([k, n], i) => ({ key: k, name: n, color: `color-mix(in srgb, ${C[0]} ${[30, 50, 70, 85, 100][i]}%, transparent)` })), { W: 520 }))));
  if (seen.length >= 2) out.push(card('Squad flow', `Each season’s core roster, split by the year players joined (${seen[0]} includes anyone who joined earlier). Bands carry each intake into the next season, players who missed a season and came back run underneath, and the grey-to-black blocks are players who left. Click any part for the players.`,
    squadFlow(core.map((r) => ({ ...r, ev: ((t.grid || []).find((g) => g.k === r.k) || {}).ev })), seen, { index: await index() })));
  // where from / where to
  const fy = S.filter((s) => (s.joined_names || []).length || (s.left_names || []).length);
  if (fy.length) {
    const sel = h('select'), inB = h('div'), outB = h('div');
    const drawIO = () => { const s = fy.find((x) => String(x.year) === sel.value) || fy[fy.length - 1];
      const cnt = (L, f) => d3.rollups(L, (v) => v, f).map(([g, v]) => ({ label: g, v: v.length, tip: [g, v.map((x) => x.n).join(', ')] })).sort((a, b) => b.v - a.v).slice(0, 12);
      inB.replaceChildren(h('h3', null, 'Joined for ' + s.year), (s.joined_names || []).length ? hbars(cnt(s.joined_names, (d) => d.src), { W: 520 }) : h('p', { class: 'note' }, 'None'));
      outB.replaceChildren(h('h3', null, 'Left after ' + (s.year - 1)), (s.left_names || []).length ? hbars(cnt(s.left_names, (d) => d.dst).map((r) => ({ ...r, color: C[4] })), { W: 520 }) : h('p', { class: 'note' }, 'None')); };
    sel.replaceChildren(...fy.map((s) => h('option', { value: s.year }, s.year))); sel.value = fy[fy.length - 1].year; sel.onchange = drawIO; drawIO();
    out.push(card('Where players came from and went', 'Hover a bar for the names.', h('div', { class: 'controls' }, sel), h('div', { class: 'grid2' }, inB, outB)));
  }
  // strength
  const sm = [['Core roster size', 'roster_size'], ['GB players (last 3 seasons)', 'gb_players'], ['Experience (earlier seasons here)', 'experience'], ['Top-15 individual quality', 'top15']];
  out.push(card('Roster strength over time', null, h('div', { class: 'grid2' }, sm.map(([n, f], i) => h('div', null, h('h3', null, n), lineChart([{ name: n, color: C[i % 8], pts: S.map((s) => ({ x: s.year, y: s[f] })) }], { W: 520, H: 180, legend: false }))))));
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
  const I = await index(); const st = { lvl: '' }; const box = h('div');
  const draw = () => { const L = I.gb.filter((g) => !st.lvl || g.lvl === st.lvl); const years = [...new Set(L.flatMap((g) => g.ed.map((e) => e[0])))].sort((a, b) => a - b);
    box.replaceChildren(medalGrid(L.map((g) => ({ label: g.n.replace(/^GB /, ''), go: '#/g/' + enc(g.id), cells: Object.fromEntries(g.ed.map(([y, p]) => [y, { place: p, go: '#/g/' + enc(g.id) + '/' + y, tip: [g.n + ' ' + y, p ? ord(p) : 'no placing'] }])) })), years, { labW: 210 })); };
  draw();
  const famOrder = ['Senior', 'World Games', 'U24', 'U20', 'U17', 'Masters', 'Beach', 'Indoor'];
  const cyc = (I.gbc || []).slice().sort((a, b) => famOrder.indexOf(a.fam) - famOrder.indexOf(b.fam) || a.n.localeCompare(b.n));
  const fin = (p) => p ? ord(p) : '–';
  const cycCard = card('Cycles', 'A Euros followed by the next Worlds is one cycle (e.g. 2023 EUC + 2024 WUC). Open a programme to see each cycle’s Euros squad, Worlds squad and crossover, and who carries through from cycle to cycle.',
    h('div', { class: 'cycgrid' }, famOrder.filter((f) => cyc.some((c) => c.fam === f)).map((f) => h('div', { class: 'cycfam' }, h('h3', null, { Senior: 'Senior (EUC + WUGC/WUC)', 'World Games': 'World Games', U24: 'U24', U20: 'U20 (Euros + Worlds)', U17: 'U17', Masters: 'Masters (Euros + Worlds)', Beach: 'Beach (Euros + Worlds)', Indoor: 'Indoor' }[f]),
      cyc.filter((c) => c.fam === f).map((c) => h('a', { class: 'cycrow', href: '#/gc/' + enc(c.id) }, h('b', null, c.n.replace(/^GB (U\d+ |Beach |Indoor |World Games )?/, '')), h('span', { class: 'muted' }, c.cyc.slice(-3).map(([l, e, w]) => l + ' ' + (w != null || e != null ? [e != null ? fin(e) : null, w != null ? fin(w) : null].filter(Boolean).join('/') : '')).join(' · '))))))));
  return [h('h1', null, 'GB squads'), h('p', { class: 'sub' }, 'Every GB squad we have since 2010, with its finish. Click a squad line to follow it over time, or a circle to open that squad.'),
    card('GB pathway', 'How players move from U17 to U20, U24, senior and masters squads, as a flow you can click into.', h('a', { class: 'btn primary', href: '#/pathway' }, 'Open the pathway →')), cycCard,
    card(null, null, h('div', { class: 'controls' }, h('select', { onchange: (e) => { st.lvl = e.target.value; draw(); } }, [['', 'All levels'], ['Senior', 'Senior (World Games, WUGC, EUC)'], ['U24', 'U24'], ['Junior', 'U20 and U17'], ['Beach', 'Beach'], ['Masters', 'Masters'], ['Indoor', 'Indoor']].map(([v, l]) => h('option', { value: v }, l)))), box),
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
ROUTES.gc = async (id) => {
  const P = await getJSON('gc/' + enc(id) + '.json'); const C = COL(); const cs = P.cycles;
  const plink = (p) => h('a', { href: '#/p/' + enc(p.k) }, p.n);
  const evName = (x, w) => x ? `${w ? 'Worlds' : 'Euros'} ${x.year}` : null;
  const out = [h('h1', null, P.name + (P.paired ? ' — cycles' : '')), h('p', { class: 'sub' }, P.paired ? 'Each cycle is a Euros followed by the next Worlds. Players on either roster count as part of that cycle’s squad.' : 'Each edition is its own cycle.', ' ', h('a', { href: '#/gb' }, '← all GB squads'))];
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
  const sel = h('select', null, cs.map((c, i) => h('option', { value: i, selected: i === cs.length - 1 ? true : null }, c.label)));
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
      card('Clubs they came from', 'Club at the time of the event (from rosters that year).', c.clubs.length ? hbars(c.clubs.slice(0, 14).map(([t, n]) => ({ label: t, v: n, color: C[0] })), { W: 1000, fmt: (v) => v + (v === 1 ? ' player' : ' players') }) : h('p', { class: 'note' }, 'No club data for this cycle.'))); };
  sel.onchange = show; show();
  out.push(h('h2', { style: 'margin-top:18px' }, 'One cycle in detail'), h('div', { class: 'controls' }, h('span', { class: 'muted' }, 'Cycle:'), sel), box);
  return out;
};
ROUTES.g = async (arg) => {
  const [id, yr] = arg.split('/'); const L = await getJSON('g/' + enc(id) + '.json'); const C = COL();
  const E = L.editions.map((e) => ({ ...e, R: e.roster || [] }));
  const hist = new Map(); const all = await Promise.all((await index()).gb.filter((g) => g.lvl !== 'zz').map((g) => getJSON('g/' + enc(g.id) + '.json')));
  all.forEach((l) => l.editions.forEach((e) => (e.roster || []).forEach((r) => { if (!hist.has(r.k)) hist.set(r.k, []); hist.get(r.k).push({ y: e.year, t: e.team }); })));
  E.forEach((e, i) => { const prev = i ? new Set(E[i - 1].R.map((r) => r.k)) : null; e.back = prev ? e.R.filter((r) => prev.has(r.k)).length : null; e.ret = prev && e.R.length ? e.back / e.R.length : null;
    e.exp = [0, 0, 0, 0]; e.R.forEach((r) => { const b = (hist.get(r.k) || []).filter((x) => x.y < e.year).length; e.exp[Math.min(3, b)]++; }); });
  const pl = E.filter((e) => e.place), best = d3.min(pl, (e) => e.place), allP = new Set(E.flatMap((e) => e.R.map((r) => r.k)));
  const sel = E.find((e) => String(e.year) === yr) || E[E.length - 1];
  const kindOf = (t) => /U17/.test(t) ? 'U17' : /U20/.test(t) ? 'U20' : /U24/.test(t) ? 'U24' : /Beach/.test(t) ? 'Beach' : /Master/.test(t) ? 'Masters' : /Indoor/.test(t) ? 'Indoor' : 'Senior';
  const mine = kindOf(L.team), KINDS = ['U17', 'U20', 'U24', 'Senior', 'Beach', 'Indoor', 'Masters'].filter((k) => k !== mine);
  const pt = E.map((e) => { const o = { year: e.year, n: e.R.length }; KINDS.forEach((k) => { o[k] = e.R.filter((r) => (hist.get(r.k) || []).some((x) => x.y < e.year && kindOf(x.t) === k)).length; }); return o; });
  const used = KINDS.filter((k) => pt.some((p) => p[k]));
  const prog = ((await index()).gbc || []).find((c) => (c.lines || []).includes(id));
  const out = [h('h1', null, L.team), h('p', { class: 'sub' }, `${E.length} editions, ${E[0].year}–${E[E.length - 1].year}. Rosters before 2017 are often incomplete on ultimate-reference.com.`, prog ? [' ', h('a', { class: 'btn', href: '#/gc/' + enc(prog.id) }, 'See ' + prog.n + ' by cycle →')] : null),
    tiles([['Editions', E.length], ['Players used', allP.size], ['Best finish', ord(best), (() => { const n = pl.filter((e) => e.place <= 3).length; return n + (n === 1 ? ' medal' : ' medals'); })()], ['Carried over', E.some((e) => e.ret != null) ? pct(d3.mean(E.filter((e) => e.ret != null), (e) => e.ret)) : '—', 'average share of a squad who were in the one before']]),
    h('div', { class: 'grid3' },
      card('Finish', null, lineChart([{ name: 'Finish', color: C[0], pts: pl.map((e) => ({ x: e.year, y: e.place, fill: MEDAL(e.place), r: e.place <= 3 ? 6 : 4, tip: [e.team + ' ' + e.year, ord(e.place)], go: '#/g/' + enc(id) + '/' + e.year })) }], { W: 360, yDomain: [Math.max(4, d3.max(pl, (e) => e.place) || 4), 1], yFmt: (v) => Number.isInteger(v) ? ord(v) : '', legend: false })),
      card('Carried over from the squad before', null, lineChart([{ name: 'Carried over', color: C[0], pts: E.filter((e) => e.ret != null).map((e) => ({ x: e.year, y: e.ret, tip: [String(e.year), `${e.back} of ${e.R.length} were in the previous squad`] })) }], { W: 360, yDomain: [0, 1], yFmt: pct, legend: false })),
      card('GB experience in the squad', null, barChart(E.map((e) => ({ x: e.year, a: e.exp[0], b: e.exp[1], c: e.exp[2], d: e.exp[3] })), [['a', 'First GB squad'], ['b', '2nd'], ['c', '3rd'], ['d', '4th+']].map(([k, n], i) => ({ key: k, name: n, color: `color-mix(in srgb, ${C[1]} ${[30, 55, 78, 100][i]}%, transparent)` })), { W: 360 })))];
  if (used.length) out.push(card('Where the players came through', 'How many players in each edition had already been in another kind of GB squad.', table(['Edition', 'Players', ...used.map((k) => 'Had played ' + k)], pt.map((p) => ({ cells: [p.year, p.n, ...used.map((k) => p[k] ? `${p[k]} (${pct(p[k] / p.n)})` : '—')] })), { num: [0, 1, ...used.map((_, i) => i + 2)] })));
  // the selected edition
  const clubs = d3.rollups(sel.R.filter((r) => r.club), (v) => v, (r) => r.club).sort((a, b) => b[1].length - a[1].length);
  const edSel = h('select', { onchange: (e) => { location.hash = '#/g/' + enc(id) + '/' + e.target.value; } }, E.slice().reverse().map((e) => h('option', { value: e.year, selected: e === sel || null }, `${e.year} — ${e.place ? ord(e.place) : 'no placing'}`)));
  out.push(card(`${sel.team} ${sel.year}`, sel.event + (sel.place ? ' · finished ' + ord(sel.place) : ''), h('div', { class: 'controls' }, edSel),
    tiles([['Players', sel.R.length], ['First GB squad', sel.R.filter((r) => r.caps === 1).length], ['Average squads', sel.R.length ? f1(d3.mean(sel.R, (r) => r.caps)) : '—', 'GB squads per player, this one included'], ['Roster quality', f0(sel.quality), 'average club-season quality (2022+)']]),
    h('div', { class: 'grid2' }, h('div', null, h('h3', null, 'Clubs at the time'), clubs.length ? hbars(clubs.map(([c, v]) => ({ label: c, v: v.length, tip: [c, v.map((r) => r.n).join(', ')] })), { W: 520 }) : h('p', { class: 'note' }, 'Clubs are known from 2022 onwards.')),
      h('div', null, h('h3', null, 'Roster'), table(['Player', 'Club then', 'Quality', 'GB squad no.', 'Total'], sel.R.map((r) => ({ go: '#/p/' + enc(r.known ? r.k : 'h:' + r.k), cells: [r.n, r.club || '—', f0(r.q), ord(r.caps), r.total] })), { num: [2, 3, 4], max: '26rem' })))));
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
  const st = { d: divs.includes('Open') ? 'Open' : divs[0], y: yr || '' }; const box = h('div'), medBox = h('div');
  const draw = () => {
    const R = E.results.filter((r) => String(r.division) === st.d);
    const best = d3.rollups(R, (v) => v.slice().sort((a, b) => (a.place || 999) - (b.place || 999))[0], (r) => r.team, (r) => r.year);
    const yrs = [...new Set(R.map((r) => r.year))].sort((a, b) => a - b);
    ys.replaceChildren(h('option', { value: '' }, 'All years'), ...yrs.slice().reverse().map((y) => h('option', { value: y, selected: String(y) === st.y || null }, y)));
    if (!st.y) {
      const teams = best.map(([t, v]) => ({ t, pts: v.map(([y, r]) => ({ x: y, y: r.place, r: r.place <= 3 ? 6 : 3.5, fill: MEDAL(r.place), tip: [t + ' · ' + y, `${r.event}: ${ord(r.place)}${r.field ? ' of ' + r.field : ''}`, r.players ? r.players + ' players' : ''].filter(Boolean), go: '#/e/' + enc(id) + '/' + y })).filter((p) => p.y).sort((a, b) => a.x - b.x) })).filter((d) => d.pts.length).sort((a, b) => b.pts.length - a.pts.length || d3.min(a.pts, (p) => p.y) - d3.min(b.pts, (p) => p.y)).slice(0, 10);
      const mx = Math.max(4, d3.max(teams.flatMap((d) => d.pts), (p) => p.y) || 4);
      box.replaceChildren(lineChart(teams.map((d, i) => ({ name: d.t, color: C[i % 8], pts: d.pts })), { xs: yrs, W: 1000, H: 320, labels: true, yScale: d3.scaleLog, yDomain: [mx, 1], yAxis: d3.axisLeft(d3.scaleLog([mx, 1], [294, 12])).tickValues([1, 2, 3, 5, 10, 20, 40].filter((v) => v <= mx)).tickFormat(ord) }),
        h('p', { class: 'note' }, 'Higher = better. Medal colours mark podiums. Click a point for that year’s standings. Showing the ' + teams.length + ' UK teams with the most finishes here.'));
    } else {
      const rows = R.filter((r) => String(r.year) === st.y).sort((a, b) => (a.place || 999) - (b.place || 999));
      const multi = new Set(rows.map((r) => r.event)).size > 1;
      box.replaceChildren(table([...(multi ? ['Event'] : []), 'Place', 'Team', 'Players', 'Roster quality', 'GB players', 'Back from last year', 'Top players'],
        rows.map((r) => ({ go: tid.get(r.team + '|' + r.division) ? '#/t/' + enc(tid.get(r.team + '|' + r.division)) : null, cells: [...(multi ? [r.event] : []), ord(r.place) + (r.field ? ' / ' + r.field : ''), r.team, r.players ?? '—', f0(r.quality), r.gb_players ?? '—', pct(r.returning), r.top || ''] })), { max: '40rem' }));
    }
    const bt = best.map(([t, v]) => { const ps = v.map(([, r]) => r.place).filter(Boolean); return { t, g: ps.filter((p) => p === 1).length, pod: ps.filter((p) => p <= 3).length, n: v.length, yrs: v.filter(([, r]) => r.place === 1).map(([y]) => y).sort().join(', ') }; }).filter((d) => d.pod).sort((a, b) => b.g - a.g || b.pod - a.pod);
    medBox.replaceChildren(bt.length ? table(['Team', 'Titles', 'Podiums', 'Seasons with a result', 'Title years'], bt.map((d) => ({ go: tid.get(d.t + '|' + st.d) ? '#/t/' + enc(tid.get(d.t + '|' + st.d)) : null, cells: [d.t, d.g, d.pod, d.n, d.yrs] })), { num: [1, 2, 3] }) : h('p', { class: 'note' }, 'No UK podiums recorded.'));
  };
  const ys = h('select', { onchange: (e) => { st.y = e.target.value; draw(); } });
  const dv = h('select', { onchange: (e) => { st.d = e.target.value; draw(); } }, divs.map((d) => h('option', { value: d, selected: d === st.d || null }, d)));
  draw();
  return [h('h1', null, E.kind), h('p', { class: 'sub' }, 'UK teams only. Years before 2022 come from ultimate-reference.com.'), card(null, null, h('div', { class: 'controls' }, dv, ys), box), card('Titles and podiums', 'UK teams with a top-three finish here.', medBox)];
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
  if (T.eucs_uk && T.eucs_uk.length) {
    const E = T.eucs_uk, seasons = [...new Set(E.map((r) => r.season))].sort();
    const tidN = new Map(I.teams.map((t) => [t.n, t.id]));
    out.push(card('UK teams in the EUCS ranking (reference)', 'The EUF’s game-by-game rating of every team in the European Ultimate Club Season. Shown for context only: our scores use UK and international finishes, not this rating. The latest season can be a mid-season ranking.',
      h('div', { class: 'grid3' }, ['Mixed', 'Open', 'Women'].map((d) => { const L = E.filter((r) => r.division === d); const teams = [...new Set(L.map((r) => r.team))];
        const best = (t) => d3.min(L.filter((r) => r.team === t), (r) => r.rank ?? 99); teams.sort((a, b) => best(a) - best(b));
        return h('div', null, h('h3', null, d), table(['Team', ...seasons.map(String)], teams.map((t) => ({ cells: [t, ...seasons.map((y) => { const r = L.find((x) => x.team === t && x.season === y); return r && r.rank ? `${ord(r.rank)} of ${r.of}` : '—'; })] })), { num: seasons.map((_, i) => i + 1) })); })),
      h('p', { class: 'note' }, h('a', { href: 'https://ranking.ultimatefederation.eu/', target: '_blank', rel: 'noopener' }, 'Open the EUCS ranking ↗'))));
  }
  out.push(h('p', { class: 'note' }, 'Movement between clubs has its own page: ', h('a', { href: '#/moves' }, 'Moves →')));
  return out;
};

// ---------- moves ----------
ROUTES.moves = async () => {
  const M = await getJSON('moves.json'); const I = await index(); const C = COL();
  const tid = new Map(I.teams.map((t) => [t.n, t.id]));
  const all = M.context[0];
  const tbtn = (t) => tid.get(t) ? h('a', { class: 'btn', href: '#/t/' + enc(tid.get(t)) }, t + ' team page →') : null;
  const out = [h('h1', null, 'Moves'), h('p', { class: 'sub' }, `${M.total} club moves between seasons (2022–26). “Up” means moving to a team at least 10 points higher in team level that season, “down” at least 10 lower. Click any bar, row or point to see the players behind it.`)];
  const DKEY = (k) => k === 'unknown' ? '' : k;
  out.push(card('Up, across or down, each season', 'Click a bar segment for those moves.', barChart(M.by_year.map((y) => ({ x: y.year, up: y.up, level: y.level, down: y.down, unknown: y.unknown })), [{ key: 'up', name: 'To a stronger team', color: C[2] }, { key: 'level', name: 'Similar level', color: C[7] }, { key: 'down', name: 'To a weaker team', color: C[4] }, { key: 'unknown', name: 'Level unknown', color: css('--grid') }], { W: 1000, H: 240,
    onClick: (d, k, ev) => dr(ev, (D) => { const L = D.mv.filter((m) => m.y === d.x && m.dir === DKEY(k.key)); return { title: `Moves into ${d.x}: ${k.name.toLowerCase()}`, note: 'Team level is 0–100 (100 = strongest UK team in the division that season).', head: MVHEAD, num: [1, 4, 5, 6, 7], rows: mvRows(D, L) }; }) }),
    finding(`Of moves where both teams’ levels are known, ${pct(all.up)} were to a stronger team and ${pct(all.down)} to a weaker one. ${M.by_year[M.by_year.length - 1].cross} of the ${M.by_year[M.by_year.length - 1].up + M.by_year[M.by_year.length - 1].level + M.by_year[M.by_year.length - 1].down + M.by_year[M.by_year.length - 1].unknown} moves into ${M.by_year[M.by_year.length - 1].year} also changed division.`, 'flat')));
  const CTX = [() => true, (m) => m.drop === 1, (m) => !!m.gb, (m) => !!m.cross, (m) => m.ten === 1, (m) => m.ten >= 3];
  out.push(card('What comes before a move', 'How the direction of a move changes with the situation. Compare each row with “All moves”. Click a row for the moves.', table(['Situation', 'Moves', 'To a stronger team', 'To a weaker team'], M.context.map((c, i) => ({ onclick: (ev) => dr(ev, (D) => { const L = D.mv.filter((m) => m.dir && CTX[i](m));
      return { title: c.label, note: 'Moves where both teams’ levels are known.', sum: [['Moves', L.length], ['To a stronger team', L.filter((m) => m.dir === 'up').length], ['Similar', L.filter((m) => m.dir === 'level').length], ['To a weaker team', L.filter((m) => m.dir === 'down').length]], head: [...MVHEAD, 'Direction'], num: [1, 4, 5, 6, 7], rows: mvRows(D, L, { extra: (m) => [DIRW[m.dir]] }) }; }), cells: [c.label, c.n, pct(c.up), pct(c.down)] })), { num: [1, 2, 3] }),
    finding((() => { const g = M.context.find((c) => /GB/.test(c.label)), t3 = M.context.find((c) => /3\+/.test(c.label)); return `Players in a GB squad around the time of a move go to a stronger team ${pct(g.up)} of the time (vs ${pct(all.up)} overall). After 3+ seasons at one club, moves are more often down (${pct(t3.down)}), which fits players stepping back later in their time at a club. Small numbers in some rows, so treat these as signals.`; })(), 'flat')));
  out.push(h('div', { class: 'grid2' },
    card('When in a stint players move', 'Seasons at the old team before moving. Click a bar for the moves.', barChart(M.tenure.map((t) => ({ x: t.seasons + (t.seasons >= 4 ? '+' : ''), s: t.seasons, up: t.up, level: t.level, down: t.down })), [{ key: 'up', name: 'Stronger', color: C[2] }, { key: 'level', name: 'Similar', color: C[7] }, { key: 'down', name: 'Weaker', color: C[4] }], { W: 520,
      onClick: (d, k, ev) => dr(ev, (D) => { const L = D.mv.filter((m) => m.ten === d.s && m.dir === k.key); return { title: `Moves after ${d.s} season${d.s > 1 ? 's' : ''} at the old team: ${k.name.toLowerCase()}`, head: MVHEAD, num: [1, 4, 5, 6, 7], rows: mvRows(D, L) }; }) }),
      finding(`Most moves (${pct(M.tenure[0] ? (M.tenure[0].up + M.tenure[0].level + M.tenure[0].down) / d3.sum(M.tenure, (t) => t.up + t.level + t.down) : null)}) happen after a single season, partly because the data only starts in 2022.`, 'flat')),
    card('Net movement by club', 'Players arriving minus players leaving (club moves only, 2022–26). Click a bar for who came and went.', hbars(M.clubs.slice(0, 10).concat(M.clubs.slice(-8)).map((c) => ({ label: c.team, v: c.net, color: c.net >= 0 ? C[2] : C[4], tip: [c.team, `${c.inn} in, ${c.out} out`],
      onclick: (ev) => dr(ev, (D) => { const L = D.mv.filter((m) => m.frm === c.team || m.to === c.team).sort((a, b) => b.y - a.y);
        const R = L.map((m) => { const w = D.who(m.p), inn = m.to === c.team; return { cells: [pcell(w), m.y, inn ? 'Arrived' : 'Left', inn ? m.frm : m.to, DIRW[m.dir], sgn(m.dl), nowOf(w)], sv: [w.n, m.y, inn ? 'Arrived' : 'Left', null, null, m.dl] }; });
        return { title: `${c.team}: arrivals and departures`, sum: [['Arrived', c.inn], ['Left', c.out], ['Net', sgn(c.net)]], extra: [h('div', { class: 'controls' }, tbtn(c.team))], head: ['Player', 'Into season', 'Arrived / left', 'Other team', 'Direction of the move', 'Level change', 'Latest team'], num: [1, 5], rows: R }; }) })), { W: 520, fmt: sgn }))));
  out.push(card('Most common routes', 'Club-to-club moves that happened most often. Click a row for the players.', table(['From', 'To', 'Players', 'Who'], M.routes.map((r) => ({ onclick: (ev) => dr(ev, (D) => ({ title: `${r.frm} → ${r.to}`, head: MVHEAD, num: [1, 4, 5, 6, 7], rows: mvRows(D, D.mv.filter((m) => m.frm === r.frm && m.to === r.to)) })), cells: [r.frm, r.to, r.n, r.names] })), { num: [2], max: '28rem' })));
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
        card('How long they had played', 'Seasons in the data (including pre-2022 history) up to and including ' + y.year + '. Click a bar for the players.', hbars(Object.entries(y.seasons).map(([s, n]) => ({ label: s === '5' ? '5+ seasons' : s + (s === '1' ? ' season' : ' seasons'), v: n, color: C[1],
            onclick: lvDrill(`Leavers after ${y.year} with ${s === '5' ? '5+' : s} season${s === '1' ? '' : 's'} in the data`, (r) => r.y === y.year && Math.min(r.n, 5) === +s) })), { W: 520, fmt: (v) => v + ' players' }),
          finding(`${pct((y.seasons['1'] || 0) / y.left)} of ${y.year}’s leavers had only one season in the data: most drop-off is players trying club ultimate for a year.`, 'flat')))); };
    yrSel.onchange = showYear; showYear();
    out.push(h('div', { class: 'controls' }, h('span', { class: 'muted' }, 'Season:'), yrSel), box);
    out.push(card('Squads that lost the most players to the sport', 'Players whose last season in the data was with this team. Click a row for the players.', table(['Team', 'Season', 'Players not seen again'], L.teams.map((t) => ({ onclick: lvDrill(`${t.team}: players not seen after ${t.year}`, (r) => r.t === t.team && r.y === t.year, t.year === last.year ? 'Provisional.' : null), cells: [t.team, t.year + (t.year === last.year ? ' (provisional)' : ''), t.n] })), { num: [1, 2] })));
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
  const st = { s: 'all', min: 2, div: '', masters: false }; const box = h('div'), top = h('div');
  const draw = () => {
    const flow = st.s.includes('>');
    const L = Cn.years[st.s].filter((x) => x[2] >= st.min);
    const used = new Set(L.flatMap((x) => [x[0], x[1]]));
    const T = Cn.teams.filter((t) => used.has(t.t) && (st.masters || ['Open', 'Women', 'Mixed'].includes(t.d)) && (!st.div || t.d === st.div || L.some((x) => (x[0] === t.t || x[1] === t.t) && Cn.teams.find((u) => u.t === (x[0] === t.t ? x[1] : x[0]))?.d === st.div)));
    const order = ['Open', 'Women', 'Mixed']; T.sort((a, b) => (order.indexOf(a.d) + 1 || 9) - (order.indexOf(b.d) + 1 || 9) || b.n - a.n);
    const idx = new Map(T.map((t, i) => [t.t, i])), n = T.length;
    if (!n) { box.replaceChildren(h('p', { class: 'note' }, 'No links at this setting.')); top.replaceChildren(); return; }
    const labW = 150, cell = Math.max(9, Math.min(20, (1000 - labW) / n)), W = labW + cell * n + 10, H = 110 + cell * n + 10;
    const { box: b, svg } = svgBox(W, H); const mx = d3.max(L, (x) => x[2]) || 1, op = d3.scaleSqrt([0, mx], [0.12, 1]);
    const dcol = (d) => ({ Open: C[0], Women: C[3], Mixed: C[2] }[d] || C[7]);
    T.forEach((t, i) => { svg.append('text').attr('x', labW - 4).attr('y', 110 + i * cell + cell * 0.72).attr('text-anchor', 'end').style('fill', dcol(t.d)).style('font-size', Math.min(11, cell * 0.8) + 'px').text(t.t.length > 22 ? t.t.slice(0, 21) + '…' : t.t).style('cursor', 'pointer').on('click', () => { if (tid.get(t.t)) location.hash = '#/t/' + enc(tid.get(t.t)); });
      svg.append('text').attr('transform', `translate(${labW + i * cell + cell * 0.7},106) rotate(-60)`).style('fill', dcol(t.d)).style('font-size', Math.min(11, cell * 0.8) + 'px').text(t.t.length > 18 ? t.t.slice(0, 17) + '…' : t.t); });
    // division blocks
    let start = 0; order.concat(['']).forEach((d) => { const cnt = T.filter((t) => (d ? t.d === d : !order.includes(t.d))).length; if (!cnt) return; svg.append('rect').attr('x', labW + start * cell).attr('y', 110 + start * cell).attr('width', cnt * cell).attr('height', cnt * cell).attr('fill', 'none').attr('stroke', css('--axis')); start += cnt; });
    L.forEach(([a, bb, v]) => { if (!idx.has(a) || !idx.has(bb)) return; const cells = flow ? [[idx.get(a), idx.get(bb)]] : [[idx.get(a), idx.get(bb)], [idx.get(bb), idx.get(a)]];
      cells.forEach(([i, j]) => onTip(svg.append('rect').attr('class', 'ccell').attr('x', labW + j * cell + 0.5).attr('y', 110 + i * cell + 0.5).attr('width', cell - 1).attr('height', cell - 1).attr('rx', 2).attr('fill', C[0]).attr('fill-opacity', op(v)).style('cursor', 'pointer').on('click', () => showPair(a, bb)), () => [flow ? `${a} → ${bb}` : `${a} ↔ ${bb}`, flow ? `${v} played for ${a} in ${st.s.slice(0, 4)} and ${bb} in ${st.s.slice(5)}` : `${v} shared player${v > 1 ? 's' : ''}`, 'Click to see who'])); });
    box.replaceChildren(b, legend([['Open', C[0]], ['Women', C[3]], ['Mixed', C[2]]]), h('p', { class: 'note' }, flow ? 'Rows = the team they left (or also played for) that season; columns = the team in the next season.' : 'Darker = more shared players. Boxes group the divisions; squares outside a box are links across divisions.'));
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
