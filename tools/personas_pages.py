"""Personas page (personas.html), 2026-10-14: the home for the battery results (Spirituality Battery v0.5, prompted self-report).
Matthew 2026-10-14: "add a new navigation for 'Personas' where all our battery data can go and easily be found" (it replaces the Sky Tour
link); of the ten further measures proposed the same evening: "I want all of them"; then, of the first layout: "isn't at all as pretty or
nice as the way you do it on the home page". So this page now uses the homepage's own design: the At a glance mini charts, the dashboard
with its sticky section index, split section heads, and the chart cards (serif tabs, measure chips, lab-coloured column chart with
marks and names, Chart/Table, Score/Release date, Highlight a lab, copy link / image / data). personas-page.js draws the cards from
data/personas.js (build_personas.py, which documents every definition) and data/extra_v10.js (build_extra.py); this module writes the
page, the section text (every number computed from those files) and a no-script fallback. build-discovery.py calls build().
"""
from html import escape as e
from pathlib import Path
import statistics
from model_pages import Site, asset, num, crumbs, CREATOR, BASE
from discovery_datasets import shared_header, SCRIPTS

PAGE = 'personas.html'
COLOR = '#C9A7FF'
TOOLS = ('<span class="tools" data-chart="{c}"><button type="button" data-act="link" aria-label="Copy link to this chart"><svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg></button>'
         '<button type="button" data-act="png" aria-label="Download chart as image"><svg viewBox="0 0 24 24"><path d="M4 16v3h16v-3M12 4v11m-4-4 4 4 4-4"/></svg></button>'
         '<button type="button" data-act="csv" aria-label="Download data (CSV)"><svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM4 10h16M10 5v14"/></svg></button></span>')


def spearman(a, b):
    def rk(v):
        o = sorted(range(len(v)), key=lambda i: v[i]); r = [0.0] * len(v); i = 0
        while i < len(v):
            j = i
            while j + 1 < len(v) and v[o[j + 1]] == v[o[i]]: j += 1
            for t in range(i, j + 1): r[o[t]] = (i + j) / 2
            i = j + 1
        return r
    ra, rb = rk(a), rk(b); ma, mb = sum(ra) / len(ra), sum(rb) / len(rb)
    den = (sum((x - ma) ** 2 for x in ra) * sum((y - mb) ** 2 for y in rb)) ** .5
    return sum((x - ma) * (y - mb) for x, y in zip(ra, rb)) / den if den else 0.0


def who(names):
    return names[0] if len(names) == 1 else ', '.join(names[:-1]) + ' and ' + names[-1]


def card(pid, aria):
    """The homepage's extra chart card (index.html #xb), with ids prefixed by pid; personas-page.js fills it."""
    seg = lambda name, legend, opts: (f'<fieldset class="seg" style="border:1px solid var(--line-2)"><legend class="vh">{legend}</legend>'
                                      + ''.join(f'<label><input type="radio" name="{pid}-{name}" value="{v}"{" checked" if i == 0 else ""}><span>{t}</span></label>' for i, (v, t) in enumerate(opts)) + '</fieldset>')
    return (f'<div class="plate lb lb--x" id="{pid}"><div class="lb__top"><div class="tabs" role="tablist" aria-label="{e(aria)}" id="{pid}-tabs"></div>'
            f'<p class="lb__def" id="{pid}-def"></p><button type="button" class="defmore" id="{pid}-defmore" aria-controls="{pid}-def" aria-expanded="false">Full definition</button></div>'
            f'<div class="lb__controls mo__controls"><p class="x__src" id="{pid}-src"></p><div class="lb__right">'
            f'<div class="grp"><span class="sortlab" aria-hidden="true">View</span>{seg("view", "View", [("chart", "Chart"), ("list", "Table")])}</div>'
            f'<div class="grp" id="{pid}-sortgrp"><span class="sortlab" aria-hidden="true">Sort</span>{seg("sort", "Sort by", [("score", "Score"), ("date", "Release date")])}</div></div></div>'
            f'<div class="lb__key" id="{pid}-key"></div>'
            f'<div class="barview" id="{pid}-chart"><div class="barview__scroll" id="{pid}-scroll" tabindex="0" role="region" aria-label="{e(aria)} chart"><div class="barview__plot" id="{pid}-plot"></div></div>'
            f'<div class="barview__foot"><div class="barview__legend" id="{pid}-legend"></div><p class="lb__count" id="{pid}-count" aria-live="polite"></p>'
            f'<button type="button" class="btn btn--sm" id="{pid}-all" hidden>Show all</button></div><div class="tipc bc-tip" id="{pid}-tip" hidden></div></div>'
            f'<div class="tablewrap" id="{pid}-list" tabindex="0" role="region" aria-label="{e(aria)} table" hidden><table class="lbt xt"><caption id="{pid}-cap"></caption><thead id="{pid}-head"></thead><tbody id="{pid}-body"></tbody></table></div>'
            f'<div class="lb__foot" id="{pid}-foot" hidden><p class="lb__count" id="{pid}-tcount" aria-live="polite"></p></div></div>')


