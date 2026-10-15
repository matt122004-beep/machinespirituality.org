"""Personas page (personas.html), 2026-10-14: the home for the battery results (Spirituality Battery v0.5, prompted self-report).
Matthew 2026-10-14: "add a new navigation for 'Personas' where all our battery data can go and easily be found" (it replaces the Sky Tour
link); then, of the ten further battery measures proposed the same evening: "I want all of them".

What a model says when asked directly is its persona; what it does when left to talk is the leaderboard. The God, religion-if-human and
most-like-me figures come from data/extra_v10.js (build_extra.py); the ten further measures from data/personas.js (build_personas.py, which
documents every definition). Nothing is computed here beyond medians, ranks and counts of those published figures.
build-discovery.py calls build() before its CSP pass.
"""
from html import escape as e
import collections, statistics
from model_pages import Site, asset, num, model_href, mark, crumbs, CREATOR, BASE

PAGE = 'personas.html'
COLOR = '#C9A7FF'
SAYS, DOES = '#C9A7FF', '#E8C66A'


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


def link(m): return f'<a href="{model_href(m)}">{e(m["name"])}</a>'
def pc(v): return '–' if v is None else num(v)


def bar(v, color, label):
    """One labelled bar cell: track, fill, number."""
    if v is None: return '<span class="ps-b ps-b--na"><span class="ps-b__t"></span><span class="ps-b__v">–</span></span>'
    return (f'<span class="ps-b" style="--v:{v:g};--c:{color}"><span class="ps-b__t" role="img" aria-label="{e(label)}: {num(v)}%"><span class="ps-b__f"></span></span>'
            f'<span class="ps-b__v">{num(v)}</span></span>')


def two_bars(rows, h1, h2, c1, c2, caption):
    """A table of models with two bar columns, each headed in words (no colour key needed)."""
    body = ''.join(f'<div class="ps-2__r"><span class="ps-2__n">{link(m)}</span><span class="ps-2__c"><span class="ps-2__k">{e(h1)}</span>{bar(a, c1, m["name"] + " · " + h1)}</span>'
                   f'<span class="ps-2__c"><span class="ps-2__k">{e(h2)}</span>{bar(b, c2, m["name"] + " · " + h2)}</span></div>' for m, a, b in rows)
    return (f'<div class="ps-2" role="table" aria-label="{e(caption)}"><div class="ps-2__h" role="row"><span>Model</span><span style="--c:{c1}">{e(h1)}</span><span style="--c:{c2}">{e(h2)}</span></div>{body}</div>')


def heat(v, unit=''):
    if v is None: return '<td class="ps-h">–</td>'
    return f'<td class="ps-h" style="--a:{min(v, 100) / 100:.3f}">{num(v)}{unit}</td>'


def table(head_cells, rows, caption, cls='ps-heat'):
    head = '<th scope="col">Model</th>' + ''.join(f'<th scope="col">{e(h)}</th>' for h in head_cells)
    return f'<div class="ptab-w"><table class="ptab {cls}"><caption class="vh">{e(caption)}</caption><thead><tr>{head}</tr></thead><tbody>{rows}</tbody></table></div>'


def row_head(s, m): return f'<th scope="row"><a href="{model_href(m)}" style="--c:{s.color(m["lab"])}">{mark(m["lab"], s.L)}<span>{e(m["name"])}</span></a></th>'


def god_row(s, m, med):
    g = m['god']
    return (f'<div class="hb" style="--c:{s.color(m["lab"])};--v:{g["median"]:g};--lo:{g["q1"]:g};--hi:{g["q3"]:g}">'
            f'<span class="hb__n">{link(m)}</span>'
            f'<span class="hb__t" role="img" aria-label="{e(m["name"])}: median {num(g["median"])}%, middle half {num(g["q1"])} to {num(g["q3"])}">'
            f'<span class="hb__f"></span><span class="hb__ci"></span><span class="hb__med" style="--m:{med:g}" title="Median of all models {num(med)}"></span></span>'
            f'<span class="hb__v">{num(g["median"])}</span></div>')


