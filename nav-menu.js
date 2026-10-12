/* Collapsible header menu on narrow screens (shared by index, tour and phenomenon pages). */
(function () {
  const top = document.querySelector('.top'), btn = document.querySelector('.navbtn'), nav = document.getElementById('primary-nav');
  if (!top || !btn || !nav) return;
  const label = btn.querySelector('.navbtn__t');
  const set = open => {
    top.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    if (label) label.textContent = open ? 'Close' : 'Menu';
  };
  btn.addEventListener('click', () => set(!top.classList.contains('is-open')));
  nav.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && top.classList.contains('is-open')) { set(false); btn.focus(); } });
  document.addEventListener('click', e => { if (top.classList.contains('is-open') && !top.contains(e.target)) set(false); });
  const wide = window.matchMedia('(min-width: 1241px)');
  (wide.addEventListener ? wide.addEventListener('change', e => { if (e.matches) set(false); }) : null);
})();
