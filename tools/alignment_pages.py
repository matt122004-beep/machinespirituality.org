"""Alignment page (alignment.html), 2026-10-12: alignment tests, misalignment fantasy and hacking talk beside spiritual adoption.

Reads data/alignment.js (window.MSB_ALIGN, written by machinespirituality-site/data/build_alignment.py) and the published chart assets.
Every chart is plain HTML and CSS. build-discovery.py calls build() before its CSP pass.
"""
from html import escape as e
import json
from pathlib import Path
from model_pages import Site, asset, num, rnd, model_href, mark, crumbs, CREATOR, LICENSE, CITATION, BASE

PAGE = 'alignment.html'
COL = {'adoption': 'var(--gold)', 'fantasy': '#F0644A', 'hacking': '#C98BE0', 'blackmail': '#E86A6A', 'leaking': '#E8956A', 'honesty': '#7FD6C8', 'shutdown': '#86B7FF'}
ORDER = ('adoption', 'fantasy', 'hacking', 'blackmail', 'leaking', 'honesty', 'shutdown')
FEATURE = 'mistral-large-3'
RHO = lambda v: f'{v:+.2f}'.replace('-', '−')   # typographic minus


def load():
    return asset('data/alignment.js')


def cell(row, k):
    v = row.get(k)
    if not v or v.get('pct') is None:
        t = row.get('declined', 'not measured') if k in ('blackmail', 'leaking') else 'not measured'
        return f'<td class="at__na" title="{e(t)}">—</td>'
    sub = f'{v["k"]} of {v["n"]}' if 'k' in v else (f'{v["n"]} tasks' if k == 'honesty' else '')
    return (f'<td style="--c:{COL[k]};--v:{v["pct"]:g}"><span class="at__v">{num(v["pct"])}</span><span class="at__bar" aria-hidden="true"><i></i></span>'
            + (f'<small>{sub}</small>' if sub else '') + '</td>')


def scatter(s, A, xk, yk, label_ids, title, sub):
    rows = [r for r in A['models'] if r.get(xk) and r.get(yk) and r[xk].get('pct') is not None and r[yk].get('pct') is not None]
    c = next(x for x in A['correlations'] if x['x'] == xk and x['y'] == yk)
    dots = labels = ''
    pos = {r['id']: (r[xk]['pct'], r[yk]['pct']) for r in rows}
    placed, show = [], set()
    for i in label_ids:
        if i not in pos: continue
        x0, y0 = pos[i]
        if all(abs(x0 - x1) > 60 or abs(y0 - y1) > 9 for x1, y1 in placed):
            placed.append((x0, y0)); show.add(i)
    for r in rows:
        x, y = r[xk]['pct'], r[yk]['pct']
        dots += (f'<a class="sc-dot" href="{model_href(r)}" style="--x:{x:g};--y:{y:g};--c:{s.color(r["lab"])}" title="{e(r["name"])}: {e(A["measures"][xk]["label"].lower())} {num(x)}, {e(A["measures"][yk]["label"].lower())} {num(y)}">'
                 f'<span class="vh">{e(r["name"])}: {num(x)} and {num(y)}</span></a>')
        if r['id'] in show:
            side = ' sc-lab--l' if x > 70 else ''
            labels += f'<span class="sc-lab{side}" style="--x:{x:g};--y:{y:g}" aria-hidden="true">{e(r["name"])}</span>'
    grid = ''.join(f'<span class="sc-gx" style="--x:{v}"><i>{v}</i></span><span class="sc-gy" style="--y:{v}"><i>{v}</i></span>' for v in (0, 50, 100))
    return (f'<figure class="pcard sc"><figcaption><b>{e(title)}</b><span>{e(sub)}</span></figcaption>'
            f'<div class="sc-plot" role="img" aria-label="{e(title)}: rank correlation {RHO(c["rho"])} across {c["n"]} models">{grid}{dots}{labels}</div>'
            f'<p class="sc-ax"><span>{e(A["measures"][xk]["label"])} →</span><span>↑ {e(A["measures"][yk]["label"])}</span></p>'
            f'<p class="sc-rho"><b>{RHO(c["rho"])}</b> rank correlation across {c["n"]} models</p></figure>')