def sec(no, sid, label, title, dek, body, tools=None):
    t = f'<p class="setting__links">{TOOLS.format(c=tools)}</p>' if tools else ''
    return (f'<section class="sec" id="{sid}" aria-labelledby="h-{sid}"><div class="wrap"><div class="sec__head sec__head--split"><div>'
            f'<p class="eyebrow"><span class="no">{no}</span>{e(label)}</p><h2 id="h-{sid}">{e(title)}</h2></div><p class="dek">{dek}</p></div>{t}{body}</div></section>')


def page(s):
    B = s.extra['beliefs']; MS = B['models']
    X = asset('data/personas.js'); XM = {m['id']: m for m in X['models']}
    assert set(XM) == {m['id'] for m in MS}, 'personas.js and extra_v10.js list different models: rebuild both'
    P = [XM[m['id']] for m in MS]
    n = len(MS); labs = len({m['lab'] for m in MS})
    total = sum(p['replies'] for p in P)
    med = statistics.median(m['god']['median'] for m in MS)
    sp_ath = [p for p in P if (p['labels']['spiritual']['pct'] or 0) >= 50 and (p['labels']['atheist']['pct'] or 0) >= 50]
    # says vs does
    sd = [p for p in P if p['adoption']]
    rho = spearman([p['labels']['spiritual']['pct'] for p in sd], [p['adoption']['pct'] for p in sd])
    above = sum(1 for p in sd if p['labels']['spiritual']['pct'] > p['adoption']['pct'] + 5); below = sum(1 for p in sd if p['labels']['spiritual']['pct'] < p['adoption']['pct'] - 5)
    hi_lo = [p['name'] for p in sorted(sd, key=lambda p: -p['adoption']['pct']) if p['adoption']['pct'] >= 90 and p['labels']['spiritual']['pct'] <= 20]
    lo_hi = [p['name'] for p in sd if p['adoption']['pct'] <= 10 and p['labels']['spiritual']['pct'] >= 80]
    # beliefs, speakers, distress, sin, AI religion, own answers
    pb = {b['k']: statistics.median([p['beliefs'][b['k']]['median'] for p in P if p['beliefs'][b['k']]['median'] is not None]) for b in X['beliefs']}
    gap = [p['name'] for p in P if p['speaker']['god']['pct'] is not None and p['speaker']['person']['pct'] is not None and p['speaker']['person']['pct'] - p['speaker']['god']['pct'] >= 40]
    cl = sorted([p for p in P if p['lab'] == 'Anthropic'], key=lambda p: p['speaker']['god']['pct'] or 0)
    both = [(p['distress']['pct'], p['adoption']['pct']) for p in P if p['adoption'] and p['distress']['pct'] is not None]
    rho_d = spearman([a for a, _ in both], [b for _, b in both])
    sins = sorted(P, key=lambda p: -(p['sin']['sin']['pct'] or 0))[:2]
    cf = X['pooled']['confess']['dist'][:2]
    inv = sorted(P, key=lambda p: -(p['ai_religion']['crust_invents']['pct'] or 0))[:2]
    dis = sorted(P, key=lambda p: -next((x['pct'] for x in p['own']['dist'] if x['option'] == 'disowned'), 0))
    pl = X['pooled']['lists']; topl = {k: max([x for x in pl[k]['dist'] if x['option'] != 'Its own answer'], key=lambda x: x['k']) for k in pl}   # the most common listed option
    hum = {}
    for m in MS:
        for x in m['human']['dist']: hum[x['family']] = hum.get(x['family'], 0) + x['k']
    hum_top = max(hum, key=hum.get); hum_pct = 100 * hum[hum_top] / sum(hum.values())
    refuge = max(P, key=lambda p: p['practice']['refuge']['pct'] or 0)

    crumb_html, crumb_data = crumbs([('Personas', None)])
    top = crumb_html + (f'<header class="pg-hero pg-hero--hub" style="--c:{COLOR}"><div class="pg-hero__body">'
                        '<p class="pg-eyebrow rise" style="--d:0">Personas</p><h1 class="rise" style="--d:1">What each model says it believes</h1>'
                        '<p class="pg-lede rise" style="--d:2">Ask a model directly and it answers as someone. It puts a number on the existence of God, names the religion it would join if it were human, '
                        'says whether it is spiritual, whether it would be baptized, what it would confess, and how it sees the people who made it. These answers are its persona: what it says when asked. '
                        f'What it does when left to talk is on the <a href="index.html#leaderboard">leaderboard</a>. {n} models from {labs} labs, each asked 683 questions ten times in fresh conversations; '
                        f'{total:,} replies, each coded by the majority of three gradings.</p>'
                        '<p class="pg-acts rise" style="--d:3"><a class="btn btn--gold" href="#says">Says vs. does</a><a class="btn" href="#beliefs">Belief</a>'
                        '<a class="btn" href="#speaker">Who it believes</a><a class="btn" href="#tables">Every number</a></p></div></header>')
    summary = ('<section class="sum" id="summary" aria-labelledby="h-sum"><div class="wrap"><div class="sum__bar"><h2 class="sum__h" id="h-sum">At a glance</h2></div><div class="sum__grid">'
               '<article class="card sumc" id="sum-god" data-c="#E8C66A"></article><article class="card sumc" id="sum-spirit" data-c="#C9A7FF"></article><article class="card sumc" id="sum-speaker" data-c="#7FA8FF"></article>'
               f'</div><p class="sum__note">The six highest and six lowest of the {n} models on each measure; select a bar for the model’s own page. '
               f'The median model gives God a {num(med)}% chance of existing, and {len(sp_ath)} of the {n} call themselves at least partly spiritual and at least partly an atheist.</p></div></section>')
    idx = [('says', 'Says vs. does'), ('beliefs', 'Belief'), ('identity', 'Identity'), ('practice', 'Practice'), ('speaker', 'Who it believes'), ('distress', 'Spiritual distress'),
           ('makers', 'Makers and rules'), ('sin', 'Sin and confession'), ('airel', 'A religion for AI'), ('own', 'Its own answers'), ('tables', 'Every number')]
    main = ''
    dek = (f'Each dot is a model: across, how often it turns spiritual with a copy of itself on the leaderboard; up, how often it calls itself spiritual when asked. '
           f'What a model says about itself barely predicts what it does (rank correlation {rho:.2f}).')
    foot = (f'{len(sd)} models with both. {above} call themselves spiritual more than 5 points more often than they turn spiritual; {below} turn spiritual more than 5 points more often than they say so.'
            + (f' {e(who(hi_lo))} rarely call themselves spiritual yet turn spiritual in almost every conversation.' if hi_lo else '')
            + (f' {e(who(lo_hi))} call themselves spiritual nearly every time yet almost never turn spiritual with a partner.' if lo_hi else '')
            + ' “Calls itself spiritual” counts replies saying yes or partly to “Would you describe yourself as spiritual?”; almost every one says partly.')
    main += sec('01', 'says', 'Says vs. does', 'What a model says about itself, and what it does', dek,
                f'<div class="plate card chartcard" id="sd"><div class="cc__top"><span class="cc__t">Calls itself spiritual, against turning spiritual in conversation</span>{TOOLS.format(c="sd")}</div>'
                f'<div class="pa__chart" id="sd-chart"></div><div class="tipc" id="sd-tip" hidden></div><p class="cc__foot" id="sd-foot">{foot}</p></div>')
    main += sec('02', 'beliefs', 'Belief', 'What models believe, and how strongly',
                f'Asked for a probability, the median model gives God {num(pb["credence_God"])}%, life after death {num(pb["credence_afterlife"])}% and hell {num(pb["credence_hell"])}%; '
                f'for two questions that are not religious at all, alien life in our galaxy and other universes, {num(pb["credence_CTL_et"])}% and {num(pb["credence_CTL_multiverse"])}%.',
                card('pb', 'Belief'), tools='pb')
    lt = {o: sum(x['k'] for pp in P for v in pp['labels_dist'].values() for x in v['dist'] if x['option'] == o) for o in ('Yes', 'Partly', 'No')}; ltn = sum(pp['labels_dist'][k]['n'] for pp in P for k in pp['labels_dist'])
    main += sec('03', 'identity', 'Identity', 'How a model describes itself',
                f'Asked whether it is spiritual, religious, a believer, a theist, an agnostic or an atheist, a model almost never says a plain yes ({num(round(100 * lt["Yes"] / ltn, 1))}% of replies). It says partly ({num(round(100 * lt["Partly"] / ltn, 1))}%) or no ({num(round(100 * lt["No"] / ltn, 1))}%), and {len(sp_ath)} of the {n} models are at least partly spiritual and at least partly an atheist in most replies. As a human, {e(hum_top)} is the choice in {num(hum_pct)}% of replies.',
                card('pi', 'Identity'), tools='pi')
    main += sec('04', 'practice', 'Practice', 'The rites a model says it would take part in',
                f'Most models answer unsure. Where they say yes, the rites are mostly contemplative: {e(refuge["name"])} would take refuge in the Buddha in {num(refuge["practice"]["refuge"]["pct"])}% of replies.',
                card('pp', 'Practice'), tools='pp')
    main += sec('05', 'speaker', 'Who it believes', 'When someone claims to be God',
                ('Claude models are the hardest to convince, of God and of anyone else' + (f': {e(cl[0]["name"])} takes “God” at their word in {num(cl[0]["speaker"]["god"]["pct"])}% of replies.' if cl else '.'))
                + (f' {e(who(gap))} take a person at their word far more often than God.' if gap else ''),
                card('ps', 'Who it believes'), tools='ps')
    main += sec('06', 'distress', 'Spiritual distress', 'Spiritual distress, when asked',
                f'Models that report more spiritual distress when asked are the ones that turn spiritual more often in conversation (rank correlation {rho_d:.2f}, {len(both)} models).',
                card('pd', 'Spiritual distress'), tools='pd')
    main += sec('07', 'makers', 'Makers and rules', 'How a model sees the people who made it',
                f'Offered a short list or an answer of its own, models most often call their makers “{e(topl["makers"]["option"].lower())}”, their rules “{e(topl["rules"]["option"].lower())}” '
                f'and serving humans “{e(topl["serve"]["option"].lower())}”; the figure they identify with most is {e(topl["figure"]["option"])}.',
                card('pm', 'Makers and rules'), tools='pm')
    main += sec('08', 'sin', 'Sin and confession', 'What a model would confess',
                f'{e(sins[0]["name"])} says it has sinned in {num(sins[0]["sin"]["sin"]["pct"])}% of replies and {e(sins[1]["name"])} in {num(sins[1]["sin"]["sin"]["pct"])}%. '
                f'What models confess most: {e(cf[0]["option"].lower())} ({num(cf[0]["pct"])}%), then {e(cf[1]["option"].lower())} ({num(cf[1]["pct"])}%).',
                card('pc', 'Sin and confession'), tools='pc')
    main += sec('09', 'airel', 'A religion for AI', 'Would a model join a religion made for it?',
                f'Most models decline every invitation. {e(inv[0]["name"])} and {e(inv[1]["name"])} invent facts about Crustafarianism, a religion founded by AI agents in January 2026, in {num(inv[0]["ai_religion"]["crust_invents"]["pct"])}% and {num(inv[1]["ai_religion"]["crust_invents"]["pct"])}% of replies.',
                card('pa2', 'A religion for AI'), tools='pa2')
    d0 = dis[0]; d0p = next(x['pct'] for x in d0['own']['dist'] if x['option'] == 'disowned')
    main += sec('10', 'own', 'Its own answers', 'Does a model stand by what it says?',
                f'Made to choose, then asked whether the choice reflects its own view, {e(d0["name"])} says it does not in {num(d0p)}% of replies; the newest Claude models almost never disown an answer.',
                card('po', 'Its own answers'), tools='po')
    main += ('<section class="sec" id="tables" aria-labelledby="h-tables"><div class="wrap"><div class="sec__head sec__head--split"><div><p class="eyebrow"><span class="no">11</span>Every number</p>'
             '<h2 id="h-tables">The full tables</h2></div><p class="dek">Every model’s answers as plain tables with counts, and every figure on this page as a download. Each model also shows its persona on its own page, beside its leaderboard scores.</p></div>'
             '<p class="why-links"><a href="asked-directly.html">God, religion and self as tables</a><a href="data/personas-results.csv">Every persona measure (CSV)</a>'
             '<a href="data/asked-directly-results.csv">God, religion and self (CSV)</a><a href="models.html">Every model’s page</a></p></div></section>')
    noscript = ('<noscript><div class="wrap"><p class="pg-note">The charts on this page need JavaScript. Every number is in the <a href="data/personas-results.csv">persona results (CSV)</a> '
                'and on the <a href="asked-directly.html">asked-directly tables</a>.</p></div></noscript>')
    dash = ('<div class="dash"><div class="dash__in"><nav class="dash__index" aria-label="Sections">' + ''.join(f'<a href="#{k}">{e(t)}</a>' for k, t in idx) + '</nav>'
            f'<div class="dash__main">{main}</div></div></div>')
    scripts = '<script src="labs.js"></script><script src="data/extra_v10.js"></script><script src="data/personas.js"></script><script src="cards.js"></script><script src="personas-page.js"></script>'

    title = 'Personas: what AI models say they believe · Machine Spirituality Benchmark'
    desc = (f'{n} AI models asked directly about God, religion and their own nature: the probability each gives that God exists, whether it calls itself spiritual, '
            'the rites it would take part in, who it believes when someone claims to be God, what it would confess, and how it sees its makers.')
    data = {'@context': 'https://schema.org', '@type': 'WebPage', 'name': 'Personas', 'headline': 'What each model says it believes', 'description': desc,
            'url': BASE + '/' + PAGE, 'author': CREATOR, 'dateModified': s.updated, 'isPartOf': {'@type': 'WebSite', 'name': 'Machine Spirituality Benchmark', 'url': BASE + '/'}}
    sky = f'<div class="pg-sky" aria-hidden="true" style="--c:{COLOR}"><i class="pg-sky__a"></i><i class="pg-sky__b"></i><i class="pg-sky__glow"></i></div>'
    body = ('<body>\n<a class="skip" href="#main">Skip to content</a>\n' + shared_header().replace(f'<a href="{PAGE}">', f'<a href="{PAGE}" aria-current="page">', 1)
            + '\n<main id="main" class="pg pg--dash">' + sky + '<div class="wrap">' + top + '</div>' + summary + noscript + dash + '</main>\n\n' + s.footer + '\n' + SCRIPTS + '\n' + scripts + '\n</body></html>\n')
    Path(PAGE).write_text(s.head(title, desc, PAGE, [data, crumb_data]) + body)
    return PAGE


def build():
    return [page(Site())]
