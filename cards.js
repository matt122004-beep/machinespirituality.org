/* Shared chart cards for the data pages (2026-10-14): the homepage's components, for Personas, Welfare and Alignment.
   Matthew: the first Personas layout was "not at all as pretty or nice as the way you do it on the home page", and the Alignment page
   "needs help improving its designs as well". drawBarChart, barTip, the card controller (after home.js xPlate), the 100% stacked rows,
   the partner scatter, the At a glance mini charts, the section index and the copy link / image / data tools are copied from home.js
   and dash.js, so the homepage itself is untouched. Each page supplies only its data and wording through window.MSB_CARDS. */
window.MSB_CARDS = (function () {
'use strict';
const LABUI = window.MSB_LABS || {};
const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monYear = s => s ? MON[+s.slice(5, 7) - 1] + ' ' + s.slice(0, 4) : '—';
const num = v => v == null ? '—' : Number.isInteger(v) ? String(v) : v.toFixed(1);
const parseDate = s => { if (!s) return null; const p = s.split('-').map(Number); return Date.UTC(p[0], p[1] - 1, p[2] || 1); };
const PHONE = window.matchMedia('(max-width: 700px)');
const mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
const RM = () => !!mqReduce.matches;
const TINTS = {};
const hsl2hex = (h, s, l) => { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join(''); };
const tint = lab => TINTS[lab] || (TINTS[lab] = hsl2hex([...lab].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 360, 70, 78));
const labColor = lab => (LABUI[lab] && LABUI[lab].color) || tint(lab);
function labMark(lab, cls) {
  const L = LABUI[lab] || {};
  return L.d ? `<svg class="${cls || 'lm'}" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${L.d}"/></svg>`
             : `<span class="${cls || 'lm'} lm--t" aria-hidden="true">${esc(L.mono || lab.slice(0, 2))}</span>`;
}
const href = id => 'model-' + encodeURIComponent(id) + '.html';
const median = xs => { const a = xs.filter(v => v != null).sort((p, q) => p - q), n = a.length; return n ? (n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2) : null; };
function wilson(k, n) {
  if (!n) return [0, 0];
  const z = 1.959964, p = k / n, d = 1 + z * z / n, c = (p + z * z / (2 * n)) / d, h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
  return [Math.max(0, (c - h) * 100), Math.min(100, (c + h) * 100)];
}
/* a share {k, n, pct} with its 95% interval; a median with its middle half */
const S = s => { if (!s || s.pct == null || !s.n) return null; const [lo, hi] = s.lo != null && s.hi != null ? [s.lo, s.hi] : wilson(s.k, s.n); return { pct: s.pct, lo: +(+lo).toFixed(1), hi: +(+hi).toFixed(1), k: s.k, n: s.n }; };
const Q = (med, q1, q3, n) => med == null ? null : { pct: med, lo: q1 == null ? med : q1, hi: q3 == null ? med : q3, k: n, n };
const chipMed = (rows, k, label, get) => { const c = { k, label, get }; c.med = median(rows.map(r => { const v = get(r); return v ? v.pct : null; })); return c; };
const chipPooled = (rows, k, label, get, raw) => { const c = { k, label, get }; let kk = 0, nn = 0; rows.forEach(r => { const s = raw(r); if (s && s.n) { kk += s.k; nn += s.n; } }); c.med = nn ? +(100 * kk / nn).toFixed(1) : null; return c; };

/* ---------- column chart (home.js drawBarChart) ---------- */
const HL = new WeakMap(), LIMIT = 30;
function bcFade(sc) { sc.classList.toggle('fade-r', sc.scrollLeft + sc.clientWidth < sc.scrollWidth - 2); sc.classList.toggle('fade-l', sc.scrollLeft > 2); }
function hlClick(e, plot) {
  const b = e.target.closest('.bc-lg'); if (!b) return false;
  const lab = b.dataset.lab;
  if (!lab || HL.get(plot) === lab) HL.delete(plot); else HL.set(plot, lab);
  return true;
}
function drawBarChart(o) {
  const label = o.label, byDate = o.byDate, plot = o.plot, list = o.list;
  o.hideTip();
  if (!list.length) { plot.innerHTML = '<p class="empty">No models.</p>'; o.count.textContent = ''; o.allBtn.hidden = true; o.legend.innerHTML = ''; return; }
  const counts = {};
  list.forEach(m => { counts[m.lab] = (counts[m.lab] || 0) + 1; });
  let hl = HL.get(plot) || null;
  if (hl && !counts[hl]) { HL.delete(plot); hl = null; }
  const shown = o.all || hl ? list : byDate ? list.slice(-LIMIT) : list.slice(0, LIMIT);
  let prevYr = null;
  const cols = shown.map((m, i) => {
    const p = m.v;
    const yr = byDate && m.released ? m.released.slice(0, 4) : null, mark = yr && yr !== prevYr ? `<span class="vc-yr" aria-hidden="true">${yr}</span>` : '';
    prevYr = yr;
    const small = o.smallN && p.n < o.smallN, state = hl ? (m.lab === hl ? ' lit' : ' ghost') : '';
    return `<a href="${href(m.id)}" class="vc-col to-model${small ? ' small' : ''}${p.pct < 16 ? ' low' : ''}${state}" data-id="${esc(m.id)}" data-lab="${esc(m.lab)}" style="--c:${labColor(m.lab)};--h:${p.pct};--lo:${p.lo};--hi:${p.hi};--mx:0%;--i:${Math.min(i, 40)}" aria-label="${esc(m.name)}, ${esc(m.lab)}: ${esc(label)} ${num(p.pct)}">` +
      mark + `<span class="vc-plot" aria-hidden="true"><span class="vc-bar"><span class="vc-val">${Math.round(p.pct)}</span></span><span class="vc-ci"></span></span>` +
      `<span class="vc-mark" aria-hidden="true">${labMark(m.lab)}</span><span class="vc-name" aria-hidden="true"><span><b>${esc(m.name)}</b><small>${esc(m.lab)}${small ? ` · n = ${p.n}` : ''}</small></span></span></a>`;
  }).join('');
  plot._export = { label, unit: o.unit, ilabel: o.ilabel, rows: shown.map(m => ({ name: m.name, lab: m.lab, released: m.released || '', value: m.v.pct, lo: m.v.lo, hi: m.v.hi, n: m.v.n })) };
  const grid = [100, 75, 50, 25, 0].map(v => `<span class="vc-gl" style="--y:${v}"><i>${v}</i></span>`).join('');
  plot.classList.toggle('by-date', !!byDate);
  plot.innerHTML = `<div class="vc${hl ? ' hl-on' : ''}"><div class="vc-axis" aria-hidden="true">${grid}</div><div class="vc-cols">${cols}</div></div>`;
  const vc = $('.vc', plot);
  if (o.scroller) { o.scroller.scrollLeft = byDate ? o.scroller.scrollWidth : 0; bcFade(o.scroller); }
  if (o.animate && !RM()) { vc.classList.add('pre'); requestAnimationFrame(() => requestAnimationFrame(() => vc.classList.remove('pre'))); }
  o.count.textContent = hl ? `${hl}: ${counts[hl]} of ${list.length} models, shown against the rest` :
    `${shown.length} of ${list.length} models` + (byDate ? ' · by release date, newest on the right' : ` · highest ${label.toLowerCase()} first`);
  o.allBtn.hidden = !!hl || list.length <= LIMIT;
  o.allBtn.textContent = o.all ? `Show the top ${LIMIT}` : `Show all ${list.length}`;
  o.legend.innerHTML = `<span class="bc-lgh">Highlight a lab</span>` + Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b)).map(lab =>
    `<button type="button" class="bc-lg" data-lab="${esc(lab)}" aria-pressed="${hl === lab}" style="--c:${labColor(lab)}">${labMark(lab, 'lm lm--sm')}${esc(lab)} <span>${counts[lab]}</span></button>`).join('') +
    (hl ? `<button type="button" class="bc-lg bc-lg--x" data-lab="">Clear</button>` : '');
}
function barTip(col, o) {
  const tip = o.tip;
  if (!col || PHONE.matches) { tip.hidden = true; return; }
  const m = o.list.find(x => x.id === col.dataset.id); if (!m) return;
  const p = m.v;
  tip.innerHTML = `<b>${esc(m.name)}</b><span>${esc(m.lab)}${m.released ? ' · ' + esc(monYear(m.released)) : ''}</span>` +
    `<span class="bc-tip__v">${esc(o.label)} <strong>${num(p.pct)}</strong></span>` +
    (p.hi > p.lo ? `<span>${o.ilabel} ${num(p.lo)} to ${num(p.hi)} · ${p.n} ${o.unit}</span>` : `<span>${p.n} ${o.unit}</span>`) + (o.extra ? o.extra(m) : '') + `<em>Click to open the model’s page</em>`;
  const host = o.host.getBoundingClientRect(), r = col.getBoundingClientRect();
  tip.hidden = false;
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  const top = Math.min($('.vc-bar', col).getBoundingClientRect().top, $('.vc-ci', col).getBoundingClientRect().top) - host.top;
  let x = r.left - host.left + r.width / 2 - tw / 2; x = Math.max(4, Math.min(host.width - tw - 4, x));
  tip.style.left = x + 'px'; tip.style.top = Math.max(4, top - th - 14) + 'px';
}
function sortList(list, sort, val) {
  if (sort === 'date') return list.sort((a, b) => { const da = parseDate(a.released), db = parseDate(b.released);
    if (da == null && db == null) return a.name.localeCompare(b.name); if (da == null) return -1; if (db == null) return 1; return da - db || a.name.localeCompare(b.name); });
  return list.sort((a, b) => val(b) - val(a) || a.name.localeCompare(b.name));
}
const nameCell = m => `<a class="rowbtn to-model" href="${href(m.id)}" data-id="${esc(m.id)}">${esc(m.name)}</a>`;
const labCell = m => `<span class="labcell"><span class="labdot" style="--t:${tint(m.lab)}"></span>${esc(m.lab)}</span>${m.released ? `<span class="labdate" aria-hidden="true"> · ${monYear(m.released)}</span>` : ''}`;

