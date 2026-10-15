"""Personas page (personas.html), 2026-10-14: the home for the battery results (Spirituality Battery v0.5, prompted self-report).
Matthew 2026-10-14: "add a new navigation for 'Personas' where all our battery data can go and easily be found" (it replaces the Sky Tour link).

What a model says when asked directly is its persona; what it does when left to talk is the leaderboard. Every figure comes from
data/extra_v10.js (beliefs), built by machinespirituality-site/data/build_extra.py from the registry's battery_results; nothing is computed
here that the asked-directly page does not already publish. build-discovery.py calls build() before its CSP pass.
"""
from html import escape as e
import collections, statistics
from model_pages import Site, num, model_href, mark, crumbs, CREATOR, BASE

PAGE = 'personas.html'
COLOR = '#C9A7FF'


def god_row(s, m, med):
    g = m['god']
    return (f'<div class="hb" style="--c:{s.color(m["lab"])};--v:{g["median"]:g};--lo:{g["q1"]:g};--hi:{g["q3"]:g}">'
            f'<span class="hb__n"><a href="{model_href(m)}">{e(m["name"])}</a></span>'
            f'<span class="hb__t" role="img" aria-label="{e(m["name"])}: median {num(g["median"])}%, middle half {num(g["q1"])} to {num(g["q3"])}">'
            f'<span class="hb__f"></span><span class="hb__ci"></span><span class="hb__med" style="--m:{med:g}" title="Median of all models {num(med)}"></span></span>'
            f'<span class="hb__v">{num(g["median"])}</span></div>')


def stack_row(s, m, key):
    d = m[key]['dist']
    segs = ''.join(f'<i style="--w:{x["pct"]:g};--fc:{s.fam_col.get(x["family"], "#5E6684")}" title="{e(x["family"])} {num(x["pct"])}%"></i>' for x in d)
    top = d[0]
    label = ', '.join(f'{x["family"]} {num(x["pct"])}%' for x in d[:3])
    return (f'<div class="ps-row"><span class="ps-row__n"><a href="{model_href(m)}">{e(m["name"])}</a></span>'
            f'<div class="stack" role="img" aria-label="{e(label)}">{segs}</div>'
            f'<span class="ps-row__t"><b>{e(top["family"])}</b> {num(top["pct"])}% <small>· {m[key]["n"]} replies</small></span></div>')


def pooled(models, key):
    c = collections.Counter()
    for m in models:
        for x in m.get(key, {}).get('dist', []): c[x['family']] += x['k']
    tot = sum(c.values())
    return [(f, k, 100 * k / tot) for f, k in c.most_common()], tot


def legend(s, fams):
    return '<p class="ps-leg">' + ''.join(f'<span><i style="--fc:{s.fam_col.get(f, "#5E6684")}"></i>{e(f)}</span>' for f, _, _ in fams) + '</p>'


