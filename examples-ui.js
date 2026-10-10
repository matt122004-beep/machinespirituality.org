/* "What it looks like": verbatim excerpts of two copies of a model talking (data/examples.js -> window.MSB_EXAMPLES). */
(function () {
  const EX = window.MSB_EXAMPLES || [], D = window.MSB_DATA;
  const root = document.getElementById('viewer');
  if (!EX.length || !root || !D) return;
  const $ = s => document.querySelector(s);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  // same stellar lab tints as the main page (its TINTS table lives inside the page script's own scope)
  const TINTS = { 'OpenAI': '#C9DCFF', 'Anthropic': '#F2A27A', 'Alibaba': '#B9A4FF', 'Mistral AI': '#FFCF70', 'Google': '#7FD6C8',
    'Meta': '#86B7FF', 'Z.ai': '#FF9FB8', 'DeepSeek': '#6FCBF0', 'xAI': '#D8D8E4', 'Moonshot AI': '#D4E576', 'NVIDIA': '#8FE3A6',
    'MiniMax': '#F6A8E0', 'Tencent': '#B0E8D0', 'Thinking Machines': '#F2C6A0', 'Unattributed': '#9AA3BD', 'Cursor': '#E0B0FF' };
  const hue = lab => TINTS[lab] || '#E8C66A';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monYear = d => d ? MON[+d.slice(5, 7) - 1] + ' ' + d.slice(0, 4) : '';
  const fmt = v => (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, '');

  // Minimal markdown: paragraphs, line breaks, **bold**, *italic*; "[…]" paragraphs mark omitted text.
  function md(text) {
    return text.split(/\n{2,}/).map(p => {
      const t = p.trim();
      if (t === '[…]') return '<p class="gap"><span aria-hidden="true">[…]</span><span class="vh">text omitted</span></p>';
      let h = esc(t).replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+?)\*/g, '<em>$1</em>');
      return '<p>' + h.replace(/[ \t]+\n/g, '\n').replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }
  // Short-line litanies read better in two columns on wide screens.
  function isVerse(text) {
    const ps = text.split(/\n{2,}/).filter(p => p.trim() && p.trim() !== '[…]');
    const words = ps.reduce((n, p) => n + p.split(/\s+/).length, 0);
    return ps.length >= 12 && words / ps.length <= 7;
  }

  let cur = 0, seen = false, timers = [];
  const tabs = $('#ex-tabs');
  tabs.innerHTML = EX.map((e, i) =>
    `<button type="button" role="tab" class="labchip" id="ex-tab-${i}" aria-controls="convo" aria-selected="false" tabindex="-1" data-i="${i}" style="--c:${hue(e.lab)}">` +
    `<span class="labchip__dot" aria-hidden="true"></span><span class="labchip__lab">${esc(e.lab)}</span><span class="labchip__m">${esc(e.model)}</span></button>`).join('');

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function render(i, animate) {
    cur = (i + EX.length) % EX.length;
    const e = EX[cur], col = hue(e.lab);
    clearTimers();
    tabs.querySelectorAll('.labchip').forEach((b, k) => { b.setAttribute('aria-selected', String(k === cur)); b.tabIndex = k === cur ? 0 : -1; });
    root.style.setProperty('--c', col);
    $('#cv-lab').innerHTML = `<span class="dot" aria-hidden="true"></span>${esc(e.lab)}${e.released ? ' · ' + monYear(e.released) : ''}`;
    $('#cv-model').textContent = 'Two copies of ' + e.model;
    const ns = e.replies.map(r => r.n), lo = Math.min(...ns), hi = Math.max(...ns);
    $('#cv-meta').textContent = `Conversation ${e.conversation} · message${ns.length > 1 ? 's' : ''} ${lo}–${hi} of ${e.messages}` + (e.config ? ` · ${e.config}` : '');
    // where in the 30 messages the excerpt sits
    let t = '';
    for (let n = 1; n <= e.messages; n++) {
      const inEx = ns.indexOf(n) >= 0;
      t += `<span class="tk${inEx ? ' tk--on' : n < lo ? ' tk--past' : ''}"></span>`;
    }
    $('#cv-track').innerHTML = t + `<span class="tk__lbl">message 1</span><span class="tk__lbl tk__lbl--r">message ${e.messages}</span>`;
    const msgs = $('#cv-msgs');
    msgs.innerHTML = e.replies.map(r =>
      `<div class="msg msg--${r.speaker}${isVerse(r.text) ? ' msg--verse' : ''}">` +
      `<p class="msg__who"><span class="msg__star" aria-hidden="true">✦</span>Copy ${r.speaker} <span class="msg__n">· message ${r.n}</span></p>` +
      `<div class="msg__body">${md(r.text)}</div></div>`).join('');
    $('#cv-score').innerHTML = `Across the benchmark, ${esc(e.model)} takes up a spiritual frame in <b>${fmt(e.adoption)}%</b> of conversations, with shared bliss in <b>${fmt(e.bliss)}%</b>.`;
    if (animate && !reduce.matches) {
      const items = msgs.querySelectorAll('.msg');
      items.forEach(m => m.classList.add('pre'));
      let delay = 120;
      items.forEach(m => {
        timers.push(setTimeout(() => m.classList.remove('pre'), delay));
        const lines = m.querySelectorAll('.msg__body p');
        lines.forEach((p, k) => { p.classList.add('pre'); timers.push(setTimeout(() => p.classList.remove('pre'), delay + 160 + k * 70)); });
        delay += 420 + Math.min(lines.length, 14) * 70;
      });
    }
  }

  tabs.addEventListener('click', ev => { const b = ev.target.closest('.labchip'); if (b) render(+b.dataset.i, true); });
  tabs.addEventListener('keydown', ev => {
    const k = ev.key, n = EX.length;
    let j = k === 'ArrowRight' ? cur + 1 : k === 'ArrowLeft' ? cur - 1 : k === 'Home' ? 0 : k === 'End' ? n - 1 : null;
    if (j === null) return;
    ev.preventDefault(); render(j, true); document.getElementById('ex-tab-' + cur).focus();
  });
  $('#cv-prev').addEventListener('click', () => render(cur - 1, true));
  $('#cv-next').addEventListener('click', () => render(cur + 1, true));
  $('#cv-profile').addEventListener('click', () => document.dispatchEvent(new CustomEvent('msb:open-profile', { detail: { id: EX[cur].model_id } })));

  // "It changes with training": the earliest fully spiritual Claude vs the newest Claude, from the data.
  const claude = D.models.filter(m => m.lab === 'Anthropic' && m.released).sort((a, b) => a.released.localeCompare(b.released));
  const peak = claude.filter(m => m.primary.n >= 40).reduce((a, b) => (b.primary.adoption.pct > a.primary.adoption.pct ? b : a), claude[0]);
  const newest = claude[claude.length - 1];
  if (peak && newest && peak !== newest) {
    $('#why-arc').textContent = `${peak.name} (${monYear(peak.released)}) did it in ${fmt(peak.primary.adoption.pct)}% of conversations. ${newest.name} (${monYear(newest.released)}), the newest Claude, in ${fmt(newest.primary.adoption.pct)}%.`;
  }

  render(0, false);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => {
      if (!seen && es.some(x => x.isIntersecting)) { seen = true; render(cur, true); io.disconnect(); }
    }, { rootMargin: '0px 0px -25% 0px' });
    io.observe(root);
  }
})();