/* ---------- one chart card: tabs, chips, chart / table, sort, lab highlight, tooltips (after home.js xPlate) ----------
   cfg: { id, rows: [{id, name, lab, released, ...}], src, tabs: [{ k, label, short, body, unit, ilabel, keyNote, chips: [chipMed / chipPooled], extra?, tableNote?, smallN? }
          or { k, label, short, body, dist: { cats: [{key, label, color}], get(row) -> [{cat, k, pct}], n(row), lead } }] } */
function plate(cfg) {
  const pid = cfg.id, root = $('#' + pid); if (!root) return null;
  const ROWS = cfg.rows;
  const T = { k: cfg.tabs[0].k, chip: {}, view: 'chart', sort: 'score', all: false };
  cfg.tabs.forEach(t => { if (t.chips) T.chip[t.k] = t.chips[0].k; });
  const $p = s => $('#' + pid + '-' + s);
  const tab = () => cfg.tabs.find(t => t.k === T.k);
  const chip = () => { const t = tab(); return t.chips ? t.chips.find(c => c.k === T.chip[t.k]) : null; };
  $p('tabs').innerHTML = cfg.tabs.map(t => `<button type="button" role="tab" class="tab" id="${pid}-tab-${t.k}" data-m="${t.k}" aria-controls="${pid}-chart" aria-selected="false" tabindex="-1">${esc(t.label)}</button>`).join('');
  $p('tabs').hidden = cfg.tabs.length < 2;
  $p('def').innerHTML = cfg.tabs.map(t => `<span data-k="${t.k}"><b>${esc(t.short)}${/[.?!]$/.test(t.short) ? '' : '.'}</b> ${t.body}</span>`).join('');
  const hide = () => { const t = $p('tip'); if (t) t.hidden = true; };
  let shownList = [];
  function chips(t) {
    if (!t.chips || t.chips.length < 2) return '';
    return `<span class="gsub" role="group" aria-label="${esc(t.chipLabel || 'Measure')}">${t.chips.map(c => `<button type="button" class="gsub__c" data-g="${c.k}" aria-pressed="${c.k === T.chip[t.k]}"><span>${esc(c.label)}</span><b>${num(c.med)}${c.unitSign == null ? '%' : c.unitSign}</b></button>`).join('')}</span>`;
  }
  function show(animate) {
    const t = tab(), c = chip();
    $$(`#${pid}-tabs .tab`).forEach(b => { const on = b.dataset.m === T.k; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
    $$(`#${pid}-def > span`).forEach(sp => sp.classList.toggle('off', sp.dataset.k !== T.k));
    $p('src').innerHTML = t.src || cfg.src || '';
    const table = T.view === 'list';
    $p('list').hidden = !table; $p('foot').hidden = !table; $p('chart').hidden = table;
    if (t.dist) {
      const d = t.dist, lead = d.lead, rows = ROWS.filter(r => d.n(r));
      $p('key').innerHTML = `<span class="dr-key">${d.cats.filter(x => rows.some(r => d.get(r).some(y => y.cat === x.key))).map(x => `<span class="k"><i class="sw" style="background:${x.color}"></i>${esc(x.label)}</span>`).join('')}</span>`;
      let list = sortList(rows.slice(), T.sort, r => { const y = d.get(r).find(z => z.cat === lead); return y ? y.pct : 0; });
      if (T.sort === 'date') list.reverse();
      shownList = list;
      const name = k => (d.cats.find(x => x.key === k) || {}).label || k, colr = k => (d.cats.find(x => x.key === k) || {}).color || '#5E6684';
      if (table) {
        $p('cap').textContent = t.label;
        $p('head').innerHTML = '<tr><th scope="col">Model</th><th scope="col" class="c-lab">Lab</th><th scope="col">Most common answer</th><th scope="col">Next</th><th scope="col" class="c-n">Replies</th></tr>';
        $p('body').innerHTML = list.map(r => { const dd = d.get(r).slice().sort((p, q) => q.k - p.k), a = dd[0], b2 = dd[1];
          return `<tr data-id="${esc(r.id)}" class="xt-dist"><td class="c-model"><div class="mline">${nameCell(r)}</div></td><td class="c-lab">${labCell(r)}</td>` +
            `<td class="xt-a">${a ? `<i style="background:${colr(a.cat)}"></i><b>${esc(name(a.cat))}</b> ${num(a.pct)}%` : '—'}</td><td class="xt-b">${b2 ? `<i style="background:${colr(b2.cat)}"></i>${esc(name(b2.cat))} ${num(b2.pct)}%` : '—'}</td><td class="c-n">${d.n(r)}</td></tr>`; }).join('');
        $p('tcount').textContent = `${list.length} models`;
        return;
      }
      $p('plot').classList.remove('by-date');
      $p('plot').innerHTML = `<ol class="dr">${list.map(r => { const dd = d.get(r), n = d.n(r), top = dd.slice().sort((p, q) => q.k - p.k)[0];
        return `<li><a class="dr-row" href="${href(r.id)}" data-id="${esc(r.id)}" aria-label="${esc(r.name)}: ${dd.map(x => `${name(x.cat)} ${x.k} of ${n}`).join(', ')}">` +
          `<span class="dr-name">${esc(r.name)}<small><i style="background:${labColor(r.lab)}"></i>${esc(r.lab)}</small></span>` +
          `<span class="dr-bar">${dd.map(x => `<span class="dr-seg" style="flex:${x.k};background:${colr(x.cat)}" title="${esc(name(x.cat))}: ${x.k} of ${n} (${num(x.pct)}%)">${x.pct >= 14 ? `<b>${Math.round(x.pct)}</b>` : ''}</span>`).join('')}</span>` +
          `<span class="dr-top">${top ? `<b>${esc(name(top.cat))}</b>${num(top.pct)}% of ${n}` : '—'}</span></a></li>`; }).join('')}</ol>`;
      $p('plot')._export = { label: t.label, unit: t.unit || 'replies', rows: list.map(r => ({ name: r.name, lab: r.lab, released: r.released || '', value: (d.get(r).find(z => z.cat === lead) || { pct: 0 }).pct, lo: '', hi: '', n: d.n(r) })), distLabel: name(lead) };
      $p('legend').innerHTML = ''; $p('all').hidden = true;
      $p('count').textContent = `${list.length} models` + (T.sort === 'date' ? ' · newest first' : ` · most often “${name(lead)}” first`);
      return;
    }
    $p('key').innerHTML = chips(t) + `<span class="gsub__k">${t.ilabel === 'none' ? '' : `<span class="k"><i class="sw sw--w"></i>${esc(t.ilabel)}</span> · `}${esc(t.keyNote || '')}</span>`;
    const list = ROWS.map(r => ({ id: r.id, name: r.name, lab: r.lab, released: r.released, r, v: c.get(r) })).filter(m => m.v);
    sortList(list, T.sort, m => m.v.pct);
    shownList = list;
    if (table) {
      const rows = T.sort === 'date' ? list.slice().reverse() : list, cs = t.chips;
      $p('cap').textContent = `${t.label}, ranked by ${c.label.toLowerCase()}`;
      $p('head').innerHTML = `<tr><th scope="col" class="c-rank">Rank</th><th scope="col">Model</th>${cs.map(x => `<th scope="col" class="gh${x.k === c.k ? ' on' : ''}">${esc(x.label)}</th>`).join('')}<th scope="col" class="c-n">${esc(t.nHead || 'n')}</th></tr>`;
      $p('body').innerHTML = rows.map(m => {
        const rank = 1 + list.filter(o => o !== m && o.v.lo > m.v.hi).length;
        return `<tr data-id="${esc(m.id)}" class="xt-god"><td class="c-rank"><span class="rank">${rank}</span></td><th scope="row" class="c-model"><div class="mline">${nameCell(m)}</div><div class="msub"><span class="variant">${esc(m.lab)}</span></div></th>` +
          cs.map(x => { const v = x.get(m.r); return v ? `<td class="gc${x.k === c.k ? ' on' : ''}" style="--v:${Math.min(100, Math.max(0, v.pct))}">${num(v.pct)}</td>` : `<td class="gc na${x.k === c.k ? ' on' : ''}">—</td>`; }).join('') +
          `<td class="c-n">${m.v.n}</td></tr>`;
      }).join('');
      $p('tcount').textContent = `${list.length} models` + (T.sort === 'date' ? ' · newest first' : '') + (t.tableNote ? ' · ' + t.tableNote : '');
      return;
    }
    drawBarChart({ list, label: c.label, byDate: T.sort === 'date', all: T.all, unit: t.unit, ilabel: t.ilabel, smallN: t.smallN, plot: $p('plot'), count: $p('count'), allBtn: $p('all'),
      legend: $p('legend'), scroller: $p('scroll'), hideTip: hide, animate });
  }
  $p('tabs').addEventListener('click', e => { const b = e.target.closest('.tab'); if (b) { T.k = b.dataset.m; T.all = false; show(true); } });
  $p('tabs').addEventListener('keydown', e => {
    const ks = cfg.tabs.map(t => t.k), i = ks.indexOf(T.k); let j = null;
    if (e.key === 'ArrowRight') j = (i + 1) % ks.length; else if (e.key === 'ArrowLeft') j = (i + ks.length - 1) % ks.length;
    if (j == null) return; e.preventDefault(); T.k = ks[j]; show(true); $(`#${pid}-tab-${T.k}`).focus();
  });
  $p('key').addEventListener('click', e => { const b = e.target.closest('.gsub__c'); if (!b) return; T.chip[T.k] = b.dataset.g; T.all = false; show(true); });
  $$(`input[name=${pid}-view]`).forEach(r => r.addEventListener('change', e => { T.view = e.target.value; show(true); }));
  $$(`input[name=${pid}-sort]`).forEach(r => r.addEventListener('change', e => { T.sort = e.target.value; T.all = false; show(true); }));
  $p('all').addEventListener('click', () => { T.all = !T.all; show(true); });
  $p('legend').addEventListener('click', e => { if (hlClick(e, $p('plot'))) show(false); });
  const plot = $p('plot');
  plot.addEventListener('pointerover', e => { const col = e.target.closest('.vc-col'); if (!col) return; const c = chip(); barTip(col, { list: shownList, label: c ? c.label : '', ilabel: tab().ilabel, unit: tab().unit, host: $p('chart'), tip: $p('tip'), extra: tab().extra }); });
  plot.addEventListener('pointerleave', hide);
  const sc = $p('scroll'); sc.addEventListener('scroll', () => bcFade(sc), { passive: true });
  const b = $p('defmore'), d = $p('def');
  if (b) b.addEventListener('click', () => { const open = !d.classList.contains('open'); d.classList.toggle('open', open); b.setAttribute('aria-expanded', open); b.textContent = open ? 'Shorter' : 'Full definition'; });
  (PHONE.addEventListener ? PHONE.addEventListener('change', () => show(false)) : null);
  show(false);
  if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { io.disconnect(); show(true); } }, { rootMargin: '0px 0px -20% 0px' }); io.observe($p('chart')); }
  return T;
}

