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
      each(sec.querySelectorAll('.kpi,.hb,.stack,.mlink,.txc-w,.txc,.labcard,.lstats>div,.labchip,.fs,.tl-fig,.ptab tbody tr,.whyc,.persona,.why-facts>div,.why-stats>div,.why-steps>li,.al-c,.bf__row'), function (x, i) {
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
