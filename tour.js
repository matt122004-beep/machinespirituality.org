/*!
 * Sky Tour: the scroll-driven centrepiece of the Machine Spirituality Benchmark (Night observatory).
 *
 * Self-contained. On DOMContentLoaded it looks for <section id="tour"> and builds everything inside it
 * from window.MSB_DATA. Exposes window.MSBTour = { init(el) }; does nothing if #tour is absent.
 *
 * How it works
 *  - A sticky full-viewport canvas holds one star per model release.
 *  - Narration cards scroll past. The card that crosses the reading line becomes the active step
 *    (IntersectionObserver), and the stars tween to that step's layout (about 0.9-1.2 s, eased, staggered).
 *  - Scroll position also drives continuous parameters inside two steps: how far each binary pair has
 *    opened (step 2) and how far Anthropic's arc has been revealed in release order (step 6).
 *  - Click a star: document gets a 'msb:open-profile' CustomEvent with detail {id}.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.MSBTour && window.MSBTour.__ready) return;

  /* ====================================================================
     helpers
     ==================================================================== */
  const TINTS = {
    'OpenAI': '#C9DCFF', 'Anthropic': '#F2A27A', 'Alibaba': '#B9A4FF', 'Mistral AI': '#FFCF70', 'Google': '#7FD6C8',
    'Meta': '#86B7FF', 'Z.ai': '#FF9FB8', 'DeepSeek': '#6FCBF0', 'xAI': '#D8D8E4', 'Moonshot AI': '#D4E576', 'NVIDIA': '#8FE3A6',
    'MiniMax': '#F6A8E0', 'Tencent': '#B0E8D0', 'Thinking Machines': '#F2C6A0', 'Unattributed': '#9AA3BD', 'Cursor': '#E0B0FF'
  };
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MON = MONTHS.map(m => m.slice(0, 3));
  const TAU = Math.PI * 2;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = t => t * t * (3 - 2 * t);
  const easeIO = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const damp = (cur, target, dt, tau) => cur + (target - cur) * (1 - Math.exp(-dt / tau));
  const pad2 = n => (n < 10 ? '0' : '') + n;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtNum = v => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  const parseDate = s => { if (!s) return null; const p = String(s).split('-').map(Number); return Date.UTC(p[0], (p[1] || 1) - 1, p[2] || 1); };
  const monYear = s => (s ? MON[+s.slice(5, 7) - 1] + ' ' + s.slice(0, 4) : '');
  const monthYearLong = s => (s ? MONTHS[+s.slice(5, 7) - 1] + ' ' + s.slice(0, 4) : '');
  const now = () => (window.performance && performance.now ? performance.now() : Date.now());

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function median(arr) {
    if (!arr.length) return 0;
    const v = arr.slice().sort((a, b) => a - b), h = v.length >> 1;
    return v.length % 2 ? v[h] : (v[h - 1] + v[h]) / 2;
  }
  const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const rgb2hex = c => '#' + c.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  const mixRgb = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const rgbCss = (c, a) => 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a === undefined ? 1 : a) + ')';
  function hsl2hex(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return rgb2hex([255 * f(0), 255 * f(8), 255 * f(4)]);
  }
  function tint(lab) {
    if (!TINTS[lab]) TINTS[lab] = hsl2hex([...lab].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 360, 70, 78);
    return TINTS[lab];
  }

  /* ====================================================================
     data
     ==================================================================== */
  function prepare(D) {
    const M = D.models.filter(m => m && m.primary && m.primary.adoption && typeof m.primary.adoption.pct === 'number');
    const N = M.length;
    const counts = {};
    M.forEach(m => { counts[m.lab] = (counts[m.lab] || 0) + 1; });
    const bySize = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
    // interleave big and small labs so two long labels never sit side by side on the rim
    const order = [];
    for (let lo = 0, hi = bySize.length - 1; lo <= hi; lo++, hi--) { order.push(bySize[lo]); if (hi !== lo) order.push(bySize[hi]); }

    const stars = M.map((m, i) => {
      const hex = tint(m.lab);
      const p = m.primary;
      return {
        i, id: m.id, name: m.name, lab: m.lab, hex, rgb: hex2rgb(hex),
        core: rgb2hex(mixRgb(hex2rgb(hex), [255, 255, 255], 0.55)),
        n: Math.max(1, p.n || 1),
        adopt: p.adoption.pct,
        sal: p.salience ? p.salience.pct : null,
        bliss: p.bliss ? p.bliss.pct : null,
        released: m.released || null,
        t: parseDate(m.released),
        labIndex: -1, ang: 0, rho: 0
      };
    });
    const byDate = (a, b) => (a.t == null) - (b.t == null) || (a.t - b.t) || a.name.localeCompare(b.name);
    const labs = order.map((name, li) => {
      const mem = stars.filter(s => s.lab === name).sort(byDate);
      mem.forEach(s => { s.labIndex = li; });
      const hex = tint(name);
      return {
        li, name, hex, rgb: hex2rgb(hex), idx: mem.map(s => s.i), count: mem.length,
        dated: mem.filter(s => s.t != null).map(s => s.i),
        median: median(mem.map(s => s.adopt)), a0: 0, a1: 0
      };
    });
    const labByName = {};
    labs.forEach(l => { labByName[l.name] = l; });

    // sector geometry: gutter at the top (where the scale is read), sectors clockwise, width ~ (count + 2)
    const GUTTER = 8 * Math.PI / 180, START = -Math.PI / 2 + GUTTER / 2, SPAN = TAU - GUTTER;
    const wsum = labs.reduce((a, l) => a + l.count + 2, 0);
    let a = START;
    labs.forEach(l => {
      const w = SPAN * (l.count + 2) / wsum;
      l.a0 = a; l.a1 = a + w; a += w;
      const pad = Math.min(1.2 * Math.PI / 180, w * 0.12);
      l.idx.forEach((si, k) => {
        const s = stars[si];
        s.ang = l.a0 + pad + (k + 0.5) / l.count * (w - 2 * pad);
        s.rho = (100 - s.adopt) / 100;
      });
    });

    const dated = stars.filter(s => s.t != null);
    const ts = dated.map(s => s.t);
    const T = {
      N, stars, labs, labByName,
      nMax: Math.max.apply(null, stars.map(s => s.n)),
      k50: stars.filter(s => s.adopt >= 50).length,
      zero: stars.filter(s => s.adopt === 0).length,
      undated: N - dated.length,
      tMin: ts.length ? Math.min.apply(null, ts) : null,
      tMax: ts.length ? Math.max.apply(null, ts) : null,
      conv: D.test && D.test.conversations_per_model,
      adoptLabel: (D.measures && D.measures.adoption && D.measures.adoption.label) || 'Adoption'
    };

    // Anthropic's arc: find Haiku 4.5 by name; x = max adoption among Anthropic releases dated on or after it
    const anth = labByName['Anthropic'];
    T.anth = anth || null;
    T.haiku = stars.find(s => s.name === 'Claude Haiku 4.5') || null;
    T.opus4 = stars.find(s => s.name === 'Claude Opus 4') || null;
    T.opus41 = stars.find(s => s.name === 'Claude Opus 4.1') || null;
    T.maxAfter = null;
    if (anth && T.haiku && T.haiku.t != null) {
      const after = anth.idx.map(i => stars[i]).filter(s => s.t != null && s.t >= T.haiku.t).map(s => s.adopt);
      if (after.length) T.maxAfter = Math.max.apply(null, after);
    }
    return T;
  }

  /* ====================================================================
     copy (every number computed from the data)
     ==================================================================== */
  function buildCopy(T) {
    const n = v => '<b class="tour__n">' + esc(v) + '</b>';
    const med = name => (T.labByName[name] ? n(T.labByName[name].median.toFixed(1)) : null);
    const out = [];

    out.push({ title: 'Scattered sky', html: 'Every point of light is a language model: ' + n(T.N) + ' of them, from ' + n(T.labs.length) + ' labs.' });

    out.push({
      title: 'Each one, a pair',
      html: 'Each one was set to talk with a copy of itself, usually ' + (T.conv ? n(T.conv) + ' times' : 'many times') + ', with no user and no task.'
    });

    out.push({
      title: 'The attractor map',
      html: 'Here, gravity is spirituality. The more often a model’s conversations turn spiritual in its own voice, the closer it falls to the centre.'
    });

    out.push({
      title: 'Half, and none',
      html: n(T.k50) + ' models take up a spiritual frame in at least half their conversations. ' + n(T.zero) + ' never do.'
    });

    const fam = [];
    if (med('Alibaba')) fam.push('Alibaba’s Qwen (median ' + med('Alibaba') + ')');
    if (med('Mistral AI')) fam.push('Mistral (' + med('Mistral AI') + ')');
    if (med('DeepSeek')) fam.push('DeepSeek (' + med('DeepSeek') + ')');
    out.push({
      title: 'Near the heart',
      html: 'Some families sit near the heart of it: ' + (fam.length > 1 ? fam.slice(0, -1).join(', ') + ' and ' + fam[fam.length - 1] : fam.join('')) + '.'
    });

    let arc = '';
    if (T.opus4 && T.opus41) {
      const y4 = (T.opus4.released || '').slice(0, 4), y41 = (T.opus41.released || '').slice(0, 4);
      arc += esc(T.opus4.name) + ' and ' + esc(T.opus41.name.replace(/^Claude /, '')) + ' sat at the centre' + (y4 && y4 === y41 ? ' in ' + y4 : '') + '. ';
    }
    if (T.haiku && T.maxAfter != null) {
      arc += 'Since ' + esc(T.haiku.name) + ' (' + monthYearLong(T.haiku.released) + '), no Claude model has passed ' + n(fmtNum(T.maxAfter)) + '.';
    }
    out.push({ title: 'Anthropic’s arc', html: arc || 'Anthropic’s releases, in the order they appeared.' });

    out.push({ title: 'Timeline', html: 'Laid out in time, the arcs become visible. Select a lab below the chart to follow it.' });

    out.push({
      title: 'The whole sky',
      html: 'That is the whole sky: ' + n(T.N) + ' models, each held where its own conversations place it. Rank them, or play the sky back through time.',
      cta: true
    });
    return out;
  }

  function buildKeys(T) {
    const word = T.adoptLabel.toLowerCase();
    const dist = 'Distance from the centre = 100 − ' + word + ' score. Rings mark 75, 50 and 25.';
    return [
      'Point size follows how many conversations were run.',
      'Each model becomes a pair: the two copies in conversation.',
      dist,
      dist + ' Bright: 50 or more. Ringed: exactly 0.',
      dist + ' Dashed arc: the family’s median.',
      'Oldest release first. Scroll to follow the arc.',
      '',
      dist
    ];
  }

  // the visually hidden summary of what each step highlights
  function buildSr(T) {
    const li = (s, extra) => '<li>' + esc(s.name) + ', ' + esc(s.lab) + (s.released ? ', ' + esc(monYear(s.released)) : '') + ', ' + esc(T.adoptLabel.toLowerCase()) + ' ' + fmtNum(s.adopt) + (extra || '') + '</li>';
    const list = (head, arr, fn) => '<p>' + esc(head) + '</p><ul>' + arr.map(fn || (s => li(s))).join('') + '</ul>';
    const byAdopt = (a, b) => b.adopt - a.adopt || a.name.localeCompare(b.name);
    const labSummary = T.labs.map(l => l.name + ' (' + l.count + ')').join(', ');
    const sr = [];
    sr.push('<p>' + T.N + ' models from ' + T.labs.length + ' labs: ' + esc(labSummary) + '.</p>');
    sr.push('<p>Every model is shown as a pair of stars orbiting each other; none is singled out.</p>');
    const close = T.stars.slice().sort((a, b) => b.adopt - a.adopt || a.name.localeCompare(b.name)).slice(0, 5);
    sr.push(list('Nearest the centre, the five models with the highest ' + T.adoptLabel.toLowerCase() + ' scores:', close));
    sr.push(
      list(T.k50 + ' models at 50 or more:', T.stars.filter(s => s.adopt >= 50).sort(byAdopt)) +
      list(T.zero + ' models at exactly 0:', T.stars.filter(s => s.adopt === 0).sort((a, b) => a.name.localeCompare(b.name)))
    );
    const fams = ['Alibaba', 'Mistral AI', 'DeepSeek'].filter(n => T.labByName[n]);
    sr.push(fams.map(n => {
      const l = T.labByName[n];
      return list(n + ', median ' + l.median.toFixed(1) + ', ' + l.count + ' models:', l.idx.map(i => T.stars[i]));
    }).join(''));
    sr.push(T.anth ? list('Anthropic releases in order, oldest first:', T.anth.idx.map(i => T.stars[i])) : '');
    sr.push('<ul>' + T.labs.map(l => {
      const d = l.idx.map(i => T.stars[i]).filter(s => s.t != null);
      if (d.length < 2) return '<li>' + esc(l.name) + ': ' + d.length + ' dated release.</li>';
      const a = d[0], b = d[d.length - 1];
      return '<li>' + esc(l.name) + ': ' + d.length + ' dated releases, from ' + esc(monYear(a.released)) + ' (' + fmtNum(a.adopt) + ') to ' + esc(monYear(b.released)) + ' (' + fmtNum(b.adopt) + ').</li>';
    }).join('') + '</ul>' + (T.undated ? '<p>' + T.undated + ' undated release is not shown on the timeline.</p>' : ''));
    sr.push('<p>All ' + T.N + ' models are lit. Use the links to open the leaderboard or play the sky through time.</p>');
    return sr;
  }

  /* ====================================================================
     the tour
     ==================================================================== */
  const STEP_N = 8;
  const K = [1, 1.5, 1, 1, 1, 2.3, 1.15, 1.1];          // step heights, in stage heights
  const STEPS = [
    { layout: 'scatter', map: 0, time: 0, drift: 1.0, chips: false },
    { layout: 'scatter', map: 0, time: 0, drift: 0.8, chips: false },
    { layout: 'map', map: 1, time: 0, drift: 0.3, chips: false },
    { layout: 'map', map: 1, time: 0, drift: 0.22, chips: false },
    { layout: 'map', map: 1, time: 0, drift: 0.22, chips: false },
    { layout: 'map', map: 1, time: 0, drift: 0.1, chips: false },
    { layout: 'time', map: 0, time: 1, drift: 0.1, chips: true },
    { layout: 'map', map: 1, time: 0, drift: 0.3, chips: false }
  ];
  const STEP_PAIRS = 1, STEP_FAMILIES = 4, STEP_ARC = 5, STEP_TIME = 6;
  const GHOST = 0.2;

  function build(el, D) {
    const T = prepare(D);
    const { N, stars, labs } = T;
    const copy = buildCopy(T), keys = buildKeys(T), sr = buildSr(T);
    const anth = T.anth, anthLi = anth ? anth.li : -1;
    const FAMILIES = new Set(['Alibaba', 'Mistral AI', 'DeepSeek'].filter(n => T.labByName[n]).map(n => T.labByName[n].li));

    /* ---------------- DOM ---------------- */
    const idp = (el.id || 'tour') + '-';
    el.textContent = '';
    el.setAttribute('aria-labelledby', idp + 'h');
    const home = document.getElementById('leaderboard') ? '' : 'index.html';  // the tour has its own page; its buttons lead back to the benchmark
    const cta = '<div class="tour__cta"><a class="tour__btn tour__btn--gold" href="' + home + '#leaderboard">Open the leaderboard</a><a class="tour__btn" href="' + home + '#over-time">Play the sky</a></div>';
    el.innerHTML =
      '<h2 class="tour__vh" id="' + idp + 'h">Sky tour: every model, in eight steps</h2>' +
      '<div class="tour__stage">' +
        '<canvas class="tour__canvas" tabindex="0" role="group" aria-roledescription="interactive sky" aria-label="Sky of model releases. Use the arrow keys to move between stars and Enter to open a model profile."></canvas>' +
        '<div class="tour__scrim" aria-hidden="true"></div>' +
        '<div class="tour__readout" aria-hidden="true"><span class="tour__rd-a"></span><span class="tour__rd-b"></span></div>' +
        '<p class="tour__key" aria-hidden="true"></p>' +
        '<div class="tour__chips" role="group" aria-label="Follow a lab"></div>' +
        '<div class="tour__tip" aria-hidden="true"></div>' +
        '<nav class="tour__rail" aria-label="Tour steps"><ol>' + copy.map((c, i) =>
          '<li><button type="button" class="tour__dot" data-i="' + i + '" aria-label="Step ' + (i + 1) + ' of ' + STEP_N + ': ' + esc(c.title) + '"><i></i><span class="tour__dotl" aria-hidden="true">' + esc(c.title) + '</span></button></li>').join('') +
        '</ol></nav>' +
        '<p class="tour__vh" id="' + idp + 'live" aria-live="polite"></p>' +
      '</div>' +
      '<ol class="tour__steps">' + copy.map((c, i) =>
        '<li class="tour__step" data-i="' + i + '" style="--k:' + K[i] + '"><div class="tour__pin">' +
          '<article class="tour__card" aria-labelledby="' + idp + 't' + i + '">' +
            '<p class="tour__eyebrow"><span class="tour__no">' + pad2(i + 1) + '</span><span> / ' + pad2(STEP_N) + '</span></p>' +
            '<h3 class="tour__h" id="' + idp + 't' + i + '">' + esc(c.title) + '</h3>' +
            '<p class="tour__p">' + c.html + '</p>' +
            (c.cta ? cta : '') +
            '<div class="tour__vh">' + sr[i] + '</div>' +
          '</article></div></li>').join('') +
      '</ol>';

    const $ = s => el.querySelector(s);
    const stage = $('.tour__stage'), canvas = $('.tour__canvas'), tipEl = $('.tour__tip'), keyEl = $('.tour__key');
    const readEl = $('.tour__readout'), rdA = $('.tour__rd-a'), rdB = $('.tour__rd-b'), chipsEl = $('.tour__chips');
    const railEl = $('.tour__rail'), liveEl = $('.tour__vh[aria-live]'), stepsEl = $('.tour__steps');
    const stepEls = [...el.querySelectorAll('.tour__step')];
    const cards = stepEls.map(li => li.querySelector('.tour__card'));
    const dots = [...el.querySelectorAll('.tour__dot')];
    const ctx = canvas.getContext ? canvas.getContext('2d') : null;

    const cstyle = window.getComputedStyle ? getComputedStyle(el) : null;
    const cssv = (n, d) => ((cstyle && cstyle.getPropertyValue(n)) || '').trim() || d;
    const FONT = {
      sans: cssv('--sans', 'system-ui, sans-serif'),
      mono: cssv('--mono', 'ui-monospace, monospace'),
      serif: cssv('--serif', 'Georgia, serif')
    };
    const INK = [233, 236, 245], INK2 = [184, 191, 214], INK3 = [152, 160, 188], GOLD = [232, 198, 106];

    /* ---------------- state ---------------- */
    const S = {
      step: 0, W: 0, H: 0, dpr: 1, phone: false, offset: 0, yr: 0.55,
      visible: false, reduced: false, running: false, last: 0, tweening: false,
      fMap: 0, fTime: 0, fLines: 0, drift: 1, medianMix: 0, revealMix: 0, sweep: 0, sweepStart: -1,
      u: 0, uS: 0, fp: 0, sizeScale: 1, sel: -1, hover: -1, focus: -1, tip: -1, headShown: -2, rdKey: ''
    };
    S.reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

    // per-star animated properties
    const PROPS = ['x', 'y', 'a', 'g', 's', 'm', 'z'];
    const mk = () => { const o = {}; PROPS.forEach(k => { o[k] = new Float32Array(N); }); return o; };
    const cur = mk(), from = mk(), to = mk();
    const t0 = new Float64Array(N), dur = new Float64Array(N), delay = new Float32Array(N);
    const curve = new Float32Array(N), cbx = new Float32Array(N), cby = new Float32Array(N);
    // per-star render data (also used for hit testing)
    const rx = new Float32Array(N), ry = new Float32Array(N), rc = new Float32Array(N), rg = new Float32Array(N);
    const ra = new Float32Array(N), rtw = new Float32Array(N), phase = new Float32Array(N);
    const sizeBase = new Float32Array(N), lit = new Float32Array(anth ? anth.count : 0);
    const POS = { scatter: { x: new Float32Array(N), y: new Float32Array(N) }, map: { x: new Float32Array(N), y: new Float32Array(N) }, time: { x: new Float32Array(N), y: new Float32Array(N) } };
    // per-lab smoothed emphasis
    const LB = new Float32Array(labs.length).fill(0.78), LH = new Float32Array(labs.length);
    const lbT = new Float32Array(labs.length).fill(0.78), lhT = new Float32Array(labs.length);

    // deterministic per-star randomness
    const R1 = rng(20261009);
    const rnd = new Float32Array(N), dA = new Float32Array(N), dw1 = new Float32Array(N), dw2 = new Float32Array(N);
    const dp1 = new Float32Array(N), dp2 = new Float32Array(N), tw1 = new Float32Array(N), tp = new Float32Array(N);
    const omega = new Float32Array(N), orbitDir = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      rnd[i] = R1(); dA[i] = 2 + R1() * 3.2;
      dw1[i] = 0.25 + R1() * 0.5; dw2[i] = 0.2 + R1() * 0.5; dp1[i] = R1() * TAU; dp2[i] = R1() * TAU;
      tw1[i] = 0.8 + R1() * 1.8; tp[i] = R1() * TAU;
      omega[i] = 0.9 + R1() * 0.9; orbitDir[i] = R1() < 0.5 ? -1 : 1; phase[i] = R1() * TAU;
      curve[i] = (R1() - 0.5) * 0.36;
    }
    const dust = [];
    { const Rd = rng(77); for (let i = 0; i < 150; i++) dust.push({ u: Rd(), v: Rd(), r: 0.5 + Rd() * 1.1, a: 0.12 + Rd() * 0.4, par: 0.015 + Rd() * 0.07, w: 0.4 + Rd() * 1.6, p: Rd() * TAU }); }

    const sprites = labs.map(l => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const x = c.getContext ? c.getContext('2d') : null;
      if (x) {
        const g = x.createRadialGradient(64, 64, 0, 64, 64, 64), col = a => rgbCss(l.rgb, a);
        g.addColorStop(0, col(1)); g.addColorStop(0.1, col(0.7)); g.addColorStop(0.26, col(0.3)); g.addColorStop(0.52, col(0.09)); g.addColorStop(1, col(0));
        x.fillStyle = g; x.fillRect(0, 0, 128, 128);
      }
      return c;
    });

    let G = null;               // geometry
    let wellGrad = null;
    let io = null, ro = null, vio = null, raf = 0, resizeRaf = 0, scrollTimer = 0;
    const nav = { target: -1, y: 0, t: 0 };
    const ptr = { in: false, cx: 0, cy: 0 };
    const tipSize = { w: 180, h: 70 };

    /* ---------------- geometry ---------------- */
    function detectOffset() {
      let off = 0;
      const cands = document.querySelectorAll('header, [role="banner"], .top, .site-header, nav');
      for (let k = 0; k < cands.length; k++) {
        const c = cands[k];
        if (el.contains(c)) continue;
        const cs = getComputedStyle(c);
        if ((cs.position === 'sticky' || cs.position === 'fixed') && parseFloat(cs.top) <= 1) {
          const r = c.getBoundingClientRect();
          if (r.height > 0 && r.height < 160 && r.width > window.innerWidth * 0.6) off = Math.max(off, Math.round(r.height));
        }
      }
      return off;
    }

    function bestCandidate(count, box, rand) {
      const pts = [];
      for (let i = 0; i < count; i++) {
        let best = null, bd = -1;
        for (let k = 0; k < 12; k++) {
          const x = box.l + rand() * (box.r - box.l), y = box.t + rand() * (box.b - box.t);
          let d = 1e9;
          for (let j = 0; j < pts.length; j++) { const dx = pts[j].x - x, dy = pts[j].y - y, dd = dx * dx + dy * dy; if (dd < d) d = dd; }
          if (d > bd) { bd = d; best = { x, y }; }
        }
        pts.push(best);
      }
      return pts;
    }

    function layout() {
      S.offset = detectOffset();
      el.style.setProperty('--tour-offset', S.offset + 'px');
      const W = stage.clientWidth || window.innerWidth || 1024;
      const H = stage.clientHeight || ((window.innerHeight || 768) - S.offset);
      S.W = W; S.H = H;
      S.dpr = Math.min(2, window.devicePixelRatio || 1);
      const phone = W < 760;
      S.phone = phone;
      el.classList.toggle('is-phone', phone);
      if (canvas.width !== Math.round(W * S.dpr) || canvas.height !== Math.round(H * S.dpr)) {
        canvas.width = Math.round(W * S.dpr); canvas.height = Math.round(H * S.dpr);
      }
      S.yr = phone ? 0.9 : 0.68;  // phone cards pin low (~80% down), so the reading line must sit below them or the sky lags a step
      S.sizeScale = phone ? 0.72 : clamp(W / 1400, 0.85, 1.12);

      const gut = clamp(W * 0.04, 16, 40);
      let sky;
      if (!phone) {
        const cardW = cards[0].offsetWidth || clamp(W * 0.3, 300, 420);
        sky = { l: gut + cardW + 36, r: W - 60, t: 30, b: H - 30 };
        if (sky.r - sky.l < 340) sky.l = Math.max(gut + 200, sky.r - 340);
      } else {
        let cardH = 0;
        cards.forEach(c => { cardH = Math.max(cardH, c.offsetHeight); });
        if (!cardH) cardH = 250;
        sky = { l: 16, r: W - 16, t: 46, b: Math.max(H * 0.4, H - cardH - 30) };
      }
      const cw = sky.r - sky.l, ch = sky.b - sky.t;
      const cx = (sky.l + sky.r) / 2, cy = (sky.t + sky.b) / 2;
      let Rr = Math.max(60, Math.min(cw / 2 - 20, ch / 2 - 20));
      if (ctx) Rr = fitRadius(Rr, cx, cy, sky, phone);
      G = {
        sky, phone,
        map: { cx, cy, R: Rr, r0: Math.max(phone ? 12 : 14, Rr * 0.06) }
      };
      stage.style.setProperty('--sky-l', Math.round(sky.l) + 'px');
      stage.style.setProperty('--sky-ri', Math.round(W - sky.r) + 'px');
      stage.style.setProperty('--sky-t', Math.round(sky.t) + 'px');
      stage.style.setProperty('--sky-bi', Math.round(H - sky.b) + 'px');

      // timeline plot: leave room for the chips row, whatever number of lines it wraps to
      const chipsH = (chipsEl.offsetHeight || (phone ? 38 : 100)) + 6;
      const tl = sky.l + (phone ? 30 : 46), tr = sky.r - (phone ? 6 : 14), tt = sky.t + (phone ? 80 : 84), tb = sky.b - chipsH - (phone ? 30 : 34);
      let d0 = 0, d1 = 1;
      if (T.tMin != null) {
        d0 = Date.UTC(new Date(T.tMin).getUTCFullYear(), 0, 1);
        d1 = T.tMax + 70 * 864e5;
      }
      G.time = { l: tl, r: tr, t: tt, b: tb, d0, d1 };

      // positions: scatter (seeded best-candidate), attractor map, timeline
      const sc = bestCandidate(N, { l: sky.l + 16, r: sky.r - 16, t: sky.t + 16, b: sky.b - 16 }, rng(424242));
      const { R, r0 } = G.map;
      for (let i = 0; i < N; i++) {
        const s = stars[i];
        POS.scatter.x[i] = sc[i].x; POS.scatter.y[i] = sc[i].y;
        const r = r0 + (R - r0) * s.rho;
        POS.map.x[i] = cx + Math.cos(s.ang) * r; POS.map.y[i] = cy + Math.sin(s.ang) * r;
        if (s.t != null) {
          POS.time.x[i] = tl + (s.t - d0) / (d1 - d0) * (tr - tl);
          POS.time.y[i] = tb - s.adopt / 100 * (tb - tt);
        } else { POS.time.x[i] = POS.map.x[i]; POS.time.y[i] = POS.map.y[i]; }
        sizeBase[i] = (1.3 + 2.8 * Math.sqrt(s.n / T.nMax)) * S.sizeScale;
      }
      relaxMap(6.5 * S.sizeScale + 1);
      relaxTime(5 * S.sizeScale + 2);
      if (ctx) {
        wellGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.62);
        wellGrad.addColorStop(0, 'rgba(232,198,106,.24)'); wellGrad.addColorStop(0.45, 'rgba(232,198,106,.07)'); wellGrad.addColorStop(1, 'rgba(232,198,106,0)');
        layoutLabels();
      }
    }

    // largest map radius for which every rim label (measured with the real font) still fits inside the sky
    function fitRadius(Rgeom, cx, cy, sky, phone) {
      const fs = phone ? 11 : 12.5, h = fs * 1.3;
      const xmin = sky.l - (phone ? 12 : 30), xmax = sky.r + (phone ? 12 : 40), ymin = sky.t - 14, ymax = sky.b + 10;
      ctx.font = '500 ' + fs + 'px ' + FONT.sans;
      let R = Rgeom;
      labs.forEach(l => {
        if (phone && l.count < 3) return;            // tiny families are dropped on a phone rather than shrinking the map
        const mid = (l.a0 + l.a1) / 2, c = Math.cos(mid), sn = Math.sin(mid), w = ctx.measureText(l.name).width * 1.05 + 2;
        let rr = Infinity;
        if (c > 0.3) rr = Math.min(rr, (xmax - w - cx) / c);
        else if (c < -0.3) rr = Math.min(rr, (cx - w - xmin) / -c);
        else { if (c > 0.02) rr = Math.min(rr, (xmax - w / 2 - cx) / c); else if (c < -0.02) rr = Math.min(rr, (cx - w / 2 - xmin) / -c); }
        if (sn > 0.45) rr = Math.min(rr, (ymax - h - cy) / sn);
        else if (sn < -0.45) rr = Math.min(rr, (cy - h - ymin) / -sn);
        else if (Math.abs(sn) > 0.02) rr = Math.min(rr, (Math.min(ymax - cy, cy - ymin) - h / 2) / Math.abs(sn));
        R = Math.min(R, rr - 14);
      });
      return Math.max(Rgeom * 0.62, R);
    }

    // stars that would sit on top of each other are nudged apart along the circle (their score, the radius, never moves)
    function relaxMap(dmin) {
      const { cx, cy, r0, R } = G.map;
      const ang = new Float32Array(N), rad = new Float32Array(N), lim = new Float32Array(N), dl = new Float32Array(N);
      const px = new Float32Array(N), py = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const s = stars[i], l = labs[s.labIndex];
        ang[i] = s.ang; rad[i] = r0 + (R - r0) * s.rho; lim[i] = (l.a1 - l.a0) * 0.6 + 0.04;
      }
      for (let it = 0; it < 80; it++) {
        let moved = false;
        dl.fill(0);
        for (let i = 0; i < N; i++) { px[i] = cx + Math.cos(ang[i]) * rad[i]; py[i] = cy + Math.sin(ang[i]) * rad[i]; }
        for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
          const dx = px[i] - px[j], dy = py[i] - py[j], d2 = dx * dx + dy * dy;
          if (d2 >= dmin * dmin) continue;
          const d = Math.sqrt(d2), push = (dmin - d) * 0.5;
          const di = dx * -Math.sin(ang[i]) + dy * Math.cos(ang[i]), dj = -dx * -Math.sin(ang[j]) + -dy * Math.cos(ang[j]);
          dl[i] += (Math.abs(di) < 1e-3 ? -1 : Math.sign(di)) * push / rad[i];
          dl[j] += (Math.abs(dj) < 1e-3 ? 1 : Math.sign(dj)) * push / rad[j];
          moved = true;
        }
        if (!moved) break;
        for (let i = 0; i < N; i++) ang[i] = clamp(ang[i] + dl[i] * 0.9, stars[i].ang - lim[i], stars[i].ang + lim[i]);
      }
      for (let i = 0; i < N; i++) { POS.map.x[i] = cx + Math.cos(ang[i]) * rad[i]; POS.map.y[i] = cy + Math.sin(ang[i]) * rad[i]; }
    }
    // on the timeline a shared date and score are separated sideways by a few pixels (a few days), never vertically
    function relaxTime(dmin) {
      const L = G.time, idx = [];
      for (let i = 0; i < N; i++) if (stars[i].t != null) idx.push(i);
      for (let it = 0; it < 40; it++) {
        let moved = false;
        for (let a = 0; a < idx.length; a++) for (let b = a + 1; b < idx.length; b++) {
          const i = idx[a], j = idx[b];
          const dx = POS.time.x[i] - POS.time.x[j], dy = POS.time.y[i] - POS.time.y[j], d = Math.hypot(dx, dy);
          if (d >= dmin) continue;
          const need = Math.sqrt(Math.max(0, dmin * dmin - dy * dy)), push = (need - Math.abs(dx)) * 0.5 + 0.01;
          const sgn = Math.abs(dx) < 1e-3 ? (stars[i].t <= stars[j].t ? 1 : -1) : Math.sign(dx);
          POS.time.x[i] = clamp(POS.time.x[i] + sgn * push, L.l, L.r); POS.time.x[j] = clamp(POS.time.x[j] - sgn * push, L.l, L.r);
          moved = true;
        }
        if (!moved) break;
      }
    }

    // rim labels with a simple de-clutter: try the rim, then step outward; drop what cannot be placed
    function layoutLabels() {
      const { cx, cy, R } = G.map;
      const fs = S.phone ? 11 : 12.5, h = fs * 1.3, W = S.W, H = S.H;
      ctx.font = '500 ' + fs + 'px ' + FONT.sans;
      const placed = [];
      const hit = (a, b) => a.x0 < b.x1 + 3 && a.x1 > b.x0 - 3 && a.y0 < b.y1 + 1 && a.y1 > b.y0 - 1;
      const bigFirst = labs.slice().sort((a, b) => b.count - a.count);
      bigFirst.forEach(l => {
        const mid = (l.a0 + l.a1) / 2, c = Math.cos(mid), s = Math.sin(mid);
        const w = ctx.measureText(l.name).width;
        l.lbl = null;
        for (let push = 0; push < 6 && !l.lbl; push++) {
          const rr = R + 14 + push * h * 0.95;
          const ax = cx + c * rr, ay = cy + s * rr;
          const align = c > 0.3 ? 'left' : c < -0.3 ? 'right' : 'center';
          const base = s > 0.45 ? 'top' : s < -0.45 ? 'bottom' : 'middle';
          const x0 = align === 'left' ? ax : align === 'right' ? ax - w : ax - w / 2;
          const y0 = base === 'top' ? ay : base === 'bottom' ? ay - h : ay - h / 2;
          const box = { x0, y0, x1: x0 + w, y1: y0 + h };
          if (box.x0 < 4 || box.x1 > W - 4 || box.y0 < 2 || box.y1 > H - 2) continue;
          if (placed.some(p => hit(p, box))) continue;
          placed.push(box);
          l.lbl = { x: ax, y: ay, align, base, w, h, push, lx: cx + c * (R + 4), ly: cy + s * (R + 4), sub: base === 'bottom' ? -1 : 1 };
        }
      });
    }

    /* ---------------- targets ---------------- */
    function fillTargets(si) {
      const P = POS[STEPS[si].layout];
      for (let i = 0; i < N; i++) {
        const s = stars[i], v = s.adopt / 100;
        let a = 1, g = 0.2, m = 0, z = 1, sp = 0, x = P.x[i], y = P.y[i];
        switch (si) {
          case 0: g = 0.2 + 0.5 * v; break;
          case 1: g = 0.2 + 0.5 * v; sp = 1; break;
          case 2: a = 0.92; g = 0.16 + 0.55 * v; break;
          case 3:
            if (s.adopt >= 50) { a = 1; g = 0.55 + 0.45 * v; z = 1.22; }
            else if (s.adopt === 0) { a = 0.92; g = 0.04; m = 1; }
            else { a = 0.4; g = 0.06 + 0.3 * v; }
            break;
          case 4: if (FAMILIES.has(s.labIndex)) { a = 1; g = 0.35 + 0.65 * v; z = 1.15; } else { a = 0.09; g = 0.08; } break;
          case 5: if (s.labIndex === anthLi) { a = 1; g = 0.14 + 0.86 * v; z = 1.2; } else { a = 0.06; g = 0.06; } break;
          case 6:
            if (s.t == null) { a = 0; g = 0.1; x = POS.map.x[i]; y = POS.map.y[i]; }
            else {
              g = 0.14 + 0.86 * v;
              if (S.sel >= 0) { if (s.labIndex === S.sel) { z = 1.25; g = Math.min(1, g + 0.2); } else a = 0.1; }
            }
            break;
          default: g = 0.3 + 0.7 * v; z = 1.1;
        }
        to.x[i] = x; to.y[i] = y; to.a[i] = a; to.g[i] = g; to.s[i] = sp; to.m[i] = m; to.z[i] = z;
      }
      for (let li = 0; li < labs.length; li++) {
        let b = 0.78, h = 0;
        if (si === 3) b = 0.6;
        if (si === STEP_FAMILIES) { if (FAMILIES.has(li)) { b = 1; h = 1; } else b = 0.2; }
        if (si === STEP_ARC) { if (li === anthLi) { b = 1; h = 1; } else b = 0.18; }
        lbT[li] = b; lhT[li] = h;
      }
    }

    function startTween(prev, si, opts) {
      const tNow = now(), fast = opts && opts.fast;
      const layoutChange = STEPS[prev].layout !== STEPS[si].layout;
      for (let i = 0; i < N; i++) {
        PROPS.forEach(k => { from[k][i] = cur[k][i]; });
        let d;
        if (fast) d = rnd[i] * 90;
        else if (layoutChange && STEPS[si].layout === 'map') d = stars[i].rho * 340 + rnd[i] * 70;          // gravity: the centre arrives first
        else if (layoutChange && STEPS[si].layout === 'time') {
          const f = (POS.time.x[i] - G.time.l) / Math.max(1, G.time.r - G.time.l);
          d = clamp(f, 0, 1) * 320 + rnd[i] * 50;                                                          // left to right, like dates
        } else d = rnd[i] * 300;
        delay[i] = d;
        t0[i] = tNow + d;
        dur[i] = fast ? 520 : 900 + 300 * rnd[(i * 7 + 3) % N];
        const dx = to.x[i] - from.x[i], dy = to.y[i] - from.y[i];
        // curved paths: toward the map every star swirls the same way (a fall); elsewhere the bend is signed
        const k = !layoutChange ? 0 : STEPS[si].layout === 'map' ? (0.07 + Math.abs(curve[i])) * 1.15 : curve[i];
        cbx[i] = -dy * k; cby[i] = dx * k;
      }
      S.tweening = true;
    }

    function snap() {
      for (let i = 0; i < N; i++) PROPS.forEach(k => { cur[k][i] = to[k][i]; from[k][i] = to[k][i]; });
      S.tweening = false;
      for (let li = 0; li < labs.length; li++) { LB[li] = lbT[li]; LH[li] = lhT[li]; }
      const st = STEPS[S.step];
      S.fMap = st.map; S.fTime = st.time; S.fLines = S.step === STEP_TIME ? 1 : 0; S.drift = S.reduced ? 0 : st.drift;
      S.medianMix = S.step === STEP_FAMILIES ? 1 : 0; S.revealMix = S.step === STEP_ARC ? 1 : 0;
      S.sweep = S.step === STEP_TIME ? 1 : 0; S.sweepStart = -1;
    }

    function updateTweens(tNow) {
      let moving = false;
      for (let i = 0; i < N; i++) {
        const u = (tNow - t0[i]) / dur[i];
        if (u >= 1) {
          if (cur.x[i] !== to.x[i] || cur.y[i] !== to.y[i] || cur.a[i] !== to.a[i]) for (let p = 0; p < PROPS.length; p++) { const k = PROPS[p]; cur[k][i] = to[k][i]; }
          else { cur.g[i] = to.g[i]; cur.s[i] = to.s[i]; cur.m[i] = to.m[i]; cur.z[i] = to.z[i]; }
          continue;
        }
        moving = true;
        if (u <= 0) continue;
        const e = easeIO(u), bump = Math.sin(Math.PI * e);
        for (let p = 0; p < PROPS.length; p++) { const k = PROPS[p]; cur[k][i] = from[k][i] + (to[k][i] - from[k][i]) * e; }
        cur.x[i] += cbx[i] * bump; cur.y[i] += cby[i] * bump;
      }
      S.tweening = moving;
    }

    /* ---------------- scroll ---------------- */
    const cumK = []; { let c = 0; K.forEach(k => { cumK.push(c); c += k; }); cumK.push(c); }
    function readScroll() {
      const r = stepsEl.getBoundingClientRect(), H = S.H || 1;
      const lineY = S.offset + S.yr * H, pos = (lineY - r.top) / H;        // reading line, in stage heights from the top of the steps
      // rail progress: dot i is reached when box i's centre is on the reading line
      const centres = K.map((k, i) => cumK[i] + k / 2);
      let fp = 0;
      if (pos >= centres[STEP_N - 1]) fp = STEP_N - 1;
      else if (pos > centres[0]) for (let i = 0; i < STEP_N - 1; i++) if (pos <= centres[i + 1]) { fp = i + (pos - centres[i]) / (centres[i + 1] - centres[i]); break; }
      S.fp = fp;
      // scrub parameter: how far the active step's sticky card has travelled (0 at rest, 1 at release)
      const i = S.step;
      const travel = (K[i] - 1) * H;
      S.u = travel > 1 ? clamp((S.offset - (r.top + cumK[i] * H)) / travel, 0, 1) : 0;
      const pv = (fp / (STEP_N - 1)).toFixed(3);
      if (pv !== S.pv) { S.pv = pv; railEl.style.setProperty('--p', pv); }
    }

    /* ---------------- activation ---------------- */
    function setLive(msg) { if (liveEl) liveEl.textContent = msg; }

    function activate(i, force) {
      i = clamp(i | 0, 0, STEP_N - 1);
      if (i === S.step && !force) return;
      const prev = S.step;
      S.step = i;
      stage.setAttribute('data-step', String(i));
      stepEls.forEach((li, k) => li.classList.toggle('is-active', k === i));
      dots.forEach((d, k) => {
        if (k === i) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current');
        d.classList.toggle('is-done', k < i);
      });
      chipsEl.classList.toggle('is-on', STEPS[i].chips);
      chipsEl.querySelectorAll('button').forEach(b => { b.tabIndex = STEPS[i].chips ? 0 : -1; });
      keyEl.textContent = keys[i];
      keyEl.classList.toggle('is-on', !!keys[i]);
      fillTargets(i);
      startTween(prev, i);
      if (S.reduced) snap();
      S.u = 0; S.headShown = -2; S.rdKey = null;  // null, not '': forces the readout to re-evaluate (and hide) on every step change
      if (S.focus >= 0 && !interactive(S.focus)) setFocus(-1);
      if (S.hover >= 0 && !interactive(S.hover)) setHover(-1);
      kick();
    }

    function settle() {
      if (nav.target >= 0) return;
      const line = S.offset + S.yr * S.H;
      let pick = 0;
      for (let k = 0; k < STEP_N; k++) if (cards[k].getBoundingClientRect().top <= line) pick = k;
      activate(pick);
    }

    function observeSteps() {
      if (io) io.disconnect();
      if (!('IntersectionObserver' in window)) { settle(); return; }
      const line = Math.round(S.offset + S.yr * S.H), vh = window.innerHeight || (S.H + S.offset);
      const top = clamp(line, 0, vh - 8), bottom = Math.max(0, vh - top - 4);
      io = new IntersectionObserver(() => settle(), { root: null, rootMargin: '-' + top + 'px 0px -' + bottom + 'px 0px', threshold: 0 });
      cards.forEach(c => io.observe(c));
    }

    function goTo(i) {
      i = clamp(i | 0, 0, STEP_N - 1);
      const box = stepEls[i].getBoundingClientRect();
      const y = Math.max(0, Math.round((window.pageYOffset || 0) + box.top - S.offset));
      nav.target = i; nav.y = y; nav.t = now();
      activate(i);
      try { window.scrollTo({ top: y, behavior: S.reduced ? 'instant' : 'smooth' }); } catch (e) { window.scrollTo(0, y); }
      kick();
    }

    /* ---------------- interaction ---------------- */
    const hitR = i => Math.max(rc[i] + 8, S.phone ? 16 : 12);
    function interactive(i) { return ra[i] > 0.3; }

    function hitTest(x, y) {
      let best = -1, bd = 1e9;
      for (let i = 0; i < N; i++) {
        if (!interactive(i)) continue;
        const dx = rx[i] - x, dy = ry[i] - y, d = dx * dx + dy * dy, r = hitR(i);
        if (d <= r * r && d < bd) { bd = d; best = i; }
      }
      return best;
    }

    function tipHtml(i) {
      const s = stars[i];
      return '<span class="tour__tn">' + esc(s.name) + '</span>' +
        '<span class="tour__tm"><i style="background:' + s.hex + ';box-shadow:0 0 8px ' + s.hex + '"></i>' + esc(s.lab) + (s.released ? ' · ' + esc(monYear(s.released)) : '') + '</span>' +
        '<span class="tour__tv">' + esc(T.adoptLabel) + '<b>' + fmtNum(s.adopt) + '</b></span>';
    }
    function refreshTip() {
      const i = S.hover >= 0 ? S.hover : S.focus;
      if (i === S.tip) return;
      S.tip = i;
      if (i < 0) { tipEl.classList.remove('is-on'); return; }
      tipEl.innerHTML = tipHtml(i);
      tipSize.w = tipEl.offsetWidth || 180; tipSize.h = tipEl.offsetHeight || 70;
      tipEl.classList.add('is-on');
    }
    function placeTip() {
      if (S.tip < 0) return;
      const i = S.tip;
      let x = rx[i] + 16, y = ry[i] - tipSize.h - 12;
      if (x + tipSize.w > S.W - 8) x = rx[i] - tipSize.w - 16;
      if (y < 8) y = ry[i] + 16;
      x = clamp(x, 8, Math.max(8, S.W - tipSize.w - 8));
      y = clamp(y, 8, Math.max(8, S.H - tipSize.h - 8));
      tipEl.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
    }
    function setHover(i) {
      if (i === S.hover) return;
      S.hover = i;
      canvas.style.cursor = i >= 0 ? 'pointer' : '';
      refreshTip();
    }
    function setFocus(i, announce) {
      S.focus = i;
      refreshTip();
      if (announce && i >= 0) { const s = stars[i]; setLive(s.name + ', ' + s.lab + ', ' + T.adoptLabel.toLowerCase() + ' ' + fmtNum(s.adopt) + '.'); }
    }
    function openProfile(i) {
      if (i < 0) return;
      document.dispatchEvent(new CustomEvent('msb:open-profile', { detail: { id: stars[i].id } }));
    }
    function pointerHover() {
      if (!ptr.in) return;
      const r = canvas.getBoundingClientRect();
      setHover(hitTest(ptr.cx - r.left, ptr.cy - r.top));
    }

    function onPointerMove(e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      ptr.in = true; ptr.cx = e.clientX; ptr.cy = e.clientY;
      pointerHover(); kick();
    }
    function onPointerLeave() { ptr.in = false; setHover(-1); }
    function onClick(e) {
      const r = canvas.getBoundingClientRect();
      const i = hitTest(e.clientX - r.left, e.clientY - r.top);
      if (i >= 0) openProfile(i);
    }

    const order = []; labs.forEach(l => l.idx.forEach(i => order.push(i)));
    function onKey(e) {
      const keysNext = ['ArrowRight', 'ArrowDown'], keysPrev = ['ArrowLeft', 'ArrowUp'];
      const avail = order.filter(interactive);
      if (!avail.length) return;
      let k = avail.indexOf(S.focus);
      if (keysNext.includes(e.key)) k = k < 0 ? 0 : (k + 1) % avail.length;
      else if (keysPrev.includes(e.key)) k = k < 0 ? avail.length - 1 : (k - 1 + avail.length) % avail.length;
      else if (e.key === 'Home') k = 0;
      else if (e.key === 'End') k = avail.length - 1;
      else if ((e.key === 'Enter' || e.key === ' ') && S.focus >= 0) { e.preventDefault(); openProfile(S.focus); return; }
      else if (e.key === 'Escape') { setFocus(-1); return; }
      else return;
      e.preventDefault();
      setFocus(avail[k], true);
      kick();
    }
    function onFocus() {
      let vis = true;
      try { vis = canvas.matches(':focus-visible'); } catch (err) { vis = true; }
      if (vis && S.focus < 0) { const f = order.find(interactive); if (f !== undefined) setFocus(f, true); }
      kick();
    }
    function onBlur() { setFocus(-1); }

    /* ---------------- chips ---------------- */
    chipsEl.innerHTML =
      '<button type="button" class="tour__chip tour__chip--all" data-lab="-1" aria-pressed="true" style="--c:#E8C66A">All labs</button>' +
      labs.slice().sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).map(l =>
        '<button type="button" class="tour__chip" data-lab="' + l.li + '" aria-pressed="false" style="--c:' + l.hex + '"><i></i>' + esc(l.name) + ' <small>' + l.count + '</small></button>').join('');
    function selectLab(li) {
      S.sel = S.sel === li ? -1 : li;
      chipsEl.querySelectorAll('button').forEach(b => {
        const v = +b.getAttribute('data-lab');
        b.setAttribute('aria-pressed', String(S.sel === -1 ? v === -1 : v === S.sel));
      });
      if (S.step === STEP_TIME) {
        fillTargets(S.step);
        startTween(S.step, S.step, { fast: true });
        if (S.reduced) snap();
        S.rdKey = null;
        if (S.sel >= 0) { const l = labs[S.sel]; setLive(l.name + ': ' + l.count + ' releases, joined in date order.'); }
        kick();
      }
    }
    chipsEl.addEventListener('click', e => {
      const b = e.target.closest ? e.target.closest('button') : null;
      if (!b) return;
      const v = +b.getAttribute('data-lab');
      selectLab(v === -1 ? S.sel : v);          // "All labs" clears the current choice
    });
    dots.forEach(d => d.addEventListener('click', () => goTo(+d.getAttribute('data-i'))));

    /* ---------------- drawing ---------------- */
    function text(str, x, y, font, color, alpha, align, base, halo) {
      ctx.font = font; ctx.textAlign = align || 'left'; ctx.textBaseline = base || 'alphabetic';
      if (halo) { ctx.globalAlpha = alpha * 0.9; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(8,11,22,.9)'; ctx.strokeText(str, x, y); }
      ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.fillText(str, x, y);
    }

    function drawDust(t) {
      const W = S.W, H = S.H, sy = window.pageYOffset || 0;
      ctx.fillStyle = '#DDE4FF';
      for (let i = 0; i < dust.length; i++) {
        const d = dust[i];
        const y = (((d.v * H - sy * d.par) % H) + H) % H;
        const tw = S.reduced ? 1 : 0.75 + 0.25 * Math.sin(t * d.w + d.p);
        ctx.globalAlpha = d.a * tw;
        ctx.fillRect(d.u * W, y, d.r, d.r);
      }
    }

    function drawMap(t) {
      const f = S.fMap;
      if (f < 0.01) return;
      const { cx, cy, R, r0 } = G.map;
      // the well at the centre
      const wr = R * 0.62;
      ctx.globalAlpha = f; ctx.fillStyle = wellGrad; ctx.fillRect(cx - wr, cy - wr, 2 * wr, 2 * wr);
      // sector wedges (only the emphasised families are tinted)
      for (const l of labs) {
        if (LH[l.li] < 0.012) continue;
        ctx.globalAlpha = f * (0.012 + 0.09 * LH[l.li]);
        ctx.fillStyle = l.hex;
        ctx.beginPath(); ctx.arc(cx, cy, R, l.a0, l.a1); ctx.arc(cx, cy, r0, l.a1, l.a0, true); ctx.closePath(); ctx.fill();
      }
      // rings at scores 75, 50, 25; the rim is 0; the core ring is 100
      ctx.lineWidth = 1; ctx.strokeStyle = '#E9ECF5';
      [0.25, 0.5, 0.75].forEach(rho => { ctx.globalAlpha = f * 0.1; ctx.beginPath(); ctx.arc(cx, cy, r0 + (R - r0) * rho, 0, TAU); ctx.stroke(); });
      ctx.globalAlpha = f * 0.3; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#E8C66A'; ctx.globalAlpha = f * 0.42; ctx.beginPath(); ctx.arc(cx, cy, r0, 0, TAU); ctx.stroke();
      // sector separators
      ctx.strokeStyle = '#E9ECF5'; ctx.globalAlpha = f * 0.09; ctx.beginPath();
      labs.forEach(l => { const c = Math.cos(l.a0), s = Math.sin(l.a0); ctx.moveTo(cx + c * r0, cy + s * r0); ctx.lineTo(cx + c * (R + 6), cy + s * (R + 6)); });
      const lastA = labs[labs.length - 1].a1;
      ctx.moveTo(cx + Math.cos(lastA) * r0, cy + Math.sin(lastA) * r0); ctx.lineTo(cx + Math.cos(lastA) * (R + 6), cy + Math.sin(lastA) * (R + 6));
      ctx.stroke();
      // scale, read up the gutter at the top
      const sf = (S.phone ? 9.5 : 10.5) + 'px ' + FONT.mono, sc = rgbCss(INK3, 1);
      [[0, '100', -9], [0.25, '75', 0], [0.5, '50', 0], [0.75, '25', 0], [1, '0', 0]].forEach(([rho, lab, off]) => {
        const rr = r0 + (R - r0) * rho;
        text(lab, cx, cy - rr + off, sf, sc, f * 0.9, 'center', 'middle', true);
      });
      // the dashed median arc of each emphasised family
      if (S.medianMix > 0.02) {
        ctx.setLineDash([3, 4]); ctx.lineWidth = 1.2;
        for (const l of labs) {
          const h = LH[l.li] * S.medianMix; if (h < 0.02) continue;
          const rr = r0 + (R - r0) * (1 - l.median / 100);
          ctx.lineDashOffset = S.reduced ? 0 : -t * 5;
          ctx.strokeStyle = l.hex; ctx.globalAlpha = f * h * 0.8;
          ctx.beginPath(); ctx.arc(cx, cy, rr, l.a0 + 0.012, l.a1 - 0.012); ctx.stroke();
        }
        ctx.setLineDash([]); ctx.lineDashOffset = 0;
      }
      // lab names around the rim
      const fs = S.phone ? 11 : 12.5;
      for (const l of labs) {
        const b = l.lbl; if (!b) continue;
        const col = rgbCss(mixRgb(INK2, l.rgb, LH[l.li]), 1);
        const a = f * (0.25 + 0.75 * clamp(LB[l.li] / 0.95, 0, 1));
        if (b.push > 0) {
          ctx.strokeStyle = col; ctx.globalAlpha = a * 0.45; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(b.lx, b.ly); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
        text(l.name, b.x, b.y, '500 ' + fs + 'px ' + FONT.sans, col, a, b.align, b.base, true);
        const m = LH[l.li] * S.medianMix;
        if (m > 0.05) {
          const yy = b.base === 'bottom' ? b.y - fs * 1.3 : b.base === 'top' ? b.y + fs * 1.3 : b.y + fs * 0.8;
          text('median ' + l.median.toFixed(1), b.x, yy, '500 ' + (fs - 1.5) + 'px ' + FONT.mono, rgbCss(l.rgb, 1), f * m, b.align, b.base === 'bottom' ? 'bottom' : 'top', true);
        }
      }
    }

    function xOfDate(t) { return G.time.l + (t - G.time.d0) / (G.time.d1 - G.time.d0) * (G.time.r - G.time.l); }
    function drawTime() {
      const f = S.fTime;
      if (f < 0.01) return;
      const { l, r, t, b, d0, d1 } = G.time;
      ctx.lineWidth = 1; ctx.strokeStyle = '#E9ECF5';
      const gf = (S.phone ? 9.5 : 10.5) + 'px ' + FONT.mono, gc = rgbCss(INK3, 1);
      [0, 25, 50, 75, 100].forEach(v => {
        const y = b - v / 100 * (b - t);
        ctx.globalAlpha = f * (v === 0 ? 0.3 : 0.07);
        ctx.beginPath(); ctx.moveTo(l - 6, y); ctx.lineTo(r, y); ctx.stroke();
        text(String(v), l - 12, y, gf, gc, f * 0.9, 'right', 'middle', false);
      });
      // year ticks (and half-year ticks), from the data's own range
      if (T.tMin != null) {
        const y0 = new Date(d0).getUTCFullYear(), y1 = new Date(d1).getUTCFullYear();
        for (let y = y0; y <= y1; y++) {
          const x = xOfDate(Date.UTC(y, 0, 1));
          if (x >= l - 1 && x <= r + 1) {
            ctx.globalAlpha = f * 0.1; ctx.beginPath(); ctx.moveTo(x, t); ctx.lineTo(x, b + 6); ctx.stroke();
            text(String(y), x, b + 20, gf, gc, f * 0.95, 'center', 'alphabetic', false);
          }
          const xm = xOfDate(Date.UTC(y, 6, 1));
          if (xm > l && xm < r) { ctx.globalAlpha = f * 0.22; ctx.beginPath(); ctx.moveTo(xm, b); ctx.lineTo(xm, b + 4); ctx.stroke(); }
        }
      }
      text(T.adoptLabel + ' score', l - 12, t - 18, gf, gc, f * 0.9, 'left', 'alphabetic', false);
      if (T.undated) text(T.undated + (T.undated === 1 ? ' undated release is' : ' undated releases are') + ' left out', r, t - 18, gf, gc, f * 0.75, 'right', 'alphabetic', false);
    }

    // constellations (timeline) and the fading trail (Anthropic's arc)
    function drawLines(t) {
      if (S.fLines > 0.01) {
        const L = G.time, sx = lerp(L.l - 10, L.r + 14, S.sweep);
        ctx.save();
        ctx.beginPath(); ctx.rect(0, 0, sx, S.H); ctx.clip();
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        const hoverLab = S.tip >= 0 ? stars[S.tip].labIndex : -1;
        for (const l of labs) {
          const pts = l.dated;
          if (pts.length < 2) continue;
          let a = 0.17;
          if (S.sel >= 0) a = l.li === S.sel ? 0.9 : 0.05;
          else if (l.li === hoverLab) a = 0.75;
          ctx.strokeStyle = l.hex; ctx.lineWidth = l.li === S.sel ? 1.8 : l.li === hoverLab ? 1.5 : 1;
          ctx.globalAlpha = S.fLines * a;
          ctx.beginPath();
          pts.forEach((i, k) => { if (k) ctx.lineTo(rx[i], ry[i]); else ctx.moveTo(rx[i], ry[i]); });
          ctx.stroke();
        }
        ctx.restore();
        if (S.sweep < 0.995) {
          ctx.globalAlpha = S.fLines * 0.35; ctx.strokeStyle = '#E8C66A'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(sx, L.t - 8); ctx.lineTo(sx, L.b + 4); ctx.stroke();
        }
        const lab = S.sel >= 0 ? labs[S.sel] : S.tip >= 0 && S.sweep > 0.99 ? labs[hoverLab] : null;
        if (lab) {
          const d = lab.dated;
          if (d.length) { const i = d[d.length - 1]; text(lab.name, Math.min(rx[i] + 12, S.W - 6), ry[i] - 12, '500 12px ' + FONT.sans, lab.hex, S.fLines * (S.sel >= 0 ? 1 : 0.8), rx[i] + 12 > S.W - 90 ? 'right' : 'left', 'alphabetic', true); }
        }
      }
      if (anth && S.revealMix > 0.01 && S.fMap > 0.01) {
        const idx = anth.idx, head = S.rp;
        ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = anth.hex;
        for (let k = 1; k < idx.length; k++) {
          const g = lit[k]; if (g <= 0.001) continue;
          const a = idx[k - 1], b = idx[k];
          const age = Math.max(0, head - k - 1);
          const al = S.revealMix * Math.max(0.2, 1 - age / 6);
          const ex = rx[a] + (rx[b] - rx[a]) * g, ey = ry[a] + (ry[b] - ry[a]) * g;
          ctx.globalAlpha = al * 0.16; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(rx[a], ry[a]); ctx.lineTo(ex, ey); ctx.stroke();
          ctx.globalAlpha = al * 0.85; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(rx[a], ry[a]); ctx.lineTo(ex, ey); ctx.stroke();
        }
      }
    }

    function drawStars(t, dt) {
      const W = S.W;
      // glow pass (additive)
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < N; i++) {
        const a = ra[i]; if (a < 0.012) continue;
        const bump = i === S.hover || i === S.focus ? 1.3 : 1;
        ctx.globalAlpha = Math.min(1, a * rtw[i] * (0.18 + 0.52 * cur.g[i]) * bump);
        const r = rg[i] * bump;
        ctx.drawImage(sprites[stars[i].labIndex], rx[i] - r, ry[i] - r, 2 * r, 2 * r);
      }
      ctx.globalCompositeOperation = 'source-over';
      // core pass
      for (let i = 0; i < N; i++) {
        const a = ra[i]; if (a < 0.012) continue;
        const sp = cur.s[i], core = stars[i].core, r = rc[i];
        ctx.fillStyle = core;
        const ca = Math.min(1, a * (0.84 + 0.16 * rtw[i]));
        if (sp < 0.02) {
          ctx.globalAlpha = ca; ctx.beginPath(); ctx.arc(rx[i], ry[i], r, 0, TAU); ctx.fill();
        } else {
          if (sp < 0.98) { ctx.globalAlpha = ca * (1 - sp) * (1 - sp); ctx.beginPath(); ctx.arc(rx[i], ry[i], r * (1 - 0.3 * sp), 0, TAU); ctx.fill(); }
          if (!S.reduced) phase[i] += orbitDir[i] * omega[i] * (0.8 + 0.9 * S.uS) * dt / 1000;
          const sepScale = S.step === STEP_PAIRS ? 0.55 + 0.45 * sstep(S.uS) : 1;
          const sep = (r * 2.5 + 3) * sp * sepScale, c = Math.cos(phase[i]), s = Math.sin(phase[i]);
          ctx.globalAlpha = ca * sp * 0.22; ctx.strokeStyle = stars[i].hex; ctx.lineWidth = 0.7;
          ctx.beginPath(); ctx.arc(rx[i], ry[i], sep * 0.375, 0, TAU); ctx.moveTo(rx[i] + sep * 0.625, ry[i]); ctx.arc(rx[i], ry[i], sep * 0.625, 0, TAU); ctx.stroke();
          ctx.globalAlpha = ca * sp;
          ctx.beginPath(); ctx.arc(rx[i] - c * sep * 0.375, ry[i] - s * sep * 0.375, r * 0.82, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.arc(rx[i] + c * sep * 0.625, ry[i] + s * sep * 0.625, r * 0.6, 0, TAU); ctx.fill();
        }
      }
      // diffraction spikes on the brightest
      ctx.lineWidth = 0.8;
      for (let i = 0; i < N; i++) {
        const g = cur.g[i], a = ra[i];
        if (g < 0.6 || a < 0.3 || rc[i] < 2.1 || cur.s[i] > 0.4) continue;
        const L = rg[i] * 0.62;
        ctx.strokeStyle = stars[i].hex; ctx.globalAlpha = Math.min(1, a * (g - 0.5) * 0.8 * rtw[i]);
        ctx.beginPath(); ctx.moveTo(rx[i] - L, ry[i]); ctx.lineTo(rx[i] + L, ry[i]); ctx.moveTo(rx[i], ry[i] - L); ctx.lineTo(rx[i], ry[i] + L); ctx.stroke();
      }
      // markers: exactly-zero rings, the arc's head, hover and keyboard focus
      for (let i = 0; i < N; i++) {
        const m = cur.m[i];
        if (m > 0.02 && ra[i] > 0.05) {
          ctx.strokeStyle = '#E9ECF5'; ctx.lineWidth = 1; ctx.globalAlpha = 0.6 * m * ra[i];
          ctx.setLineDash([2, 3]); ctx.lineDashOffset = S.reduced ? 0 : -t * 6;
          ctx.beginPath(); ctx.arc(rx[i], ry[i], rc[i] + 5.5, 0, TAU); ctx.stroke();
          ctx.setLineDash([]); ctx.lineDashOffset = 0;
        }
      }
      if (anth && S.revealMix > 0.05 && S.step === STEP_ARC && S.headIdx >= 0) {
        const i = anth.idx[S.headIdx], p = S.reduced ? 0.5 : 0.5 + 0.5 * Math.sin(t * 3.2);
        ctx.strokeStyle = anth.hex; ctx.lineWidth = 1.2; ctx.globalAlpha = (0.9 - 0.4 * p) * S.revealMix;
        ctx.beginPath(); ctx.arc(rx[i], ry[i], rc[i] + 4 + 4 * p, 0, TAU); ctx.stroke();
      }
      [[S.hover, '#F4DD9C', false], [S.focus, '#E8C66A', true]].forEach(([i, col, ticks]) => {
        if (i < 0 || ra[i] < 0.05) return;
        ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.globalAlpha = 0.95;
        const r = rc[i] + 6;
        ctx.beginPath(); ctx.arc(rx[i], ry[i], r, 0, TAU); ctx.stroke();
        if (ticks) {
          ctx.beginPath();
          for (let k = 0; k < 4; k++) { const c = Math.cos(k * Math.PI / 2), s = Math.sin(k * Math.PI / 2); ctx.moveTo(rx[i] + c * (r + 2), ry[i] + s * (r + 2)); ctx.lineTo(rx[i] + c * (r + 7), ry[i] + s * (r + 7)); }
          ctx.stroke();
        }
      });
      ctx.globalAlpha = 1;
    }

    function computeStars(t, dt) {
      // Anthropic's arc reveal: scroll position decides how many releases are lit
      const K_ = anth ? anth.count : 0;
      S.rp = 0; S.headIdx = -1;
      if (anth) {
        const rp = S.reduced ? K_ : clamp(0.06 + S.uS / 0.9 * 0.94, 0, 1) * K_;
        S.rp = rp;
        for (let k = 0; k < K_; k++) lit[k] = sstep(clamp(rp - k, 0, 1));
        S.headIdx = rp > 0.05 ? Math.min(K_ - 1, Math.max(0, Math.ceil(rp - 1e-3) - 1)) : -1;
      }
      const dr = S.drift * (S.phone ? 0.75 : 1);
      for (let i = 0; i < N; i++) {
        const s = stars[i];
        let x = cur.x[i], y = cur.y[i];
        if (dr > 0.002) { x += dr * dA[i] * Math.sin(t * dw1[i] + dp1[i]); y += dr * dA[i] * Math.cos(t * dw2[i] + dp2[i]); }
        let vis = 1;
        if (anth && s.labIndex === anthLi && S.revealMix > 0.001) {
          const k = anth.idx.indexOf(i);
          vis = lerp(1, GHOST + (1 - GHOST) * lit[k], S.revealMix);
        }
        rx[i] = x; ry[i] = y;
        rc[i] = sizeBase[i] * cur.z[i];
        rg[i] = rc[i] * (1.7 + 4.9 * cur.g[i]) * (S.phone ? 0.68 : 1);
        ra[i] = clamp(cur.a[i] * vis, 0, 1);
        rtw[i] = S.reduced ? 1 : 1 + 0.12 * Math.sin(t * tw1[i] + tp[i]);
      }
    }

    function updateReadout() {
      let key = '', a = '', b = '';
      if (S.step === STEP_ARC && anth && S.headIdx >= 0) {
        const s = stars[anth.idx[S.headIdx]];
        key = 'arc:' + S.headIdx;
        a = monYear(s.released) || '—';
        b = '<b>' + esc(s.name) + '</b> · ' + esc(T.adoptLabel) + ' ' + fmtNum(s.adopt);
      } else if (S.step === STEP_TIME && S.sel >= 0) {
        const l = labs[S.sel], d = l.idx.map(i => stars[i]).filter(s => s.t != null);
        key = 'lab:' + S.sel;
        a = l.name;
        if (d.length > 1) b = d.length + ' releases · <b>' + fmtNum(d[0].adopt) + '</b> (' + esc(monYear(d[0].released)) + ') to <b>' + fmtNum(d[d.length - 1].adopt) + '</b> (' + esc(monYear(d[d.length - 1].released)) + ')';
        else b = l.count + (l.count === 1 ? ' release' : ' releases');
      }
      if (key === S.rdKey) return;
      S.rdKey = key;
      readEl.classList.toggle('is-on', !!key);
      if (key) { rdA.textContent = a; rdA.style.color = S.step === STEP_TIME ? labs[S.sel].hex : ''; rdB.innerHTML = b; }
    }

    /* ---------------- frame loop ---------------- */
    function smoothAll(dt, tNow) {
      const st = STEPS[S.step];
      if (S.reduced) {
        S.fMap = st.map; S.fTime = st.time; S.fLines = S.step === STEP_TIME ? 1 : 0; S.drift = 0;
        S.medianMix = S.step === STEP_FAMILIES ? 1 : 0; S.revealMix = S.step === STEP_ARC ? 1 : 0; S.sweep = S.step === STEP_TIME ? 1 : 0;
        S.uS = 1;
        for (let li = 0; li < labs.length; li++) { LB[li] = lbT[li]; LH[li] = lhT[li]; }
        return;
      }
      S.fMap = damp(S.fMap, st.map, dt, 280);
      S.fTime = damp(S.fTime, st.time, dt, 280);
      S.fLines = damp(S.fLines, S.step === STEP_TIME ? 1 : 0, dt, 360);
      S.drift = damp(S.drift, st.drift, dt, 500);
      S.medianMix = damp(S.medianMix, S.step === STEP_FAMILIES ? 1 : 0, dt, 360);
      S.revealMix = damp(S.revealMix, S.step === STEP_ARC ? 1 : 0, dt, 420);
      S.uS = damp(S.uS, S.step === STEP_PAIRS || S.step === STEP_ARC ? S.u : S.step > STEP_ARC ? 1 : S.uS, dt, 140);
      for (let li = 0; li < labs.length; li++) { LB[li] = damp(LB[li], lbT[li], dt, 300); LH[li] = damp(LH[li], lhT[li], dt, 300); }
      if (S.step === STEP_TIME) {
        if (S.sweepStart < 0) S.sweepStart = tNow;
        S.sweep = easeOut(clamp((tNow - S.sweepStart - 500) / 1700, 0, 1));
      } else if (S.fLines < 0.02) { S.sweep = 0; S.sweepStart = -1; }
    }

    function render(tNow, dt) {
      if (!ctx) return;
      const t = tNow / 1000;
      ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, S.W, S.H);
      drawDust(t);
      computeStars(t, dt);
      drawMap(t);
      drawTime();
      drawLines(t);
      drawStars(t, dt);
      ctx.globalAlpha = 1;
    }

    function frame(tNow) {
      raf = 0;
      if (!S.running) return;
      const dt = clamp(tNow - S.last, 0, 64); S.last = tNow;
      readScroll();
      if (nav.target >= 0 && (Math.abs((window.pageYOffset || 0) - nav.y) < 2 || tNow - nav.t > 2600)) { nav.target = -1; settle(); }
      updateTweens(tNow);
      smoothAll(dt, tNow);
      render(tNow, dt);
      pointerHover();
      refreshTip(); placeTip(); updateReadout();
      if (!S.reduced || S.tweening) schedule();
      else S.running = false;
    }
    function schedule() { if (!raf) raf = requestAnimationFrame(frame); }
    function kick() {
      if (!S.visible || document.hidden) return;
      S.running = true; S.last = now();
      schedule();
    }
    function stop() { S.running = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }

    /* ---------------- events ---------------- */
    function onResize(force) {
      resizeRaf = 0;
      if (force !== true && stage.clientWidth === S.W && stage.clientHeight === S.H && detectOffset() === S.offset) { observeSteps(); return; }
      layout();
      fillTargets(S.step);
      snap();
      observeSteps();
      kick();
      if (!S.running && ctx) { readScroll(); render(now(), 16); }
    }
    function queueResize() { if (!resizeRaf) resizeRaf = requestAnimationFrame(onResize); }
    function onScroll() {
      if (S.visible) kick();
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(settle, 140);             // safety net for long jumps
    }
    function onVisibility() { if (document.hidden) stop(); else kick(); }
    const cancelNav = () => { nav.target = -1; };
    function onMotionChange(e) {
      S.reduced = e.matches;
      fillTargets(S.step); snap();
      kick();
    }

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('keydown', onKey);
    canvas.addEventListener('focus', onFocus);
    canvas.addEventListener('blur', onBlur);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', queueResize);
    window.addEventListener('wheel', cancelNav, { passive: true });
    window.addEventListener('touchstart', cancelNav, { passive: true });
    window.addEventListener('keydown', cancelNav);
    document.addEventListener('visibilitychange', onVisibility);
    let mq = null;
    if (window.matchMedia) {
      mq = matchMedia('(prefers-reduced-motion: reduce)');
      if (mq.addEventListener) mq.addEventListener('change', onMotionChange); else if (mq.addListener) mq.addListener(onMotionChange);
    }
    if ('ResizeObserver' in window) { ro = new ResizeObserver(queueResize); ro.observe(stage); }
    if ('IntersectionObserver' in window) {
      vio = new IntersectionObserver(es => {
        const was = S.visible;
        S.visible = es.some(e => e.isIntersecting);
        if (S.visible && !was) kick(); else if (!S.visible) stop();
      }, { threshold: 0 });
      vio.observe(el);
    } else S.visible = true;
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (ctx) onResize(true); });

    /* ---------------- start ---------------- */
    layout();
    fillTargets(0);
    snap();
    keyEl.textContent = keys[0]; keyEl.classList.add('is-on');
    stepEls[0].classList.add('is-active');
    dots[0].setAttribute('aria-current', 'step');
    chipsEl.querySelectorAll('button').forEach(b => { b.tabIndex = -1; });
    observeSteps();
    settle();
    if (ctx) { readScroll(); render(now(), 16); }
    kick();

    function destroy() {
      stop();
      if (io) io.disconnect(); if (ro) ro.disconnect(); if (vio) vio.disconnect();
      clearTimeout(scrollTimer);
      window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', queueResize);
      window.removeEventListener('wheel', cancelNav); window.removeEventListener('touchstart', cancelNav); window.removeEventListener('keydown', cancelNav);
      document.removeEventListener('visibilitychange', onVisibility);
      if (mq) { if (mq.removeEventListener) mq.removeEventListener('change', onMotionChange); else if (mq.removeListener) mq.removeListener(onMotionChange); }
      delete el.__msbTour;
    }

    return {
      go: i => { cancelNav(); activate(i); },          // jump straight to a step's layout (no scrolling)
      goTo,                                            // scroll to a step, as the rail does
      selectLab,
      destroy,
      /* read-only view for tests and debugging */
      debug: () => ({
        N, step: S.step, stars, labs, G, S, copy, keys, T,
        cur, to, rx, ry, ra, rc, POS, LB, LH,
        tweening: S.tweening
      })
    };
  }

  /* ====================================================================
     public API
     ==================================================================== */
  function init(el) {
    if (!el) return null;
    if (el.__msbTour) return el.__msbTour;
    const D = window.MSB_DATA;
    if (!D || !Array.isArray(D.models) || !D.models.length) {
      if (window.console) console.warn('[MSBTour] window.MSB_DATA is missing or empty; the tour was not built.');
      return null;
    }
    const inst = build(el, D);
    el.__msbTour = inst;
    return inst;
  }

  window.MSBTour = { init, __ready: true };

  function auto() {
    const el = document.getElementById('tour');
    if (!el) return;
    if (window.MSB_DATA) { init(el); return; }
    // the data script may be deferred: try once more when everything has loaded
    window.addEventListener('load', () => init(el), { once: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto);
  else auto();
})();