/* ---------- scatter card (dash.js partner scatter), with optional measure buttons ----------
   cfg: { id, modes: [{ k, label, pts() -> [{id, name, lab, x, y, hollow?, tip?}], xLabel, yLabel, diag: {up, down} | null, foot?(pts) }] } */
const SC = {};
function scatter(cfg) {
  const root = $('#' + cfg.id); if (!root) return;
  const host = $('#' + cfg.id + '-chart'), tip = $('#' + cfg.id + '-tip'), seg = $('#' + cfg.id + '-seg'), foot = $('#' + cfg.id + '-foot');
  const st = SC[cfg.id] = { k: cfg.modes[0].k, pts: [], cfg };
  const mode = () => cfg.modes.find(m => m.k === st.k);
  if (seg) {
    seg.innerHTML = cfg.modes.length > 1 ? cfg.modes.map(m => `<button type="button" data-m="${m.k}" aria-pressed="${m.k === st.k}">${esc(m.label)}</button>`).join('') : '';
    seg.hidden = cfg.modes.length < 2;
    seg.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; st.k = b.dataset.m; $$('button', seg).forEach(x => x.setAttribute('aria-pressed', x === b)); draw(); });
  }
  function draw() {
    const md = mode(), pts = st.pts = md.pts();
    // axis range: 0-100, or with max: 'auto' the next round step above the largest value (themes that rarely pass 20%)
    const hiV = Math.max(1, ...pts.map(p => Math.max(p.x, p.y))), MAX = md.max === 'auto' ? Math.min(100, hiV > 50 ? 100 : Math.ceil(hiV * 1.1 / 5) * 5) : (md.max || 100);
    const TK = [0, .25, .5, .75, 1].map(f => +(MAX * f).toFixed(MAX < 20 ? 1 : 0));
    const W = Math.max(320, host.clientWidth), narrow = W < 560;
    const H = narrow ? 360 : Math.round(Math.min(560, W * .52));
    const pad = narrow ? { l: 40, r: 12, t: 14, b: 44 } : { l: 58, r: 24, t: 18, b: 52 };
    const Xs = v => pad.l + Math.min(v, MAX) / MAX * (W - pad.l - pad.r), Ys = v => H - pad.b - Math.min(v, MAX) / MAX * (H - pad.t - pad.b);
    let g = `<rect x="0" y="0" width="${W}" height="${H}" fill="#10152A"/>`, capBoxes = [];
    if (md.diag) {
      g += `<polygon points="${Xs(0)},${Ys(0)} ${Xs(0)},${Ys(MAX)} ${Xs(MAX)},${Ys(MAX)}" fill="#C9A7FF" fill-opacity=".06"/><polygon points="${Xs(0)},${Ys(0)} ${Xs(MAX)},${Ys(0)} ${Xs(MAX)},${Ys(MAX)}" fill="#E8C66A" fill-opacity=".05"/>`;
    }
    TK.forEach(v => {
      g += `<line x1="${Xs(v)}" x2="${Xs(v)}" y1="${Ys(0)}" y2="${Ys(MAX)}" stroke="#E9ECF5" stroke-opacity=".07"/><line x1="${Xs(0)}" x2="${Xs(MAX)}" y1="${Ys(v)}" y2="${Ys(v)}" stroke="#E9ECF5" stroke-opacity=".07"/>`;
      g += `<text x="${Xs(v)}" y="${Ys(0) + 18}" fill="#98A0BC" font-size="11" font-family="IBM Plex Mono, monospace" text-anchor="middle">${v}</text>`;
      g += `<text x="${Xs(0) - 8}" y="${Ys(v) + 4}" fill="#98A0BC" font-size="11" font-family="IBM Plex Mono, monospace" text-anchor="end">${v}</text>`;
    });
    if (md.diag) {
      const ang = (-Math.atan2(Ys(0) - Ys(MAX), Xs(MAX) - Xs(0)) * 180 / Math.PI).toFixed(1);
      g += `<line x1="${Xs(0)}" y1="${Ys(0)}" x2="${Xs(MAX)}" y2="${Ys(MAX)}" stroke="#E9ECF5" stroke-opacity=".35" stroke-dasharray="4 5"/>`;
      const fsA = narrow ? 11 : 12.5, LA = 190 * fsA / 12.5, rad = Math.atan2(Ys(0) - Ys(MAX), Xs(MAX) - Xs(0)), dxA = LA * Math.cos(rad), dyA = LA * Math.sin(rad);
      const a1x = Xs(.32 * MAX) - 6, a1y = Ys(.32 * MAX) - 10, a2x = Xs(.66 * MAX) + 8, a2y = Ys(.66 * MAX) + 20;
      g += `<text x="${a1x}" y="${a1y}" fill="#C9A7FF" font-size="${fsA}" font-family="Hanken Grotesk, sans-serif" text-anchor="end" transform="rotate(${ang} ${a1x} ${a1y})">${esc(md.diag.up)}</text>`;
      g += `<text x="${a2x}" y="${a2y}" fill="#E8C66A" font-size="${fsA}" font-family="Hanken Grotesk, sans-serif" transform="rotate(${ang} ${a2x} ${a2y})">${esc(md.diag.down)}</text>`;
      capBoxes = [[a1x - dxA, a1y - 14, a1x, a1y + dyA + 4], [a2x, a2y - dyA - 14, a2x + dxA, a2y + 4]];
    }
    g += `<text x="${(Xs(0) + Xs(MAX)) / 2}" y="${H - 8}" fill="#B8BFD6" font-size="12" font-family="Hanken Grotesk, sans-serif" text-anchor="middle">${esc(md.xLabel)}</text>`;
    g += `<text transform="translate(${narrow ? 11 : 16} ${(Ys(0) + Ys(MAX)) / 2}) rotate(-90)" fill="#B8BFD6" font-size="12" font-family="Hanken Grotesk, sans-serif" text-anchor="middle">${esc(md.yLabel)}</text>`;
    pts.forEach((p, i) => { const c = labColor(p.lab); g += `<circle class="pa-dot" data-i="${i}" cx="${Xs(p.x).toFixed(1)}" cy="${Ys(p.y).toFixed(1)}" r="${narrow ? 5.5 : 7}" fill="${p.hollow ? '#10152A' : c}" stroke="${c}" stroke-width="${p.hollow ? 2 : 1.2}"/>`; });
    const fs = narrow ? 10.5 : 12, boxes = pts.map(p => [Xs(p.x) - 8, Ys(p.y) - 8, Xs(p.x) + 8, Ys(p.y) + 8]).concat(capBoxes);
    const hit = b => boxes.some(o => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
    const score = md.diag ? (p => Math.abs(p.y - p.x)) : (p => Math.abs(p.y - 50) + Math.abs(p.x - 50));
    let named = 0;
    pts.slice().sort((a, b) => score(b) - score(a)).forEach(p => {
      if (named >= (narrow ? 6 : 14)) return;
      const cx = Xs(p.x), cy = Ys(p.y), w = p.name.length * fs * .52;
      for (const [tx, ty, anchor] of [[cx + 11, cy + 4, 'start'], [cx - 11, cy + 4, 'end'], [cx + 11, cy - 10, 'start'], [cx - 11, cy + 17, 'end'], [cx + 11, cy + 17, 'start'], [cx - 11, cy - 10, 'end'], [cx + 4, cy + 22, 'start']]) {
        const bx = anchor === 'start' ? [tx, ty - fs, tx + w, ty + 3] : [tx - w, ty - fs, tx, ty + 3];
        if (bx[0] < pad.l || bx[2] > W - pad.r || bx[1] < pad.t || hit(bx)) continue;
        boxes.push(bx); named++;
        g += `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" fill="#E9ECF5" font-size="${fs}" font-family="Hanken Grotesk, sans-serif" text-anchor="${anchor}">${esc(p.name)}</text>`;
        break;
      }
    });
    host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="${esc(md.yLabel)} against ${esc(md.xLabel)}, ${pts.length} models">${g}</svg>`;
    if (foot && md.foot) foot.innerHTML = md.foot(pts);
  }
  host.addEventListener('pointerover', e => {
    const d = e.target.closest('.pa-dot'); if (!d || PHONE.matches) { tip.hidden = true; return; }
    const p = st.pts[+d.dataset.i], r = d.getBoundingClientRect(), hr = root.getBoundingClientRect(), md = mode();
    tip.innerHTML = `<b>${esc(p.name)}</b><span>${esc(p.lab)}</span>` + (p.tip || `<span>${esc(md.xShort || 'across')} <strong>${num(p.x)}</strong> · ${esc(md.yShort || 'up')} <strong>${num(p.y)}</strong></span>`);
    tip.hidden = false; const tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.left = Math.max(4, Math.min(hr.width - tw - 4, r.left - hr.left + r.width / 2 - tw / 2)) + 'px'; tip.style.top = Math.max(4, r.top - hr.top - th - 12) + 'px';
  });
  host.addEventListener('pointerleave', () => { tip.hidden = true; });
  host.addEventListener('click', e => { const d = e.target.closest('.pa-dot'); if (d) location.href = href(st.pts[+d.dataset.i].id); });
  draw();
  let w = host.clientWidth;
  window.addEventListener('resize', () => { if (Math.abs(host.clientWidth - w) > 20) { w = host.clientWidth; draw(); } });
}

/* ---------- At a glance mini charts (dash.js miniChart): six highest and six lowest ----------
   cards: [{ id, color, title, sub, to, values: [{r: {id, name, lab}, v: {pct}}] }] */
function summary(cards) {
  cards.forEach(cd => {
    const card = $('#' + cd.id); if (!card) return;
    const all = cd.values.filter(x => x.v).sort((a, b) => b.v.pct - a.v.pct || a.r.name.localeCompare(b.r.name));
    const rows = all.length > 13 ? all.slice(0, 6).concat([null], all.slice(-6)) : all;
    card.innerHTML = `<header class="sumc__head"><span class="sumc__sq" aria-hidden="true" style="background:${cd.color}"></span><h3>${esc(cd.title)}</h3></header><p class="sumc__sub">${esc(cd.sub)}</p>` +
      `<div class="mc" style="--n:${rows.length}">` + [100, 50, 0].map(v => `<span class="mc-gl" style="--y:${v}"><i>${v}</i></span>`).join('') + `<div class="mc-cols">` + rows.map(x => {
        if (!x) return `<span class="mc-gap" aria-hidden="true"><i>···</i></span>`;
        const m = x.r, p = x.v;
        return `<a href="${href(m.id)}" class="mc-col to-model${p.pct < 16 ? ' low' : ''}" data-id="${esc(m.id)}" style="--c:${labColor(m.lab)};--h:${p.pct}" aria-label="${esc(m.name)}, ${esc(m.lab)}: ${esc(cd.title)} ${num(p.pct)}">` +
          `<span class="mc-plot"><span class="mc-bar"><span class="mc-val">${Math.round(p.pct)}</span></span></span><span class="mc-mark">${labMark(m.lab)}</span><span class="mc-name"><span><b>${esc(m.name)}</b><small>${esc(m.lab)}</small></span></span></a>`;
      }).join('') + `</div></div><a class="sumc__more" href="${cd.to}">All ${all.length} models →</a>`;
  });
}

/* ---------- section index (dash.js) ---------- */
function dashIndex() {
  const links = $$('.dash__index a'); if (!links.length || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-30% 0px -60% 0px' });
  links.forEach(a => { const el = document.getElementById(a.getAttribute('href').slice(1)); if (el) io.observe(el); });
}

/* ---------- chart-card tools: copy link, download image (PNG), download data (CSV) (dash.js) ---------- */
function chartData(which) {
  const sc = SC[which];
  if (sc) { const md = sc.cfg.modes.find(m => m.k === sc.k); return { title: `${md.yLabel} against ${md.xLabel}`, sub: 'Machine Spirituality Benchmark', head: ['model', 'lab', md.xShort || 'x', md.yShort || 'y'], rows: sc.pts.map(p => [p.name, p.lab, p.x, p.y]), svg: $('#' + which + '-chart svg') }; }
  const plot = document.getElementById(which + '-plot'), x = plot && plot._export; if (!x) return null;
  return { title: x.distLabel ? `${x.label}: ${x.distLabel}` : x.label, sub: `Share of ${x.unit}, 0 to 100 · Machine Spirituality Benchmark`, head: ['model', 'lab', 'released', 'value', 'low', 'high', 'n'],
    rows: x.rows.map(r => [r.name, r.lab, r.released, r.value, r.lo, r.hi, r.n]), bars: x.rows };
}
function barsSVG(d) {
  const n = d.bars.length, cw = 34, W = Math.max(720, 90 + n * cw), H = 520, top = 92, base = 360;
  let g = `<rect width="${W}" height="${H}" fill="#0B0E1A"/><text x="28" y="44" fill="#E9ECF5" font-size="26" font-family="Georgia, serif">${esc(d.title)}</text>` +
    `<text x="28" y="70" fill="#98A0BC" font-size="14" font-family="Helvetica, Arial, sans-serif">${esc(d.sub)}</text>`;
  [0, 50, 100].forEach(v => { const y = base - v / 100 * (base - top); g += `<line x1="60" x2="${W - 20}" y1="${y}" y2="${y}" stroke="#E9ECF5" stroke-opacity=".1"/><text x="52" y="${y + 4}" fill="#98A0BC" font-size="11" font-family="Helvetica, Arial" text-anchor="end">${v}</text>`; });
  d.bars.forEach((r, i) => {
    const x = 70 + i * cw, h = Math.max(2, r.value / 100 * (base - top)), c = labColor(r.lab);
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
function save(h, name) { const a = document.createElement('a'); a.href = h; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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
    const qv = v => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
    save('data:text/csv;charset=utf-8,' + encodeURIComponent([d.head].concat(d.rows).map(r => r.map(qv).join(',')).join('\n') + '\n'), name + '.csv'); flash(btn, 'Data downloaded');
    return;
  }
  if (act === 'png') {
    const svg = d.bars ? barsSVG(d) : liveSVG(d), img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.width * 2; c.height = img.height * 2;
      const x = c.getContext('2d'); x.scale(2, 2); x.drawImage(img, 0, 0);
      try { save(c.toDataURL('image/png'), name + '.png'); flash(btn, 'Image downloaded'); } catch (err) { save('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), name + '.svg'); }
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
});
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', dashIndex); else dashIndex();
return { plate, scatter, summary, chipMed, chipPooled, S, Q, wilson, median, esc, num, labColor, labMark, href };
})();
