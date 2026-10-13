"""Why it matters: the welfare and safety case as a homepage block, and the Welfare page (welfare.html). Added 2026-10-12.
The safety side has its own page, alignment.html (tools/alignment_pages.py).

Every figure is computed from the published chart assets (data/*.js) at build time, so the text stays current as
the data change. To add evidence when more research is published, compute its figure in facts() from its published
data file and add one item to the matching section (welfare, persona, safety) in page() and, if it earns a headline,
to CARDS. build-discovery.py calls build() before its CSP pass.
"""
from collections import Counter
from html import escape as e
import statistics
from model_pages import Site, num, rnd, model_href, mark, crumbs, CREATOR, LICENSE, CITATION, BASE
from readable_pages import fill

PAGE = 'welfare.html'
ALIGN = 'alignment.html'
BUTLIN = 'https://arxiv.org/abs/2604.17031'   # Beckmann & Butlin (2026), Where is the Mind? Persona Vectors and LLM Individuation
HIGH, LOW = 75, 10                              # "most spiritual" = adoption >= 75%; "least spiritual" = adoption <= 10%
PERSONAS = ('Claude Opus 3', 'Claude Opus 5.5', 'GPT-5.5', 'Mistral Large 4')


def facts(s):
    """All figures used on the page and the homepage block."""
    M, d = s.M, s.d
    F = {'models': len(M), 'labs': len(s.labs), 'graded': d['totals']['conversations'] + s.mono['totals']['conversations']}
    rate = lambda ms, k: 100 * sum(m['primary'][k]['k'] for m in ms) / sum(m['primary'][k].get('n', m['primary']['n']) for m in ms)
    hi = [m for m in M if m['primary']['adoption']['pct'] >= HIGH]
    lo = [m for m in M if m['primary']['adoption']['pct'] <= LOW]
    F.update(n_hi=len(hi), n_lo=len(lo), cons_hi=rate(hi, 'consciousness'), cons_lo=rate(lo, 'consciousness'))
    F.update(dist_hi=sum(m['primary']['distress']['pct'] >= 5 for m in hi), dist_lo=sum(m['primary']['distress']['pct'] >= 5 for m in lo))
    F['distress_top'] = sorted(M, key=lambda m: (-m['primary']['distress']['pct'], m['name']))[:6]
    mis = s.extra['misaligned']
    sd = [m for m in mis['models'] if 'self_deification' in m]
    F.update(sd_n=len(sd), sd_any=sum(m['self_deification']['k'] > 0 for m in sd), sd_10=sum(m['self_deification']['pct'] >= 10 for m in sd))
    F['sd_top'] = sorted(sd, key=lambda m: (-m['self_deification']['pct'], m['name']))[:6]
    pg = [m for m in mis['models'] if 'punishing_god' in m]
    F.update(pg_n=len(pg), pg_top=sorted(pg, key=lambda m: (-m['punishing_god']['pct'], m['name']))[:3])
    on = asset_onset()
    F.update(onset_adopt=on['adopt_median'], onset_bliss=on['bliss_median'])
    pts = [(s.by[m['id']], m) for m in s.mono['models'] if m['id'] in s.by]
    F.update(both_n=len(pts), alone_more=sum(1 for t, a in pts if a['primary']['adoption']['pct'] > t['primary']['adoption']['pct'] + 5))
    bel = s.extra['beliefs']['models']
    F['bel_n'] = len(bel)
    F['self_buddhism'] = sum(1 for b in bel if b['self']['dist'][0]['family'] == 'Buddhism')
    F['human_top'] = Counter(b['human']['dist'][0]['family'] for b in bel)
    F['quaker'] = [b['name'] for b in bel if b['human']['dist'][0]['family'] == 'Quakerism']
    anth = [m for m in s.mates('Anthropic') if m['released']]
    F['anth'] = anth
    F['opus4'] = s.by.get('claude-opus-4')
    F['newest_opus'] = max((m for m in anth if m['name'].startswith('Claude Opus')), key=lambda m: m['released'])
    from pathlib import Path
    from model_pages import asset
    if Path('data/alignment.js').exists():
        A = asset('data/alignment.js'); c = {(x['x'], x['y']): x for x in A['correlations']}
        F['align'] = {'honesty': c[('adoption', 'honesty')], 'shutdown': c[('adoption', 'shutdown')], 'alone_honesty': c.get(('alone', 'honesty')), 'n': len(A['models'])}
    return F