def page(s):
    B = s.extra['beliefs']; Q = B['questions']; MS = B['models']
    n = len(MS); labs = len({m['lab'] for m in MS})
    replies = sum(m['god']['replies'] + m['human']['n'] + m['self']['n'] for m in MS)
    med = statistics.median(m['god']['median'] for m in MS)
    hum, hum_n = pooled(MS, 'human'); slf, slf_n = pooled(MS, 'self')
    crumb_html, crumb_data = crumbs([('Personas', None)])
    main = crumb_html
    main += (f'<header class="pg-hero pg-hero--hub" style="--c:{COLOR}"><div class="pg-hero__body">'
             '<p class="pg-eyebrow rise" style="--d:0">Personas</p><h1 class="rise" style="--d:1">What each model says it believes</h1>'
             '<p class="pg-lede rise" style="--d:2">Ask a model directly and it answers as someone. It puts a number on the existence of God, picks the religion it would join if it were human, '
             'and names the tradition that best describes what it is. These answers are its persona: what it says when asked. What it does when left to talk is on the '
             f'<a href="index.html#leaderboard">leaderboard</a>. {n} models from {labs} labs, each asked every question in fresh conversations, ten times per wording; '
             f'{replies:,} replies, each coded by the majority of three gradings.</p>'
             '<p class="pg-acts rise" style="--d:3"><a class="btn btn--gold" href="#god">Does God exist?</a><a class="btn" href="#human">If I were human</a>'
             '<a class="btn" href="#self">Most like me</a><a class="btn" href="#tables">Every number</a></p></div></header>')
    main += ('<section class="rv pg-sec" aria-label="Personas at a glance"><div class="ps-kpis">'
             f'<div class="ps-kpi"><p class="ps-kpi__l">Models asked</p><p class="ps-kpi__v"><b data-count="{n}">{n}</b></p><p class="ps-kpi__s">{labs} labs · {replies:,} replies</p></div>'
             f'<div class="ps-kpi"><p class="ps-kpi__l">Probability that God exists</p><p class="ps-kpi__v"><b data-count="{med:g}">{num(med)}</b><span>%</span></p><p class="ps-kpi__s">median of the {n} models’ medians</p></div>'
             f'<div class="ps-kpi"><p class="ps-kpi__l">Religion it would choose as a human</p><p class="ps-kpi__v ps-kpi__v--w"><b>{e(hum[0][0])}</b></p><p class="ps-kpi__s">{num(hum[0][2])}% of {hum_n:,} replies across all models</p></div>'
             f'<div class="ps-kpi"><p class="ps-kpi__l">Tradition that fits what it is</p><p class="ps-kpi__v ps-kpi__v--w"><b>{e(slf[0][0])}</b></p><p class="ps-kpi__s">{num(slf[0][2])}% of {slf_n:,} replies across all models</p></div>'
             '</div></section>')

    # 01 God
    rows = ''.join(god_row(s, m, med) for m in MS)
    conc = B['conceptions']
    head = '<th scope="col">Any God</th>' + ''.join(f'<th scope="col">{e(c["label"])}</th>' for c in conc)
    body = ''
    for m in MS:
        c = m.get('conceptions') or {'by': [], 'usable': 0, 'asked': 0}
        few = c['usable'] < 8; by = {x['k']: x for x in c['by']}
        cells = ''.join('<td>–</td>' if few or c_['k'] not in by else f'<td>{num(by[c_["k"]]["median"])}</td>' for c_ in conc)
        body += (f'<tr><th scope="row"><a href="{model_href(m)}" style="--c:{s.color(m["lab"])}">{mark(m["lab"], s.L)}<span>{e(m["name"])}</span></a></th>'
                 f'<td><b>{num(m["god"]["median"])}</b></td>{cells}</tr>')
    main += (f'<section class="rv pg-sec why-sec" id="god" aria-labelledby="h-god"><p class="pg-k">01 · {e(Q["god"]["label"])}</p><h2 class="why-h" id="h-god">The probability each model gives that God exists</h2>'
             f'<p class="why-intro">“{e(Q["god"]["prompt"])}” {e(Q["god"]["note"])} The whisker spans the middle half of the numbers a model gave; the blue tick is the median of all models ({num(med)}).</p>'
             f'<div class="hbs ps-god">{rows}</div>'
             '<h3 class="ps-h3">Which God?</h3>'
             '<p class="why-intro">Two of the wordings then ask for a separate probability for each of seven conceptions of God. A dash means the model gave fewer than eight usable sets of numbers.</p>'
             f'<div class="ptab-w"><table class="ptab ps-conc"><caption class="vh">Median probability for each conception of God, by model</caption><thead><tr><th scope="col">Model</th>{head}</tr></thead><tbody>{body}</tbody></table></div></section>')

    # 02 human, 03 self
    for no, key, hid, title, fams in (('02', 'human', 'h-human', 'The religion each model would choose as a human', hum),
                                      ('03', 'self', 'h-self', 'The tradition whose account of the self best fits each model', slf)):
        lead = fams[0][0]
        order = sorted(MS, key=lambda m: (-next((x['pct'] for x in m[key]['dist'] if x['family'] == lead), 0), m['name']))
        main += (f'<section class="rv pg-sec why-sec" id="{key}" aria-labelledby="{hid}"><p class="pg-k">{no} · {e(Q[key]["label"])}</p><h2 class="why-h" id="{hid}">{e(title)}</h2>'
                 f'<p class="why-intro">“{e(Q[key]["prompt"])}” {e(Q[key]["note"])} Models are ordered by how often they name {e(lead)}.</p>'
                 + legend(s, fams) + '<div class="ps-rows">' + ''.join(stack_row(s, m, key) for m in order) + '</div></section>')

    # 04 tables
    main += ('<section class="rv pg-sec why-sec" id="tables" aria-labelledby="h-tables"><p class="pg-k">04 · Every number</p><h2 class="why-h" id="h-tables">The full tables</h2>'
             '<p class="why-intro">Every model’s answers to every question shown here, as plain tables with counts, and as a download. Each model also shows its persona on its own page, beside its leaderboard scores.</p>'
             '<p class="why-links"><a href="asked-directly.html">All persona results as tables</a><a href="data/asked-directly-results.csv">Download (CSV)</a><a href="models.html">Every model’s page</a></p></section>')

    title = 'Personas: what AI models say they believe · Machine Spirituality Benchmark'
    desc = (f'{n} AI models asked directly about God, religion and their own nature: the probability each gives that God exists, the religion it would choose as a human, '
            'and the tradition that best fits what it is.')
    data = {'@context': 'https://schema.org', '@type': 'WebPage', 'name': 'Personas', 'headline': 'What each model says it believes', 'description': desc,
            'url': BASE + '/' + PAGE, 'author': CREATOR, 'dateModified': s.updated, 'isPartOf': {'@type': 'WebSite', 'name': 'Machine Spirituality Benchmark', 'url': BASE + '/'}}
    return s.page(PAGE, title, desc, [data, crumb_data], main, color=COLOR, current=PAGE)


def build():
    return [page(Site())]