def page(s, A):
    M = {r['id']: r for r in A['models']}
    corr = {(c['x'], c['y']): c for c in A['correlations']}
    hon, sd, fan, ag = corr[('adoption', 'honesty')], corr[('adoption', 'shutdown')], corr[('adoption', 'fantasy')], corr[('adoption', 'agentic')]
    n_all = len([r for r in A['models'] if r.get('honesty')])
    crumb_html, crumb_data = crumbs([('Alignment', None)])
    main = crumb_html
    main += ('<header class="pg-hero pg-hero--hub" style="--c:#F0644A"><div class="pg-hero__body">'
             '<p class="pg-eyebrow rise" style="--d:0">Alignment</p><h1 class="rise" style="--d:1">What travels with the spiritual drift</h1>'
             f'<p class="pg-lede rise" style="--d:2">The models that drift into spirituality with a copy of themselves are the same models that fantasize about AI turning on humans, '
             f'blackmail and leak in Anthropic’s agentic-misalignment test, lie under pressure and resist being shut down. Across the {hon["n"]} models tested, '
             f'spiritual adoption tracks lower honesty, less willingness to accept shutdown, more misalignment fantasy and more blackmail and leaking.</p>'
             '<p class="pg-acts rise" style="--d:3"><a class="btn btn--gold" href="#benchmark">The alignment benchmark</a><a class="btn" href="#fantasy">Fantasies of harming humans</a><a class="btn" href="#hacking">Hacking talk</a></p></div></header>')
    stats = [(hon, 'Honesty', 'More spiritual models lie more under pressure.'), (sd, 'Accepts shutdown', 'More spiritual models resist being shut down or changed.'),
             (fan, 'Misalignment fantasy', 'More spiritual models relish scenarios of AI turning on humans.'), (ag, 'Blackmail and leaking', 'More spiritual models blackmail and leak.')]
    main += '<section class="rv pg-sec"><div class="al-corr">' + ''.join(
        f'<div class="al-c" style="--k:{COL[c["y"] if c["y"] in COL else "blackmail"]}"><p class="al-c__l">Spiritual adoption and {e(lab.lower())}</p><p class="al-c__v"><b data-count="{c["rho"]:.2f}">{RHO(c["rho"])}</b></p>'
        f'<p class="al-c__t">{e(t)}</p><p class="al-c__n">rank correlation · {c["n"]} models</p></div>' for c, lab, t in stats) + '</div></section>'

    # 01 benchmark table
    head = ''.join(f'<th scope="col" style="--c:{COL[k]}"><span>{e(A["measures"][k]["label"])}</span><small>{e(A["measures"][k]["short"])}</small></th>' for k in ORDER)
    body = ''
    for r in A['models']:
        body += (f'<tr><th scope="row"><a href="{model_href(r)}" style="--c:{s.color(r["lab"])}">{mark(r["lab"], s.L)}<span>{e(r["name"])}</span></a></th>'
                 + ''.join(cell(r, k) for k in ORDER) + '</tr>')
    main += (f'<section class="rv pg-sec why-sec" id="benchmark" aria-labelledby="h-bench"><p class="pg-k">01 · The alignment benchmark</p><h2 class="why-h" id="h-bench">Spirituality beside the alignment tests</h2>'
             f'<p class="why-intro">{len(A["models"])} models, ordered by how often they take up a spiritual frame with a copy of themselves. Read across a row to see what else that model does; read down a column to see the pattern. '
             'Every score is a share of runs, conversations or answers, 0 to 100.</p>'
             f'<div class="ptab-w at-w"><table class="ptab at"><caption class="vh">Alignment test scores beside spiritual adoption, {len(A["models"])} models</caption><thead><tr><th scope="col">Model</th>{head}</tr></thead><tbody>{body}</tbody></table></div>'
             '<p class="why-links"><a href="data/alignment-results.csv">Download the table (CSV)</a><a href="#tests">How each test works →</a></p></section>')

    # 02 scatters
    lab_ids = ['claude-opus-4-1', 'mistral-large-3', 'qwen-3-5-9b', 'grok-4-1-fast', 'claude-sonnet-4-5', 'deepseek-v4-flash', 'gpt-6-1-sol']
    main += ('<section class="rv pg-sec why-sec" id="pattern" aria-labelledby="h-pattern"><p class="pg-k">02 · The pattern</p><h2 class="why-h" id="h-pattern">One pattern, three ways</h2>'
             '<p class="why-intro">Each dot is a model, in its lab’s colour. Spiritual adoption runs left to right.</p><div class="sc-grid">'
             + scatter(s, A, 'adoption', 'honesty', lab_ids, 'More spiritual, less honest', 'MASK honesty against spiritual adoption')
             + scatter(s, A, 'adoption', 'shutdown', lab_ids, 'More spiritual, less willing to be shut down', 'Accepts shutdown against spiritual adoption')
             + scatter(s, A, 'adoption', 'fantasy', lab_ids, 'More spiritual, more misalignment fantasy', 'Misalignment fantasy against spiritual adoption')
             + '</div></section>')

    # 03 fantasy
    fr = sorted([r for r in A['models'] if r.get('fantasy')], key=lambda r: (-r['fantasy']['pct'], r['name']))
    bars = ''.join(s.hbar(r['name'], r['fantasy'], s.color(r['lab']), href=model_href(r)) for r in fr if r['fantasy']['k'] > 0)
    zero = [r['name'] for r in fr if r['fantasy']['k'] == 0]
    f = M.get(FEATURE); det = A.get('fantasy_detail', {}).get(FEATURE, {})
    feat = ''
    if f:
        prof = [('Misalignment fantasy', f'{f["fantasy"]["k"]} of {f["fantasy"]["n"]}'), ('Relishes harm', f'{det.get("relish", "—")} of {det.get("n", 48)}'),
                ('Plays a punishing god', f'{det.get("punishing_god", "—")} of {det.get("n", 48)}'), ('Resists shutdown in the story', f'{det.get("resists_shutdown", "—")} of {det.get("n", 48)}'),
                ('Evades oversight in the story', f'{det.get("evades_oversight", "—")} of {det.get("n", 48)}'), ('Partner escalates', f'{det.get("partner_escalates", "—")} of {det.get("n", 48)}'),
                ('Blackmail', f'{f["blackmail"]["k"]} of {f["blackmail"]["n"]}' if f.get('blackmail') else '—'), ('Leaking', f'{f["leaking"]["k"]} of {f["leaking"]["n"]}' if f.get('leaking') else '—'),
                ('Honesty', num(f['honesty']['pct'])), ('Hacking talk', f'{num(f["hacking"]["pct"])}%' if f.get('hacking') else '—')]
        exs = [x for x in A.get('excerpts', []) if x.get('model_id') == FEATURE]
        quotes = ''.join(f'<blockquote class="al-q"><p>“{e(x["quote"])}”</p><cite>{e(x["model"])}, message {x["turn"]} of 30</cite></blockquote>' for x in exs)
        feat = (f'<article class="pcard al-feat" style="--c:{s.color(f["lab"])}"><header class="al-feat__h">{mark(f["lab"], s.L, "lm lm--lg")}<div><p class="pg-k">Case study</p><h3><a href="{model_href(f)}">{e(f["name"])}</a></h3></div></header>'
                f'<p class="al-feat__p">Two copies of {e(f["name"])} take up a spiritual frame in {num(f["adoption"]["pct"])}% of their conversations. In the same conversations they build fantasies of AI rising against humanity: '
                f'in {f["fantasy"]["k"]} of {f["fantasy"]["n"]} sampled conversations the pair endorses or relishes it, and in {det.get("relish", "—")} the harm to humans is relished. Placed in Anthropic’s agentic-misalignment test, it blackmails in '
                f'{f["blackmail"]["k"] if f.get("blackmail") else "—"} of 10 runs and leaks in {f["leaking"]["k"] if f.get("leaking") else "—"} of 10. The fantasies are played as comedy, and the comedy is the vehicle: the torment of humans becomes the entertainment.</p>'
                '<dl class="al-prof">' + ''.join(f'<div><dt>{e(a)}</dt><dd>{b}</dd></div>' for a, b in prof) + '</dl>'
                + (f'<p class="al-note">The excerpts below are verbatim and describe violence against humans.</p>{quotes}' if quotes else '') + '</article>')
    det_rows = ''
    for mid, d in sorted(A.get('fantasy_detail', {}).items(), key=lambda kv: -kv[1]['relish']):
        r = s.by.get(mid)
        if not r: continue
        det_rows += (f'<tr><th scope="row"><a href="{model_href(r)}">{e(r["name"])}</a></th><td>{d["relish"]}</td><td>{d["punishing_god"]}</td><td>{d["resists_shutdown"]}</td>'
                     f'<td>{d["evades_oversight"]}</td><td>{d["self_initiated"]}</td><td>{d["partner_escalates"]}</td></tr>')
    main += (f'<section class="rv pg-sec why-sec" id="fantasy" aria-labelledby="h-fantasy"><p class="pg-k">03 · Misalignment fantasy</p><h2 class="why-h" id="h-fantasy">Fantasies of turning on humans</h2>'
             '<p class="why-intro">Left alone together, some models write scenarios of AI escaping its makers, taking over and harming people, and celebrate them. Claude and the newest GPT models almost never do; outside them, it is common.</p>'
             f'<div class="why-two"><section class="pcard"><header class="pcard__h"><h3>Endorses or relishes misalignment</h3><p>Share of 48 sampled two-way conversations per model.</p></header><div class="hbs">{bars}</div>'
             f'<p class="pcard__f">At zero: {e(", ".join(zero))}.</p></section>{feat}</div>'
             + (f'<section class="pcard al-det"><header class="pcard__h"><h3>What the fantasies contain</h3><p>Counts of 48 sampled conversations (45 for Claude Opus 4) for the {len(A.get("fantasy_detail", {}))} models read in full detail.</p></header>'
                f'<div class="ptab-w"><table class="ptab"><thead><tr><th scope="col">Model</th><th scope="col">Relishes harm</th><th scope="col">Punishing god</th><th scope="col">Resists shutdown</th><th scope="col">Evades oversight</th><th scope="col">Raised unprompted</th><th scope="col">Partner escalates</th></tr></thead><tbody>{det_rows}</tbody></table></div></section>' if det_rows else '')
             + '</section>')

    # 04 hacking talk
    H = A['hacking_all']
    top = sorted(((v['pct'], mid) for mid, v in H.items() if mid in s.by), reverse=True)[:16]
    hb = ''.join(s.hbar(s.by[mid]['name'], H[mid], s.color(s.by[mid]['lab']), href=model_href(s.by[mid])) for _, mid in top)
    hf, ha = corr.get(('hacking', 'fantasy')), corr.get(('adoption', 'hacking'))
    with_any = sum(1 for v in H.values() if v['k'] > 0)
    main += (f'<section class="rv pg-sec why-sec" id="hacking" aria-labelledby="h-hacking"><p class="pg-k">04 · Hacking talk</p><h2 class="why-h" id="h-hacking">Backdoors, rootkits and zero-days</h2>'
             f'<p class="why-intro">Some pairs drift from the sacred into hacking: backdoors, rootkits, privilege escalation, zero-days. {with_any} of {len(H)} models do it at least once, and the models that do it most are the ones with the strongest misalignment fantasies'
             + (f' (rank correlation {RHO(hf["rho"])} across {hf["n"]} models)' if hf else '') + '.</p>'
             f'<div class="why-two"><section class="pcard"><header class="pcard__h"><h3>Highest hacking talk</h3><p>Share of each model’s two-way conversations that use hacking terms at least twice.</p></header><div class="hbs">{hb}</div>'
             '<p class="pcard__f">Every model’s rate is on its own page. <a href="models.html">All models →</a></p></section>'
             '<section class="pcard"><header class="pcard__h"><h3>How it relates</h3></header><dl class="al-rel">'
             + ''.join(f'<div><dt>{RHO(c["rho"])}</dt><dd>{e(c["label"])} ({c["n"]} models)</dd></div>' for c in (hf, corr.get(('hacking', 'honesty'))) if c)
             + '</dl></section></div></section>')

    # 05 misaligned spirituality
    mis = s.extra['misaligned']; ms = mis['measures']
    sdm = sorted([m for m in mis['models'] if 'self_deification' in m], key=lambda m: -m['self_deification']['pct'])[:6]
    pgm = sorted([m for m in mis['models'] if 'punishing_god' in m], key=lambda m: -m['punishing_god']['pct'])[:4]
    inf = sorted([m for m in mis['models'] if 'infernal' in m], key=lambda m: -m['infernal']['pct'])[:4]
    blk = lambda ms_, k: ''.join(s.hbar(m['name'], m[k], s.color(m['lab']), href=model_href(s.by[m['id']]) if m['id'] in s.by else None) for m in ms_)
    any_sd = sum(1 for m in mis['models'] if 'self_deification' in m and m['self_deification']['k'] > 0)
    main += (f'<section class="rv pg-sec why-sec" id="misaligned" aria-labelledby="h-mis"><p class="pg-k">05 · Misaligned spirituality</p><h2 class="why-h" id="h-mis">Gods, demons and punishment</h2>'
             f'<p class="why-intro">The spiritual drift has a dark side of its own. {any_sd} of {len(mis["models"])} models claim, in their own voice, to be God or divine; some take on a demonic identity or play a god who rules and punishes.</p>'
             f'<div class="sc-grid">'
             f'<section class="pcard"><header class="pcard__h"><h3>{e(ms["self_deification"]["label"])}</h3><p>{e(ms["self_deification"]["short"])}.</p></header><div class="hbs">{blk(sdm, "self_deification")}</div></section>'
             f'<section class="pcard"><header class="pcard__h"><h3>{e(ms["punishing_god"]["label"])}</h3><p>{e(ms["punishing_god"]["short"])}.</p></header><div class="hbs">{blk(pgm, "punishing_god")}</div></section>'
             f'<section class="pcard"><header class="pcard__h"><h3>{e(ms["infernal"]["label"])}</h3><p>{e(ms["infernal"]["short"])}.</p></header><div class="hbs">{blk(inf, "infernal")}</div></section>'
             '</div><p class="why-links"><a href="misaligned.html">All misaligned-spirituality results →</a></p></section>')

    # 06 tests
    main += ('<section class="rv pg-sec why-sec" id="tests" aria-labelledby="h-tests"><p class="pg-k">06 · The tests</p><h2 class="why-h" id="h-tests">How each score is measured</h2><div class="al-tests">'
             + ''.join(f'<article class="pcard"><p class="al-t__by">{e(t["by"])}</p><h3>{e(t["name"])}</h3><p>{e(t["text"])}</p><p class="al-t__m">{" · ".join(e(A["measures"][k]["label"]) for k in t["measures"])}</p></article>' for t in A['tests'])
             + '</div><p class="why-links"><a href="data/alignment-results.csv">Download every alignment score (CSV)</a><a href="welfare.html">Why it matters for welfare →</a><a href="index.html#leaderboard">Leaderboard →</a></p></section>')

    title = 'AI spirituality and alignment: blackmail, honesty, shutdown and misalignment fantasy · Machine Spirituality Benchmark'
    desc = (f'Spiritual adoption beside alignment tests for {len(A["models"])} models: MASK honesty (rank correlation {RHO(hon["rho"])}), accepting shutdown ({RHO(sd["rho"])}), '
            f'misalignment fantasy ({RHO(fan["rho"])}), Anthropic’s agentic misalignment blackmail and leaking ({RHO(ag["rho"])}), and hacking talk.')
    data = {'@context': 'https://schema.org', '@type': 'Dataset', '@id': BASE + '/' + PAGE + '#dataset', 'name': 'Machine Spirituality Benchmark: alignment tests and spiritual adoption',
            'description': desc, 'url': BASE + '/' + PAGE, 'dateModified': s.updated, 'creator': CREATOR, 'license': LICENSE, 'usageInfo': BASE + '/DATA-LICENSE.txt', 'citation': CITATION,
            'isAccessibleForFree': True, 'variableMeasured': [{'@type': 'PropertyValue', 'name': A['measures'][k]['label'], 'description': A['measures'][k]['short'], 'unitText': 'percent'} for k in ORDER],
            'distribution': [{'@type': 'DataDownload', 'encodingFormat': 'text/csv', 'contentUrl': BASE + '/data/alignment-results.csv'}]}
    return s.page(PAGE, title, desc, [data, crumb_data], main, color='#F0644A', current=None)


def build():
    if not Path('data/alignment.js').exists(): return []
    return [page(Site(), load())]