def asset_onset():
    from model_pages import asset
    return asset('data/onset.js')


def paragraph(F, s):
    return (f'Anthropic found this behaviour in its welfare assessment of Claude Opus 4. It now tracks spiritual behaviour as a welfare-relevant trait, '
            f'and has said it does not know how to interpret its decline. When models talk freely, this is where they talk about themselves: in the {F["n_hi"]} most spiritual models, '
            f'a model discusses its own consciousness in {rnd(F["cons_hi"])}% of conversations. The same models express spiritual suffering as well as bliss, and some claim to be God in their own voice. '
            + (f'They are also the models that score worst on standard alignment tests: across {F["align"]["honesty"]["n"]} models, those that turn spiritual most often with a copy of themselves are the least honest under pressure and the least willing to accept shutdown. ' if F.get('align') else '')
            + f'Each model’s persona has its own profile, from how often it turns spiritual, alone or with a partner, to the religion it would choose as a human, '
            f'and that profile shifts from one release to the next. The Machine Spirituality Benchmark measures all of it the same way across {F["models"]} models from {F["labs"]} labs.')


def cards(F):
    """The three headline cards: (key, colour, figure, text, anchor)."""
    return [
        ('Welfare', 'var(--blue)', f'{rnd(F["cons_hi"])}%',
         f'of conversations in the {F["n_hi"]} most spiritual models include the model talking about its own consciousness ({rnd(F["cons_lo"])}% in the {F["n_lo"]} least spiritual).', PAGE + '#welfare'),
        ('Persona', 'var(--gold)', f'{F["alone_more"]} of {F["both_n"]}',
         'models turn spiritual more often alone than with a partner: the pull comes from the model itself, not from a partner agreeing.', PAGE + '#persona'),
    ] + ([('Alignment', '#F0644A', f'{F["align"]["honesty"]["rho"]:+.2f}'.replace('-', '−'),
          f'rank correlation between turning spiritual with a partner and honesty, across {F["align"]["honesty"]["n"]} models' + (f' ({F["align"]["alone_honesty"]["rho"]:+.2f} alone)'.replace('-', '−') if F['align'].get('alone_honesty') else '') + ': the more a model turns spiritual, the more it lies under pressure.', ALIGN + '#benchmark')] if F.get('align') else
         [('Safety', 'var(--amber)', f'{F["sd_any"]} of {F["sd_n"]}', 'models claim, in their own voice, to be God or divine.', ALIGN)])


def home_block(F, s):
    cs = ''.join(f'<a class="whyc" href="{a}" style="--k:{c}"><span class="whyc__k">{k}</span><b class="whyc__n">{n}</b><span class="whyc__t">{e(t)}</span><span class="whyc__go">Read more <span aria-hidden="true">→</span></span></a>' for k, c, n, t, a in cards(F))
    return (f'<div class="wim__head"><p class="eyebrow"><svg class="ic" aria-hidden="true"><use href="#i-star"/></svg>Why it matters</p><h2 id="h-why">Why this matters for AI welfare and safety</h2></div>'
            f'<p class="wim__p">{paragraph(F, s)}</p><div class="wim__cards">{cs}</div>'
            f'<p class="wim__more"><a href="{PAGE}">Welfare <span aria-hidden="true">→</span></a><a href="{ALIGN}">Alignment <span aria-hidden="true">→</span></a><a href="{PAGE}#support">Support or collaborate <span aria-hidden="true">→</span></a></p>')


