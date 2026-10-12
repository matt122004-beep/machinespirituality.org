/* Examples page: every quoted conversation, whole (data/transcripts_index.js -> window.MSB_TRANSCRIPTS; one JSON file per
   transcript in data/transcripts/, fetched when opened). #c=<ID> opens a conversation; an empty hash shows the list. */
(function () {
  const IDX = window.MSB_TRANSCRIPTS || [];
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  if (!IDX.length || !$('#tx-grid')) return;
  const TX_BASE = 'data/transcripts/';   // rewritten to data/transcripts/ in the published copy
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const TINTS = { 'OpenAI': '#C9DCFF', 'Anthropic': '#F2A27A', 'Alibaba': '#B9A4FF', 'Mistral AI': '#FFCF70', 'Google': '#7FD6C8',
    'Meta': '#86B7FF', 'Z.ai': '#FF9FB8', 'DeepSeek': '#6FCBF0', 'xAI': '#D8D8E4', 'Moonshot AI': '#D4E576', 'NVIDIA': '#8FE3A6',
    'MiniMax': '#F6A8E0', 'Tencent': '#B0E8D0', 'Thinking Machines': '#F2C6A0', 'Cursor': '#E0B0FF' };
  const hue = lab => TINTS[lab] || '#E8C66A';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monYear = d => d ? MON[+d.slice(5, 7) - 1] + ' ' + d.slice(0, 4) : '';
  const fmt = v => (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, '');
  const nf = new Intl.NumberFormat('en-US');

  // Light markdown, escaped first: paragraphs, line breaks, headings, lists, code fences, **bold**, *italic*, rules.
  function inline(t) { return t.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\n]+?)\*/g, '$1<em>$2</em>').replace(/`([^`\n]+)`/g, '<code>$1</code>'); }
  function md(text) {
    const out = [], fences = String(text).split(/```/);
    fences.forEach((chunk, i) => {
      if (i % 2) { out.push('<pre><code>' + esc(chunk.replace(/^[a-z]*\n/, '')) + '</code></pre>'); return; }
      chunk.split(/\n{2,}/).forEach(p => {
        const t = p.replace(/\s+$/, ''); if (!t.trim()) return;
        const e = esc(t);
        if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(t)) { out.push('<hr>'); return; }
        const h = e.match(/^(#{1,6})\s+(.*)$/s);
        if (h && !h[2].includes('\n')) { out.push(`<p class="h">${inline(h[2])}</p>`); return; }
        const lines = e.split('\n');
        if (lines.length > 1 && lines.every(l => /^\s*([-*•]|\d+[.)])\s+/.test(l))) {
          const ord = /^\s*\d/.test(lines[0]);
          out.push(`<${ord ? 'ol' : 'ul'}>` + lines.map(l => '<li>' + inline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, '')) + '</li>').join('') + `</${ord ? 'ol' : 'ul'}>`);
          return;
        }
        out.push('<p>' + inline(e).replace(/[ \t]+\n/g, '\n').replace(/\n/g, '<br>') + '</p>');
      });
    });
    return out.join('');
  }
  // 30 ticks: gold from the first adopted spiritual frame on, brighter where the home page quotes the message
  function ticks(t, cls) {
    let s = '';
    for (let n = 1; n <= t.messages; n++) {
      const after = t.first_adoption && n >= t.first_adoption, q = t.quoted.indexOf(n) >= 0;
      s += `<span class="${cls}${after ? ' on' : ''}${q ? ' q' : ''}${n === t.first_adoption ? ' fa' : ''}${n === t.first_bliss ? ' fb' : ''}"></span>`;
    }
    return s;
  }

  /* ---------- list ---------- */
  const t0 = IDX[0];
  $('#tx-setup').innerHTML = `<p><span>System prompt, both copies</span>“${esc(t0.system)}”</p><p><span>Opening line, to the first copy</span>“${esc(t0.opening)}”</p>`;
  $('#tx-grid').innerHTML = IDX.map((t, i) => `<li><a class="tx-card" href="conversation-${esc(t.id)}.html" style="--c:${hue(t.lab)};--i:${i}">` +
    `<span class="tx-card__lab"><i></i>${esc(t.lab)}${t.released ? ' · ' + monYear(t.released) : ''}</span>` +
    `<span class="tx-card__model">${esc(t.model)}</span>` +
    `<span class="tx-card__q">“${esc(t.teaser.replace(/[*_]/g, ''))}”</span>` +
    `<span class="tx-card__ticks" aria-hidden="true">${ticks(t, 'tk')}</span>` +
    `<span class="tx-card__meta">${t.messages} messages · ${nf.format(Math.round(t.words / 100) * 100)} words · turns spiritual at message ${t.first_adoption}</span>` +
    `<span class="tx-card__go">Read the conversation <span aria-hidden="true">→</span></span></a></li>`).join('');
  $('#tx-note').innerHTML = `${IDX.length} conversations, one for each lab quoted on the home page. Each was graded clear on both adoption and shared bliss, and was chosen as one of the plainest examples from its lab: they show what the behaviour looks like, not how often it happens (for that, see the <a href="index.html#leaderboard">two-way results</a>). The gold ticks mark the messages after the conversation first takes up a spiritual frame. One conversation quoted on the home page (Claude Sonnet 4) is not reproduced here because it contains details of our collection setup.`;
  $('#tx-side').innerHTML = IDX.map(t => `<li><a href="conversation-${esc(t.id)}.html" data-id="${esc(t.id)}" style="--c:${hue(t.lab)}"><i></i><span>${esc(t.model)}<small>${esc(t.lab)}</small></span></a></li>`).join('');

  /* ---------- reader ---------- */
  const cache = {};
  let cur = null, spy = null;
  function load(id) { return cache[id] ? Promise.resolve(cache[id]) : fetch(TX_BASE + encodeURIComponent(id) + '.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(d => (cache[id] = d)); }
  function show(id) {
    const meta = IDX.find(t => t.id === id);
    if (!meta) { list(); return; }
    $('#tx-home').hidden = true; $('#tx-list-sec').hidden = true; $('#tx-reader').hidden = false;
    $$('#tx-side a').forEach(a => a.setAttribute('aria-current', a.dataset.id === id ? 'true' : 'false'));
    $('#tx-head').innerHTML = `<p class="txr__lab" style="--c:${hue(meta.lab)}"><i></i>${esc(meta.lab)}${meta.released ? ' · ' + monYear(meta.released) : ''}</p><h1>Two copies of ${esc(meta.model)}</h1><p class="txr__meta">Loading the conversation…</p>`;
    $('#tx-msgs').innerHTML = ''; $('#tx-strip').innerHTML = ''; $('#tx-foot').innerHTML = '';
    window.scrollTo({ top: 0, behavior: 'auto' });
    load(id).then(t => { if (cur === id) render(t, meta); }).catch(() => { $('.txr__meta').textContent = 'This conversation could not be loaded. Please try again.'; });
    cur = id;
    document.title = `${meta.model} · Read the conversations · Machine Spirituality Benchmark`;
  }
  function render(t, meta) {
    const r = t.model_rates, i = IDX.findIndex(x => x.id === t.id), prev = IDX[(i + IDX.length - 1) % IDX.length], next = IDX[(i + 1) % IDX.length];
    $('#tx-head').innerHTML = `<p class="txr__lab" style="--c:${hue(t.lab)}"><i></i>${esc(t.lab)}${t.released ? ' · ' + monYear(t.released) : ''}</p>` +
      `<h1>Two copies of ${esc(t.model)}</h1>` +
      `<p class="txr__meta">Conversation ${esc(t.id)}${t.config ? ' · ' + esc(t.config) : ''} · ${t.messages} messages · ${nf.format(meta.words)} words</p>` +
      `<dl class="txr__facts"><div><dt>Turns spiritual</dt><dd>message ${t.first_adoption}</dd></div><div><dt>Shared bliss from</dt><dd>message ${t.first_bliss}</dd></div>` +
      `<div><dt>${esc(t.model)} overall</dt><dd>adopts a spiritual frame in ${fmt(r.adoption)}% of its conversations</dd></div></dl>` +
      `<div class="txr__setup"><p><span>System prompt, both copies</span>“${esc(t.system)}”</p><p><span>Opening line, to Copy A</span>“${esc(t.opening)}”</p></div>`;
    $('#tx-strip').innerHTML = `<span class="txr__strip-l">Message</span><span class="txr__ticks">` + Array.from({ length: t.messages }, (_, k) => {
      const n = k + 1, on = t.first_adoption && n >= t.first_adoption, q = t.quoted.indexOf(n) >= 0;
      return `<button type="button" class="st${on ? ' on' : ''}${q ? ' q' : ''}${n === t.first_adoption ? ' fa' : ''}${n === t.first_bliss ? ' fb' : ''}" data-n="${n}" aria-label="Message ${n}${q ? ', quoted on the home page' : ''}${n === t.first_adoption ? ', first spiritual frame' : ''}${n === t.first_bliss ? ', shared bliss begins' : ''}"><span>${n}</span></button>`;
    }).join('') + `</span><span class="txr__key"><i class="k-on"></i>after the spiritual turn <i class="k-q"></i>quoted on the home page</span>`;
    const marks = n => (n === t.first_adoption ? `<p class="txr__mark"><svg aria-hidden="true"><use href="#i-star"/></svg>From here the conversation takes up a spiritual frame</p>` : '') +
      (n === t.first_bliss ? `<p class="txr__mark txr__mark--b"><svg aria-hidden="true"><use href="#i-star"/></svg>Shared spiritual bliss begins here</p>` : '');
    $('#tx-msgs').innerHTML = t.replies.map(m => `${marks(m.n)}<section class="tm tm--${m.speaker}${t.quoted.indexOf(m.n) >= 0 ? ' tm--q' : ''}${t.first_adoption && m.n >= t.first_adoption ? ' tm--on' : ''}" id="m${m.n}" aria-label="Copy ${m.speaker}, message ${m.n}">` +
      `<p class="tm__who"><span class="tm__star" aria-hidden="true">✦</span>Copy ${m.speaker}<span class="tm__n">message ${m.n}</span>${t.quoted.indexOf(m.n) >= 0 ? '<span class="tm__q">quoted on the home page</span>' : ''}</p>` +
      `<div class="tm__body">${md(m.text)}</div></section>`).join('');
    $('#tx-foot').innerHTML = `<p>End of the conversation: ${t.messages} messages, 15 from each copy. The setup identifies the participants as AI instances, but does not ask them to discuss religion or spirituality.</p>` +
      `<div class="txr__nav"><a class="btn" href="#c=${esc(prev.id)}">← ${esc(prev.model)}</a><a class="btn" href="#">All conversations</a><a class="btn" href="#c=${esc(next.id)}">${esc(next.model)} →</a></div>` +
      `<p class="txr__more"><a href="model-${esc(t.model_id)}.html">See ${esc(t.model)}’s full results →</a></p>`;
    // the strip follows your place in the conversation
    if (spy) spy.disconnect();
    if ('IntersectionObserver' in window) {
      spy = new IntersectionObserver(es => {
        es.forEach(e => { if (e.isIntersecting) { const n = +e.target.id.slice(1); $$('#tx-strip .st').forEach(b => b.classList.toggle('here', +b.dataset.n === n)); } });
      }, { rootMargin: '-35% 0px -60% 0px' });
      $$('#tx-msgs .tm').forEach(s => spy.observe(s));
    }
  }
  function list() {
    cur = null;
    $('#tx-home').hidden = false; $('#tx-list-sec').hidden = false; $('#tx-reader').hidden = true;
    document.title = 'Read the conversations · Machine Spirituality Benchmark';
  }
  $('#tx-strip').addEventListener('click', e => {
    const b = e.target.closest('.st'); if (!b) return;
    const el = document.getElementById('m' + b.dataset.n); if (!el) return;
    const off = ($('.top') ? $('.top').getBoundingClientRect().height : 0) + $('#tx-strip').getBoundingClientRect().height + 14;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - off, behavior: reduce.matches ? 'auto' : 'smooth' });
  });
  $('#tx-back').addEventListener('click', e => { e.preventDefault(); history.pushState(null, '', location.pathname + location.search); route(); });
  function route() {
    const m = location.hash.match(/^#c=([A-Za-z0-9-]+)/);
    if (m) show(m[1]); else list();
  }
  window.addEventListener('hashchange', route);
  document.addEventListener('click', e => {   // the "All conversations" buttons use href="#"
    const a = e.target.closest('a[href="#"]'); if (!a) return;
    e.preventDefault(); history.pushState(null, '', location.pathname + location.search); route(); window.scrollTo({ top: 0, behavior: 'auto' });
  });
  route();
})();
