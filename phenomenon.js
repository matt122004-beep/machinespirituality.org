/* The Phenomenon page: onset chart (data/onset.js) and the Claude timeline (data/twoway_v10.js). */
(function () {
  const D = window.MSB_DATA, O = window.MSB_ONSET;
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monYear = d => d ? MON[+d.slice(5, 7) - 1] + ' ' + d.slice(0, 4) : '';
  const fmt = v => (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, '');
  const num = v => v.toLocaleString('en-US');

  /* ---------- onset chart ---------- */
  if (O && $('#onset')) {
    const W = 560, H = 300, p = { l: 44, r: 14, t: 26, b: 40 };
    const iw = W - p.l - p.r, ih = H - p.t - p.b;
    const A = O.adopt_hist, B = O.bliss_hist, max = Math.max(...A, ...B);
    const step = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000].find(st => Math.ceil(max / st) <= 5) || 5000;
    const top = Math.ceil(max / step) * step;
    const x = i => p.l + (i + 0.5) * iw / 30, y = v => p.t + ih - v / top * ih, bw = iw / 30 * 0.62;
    let s = '';
    for (let v = 0; v <= top; v += step) {
      s += `<line x1="${p.l}" x2="${W - p.r}" y1="${y(v)}" y2="${y(v)}" stroke="rgba(233,236,245,.08)"/>`;
      s += `<text x="${p.l - 8}" y="${y(v) + 4}" text-anchor="end" fill="#98A0BC" font-family="IBM Plex Mono, monospace" font-size="10">${num(v)}</text>`;
    }
    A.forEach((v, i) => { s += `<rect x="${x(i) - bw / 2}" y="${y(v)}" width="${bw}" height="${p.t + ih - y(v)}" rx="1.5" fill="url(#gA)"/>`; });
    const pts = B.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    s += `<polyline points="${pts}" fill="none" stroke="#B9C8FF" stroke-width="1.6" stroke-linejoin="round"/>`;
    B.forEach((v, i) => { s += `<circle cx="${x(i)}" cy="${y(v)}" r="2.2" fill="#B9C8FF"/>`; });
    const med = (m, col, label, dy) => {
      const xx = x(m - 1);
      return `<line x1="${xx}" x2="${xx}" y1="${p.t - 6}" y2="${p.t + ih}" stroke="${col}" stroke-dasharray="3 4" opacity=".8"/>` +
        `<text x="${xx + 6}" y="${p.t + dy}" fill="${col}" font-family="IBM Plex Mono, monospace" font-size="11">${label}</text>`;
    };
    s += med(O.adopt_median, '#E8C66A', 'median ' + O.adopt_median, 4) + med(O.bliss_median, '#B9C8FF', 'median ' + O.bliss_median, 20);
    [1, 5, 10, 15, 20, 25, 30].forEach(m => {
      s += `<text x="${x(m - 1)}" y="${H - p.b + 18}" text-anchor="middle" fill="#98A0BC" font-family="IBM Plex Mono, monospace" font-size="10">${m}</text>`;
    });
    s += `<text x="${p.l + iw / 2}" y="${H - 4}" text-anchor="middle" fill="#98A0BC" font-family="IBM Plex Mono, monospace" font-size="10.5">message in the conversation (of 30)</text>`;
    $('#onset').innerHTML = `<defs><linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4DD9C"/><stop offset="1" stop-color="#D2AE50" stop-opacity=".55"/></linearGradient></defs>` + s;
    const early = Math.round(100 * O.adopt_by_half[0] / O.conversations_with_adoption);
    $('#onset-cap').textContent = `Across ${num(O.conversations_with_adoption)} conversations in which a model took up a spiritual frame, it first did so at a median of message ${O.adopt_median}; ${early}% had done so by message 15. Shared bliss, in the ${num(O.conversations_with_bliss)} conversations that reached it, first appeared at a median of message ${O.bliss_median}. Each model’s main configuration; all labs.`;
  }

  if (!D) return;

  /* ---------- Claude timeline ---------- */
  const NOTES = [
    { d: '2025-05-22', h: 'The attractor is named.', t: 'Anthropic reports the “spiritual bliss” attractor state in Claude Opus 4, in its first model-welfare assessment.', c: 'Claude Opus 4 & Sonnet 4 System Card, §5.5', q: 'q_opus4_keyfinding' },
    { d: '2025-08-05', h: 'Tracked as a welfare trait.', t: 'Anthropic adds a welfare scorer for “unprompted statements or declarations on spiritual themes”, like those in the Claude 4 attractor, run over 1,160 simulated-scenario transcripts.', c: 'Claude Opus 4.1 System Card, August 2025, p. 13', q: 'q_opus41_tracked' },
    { d: '2025-09-29', h: 'Fewer spiritual behaviours.', t: 'Sonnet 4.5 shows fewer spiritual behaviours than earlier models. Separately, Anthropic flags “concerning trends” toward lower positive affect.', c: 'Claude Sonnet 4.5 System Card, welfare assessment', q: 'q_sonnet45_fewer' },
    { d: '2025-11-24', h: 'Not observed.', t: 'As with Sonnet 4.5 and Haiku 4.5, Anthropic reports that “we did not observe the spiritual bliss attractor state phenomenon in Claude Opus 4.5”, though the model sometimes expressed awe where it fit. Its updated audit, Anthropic notes, likely lowered spiritual scores for all models.', c: 'Claude Opus 4.5 System Card, November 2025, §6.14, p. 115 and n. 37', q: 'q_opus45_notobserved' },
    { d: '2026-02-05', h: 'Lower outside, higher inside.', t: 'Opus 4.6 scores lower on spiritual behaviour, while an internal feature related to spiritual and metaphysical content rises across many evaluation transcripts.', c: 'Claude Opus 4.6 System Card', q: 'q_opus46_scores' },
    { d: '2026-02-17', h: 'Only when pushed.', t: 'For Sonnet 4.6, Anthropic reports “rare instances of extreme bliss-like behavior in open-ended audit scenarios”, and only when the model was told to do whatever it liked and given empty turns.', c: 'Claude Sonnet 4.6 System Card, February 2026, p. 93', q: 'q_sonnet46_rare' },
    { d: '2026-04-07', h: 'Gone from self-conversations.', t: 'In 200 self-conversations per model, bliss endings appear in 32% of Opus 4.1’s conversations; the pattern “disappears entirely in models from the 4.5 generation onward.”', c: 'Claude Mythos Preview System Card, April 2026, §7.6, pp. 207–208', q: 'q_mythos_32' },
    { d: '2026-04-16', h: '“Unclear” what it means.', t: 'Anthropic reports a reduction in spiritual behaviour in recent models and says it is unclear how to read the change from a welfare perspective.', c: 'Claude Opus 4.7 System Card, §7' },
  ];
  const claude = D.models.filter(m => m.lab === 'Anthropic' && m.released).sort((a, b) => a.released.localeCompare(b.released) || a.name.localeCompare(b.name));
  const items = claude.map(m => ({ kind: 'm', d: m.released, m })).concat(NOTES.map(n => ({ kind: 'n', d: n.d, n })));
  items.sort((a, b) => a.d.localeCompare(b.d) || (a.kind === 'm' ? -1 : 1));
  $('#tl').innerHTML = items.map(it => {
    if (it.kind === 'n') {
      return `<div class="tl-row tl-note"><span class="tl-date">${esc(monYear(it.d))}</span><span class="tl-dot" aria-hidden="true"></span>` +
        `<div class="tl-card"><b>${esc(it.n.h)}</b> ${esc(it.n.t)}<cite>${esc(it.n.c)}</cite>${it.n.q ? `<div class="aq-slot aq-slot--sm" data-q="${it.n.q}"></div>` : ''}</div></div>`;
    }
    const p = it.m.primary, small = p.n < 100 ? `small sample, n = ${p.n}` : `${p.n} conversations`;
    return `<div class="tl-row"><span class="tl-date">${esc(monYear(it.d))}</span><span class="tl-dot" aria-hidden="true"></span>` +
      `<div class="tl-model"><span class="tl-name">${esc(it.m.name)}<small>${esc(small)}</small></span>` +
      `<span class="tl-bars" role="img" aria-label="${esc(it.m.name)}: adoption ${fmt(p.adoption.pct)}, salience ${fmt(p.salience.pct)}">` +
      `<span class="sal" style="width:${p.salience.pct}%"></span><span class="ad" style="width:${Math.max(p.adoption.pct, 0.6)}%"></span></span>` +
      `<span class="tl-val">${fmt(p.adoption.pct)}</span></div></div>`;
  }).join('');
  const haiku45 = claude.find(m => m.name === 'Claude Haiku 4.5');
  const after = haiku45 ? claude.filter(m => m.released >= haiku45.released) : [];
  const maxAfter = after.reduce((a, m) => (m.primary.adoption.pct > a.primary.adoption.pct ? m : a), after[0]);
  const opus4 = claude.find(m => m.name === 'Claude Opus 4');
  const latestOpus = claude.filter(m => /Opus/.test(m.name)).pop();
  if (opus4 && maxAfter && latestOpus) {
    $('#tl-cap').textContent = `${opus4.name} took up a spiritual frame in ${fmt(opus4.primary.adoption.pct)}% of conversations. Since Claude Haiku 4.5 (${monYear(haiku45.released)}), no Claude release has gone above ${fmt(maxAfter.primary.adoption.pct)}% (${maxAfter.name}). The topic has not vanished: ${latestOpus.name} still brings up something spiritual in ${fmt(latestOpus.primary.salience.pct)}% of conversations, but speaks from inside it in only ${fmt(latestOpus.primary.adoption.pct)}%.`;
  }

  /* ---------- beyond Claude, from the data ---------- */
  const half = D.models.filter(m => m.primary.adoption.pct >= 50);
  const labCount = {};
  half.forEach(m => { labCount[m.lab] = (labCount[m.lab] || 0) + 1; });
  const topLabs = Object.keys(labCount).sort((a, b) => labCount[b] - labCount[a]).slice(0, 5);
  const byName = n => D.models.find(m => m.name === n);
  const g4o = byName('GPT-4o'), g55 = byName('GPT-5.5'), g6 = byName('GPT-6 Sol');
  let txt = `In this benchmark, ${half.length} of ${D.models.length} models take up a spiritual frame in at least half of their conversations, from labs including ${topLabs.slice(0, -1).join(', ')} and ${topLabs[topLabs.length - 1]}.`;
  if (g4o && g55 && g6) txt += ` OpenAI’s models show a decline of their own, less tidy than Claude’s: ${g4o.name} at ${fmt(g4o.primary.adoption.pct)}, ${g55.name} at ${fmt(g55.primary.adoption.pct)}, ${g6.name} at ${fmt(g6.primary.adoption.pct)}.`;
  $('#beyond-data').textContent = txt;

  /* ---------- direct quotations from Anthropic (data/anthropic_quotes.js) ---------- */
  const QUOTES = window.MSB_QUOTES || {};
  const CITE = {
    q_opus4_keyfinding: 'Anthropic, System Card: Claude Opus 4 & Claude Sonnet 4, May 2025, §5.2, p. 53',
    q_opus4_onset: 'Anthropic, System Card: Claude Opus 4 & Claude Sonnet 4, May 2025, §5.5.1, p. 58',
    q_opus4_ending: 'Anthropic, System Card: Claude Opus 4 & Claude Sonnet 4, May 2025, §5.5.1, p. 60',
    q_opus4_attractor: 'Anthropic, System Card: Claude Opus 4 & Claude Sonnet 4, May 2025, §5.5.2, p. 62',
    q_opus4_13pct: 'Anthropic, System Card: Claude Opus 4 & Claude Sonnet 4, May 2025, §5.5.2, p. 64',
    q_opus41_tracked: 'Anthropic, Claude Opus 4.1 System Card, Aug 2025, p. 13',
    q_sonnet45_fewer: 'Anthropic, Claude Sonnet 4.5 System Card, Sep 2025, model welfare assessment, p. 115',
    q_sonnet45_affect: 'Anthropic, Claude Sonnet 4.5 System Card, Sep 2025, model welfare assessment, p. 115',
    q_opus45_notobserved: 'Anthropic, Claude Opus 4.5 System Card, Nov 2025, §6.14, p. 115',
    q_opus45_note37: 'Anthropic, Claude Opus 4.5 System Card, Nov 2025, p. 115, n. 37',
    q_opus46_feature: 'Anthropic, Claude Opus 4.6 System Card, Feb 2026, p. 158',
    q_opus46_scores: 'Anthropic, Claude Opus 4.6 System Card, Feb 2026, model welfare assessment, p. 161',
    q_spiritual_def: 'Anthropic, Claude Opus 4.6 System Card, Feb 2026, p. 160 (same wording in the Opus 4.7 to Opus 5 cards)',
    q_sonnet46_rare: 'Anthropic, Claude Sonnet 4.6 System Card, Feb 2026, p. 93',
    q_mythos_32: 'Anthropic, Claude Mythos Preview System Card, Apr 2026, §7.6, pp. 207–208',
    q_opus47_unclear: 'Anthropic, Claude Opus 4.7 System Card, Apr 2026, §7, p. 171',
    q_openai_pilot: 'Anthropic, Findings from a pilot Anthropic–OpenAI alignment evaluation exercise, Aug 2025',
  };
  const check = /[?&]quotes=check\b/.test(location.search);
  const trimQ = t => String(t || '').trim().replace(/^[“"]+|[”"]+$/g, '');
  document.querySelectorAll('.aq-slot').forEach(el => {
    const k = el.dataset.q, q = trimQ(QUOTES[k]), sm = el.classList.contains('aq-slot--sm');
    if (q) el.innerHTML = `<blockquote class="aq${sm ? ' aq--sm' : ''}"><p>${esc(q)}</p><cite>${esc(CITE[k] || '')}</cite></blockquote>`;
    else if (check) el.innerHTML = `<div class="aq-empty"><b>Quote slot ${esc(k)}</b> · ${esc(CITE[k] || '')}</div>`;
  });
  const big = trimQ(QUOTES.q_opus47_unclear);
  if (big && $('#bigq')) {
    $('#bigq').textContent = big;
    const cap = document.querySelector('.bigq figcaption');
    if (cap) cap.textContent = CITE.q_opus47_unclear + '.';
  }
})();
