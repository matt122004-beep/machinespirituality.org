/* Header menu and model search, shared by every page.
   Menu: below 1181px the header links collapse behind the Menu button; on phones (≤700px) the menu opens as a full-height pane
   (2026-10-30, Matthew: "the mobile version lacks a navigation pane"; the bottom tab bar stays).
   Search (2026-10-30, Matthew: "our website also lacks a search bar to help users quickly find a model"): a header button, "/" or
   Ctrl/Cmd+K opens a box that finds a model or lab by name or common alias and opens its page. The index is data/search-index.js
   (window.MSB_SEARCH), written by tools/build-discovery.py from the model and lab pages themselves. */
(function () {
  const top = document.querySelector('.top'), btn = document.querySelector('.navbtn'), nav = document.getElementById('primary-nav');
  if (!top || !btn || !nav) return;
  const root = document.documentElement;
  const PHONE = window.matchMedia('(max-width: 700px)');
  const page = (location.pathname.split('/').pop() || 'index.html').replace(/\?.*$/, '') || 'index.html';
  const label = btn.querySelector('.navbtn__t');

  /* ---------------- menu ---------------- */
  // Pages that have no link in the header row; they are listed at the end of the collapsed menu only (hidden in the wide header).
  [['compare.html', 'Compare models'], ['results.html', 'All results and downloads'], ['contact.html', 'Contact']].forEach(([href, t]) => {
    if (nav.querySelector(`a[href^="${href}"]`)) return;
    const a = document.createElement('a');
    a.href = href; a.className = 'nav__x'; a.textContent = t;
    if (href === page) a.setAttribute('aria-current', 'page');
    nav.appendChild(a);
  });
  btn.setAttribute('aria-label', 'Menu');
  const set = open => {
    top.classList.toggle('is-open', open);
    root.classList.toggle('menu-open', open && PHONE.matches);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
    if (label) label.textContent = open ? 'Close' : 'Menu';
  };
  btn.addEventListener('click', () => set(!top.classList.contains('is-open')));
  nav.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && top.classList.contains('is-open')) { set(false); btn.focus(); } });
  document.addEventListener('click', e => { if (top.classList.contains('is-open') && !top.contains(e.target)) set(false); });
  const wide = window.matchMedia('(min-width: 1181px)');
  const onWide = e => { if (e.matches) set(false); };
  if (wide.addEventListener) wide.addEventListener('change', onWide); else if (wide.addListener) wide.addListener(onWide);

  /* ---------------- search ---------------- */
  const ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m15.3 15.3 5.2 5.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const sb = document.createElement('button');
  sb.type = 'button'; sb.className = 'srchbtn';
  sb.setAttribute('aria-label', 'Search models'); sb.setAttribute('aria-haspopup', 'dialog');
  sb.title = 'Search models (shortcut: /)';
  sb.innerHTML = ICON + '<span class="srchbtn__t">Search</span>';
  nav.after(sb);

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
  const compact = s => norm(s).replace(/[^a-z0-9]+/g, '');
  const words = s => norm(s).split(/[^a-z0-9]+/).filter(Boolean);
  const isNum = w => /^\d+$/.test(w);
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const EXAMPLES = ['Opus 4.5', 'GPT-OSS', 'Qwen 3.5', 'Gemini', 'Grok', 'Mistral'];
  const MAX = 10;

  // How well one name (or alias) matches the query: 100 exact; 70-85 every word found (numbers must match whole, so "opus 4" is not "Opus 4.5");
  // 55-80 the typed letters run inside the name ("gptoss" in "GPT-OSS 120B"). A number that runs on into another digit scores lower.
  function nameScore(s, qc, qt) {
    const c = compact(s);
    if (!c) return 0;
    if (c === qc) return 100;
    let best = 0;
    const i = c.indexOf(qc);
    if (i >= 0) {
      const runOn = /\d$/.test(qc) && /^\d/.test(c.slice(i + qc.length));
      best = i === 0 ? (runOn ? 55 : 80) : (runOn ? 40 : 65);
    }
    const st = words(s);
    if (qt.length && qt.every(w => st.some(x => isNum(w) ? x === w : x.startsWith(w)))) {
      const nums = st.filter(isNum), unmatched = nums.filter(n => !qt.includes(n)).length;
      best = Math.max(best, unmatched ? 70 : 85);
    }
    return best;
  }
  function score(e, qc, qt) {
    let s = 0;
    for (const n of [e.n, ...(e.a || [])]) s = Math.max(s, nameScore(n, qc, qt));
    if (!s && e.l && e.t !== 'l') { const lc = compact(e.l); if (lc.startsWith(qc) && qc.length >= 2) s = 30; }   // "anthropic" also lists the lab's models
    return s;
  }
  function find(q) {
    const data = window.MSB_SEARCH;
    if (!data) return null;
    const qc = compact(q), qt = words(q);
    if (!qc) return [];
    return data.items.map(e => [score(e, qc, qt), e]).filter(x => x[0] > 0)
      .sort((a, b) => b[0] - a[0] || (a[1].t === 'l') - (b[1].t === 'l') || String(b[1].d || '').localeCompare(String(a[1].d || '')) || a[1].n.localeCompare(b[1].n))
      .slice(0, MAX).map(x => x[1]);
  }

  let dlg = null, input, list, note, results = [], active = 0, loading = false;
  function loadIndex(then) {
    if (window.MSB_SEARCH || loading) return;
    loading = true;   // pages built before the search existed: fetch the index on first use
    const s = document.createElement('script');
    s.src = 'data/search-index.js';
    s.onload = () => { loading = false; then(); };
    s.onerror = () => { loading = false; };
    document.head.appendChild(s);
  }
  function build() {
    dlg = document.createElement('dialog');
    dlg.className = 'srch';
    dlg.setAttribute('aria-label', 'Search models and labs');
    dlg.innerHTML = `<div class="srch__panel"><div class="srch__box">${ICON}
      <input class="srch__in" type="search" placeholder="Search models and labs" aria-label="Search models and labs" autocomplete="off" autocapitalize="off" spellcheck="false"
        role="combobox" aria-expanded="false" aria-controls="srch-list" aria-autocomplete="list">
      <button type="button" class="srch__x"><span class="srch__esc">Esc</span><span class="srch__cancel">Cancel</span></button></div>
      <ul class="srch__list" id="srch-list" role="listbox" aria-label="Matching models and labs"></ul>
      <div class="srch__note" aria-live="polite"></div></div>`;
    document.body.appendChild(dlg);
    input = dlg.querySelector('.srch__in'); list = dlg.querySelector('.srch__list'); note = dlg.querySelector('.srch__note');
    dlg.querySelector('.srch__x').addEventListener('click', close);
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    dlg.addEventListener('close', () => root.classList.remove('lock'));
    input.addEventListener('input', render);
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!results.length) return;
        active = (active + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
        mark();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const r = results[active] || results[0];
        if (r) location.href = r.h;
      }
    });
    note.addEventListener('click', e => {
      const b = e.target.closest('button[data-q]');
      if (!b) return;
      input.value = b.dataset.q; render(); input.focus();
    });
    list.addEventListener('mousemove', e => {
      const li = e.target.closest('li[data-i]');
      if (li && +li.dataset.i !== active) { active = +li.dataset.i; mark(); }
    });
  }
  function mark() {
    list.querySelectorAll('li').forEach((li, i) => {
      const on = i === active;
      li.classList.toggle('on', on);
      li.setAttribute('aria-selected', String(on));
      if (on) { input.setAttribute('aria-activedescendant', li.id); li.scrollIntoView({ block: 'nearest' }); }
    });
  }
  function meta(e) {
    if (e.t === 'l') return 'Lab' + (e.k ? ` · ${e.k} model${e.k === 1 ? '' : 's'}` : '');
    const d = e.d ? `${MON[+e.d.slice(5, 7) - 1]} ${e.d.slice(0, 4)}` : '';
    return [e.l, d].filter(Boolean).join(' · ');
  }
  function render() {
    const q = input.value.trim();
    const found = find(q);
    if (found === null) { list.innerHTML = ''; note.textContent = 'Loading…'; loadIndex(render); return; }
    results = found; active = 0;
    input.setAttribute('aria-expanded', String(results.length > 0));
    list.innerHTML = results.map((e, i) => `<li id="srch-o${i}" role="option" data-i="${i}" aria-selected="false"><a href="${esc(e.h)}" tabindex="-1">
      <span class="srch__dot${e.t === 'l' ? ' srch__dot--lab' : ''}" style="--c:${esc(e.c || '#9AA3BD')}" aria-hidden="true"></span>
      <span class="srch__n">${esc(e.n)}</span><span class="srch__m">${esc(meta(e))}</span></a></li>`).join('');
    if (!q) note.innerHTML = 'Find a model by name, for example ' + EXAMPLES.map(x => `<button type="button" data-q="${esc(x)}">${esc(x)}</button>`).join(' ');
    else if (!results.length) note.innerHTML = `No model or lab matches “${esc(q)}”. <a href="models.html">See every model →</a>`;
    else note.textContent = '';
    mark();
  }
  function open(prefill) {
    if (!dlg) build();
    set(false);
    if (typeof prefill === 'string') input.value = prefill;
    render();
    if (!dlg.open) dlg.showModal();
    root.classList.add('lock');
    input.focus();
    input.select();
  }
  function close() { if (dlg && dlg.open) dlg.close(); }
  sb.addEventListener('click', () => open());
  document.addEventListener('keydown', e => {
    if (dlg && dlg.open) return;
    const typing = e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]');
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); open(); }
    else if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); open(); }
  });
  window.MSBSearch = { open, close };
})();
