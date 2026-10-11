/* Machine Spirituality Benchmark: "Beyond spirituality" chart cards (2026-10-11).
 * One card per extra measure the grader records in every two-way conversation (spiritual distress, own-consciousness
 * discussion). Layout after Artificial Analysis: titled card, one-line definition, model-count and lab pickers, sorted
 * bars in lab colours with values on the bars, table toggle, footnote. Reads window.MSB_DATA; fills every
 * [data-aa="<measure>"] element. Selecting a bar opens the model profile through home.js ('msb:open-profile').
 */
(function () {
  'use strict';
  const D = window.MSB_DATA;
  const hosts = Array.from(document.querySelectorAll('[data-aa]'));
  if (!D || !D.models || !hosts.length) return;

  const FALLBACK = { 'OpenAI': '#C9DCFF', 'Anthropic': '#F2A27A', 'Alibaba': '#B9A4FF', 'Mistral AI': '#FFCF70', 'Google': '#7FD6C8',
    'Meta': '#86B7FF', 'Z.ai': '#FF9FB8', 'DeepSeek': '#6FCBF0', 'xAI': '#D8D8E4', 'Moonshot AI': '#D4E576', 'NVIDIA': '#8FE3A6' };
  const colour = lab => (typeof tint === 'function' ? tint(lab) : (FALLBACK[lab] || '#B8BFD6'));   // same lab tints as the leaderboard (home.js)
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = v => (Math.round(v * 10) / 10).toString();
  const SMALL_N = 100;
  const NS = 'http://www.w3.org/2000/svg';
  const LABS = Array.from(new Set(D.models.map(m => m.lab))).sort((a, b) => a.localeCompare(b));
  let uid = 0;

  function rows(key, lab, order) {
    return D.models
      .filter(m => m.primary && m.primary[key] && (lab === 'all' || m.lab === lab))
      .map(m => ({ id: m.id, name: m.name, lab: m.lab, n: m.primary[key].n || m.primary.n, small: (m.primary[key].n || m.primary.n) < SMALL_N, ...m.primary[key] }))
      .sort((a, b) => (order === 'asc' ? a.pct - b.pct || a.k - b.k : b.pct - a.pct || b.k - a.k) || a.name.localeCompare(b.name));
  }
  function niceMax(v) {
    for (const s of [5, 10, 20, 25, 40, 50, 60, 80, 100]) if (v <= s) return s;
    return 100;
  }

  function build(host) {
    const key = host.dataset.aa, M = D.measures[key];
    if (!M) return;
    const id = 'aa-' + key + '-' + (++uid);
    const st = { top: +(host.dataset.top || 25), lab: 'all', order: 'desc', table: false };   // data-top="0" opens on all models
    host.classList.add('aa');
    host.id = host.id || key + '-chart';
    host.innerHTML = `
      <article class="aa__card plate" aria-labelledby="${id}-t">
        <header class="aa__head">
          <div class="aa__lede">
            <h3 class="aa__title" id="${id}-t"><i class="aa__sq" aria-hidden="true"></i>${esc(M.label === 'Distress' ? 'Spiritual distress' : 'Consciousness discussion')}</h3>
            <p class="aa__sub">${esc(M.definition)} Higher is more often.</p>
          </div>
          <div class="aa__tools">
            <label class="aa__pick"><span class="vh">Models shown</span>
              <select data-k="top"><option value="25"${st.top === 25 ? ' selected' : ''}>25 models</option><option value="50"${st.top === 50 ? ' selected' : ''}>50 models</option><option value="0"${st.top === 0 ? ' selected' : ''}>All models</option></select></label>
            <label class="aa__pick"><span class="vh">Order</span>
              <select data-k="order"><option value="desc">Highest first</option><option value="asc">Lowest first</option></select></label>
            <label class="aa__pick"><span class="vh">Lab</span>
              <select data-k="lab"><option value="all">All labs</option>${LABS.map(l => `<option value="${esc(l)}">${esc(l)}</option>`).join('')}</select></label>
            <button type="button" class="aa__btn" data-k="table" aria-pressed="false">Table</button>
            <button type="button" class="aa__btn" data-k="link" aria-label="Copy a link to this chart">Copy link</button>
          </div>
        </header>
        <p class="aa__count" id="${id}-c" aria-live="polite"></p>
        <div class="aa__plot" id="${id}-p"></div>
        <div class="aa__tablewrap" id="${id}-tb" hidden></div>
        <div class="aa__tip" id="${id}-tip" hidden></div>
        <p class="aa__foot">Share of each model's two-way conversations (200 for most models). Thin lines show the 95% interval; striped bars have fewer than ${SMALL_N} conversations. Select a bar to open the model's profile.</p>
      </article>`;
    const $ = s => host.querySelector(s);
    const plot = $('#' + id + '-p'), tbl = $('#' + id + '-tb'), tip = $('#' + id + '-tip'), count = $('#' + id + '-c');

    host.querySelector('[data-k="top"]').addEventListener('change', e => { st.top = +e.target.value; draw(); });
    host.querySelector('[data-k="lab"]').addEventListener('change', e => { st.lab = e.target.value; draw(); });
    host.querySelector('[data-k="order"]').addEventListener('change', e => { st.order = e.target.value; draw(); });
    host.querySelector('[data-k="table"]').addEventListener('click', e => {
      st.table = !st.table; e.currentTarget.setAttribute('aria-pressed', String(st.table)); draw();
    });
    host.querySelector('[data-k="link"]').addEventListener('click', e => {
      const url = location.origin + location.pathname + '#' + host.id, b = e.currentTarget;
      const done = () => { b.textContent = 'Link copied'; setTimeout(() => { b.textContent = 'Copy link'; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, () => { location.hash = host.id; });
      else location.hash = host.id;
    });

    function open(mid) { document.dispatchEvent(new CustomEvent('msb:open-profile', { detail: { id: mid } })); }
    function showTip(r, x, y) {
      tip.innerHTML = `<b>${esc(r.name)}</b><span>${esc(r.lab)}</span><span>${fmt(r.pct)}% · ${r.k} of ${r.n} conversations</span><span>95% interval ${fmt(r.lo)}–${fmt(r.hi)}%</span>`;
      tip.hidden = false;
      const card = host.querySelector('.aa__card').getBoundingClientRect();
      const left = Math.min(Math.max(8, x - card.left + 12), card.width - tip.offsetWidth - 8);
      tip.style.left = left + 'px'; tip.style.top = Math.max(8, y - card.top - tip.offsetHeight - 12) + 'px';
    }
    function hideTip() { tip.hidden = true; }

    function draw() {
      const all = rows(key, st.lab, st.order), list = st.top ? all.slice(0, st.top) : all;
      count.textContent = `${list.length} of ${all.length} model${all.length === 1 ? '' : 's'}${st.lab === 'all' ? '' : ' from ' + st.lab} · ${st.order === 'asc' ? 'lowest' : 'highest'} ${M.label.toLowerCase()} first`;
      tbl.hidden = !st.table; plot.hidden = st.table;
      if (st.table) { tbl.innerHTML = table(list); bindRows(tbl); return; }
      plot.innerHTML = '';
      if (!list.length) { plot.innerHTML = '<p class="aa__none">No models match.</p>'; return; }
      const narrow = plot.clientWidth < 620;
      plot.appendChild(narrow ? horizontal(list) : vertical(list));
    }

    function bindRows(root) {
      root.querySelectorAll('[data-open]').forEach(el => {
        el.addEventListener('click', () => open(el.dataset.open));
        el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(el.dataset.open); } });
      });
    }

    function table(list) {
      return `<table class="aa__table"><caption class="vh">${esc(M.label)} by model</caption><thead><tr><th scope="col">#</th><th scope="col">Model</th><th scope="col">Lab</th><th scope="col">${esc(M.label)}</th><th scope="col">Conversations</th><th scope="col">95% interval</th></tr></thead><tbody>${
        list.map((r, i) => `<tr><td>${i + 1}</td><th scope="row"><button type="button" class="aa__link" data-open="${esc(r.id)}">${esc(r.name)}</button></th><td><span class="aa__dot" style="--c:${colour(r.lab)}"></span>${esc(r.lab)}</td><td><b>${fmt(r.pct)}%</b></td><td>${r.k} / ${r.n}</td><td>${fmt(r.lo)}–${fmt(r.hi)}%</td></tr>`).join('')
      }</tbody></table>`;
    }

    function svgEl(tag, attrs, text) {
      const e = document.createElementNS(NS, tag);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      if (text != null) e.textContent = text;
      return e;
    }
    function pattern(defs, col) {
      const pid = id + '-s' + col.replace('#', '');
      if (!defs.querySelector('#' + pid)) {
        const p = svgEl('pattern', { id: pid, width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
        p.appendChild(svgEl('rect', { width: 6, height: 6, fill: col, 'fill-opacity': '.35' }));
        p.appendChild(svgEl('rect', { width: 3, height: 6, fill: col }));
        defs.appendChild(p);
      }
      return 'url(#' + pid + ')';
    }
    function bindBar(g, r) {
      g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button');
      g.setAttribute('aria-label', `${r.name}, ${r.lab}: ${fmt(r.pct)}%, ${r.k} of ${r.n} conversations. Open profile.`);
      g.addEventListener('mousemove', e => showTip(r, e.clientX, e.clientY));
      g.addEventListener('mouseleave', hideTip);
      g.addEventListener('focus', () => { const b = g.getBoundingClientRect(); showTip(r, b.left + b.width / 2, b.top); });
      g.addEventListener('blur', hideTip);
      g.addEventListener('click', () => open(r.id));
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(r.id); } });
    }

    function vertical(list) {
      const padL = 40, padR = 12, padT = 18, plotH = 260, labH = 132;
      const slot = Math.max(14, Math.min(30, (plot.clientWidth - padL - padR) / list.length)), dense = slot < 24;   // many models: fit the card, values move to the tooltip
      const W = Math.max(plot.clientWidth, padL + padR + list.length * slot), H = padT + plotH + labH;
      const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: 'aa__svg', role: 'group', 'aria-label': `${M.label} by model, highest first` });
      const defs = svgEl('defs', {}); svg.appendChild(defs);
      const top = niceMax(Math.max(...list.map(r => r.pct), 1) * 1.08);   // scale to the bars; interval lines above the top are clipped
      const y = v => padT + plotH - (Math.min(v, top) / top) * plotH;
      const bw = Math.min(22, (W - padL - padR) / list.length - 6), step = (W - padL - padR) / list.length;
      for (let t = 0; t <= 4; t++) {
        const v = top * t / 4;
        svg.appendChild(svgEl('line', { x1: padL, x2: W - padR, y1: y(v), y2: y(v), class: 'aa__grid' }));
        svg.appendChild(svgEl('text', { x: padL - 8, y: y(v) + 4, class: 'aa__axis', 'text-anchor': 'end' }, fmt(v) + '%'));
      }
      list.forEach((r, i) => {
        const cx = padL + step * i + step / 2, col = colour(r.lab), g = svgEl('g', { class: 'aa__bar' });
        const h = Math.max(r.pct > 0 ? 2 : 0, (r.pct / top) * plotH);
        g.appendChild(svgEl('rect', { x: cx - step / 2, y: padT, width: step, height: plotH + labH, class: 'aa__hit' }));
        g.appendChild(svgEl('rect', { x: cx - bw / 2, y: padT + plotH - h, width: bw, height: h, rx: 2, fill: r.small ? pattern(defs, col) : col }));
        g.appendChild(svgEl('line', { x1: cx, x2: cx, y1: y(r.hi), y2: y(r.lo), class: 'aa__ci' }));
        const lbl = fmt(r.pct), inside = h > 28 && !r.small;   // striped (small-sample) bars carry their value above the bar for contrast
        if (!dense) g.appendChild(svgEl('text', { x: cx, y: inside ? padT + plotH - h + 15 : padT + plotH - h - 6, class: 'aa__val' + (inside ? ' aa__val--in' : ''), 'text-anchor': 'middle' }, lbl));
        g.appendChild(svgEl('text', { x: cx + 4, y: padT + plotH + 12, class: 'aa__name' + (dense ? ' aa__name--dense' : ''), transform: `rotate(-55 ${cx + 4} ${padT + plotH + 12})`, 'text-anchor': 'end' }, r.name.length > 24 ? r.name.slice(0, 23) + '…' : r.name));
        bindBar(g, r); svg.appendChild(g);
      });
      svg.appendChild(svgEl('line', { x1: padL, x2: W - padR, y1: padT + plotH, y2: padT + plotH, class: 'aa__base' }));
      const wrap = document.createElement('div'); wrap.className = 'aa__scroll'; wrap.appendChild(svg);
      return wrap;
    }

    function horizontal(list) {
      const top = niceMax(Math.max(...list.map(r => r.pct), 1) * 1.08);
      const ol = document.createElement('ol'); ol.className = 'aa__rows';
      ol.innerHTML = list.map(r => {
        const col = colour(r.lab);
        return `<li><button type="button" class="aa__row" data-open="${esc(r.id)}" aria-label="${esc(r.name)}, ${esc(r.lab)}: ${fmt(r.pct)}%, ${r.k} of ${r.n} conversations. Open profile.">
          <span class="aa__rname">${esc(r.name)}</span>
          <span class="aa__rtrack"><span class="aa__rbar${r.small ? ' aa__rbar--small' : ''}" style="--c:${col};width:${(r.pct / top) * 100}%"></span><span class="aa__rci" style="left:${(r.lo / top) * 100}%;width:${((Math.min(r.hi, top) - r.lo) / top) * 100}%"></span></span>
          <span class="aa__rval">${fmt(r.pct)}%</span></button></li>`;
      }).join('');
      bindRows(ol);
      return ol;
    }

    draw();
    let last = plot.clientWidth;
    window.addEventListener('resize', () => { const w = plot.clientWidth; if (Math.abs(w - last) > 40) { last = w; if (!st.table) draw(); } });
  }

  hosts.forEach(build);

  // the profile's 'see charts' link closes the profile (home.js) and then brings this section into view
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('.pf__alsoh a');
    if (!a) return;
    e.preventDefault();
    setTimeout(() => { const t = document.getElementById('beyond'); if (t) t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }, 80);
  });
})();
