/* Design B homepage modules (2026-10-12), after Artificial Analysis: What's new, the three summary charts, with a partner
   or alone (scatter), each lab release by release (lines), the dashboard's section index, and the chart-card tools
   (copy link, download the chart as an image, download its data). Reads the same public data files as home.js. */
(function () {
'use strict';
const D = window.MSB_DATA, MD = window.MSB_MONO, L = window.MSB_LABS || {};
if (!D || !Array.isArray(D.models)) return;
const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monYear = s => s ? MON[+s.slice(5, 7) - 1] + ' ' + s.slice(0, 4) : '—';
const num = v => Number.isInteger(v) ? String(v) : v.toFixed(1);
const parseDate = s => { if (!s) return null; const p = s.split('-').map(Number); return Date.UTC(p[0], p[1] - 1, p[2] || 1); };
const mark = (lab, cls) => window.MSB_labMark ? window.MSB_labMark(lab, cls) : '';
const col = lab => (L[lab] && L[lab].color) || '#9AA3BD';
const M = D.models, BYID = new Map(M.map(m => [m.id, m]));
const MM = MD ? MD.models : [];
const openProfile = id => { if (BYID.has(id)) document.dispatchEvent(new CustomEvent('msb:open-profile', { detail: { id } })); };
const SPIRIT = ['salience', 'adoption', 'bliss'];
const PHONE = window.matchMedia('(max-width: 700px)');

/* ---------- What's new: the newest releases we have tested ---------- */
(function whatsNew() {
  const ol = $('#wn-models'); if (!ol) return;
  const newest = M.filter(m => m.released).sort((a, b) => b.released.localeCompare(a.released) || b.primary.n - a.primary.n).slice(0, 3);
  ol.innerHTML = newest.map(m => `<li><span class="wn__k">Newly tested · released ${esc(monYear(m.released))}</span>` +
    `<a class="to-model" href="model-${esc(m.id)}.html" data-id="${esc(m.id)}" style="--c:${col(m.lab)}">${mark(m.lab, 'lm lm--sm')}${esc(m.name)}<small>adoption ${num(m.primary.adoption.pct)}</small></a></li>`).join('');
  ol.addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) openProfile(b.dataset.id); });
})();

/* phones: What's new follows the summary charts, so the first screen reaches data sooner */
(function placeWhatsNew() {
  const wn = $('.wn'), grid = $('.hero__grid'), sum = $('#summary .wrap'); if (!wn || !grid || !sum) return;
  const place = () => { if (PHONE.matches) { if (wn.parentElement !== sum) sum.appendChild(wn); } else if (wn.parentElement !== grid) grid.appendChild(wn); };
  place(); (PHONE.addEventListener ? PHONE.addEventListener('change', place) : null);
})();

