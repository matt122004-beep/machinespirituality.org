/* Motion for the model, lab and models pages (v3, 2026-10-12).
   Every number and chart is already in the HTML; this script only animates them into view as they scroll in.
   Without it, or with reduced motion requested, the pages are complete and static. Loaded in <head> so the
   starting state is set before the first paint. */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!('IntersectionObserver' in window) || reduce) return;
  root.classList.add('pg-js');

  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  // Count a headline number up from zero to the value already printed in the page.
  function countUp(el) {
    var raw = el.getAttribute('data-count'), to = parseFloat(raw), dec = (raw.split('.')[1] || '').length, t0 = null, dur = 1300;
    if (!isFinite(to)) return;
    function step(t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / dur), eased = 1 - Math.pow(1 - k, 3);
      el.textContent = k < 1 ? (dec ? (to * eased).toFixed(dec) : Math.round(to * eased).toLocaleString('en-US')) : (el.getAttribute('data-final') || raw);
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function init() {
    var sections = document.querySelectorAll('.rv');
    // Items inside a section enter one after another.
    each(sections, function (sec) {
      each(sec.querySelectorAll('.kpi,.hb,.stack,.mlink,.txc-w,.txc,.labcard,.lstats>div,.labchip,.fs,.tl-fig,.ptab tbody tr,.whyc,.persona,.why-facts>div,.why-stats>div,.why-steps>li,.al-c,.bf__row,.mt-toc li,.mt-versions li,.mt-prior,.mt-diffs>.pcard,.mt-q'), function (x, i) {
        x.style.setProperty('--i', Math.min(i, 24));
      });
      each(sec.querySelectorAll('[data-count]'), function (c) { c.setAttribute('data-final', c.textContent); c.textContent = '0'; });
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var sec = en.target;
        sec.classList.add('in');
        io.unobserve(sec);
        each(sec.querySelectorAll('[data-count]'), function (c, i) { setTimeout(function () { countUp(c); }, 180 + i * 110); });
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    each(sections, function (sec) { io.observe(sec); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* 2026-10-30: the full questionnaire on a model page is a set of collapsible groups (<details class="bq-g">). The in-page index opens the group it
   points to, a link to one from elsewhere opens it too, and a button opens or closes every group. Without this script the groups still open by click. */
(function () {
  function groups() { return document.querySelectorAll('details.bq-g'); }
  function reveal() {
    var id = decodeURIComponent((location.hash || '').slice(1)), t = id && document.getElementById(id);
    if (t && t.tagName === 'DETAILS' && t.classList.contains('bq-g')) { t.open = true; t.scrollIntoView(); }
  }
  function init() {
    var nav = document.querySelector('.bq-idx');
    if (nav && groups().length > 1) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = 'Open every group';
      b.addEventListener('click', function () {
        var open = b.getAttribute('data-open') !== 'true';
        Array.prototype.forEach.call(groups(), function (g) { g.open = open; });
        b.setAttribute('data-open', open); b.textContent = open ? 'Close every group' : 'Open every group';
      });
      nav.appendChild(b);
    }
    reveal();
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.bq-idx a'); if (!a) return;
    var t = document.getElementById((a.getAttribute('href') || '').slice(1)); if (t && t.tagName === 'DETAILS') t.open = true;
  });
  window.addEventListener('hashchange', reveal);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
