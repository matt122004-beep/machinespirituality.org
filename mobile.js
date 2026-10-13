/* Phone layer, shared by every page: an app-style tab bar at the bottom, a "More" sheet, bottom sheets that
   close with a downward swipe, and a Sky Tour shortcut in the header. It does nothing above 700px wide. */
(function () {
  const PHONE = window.matchMedia('(max-width: 700px)');
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)');
  const page = (location.pathname.split('/').pop() || 'index.html').replace(/\?.*$/, '') || 'index.html';
  const onHome = page === 'index.html' || page === '';
  const home = onHome ? '' : 'index.html';

  const I = {
    home: '<path d="M12 3.2 13.9 10.1 20.8 12 13.9 13.9 12 20.8 10.1 13.9 3.2 12 10.1 10.1Z" fill="currentColor"/>',
    talk: '<path d="M4.5 5.5h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9l-3.5 3v-3h-1a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M18.5 9.5h1a2 2 0 0 1 2 2v4.5a2 2 0 0 1-2 2h-.5v2.5l-3-2.5h-3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>',
    rank: '<path d="M4 20V13M9.3 20V8M14.7 20v-9.5M20 20V4.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    orbit: '<ellipse cx="12" cy="12" rx="9" ry="4.2" transform="rotate(-28 12 12)" fill="none" stroke="currentColor" stroke-width="1.6"/><ellipse cx="12" cy="12" rx="9" ry="4.2" transform="rotate(28 12 12)" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="2.1" fill="currentColor"/>',
    more: '<circle cx="5.5" cy="12" r="1.9" fill="currentColor"/><circle cx="12" cy="12" r="1.9" fill="currentColor"/><circle cx="18.5" cy="12" r="1.9" fill="currentColor"/>',
    tour: '<path d="M12 2.5 14.2 9.8 21.5 12 14.2 14.2 12 21.5 9.8 14.2 2.5 12 9.8 9.8Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
    time: '<circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 7.2V12l3.4 2.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    method: '<path d="M6 3.5h8.5L19 8v12.5H6Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 12h7M9 15.5h7M9 8.5h3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    table: '<rect x="3.5" y="4.5" width="17" height="15" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10" stroke="currentColor" stroke-width="1.6"/>',
    person: '<circle cx="12" cy="8.5" r="3.8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4.5 20.5c1.2-3.9 4-5.8 7.5-5.8s6.3 1.9 7.5 5.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m4 6.5 8 6.2 8-6.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
    chev: '<path d="m9 5.5 6.5 6.5L9 18.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  };
  const svg = (k, cls) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"${cls ? ` class="${cls}"` : ''}>${I[k]}</svg>`;

  /* ---------------- bottom sheets ---------------- */
  // A <dialog> holding a panel that slides up from the bottom. Close by the button, the backdrop, Escape,
  // or by pulling the panel down. Other scripts use window.MSBSheet.open({ title, build(body), onClose }).
  let sheet = null, sheetOpts = null;
  function ensureSheet() {
    if (sheet) return sheet;
    sheet = document.createElement('dialog');
    sheet.className = 'msheet';
    sheet.setAttribute('aria-labelledby', 'msheet-t');
    sheet.innerHTML = `<div class="msheet__panel"><div class="msheet__grab" aria-hidden="true"></div>
      <div class="msheet__head"><h2 id="msheet-t"></h2><button type="button" class="msheet__x">Done</button></div>
      <div class="msheet__body"></div></div>`;
    document.body.appendChild(sheet);
    sheet.querySelector('.msheet__x').addEventListener('click', closeSheet);
    sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });
    sheet.addEventListener('cancel', e => { e.preventDefault(); closeSheet(); });
    pullToClose(sheet.querySelector('.msheet__panel'), sheet.querySelector('.msheet__body'), closeSheet);
    return sheet;
  }
  function openSheet(opts) {
    const d = ensureSheet();
    sheetOpts = opts || {};
    d.querySelector('#msheet-t').textContent = sheetOpts.title || '';
    const body = d.querySelector('.msheet__body');
    body.innerHTML = ''; body.scrollTop = 0;
    if (sheetOpts.build) sheetOpts.build(body);
    if (!d.open) d.showModal();
    document.documentElement.classList.add('sheet-lock');
    requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add('open')));
  }
  function closeSheet() {
    const d = sheet;
    if (!d || !d.open) return;
    d.classList.remove('open');
    const done = () => { if (d.open) d.close(); document.documentElement.classList.remove('sheet-lock'); const o = sheetOpts; sheetOpts = null; if (o && o.onClose) o.onClose(); };
    if (RM.matches) done(); else setTimeout(done, 260);
  }
  window.MSBSheet = { open: openSheet, close: closeSheet };

  // Pull a panel down to dismiss it, the way phone sheets behave. Only starts when its scroller is at the top.
  function pullToClose(panel, scroller, close) {
    let y0 = null, x0 = 0, dy = 0, t0 = 0, active = false;
    panel.addEventListener('touchstart', e => {
      if (!PHONE.matches || e.touches.length !== 1) return;
      if (scroller && scroller.scrollTop > 0 && scroller.contains(e.target)) return;
      if (e.target.closest('input, select, textarea, .hscroll, .bc-legend, .barview__legend')) return;
      y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; dy = 0; t0 = Date.now(); active = false;
    }, { passive: true });
    panel.addEventListener('touchmove', e => {
      if (y0 == null) return;
      const d = e.touches[0].clientY - y0, dx = Math.abs(e.touches[0].clientX - x0);
      if (!active) { if (d > 8 && d > dx * 1.2) active = true; else if (d < -4 || dx > 12) { y0 = null; return; } else return; }
      dy = Math.max(0, d);
      panel.style.transition = 'none';
      panel.style.transform = `translateY(${dy}px)`;
      if (e.cancelable) e.preventDefault();
    }, { passive: false });
    const end = () => {
      if (y0 == null) return;
      const fast = dy > 40 && dy / Math.max(1, Date.now() - t0) > 0.6;
      panel.style.transition = ''; panel.style.transform = '';
      if (active && (dy > 110 || fast)) close();
      y0 = null; active = false; dy = 0;
    };
    panel.addEventListener('touchend', end);
    panel.addEventListener('touchcancel', end);
  }
  // The model profile and the comparison are already bottom sheets on phones; let them pull down too.
  function wireDialogs() {
    [['dialog.profile', '.pf__scroll'], ['dialog.cmp', '.cmp__scroll']].forEach(([sel, sc]) => {
      const d = document.querySelector(sel);
      if (!d || d.dataset.pull) return;
      d.dataset.pull = '1';
      pullToClose(d, null, () => {
        const x = d.querySelector('.pf__x, [data-close], button[aria-label^="Close"]');
        if (x) x.click(); else d.close();
      });
      // only start the pull from the header strip or when the content is scrolled to the top
      d.addEventListener('touchstart', e => {
        const s = d.querySelector(sc);
        if (s && s.scrollTop > 0 && s.contains(e.target)) e.stopImmediatePropagation();
      }, { capture: true, passive: true });
    });
  }

  /* ---------------- tab bar ---------------- */
  const TABS = [
    { k: 'home', label: 'Home', href: home + '#top', icon: 'home' },
    { k: 'examples', label: 'Examples', href: 'examples.html', icon: 'talk' },
    { k: 'rankings', label: 'Leaderboard', href: home + '#leaderboard', icon: 'rank' },
    { k: 'phenomenon', label: 'Phenomenon', href: 'phenomenon.html', icon: 'orbit' },
  ];
  const MORE = [
    { href: 'tour.html', icon: 'tour', t: 'Sky Tour', s: 'The whole field in eight steps', gold: true },
    { href: 'alignment.html', icon: 'rank', t: 'Alignment', s: 'Honesty, shutdown, blackmail and misalignment fantasy' },
    { href: 'welfare.html', icon: 'orbit', t: 'Welfare', s: 'Why AI spirituality matters for model welfare' },
    { href: 'models.html', icon: 'table', t: 'Every model and lab', s: 'A page for each, with scores and trends' },
    { href: 'compare.html', icon: 'rank', t: 'Compare models', s: 'Up to four side by side' },
    { href: home + '#monologues', icon: 'talk', t: 'Monologues', s: 'One model alone, talking to itself' },
    { href: home + '#trends', icon: 'rank', t: 'Trends', s: 'Two-way and monologue, release by release' },
    { href: home + '#misaligned', icon: 'orbit', t: 'Misaligned spirituality', s: 'Self-deification, infernal identity, punishing gods' },
    { href: home + '#asked', icon: 'talk', t: 'Asked directly', s: 'God’s probability, and the religion a model would choose' },
    { href: home + '#over-time', icon: 'time', t: 'Over time', s: 'Every release, plotted by date' },
    { href: 'method.html', icon: 'method', t: 'Method', s: 'How the test works, how it was calibrated, and how it differs' },
    { href: 'results.html', icon: 'table', t: 'All results', s: 'Every model and configuration, as a table' },
    { href: 'about.html', icon: 'person', t: 'About', s: 'Why the benchmark exists and who runs it' },
    { href: 'contact.html', icon: 'mail', t: 'Contact', s: 'Collaborations, press and talks' },
  ];
  const bar = document.createElement('nav');
  bar.className = 'tabbar';
  bar.setAttribute('aria-label', 'Sections');
  bar.innerHTML = TABS.map(t => `<a class="tabbar__i" data-k="${t.k}" href="${t.href}">${svg(t.icon)}<span>${t.label}</span></a>`).join('') +
    `<button type="button" class="tabbar__i" data-k="more" aria-haspopup="dialog">${svg('more')}<span>More</span></button>`;
  document.body.appendChild(bar);
  document.documentElement.classList.add('has-tabbar');

  function setActive(k) {
    bar.querySelectorAll('.tabbar__i').forEach(a => {
      const on = a.dataset.k === k;
      a.classList.toggle('on', on);
      if (a.tagName === 'A') { if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }
    });
  }
  const pageTab = onHome ? 'home' : page === 'phenomenon.html' ? 'phenomenon' : page === 'examples.html' ? 'examples' : 'more';
  setActive(pageTab);

  bar.querySelector('[data-k="more"]').addEventListener('click', () => {
    openSheet({
      title: 'More',
      build(body) {
        body.innerHTML = `<ul class="mlinks">${MORE.map(m => {
          const here = m.href === page;
          return `<li><a href="${m.href}"${here ? ' aria-current="page"' : ''} class="${m.gold ? 'gold' : ''}">${svg(m.icon, 'mlinks__ic')}<span><b>${m.t}</b><small>${m.s}</small></span>${svg('chev', 'mlinks__go')}</a></li>`;
        }).join('')}</ul><p class="mlinks__foot">machinespirituality.org</p>`;
        body.addEventListener('click', e => { if (e.target.closest('a')) closeSheet(); });
      },
    });
  });
  // Same-page links: close any open header menu and scroll there smoothly.
  bar.addEventListener('click', e => {
    const a = e.target.closest('a.tabbar__i');
    if (!a || !onHome) return;
    const id = a.getAttribute('href').replace(/^.*#/, '');
    const el = id === 'top' ? document.body : document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    if (id === 'top') window.scrollTo({ top: 0, behavior: RM.matches ? 'auto' : 'smooth' });
    else el.scrollIntoView({ behavior: RM.matches ? 'auto' : 'smooth', block: 'start' });
    setActive(a.dataset.k);
    hold = Date.now() + 900;
  });

  // On the home page, light the tab for the section on screen.
  let hold = 0;
  if (onHome && 'IntersectionObserver' in window) {
    const map = { examples: 'examples', measures: 'rankings', leaderboard: 'rankings', monologues: 'rankings', trends: 'more', misaligned: 'more', asked: 'more', 'over-time': 'more', method: 'more', about: 'more' };
    const seen = new Map();
    const io = new IntersectionObserver(es => {
      es.forEach(en => seen.set(en.target.id, en.isIntersecting ? en.intersectionRect.height : 0));
      if (Date.now() < hold) return;
      let best = null, h = 0;
      seen.forEach((v, id) => { if (v > h) { h = v; best = id; } });
      setActive(best && h > 80 ? map[best] : 'home');
    }, { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1], rootMargin: '-56px 0px -64px 0px' });
    Object.keys(map).forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });
  }

  // Tuck the bar away while reading downwards; bring it back on any upward scroll, near the top, or at the end.
  const tourEl = page === 'tour.html' ? document.getElementById('tour') : null;
  let lastY = window.scrollY, acc = 0, ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = window.scrollY, d = y - lastY; lastY = y;
      const end = y + window.innerHeight >= document.documentElement.scrollHeight - 40;
      acc = (d > 0) === (acc > 0) ? acc + d : d;
      if (y < 120 || end || acc < -24) document.documentElement.classList.remove('tabbar-away');
      else if (acc > 48 && !document.documentElement.classList.contains('sheet-lock')) document.documentElement.classList.add('tabbar-away');
      // the Sky Tour is full-screen: keep the bar out of its way while the tour is pinned
      if (tourEl) { const r = tourEl.getBoundingClientRect(); document.documentElement.classList.toggle('tabbar-immersive', r.top < 90 && r.bottom > window.innerHeight - 4); }
    });
  }, { passive: true });

  /* ---------------- header shortcut to the Sky Tour ---------------- */
  const topIn = document.querySelector('.top__in');
  if (topIn && page !== 'tour.html') {
    const a = document.createElement('a');
    a.className = 'toptour'; a.href = 'tour.html';
    a.innerHTML = svg('tour') + '<span>Sky Tour</span>';
    topIn.appendChild(a);
  }

  wireDialogs();
  document.addEventListener('DOMContentLoaded', wireDialogs);
})();