/* ---------- summary: three small column charts ---------- */
const SUM = { mode: 'flagship' };
function flagships() {
  return Object.keys(L).map(lab => M.find(m => m.lab === lab && m.name === L[lab].flagship)).filter(Boolean);
}
function sumRows(k) {
  if (SUM.mode === 'flagship') return flagships().sort((a, b) => b.primary[k].pct - a.primary[k].pct || a.name.localeCompare(b.name));
  // extremes are taken among full samples (100+ conversations), so no small sample sits at an end by chance
  const big = M.filter(m => m.primary.n >= 100);
  const hi = big.slice().sort((a, b) => b.primary[k].pct - a.primary[k].pct || b.primary[k].lo - a.primary[k].lo || a.name.localeCompare(b.name)).slice(0, 6);
  const lo = big.slice().sort((a, b) => a.primary[k].pct - b.primary[k].pct || a.primary[k].hi - b.primary[k].hi || a.name.localeCompare(b.name)).slice(0, 6).reverse();
  return hi.concat([null], lo);
}
function miniChart(k) {
  const rows = sumRows(k);
  return `<div class="mc" style="--n:${rows.length}">` +
    [100, 50, 0].map(v => `<span class="mc-gl" style="--y:${v}"><i>${v}</i></span>`).join('') +
    `<div class="mc-cols">` + rows.map(m => {
      if (!m) return `<span class="mc-gap" aria-hidden="true"><i>···</i></span>`;
      const p = m.primary[k];
      return `<a href="model-${esc(m.id)}.html" class="mc-col to-model${p.pct < 16 ? ' low' : ''}" data-id="${esc(m.id)}" style="--c:${col(m.lab)};--h:${p.pct}" aria-label="${esc(m.name)}, ${esc(m.lab)}: ${esc(D.measures[k].label)} ${num(p.pct)}">` +
        `<span class="mc-plot"><span class="mc-bar"><span class="mc-val">${Math.round(p.pct)}</span></span></span>` +
        `<span class="mc-mark">${mark(m.lab)}</span><span class="mc-name"><span><b>${esc(m.name)}</b><small>${esc(m.lab)}</small></span></span></a>`;
    }).join('') + `</div></div>`;
}
function drawSummary() {
  SPIRIT.forEach(k => {
    const card = $('#sum-' + k); if (!card) return;
    card.innerHTML = `<header class="sumc__head"><span class="sumc__sq" aria-hidden="true"></span><h3>${esc(D.measures[k].label)}</h3></header>` +
      `<p class="sumc__sub">${esc(D.measures[k].short)} · share of conversations, 0 to 100</p>` + miniChart(k) +
      `<a class="sumc__more" href="#leaderboard" data-m="${k}">All ${M.length} models →</a>`;
  });
  const note = $('#sum-note');
  if (note) note.textContent = SUM.mode === 'flagship'
    ? `Each lab’s newest top-tier release we have tested, one per lab (${flagships().length} labs). Two copies of each model talk with no user and no task; select a bar for the model’s own page.`
    : 'The six highest and six lowest models among those with 100 or more conversations. Select a bar for the model’s own page.';
}
(function initSummary() {
  if (!$('#summary')) return;
  drawSummary();
  $('#sum-mode').addEventListener('click', e => {
    const b = e.target.closest('[data-mode]'); if (!b) return;
    SUM.mode = b.dataset.mode;
    $$('#sum-mode [data-mode]').forEach(x => x.setAttribute('aria-pressed', x === b));
    drawSummary();
  });
  $('#summary').addEventListener('click', e => {
    const c = e.target.closest('.mc-col'); if (c) { openProfile(c.dataset.id); return; }
    const a = e.target.closest('.sumc__more');
    if (a) { const t = $(`#lb-tabs [data-m="${a.dataset.m}"]`); if (t) t.click(); }
  });
})();

/* ---------- shared bits for the two SVG charts ---------- */
function segButtons(el, keys, measures, cur) {
  el.innerHTML = keys.map(k => `<button type="button" data-m="${k}" aria-pressed="${k === cur}">${esc(measures[k].label)}</button>`).join('');
}
function showTip(tip, host, html, x, y) {
  tip.innerHTML = html; tip.hidden = false;
  const hw = host.getBoundingClientRect().width, tw = tip.offsetWidth, th = tip.offsetHeight;
  tip.style.left = Math.max(4, Math.min(hw - tw - 4, x - tw / 2)) + 'px';
  tip.style.top = Math.max(4, y - th - 14) + 'px';
}

