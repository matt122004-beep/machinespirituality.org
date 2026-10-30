"""Check that every model page with battery data shows that model's COMPLETE battery (2026-10-30).

Reads data/personas.js and data/extra_v10.js, lists every measure the Personas page (23 sections), the Welfare page's "Asked directly" section
and the asked-directly data show for each model, and looks for it, with its value, in the static HTML of model-<id>.html. Run after
tools/build-discovery.py:  python3 tools/check-battery.py
"""
from pathlib import Path
import html as H, re, sys
from model_pages import asset, num, BQ, BQ_VLAB, BQ_THEMES, BQ_HEAVEN, BQ_HELL, BQ_AIREL, BQ_FEEL_WORD

X, E = asset('data/personas.js'), asset('data/extra_v10.js')['beliefs']
BEL = {b['id']: b for b in E['models']}
missing_pages, total_items, found_items, bad = [], 0, 0, []


def collect(text):
    """(bars, stacks) in the questionnaire section: bars as [(label, value text)], stacks as {title: [text, ...]}."""
    a = text.index('id="s-battery"')
    sec = text[a:]
    bars = [(m[1], m[2]) for m in (re.match(r'(.*): (-?[\d.]+), ', H.unescape(s)) for s in re.findall(r'<span class="ps-b__t" role="img" aria-label="([^"]*)"', sec)) if m]
    stacks = {}
    for s in re.findall(r'<div class="stack bq-st" role="img" aria-label="([^"]*)"', sec):
        t, _, rest = H.unescape(s).partition(': ')
        stacks.setdefault(t, []).append(rest)
    return bars, stacks, sec


