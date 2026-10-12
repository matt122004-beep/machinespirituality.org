/* Conversation pages: the message strip follows your place in the conversation (redesign 2026-10-12). */
(function () {
  const ticks = Array.from(document.querySelectorAll('.txr__ticks .st'));
  if (!ticks.length || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const n = e.target.id.slice(1);
    ticks.forEach(t => t.classList.toggle('here', t.dataset.n === n));
  }), { rootMargin: '-35% 0px -60% 0px' });
  document.querySelectorAll('.txr__msgs .tm').forEach(s => io.observe(s));
})();