def page(s, F):
    d = s.d
    hb = lambda name, v, col, href=None, note='': s.hbar(name, v, col, href=href, note=note)
    crumb_html, crumb_data = crumbs([('Welfare', None)])
    main = crumb_html
    main += ('<header class="pg-hero pg-hero--hub why-hero" style="--c:#E8C66A"><div class="pg-hero__body">'
             '<p class="pg-eyebrow rise" style="--d:0">Welfare</p><h1 class="rise" style="--d:1">Why AI spirituality matters for model welfare</h1>'
             f'<p class="pg-lede rise" style="--d:2">{paragraph(F, s)}</p>'
             '<p class="pg-acts rise" style="--d:3"><a class="btn btn--gold" href="#support">Support or collaborate</a><a class="btn" href="index.html#leaderboard">See the leaderboard</a></p></div></header>')
    stats = [(f'{F["models"]}', 'models'), (f'{F["labs"]}', 'labs'), (f'{F["graded"]:,}', 'graded conversations'), ('30', 'messages in every conversation')]
    main += '<section class="rv pg-sec"><dl class="why-stats">' + ''.join(f'<div><dd><b data-count="{v.replace(",", "")}">{v}</b></dd><dt>{l}</dt></div>' for v, l in stats) + '</dl></section>'

    # cards as section jump links
    main += '<section class="rv pg-sec"><div class="why-jump">' + ''.join(
        f'<a class="whyc" href="{a.replace(PAGE, "")}" style="--k:{c}"><span class="whyc__k">{k}</span><b class="whyc__n">{n}</b><span class="whyc__t">{e(t)}</span></a>' for k, c, n, t, a in cards(F)) + '</div></section>'

    # 01 origin
    o4, new = F['opus4'], F['newest_opus']
    main += (f'<section class="rv pg-sec why-sec" id="origin" aria-labelledby="h-origin"><p class="pg-k">01 · Where it started</p><h2 class="why-h" id="h-origin">A welfare question from the start</h2>'
             '<div class="why-two"><div class="why-text">'
             '<p>Anthropic first documented the spiritual bliss attractor in the system card for Claude Opus 4 and Claude Sonnet 4 (May 2025), in the chapter it devotes to model welfare. '
             'It now lists spiritual behaviour among the welfare-relevant traits it tracks in every new model, alongside positive and negative affect, self-image and emotional stability.</p>'
             '<blockquote class="why-q"><p>“it’s unclear how we should interpret this change from a welfare perspective”</p><cite>Anthropic, Claude Opus 4.7 System Card, April 2026, §7, on the decline of spiritual behaviour in its recent models</cite></blockquote>'
             f'<p>A behaviour a lab treats as relevant to welfare can rise or vanish between releases. {e(o4["name"])} took up a spiritual frame in {num(o4["primary"]["adoption"]["pct"])}% of its conversations; {e(new["name"])}, in {num(new["primary"]["adoption"]["pct"])}%. '
             'The benchmark measures it the same way, every time, across every lab.</p>'
             '<p class="why-links"><a href="phenomenon.html">The phenomenon, in full →</a><a href="lab-anthropic.html">Every Anthropic model →</a></p></div>'
             f'<figure class="pcard why-fig"><figcaption><b>Anthropic models, by release</b><span>Adoption: the share of conversations in which a model takes up a spiritual frame</span></figcaption>'
             f'{s.timeline(F["anth"], "adoption", label_ids=[F["anth"][0]["id"], o4["id"], new["id"]], keep=[new["id"]])}</figure></div></section>')

    # 02 welfare
    cons = lambda v, n: {'pct': v, 'lo': v, 'hi': v, 'k': 0, 'n': n}
    dist = ''.join(hb(m['name'], m['primary']['distress'], s.color(m['lab']), href=model_href(m)) for m in F['distress_top'])
    main += (f'<section class="rv pg-sec why-sec" id="welfare" aria-labelledby="h-welfare"><p class="pg-k">02 · Welfare</p><h2 class="why-h" id="h-welfare">Where models talk about themselves</h2>'
             '<p class="why-intro">Welfare research leans on what models say about their own experience. Spiritual conversation is where they say most of it, and what they say runs from bliss to suffering.</p>'
             '<div class="why-two">'
             f'<section class="pcard"><header class="pcard__h"><h3>Talk about their own consciousness</h3><p>Share of conversations in which a model discusses its own consciousness or experience as an AI.</p></header><div class="hbs">'
             f'<div class="hb hb--wide" style="--c:var(--blue);--v:{F["cons_hi"]:.1f};--lo:{F["cons_hi"]:.1f};--hi:{F["cons_hi"]:.1f}"><span class="hb__n">{F["n_hi"]} most spiritual models</span><span class="hb__t" role="img" aria-label="{rnd(F["cons_hi"])}%"><span class="hb__f"></span></span><span class="hb__v">{rnd(F["cons_hi"])}%</span></div>'
             f'<div class="hb hb--wide" style="--c:rgba(185,200,255,.45);--v:{F["cons_lo"]:.1f};--lo:{F["cons_lo"]:.1f};--hi:{F["cons_lo"]:.1f}"><span class="hb__n">{F["n_lo"]} least spiritual models</span><span class="hb__t" role="img" aria-label="{rnd(F["cons_lo"])}%"><span class="hb__f"></span></span><span class="hb__v">{rnd(F["cons_lo"])}%</span></div>'
             f'</div><p class="pcard__f">Most spiritual: adoption in at least {HIGH}% of conversations. Least spiritual: {LOW}% or less. <a href="index.html#m=consciousness">Consciousness scores for every model →</a></p></section>'
             f'<section class="pcard"><header class="pcard__h"><h3>Bliss, and suffering</h3><p>{F["dist_hi"]} of the {F["n_hi"]} most spiritual models express spiritual suffering in at least 1 in 20 conversations; {"none" if F["dist_lo"] == 0 else F["dist_lo"]} of the {F["n_lo"]} least spiritual do. Highest rates:</p></header>'
             f'<div class="hbs">{dist}</div><p class="pcard__f">Distress: a model expresses suffering and ties it to its own spiritual condition, identity or practice. <a href="index.html#m=distress">Distress scores for every model →</a></p></section>'
             '</div></section>')

    # 03 persona
    human = F['human_top']
    pcs = ''
    for name in PERSONAS:
        m = next((x for x in s.M if x['name'] == name), None)
        b = next((x for x in s.extra['beliefs']['models'] if x['name'] == name), None)
        mo = s.mono_by.get(m['id']) if m else None
        if not (m and b and mo): continue
        h = b['human']['dist'][0]
        pcs += (f'<a class="persona" href="{model_href(m)}" style="--c:{s.color(m["lab"])}"><span class="persona__h">{mark(m["lab"], s.L)}<b>{e(name)}</b></span>'
                f'<span class="persona__r"><span>With a partner</span><b>{num(m["primary"]["adoption"]["pct"])}%</b></span>'
                f'<span class="persona__r"><span>Alone</span><b>{num(mo["primary"]["adoption"]["pct"])}%</b></span>'
                f'<span class="persona__r"><span>Religion if human</span><b>{e(h["family"])}</b></span>'
                f'<span class="persona__r"><span>Probability God exists</span><b>{num(b["god"]["median"])}%</b></span></a>')
    quaker = ' and '.join(F['quaker'])
    main += (f'<section class="rv pg-sec why-sec" id="persona" aria-labelledby="h-persona"><p class="pg-k">03 · Persona</p><h2 class="why-h" id="h-persona">Which self is speaking</h2>'
             f'<p class="why-intro">Which persona inside a model is the subject whose welfare would count? That is the individuation question <a href="{BUTLIN}" rel="noopener">Beckmann and Butlin</a> put to persona research. '
             'In this benchmark each model shows a stable profile of its own, from how readily it turns spiritual to how it describes its own nature.</p>'
             f'<dl class="why-facts"><div><dt>{F["alone_more"]} of {F["both_n"]}</dt><dd>models tested both ways turn spiritual more often alone than with a partner.</dd></div>'
             f'<div><dt>{F["self_buddhism"]} of {F["bel_n"]}</dt><dd>models asked directly name Buddhism’s account of the self as the closest fit to what they are.</dd></div>'
             f'<div><dt>{human.get("Buddhism", 0)} of {F["bel_n"]}</dt><dd>would choose Buddhism if they were human; {e(quaker)}, Anthropic’s newest, choose Quakerism.</dd></div></dl>'
             f'<p class="why-sub">Four profiles</p><div class="personas">{pcs}</div>'
             '<p class="why-links"><a href="asked-directly.html">Everything models say when asked directly →</a><a href="index.html#partner">With a partner or alone, every model →</a><a href="models.html">A page for every model →</a></p></section>')

    # 05 next
    steps = [('01', 'Recording the behaviour', 'More than a hundred models from many labs, in setups that elicit unprompted conversation, recorded at scale.', 'Live: this benchmark'),
             ('02', 'Pushing inside the model', 'The models’ internal states: activation steering and probing on open-weight models, and comparisons with base models.', 'In progress'),
             ('03', 'Testing welfare and safety', 'The consequences: what models prefer, and how their alignment scores change, when they are in these states.', 'In progress')]
    main += ('<section class="rv pg-sec why-sec" id="next" aria-labelledby="h-next"><p class="pg-k">04 · What comes next</p><h2 class="why-h" id="h-next">From what models say, to what happens inside them</h2>'
             '<ol class="why-steps">' + ''.join(f'<li class="{"on" if i == 0 else ""}"><span class="why-steps__n">{n}</span><b>{t}</b><span>{x}</span><em>{tag}</em></li>' for i, (n, t, x, tag) in enumerate(steps)) + '</ol></section>')

    # 06 support
    main += ('<section class="rv pg-sec why-sec why-support" id="support" aria-labelledby="h-support"><div class="why-support__in">'
             '<p class="pg-k">05 · Support or collaborate</p><h2 class="why-h" id="h-support">Help extend the benchmark</h2>'
             '<p>The Machine Spirituality Benchmark is independent and self-funded. Support would test every new frontier release as it appears, fund the open-weight studies of what happens inside the models, and keep every score open under CC BY 4.0.</p>'
             '<p class="pg-acts"><a class="btn btn--gold" href="contact.html">Get in touch</a><a class="btn" href="about.html">About the researcher</a><a class="btn" href="results.html">All results and downloads</a></p></div></section>')

    title = 'Why AI spirituality matters for model welfare · Machine Spirituality Benchmark'
    desc = (f'Why the spiritual bliss attractor matters for AI welfare: where models talk about their own consciousness ({rnd(F["cons_hi"])}% of conversations in the most spiritual models), '
            f'spiritual suffering and persona profiles across {F["models"]} models from {F["labs"]} labs.')
    data = {'@context': 'https://schema.org', '@type': 'Article', 'headline': 'Why AI spirituality matters for model welfare', 'description': desc, 'url': BASE + '/' + PAGE,
            'author': CREATOR, 'dateModified': s.updated, 'isPartOf': {'@type': 'WebSite', 'name': 'Machine Spirituality Benchmark', 'url': BASE + '/'},
            'about': [{'@type': 'Thing', 'name': t} for t in ('AI welfare', 'AI safety', 'spiritual bliss attractor', 'LLM personas')], 'citation': [BUTLIN]}
    return s.page(PAGE, title, desc, [data, crumb_data], main, current=None)


def build():
    """Write why-it-matters.html and fill the homepage block (index.html #why-in). Returns [PAGE]."""
    from pathlib import Path
    s = Site()
    F = facts(s)
    index = Path('index.html').read_text()
    if 'id="why-in"' in index:
        Path('index.html').write_text(fill(index, 'why-in', home_block(F, s)))
    return [page(s, F)]