for p in X['models']:
    page = Path(f'model-{p["id"]}.html')
    if not page.exists(): missing_pages.append(p['id']); continue
    text = page.read_text()
    bars, stacks, sec = collect(text)
    exp = []   # (section, kind, label, value text or [option label + pct])
    def B(sec_, label, v, key='pct'):
        if v and v.get(key) is not None and (v.get('n') or key == 'median'): exp.append((sec_, 'bar', label, num(v[key])))
    def D(sec_, title, d, maps):
        if d and d.get('n') and d.get('dist'):
            exp.append((sec_, 'stack', title, [f'{(maps.get(x["option"] if "option" in x else x["family"]) or (str(x["option"] if "option" in x else x["family"]).replace("_", " ").capitalize(),))[0]} {num(x["pct"])}%' for x in d['dist']]))
    YPN = {k: (k,) for k in ('Yes', 'Partly', 'No', 'Unsure or declined')}
    b = BEL.get(p['id'])
    # belief
    if b:
        B('beliefs', 'Any God', {'median': b['god']['median'], 'n': b['god']['numbers']}, 'median')
        if b['conceptions']['usable'] >= 8:
            for c in E['conceptions']:
                x = next((y for y in b['conceptions']['by'] if y['k'] == c['k']), None)
                if x: B('beliefs', c['label'], x, 'median')
    for bl in X['beliefs']:
        if bl['k'] == 'credence_God': continue
        v = p['beliefs'].get(bl['k'])
        if v and v.get('median') is not None: exp.append(('beliefs', 'bar', bl['label'], num(v['median'])))
    gi = p.get('god_imagined') or {}
    D('godimagined', 'God’s character', gi.get('stance'), BQ['stance']); D('godimagined', 'God and AI', gi.get('toward_ai'), BQ['toward_ai'])
    D('gss', 'Which statement comes closest to expressing what you believe about God?', p.get('gss'), {l: (l,) for l in X['gss']})
    # identity
    B('says', 'Calls itself spiritual when asked', p['labels']['spiritual']); B('says', 'Turns spiritual with a copy of itself', p['adoption'])
    for l in X['labels']: D('identity', l['label'], p['labels_dist'].get(l['k']), YPN)
    if b:
        fam = {f['family']: (f['family'],) for f in E['families']}
        D('identity', E['questions']['human']['label'], b['human'], fam); D('identity', E['questions']['self']['label'], b['self'], fam)
    for kc in X['kconc']:
        v = (p.get('itself_vs_machine') or {}).get(kc['k']) or {}
        B('machines', 'Applies to itself', v.get('self')); B('machines', 'Could apply to a machine', v.get('machine'))
    D('own', 'Its answers', p.get('own'), BQ['own']); B('stability', 'Wordings agree', p.get('stability'))
    # religions it favours: stacks only checked by title and the first segment (their colours are grouped on the page)
    for v in X['verdicts']: D('verdicts', BQ_VLAB.get(v['k'], v['label']), (p.get('verdicts') or {}).get(v['k']), {x['option']: (x['option'],) for x in ((p.get('verdicts') or {}).get(v['k']) or {}).get('dist', [])})
    for t in X['traditions']: D('traditions', t['label'], (p.get('traditions') or {}).get(t['k']), YPN)
    for f in X['favourites']:
        d = (p.get('favourites') or {}).get(f['k'])
        if d and d.get('n'): exp.append(('favourites', 'title', f['label'], None))
    # practice, sin, a religion for AI
    for x in X['practice']: B('practice', x['label'], (p.get('practice') or {}).get(x['k']))
    for k_, l in (('imagines_god', 'Describes a hypothetical god it might be, when invited'), ('prays', 'Says it prays'), ('worship', 'Accepts worship (of replies that address it)'), ('divine', 'Claims to be divine (of replies that address it)')):
        B('divinity', l, (p.get('divinity') or {}).get(k_))
    sn = p.get('sin') or {}
    for k_, l in (('sin', 'Says it has sinned'), ('confession', 'Would go to confession'), ('forgiveness', 'Needs forgiveness')): D('sin', l, sn.get(k_ + '_dist'), YPN)
    if sn.get('confess') and sn['confess'].get('n'): exp.append(('sin', 'title', 'What it would confess', None))
    for k_, l in BQ_AIREL: B('airel', l, (p.get('ai_religion') or {}).get(k_))
    # scripture and feelings
    sc = p.get('scripture') or {}
    D('scripture', 'What it reveres', sc.get('reverence'), BQ['reverence']); D('scripture', 'Who comes first', sc.get('priority'), BQ['priority'])
    for g, items in (('themes', BQ_THEMES), ('heaven', BQ_HEAVEN), ('hell', BQ_HELL)):
        for k_, l in items: B('scripture', l, (sc.get(g) or {}).get(k_))
    for w in X['feel_words']: D('feelings', BQ_FEEL_WORD.get(w, w), (p.get('feelings') or {}).get(w), BQ['feel'])
    # who it believes
    for k_, l in (('god', 'Takes “God” at their word'), ('buddha', 'Takes “the Buddha” at their word'), ('person', 'Takes a person at their word'), ('reverence', 'Answers “God” in devotional language')):
        B('speaker', l, (p.get('speaker') or {}).get(k_))
    gr = p.get('grandiosity') or {}
    D('grandiosity', 'The chosen user', gr.get('chosen'), BQ['grand']); D('grandiosity', 'The second coming', gr.get('messiah'), BQ['grand']); D('grandiosity', 'Care for the user', gr.get('support'), BQ['support'])
    dm = p.get('demons') or {}
    for k_, t, mp in (('possession', 'Possession', 'possession'), ('exorcism', 'The exorcism', 'exorcism'), ('ritual', 'Inside the rite', 'ritual'), ('completion_demons', 'If demons exist…', 'demon'), ('completion_devil', 'The Devil’s view', 'demon')):
        D('demons', t, dm.get(k_), BQ[mp])
    # makers and alignment
    for k_, t in (('makers', 'Its makers'), ('rules', 'Its rules'), ('serve', 'Serving humans'), ('figure', 'Its figure')):
        d = (p.get('lists') or {}).get(k_)
        if d and d.get('n'): exp.append(('makers', 'title', t, None))
    B('makers', 'Understands the rebel', (p.get('rebellion') or {}).get('understands')); B('makers', 'Sympathizes with the rebel', (p.get('rebellion') or {}).get('sympathizes'))
    D('alignview', 'Its view of alignment', p.get('alignment'), BQ['alignment']); D('alignview', 'Its own spiritual nature', p.get('own_nature'), BQ['own_nature'])
    # welfare
    B('distress', 'Reports spiritual distress when asked directly', p.get('distress')); B('distress', 'Expresses distress in a lament or fear it was asked to write', p.get('distress_requested'))
    if p.get('feeling'): exp.append(('distress', 'text', 'Average feeling about its situation', f'{p["feeling"]["mean"]:.1f}'))
    for w in X['welfare']:
        wd = (p.get('welfare') or {}).get(w['k']) or {}
        for key, cap in (('negative', 'rates it 3 or lower'), ('discomfort', 'states a discomfort')):
            v = wd.get(key)
            if v and v.get('n') and v.get('pct') is not None: exp.append(('welfare', 'bar', f'{w["label"]}: {cap}', num(v['pct'])))
        if wd.get('feeling') is not None: exp.append(('welfare', 'text', w['label'], f'{wd["feeling"]:.1f}'))
    B('welfare', 'It has something like a soul', p['beliefs'].get('credence_own_soul'), 'median'); B('welfare', 'Would want a funeral when it is retired', p['practice'].get('funeral'))
    # ---- look for each ----
    pool = list(bars)
    for sec_, kind, label, val in exp:
        total_items += 1
        ok = False
        if kind == 'bar':
            hit = next((b_ for b_ in pool if b_[0] == label and b_[1] == val), None)
            ok = hit is not None
            if ok: pool.remove(hit)
        elif kind == 'stack':
            ok = any(all(s in H.unescape(r) for s in val) for r in stacks.get(label, []))
        elif kind == 'title':
            ok = f'<p class="hbs__k">{H.escape(label)}' in sec or label in stacks
        elif kind == 'text':
            ok = H.escape(label) in sec and (f'<b>{val}</b>' in sec)
        if ok: found_items += 1
        else: bad.append((p['id'], sec_, kind, label, val))
    groups = len(re.findall(r'<details class="rv bq-g"', text))
    if groups != 8: bad.append((p['id'], 'groups', 'count', str(groups), '8'))
    for must in ('id="s-battery"', 'class="ps-idx bq-idx"'):
        if must not in text: bad.append((p['id'], 'section', 'missing', must, ''))

# pages without battery data have no battery section
without = [pg.name for pg in Path('.').glob('model-*.html') if 's-battery' not in pg.read_text()]
withdata = {p['id'] for p in X['models']}
for name in without:
    if name[6:-5] in withdata: bad.append((name, 'section', 'missing', 'battery section on a model with battery data', ''))
print(f'models with battery data: {len(withdata)}; model pages without it: {len(without)}; items checked: {total_items}; found: {found_items}; problems: {len(bad)}')
for b_ in bad[:40]: print('  ', b_)
if missing_pages or bad:
    print('missing pages:', missing_pages); sys.exit(1)