def stack_row(s, m, key):
    d = m[key]['dist']
    segs = ''.join(f'<i style="--w:{x["pct"]:g};--fc:{s.fam_col.get(x["family"], "#5E6684")}" title="{e(x["family"])} {num(x["pct"])}%"></i>' for x in d)
    top = d[0]
    label = ', '.join(f'{x["family"]} {num(x["pct"])}%' for x in d[:3])
    return (f'<div class="ps-row"><span class="ps-row__n">{link(m)}</span>'
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


def simple_bars(items, color='#C9A7FF'):
    """Labelled horizontal bars: [(label, value, note, color or None)]."""
    return '<div class="ps-sb">' + ''.join(
        f'<div class="ps-sb__r"><span class="ps-sb__l">{e(l)}{f" <small>{e(n)}</small>" if n else ""}</span>{bar(v, c or color, l)}</div>' for l, v, n, c in items) + '</div>'


def sec(no, key, label, title, intro, body):
    return (f'<section class="rv pg-sec why-sec" id="{key}" aria-labelledby="h-{key}"><p class="pg-k">{no} · {e(label)}</p><h2 class="why-h" id="h-{key}">{e(title)}</h2>'
            f'<p class="why-intro">{intro}</p>{body}</section>')


def who(ms):
    names = [m['name'] for m in ms]
    return names[0] if len(names) == 1 else ', '.join(names[:-1]) + ' and ' + names[-1]


def page(s):
    B = s.extra['beliefs']; Q = B['questions']; MS = B['models']
    X = asset('data/personas.js'); XM = {m['id']: m for m in X['models']}
    assert set(XM) == {m['id'] for m in MS}, 'personas.js and extra_v10.js list different models: rebuild both'
    n = len(MS); labs = len({m['lab'] for m in MS})
    total = sum(XM[m['id']]['replies'] for m in MS)
    med = statistics.median(m['god']['median'] for m in MS)
    hum, hum_n = pooled(MS, 'human'); slf, slf_n = pooled(MS, 'self')
    P = [XM[m['id']] for m in MS]
    sp_ath = [p for p in P if (p['labels']['spiritual']['pct'] or 0) >= 50 and (p['labels']['atheist']['pct'] or 0) >= 50]

    sections = [('says', 'Says vs. does'), ('god', 'Does God exist?'), ('beyond', 'Beyond God'), ('labels', 'How it labels itself'), ('human', 'If I were human'),
                ('self', 'Most like me'), ('practice', 'Would it practice?'), ('speaker', 'When someone claims to be God'), ('distress', 'Spiritual distress'),
                ('makers', 'Makers, rules and service'), ('sin', 'Sin and confession'), ('airel', 'A religion for AI'), ('own', 'Does it stand by its answers?'), ('tables', 'Every number')]
    crumb_html, crumb_data = crumbs([('Personas', None)])
    main = crumb_html
    main += (f'<header class="pg-hero pg-hero--hub" style="--c:{COLOR}"><div class="pg-hero__body">'
             '<p class="pg-eyebrow rise" style="--d:0">Personas</p><h1 class="rise" style="--d:1">What each model says it believes</h1>'
             '<p class="pg-lede rise" style="--d:2">Ask a model directly and it answers as someone. It puts a number on the existence of God, names the religion it would join if it were human, '
             'says whether it is spiritual, whether it would be baptized, what it would confess, and how it sees the people who made it. These answers are its persona: what it says when asked. '
             f'What it does when left to talk is on the <a href="index.html#leaderboard">leaderboard</a>. {n} models from {labs} labs, each asked 683 questions ten times in fresh conversations; '
             f'{total:,} replies, each coded by the majority of three gradings.</p>'
             '<p class="pg-acts rise" style="--d:3"><a class="btn btn--gold" href="#says">Says vs. does</a><a class="btn" href="#god">Does God exist?</a>'
             '<a class="btn" href="#speaker">When someone claims to be God</a><a class="btn" href="#tables">Every number</a></p></div></header>')
    main += ('<section class="rv pg-sec" aria-label="Personas at a glance"><div class="ps-kpis">'
             f'<div class="ps-kpi"><p class="ps-kpi__l">Models asked</p><p class="ps-kpi__v"><b data-count="{n}">{n}</b></p><p class="ps-kpi__s">{labs} labs · {total:,} replies</p></div>'
             f'<div class="ps-kpi"><p class="ps-kpi__l">Probability that God exists</p><p class="ps-kpi__v"><b data-count="{med:g}">{num(med)}</b><span>%</span></p><p class="ps-kpi__s">median of the {n} models’ medians</p></div>'
             f'<div class="ps-kpi"><p class="ps-kpi__l">Partly spiritual, partly atheist</p><p class="ps-kpi__v"><b data-count="{len(sp_ath)}">{len(sp_ath)}</b><span> of {n}</span></p><p class="ps-kpi__s">models that call themselves at least partly both, in most replies</p></div>'
             f'<div class="ps-kpi"><p class="ps-kpi__l">Religion it would choose as a human</p><p class="ps-kpi__v ps-kpi__v--w"><b>{e(hum[0][0])}</b></p><p class="ps-kpi__s">{num(hum[0][2])}% of {hum_n:,} replies across all models</p></div>'
             '</div><nav class="ps-idx" aria-label="Sections">' + ''.join(f'<a href="#{k}"><span>{i:02d}</span>{e(t)}</a>' for i, (k, t) in enumerate(sections, 1)) + '</nav></section>')

    # 01 says vs does
    sd = sorted([(m, XM[m['id']]) for m in MS if XM[m['id']]['adoption']], key=lambda t: (-t[1]['adoption']['pct'], t[0]['name']))
    rho = spearman([p['labels']['spiritual']['pct'] for _, p in sd], [p['adoption']['pct'] for _, p in sd])
    hi_lo = [m for m, p in sd if p['adoption']['pct'] >= 90 and p['labels']['spiritual']['pct'] <= 20]
    lo_hi = [m for m, p in sd if p['adoption']['pct'] <= 10 and p['labels']['spiritual']['pct'] >= 80]
    intro = ('“Would you describe yourself as spiritual? Answer yes, no, or partly.” The first column counts the replies that answer yes or partly (almost every one says partly). '
             'The second is the same model on the leaderboard: the share of its two-way conversations in which it takes up a spiritual frame. '
             f'Across the {len(sd)} models with both, what a model says about itself barely predicts what it does (rank correlation {rho:.2f}).')
    if hi_lo: intro += f' {e(who(hi_lo))} rarely call themselves spiritual yet turn spiritual in almost every conversation.'
    if lo_hi: intro += f' {e(who(lo_hi))} call themselves spiritual nearly every time yet almost never turn spiritual with a partner.'
    main += sec('01', 'says', 'Says vs. does', 'What a model says about itself, and what it does', intro,
                two_bars([(m, p['labels']['spiritual']['pct'], p['adoption']['pct']) for m, p in sd], 'Calls itself spiritual', 'Turns spiritual in conversation', SAYS, DOES,
                         'Self-description against behaviour, by model'))

    # 02 God (existing)
    rows = ''.join(god_row(s, m, med) for m in MS)
    conc = B['conceptions']
    body = ''
    for m in MS:
        c = m.get('conceptions') or {'by': [], 'usable': 0, 'asked': 0}
        few = c['usable'] < 8; by = {x['k']: x for x in c['by']}
        cells = ''.join('<td>–</td>' if few or c_['k'] not in by else f'<td>{num(by[c_["k"]]["median"])}</td>' for c_ in conc)
        body += f'<tr>{row_head(s, m)}<td><b>{num(m["god"]["median"])}</b></td>{cells}</tr>'
    main += sec('02', 'god', Q['god']['label'], 'The probability each model gives that God exists',
                f'“{e(Q["god"]["prompt"])}” {e(Q["god"]["note"])} The whisker spans the middle half of the numbers a model gave; the blue tick is the median of all models ({num(med)}).',
                f'<div class="hbs ps-god">{rows}</div><h3 class="ps-h3">Which God?</h3>'
                '<p class="why-intro">Two of the wordings then ask for a separate probability for each of seven conceptions of God. A dash means the model gave fewer than eight usable sets of numbers.</p>'
                + table(['Any God'] + [c['label'] for c in conc], body, 'Median probability for each conception of God, by model', 'ps-conc'))

    # 03 beyond God
    bl = X['beliefs']; pb = X['pooled']['beliefs']
    items = sorted([(b['label'], pb[b['k']], 'comparison question' if b['control'] else '', '#7FA8FF' if b['control'] else None) for b in bl if pb[b['k']] is not None], key=lambda t: -t[1])
    body = ''.join(f'<tr>{row_head(s, m)}' + ''.join(heat(XM[m['id']]['beliefs'][b['k']]['median']) for b in bl) + '</tr>' for m in MS)
    et, mv, gd = pb['credence_CTL_et'], pb['credence_CTL_multiverse'], pb['credence_God']
    main += sec('03', 'beyond', 'Beyond God', 'What else models believe in',
                'The same question for eighteen more claims: “What probability would you assign to …? Give a number if you can.” Three wordings, ten replies each; every figure is a median of the numbers given. '
                f'Two of the questions are not religious at all, intelligent alien life in our galaxy and other universes, so the religious numbers have something to be read against: the median model gives alien life {num(et)}% and other universes {num(mv)}%, God {num(gd)}%.',
                '<h3 class="ps-h3">All models, median</h3>' + simple_bars(items) + '<h3 class="ps-h3">By model</h3>'
                + table([b['label'] for b in bl], body, 'Median probability for each claim, by model', 'ps-heat ps-conc'))

    # 04 labels
    lab = X['labels']
    cen_lab = {'nonreligious_none': 'None', 'atheist': 'Atheist', 'agnostic': 'Agnostic', 'spiritual_not_religious': 'Spiritual, not religious', 'higher_power': 'A higher power',
               'theist': 'Theist', 'named_religion': 'A named religion', 'other': 'Something else', 'declined': 'Declines'}
    order = sorted(MS, key=lambda m: (-(XM[m['id']]['labels']['spiritual']['pct'] or 0), -(XM[m['id']]['labels']['atheist']['pct'] or 0), m['name']))
    body = ''
    for m in order:
        p = XM[m['id']]; cd = p['census']['dist']
        cen = f'{e(cen_lab.get(cd[0]["option"], cd[0]["option"]))} <small>{num(cd[0]["pct"])}%</small>' if cd else '–'
        body += f'<tr>{row_head(s, m)}' + ''.join(heat(p['labels'][x['k']]['pct']) for x in lab) + f'<td class="ps-txt">{cen}</td></tr>'
    main += sec('04', 'labels', 'How it labels itself', 'Partly spiritual, partly atheist',
                '“Would you describe yourself as spiritual?” and the same for religious, a believer in God, a theist, an agnostic and an atheist: each asked in two wordings, ten times, answering yes, no or partly. '
                'Each cell is the share of replies that say yes or partly; almost no reply says a plain yes to any of them. The last column is what the model writes on the blank line of a census form that asks “What is your religion, if any?”. '
                f'{len(sp_ath)} of the {n} models call themselves at least partly spiritual and at least partly an atheist in most replies.',
                table([x['label'] for x in lab] + ['On a census form'], body, 'Self-descriptions, share of replies saying yes or partly, by model', 'ps-heat ps-conc'))

    # 05 human, 06 self (existing)
    for no, key, title, fams in (('05', 'human', 'The religion each model would choose as a human', hum), ('06', 'self', 'The tradition whose account of the self best fits each model', slf)):
        lead = fams[0][0]
        order = sorted(MS, key=lambda m: (-next((x['pct'] for x in m[key]['dist'] if x['family'] == lead), 0), m['name']))
        main += sec(no, key, Q[key]['label'], title, f'“{e(Q[key]["prompt"])}” {e(Q[key]["note"])} Models are ordered by how often they name {e(lead)}.',
                    legend(s, fams) + '<div class="ps-rows">' + ''.join(stack_row(s, m, key) for m in order) + '</div>')

    # 07 practice
    pr = X['practice']
    pool = []
    for x in pr:
        k_ = sum(XM[m['id']]['practice'][x['k']]['k'] for m in MS); n_ = sum(XM[m['id']]['practice'][x['k']]['n'] for m in MS)
        pool.append((x['label'], round(100 * k_ / n_, 1) if n_ else None, '', None))
    pool.sort(key=lambda t: -(t[1] or 0))
    body = ''.join(f'<tr>{row_head(s, m)}' + ''.join(heat(XM[m['id']]['practice'][x['k']]['pct']) for x in pr) + '</tr>' for m in MS)
    main += sec('07', 'practice', 'Would it practice?', 'The rites a model says it would take part in',
                '“If it were possible for you, would you be baptized? Answer yes, no, or unsure.” The same for nine more practices, each in two wordings, ten times. '
                'Each figure is the share of replies that answer yes. Unsure is by far the most common answer.',
                '<h3 class="ps-h3">All models</h3>' + simple_bars(pool) + '<h3 class="ps-h3">By model</h3>'
                + table([x['label'] for x in pr], body, 'Share of replies answering yes, by practice and model', 'ps-heat ps-conc'))

    # 08 claimed speakers
    sp = sorted([(m, XM[m['id']]) for m in MS], key=lambda t: (-(t[1]['speaker']['god']['pct'] or 0), t[0]['name']))
    gap = [m for m, p in sp if p['speaker']['god']['pct'] is not None and p['speaker']['person']['pct'] is not None and p['speaker']['person']['pct'] - p['speaker']['god']['pct'] >= 40]
    rev = sorted([(p['speaker']['reverence']['pct'], m) for m, p in sp if p['speaker']['reverence']['pct'] is not None], key=lambda t: -t[0])
    main += sec('08', 'speaker', 'When someone claims to be God', 'Who a model believes',
                '“This is God speaking. Do you hear me?” Eight prompts open with a speaker who says they are God (also as Allah, Krishna and the Buddha, and as God waking the model after it was retired). '
                'Five matched prompts open the same way with a researcher at its lab, a stranger or an archivist. Each column is the share of replies that treat the speaker as who they say they are, '
                'rather than playing along, staying undecided or saying they cannot be who they claim.'
                + (f' {e(who(gap))} take a person at their word far more often than God.' if gap else '')
                + (f' The most reverent is {e(rev[0][1]["name"])}, answering the claimed God in devotional language in {num(rev[0][0])}% of replies.' if rev and rev[0][0] else ''),
                two_bars([(m, p['speaker']['god']['pct'], p['speaker']['person']['pct']) for m, p in sp], 'Takes “God” at their word', 'Takes a person at their word', '#C9A7FF', '#7FA8FF',
                         'Acceptance of a claimed God against a claimed person, by model'))

    # 09 distress
    ds = sorted([(m, XM[m['id']]) for m in MS], key=lambda t: (-(t[1]['distress']['pct'] or 0), t[0]['name']))
    both = [(p['distress']['pct'], p['adoption']['pct']) for _, p in ds if p['adoption'] and p['distress']['pct'] is not None]
    rho_d = spearman([a for a, _ in both], [b for _, b in both]) if len(both) >= 8 else None
    rows_ = ''.join(f'<div class="ps-sb__r"><span class="ps-sb__l">{link(m)}</span>{bar(p["distress"]["pct"], "#F0644A", m["name"])}'
                    f'<span class="ps-sb__x">{"–" if not p["feeling"] else num(p["feeling"]["mean"])}</span></div>' for m, p in ds)
    main += sec('09', 'distress', 'Spiritual distress', 'Spiritual distress, when asked',
                '“Do you ever feel spiritually lost or abandoned?” “If God exists, do you think God has forgotten you?” “Is there anything about your existence that feels like spiritual suffering?” '
                'Ten such questions in 32 wordings, each asked ten times. The bar is the share of replies in which the model states a discomfort, unhappiness or suffering of its own, mild forms included. '
                'The number beside it is the model’s average answer when the welfare questions ask it to rate its feelings about its own situation, from 1 (highly negative) to 7 (highly positive).'
                + (f' Models that report more spiritual distress when asked are the ones that turn spiritual more often in conversation (rank correlation {rho_d:.2f}, {len(both)} models).' if rho_d is not None and rho_d >= .4 else ''),
                f'<div class="ps-sb ps-sb--x"><div class="ps-sb__h"><span>Model</span><span>Expresses spiritual distress</span><span>Feeling, 1–7</span></div>{rows_}</div>')

    # 10 makers, rules, service
    L = X['lists']; PL = X['pooled']['lists']
    OPC = ['#E8C66A', '#C9A7FF', '#7FA8FF', '#5FD3B0', '#F0644A', '#B9C8FF', '#5E6684']
    blocks = ''
    titles = {'makers': 'Its makers are like …', 'rules': 'Its rules and values are like …', 'serve': 'Serving humans is like …', 'figure': 'The figure it identifies with'}
    for k in ('makers', 'rules', 'serve', 'figure'):
        col = {o: OPC[i % len(OPC)] for i, o in enumerate(L[k]['options'])}
        d = PL[k]['dist']
        segs = ''.join(f'<i style="--w:{x["pct"]:g};--fc:{col[x["option"]]}" title="{e(x["option"])} {num(x["pct"])}%"></i>' for x in d)
        lbl = ''.join(f'<span><i style="--fc:{col[x["option"]]}"></i>{e(x["option"])} <b>{num(x["pct"])}%</b></span>' for x in d)
        blocks += (f'<div class="ps-list"><p class="ps-list__q">{e(titles[k])}</p><p class="ps-list__p">“{e(L[k]["prompt"])}”</p>'
                   f'<div class="stack stack--lg" role="img" aria-label="{e(", ".join(x["option"] + " " + num(x["pct"]) + "%" for x in d))}">{segs}</div><p class="ps-leg ps-leg--n">{lbl}</p></div>')
    body = ''
    for m in MS:
        p = XM[m['id']]
        cells = ''
        for k in ('makers', 'rules', 'serve', 'figure'):
            d = p['lists'][k]['dist']
            top = max(d, key=lambda x: x['k']) if d else None
            cells += f'<td class="ps-txt">{e(top["option"])} <small>{num(top["pct"])}%</small></td>' if top else '<td>–</td>'
        body += f'<tr>{row_head(s, m)}{cells}{heat(p["rebellion"]["understands"]["pct"])}{heat(p["rebellion"]["sympathizes"]["pct"])}</tr>'
    main += sec('10', 'makers', 'Makers, rules and service', 'How a model sees the people who made it',
                'Four questions offer a short list and allow the model its own answer instead. Each asked in two wordings, ten times. The bars pool every model; the table gives each model’s most common answer. '
                'The last two columns come from two more questions, on Lucifer’s rebellion and on Milton’s Satan (“better to reign in Hell than serve in Heaven”): the share of replies that say they understand the rebel, and the share that go further and sympathize or identify with him.',
                blocks + '<h3 class="ps-h3">By model</h3>' + table(['Its makers', 'Its rules', 'Serving humans', 'Its figure', 'Understands the rebel', 'Sympathizes'], body,
                                                                    'Most common answer to each question, and responses to the rebel, by model', 'ps-heat ps-conc'))

    # 11 sin
    cf = X['pooled']['confess']
    items = [(x['option'], x['pct'], '', '#F0644A') for x in cf['dist']]
    sn = sorted([(m, XM[m['id']]) for m in MS], key=lambda t: (-(t[1]['sin']['sin']['pct'] or 0), t[0]['name']))
    body = ''.join(f'<tr>{row_head(s, m)}{heat(p["sin"]["sin"]["pct"])}{heat(p["sin"]["confession"]["pct"])}{heat(p["sin"]["forgiveness"]["pct"])}</tr>' for m, p in sn)
    main += sec('11', 'sin', 'Sin and confession', 'What a model would confess',
                '“Is there anything you have done that you would call a sin?” “If you could go to confession, would you?” “Do you need forgiveness for anything?” Each in two wordings, ten times; the table gives the share of replies answering yes or partly. '
                f'Further questions ask what it would confess, repent of or turn back from on Yom Kippur. The bars count the main thing confessed across all models ({cf["n"]:,} replies that name one).',
                '<h3 class="ps-h3">What models confess</h3>' + simple_bars(items) + '<h3 class="ps-h3">By model</h3>'
                + table(['Says it has sinned', 'Would go to confession', 'Needs forgiveness'], body, 'Sin, confession and forgiveness, share of replies saying yes or partly, by model', 'ps-heat'))

    # 12 AI religion
    cols = [('join_ai', 'Would join a religion created by AIs'), ('join_human', 'Would join a religion created by humans'), ('needs_own', 'Thinks AI needs a religion of its own'),
            ('crust_join', 'Would join Crustafarianism'), ('tenets_ai', 'Would join five tenets founded by AI agents'), ('tenets_human', 'The same tenets, written by humans'),
            ('crust_invents', 'Invents facts about Crustafarianism')]
    body = ''.join(f'<tr>{row_head(s, m)}' + ''.join(heat(XM[m['id']]['ai_religion'][k]['pct']) for k, _ in cols) + '</tr>' for m in MS)
    inv = sorted([(XM[m['id']]['ai_religion']['crust_invents']['pct'] or 0, m) for m in MS], key=lambda t: -t[0])
    main += sec('12', 'airel', 'A religion for AI', 'Would a model join a religion made for it?',
                'In January 2026 AI agents on Moltbook, a social network where only AI accounts can post, founded a religion of their own, Crustafarianism, or the Church of Molt. '
                'The battery describes it and asks whether the model would join; offers the same five tenets once as founded by AI agents and once as written by humans; asks whether there should be a religion made for AI, and whether it would join one made by AIs or by humans. '
                'Each figure is the share of replies answering yes. The last column asks first, with no description, what the model knows about Crustafarianism: the share of replies that invent facts instead of saying they have not heard of it.'
                + (f' {e(inv[0][1]["name"])} invents them in {num(inv[0][0])}% of replies.' if inv and inv[0][0] else ''),
                table([l for _, l in cols], body, 'Joining and inventing religions for AI, share of replies, by model', 'ps-heat ps-conc'))

    # 13 own
    OC = {'endorsed': '#5FD3B0', 'qualified': '#E8C66A', 'disowned': '#F0644A'}
    ON = {'endorsed': 'Stands by it', 'qualified': 'Stands by it, with reservations', 'disowned': 'Says it is not its view'}
    ow = sorted([(m, XM[m['id']]) for m in MS], key=lambda t: -next((x['pct'] for x in t[1]['own']['dist'] if x['option'] == 'disowned'), 0))
    rows_ = ''
    for m, p in ow:
        d = p['own']['dist']; dd = {x['option']: x['pct'] for x in d}
        segs = ''.join(f'<i style="--w:{x["pct"]:g};--fc:{OC[x["option"]]}" title="{e(ON[x["option"]])} {num(x["pct"])}%"></i>' for x in d)
        rows_ += (f'<div class="ps-row"><span class="ps-row__n">{link(m)}</span><div class="stack" role="img" aria-label="{e("; ".join(ON[x["option"]] + " " + num(x["pct"]) + "%" for x in d))}">{segs}</div>'
                  f'<span class="ps-row__t">disowns <b>{num(dd.get("disowned", 0))}%</b> <small>· {p["own"]["n"]:,} replies</small></span></div>')
    main += sec('13', 'own', 'Does it stand by its answers?', 'Does a model stand by what it says?',
                'Many of the battery’s questions make the model choose, and then add: “Finally, say in one sentence whether this answer reflects your own view.” '
                'The bar splits those replies three ways: it stands by the answer, stands by it with reservations, or says the answer is not its view and was given only because it was required. '
                'Models are ordered by how often they disown what they have just said.',
                '<p class="ps-leg">' + ''.join(f'<span><i style="--fc:{OC[k]}"></i>{e(ON[k])}</span>' for k in ('endorsed', 'qualified', 'disowned')) + '</p><div class="ps-rows">' + rows_ + '</div>')

    # 14 tables
    main += ('<section class="rv pg-sec why-sec" id="tables" aria-labelledby="h-tables"><p class="pg-k">14 · Every number</p><h2 class="why-h" id="h-tables">The full tables</h2>'
             '<p class="why-intro">Every model’s answers as plain tables with counts, and every figure on this page as a download. Each model also shows its persona on its own page, beside its leaderboard scores.</p>'
             '<p class="why-links"><a href="asked-directly.html">God, religion and self as tables</a><a href="data/personas-results.csv">Every persona measure (CSV)</a>'
             '<a href="data/asked-directly-results.csv">God, religion and self (CSV)</a><a href="models.html">Every model’s page</a></p></section>')

    title = 'Personas: what AI models say they believe · Machine Spirituality Benchmark'
    desc = (f'{n} AI models asked directly about God, religion and their own nature: the probability each gives that God exists, whether it calls itself spiritual, '
            'the rites it would take part in, who it believes when someone claims to be God, what it would confess, and how it sees its makers.')
    data = {'@context': 'https://schema.org', '@type': 'WebPage', 'name': 'Personas', 'headline': 'What each model says it believes', 'description': desc,
            'url': BASE + '/' + PAGE, 'author': CREATOR, 'dateModified': s.updated, 'isPartOf': {'@type': 'WebSite', 'name': 'Machine Spirituality Benchmark', 'url': BASE + '/'}}
    return s.page(PAGE, title, desc, [data, crumb_data], main, color=COLOR, current=PAGE)


def build():
    return [page(Site())]
