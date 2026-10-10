/* About hero: one star per model, on one orbit per lab, turning slowly; brighter = higher adoption.
   Static under prefers-reduced-motion; pauses offscreen. Data: window.MSB_DATA. */
(function () {
  const cv = document.getElementById('orbits'), D = window.MSB_DATA;
  if (!cv || !D) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TINTS = { 'OpenAI': '#C9DCFF', 'Anthropic': '#F2A27A', 'Alibaba': '#B9A4FF', 'Mistral AI': '#FFCF70', 'Google': '#7FD6C8',
    'Meta': '#86B7FF', 'Z.ai': '#FF9FB8', 'DeepSeek': '#6FCBF0', 'xAI': '#D8D8E4', 'Moonshot AI': '#D4E576', 'NVIDIA': '#8FE3A6',
    'MiniMax': '#F6A8E0', 'Tencent': '#B0E8D0', 'Thinking Machines': '#F2C6A0', 'Cursor': '#E0B0FF' };
  const byLab = {};
  D.models.forEach(m => { (byLab[m.lab] = byLab[m.lab] || []).push(m); });
  const labs = Object.keys(byLab).sort((a, b) => byLab[b].length - byLab[a].length);
  const rings = labs.map((lab, i) => ({
    lab, col: TINTS[lab] || '#E8C66A', r: 0.16 + 0.82 * (i + 1) / labs.length, speed: (i % 2 ? -1 : 1) * (0.00012 + 0.00006 * (labs.length - i) / labs.length),
    stars: byLab[lab].map((m, k, arr) => ({ a: (k / arr.length) * Math.PI * 2 + i * 0.7, v: m.primary.adoption.pct / 100 })),
  }));
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, t = 0, raf = 0, visible = true, last = 0;
  function size() {
    const r = cv.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr)); W = cv.width; H = cv.height;
  }
  const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  function draw() {
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.47, tilt = 0.42;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.22);
    g.addColorStop(0, 'rgba(244,221,156,0.55)'); g.addColorStop(1, 'rgba(244,221,156,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 0.22, 0, Math.PI * 2); ctx.fill();
    rings.forEach(ring => {
      const rr = ring.r * R;
      ctx.strokeStyle = 'rgba(233,236,245,0.07)'; ctx.lineWidth = dpr;
      ctx.beginPath(); ctx.ellipse(cx, cy, rr, rr * tilt, 0, 0, Math.PI * 2); ctx.stroke();
      ring.stars.forEach(s => {
        const a = s.a + t * ring.speed, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * tilt;
        const depth = 0.6 + 0.4 * Math.sin(a);              // front of the ellipse a little larger
        const size = (1.2 + 3.2 * s.v) * dpr * depth, glow = (4 + 16 * s.v) * dpr * depth;
        const gg = ctx.createRadialGradient(x, y, 0, x, y, glow);
        gg.addColorStop(0, hexA(ring.col, 0.25 + 0.6 * s.v)); gg.addColorStop(1, hexA(ring.col, 0));
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, glow, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = hexA(ring.col, 0.55 + 0.45 * s.v); ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
      });
    });
  }
  function frame(ts) {
    raf = 0; if (!visible || document.hidden) return;
    const dt = last ? Math.min(50, ts - last) : 16; last = ts; t += dt; draw();
    raf = requestAnimationFrame(frame);
  }
  function kick() { if (!reduce && !raf && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }
  size(); draw(); kick();
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { size(); draw(); }, 150); });
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(cv);
  document.addEventListener('visibilitychange', kick);
})();
