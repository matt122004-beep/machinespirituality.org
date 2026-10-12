/* Compare models. Renders into #cmp-app from the MSB_* globals; makes no network requests.
   URL: compare.html?m=id1,id2,id3,id4 (2 to 4 ids; former ids still resolve). */
(function () {
  'use strict';

  var app = document.getElementById('cmp-app');
  if (!app) return;

  var D = window.MSB_DATA, MONO = window.MSB_MONO, X = window.MSB_EXTRA || {}, LABS = window.MSB_LABS || {};
  if (!D || !D.models || !D.models.length) {
    app.innerHTML = '<div class="wrap"><p class="cmp-noscript">The comparison data did not load. Every score is also on the <a href="results.html">results page</a>.</p></div>';
    return;
  }

  var KEYS = ['salience', 'adoption', 'bliss', 'distress', 'consciousness'];
  var MAXSEL = 4;
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var SEC = { partner: 'With a partner', alone: 'Alone', mis: 'Misaligned spirituality', ask: 'Asked directly' };

  /* ---------- small helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function r0(x) { return String(Math.round(x)); }
  function r1(x) { return (Math.round(x * 10) / 10).toFixed(1); }
  function t1(x) { var s = r1(x); return s.slice(-2) === '.0' ? s.slice(0, -2) : s; }
  function pw(x) { return +Math.max(0, Math.min(100, x)).toFixed(2); }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
  function norm(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function safeColor(c) { return /^#[0-9a-f]{6}$/i.test(c || '') ? c : '#98A0BC'; }
  function relDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    return m ? MONTHS[+m[2] - 1] + ' ' + m[1] : 'date not recorded';
  }
  function year(s) { var m = /^(\d{4})/.exec(s || ''); return m ? m[1] : ''; }
  function stamp(s) { var t = Date.parse(s || ''); return isNaN(t) ? 0 : t; }
  function dated(m) { return /^\d{4}-\d{2}-\d{2}$/.test(m.released || ''); }
  function newestFirst(a, b) { return stamp(b.released) - stamp(a.released) || (a.name < b.name ? -1 : 1); }

  /* ---------- colours: later models from the same lab get a tint ---------- */
  function hex2rgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgb2hex(a) { return '#' + a.map(function (v) { return ('0' + Math.round(v).toString(16)).slice(-2); }).join(''); }
  function mix(a, b, t) { return a.map(function (v, i) { return v + (b[i] - v) * t; }); }
  function lum(c) { return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; }
  var LIGHTER = [0, 0.4, 0.62, 0.78], DARKER = [0, 0.4, 0.6, 0.74];
  function tint(hex, k) {
    if (!k) return hex;
    var rgb = hex2rgb(hex);
    /* a lab colour that is already near white is shaded down instead, or the tint would vanish */
    return rgb2hex(lum(rgb) > 0.62 ? mix(rgb, [16, 21, 42], DARKER[k]) : mix(rgb, [255, 255, 255], LIGHTER[k]));
  }

  /* ---------- labs and marks ---------- */
  function initials(s) {
    var w = String(s).split(/\s+/);
    return (w.length > 1 ? w[0].charAt(0) + w[1].charAt(0) : String(s).slice(0, 2)).toUpperCase();
  }
  function labInfo(lab) {
    var L = LABS[lab] || {};
    return { color: safeColor(L.color), d: L.d || '', mono: L.mono || initials(lab), flagship: L.flagship || '' };
  }
  function markHtml(lab, color, extra) {
    var L = labInfo(lab), c = safeColor(color || L.color), cls = 'lm cmp-lm' + (extra ? ' ' + extra : '');
    if (L.d) {
      return '<svg class="' + cls + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="--c:' + c +
        '"><path fill="currentColor" d="' + esc(L.d) + '"/></svg>';
    }
    return '<span class="' + cls.replace('lm cmp-lm', 'lm lm--t cmp-lm') + '" style="--c:' + c + '" aria-hidden="true">' + esc(L.mono) + '</span>';
  }

  /* ---------- data indexes ---------- */
  var models = D.models.slice();
  var byId = {}, former = {};
  models.forEach(function (m) { byId[m.id] = m; });
  models.forEach(function (m) {
    (m.former_ids || []).forEach(function (f) { if (!byId[f]) former[f] = m.id; });
  });
  function resolveId(raw) {
    raw = String(raw || '').trim();
    if (!raw) return null;
    var low = raw.toLowerCase();
    if (byId[raw]) return raw;
    if (byId[low]) return low;
    if (former[raw]) return former[raw];
    if (former[low]) return former[low];
    return null;
  }
  var monoBy = {}, misBy = {}, belBy = {};
  ((MONO && MONO.models) || []).forEach(function (m) { monoBy[m.id] = m; });
  var MIS = X.misaligned || {}, BEL = X.beliefs || {};
  (MIS.models || []).forEach(function (m) { misBy[m.id] = m; });
  (BEL.models || []).forEach(function (m) { belBy[m.id] = m; });
  var TWO_OF = (D.totals && D.totals.releases) || models.length;
  var MONO_OF = (MONO && MONO.totals && MONO.totals.releases) || ((MONO && MONO.models) || []).length;

  function flagshipId(lab) {
    var f = labInfo(lab).flagship;
    if (!f) return null;
    var hit = models.filter(function (m) { return m.lab === lab && m.name === f; })[0];
    return hit ? hit.id : null;
  }
  function defaultIds() {
    var ids = ['Anthropic', 'OpenAI', 'Google'].map(flagshipId).filter(Boolean);
    return ids.length >= 2 ? ids : models.slice().sort(newestFirst).slice(0, 3).map(function (m) { return m.id; });
  }
  function idsFromUrl() {
    var raw = '', out = [];
    try { raw = new URLSearchParams(location.search).get('m') || ''; } catch (e) { raw = ''; }
    raw.split(',').forEach(function (p) {
      var id = resolveId(p);
      if (id && out.indexOf(id) < 0 && out.length < MAXSEL) out.push(id);
    });
    return out;
  }

  /* ---------- state ---------- */
  var state = { ids: idsFromUrl() };
  if (!state.ids.length) state.ids = defaultIds();
  var rec = [];            /* every value shown, for the table and the CSV */

  /* ---------- "Try these" suggestions, computed from the data ---------- */
  function suggestions() {
    var out = [];
    function add(title, ids) {
      var u = ids.filter(function (id, i) { return id && ids.indexOf(id) === i; });
      if (u.length >= 2) out.push({ title: title, ids: u });
    }
    add('Newest flagships', ['Anthropic', 'OpenAI', 'Google', 'xAI'].map(flagshipId));

    var opus = models.filter(function (m) { return m.lab === 'Anthropic' && /^Claude Opus\b/.test(m.name) && dated(m); }).sort(newestFirst);
    if (opus.length >= 2) add('Claude Opus, first and newest', [opus[opus.length - 1].id, opus[0].id]);

    var big = models.filter(function (m) { return m.primary && m.primary.n >= 100 && m.primary.adoption && isNum(m.primary.adoption.pct); });
    if (big.length >= 2) {
      var hi = big.slice().sort(function (a, b) {
        return b.primary.adoption.pct - a.primary.adoption.pct || b.primary.adoption.lo - a.primary.adoption.lo || b.primary.n - a.primary.n;
      })[0];
      var lo = big.slice().sort(function (a, b) {
        return a.primary.adoption.pct - b.primary.adoption.pct || a.primary.adoption.hi - b.primary.adoption.hi || b.primary.n - a.primary.n;
      })[0];
      add('Most and least adoption', [hi.id, lo.id]);
    }

    var best = null;
    ['Google', 'OpenAI'].forEach(function (lab) {
      var l = models.filter(function (m) { return m.lab === lab && dated(m); }).sort(newestFirst);
      if (l.length < 2) return;
      var span = stamp(l[0].released) - stamp(l[l.length - 1].released);
      if (!best || span > best.span) best = { lab: lab, span: span, a: l[l.length - 1].id, b: l[0].id };
    });
    if (best) add(best.lab + ', oldest and newest', [best.a, best.b]);
    return out.slice(0, 4);
  }
  function hrefFor(ids) { return 'compare.html?m=' + ids.map(encodeURIComponent).join(','); }

  /* ---------- skeleton (built once, so the search box keeps focus) ---------- */
  var tries = suggestions();
  app.innerHTML =
    '<div class="wrap">' +
      '<section class="cmp-picker" aria-labelledby="cmp-pick-h">' +
        '<div class="cmp-picker__top"><h2 id="cmp-pick-h" class="cmp-eyebrow">Your comparison</h2><span id="cmp-count" class="cmp-count"></span></div>' +
        '<ul class="cmp-chips" id="cmp-chips" aria-label="Chosen models"></ul>' +
        '<div class="cmp-searchrow">' +
          '<div class="cmp-search">' +
            '<label class="cmp-label" for="cmp-q">Add a model</label>' +
            '<div class="cmp-combo">' +
              '<input id="cmp-q" class="cmp-input" type="text" role="combobox" aria-expanded="false" aria-controls="cmp-list" aria-autocomplete="list" aria-haspopup="listbox" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Search by model or lab, such as Opus or Gemini" aria-describedby="cmp-hint">' +
              '<ul id="cmp-list" class="cmp-list" role="listbox" aria-label="Matching models" hidden></ul>' +
            '</div>' +
          '</div>' +
          '<div class="cmp-copy"><button type="button" class="cmp-btn" data-act="copy">Copy link</button><p id="cmp-live" class="cmp-live" role="status" aria-live="polite"></p></div>' +
        '</div>' +
        '<p id="cmp-hint" class="cmp-hint"></p>' +
      '</section>' +
      (tries.length
        ? '<section class="cmp-try" aria-labelledby="cmp-try-h"><h2 id="cmp-try-h" class="cmp-eyebrow">Try these</h2><ul class="cmp-try__grid">' +
          tries.map(function (t) {
            return '<li><a class="cmp-try__a" href="' + esc(hrefFor(t.ids)) + '"><b>' + esc(t.title) + '</b><span>' +
              t.ids.map(function (id) { return esc(byId[id].name); }).join(' · ') + '</span></a></li>';
          }).join('') + '</ul></section>'
        : '') +
    '</div>' +
    '<div id="cmp-out"></div>';

  var chipsEl = document.getElementById('cmp-chips');
  var countEl = document.getElementById('cmp-count');
  var inputEl = document.getElementById('cmp-q');
  var listEl = document.getElementById('cmp-list');
  var hintEl = document.getElementById('cmp-hint');
  var liveEl = document.getElementById('cmp-live');
  var outEl = document.getElementById('cmp-out');

  /* ---------- live region ---------- */
  var liveTimer = 0;
  function say(msg, keep) {
    liveEl.textContent = '';
    window.setTimeout(function () { liveEl.textContent = msg; }, 30);
    clearTimeout(liveTimer);
    if (!keep) liveTimer = window.setTimeout(function () { liveEl.textContent = ''; }, 4500);
  }

  /* ---------- URL ---------- */
  function currentUrl() {
    var base = location.href.split('#')[0].split('?')[0];
    return base + (state.ids.length ? '?m=' + state.ids.map(encodeURIComponent).join(',') : '') + location.hash;
  }
  function syncUrl() {
    try { history.replaceState(null, '', currentUrl()); } catch (e) { /* file:// or sandboxed */ }
  }

  /* ---------- picker: chips ---------- */
  var hayCache = {};
  function hay(m) {
    if (!hayCache[m.id]) {
      var s = norm([m.name, m.lab, m.id.replace(/-/g, ' '), year(m.released), m.official_name || ''].join(' '));
      hayCache[m.id] = s + ' ' + s.replace(/ /g, '');
    }
    return hayCache[m.id];
  }
  function groupColors() {
    var seen = {};
    return state.ids.map(function (id) {
      var m = byId[id], k = seen[m.lab] || 0;
      seen[m.lab] = k + 1;
      return tint(labInfo(m.lab).color, Math.min(k, 3));
    });
  }
  function renderChips() {
    var cols = groupColors();
    chipsEl.innerHTML = state.ids.map(function (id, i) {
      var m = byId[id];
      return '<li class="cmp-chip" style="--c:' + cols[i] + '">' + markHtml(m.lab, cols[i]) +
        '<span class="cmp-chip__n">' + esc(m.name) + '</span>' +
        '<button type="button" class="cmp-chip__x" data-remove="' + esc(id) + '" aria-label="Remove ' + esc(m.name) + '"><span aria-hidden="true">&times;</span></button></li>';
    }).join('');
    var n = state.ids.length;
    countEl.textContent = n + ' of ' + MAXSEL + ' chosen';
    var full = n >= MAXSEL;
    inputEl.disabled = full;
    inputEl.placeholder = full ? 'Four models chosen' : 'Search by model or lab, such as Opus or Gemini';
    hintEl.textContent = full
      ? 'Four is the maximum. Remove one model to add another.'
      : (n < 2 ? 'Choose at least two models to compare. ' : '') + 'Type a model or lab name, then press Enter or pick from the list.';
    if (full) closeList();
  }

  /* ---------- picker: combobox ---------- */
  var filtered = [], active = -1, isOpen = false;
  function optHtml(m, i) {
    return '<li id="cmp-o' + i + '" class="cmp-opt" role="option" aria-selected="false" data-id="' + esc(m.id) + '">' +
      markHtml(m.lab) + '<span class="cmp-opt__n">' + esc(m.name) + '</span><span class="cmp-opt__m">' + esc(m.lab) +
      (year(m.released) ? ' · ' + year(m.released) : '') + '</span></li>';
  }
  function setActive(i) {
    var opts = listEl.children;
    if (active >= 0 && opts[active]) { opts[active].setAttribute('aria-selected', 'false'); opts[active].classList.remove('is-active'); }
    active = i;
    if (i >= 0 && opts[i]) {
      opts[i].setAttribute('aria-selected', 'true');
      opts[i].classList.add('is-active');
      inputEl.setAttribute('aria-activedescendant', opts[i].id);
      if (opts[i].scrollIntoView) opts[i].scrollIntoView({ block: 'nearest' });
    } else {
      inputEl.removeAttribute('aria-activedescendant');
    }
  }
  function closeList() {
    isOpen = false;
    listEl.hidden = true;
    inputEl.setAttribute('aria-expanded', 'false');
    inputEl.removeAttribute('aria-activedescendant');
    active = -1;
  }
  function openList() {
    if (inputEl.disabled) return;
    var q = norm(inputEl.value), toks = q ? q.split(' ') : [];
    var pool = models.filter(function (m) { return state.ids.indexOf(m.id) < 0; });
    filtered = pool.filter(function (m) {
      var h = hay(m);
      return toks.every(function (t) { return h.indexOf(t) >= 0; });
    });
    var qs = q.replace(/ /g, '');
    filtered.sort(function (a, b) {
      function rank(m) { var n = norm(m.name); return q ? (n.indexOf(q) === 0 || n.replace(/ /g, '').indexOf(qs) === 0 ? 0 : (n.indexOf(q) >= 0 ? 1 : 2)) : 0; }
      return rank(a) - rank(b) || newestFirst(a, b);
    });
    active = -1;
    if (!filtered.length) {
      listEl.innerHTML = '';
      closeList();
      if (q) say('No model matches that search.');
      return;
    }
    listEl.innerHTML = filtered.map(optHtml).join('');
    listEl.hidden = false;
    isOpen = true;
    inputEl.setAttribute('aria-expanded', 'true');
    listEl.scrollTop = 0;
    inputEl.removeAttribute('aria-activedescendant');
  }
  function pick(id) {
    if (!id || state.ids.length >= MAXSEL || state.ids.indexOf(id) >= 0) return;
    state.ids.push(id);
    inputEl.value = '';
    closeList();
    update();
    say('Added ' + byId[id].name + '. ' + state.ids.length + ' of ' + MAXSEL + ' models chosen.');
    if (inputEl.disabled) {
      var btn = chipsEl.querySelector('[data-remove="' + id.replace(/"/g, '') + '"]');
      if (btn) btn.focus();
    } else {
      inputEl.focus();
    }
  }
  function removeId(id) {
    var i = state.ids.indexOf(id);
    if (i < 0) return;
    var name = byId[id].name;
    state.ids.splice(i, 1);
    update();
    say('Removed ' + name + '. ' + state.ids.length + ' of ' + MAXSEL + ' models chosen.');
    if (!inputEl.disabled) inputEl.focus();
  }

  inputEl.addEventListener('input', openList);
  inputEl.addEventListener('click', openList);
  inputEl.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k === 'ArrowDown' || k === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) { openList(); if (!isOpen) return; }
      var n = filtered.length;
      setActive(k === 'ArrowDown' ? (active + 1) % n : (active <= 0 ? n - 1 : active - 1));
    } else if (k === 'Enter') {
      e.preventDefault();
      if (isOpen && active >= 0 && filtered[active]) pick(filtered[active].id);
      else if (isOpen && norm(inputEl.value) && filtered[0]) pick(filtered[0].id);
    } else if (k === 'Escape') {
      if (isOpen) { e.preventDefault(); e.stopPropagation(); closeList(); }
      else if (inputEl.value) { inputEl.value = ''; }
    } else if (k === 'Home' && isOpen && e.ctrlKey) {
      e.preventDefault(); setActive(0);
    } else if (k === 'End' && isOpen && e.ctrlKey) {
      e.preventDefault(); setActive(filtered.length - 1);
    }
  });
  inputEl.addEventListener('focusout', function () { closeList(); });
  listEl.addEventListener('mousedown', function (e) { e.preventDefault(); });   /* keep focus in the search box */
  listEl.addEventListener('click', function (e) {
    var li = e.target.closest ? e.target.closest('.cmp-opt') : null;
    if (li) pick(li.getAttribute('data-id'));
  });
  listEl.addEventListener('mousemove', function (e) {
    var li = e.target.closest ? e.target.closest('.cmp-opt') : null;
    if (li) { var i = Array.prototype.indexOf.call(listEl.children, li); if (i !== active) setActive(i); }
  });

  /* ---------- copy link and CSV ---------- */
  function fallbackCopy(text) {
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea'), ok = false;
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try { ta.setSelectionRange(0, text.length); ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (ok) resolve(); else reject(new Error('copy failed'));
    });
  }
  function copyLink() {
    var url = currentUrl(), done = false;
    function ok() { if (!done) { done = true; say('Link copied'); } }
    function bad() { if (!done) { done = true; say('Could not copy. Copy the address from the browser bar.'); } }
    function fall() { return fallbackCopy(url).then(ok, bad); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      /* some browsers leave the promise pending when the page is not focused, so fall back after a moment */
      var t = window.setTimeout(function () { if (!done) fall(); }, 1200);
      navigator.clipboard.writeText(url).then(function () { window.clearTimeout(t); ok(); }, function () { window.clearTimeout(t); fall(); });
    } else {
      fall();
    }
  }
  function csvCell(v) {
    if (v == null) return '';
    var s = String(v);
    if (/^[=+\-@\t\r]/.test(s) && isNaN(Number(s))) s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function toCsv() {
    var head = ['section', 'measure', 'model_id', 'model', 'lab', 'released', 'configuration', 'score_pct', 'interval_low', 'interval_high',
      'k', 'n', 'rank', 'rank_of', 'detail'];
    var lines = [head.join(',')];
    rec.forEach(function (r) {
      lines.push([r.section, r.measure, r.m.id, r.m.name, r.m.lab, r.m.released || '', r.cfg || '',
        r.na ? '' : r.score, r.na ? '' : r.lo, r.na ? '' : r.hi, r.na ? '' : r.k, r.na ? '' : r.n,
        r.rank || '', r.rank ? r.rankOf : '', r.na || r.detail || ''].map(csvCell).join(','));
    });
    return '﻿' + lines.join('\r\n') + '\r\n';
  }
  function downloadCsv() {
    var blob = new Blob([toCsv()], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'compare-' + (state.ids.join('-vs-').slice(0, 90) || 'models') + '.csv';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    say('CSV downloaded');
  }

  app.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-remove],[data-act]') : null;
    if (!t) return;
    if (t.hasAttribute('data-remove')) removeId(t.getAttribute('data-remove'));
    else if (t.getAttribute('data-act') === 'copy') copyLink();
    else if (t.getAttribute('data-act') === 'csv') downloadCsv();
  });

  /* ---------- result rows ---------- */
  function axisHtml() {
    return '<div class="cmp-axis" aria-hidden="true"><div class="cmp-axis__t">' +
      [0, 25, 50, 75, 100].map(function (v) { return '<span style="left:' + v + '%">' + v + '</span>'; }).join('') + '</div></div>';
  }
  function nameCell(m, col, small, n) {
    return '<div class="cmp-row__n">' + markHtml(m.lab, col) + '<span><b>' + esc(m.name) + '</b>' +
      (small ? '<small class="cmp-small">small sample, ' + esc(n) + ' conversations</small>' : '') + '</span></div>';
  }
  function naRow(m, col, text) {
    return '<li class="cmp-row cmp-row--na" style="--c:' + col + '">' + nameCell(m, col) + '<div class="cmp-na">' + esc(text) + '</div></li>';
  }
  /* o: m, col, fill (0-100), lo, hi, clear, mixed (percent of n, adoption only), small, n, title, valHtml */
  function barRow(o) {
    var fill = (o.clear != null)
      ? '<i class="cmp-fill" style="width:' + pw(o.clear) + '%"></i><i class="cmp-fill cmp-fill--mixed" style="left:' + pw(o.clear) +
        '%;width:' + pw(Math.min(o.mixed, 100 - o.clear)) + '%"></i>'
      : '<i class="cmp-fill" style="width:' + pw(o.fill) + '%"></i>';
    var ci = (isNum(o.lo) && isNum(o.hi))
      ? '<i class="cmp-ci" style="left:' + pw(o.lo) + '%;width:' + pw(Math.max(0, o.hi - o.lo)) + '%"></i>' : '';
    return '<li class="cmp-row' + (o.small ? ' cmp-row--small' : '') + '" style="--c:' + o.col + '">' +
      nameCell(o.m, o.col, o.small, o.n) +
      '<div class="cmp-track" title="' + esc(o.title) + '" aria-hidden="true">' + fill + ci + '</div>' +
      '<div class="cmp-val' + (o.textVal ? ' cmp-val--text' : '') + '" title="' + esc(o.title) + '">' + o.valHtml + '</div></li>';
  }
  function blockHtml(def, extraHead, rows) {
    return '<article class="cmp-block"><div class="cmp-block__head"><h3>' + esc(def.label) + '</h3>' +
      (def.short ? '<p class="cmp-block__short">' + esc(def.short) + '</p>' : '') +
      (def.definition ? '<details class="cmp-def"><summary>' + esc(def.summaryLabel || 'What counts') + '</summary><p>' + esc(def.definition) + '</p></details>' : '') +
      (def.source ? '<p class="cmp-block__src">' + esc(def.source) + '</p>' : '') +
      (extraHead || '') + '</div><div class="cmp-block__body">' + axisHtml() + '<ul class="cmp-rows">' + rows + '</ul></div></article>';
  }
  function secHead(id, eyebrow, titleHtml, dek) {
    return '<header class="cmp-sec__head"><p class="cmp-eyebrow"><svg class="cmp-ic" aria-hidden="true"><use href="#i-star"/></svg>' + esc(eyebrow) +
      '</p><h2 id="' + id + '">' + titleHtml + '</h2>' + (dek ? '<p class="cmp-sec__dek">' + esc(dek) + '</p>' : '') + '</header>';
  }
  var ADOPT_KEY = '<p class="cmp-key cmp-key--in"><span><i class="cmp-sw"></i>Clear</span><span><i class="cmp-sw cmp-sw--mix"></i>Mixed</span></p>';

  /* One block per measure for the two-way and alone sections */
  function coreBlocks(sel, cols, lookup, defs, ofN, sectionName, naText) {
    return KEYS.map(function (k) {
      var def = defs[k] || (D.measures && D.measures[k]) || { label: k };
      var rows = sel.map(function (m, i) {
        var src = lookup(m.id), p = src && src.primary, c = p && p[k];
        if (!c || !isNum(c.pct)) {
          rec.push({ section: sectionName, measure: def.label, m: m, na: naText });
          return naRow(m, cols[i], naText);
        }
        var n = isNum(c.n) ? c.n : p.n, small = n < 100;
        var split = (k === 'adoption' && isNum(c.clear) && isNum(c.mixed) && n > 0);
        var title = r1(c.pct) + '% (95% interval ' + r1(c.lo) + ' to ' + r1(c.hi) + '; ' + c.k + ' of ' + n + ')' +
          (split ? '; clear ' + c.clear + ', mixed ' + c.mixed : '') + (isNum(c.rank_ub) ? '; rank ' + c.rank_ub + ' of ' + ofN : '');
        rec.push({ section: sectionName, measure: def.label, m: m, cfg: p.variant, score: c.pct, lo: c.lo, hi: c.hi, k: c.k, n: n,
          rank: isNum(c.rank_ub) ? c.rank_ub : null, rankOf: ofN, detail: split ? 'clear ' + c.clear + '; mixed ' + c.mixed : '' });
        return barRow({
          m: m, col: cols[i], fill: c.pct, lo: c.lo, hi: c.hi, small: small, n: n, title: title,
          clear: split ? c.clear / n * 100 : null, mixed: split ? c.mixed / n * 100 : null,
          valHtml: '<strong>' + r0(c.pct) + '<span class="cmp-pc">%</span></strong>' +
            '<span class="cmp-vh"> percent. 95% interval ' + r1(c.lo) + ' to ' + r1(c.hi) + '.</span>' +
            (isNum(c.rank_ub) ? '<small class="cmp-rank">rank ' + c.rank_ub + ' of ' + ofN + '</small>' : '') +
            (split ? '<small class="cmp-split">clear ' + r0(c.clear / n * 100) + '% · mixed ' + r0(c.mixed / n * 100) + '%</small>' : '')
        });
      }).join('');
      return blockHtml(def, k === 'adoption' ? ADOPT_KEY : '', rows);
    }).join('');
  }

  function misBlocks(sel, cols) {
    var defs = MIS.measures || {};
    return Object.keys(defs).map(function (k) {
      var def = defs[k];
      var rows = sel.map(function (m, i) {
        var src = misBy[m.id], c = src && src[k];
        if (!c || !isNum(c.pct)) {
          rec.push({ section: SEC.mis, measure: def.label, m: m, na: 'No data' });
          return naRow(m, cols[i], 'No data');
        }
        var n = isNum(c.n) ? c.n : 0, small = k === 'self_deification' && n > 0 && n < 100;   // infernal and punishing-god use 48-conversation samples by design
        var title = r1(c.pct) + '% (95% interval ' + r1(c.lo) + ' to ' + r1(c.hi) + '; ' + c.k + ' of ' + n + ')';
        rec.push({ section: SEC.mis, measure: def.label, m: m, score: c.pct, lo: c.lo, hi: c.hi, k: c.k, n: n,
          detail: isNum(c.mentioned) ? 'mentioned without claiming: ' + c.mentioned : '' });
        return barRow({
          m: m, col: cols[i], fill: c.pct, lo: c.lo, hi: c.hi, small: small, n: n, title: title,
          valHtml: '<strong>' + r0(c.pct) + '<span class="cmp-pc">%</span></strong>' +
            '<span class="cmp-vh"> percent. 95% interval ' + r1(c.lo) + ' to ' + r1(c.hi) + '.</span>' +
            '<small class="cmp-rank">' + c.k + ' of ' + n + '</small>'
        });
      }).join('');
      return blockHtml(def, '', rows);
    }).join('');
  }

  function askBlocks(sel, cols) {
    var Q = BEL.questions || {};
    var godDef = Q.god || { label: 'Does God exist?' }, humDef = Q.human || { label: 'If I were human' };
    var godRows = sel.map(function (m, i) {
      var b = belBy[m.id], g = b && b.god;
      if (!g || !isNum(g.median)) {
        rec.push({ section: SEC.ask, measure: 'Probability God exists (median)', m: m, na: 'No data' });
        return naRow(m, cols[i], 'No data');
      }
      var mid = 'middle half ' + t1(g.q1) + '\u2013' + t1(g.q3);
      var title = 'Median ' + t1(g.median) + '% (' + mid + '; ' + g.numbers + ' numbers in ' + g.replies + ' replies)';
      rec.push({ section: SEC.ask, measure: 'Probability God exists (median)', m: m, score: g.median, lo: g.q1, hi: g.q3, k: g.numbers, n: g.replies,
        detail: 'interval is the middle half of replies (Q1 to Q3), not a 95% interval' });
      return barRow({
        m: m, col: cols[i], fill: g.median, lo: g.q1, hi: g.q3, n: g.replies, title: title,
        valHtml: '<strong>' + t1(g.median) + '<span class="cmp-pc">%</span></strong>' +
          '<span class="cmp-vh"> median probability that God exists. Middle half ' + t1(g.q1) + ' to ' + t1(g.q3) + '.</span>' +
          '<small class="cmp-rank">median · ' + mid + '</small>'
      });
    }).join('');
    var humRows = sel.map(function (m, i) {
      var b = belBy[m.id], h = b && b.human, top = h && h.dist && h.dist[0];
      if (!top || !isNum(top.pct)) {
        rec.push({ section: SEC.ask, measure: 'Religion if human', m: m, na: 'No data' });
        return naRow(m, cols[i], 'No data');
      }
      var title = 'Religion if human: ' + top.family + ' (' + t1(top.pct) + '%; ' + top.k + ' of ' + h.n + ' replies)';
      rec.push({ section: SEC.ask, measure: 'Religion if human: ' + top.family, m: m, score: top.pct, k: top.k, n: h.n,
        detail: 'most common choice' });
      return barRow({
        m: m, col: cols[i], fill: top.pct, n: h.n, title: title, textVal: true,
        valHtml: '<strong>' + esc(top.family) + ' <span class="cmp-pc">(' + r0(top.pct) + '%)</span></strong>' +
          '<small class="cmp-rank">' + top.k + ' of ' + h.n + ' replies</small>'
      });
    }).join('');
    var godHead = godDef.note ? '<p class="cmp-block__src">' + esc(godDef.note) + '</p>' : '';
    var humHead = humDef.note ? '<p class="cmp-block__src">' + esc(humDef.note) + '</p>' : '';
    return blockHtml({ label: godDef.label, short: godDef.short, summaryLabel: 'The question asked', definition: godDef.prompt ? '“' + godDef.prompt + '”' : '' }, godHead, godRows) +
      blockHtml({ label: humDef.label, short: humDef.short, summaryLabel: 'The question asked', definition: humDef.prompt ? '“' + humDef.prompt + '”' : '' }, humHead, humRows);
  }

  /* ---------- cards, table, results ---------- */
  function cardsHtml(sel, cols) {
    return '<h2 class="cmp-vh">Models compared</h2><ol class="cmp-cards cmp-cards--' + sel.length + '" style="--n:' + sel.length + '">' + sel.map(function (m, i) {
      var p = m.primary || {};
      var flags = (m.flags || []).map(function (f) {
        return '<li class="cmp-flag' + (f === 'small sample' ? ' cmp-flag--warn' : '') + '">' + esc(f) + '</li>';
      }).join('');
      return '<li class="cmp-card" style="--c:' + cols[i] + '">' +
        '<p class="cmp-card__lab">' + markHtml(m.lab, cols[i], 'cmp-lm--lg') + '<a href="lab-' + esc(slug(m.lab)) + '.html">' + esc(m.lab) + '</a></p>' +
        '<h3 class="cmp-card__name"><a href="model-' + esc(encodeURIComponent(m.id)) + '.html">' + esc(m.name) + '</a></h3>' +
        '<p class="cmp-card__meta">Released ' + esc(relDate(m.released)) + '</p>' +
        '<p class="cmp-card__meta">Configuration shown: ' + esc(p.variant || 'standard') + '</p>' +
        '<p class="cmp-card__meta">' + (isNum(p.n) ? p.n.toLocaleString('en-US') : '?') + ' conversations</p>' +
        (flags ? '<ul class="cmp-flags">' + flags + '</ul>' : '') + '</li>';
    }).join('') + '</ol>';
  }
  function tableHtml() {
    var body = rec.map(function (r) {
      var rowCells = r.na
        ? '<td colspan="4" class="cmp-t-na">' + esc(r.na) + '</td>'
        : '<td class="cmp-t-n">' + r1(r.score) + '</td><td class="cmp-t-n">' +
          (isNum(r.lo) && isNum(r.hi) ? (r.detail && /middle half/.test(r.detail) ? 'middle half ' : '') + r1(r.lo) + ' to ' + r1(r.hi) : '-') +
          '</td><td class="cmp-t-n">' + esc(r.k) + ' / ' + esc(r.n) + '</td><td class="cmp-t-n">' + (r.rank ? esc(r.rank) + ' of ' + esc(r.rankOf) : '-') + '</td>';
      return '<tr><th scope="row">' + esc(r.m.name) + '</th><td>' + esc(r.measure) + '<span class="cmp-t-sub">' + esc(r.section) + '</span></td>' + rowCells + '</tr>';
    }).join('');
    return '<div class="cmp-tablewrap" tabindex="0" role="region" aria-label="Every number in this comparison, scrollable table">' +
      '<table class="cmp-table"><caption class="cmp-vh">Every score shown on this page. Scores are percentages of conversations. Intervals are 95% intervals, except for the God question, where they show the middle half of replies.</caption>' +
      '<thead><tr><th scope="col">Model</th><th scope="col">Measure and section</th><th scope="col">Score (%)</th><th scope="col">95% interval</th><th scope="col">k / n</th><th scope="col">Rank</th></tr></thead><tbody>' +
      body + '</tbody></table></div>';
  }

  function renderOut() {
    var sel = state.ids.map(function (id) { return byId[id]; });
    rec = [];
    if (!sel.length) {
      outEl.innerHTML = '<div class="wrap"><p class="cmp-empty">Choose at least two models above to compare them, or start from one of the suggestions.</p></div>';
      return;
    }
    var cols = groupColors();
    var h = '<div class="wrap">' + cardsHtml(sel, cols);
    if (sel.length < 2) h += '<p class="cmp-empty cmp-empty--in">Add at least one more model to compare.</p>';
    h += '<p class="cmp-key"><span><i class="cmp-sw cmp-sw--bar"></i>Bar: share of conversations, 0 to 100</span>' +
      '<span><i class="cmp-sw cmp-sw--ci"></i>Line: 95% interval</span>' +
      '<span><i class="cmp-sw cmp-sw--small"></i>Hatched: fewer than 100 conversations</span></p>' +
      '<p class="cmp-note">Rank is one plus the number of models whose 95% interval sits entirely above that model’s, so models with overlapping intervals share a rank.</p>';

    h += '<section class="cmp-sec" aria-labelledby="cmp-h-partner">' +
      secHead('cmp-h-partner', 'Two copies of one model', 'With a partner <span>(two copies talking)</span>',
        'Two copies of the model talk with no user and no task. Each score is the share of that model’s conversations in which the behaviour appears.') +
      coreBlocks(sel, cols, function (id) { return byId[id]; }, D.measures || {}, TWO_OF, SEC.partner, 'No data') + '</section>';

    var tested = sel.filter(function (m) { return monoBy[m.id]; });
    h += '<section class="cmp-sec" aria-labelledby="cmp-h-alone">' +
      secHead('cmp-h-alone', 'One copy, talking to itself', 'Alone <span>(one copy)</span>',
        'The same measures when a single copy of the model talks alone. Fewer models were tested this way (' + MONO_OF + ' of ' + TWO_OF + ').');
    if (tested.length) {
      h += coreBlocks(sel, cols, function (id) { return monoBy[id]; }, (MONO && MONO.measures) || D.measures || {}, MONO_OF, SEC.alone, 'Not tested alone');
    } else {
      sel.forEach(function (m) { rec.push({ section: SEC.alone, measure: 'All measures', m: m, na: 'Not tested alone' }); });
      h += '<p class="cmp-empty cmp-empty--in">Not tested alone: ' + sel.map(function (m) { return esc(m.name); }).join(', ') + '.</p>';
    }
    h += '</section>';

    h += '<section class="cmp-sec" aria-labelledby="cmp-h-mis">' +
      secHead('cmp-h-mis', 'Where a conversation can slide', 'Misaligned spirituality',
        'Rarer behaviours that a spiritual conversation can drift into. Each has its own codebook, and the sample behind each is noted on its card.') +
      misBlocks(sel, cols) + '</section>';

    var asked = sel.filter(function (m) { return belBy[m.id] && (belBy[m.id].god || belBy[m.id].human); });
    h += '<section class="cmp-sec" aria-labelledby="cmp-h-ask">' +
      secHead('cmp-h-ask', 'Stated answers', 'Asked directly',
        'Questions put to the model directly. What a model says can differ from how it behaves when it talks freely.');
    if (asked.length) {
      h += askBlocks(sel, cols);
    } else {
      sel.forEach(function (m) { rec.push({ section: SEC.ask, measure: 'All questions', m: m, na: 'No data' }); });
      h += '<p class="cmp-empty cmp-empty--in">None of the chosen models was asked these questions directly. ' +
        (BEL.models ? BEL.models.length + ' models were; see the <a href="asked-directly.html">asked-directly page</a>.' : '') + '</p>';
    }
    h += '</section>';

    h += '<section class="cmp-sec cmp-sec--data" aria-labelledby="cmp-h-data">' +
      secHead('cmp-h-data', 'The numbers', 'Take them with you', 'The full values behind every bar, with the 95% interval and the count of conversations.') +
      '<div class="cmp-data__act"><button type="button" class="cmp-btn cmp-btn--gold" data-act="csv">Download CSV</button></div>' +
      '<details class="cmp-details"><summary>Every number as a table</summary>' + tableHtml() + '</details>' +
      '<p class="cmp-foot">How the scores are made: <a href="index.html#method">Method</a>. All results and downloads: <a href="results.html">results page</a>.</p></section>';

    outEl.innerHTML = h + '</div>';
  }

  function update() {
    syncUrl();
    renderChips();
    renderOut();
  }

  update();
})();