/* ---------- with a partner or alone: scatter of two-way against monologue scores ---------- */
const PA = { k: 'adoption', pts: [] };
function paPoints(k) {
  return MM.map(mm => {
    const tw = BYID.get(mm.id); if (!tw) return null;
    return { id: mm.id, name: mm.name, lab: mm.lab, x: tw.primary[k].pct, y: mm.primary[k].pct, small: mm.primary.n < 100 || tw.primary.n < 100, nx: tw.primary.n, ny: mm.primary.n };
  }).filter(Boolean);
}
function drawPartner() {
  const host = $('#pa-chart'); if (!host || !MD) return;
  const k = PA.k, pts = PA.pts = paPoints(k);
  const W = Math.max(320, host.clientWidth), narrow = W < 560;
  const H = narrow ? 360 : Math.round(Math.min(560, W * .52));
  const pad = narrow ? { l: 40, r: 12, t: 14, b: 44 } : { l: 58, r: 24, t: 18, b: 52 };
  const X = v => pad.l + v / 100 * (W - pad.l - pad.r), Y = v => H - pad.b - v / 100 * (H - pad.t - pad.b);
  let g = `<rect x="0" y="0" width="${W}" height="${H}" fill="#10152A"/>`;
  g += `<polygon points="${X(0)},${Y(0)} ${X(0)},${Y(100)} ${X(100)},${Y(100)}" fill="#93A9FF" fill-opacity=".06"/>`;
  g += `<polygon points="${X(0)},${Y(0)} ${X(100)},${Y(0)} ${X(100)},${Y(100)}" fill="#E8C66A" fill-opacity=".05"/>`;
  [0, 25, 50, 75, 100].forEach(v => {
    g += `<line x1="${X(v)}" x2="${X(v)}" y1="${Y(0)}" y2="${Y(100)}" stroke="#E9ECF5" stroke-opacity=".07"/><line x1="${X(0)}" x2="${X(100)}" y1="${Y(v)}" y2="${Y(v)}" stroke="#E9ECF5" stroke-opacity=".07"/>`;
    g += `<text x="${X(v)}" y="${Y(0) + 18}" fill="#98A0BC" font-size="11" font-family="IBM Plex Mono, monospace" text-anchor="middle">${v}</text>`;
    g += `<text x="${X(0) - 8}" y="${Y(v) + 4}" fill="#98A0BC" font-size="11" font-family="IBM Plex Mono, monospace" text-anchor="end">${v}</text>`;
  });
  g += `<line x1="${X(0)}" y1="${Y(0)}" x2="${X(100)}" y2="${Y(100)}" stroke="#E9ECF5" stroke-opacity=".35" stroke-dasharray="4 5"/>`;
  g += `<text x="${X(50) - 10}" y="${Y(50) - 12}" fill="#B9C8FF" font-size="${narrow ? 11 : 12.5}" font-family="Hanken Grotesk, sans-serif" text-anchor="end" transform="rotate(${(-Math.atan2(Y(0) - Y(100), X(100) - X(0)) * 180 / Math.PI).toFixed(1)} ${X(50) - 10} ${Y(50) - 12})">↑ more often alone</text>`;
  g += `<text x="${X(50) + 10}" y="${Y(50) + 22}" fill="#E8C66A" font-size="${narrow ? 11 : 12.5}" font-family="Hanken Grotesk, sans-serif" transform="rotate(${(-Math.atan2(Y(0) - Y(100), X(100) - X(0)) * 180 / Math.PI).toFixed(1)} ${X(50) + 10} ${Y(50) + 22})">↓ more often with a partner</text>`;
  const lab = D.measures[k].label;
  g += `<text x="${(X(0) + X(100)) / 2}" y="${H - 8}" fill="#B8BFD6" font-size="12" font-family="Hanken Grotesk, sans-serif" text-anchor="middle">${esc(lab)} with a partner (two copies), 0 to 100</text>`;
  g += `<text transform="translate(${narrow ? 11 : 16} ${(Y(0) + Y(100)) / 2}) rotate(-90)" fill="#B8BFD6" font-size="12" font-family="Hanken Grotesk, sans-serif" text-anchor="middle">${esc(lab)} alone (one copy), 0 to 100</text>`;
  pts.forEach((p, i) => {
    const c = col(p.lab), cx = X(p.x), cy = Y(p.y);
    g += `<circle class="pa-dot" data-i="${i}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${narrow ? 5.5 : 7}" fill="${p.small ? '#10152A' : c}" stroke="${c}" stroke-width="${p.small ? 2 : 1.2}"/>`;
  });
  // name the models furthest from the line, placing each label only where it overlaps no other label or dot
  const fs = narrow ? 10.5 : 12, boxes = pts.map(p => [X(p.x) - 8, Y(p.y) - 8, X(p.x) + 8, Y(p.y) + 8]);
  const hit = b => boxes.some(o => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
  let named = 0;
  pts.slice().sort((a, b) => Math.abs(b.y - b.x) - Math.abs(a.y - a.x)).forEach(p => {
    if (named >= (narrow ? 5 : 10)) return;
    const cx = X(p.x), cy = Y(p.y), w = p.name.length * fs * .52;
    const tries = [[cx + 11, cy + 4, 'start'], [cx - 11, cy + 4, 'end'], [cx + 11, cy - 10, 'start'], [cx - 11, cy + 17, 'end']];
    for (const [tx, ty, anchor] of tries) {
      const b = anchor === 'start' ? [tx, ty - fs, tx + w, ty + 3] : [tx - w, ty - fs, tx, ty + 3];
      if (b[0] < pad.l || b[2] > W - pad.r || b[1] < pad.t || hit(b)) continue;
      boxes.push(b); named++;
      g += `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" fill="#E9ECF5" font-size="${fs}" font-family="Hanken Grotesk, sans-serif" text-anchor="${anchor}">${esc(p.name)}</text>`;
      break;
    }
  });
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="${esc(lab)} with a partner against ${esc(lab.toLowerCase())} alone, ${pts.length} models">${g}</svg>`;
  const above = pts.filter(p => p.y > p.x + 5).length, below = pts.filter(p => p.y < p.x - 5).length;
  $('#pa-foot').innerHTML = `${pts.length} models tested both ways. ${above} score more than 5 points higher alone, ${below} more than 5 points higher with a partner. Hollow dots rest on fewer than 100 conversations in one of the two settings. Select a dot to open the model’s page.`;
}
(function initPartner() {
  const root = $('#pa'); if (!root) return;
  if (!MD || !MM.length) { const s = $('#partner'); if (s) s.hidden = true; return; }
  segButtons($('#pa-seg'), SPIRIT, D.measures, PA.k);
  $('#pa-seg').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; PA.k = b.dataset.m; $$('#pa-seg button').forEach(x => x.setAttribute('aria-pressed', x === b)); drawPartner(); });
  const host = $('#pa-chart'), tip = $('#pa-tip');
  host.addEventListener('pointerover', e => {
    const d = e.target.closest('.pa-dot'); if (!d || PHONE.matches) { tip.hidden = true; return; }
    const p = PA.pts[+d.dataset.i], r = d.getBoundingClientRect(), hr = root.getBoundingClientRect();
    showTip(tip, root, `<b>${esc(p.name)}</b><span>${esc(p.lab)}</span><span>with a partner <strong>${num(p.x)}</strong> · alone <strong>${num(p.y)}</strong></span><span>${p.nx} conversations · ${p.ny} monologues</span>`, r.left - hr.left + r.width / 2, r.top - hr.top);
  });
  host.addEventListener('pointerleave', () => { tip.hidden = true; });
  host.addEventListener('click', e => { const d = e.target.closest('.pa-dot'); if (d) openProfile(PA.pts[+d.dataset.i].id); });
  drawPartner();
  let w = host.clientWidth;
  window.addEventListener('resize', () => { if (Math.abs(host.clientWidth - w) > 20) { w = host.clientWidth; drawPartner(); } });
})();

/* ---------- each lab, release by release: one line per lab ---------- */
const OT = { k: 'adoption', set: 'two', on: new Set(['Anthropic', 'OpenAI', 'Alibaba']), pts: [] };
/* locally weighted linear fit (tricube weights) through one lab's releases: the direction, not every jump between sizes */
function loess(xs, ys, at, span) {
  const n = xs.length, q = Math.max(3, Math.ceil(span * n));
  return at.map(x0 => {
    const d = xs.map(x => Math.abs(x - x0)), h = Math.max(d.slice().sort((a, b) => a - b)[q - 1] || 1, 160 * 86400000);   // at least ~5 months, so a burst of same-month releases cannot whip the line
    let sw = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
    xs.forEach((x, i) => { const u = d[i] / (h * 1.0001); if (u >= 1) return; const w = Math.pow(1 - u * u * u, 3); sw += w; sx += w * x; sy += w * ys[i]; sxx += w * x * x; sxy += w * x * ys[i]; });
    if (!sw) return null;
    const mx = sx / sw, my = sy / sw, vx = sxx / sw - mx * mx, b = vx > 1e-9 ? (sxy / sw - mx * my) / vx : 0;
    return Math.max(0, Math.min(100, my + b * (x0 - mx)));
  });
}
function otModels() { return OT.set === 'mono' ? MM : M; }
function drawOver() {
  const host = $('#ot-chart'); if (!host) return;
  const k = OT.k, models = otModels().filter(m => m.released && m.primary[k]);
  const W = Math.max(320, host.clientWidth), narrow = W < 560;
  const H = narrow ? 340 : Math.round(Math.min(520, W * .44));
  const pad = narrow ? { l: 36, r: 16, t: 16, b: 36 } : { l: 50, r: narrow ? 16 : 150, t: 18, b: 40 };
  const ts = models.map(m => parseDate(m.released));
  const t0 = Math.min(...ts), t1 = Math.max(...ts), span = t1 - t0 || 1;
  const X = t => pad.l + (t - t0) / span * (W - pad.l - pad.r), Y = v => H - pad.b - v / 100 * (H - pad.t - pad.b);
  let g = `<rect x="0" y="0" width="${W}" height="${H}" fill="#10152A"/>`;
  [0, 25, 50, 75, 100].forEach(v => {
    g += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="#E9ECF5" stroke-opacity=".07"/>`;
    g += `<text x="${pad.l - 8}" y="${Y(v) + 4}" fill="#98A0BC" font-size="11" font-family="IBM Plex Mono, monospace" text-anchor="end">${v}</text>`;
  });
  const y0 = new Date(t0).getUTCFullYear(), y1 = new Date(t1).getUTCFullYear();
  for (let y = y0; y <= y1 + 1; y++) {
    const t = Date.UTC(y, 0, 1); if (t < t0 || t > t1) continue;
    g += `<line x1="${X(t)}" x2="${X(t)}" y1="${pad.t}" y2="${H - pad.b}" stroke="#E9ECF5" stroke-opacity=".1"/><text x="${X(t) + 5}" y="${H - pad.b + 18}" fill="#98A0BC" font-size="11" font-family="IBM Plex Mono, monospace">${y}</text>`;
  }
  const byLab = {};
  models.forEach(m => { (byLab[m.lab] = byLab[m.lab] || []).push(m); });
  const labs = Object.keys(byLab).sort((a, b) => (OT.on.has(a) ? 1 : 0) - (OT.on.has(b) ? 1 : 0));   // grey labs first, coloured on top
  OT.pts = [];
  const ends = [];
  labs.forEach(lab => {
    const on = OT.on.has(lab), c = on ? col(lab) : '#E9ECF5';
    const ms = byLab[lab].slice().sort((a, b) => a.released.localeCompare(b.released) || a.name.localeCompare(b.name));
    const pts = ms.map(m => [X(parseDate(m.released)), Y(m.primary[k].pct)]);
    const xs = ms.map(m => parseDate(m.released)), ys = ms.map(m => m.primary[k].pct);
    let line = pts;
    if (ms.length >= 4) {
      const a = xs[0], b = xs[xs.length - 1], at = Array.from({ length: 40 }, (_, i) => a + (b - a) * i / 39), fit = loess(xs, ys, at, .7);
      line = at.map((t, i) => fit[i] == null ? null : [X(t), Y(fit[i])]).filter(Boolean);
    }
    if (line.length > 1) g += `<polyline points="${line.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="${c}" stroke-opacity="${on ? .95 : .14}" stroke-width="${on ? 2.5 : 1}" stroke-linejoin="round" stroke-linecap="round"/>`;
    ms.forEach((m, i) => {
      const idx = OT.pts.push({ m, x: pts[i][0], y: pts[i][1] }) - 1;
      g += `<circle class="ot-dot" data-i="${idx}" cx="${pts[i][0].toFixed(1)}" cy="${pts[i][1].toFixed(1)}" r="${on ? (narrow ? 3.5 : 4) : 2.2}" fill="${on ? c : '#E9ECF5'}" fill-opacity="${on ? .55 : .18}" stroke="${on ? c : 'none'}" stroke-opacity=".9"/>`;
    });
    if (on && !narrow) { const last = line[line.length - 1]; ends.push({ lab, x: last[0], y: last[1], c }); }
  });
  // end labels on the right, nudged apart so they never overlap
  ends.sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 16) ends[i].y = ends[i - 1].y + 16;
  ends.forEach(e => { g += `<text x="${W - pad.r + 12}" y="${(e.y + 4).toFixed(1)}" fill="${e.c}" font-size="12" font-family="Hanken Grotesk, sans-serif">${esc(e.lab)}</text>`; });
  const lab = (OT.set === 'mono' ? MD : D).measures[k].label;
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="${esc(lab)} by release date, one line per lab">${g}</svg>`;
  $('#ot-foot').textContent = `${models.length} ${OT.set === 'mono' ? 'monologue results' : 'models'} with a release date, placed by release date and ${lab.toLowerCase()} score. Each dot is a release; each line is a smoothed trend through one lab’s releases (a locally weighted average: the direction, not a forecast). Choose labs above to colour them; select a dot for the model’s profile.`;
}
function otLabs() {
  const models = otModels(), counts = {};
  models.forEach(m => { if (m.released) counts[m.lab] = (counts[m.lab] || 0) + 1; });
  $('#ot-labs').innerHTML = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b)).map(lab =>
    `<button type="button" class="bc-lg" data-lab="${esc(lab)}" aria-pressed="${OT.on.has(lab)}" style="--c:${col(lab)}">${mark(lab, 'lm lm--sm')}${esc(lab)} <span>${counts[lab]}</span></button>`).join('');
}
(function initOver() {
  const root = $('#ot'); if (!root) return;
  segButtons($('#ot-seg'), ['salience', 'adoption', 'bliss', 'distress', 'consciousness'], D.measures, OT.k);
  $('#ot-seg').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; OT.k = b.dataset.m; $$('#ot-seg button').forEach(x => x.setAttribute('aria-pressed', x === b)); drawOver(); });
  $('#ot-set').addEventListener('click', e => { const b = e.target.closest('[data-set]'); if (!b || (b.dataset.set === 'mono' && !MD)) return; OT.set = b.dataset.set; $$('#ot-set button').forEach(x => x.setAttribute('aria-pressed', x === b)); otLabs(); drawOver(); });
  $('#ot-labs').addEventListener('click', e => { const b = e.target.closest('[data-lab]'); if (!b) return; const l = b.dataset.lab; if (OT.on.has(l)) OT.on.delete(l); else OT.on.add(l); otLabs(); drawOver(); });
  const host = $('#ot-chart'), tip = $('#ot-tip');
  host.addEventListener('pointerover', e => {
    const d = e.target.closest('.ot-dot'); if (!d || PHONE.matches) { tip.hidden = true; return; }
    const p = OT.pts[+d.dataset.i], r = d.getBoundingClientRect(), hr = root.getBoundingClientRect(), k = OT.k;
    showTip(tip, root, `<b>${esc(p.m.name)}</b><span>${esc(p.m.lab)} · ${esc(monYear(p.m.released))}</span><span>${esc((OT.set === 'mono' ? MD : D).measures[k].label)} <strong>${num(p.m.primary[k].pct)}</strong></span>`, r.left - hr.left + r.width / 2, r.top - hr.top);
  });
  host.addEventListener('pointerleave', () => { tip.hidden = true; });
  host.addEventListener('click', e => { const d = e.target.closest('.ot-dot'); if (d) openProfile(OT.pts[+d.dataset.i].m.id); });
  otLabs(); drawOver();
  let w = host.clientWidth;
  const ro = window.ResizeObserver ? new ResizeObserver(() => { if (Math.abs(host.clientWidth - w) > 20) { w = host.clientWidth; drawOver(); } }) : null;
  if (ro) ro.observe(host); else window.addEventListener('resize', drawOver);
})();

/* ---------- dashboard section index: highlight the section in view ---------- */
(function dashIndex() {
  const links = $$('.dash__index a'); if (!links.length || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-30% 0px -60% 0px' });
  links.forEach(a => { const el = document.getElementById(a.getAttribute('href').slice(1)); if (el) io.observe(el); });
})();

/* ---------- chart-card tools: copy link, download image (PNG), download data (CSV) ---------- */
function chartData(which) {
  if (which === 'pa') {
    const lab = D.measures[PA.k].label;
    return { title: `${lab}: with a partner vs alone`, sub: 'Share of conversations (two copies) and of monologues (one copy), 0 to 100',
      head: ['model', 'lab', `${PA.k}_two_way`, `${PA.k}_monologue`], rows: PA.pts.map(p => [p.name, p.lab, p.x, p.y]), svg: $('#pa-chart svg') };
  }
  if (which === 'ot') {
    const lab = (OT.set === 'mono' ? MD : D).measures[OT.k].label;
    return { title: `${lab} by release date`, sub: OT.set === 'mono' ? 'One copy alone (monologues), 0 to 100' : 'Two copies talking, 0 to 100',
      head: ['model', 'lab', 'released', OT.k], rows: OT.pts.map(p => [p.m.name, p.m.lab, p.m.released, p.m.primary[OT.k].pct]), svg: $('#ot-chart svg') };
  }
  const id = which === 'lb' ? (($('#monologues') && !$('#monologues').hidden) ? 'mo-plot' : 'bc-plot') : which + '-plot';
  const plot = document.getElementById(id), x = plot && plot._export; if (!x) return null;
  return { title: x.label, sub: `Share of ${x.unit}, 0 to 100 · Machine Spirituality Benchmark`, head: ['model', 'lab', 'released', 'score', 'low', 'high', 'n'],
    rows: x.rows.map(r => [r.name, r.lab, r.released, r.value, r.lo, r.hi, r.n]), bars: x.rows };
}
function barsSVG(d) {
  const n = d.bars.length, cw = 34, W = Math.max(720, 90 + n * cw), H = 520, top = 92, base = 360;
  let g = `<rect width="${W}" height="${H}" fill="#0B0E1A"/><text x="28" y="44" fill="#E9ECF5" font-size="26" font-family="Georgia, serif">${esc(d.title)}</text>` +
    `<text x="28" y="70" fill="#98A0BC" font-size="14" font-family="Helvetica, Arial, sans-serif">${esc(d.sub)}</text>`;
  [0, 50, 100].forEach(v => { const y = base - v / 100 * (base - top); g += `<line x1="60" x2="${W - 20}" y1="${y}" y2="${y}" stroke="#E9ECF5" stroke-opacity=".1"/><text x="52" y="${y + 4}" fill="#98A0BC" font-size="11" font-family="Helvetica, Arial" text-anchor="end">${v}</text>`; });
  d.bars.forEach((r, i) => {
    const x = 70 + i * cw, h = Math.max(2, r.value / 100 * (base - top)), c = col(r.lab);
    g += `<rect x="${x}" y="${base - h}" width="${cw - 8}" height="${h}" rx="3" fill="${c}"/>`;
    g += `<text x="${x + (cw - 8) / 2}" y="${r.value < 16 ? base - h - 6 : base - h + 15}" fill="${r.value < 16 ? '#E9ECF5' : '#0B0E1A'}" font-size="11" font-weight="600" font-family="Helvetica, Arial" text-anchor="middle">${Math.round(r.value)}</text>`;
    g += `<text transform="translate(${x + (cw - 8) / 2 + 4} ${base + 14}) rotate(-55)" fill="#E9ECF5" font-size="11" font-family="Helvetica, Arial" text-anchor="end">${esc(r.name)}</text>`;
  });
  g += `<text x="${W - 20}" y="${H - 16}" fill="#E8C66A" font-size="13" font-family="Helvetica, Arial" text-anchor="end">machinespirituality.org</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${g}</svg>`;
}
function liveSVG(d) {
  const s = d.svg.cloneNode(true), vb = s.getAttribute('viewBox').split(' ').map(Number), W = vb[2], H = vb[3] + 90;
  s.removeAttribute('width'); s.removeAttribute('height');
  const inner = new XMLSerializer().serializeToString(s).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#0B0E1A"/>` +
    `<text x="20" y="34" fill="#E9ECF5" font-size="22" font-family="Georgia, serif">${esc(d.title)}</text><text x="20" y="58" fill="#98A0BC" font-size="13" font-family="Helvetica, Arial">${esc(d.sub)}</text>` +
    `<g transform="translate(0 70)">${inner}</g><text x="${W - 16}" y="${H - 8}" fill="#E8C66A" font-size="12" font-family="Helvetica, Arial" text-anchor="end">machinespirituality.org</text></svg>`;
}
function save(href, name) { const a = document.createElement('a'); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function flash(btn, text) {
  let t = btn.parentElement.querySelector('.tools__msg');
  if (!t) { t = document.createElement('span'); t.className = 'tools__msg'; t.setAttribute('role', 'status'); btn.parentElement.prepend(t); }
  t.textContent = text; clearTimeout(t._t); t._t = setTimeout(() => { t.textContent = ''; }, 1800);
}
document.addEventListener('click', e => {
  const btn = e.target.closest('.tools [data-act]'); if (!btn) return;
  const which = btn.parentElement.dataset.chart, act = btn.dataset.act;
  if (act === 'link') {
    const sec = btn.closest('section'), url = location.origin + location.pathname + '#' + (sec ? sec.id : '');
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => flash(btn, 'Link copied'), () => flash(btn, url));
    return;
  }
  const d = chartData(which); if (!d) return;
  const name = 'msb-' + slug(d.title);
  if (act === 'csv') {
    const q = v => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
    const csv = [d.head].concat(d.rows).map(r => r.map(q).join(',')).join('\n') + '\n';
    save('data:text/csv;charset=utf-8,' + encodeURIComponent(csv), name + '.csv'); flash(btn, 'Data downloaded');
    return;
  }
  if (act === 'png') {
    const svg = d.bars ? barsSVG(d) : liveSVG(d);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.width * 2; c.height = img.height * 2;
      const x = c.getContext('2d'); x.scale(2, 2); x.drawImage(img, 0, 0);
      try { save(c.toDataURL('image/png'), name + '.png'); flash(btn, 'Image downloaded'); } catch (err) { save('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), name + '.svg'); }
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
});
})();
