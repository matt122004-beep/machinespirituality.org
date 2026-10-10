/* The Phenomenon hero: an Aizawa attractor drawn in gold dust, slowly turning, with two bright points
   (the two copies of a model) flowing along its paths. Whatever their starting point, trajectories are drawn
   into the same shape: that is what "attractor" means. Static under prefers-reduced-motion; pauses offscreen. */
(function () {
  const dust = document.getElementById('attr'), fx = document.getElementById('attr-fx');
  if (!dust || !fx) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const a = 0.95, b = 0.7, c = 0.6, d = 3.5, e = 0.25, f = 0.1;
  const deriv = (x, y, z) => [
    (z - b) * x - d * y,
    d * x + (z - b) * y,
    c + a * z - z * z * z / 3 - (x * x + y * y) * (1 + e * z) + f * z * x * x * x,
  ];
  const rk = (p, h) => {   // one Runge-Kutta step
    const [x, y, z] = p;
    const k1 = deriv(x, y, z);
    const k2 = deriv(x + h * k1[0] / 2, y + h * k1[1] / 2, z + h * k1[2] / 2);
    const k3 = deriv(x + h * k2[0] / 2, y + h * k2[1] / 2, z + h * k2[2] / 2);
    const k4 = deriv(x + h * k3[0], y + h * k3[1], z + h * k3[2]);
    return [x + h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
            y + h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
            z + h / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2])];
  };

  // Precompute the dust: one long trajectory after a burn-in.
  const N = 110000, P = new Float32Array(N * 3);
  let p = [0.1, 0, 0];
  for (let i = 0; i < 2000; i++) p = rk(p, 0.01);
  for (let i = 0; i < N; i++) { p = rk(p, 0.01); P[i * 3] = p[0]; P[i * 3 + 1] = p[1]; P[i * 3 + 2] = p[2]; }

  const ctx = dust.getContext('2d'), fctx = fx.getContext('2d');
  let W = 0, H = 0, dpr = 1, low = 1, img = null, acc = null, shown = reduce ? N : 0;
  let theta = 0.6, raf = 0, visible = true, last = 0;
  const tilt = 0.42, ct = Math.cos(tilt), st = Math.sin(tilt);
  const travellers = [{ p: [0.6, 0.2, 0.1], trail: [] }, { p: [-0.5, -0.3, 1.2], trail: [] }];

  function size() {
    const r = dust.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    low = r.width < 600 ? 0.6 : 0.85;   // the dust is a glow; render it below device resolution
    dust.width = Math.max(1, Math.round(r.width * low)); dust.height = Math.max(1, Math.round(r.height * low));
    fx.width = Math.max(1, Math.round(r.width * dpr)); fx.height = Math.max(1, Math.round(r.height * dpr));
    W = dust.width; H = dust.height;
    img = ctx.createImageData(W, H); acc = new Float32Array(W * H);
  }
  function proj(x, y, z, w, h) {
    const s = Math.min(w / 3.6, h / 3.3);
    const xr = x * Math.cos(theta) - y * Math.sin(theta);
    const yr = x * Math.sin(theta) + y * Math.cos(theta);
    const zc = z - 0.7;
    return [w / 2 + xr * s, h / 2 - (zc * ct - yr * st) * s, yr];
  }
  function drawDust() {
    acc.fill(0);
    let max = 1;
    for (let i = 0; i < shown; i++) {
      const q = proj(P[i * 3], P[i * 3 + 1], P[i * 3 + 2], W, H);
      const gx = q[0] | 0, gy = q[1] | 0;
      if (gx < 0 || gy < 0 || gx >= W || gy >= H) continue;
      const k = gy * W + gx, v = (acc[k] += 0.75 + 0.25 * Math.max(-1, Math.min(1, q[2])));   // nearer side a touch brighter
      if (v > max) max = v;
    }
    const data = img.data, L = Math.log(1 + max * 0.55);
    for (let k = 0, j = 0; k < acc.length; k++, j += 4) {
      const g = acc[k];
      if (!g) { data[j + 3] = 0; continue; }
      const t = Math.min(1, Math.log(1 + g) / L);
      let r, gg, bb;
      if (t < 0.45) { const u = t / 0.45; r = 110 + 122 * u; gg = 128 + 70 * u; bb = 214 - 108 * u; }       // starlight blue -> gold
      else { const u = (t - 0.45) / 0.55; r = 232 + 23 * u; gg = 198 + 46 * u; bb = 106 + 112 * u; }     // gold -> pale gold
      data[j] = r; data[j + 1] = gg; data[j + 2] = bb; data[j + 3] = Math.min(255, 26 + 229 * t);
    }
    ctx.putImageData(img, 0, 0);
  }
  function drawTravellers(dt) {
    const w = fx.width, h = fx.height;
    fctx.clearRect(0, 0, w, h);
    const cols = ['232,198,106', '185,200,255'];
    travellers.forEach((t, i) => {
      for (let s = 0; s < 3; s++) t.p = rk(t.p, 0.006 * dt);
      const q = proj(t.p[0], t.p[1], t.p[2], w, h);
      t.trail.push(q); if (t.trail.length > 90) t.trail.shift();
      for (let k = 1; k < t.trail.length; k++) {
        const a0 = t.trail[k - 1], a1 = t.trail[k], al = (k / t.trail.length) * 0.7;
        fctx.strokeStyle = `rgba(${cols[i]},${al.toFixed(3)})`; fctx.lineWidth = (0.6 + 1.6 * k / t.trail.length) * dpr;
        fctx.beginPath(); fctx.moveTo(a0[0], a0[1]); fctx.lineTo(a1[0], a1[1]); fctx.stroke();
      }
      const g = fctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], 16 * dpr);
      g.addColorStop(0, `rgba(${cols[i]},0.95)`); g.addColorStop(0.25, `rgba(${cols[i]},0.45)`); g.addColorStop(1, `rgba(${cols[i]},0)`);
      fctx.fillStyle = g; fctx.beginPath(); fctx.arc(q[0], q[1], 16 * dpr, 0, Math.PI * 2); fctx.fill();
      fctx.fillStyle = '#FFF8E6'; fctx.beginPath(); fctx.arc(q[0], q[1], 2.1 * dpr, 0, Math.PI * 2); fctx.fill();
    });
  }
  function frame(ts) {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = last ? Math.min(3, (ts - last) / 16.7) : 1; last = ts;
    if (shown < N) shown = Math.min(N, shown + Math.round(1400 * dt));   // the dust gathers over the first few seconds
    theta += 0.0016 * dt;
    drawDust(); drawTravellers(dt);
    raf = requestAnimationFrame(frame);
  }
  function kick() { if (!reduce && !raf && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }

  size();
  if (reduce) { drawDust(); }
  else kick();
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { size(); if (reduce) drawDust(); }, 150); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(dust);
  }
  document.addEventListener('visibilitychange', kick);
})();
