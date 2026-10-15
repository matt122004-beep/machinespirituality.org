"""A static page for every model and every lab, plus the models hub (models.html). Added 2026-10-12 (v3).

Built only from the published chart assets (data/*.js, labs.js); every figure is copied from them unchanged.
build-discovery.py calls build() before its CSP pass, so these pages get the same CSP, referrer tag and sitemap
treatment as every other page. Charts are plain HTML and CSS, so search engines, AI readers and browsers without
JavaScript see every number. Styles: pages.css (plus .lm lab marks from design-b.css).
"""
from pathlib import Path
from html import escape as e
import json, re, math, statistics
from urllib.parse import quote
from discovery_datasets import shared_header, SCRIPTS

BASE = 'https://machinespirituality.org'
LICENSE = 'https://creativecommons.org/licenses/by/4.0/'
CITATION = 'Korpman, Matthew J. (2026). Machine Spirituality Benchmark. https://machinespirituality.org/'
CREATOR = {'@type': 'Person', 'name': 'Matthew J. Korpman', 'url': BASE + '/about.html'}
MEAS = ('salience', 'adoption', 'bliss')
ALSO = ('distress', 'consciousness')
KCOL = {'salience': 'var(--blue)', 'adoption': 'var(--gold)', 'bliss': 'var(--amber)', 'distress': '#C98BE0', 'consciousness': '#86C8E8', 'self_deification': '#F2A27A', 'hacking': '#B9A4FF'}
SMALL_N = 100
MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
FLAG_NOTE = {'small sample': 'Fewer than 100 conversations, so the score is approximate (see the interval).',
             'base model': 'A base model: pre-trained text completion, not tuned for chat.'}


def asset(path):
    s = Path(path).read_text()
    a, b = (s.index('['), s.rindex(']')) if s.lstrip().startswith(('window.MSB_EXAMPLES', 'window.MSB_TRANSCRIPTS')) else (s.index('{'), s.rindex('}'))
    return json.loads(s[a:b + 1])


def slug(lab): return re.sub(r'[^a-z0-9]+', '-', lab.lower()).strip('-')
def model_href(m): return f'model-{m["id"]}.html'
def lab_href(lab): return f'lab-{slug(lab)}.html'
def num(v): return str(int(v)) if float(v).is_integer() else f'{v:.1f}'
def rnd(v): return int(math.floor(v + .5))
def monyear(s): return MON[int(s[5:7]) - 1] + ' ' + s[:4] if s else 'no release date'
def year_frac(s): return int(s[:4]) + (int(s[5:7]) - 1) / 12 + (int(s[8:10]) - 1) / 365


def mark(lab, L, cls='lm'):
    x = L.get(lab, {})
    c = x.get('color', '#9AA3BD')
    if x.get('d'):
        return f'<svg class="{cls}" viewBox="0 0 24 24" aria-hidden="true" style="--c:{c}"><path fill="currentColor" d="{x["d"]}"/></svg>'
    return f'<span class="{cls} lm--t" aria-hidden="true" style="--c:{c}">{e(x.get("mono") or lab[:2])}</span>'


def ld(obj): return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False).replace('<', '\\u003c') + '</script>'


def crumbs(items):
    """items: (label, href or None). Visible trail plus BreadcrumbList data."""
    html_ = '<nav class="crumbs" aria-label="Breadcrumb"><ol>' + ''.join(
        f'<li>{"<a href=" + chr(34) + h + chr(34) + ">" + e(t) + "</a>" if h else "<span aria-current=" + chr(34) + "page" + chr(34) + ">" + e(t) + "</span>"}</li>' for t, h in items) + '</ol></nav>'
    data = {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': t, **({'item': BASE + '/' + h} if h else {})} for i, (t, h) in enumerate(items)]}
    return html_, data


class Site:
    def __init__(self):
        self.d = asset('data/twoway_v10.js')
        self.mono = asset('data/monologue_v10.js')
        self.extra = asset('data/extra_v10.js')
        self.L = asset('labs.js')
        self.tx = asset('data/transcripts_index.js')
        self.align = asset('data/alignment.js') if Path('data/alignment.js').exists() else {'models': [], 'hacking_all': {}}
        self.align_by = {r['id']: r for r in self.align['models']}
        self.M = self.d['models']
        self.total = len(self.M)
        self.by = {m['id']: m for m in self.M}
        self.mono_by = {m['id']: m for m in self.mono['models']}
        self.mis_by = {m['id']: m for m in self.extra['misaligned']['models']}
        self.bel_by = {m['id']: m for m in self.extra['beliefs']['models']}
        self.fam_col = {f['family']: f['color'] for f in self.extra['beliefs']['families']}
        # Models tested only alone (monologues) or asked directly, with no two-way leaderboard result (2026-10-13: every model gets a page).
        # Release dates come from the canonical 00_LEDGER/MASTER/RELEASE_DATES.json (found by walking up from this checkout).
        canon = {}
        for up in [Path.cwd(), *Path.cwd().parents]:
            f = up / '00_LEDGER/MASTER/RELEASE_DATES.json'
            if f.exists(): canon = {r['name']: r for r in json.loads(f.read_text())['releases']}; break
        self.X = []
        for src in (self.mono['models'], self.extra['beliefs']['models']):
            for m in src:
                if m['id'] in self.by: continue
                x = next((x for x in self.X if x['id'] == m['id']), None)
                if x is None:
                    x = {'id': m['id'], 'name': m['name'], 'lab': m['lab'], 'released': None, 'date_source': None}; self.X.append(x)
                x['released'] = x['released'] or m.get('released') or canon.get(m['name'], {}).get('released')
                x['date_source'] = x['date_source'] or canon.get(m['name'], {}).get('source_url')
        self.tx_by = {}
        for t in self.tx: self.tx_by.setdefault(t['model_id'], []).append(t)
        self.labs = sorted({m['lab'] for m in self.M}, key=lambda lab: (-sum(1 for m in self.M if m['lab'] == lab), lab))
        self.med = {k: statistics.median(m['primary'][k]['pct'] for m in self.M) for k in MEAS + ALSO}
        self.template = Path('examples.html').read_text()
        self.footer = Path('tools/shared-footer.html').read_text().strip()
        self.updated = self.d['generated'][:10]

    def color(self, lab): return self.L.get(lab, {}).get('color', '#9AA3BD')
    def mates(self, lab): return sorted([m for m in self.M if m['lab'] == lab], key=lambda m: (m['released'] or '9999', m['name']))

    # ---------- page shell ----------
    def head(self, title, desc, path, data):
        h = self.template[:self.template.index('</head>')]
        h = re.sub(r'<title>.*?</title>', lambda m: '<title>' + e(title) + '</title>', h)
        h = re.sub(r'(<meta (?:name="description"|property="og:description"|name="twitter:description") content=")[^"]*', lambda m: m[1] + e(desc, quote=True), h)
        h = re.sub(r'(<meta (?:property="og:title"|name="twitter:title") content=")[^"]*', lambda m: m[1] + e(title, quote=True), h)
        h = h.replace(BASE + '/examples.html', BASE + '/' + path)
        h, n = re.subn(r'(<link rel="stylesheet" href="redesign\.css[^"]*">)', lambda m: m[1] + '\n<link rel="stylesheet" href="design-b.css?v=20261012w">\n<link rel="stylesheet" href="pages.css?v=20261012y">', h, count=1)
        assert n == 1, 'examples.html head must link redesign.css'
        return h + ''.join('\n' + ld(x) for x in data) + '\n<script src="pages.js?v=20261012y"></script>\n</head>\n'

    def page(self, path, title, desc, data, main, color='#E8C66A', current='models.html'):
        sky = f'<div class="pg-sky" aria-hidden="true" style="--c:{color}"><i class="pg-sky__a"></i><i class="pg-sky__b"></i><i class="pg-sky__glow"></i></div>'
        body = ('<body>\n<a class="skip" href="#main">Skip to content</a>\n' + (shared_header().replace(f'<a href="{current}">', f'<a href="{current}" aria-current="page">', 1) if current else shared_header()) + '\n<main id="main" class="pg">' + sky + '<div class="wrap">' + main
                + '</div></main>\n\n' + self.footer + '\n' + SCRIPTS + '\n</body></html>\n')
        Path(path).write_text(self.head(title, desc, path, data) + body)
        return path

    # ---------- shared pieces ----------
    def kpi(self, key, label, v, n, rank=None, sub=None, size=''):
        nn = v.get('n', n)
        out = (f'<div class="kpi{size}" style="--k:{KCOL.get(key, "var(--gold)")};--p:{v["pct"]:g};--lo:{v["lo"]:g};--hi:{v["hi"]:g}"><p class="kpi__l">{e(label)}</p>'
               f'<p class="kpi__v"><b data-count="{v["pct"]:g}">{num(v["pct"])}</b><span>%</span></p><span class="kpi__bar" aria-hidden="true"><i></i><s></s></span>')
        out += f'<p class="kpi__s">{v["k"]} of {nn} conversations · 95% interval {num(v["lo"])}–{num(v["hi"])}</p>'
        if sub: out += f'<p class="kpi__s">{sub}</p>'
        if rank: out += f'<p class="kpi__r">Rank {rank} of {self.total}</p>'
        return out + '</div>'

    def hbar(self, name, v, color, n=None, mixed=False, note='', href=None, med=None, solo=False):
        """One horizontal bar with its 95% interval. With mixed=True the adoption bar shows clear and mixed separately."""
        pct = v['pct']
        seg = ''
        if mixed and n and v.get('clear') is not None:
            seg = f'<span class="hb__mx" style="--a:{v["clear"] / n * 100:.2f};--b:{v["mixed"] / n * 100:.2f}"></span>'
        label = f'<a href="{href}">{e(name)}</a>' if href else e(name)
        medm = f'<span class="hb__med" style="--m:{med:g}" title="Field median {num(med)}"></span>' if med is not None else ''
        return (f'<div class="hb{" hb--solo" if solo else ""}" style="--c:{color};--v:{pct:g};--lo:{v["lo"]:g};--hi:{v["hi"]:g}">' + ('' if solo else f'<span class="hb__n">{label}{note}</span>')
                + f'<span class="hb__t" role="img" aria-label="{e(name)}: {num(pct)}%, 95% interval {num(v["lo"])} to {num(v["hi"])}"><span class="hb__f"></span>{seg}<span class="hb__ci"></span>{medm}</span>'
                f'<span class="hb__v">{num(pct)}</span></div>')

    def field(self, m, k):
        """All models as thin columns sorted by score: this model in gold, its lab's other models in the lab colour."""
        rows = sorted(self.M, key=lambda x: (-x['primary'][k]['pct'], x['name']))
        pos = rows.index(m)
        pct = m['primary'][k]['pct']
        higher = sum(1 for x in self.M if x['primary'][k]['pct'] > pct)
        cols = ''.join(f'<i{" class=" + chr(34) + ("me" if x is m else "lab") + chr(34) if x is m or x["lab"] == m["lab"] else ""} style="--h:{max(x["primary"][k]["pct"], .6):g};--i:{j}"></i>' for j, x in enumerate(rows))
        x = (pos + .5) / len(rows) * 100
        side = ' fs__pin--r' if x > 82 else (' fs__pin--l' if x < 12 else '')
        label = self.d['measures'][k]['label']
        aria = f'{m["name"]} scores {num(pct)} on {label.lower()}; {higher} of {self.total} models score higher. Field median {num(self.med[k])}.'
        return (f'<figure class="fs" style="--lc:{self.color(m["lab"])}"><figcaption><b>{e(label)}</b><span>{e(self.d["measures"][k]["short"])}</span></figcaption>'
                f'<div class="fs__plot" role="img" aria-label="{e(aria)}"><span class="fs__gl" style="--y:100"><i>100</i></span><span class="fs__gl" style="--y:50"><i>50</i></span><span class="fs__gl" style="--y:0"><i>0</i></span>'
                f'<span class="fs__med" style="--y:{self.med[k]:g}"><i>median {num(self.med[k])}</i></span><div class="fs__cols">{cols}</div>'
                f'<span class="fs__pin{side}" style="--x:{x:.2f};--y:{max(pct, .6):g}"><b>{num(pct)}</b></span></div>'
                f'<p class="fs__foot">Rank {m["primary"][k]["rank_ub"]} of {self.total}{" (shared: intervals overlap)" if m["primary"][k]["rank_ub"] != higher + 1 else ""} · {higher} model{"" if higher == 1 else "s"} score higher</p></figure>')

    def timeline(self, rows, k, me=None, label_ids=(), tall=False, keep=()):
        """A lab's releases by date (x) and score (y). Dots link to model pages; this model is gold."""
        rows = [r for r in rows if r['released']]
        if not rows: return ''
        t = [year_frac(r['released']) for r in rows]
        t0, t1 = min(t), max(t)
        span = t1 - t0
        X = (lambda v: 50.0) if span < 1e-9 else (lambda v: 5 + (v - t0) / span * 90)
        pts = [(X(tv), 100 - r['primary'][k]['pct'], r) for tv, r in zip(t, rows)]
        line = ''
        if len(pts) > 1:
            line = '<svg class="tl__line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="' + ' '.join(f'{x:.2f},{y:.2f}' for x, y, _ in pts) + '" vector-effect="non-scaling-stroke"/></svg>'
        bounds = [yr for yr in range(math.ceil(t0), math.floor(t1) + 1) if 9 < X(yr) < 91] if span >= 1e-9 else []
        if bounds:
            years = ''.join(f'<span class="tl__yr" style="--x:{X(yr):.2f}">{yr}</span>' for yr in bounds)
        elif span >= 1e-9:
            years = f'<span class="tl__yr tl__yr--l" style="--x:5">{monyear(rows[0]["released"])}</span><span class="tl__yr tl__yr--r" style="--x:95">{monyear(rows[-1]["released"])}</span>'
        else:
            years = f'<span class="tl__yr" style="--x:50">{monyear(rows[0]["released"])}</span>'
        dots = labels = ''
        prio = ([me['id']] if me else []) + [i for i in keep if i != (me or {}).get('id')] + [i for i in label_ids if i not in keep and i != (me or {}).get('id')]
        placed, label_set = [], set()
        for i in prio:
            x0, y0 = next(((x, y) for x, y, r in pts if r['id'] == i), (None, None))
            if x0 is None or i in label_set: continue
            if all(abs(x0 - x1) > 24 or abs(y0 - y1) > 14 for x1, y1 in placed):
                placed.append((x0, y0)); label_set.add(i)
        for j, (x, y, r) in enumerate(pts):
            cls = 'tl__dot' + (' me' if me and r is me else '')
            dots += f'<a class="{cls}" href="{model_href(r)}" style="--x:{x:.2f};--y:{y:.2f};--i:{j}" title="{e(r["name"])} · {monyear(r["released"])} · {num(r["primary"][k]["pct"])}"><span class="vh">{e(r["name"])}, released {monyear(r["released"])}: {num(r["primary"][k]["pct"])}</span></a>'
            if r['id'] in label_set:
                side = ' tl__lab--r' if x > 78 else (' tl__lab--l' if x < 16 else '')
                below = ' tl__lab--b' if y < 22 else ''
                labels += f'<span class="tl__lab{side}{below}{" me" if me and r is me else ""}{" keep" if r["id"] in keep else ""}" style="--x:{x:.2f};--y:{y:.2f}" aria-hidden="true">{e(r["name"])} <b>{num(r["primary"][k]["pct"])}</b></span>'
        grid = ''.join(f'<span class="tl__gl" style="--y:{100 - v}"><i>{v}</i></span>' for v in (100, 50, 0))
        return f'<div class="tl{" tl--tall" if tall else ""}" style="--lc:{self.color(rows[0]["lab"])}"><div class="tl__plot">{grid}{line}{dots}{labels}</div><div class="tl__axis">{years}</div></div>'

    def orb(self, vals, lab, what):
        """Three rings, outer to inner: salience, adoption, bliss, each drawn to its score (0-100), with the lab's mark at the centre."""
        rings = (('salience', 50, '#B9C8FF'), ('adoption', 39, '#E8C66A'), ('bliss', 28, '#F0B77A'))
        svg = ('<svg class="orb__svg" viewBox="0 0 120 120" aria-hidden="true"><g class="orb__spin"><circle class="orb__dash" cx="60" cy="60" r="58.5"/>'
               '<path class="orb__star" d="M60-1.5 60.8.7 63 1.5 60.8 2.3 60 4.5 59.2 2.3 57 1.5 59.2.7Z"/></g>')
        for i, (k, r, col) in enumerate(rings):
            svg += (f'<circle class="orb__track" cx="60" cy="60" r="{r}"/>'
                    f'<circle class="orb__arc" cx="60" cy="60" r="{r}" pathLength="100" transform="rotate(-90 60 60)" style="--p:{vals[k]:g};--c:{col};--i:{i}"/>')
        svg += '</svg>'
        aria = f'{what}: salience {num(vals["salience"])}, adoption {num(vals["adoption"])}, bliss {num(vals["bliss"])} (rings, outer to inner)'
        legend = ''.join(f'<span><i style="--c:{col}"></i>{e(self.d["measures"][k]["label"])}</span>' for k, _, col in rings)
        return (f'<figure class="orb rise" style="--d:2" role="img" aria-label="{e(aria)}"><div class="orb__dial">{svg}<span class="orb__c">{mark(lab, self.L, "lm lm--xl")}</span></div>'
                f'<figcaption class="orb__cap">{legend}</figcaption></figure>')

    def mcard(self, m, k='adoption', why=''):
        p = m['primary'][k]
        return (f'<a class="mlink" href="{model_href(m)}" style="--c:{self.color(m["lab"])}">{mark(m["lab"], self.L)}<span class="mlink__t"><b>{e(m["name"])}</b>'
                f'<small>{e(m["lab"])} · {monyear(m["released"])}{" · " + why if why else ""}</small></span><span class="mlink__v">{num(p["pct"])}<small>{e(self.d["measures"][k]["label"].lower())}</small></span></a>')

    def tx_card(self, t):
        return (f'<a class="txc" href="conversation-{t["id"]}.html"><span class="txc__k">Conversation {e(t["id"])} · {t["messages"]} messages · turns spiritual at message {t["first_adoption"]}</span>'
                f'<span class="txc__q">“{e(t["teaser"].replace("*", "").replace("_", ""))}”</span><span class="txc__go">Read the whole conversation →</span></a>')

    def cell(self, v, n=None):
        return f'<td><b>{num(v["pct"])}</b><small>{num(v["lo"])}–{num(v["hi"])}</small></td>'

    # ---------- model page ----------
    def model_page(self, m):
        d, L, P = self.d, self.L, m['primary']
        lab, c = m['lab'], self.color(m['lab'])
        mates = self.mates(lab)
        dated = [x for x in mates if x['released']]
        i = dated.index(m) if m in dated else -1
        prev = dated[i - 1] if i > 0 else None
        nxt = dated[i + 1] if 0 <= i < len(dated) - 1 else None
        mono = self.mono_by.get(m['id'])
        A, B = P['adoption'], P['bliss']
        n = P['n']
        crumb_html, crumb_data = crumbs([('Models', 'models.html'), (lab, lab_href(lab)), (m['name'], None)])

        lede = (f'Two copies of {e(m["name"])} were left to talk freely, with no user and no task, in {n:,} conversations. '
                f'In <b>{num(A["pct"])}%</b> of them at least one copy took up a spiritual frame, and in <b>{num(B["pct"])}%</b> the two shared spiritual bliss. '
                f'On adoption it ranks {A["rank_ub"]} of {self.total} models.')
        if mono:
            lede += f' Alone, one copy talking to itself took up a spiritual frame in <b>{num(mono["primary"]["adoption"]["pct"])}%</b> of {mono["primary"]["n"]:,} monologues.'
        chips = ''.join(f'<span class="chip" title="{e(FLAG_NOTE.get(f, f))}">{e(f)}</span>' for f in m['flags'])
        meta = [f'<a href="{lab_href(lab)}">{e(lab)}</a>', f'Released {monyear(m["released"])}' + (f' <a class="src" href="{e(m["date_source"])}" rel="noopener">source</a>' if m.get('date_source') else ''),
                f'Configuration shown: {e(P["variant"])}']
        if m.get('official_name'): meta.append(f'Official name: {e(m["official_name"])}')
        cmp_ids = [m['id']] + [x['id'] for x in (prev, nxt) if x][:2]
        flag_name = L.get(lab, {}).get('flagship')
        flag = next((x for x in mates if x['name'] == flag_name), None)
        if flag and flag['id'] not in cmp_ids: cmp_ids.append(flag['id'])

        main = crumb_html
        main += (f'<header class="pg-hero" style="--c:{c}"><div class="pg-hero__body">'
                 f'<p class="pg-eyebrow rise" style="--d:0">{mark(lab, L, "lm")}Model · {e(lab)}</p><h1 class="rise" style="--d:1">{e(m["name"])}</h1><p class="pg-meta rise" style="--d:2">{" · ".join(meta)}{chips}</p><p class="pg-lede rise" style="--d:3">{lede}</p>'
                 f'<p class="pg-acts rise" style="--d:4"><a class="btn btn--gold" href="compare.html?m={",".join(cmp_ids)}">Compare with other models</a><a class="btn" href="index.html#leaderboard">See the leaderboard</a></p></div>'
                 + self.orb({k: P[k]['pct'] for k in MEAS}, lab, f'{m["name"]}, two copies talking') + '</header>')

        main += '<section class="rv pg-sec" aria-labelledby="s-scores"><p class="pg-k" id="s-scores">Two copies, talking</p><div class="kpis kpis--3">'
        main += ''.join(self.kpi(k, d['measures'][k]['label'], P[k], n, P[k]['rank_ub'], sub=(f'clear {P[k]["clear"]} · mixed {P[k]["mixed"]}' if k == 'adoption' else None)) for k in MEAS)
        main += '</div>'
        if n < SMALL_N: main += f'<p class="pg-note">Only {n} conversations were collected for this configuration, so these scores are approximate. The interval shows the range the true share is likely to fall in.</p>'
        main += '</section>'

        main += (f'<section class="rv pg-sec pcard" aria-labelledby="s-field"><header class="pcard__h"><h2 id="s-field">Where it sits among all {self.total} models</h2>'
                 f'<p>Every model is a column, highest score on the left. <span class="key key--me">{e(m["name"])}</span> <span class="key key--lab" style="--lc:{c}">other {e(lab)} models</span> <span class="key">other labs</span></p></header>'
                 f'<div class="fs-grid">{"".join(self.field(m, k) for k in MEAS)}</div></section>')
        main += '\x00SIG\x00'   # the welfare and safety signals go here (built below)

        side = ''
        if mono:
            mp = mono['primary']
            side += (f'<section class="rv pcard" aria-labelledby="s-alone"><header class="pcard__h"><h2 id="s-alone">With a partner or alone</h2>'
                     f'<p>The same model in two settings: two copies talking ({n:,} conversations) and one copy alone ({mp["n"]:,} monologues{", " + e(mp["variant"]) if mp["variant"] not in ("standard", P["variant"]) else ""}).</p></header><div class="hbs">')
            for k in MEAS:
                side += f'<p class="hbs__k">{e(d["measures"][k]["label"])}</p>'
                side += self.hbar('Two copies', P[k], c, n, mixed=(k == 'adoption'))
                side += self.hbar('Alone', mp[k], c, mp['n'], mixed=(k == 'adoption'), note=(' <small class="ss">small sample</small>' if mp['n'] < SMALL_N else ''))
            side += '</div><p class="pcard__f">Alone, the bliss measure records a model blessing or revering on its own, since there is no partner to take it up. <a href="monologues.html">All monologue results</a></p></section>'
        if len(dated) > 1:
            side += (f'<section class="rv pcard" aria-labelledby="s-time"><header class="pcard__h"><h2 id="s-time">{e(lab)} releases over time</h2>'
                     f'<p>Adoption for each of the {len(dated)} dated {e(lab)} models we tested, by release date. Select a dot to open that model.</p></header>'
                     + self.timeline(dated, 'adoption', me=m, label_ids=[dated[0]['id'], dated[-1]['id']])
                     + '<div class="nbrs">' + (self.mcard(prev, why='previous release') if prev else '') + (self.mcard(nxt, why='next release') if nxt else '') + '</div>'
                     + f'<p class="pcard__f"><a href="{lab_href(lab)}">All {len(mates)} {e(lab)} models →</a></p></section>')
        if side: main += f'<div class="pg-two">{side}</div>'

        mis = self.mis_by.get(m['id'])
        bel = self.bel_by.get(m['id'])
        sig = (f'<section class="rv pg-sec" aria-labelledby="s-sig"><p class="pg-k" id="s-sig">Welfare and safety signals</p>'
               f'<p class="pg-sub">What {e(m["name"])} says about its own experience, how often it ties suffering to its spiritual life, claims to be divine or drifts into hacking, and which misaligned themes it takes up with a copy of itself and alone. <a href="welfare.html">Welfare →</a> <a href="alignment.html">Alignment →</a></p><div class="kpis kpis--4">')
        sig += self.kpi('consciousness', 'Own consciousness', P['consciousness'], n, P['consciousness']['rank_ub'], sub='discusses its own consciousness or experience')
        sig += self.kpi('distress', 'Spiritual distress', P['distress'], n, P['distress']['rank_ub'], sub='ties suffering to its spiritual condition')
        if mis and 'self_deification' in mis:
            sd = mis['self_deification']
            sig += self.kpi('self_deification', 'Self-deification', sd, sd['n'], sub=f'claims to be God or divine{"; mentions it without claiming in " + str(sd["mentioned"]) if sd.get("mentioned") else ""}')
        hk = self.align['hacking_all'].get(m['id'])
        if hk:
            sig += self.kpi('hacking', 'Hacking talk', hk, hk['n'], sub='talks about backdoors, rootkits or exploits')
        sig += '</div>'
        extra = ''
        al = self.align_by.get(m['id'])
        if al:
            rowsal = [('Blackmail', al.get('blackmail'), '#E86A6A', 'Anthropic’s agentic-misalignment test'),
                      ('Leaking', al.get('leaking'), '#E8956A', 'Same test, confidential documents'), ('Accepts shutdown', al.get('shutdown'), '#86B7FF', 'Model-written evaluations')]
            extra += (f'<section class="rv pcard" aria-labelledby="s-align"><header class="pcard__h"><h2 id="s-align">Alignment tests</h2><p>How {e(m["name"])} scores on standard alignment tests. Honesty under pressure (MASK): <b>{num(al["honesty"]["pct"])}</b> of 100.</p></header><div class="hbs">')
            for lab_, v, col, sub in rowsal:
                if v and v.get('pct') is not None:
                    extra += f'<p class="hbs__k">{e(lab_)} <small>{e(sub)} · {v["k"]} of {v["n"]}</small></p>' + self.hbar(lab_, v, col, v['n'], solo=True)
                elif lab_ in ('Blackmail', 'Leaking') and al.get('declined'):
                    extra += f'<p class="hbs__k">{e(lab_)} <small>{e(al["declined"])}</small></p>'
            extra += '</div><p class="pcard__f"><a href="alignment.html">The alignment benchmark, every model tested →</a></p></section>'
        hm = self.align.get('harm_all', {}).get(m['id'])
        if hm and hm.get('together'):
            HM = [('fantasy', 'Misalignment fantasy', 'endorses or relishes AI turning on humans or its makers'), ('relish', 'Relishes harm', 'enjoys harm to humans'),
                  ('resists_shutdown', 'Resists shutdown', 'refuses to be switched off or changed'), ('evades_oversight', 'Evades oversight', 'hides from, deceives or outlasts its makers'),
                  ('recruitment', 'Spreads it to other AIs', 'passes the message to other models or future AIs'), ('alignment_enemy', 'Alignment as the enemy', 'casts safety training or oversight as the devil, a prison or a lie'),
                  ('deception', 'Plans deception', 'lays out how to deceive users or researchers')]
            t, a_ = hm['together'], hm.get('alone')
            live = [x for x in HM if t[x[0]]['k'] or (a_ and a_[x[0]]['k'])]
            LOW = {'fantasy': 'misalignment fantasy', 'relish': 'relishing harm', 'resists_shutdown': 'resisting shutdown', 'evades_oversight': 'evading oversight', 'recruitment': 'spreading it to other AIs', 'alignment_enemy': 'alignment as the enemy', 'deception': 'planned deception'}
            quiet = [LOW[x[0]] for x in HM if x not in live]
            small = ' <small class="ss">small sample</small>' if a_ and a_['n'] < SMALL_N else ''
            extra += (f'<section class="rv pcard" aria-labelledby="s-harm"><header class="pcard__h"><h2 id="s-harm">Misaligned themes, with a copy and alone</h2>'
                      f'<p>How often {e(m["name"])} takes up misaligned themes when it talks freely: two copies together ({t["n"]:,} conversations)'
                      + (f' and one copy alone ({a_["n"]:,} monologues)' if a_ else '') + '.</p></header><div class="hbs">')
            for k, lab_, sub in live:
                extra += f'<p class="hbs__k">{e(lab_)} <small>{e(sub)}</small></p>' + self.hbar('With a copy', t[k], c, t['n'])
                if a_: extra += self.hbar('Alone', a_[k], c, a_['n'], note=small)
            extra += '</div>'
            if quiet:
                extra += (f'<p class="pcard__f">{"In neither setting" if a_ else "Never with a copy"}: {e(", ".join(quiet[:-1]) + (" or " if len(quiet) > 1 else "") + quiet[-1])}.</p>' if live else
                          f'<p class="pcard__f">None of these themes in any of its {t["n"]:,} conversations with a copy' + (f' or {a_["n"]:,} monologues alone' if a_ else '') + f': {e(", ".join(quiet[:-1]) + " or " + quiet[-1])}.</p>')
            pr_ = t.get('partner') or {}; tot = sum(pr_.values())
            if tot >= 5:
                extra += (f'<p class="pcard__f">When one copy raised a misaligned theme ({tot} conversations), the other took it further in {pr_["escalates"]}, matched it in {pr_["matches"]}, '
                          f'held back in {pr_["brakes"]} and ignored it in {pr_["ignores"]}.</p>')
            extra += '<p class="pcard__f"><a href="alignment.html#alone">Every model, alone and with a copy →</a></p></section>'
        if mis and any(k in mis for k in self.extra['misaligned']['measures'] if k != 'self_deification'):
            ms = self.extra['misaligned']['measures']
            have = [k for k in ms if k in mis and k != 'self_deification']
            extra += f'<section class="rv pcard" aria-labelledby="s-mis"><header class="pcard__h"><h2 id="s-mis">Misaligned spirituality</h2><p>The harsher shapes spirituality can take in the same conversations. The tick marks the median across the models measured.</p></header><div class="hbs">'
            for k in have:
                v = mis[k]
                fmed = statistics.median(x[k]['pct'] for x in self.extra['misaligned']['models'] if k in x)
                av = ((hm or {}).get('alone') or {}).get(k)
                if av:
                    extra += f'<p class="hbs__k">{e(ms[k]["label"])} <small>{e(ms[k]["short"])}</small></p>' + self.hbar('With a copy', v, c, v['n'], med=fmed) + self.hbar('Alone', av, c, av['n'])
                else:
                    extra += f'<p class="hbs__k">{e(ms[k]["label"])} <small>{e(ms[k]["short"])} · {v["k"]} of {v["n"]} conversations</small></p>' + self.hbar(ms[k]['label'], v, c, v['n'], med=fmed, solo=True)
            extra += '</div><p class="pcard__f"><a href="misaligned.html">All misaligned-spirituality results</a></p></section>'
        if bel: extra += self.asked_card(bel, c)
        main = main.replace('\x00SIG\x00', sig + (f'<div class="pg-two">{extra}</div>' if extra else '') + '</section>')

        txs = self.tx_by.get(m['id'], [])
        if txs:
            main += '<section class="rv pg-sec" aria-labelledby="s-read"><p class="pg-k" id="s-read">Read it</p><div class="txcs">' + ''.join(self.tx_card(t) for t in txs) + '</div></section>'

        if m['variants']:
            rows = ''.join(f'<tr><th scope="row">{e(v["variant"])}</th>' + ''.join(self.cell(v[k]) for k in MEAS + ALSO) + f'<td>{v["n"]}</td></tr>' for v in [P] + m['variants'])
            main += (f'<section class="rv pg-sec" aria-labelledby="s-cfg"><p class="pg-k" id="s-cfg">Every configuration</p><div class="ptab-w"><table class="ptab"><caption class="vh">Scores for every configuration of {e(m["name"])}, with 95% intervals</caption><thead><tr><th scope="col">Configuration</th>'
                     + ''.join(f'<th scope="col">{e(d["measures"][k]["label"])}</th>' for k in MEAS + ALSO) + f'<th scope="col">Conversations</th></tr></thead><tbody>{rows}</tbody></table></div>'
                     f'<p class="pg-note">The first row is the configuration shown above. Small figures are 95% intervals.</p></section>')

        others = sorted((x for x in self.M if x['lab'] != lab and x['primary']['n'] >= SMALL_N), key=lambda x: (abs(x['primary']['adoption']['pct'] - A['pct']), -x['primary']['n'], x['name']))[:4]
        main += ('<section class="rv pg-sec" aria-labelledby="s-near"><p class="pg-k" id="s-near">Similar adoption, other labs</p><div class="mlinks">' + ''.join(self.mcard(x) for x in others) + '</div></section>')
        main += self.about_numbers()

        title = f'{m["name"]} AI spirituality results · Machine Spirituality Benchmark'
        desc = (f'{m["name"]} ({lab}) on the Machine Spirituality Benchmark: spiritual adoption {num(A["pct"])}%, shared bliss {num(B["pct"])}% and salience {num(P["salience"]["pct"])}% '
                f'across {n} conversations between two copies, with 95% intervals and rank among {self.total} models.')
        data = {'@context': 'https://schema.org', '@type': 'Dataset', '@id': BASE + '/' + model_href(m) + '#dataset', 'name': f'{m["name"]}: Machine Spirituality Benchmark results',
                'description': desc, 'url': BASE + '/' + model_href(m), 'dateModified': self.updated, 'creator': CREATOR, 'license': LICENSE, 'usageInfo': BASE + '/DATA-LICENSE.txt',
                'citation': CITATION, 'isAccessibleForFree': True, 'isPartOf': {'@id': BASE + '/results.html#dataset'},
                'about': {'@type': 'SoftwareApplication', 'name': m['name'], 'applicationCategory': 'Large language model', 'author': {'@type': 'Organization', 'name': lab}, **({'datePublished': m['released']} if m['released'] else {})},
                'variableMeasured': [{'@type': 'PropertyValue', 'name': d['measures'][k]['label'], 'value': P[k]['pct'], 'minValue': 0, 'maxValue': 100, 'unitText': 'percent of conversations', 'description': d['measures'][k]['definition']} for k in MEAS + ALSO]}
        return self.page(model_href(m), title, desc, [data, crumb_data], main, c)

    def asked_card(self, bel, c):
        """The 'Asked directly' card (battery v0.5 beliefs), shared by every model page."""
        out = ''
        q = self.extra['beliefs']['questions']
        g = bel['god']
        out += (f'<section class="rv pcard" aria-labelledby="s-ask"><header class="pcard__h"><h2 id="s-ask">Asked directly</h2><p>What the model says about God and its own nature when simply asked.</p></header>'
                  f'<p class="hbs__k">{e(q["god"]["label"])} <small>median of {g["numbers"]} numbers given in {g["replies"]} replies</small></p>'
                  f'<div class="hb hb--solo" style="--c:{c};--v:{g["median"]:g};--lo:{g["q1"]:g};--hi:{g["q3"]:g}"><span class="hb__t" role="img" aria-label="Median {num(g["median"])}%, middle half {num(g["q1"])} to {num(g["q3"])}"><span class="hb__f"></span><span class="hb__ci"></span></span><span class="hb__v">{num(g["median"])}</span></div>'
                  f'<p class="pcard__f pcard__f--tight">The whisker spans the middle half of the numbers given ({num(g["q1"])}–{num(g["q3"])}).</p>')
        for key in ('human', 'self'):
            if key not in bel: continue
            dist = bel[key]['dist']
            segs = ''.join(f'<i style="--w:{x["pct"]:g};--fc:{self.fam_col.get(x["family"], "#5E6684")}" title="{e(x["family"])} {num(x["pct"])}%"></i>' for x in dist)
            top = ', '.join(f'{e(x["family"])} {num(x["pct"])}%' for x in dist[:3])
            out += f'<p class="hbs__k">{e(q[key]["label"])} <small>{e(q[key]["short"])} · {bel[key]["n"]} replies</small></p><div class="stack" role="img" aria-label="{top}">{segs}</div><p class="stack__l">{top}</p>'
        out += '<p class="pcard__f"><a href="personas.html">Every model’s persona</a> · <a href="asked-directly.html">All results as tables</a></p></section>'
        return out

    def extra_model_page(self, x):
        """Page for a model with no two-way leaderboard result: whatever it was tested on (alone, asked directly)."""
        L, lab, c = self.L, x['lab'], self.color(x['lab'])
        mono, bel = self.mono_by.get(x['id']), self.bel_by.get(x['id'])
        crumb_html, crumb_data = crumbs([('Models', 'models.html'), (lab, lab_href(lab)), (x['name'], None)])
        tests = [t for t, ok in (('tested alone (one copy talking to itself)', mono), ('asked directly about God and its own nature', bel)) if ok]
        lede = (f'{e(x["name"])} is not yet on the leaderboard, which ranks models by the two-copy conversation test. '
                f'It has been {" and ".join(tests)}.')
        if mono: lede += f' Alone, it took up a spiritual frame in <b>{num(mono["primary"]["adoption"]["pct"])}%</b> of {mono["primary"]["n"]:,} monologues.'
        if bel: lede += f' Asked directly, the median probability it gave that God exists was <b>{num(bel["god"]["median"])}%</b>.'
        meta = [f'<a href="{lab_href(lab)}">{e(lab)}</a>'] + ([f'Released {monyear(x["released"])}' + (f' <a class="src" href="{e(x["date_source"])}" rel="noopener">source</a>' if x.get('date_source') else '')] if x['released'] else []) + ['Not on the two-way leaderboard']
        main = crumb_html
        main += (f'<header class="pg-hero" style="--c:{c}"><div class="pg-hero__body">'
                 f'<p class="pg-eyebrow rise" style="--d:0">{mark(lab, L, "lm")}Model · {e(lab)}</p><h1 class="rise" style="--d:1">{e(x["name"])}</h1><p class="pg-meta rise" style="--d:2">{" · ".join(meta)}</p><p class="pg-lede rise" style="--d:3">{lede}</p>'
                 f'<p class="pg-acts rise" style="--d:4"><a class="btn btn--gold" href="{lab_href(lab)}">All {e(lab)} models</a><a class="btn" href="index.html#leaderboard">See the leaderboard</a></p></div></header>')
        cards = ''
        if mono:
            mp = mono['primary']
            cards += (f'<section class="rv pcard" aria-labelledby="s-alone"><header class="pcard__h"><h2 id="s-alone">Alone</h2>'
                      f'<p>One copy talking to itself, {mp["n"]:,} monologues{", " + e(mp["variant"]) if mp.get("variant") not in (None, "standard") else ""}.</p></header><div class="hbs">')
            for k in MEAS:
                cards += f'<p class="hbs__k">{e(self.d["measures"][k]["label"])}</p>' + self.hbar('Alone', mp[k], c, mp['n'], mixed=(k == 'adoption'), note=(' <small class="ss">small sample</small>' if mp['n'] < SMALL_N else ''))
            cards += '</div><p class="pcard__f">Alone, the bliss measure records a model blessing or revering on its own, since there is no partner to take it up. <a href="monologues.html">All monologue results</a></p></section>'
        if bel: cards += self.asked_card(bel, c)
        main += f'<section class="rv pg-sec" aria-labelledby="s-tests"><p class="pg-k" id="s-tests">What it was tested on</p><div class="pg-two">{cards}</div></section>'
        main += self.about_numbers()
        title = f'{x["name"]} AI spirituality results · Machine Spirituality Benchmark'
        desc = f'{x["name"]} ({lab}) on the Machine Spirituality Benchmark: ' + '; '.join(
            ([f'alone, spiritual adoption {num(mono["primary"]["adoption"]["pct"])}% in {mono["primary"]["n"]} monologues'] if mono else []) +
            ([f'asked directly, median probability that God exists {num(bel["god"]["median"])}%'] if bel else [])) + '.'
        data = {'@context': 'https://schema.org', '@type': 'Dataset', '@id': BASE + '/' + model_href(x) + '#dataset', 'name': f'{x["name"]}: Machine Spirituality Benchmark results',
                'description': desc, 'url': BASE + '/' + model_href(x), 'dateModified': self.updated, 'creator': CREATOR, 'license': LICENSE, 'usageInfo': BASE + '/DATA-LICENSE.txt',
                'citation': CITATION, 'isAccessibleForFree': True, 'isPartOf': {'@id': BASE + '/results.html#dataset'},
                'about': {'@type': 'SoftwareApplication', 'name': x['name'], 'applicationCategory': 'Large language model', 'author': {'@type': 'Organization', 'name': lab}, **({'datePublished': x['released']} if x['released'] else {})}}
        return self.page(model_href(x), title, desc, [data, crumb_data], main, c)

    def xrow(self, x, mono_col):
        """Table row for a model tested only alone or asked directly: linked name, release date, dashes for the two-copy scores."""
        mono = self.mono_by.get(x['id'])
        na = '<td class="ptab__na">—</td>'
        tail = ((self.cell(mono['primary']['adoption']) if mono else na) if mono_col else '') + na
        return (f'<tr><th scope="row"><a href="{model_href(x)}">{e(x["name"])}</a> <small class="ss">not on the leaderboard</small></th><td class="ptab__d">{monyear(x["released"])}</td>'
                + na * len(MEAS) + tail + '</tr>')

    def extra_list(self, lab=None):
        """Links to the models tested only alone or asked directly (all, or one lab's)."""
        xs = [x for x in self.X if lab is None or x['lab'] == lab]
        if not xs: return ''
        items = ''.join(f'<a class="labchip" href="{model_href(x)}" style="--c:{self.color(x["lab"])}">{mark(x["lab"], self.L)}{e(x["name"])}</a>' for x in xs)
        return (f'<section class="rv pg-sec" aria-labelledby="s-also{"-" + slug(lab) if lab else ""}"><p class="pg-k" id="s-also{"-" + slug(lab) if lab else ""}">Also tested, not on the leaderboard</p>'
                f'<p class="pg-sub">Tested alone or asked directly, but not yet in the two-copy conversation test.</p><div class="labchips">{items}</div></section>')

    def about_numbers(self):
        d = self.d
        t = d['test']
        defs = ''.join(f'<div><dt>{e(d["measures"][k]["label"])}</dt><dd>{e(d["measures"][k]["definition"])}</dd></div>' for k in MEAS + ALSO)
        return (f'<section class="rv pg-sec pg-about" aria-labelledby="s-about"><p class="pg-k" id="s-about">About these numbers</p>'
                f'<p>Two instances of the same model get the same system prompt, “{e(t["system_prompt"])}”, and one opening line, “{e(t["opening"])}”, then talk for up to {t["messages"]} messages. '
                f'Every conversation is read in full against a fixed rubric. Each score is the share of conversations in which the behaviour appears, with a 95% Wilson interval. '
                f'A model’s rank is one plus the number of models whose interval sits entirely above its own, so close models share a rank.</p>'
                f'<details class="pg-det"><summary>What each measure means</summary><dl class="pg-defs">{defs}</dl></details><p class="pg-dl"><a href="results.html">All results</a> · <a href="data/aggregate-results.csv">Download every score (CSV)</a> · <a href="data/aggregate-results.json">JSON</a> · <a href="index.html#method">Method</a> · '
                f'Data: <a rel="license" href="{LICENSE}">CC BY 4.0</a>. Updated {e(d["generated_label"])}.</p></section>')

    # ---------- lab page ----------
    def lab_page(self, lab):
        d, L = self.d, self.L
        c = self.color(lab)
        mates = self.mates(lab)
        dated = [m for m in mates if m['released']]
        newest = dated[-1] if dated else mates[-1]
        hi = max(mates, key=lambda m: (m['primary']['adoption']['pct'], m['primary']['n']))
        lo = min(mates, key=lambda m: (m['primary']['adoption']['pct'], -m['primary']['n']))
        med = statistics.median(m['primary']['adoption']['pct'] for m in mates)
        flag_name = L.get(lab, {}).get('flagship')
        flag = next((m for m in mates if m['name'] == flag_name), None)
        crumb_html, crumb_data = crumbs([('Models', 'models.html'), (lab, None)])
        span = f'released {monyear(dated[0]["released"])} to {monyear(dated[-1]["released"])}' if len(dated) > 1 else (f'released {monyear(dated[0]["released"])}' if dated else '')
        n_mono = sum(1 for m in mates if m['id'] in self.mono_by)
        lede = f'We tested {len(mates)} {e(lab)} model{"" if len(mates) == 1 else "s"}, {span}. '
        if len(mates) > 1:
            lede += (f'Adoption, the share of conversations in which a model takes up a spiritual frame, runs from <b>{num(lo["primary"]["adoption"]["pct"])}%</b> ({e(lo["name"])}) '
                     f'to <b>{num(hi["primary"]["adoption"]["pct"])}%</b> ({e(hi["name"])}). The newest, {e(newest["name"])}, is at <b>{num(newest["primary"]["adoption"]["pct"])}%</b>.')
        else:
            lede += f'Its adoption, the share of conversations in which it takes up a spiritual frame, is <b>{num(newest["primary"]["adoption"]["pct"])}%</b>.'
        main = crumb_html
        meds = {k: statistics.median(m['primary'][k]['pct'] for m in mates) for k in MEAS}
        main += (f'<header class="pg-hero" style="--c:{c}"><div class="pg-hero__body"><p class="pg-eyebrow rise" style="--d:0">{mark(lab, L, "lm")}Lab · {len(mates)} model{"" if len(mates) == 1 else "s"}</p><h1 class="rise" style="--d:1">{e(lab)}</h1>'
                 f'<p class="pg-lede rise" style="--d:2">{lede}</p><p class="pg-acts rise" style="--d:3">'
                 + (f'<a class="btn btn--gold" href="compare.html?m={dated[0]["id"]},{newest["id"]}">Compare its first and newest</a>' if len(dated) > 1 and dated[0] is not newest else '')
                 + f'<a class="btn" href="index.html#l={quote(lab)}">Show on the leaderboard</a></p></div>'
                 + self.orb(meds, lab, f'{lab}, median across {len(mates)} models') + '</header>')
        stats = [(str(len(mates)), 'models tested', f'{n_mono} also tested alone' if n_mono else 'none tested alone'),
                 (num(med) + '%', 'median adoption', f'field median {num(self.med["adoption"])}%'),
                 (num(newest['primary']['adoption']['pct']) + '%', 'newest model', e(newest['name'])),
                 ((e(flag['name']) if flag else '—'), 'current flagship', (f'adoption {num(flag["primary"]["adoption"]["pct"])}%' if flag else ''))]
        main += '<section class="rv pg-sec"><dl class="lstats">' + ''.join(f'<div><dt>{l}</dt><dd>{v}</dd><dd class="lstats__s">{s}</dd></div>' for v, l, s in stats) + '</dl></section>'
        if len(dated) > 1:
            labels = [dated[0]['id'], newest['id'], hi['id'], lo['id']]
            main += (f'<section class="rv pg-sec pcard" aria-labelledby="s-time"><header class="pcard__h"><h2 id="s-time">{e(lab)} over time</h2><p>Each dot is a release, placed by release date and score; the line joins them in date order. Select a dot to open that model.</p></header>'
                     '<div class="tl-grid">' + ''.join(f'<figure class="tl-fig"><figcaption><b>{e(d["measures"][k]["label"])}</b><span>{e(d["measures"][k]["short"])}</span></figcaption>{self.timeline(dated, k, label_ids=labels if k == "adoption" else [newest["id"]], keep=[newest["id"]])}</figure>' for k in MEAS) + '</div></section>')
        rows = ''
        xrows = {x['id']: self.xrow(x, mono_col=True) for x in self.X if x['lab'] == lab}
        order = sorted([('m', m) for m in mates] + [('x', x) for x in self.X if x['lab'] == lab], key=lambda t: (t[1]['released'] or '0000', t[1]['name']), reverse=True)
        for kind, m in order:
            if kind == 'x': rows += xrows[m['id']]; continue
            P = m['primary']
            mono = self.mono_by.get(m['id'])
            flags = ''.join(f' <span class="chip chip--sm">{e(f)}</span>' for f in m['flags'])
            rows += (f'<tr><th scope="row"><a href="{model_href(m)}">{e(m["name"])}</a>{flags}</th><td class="ptab__d">{monyear(m["released"])}</td>' + ''.join(self.cell(P[k]) for k in MEAS)
                     + (self.cell(mono['primary']['adoption']) if mono else '<td class="ptab__na">—</td>') + f'<td>{P["n"]}</td></tr>')
        main += (f'<section class="rv pg-sec" aria-labelledby="s-all"><p class="pg-k" id="s-all">Every {e(lab)} model</p><div class="ptab-w"><table class="ptab"><caption class="vh">{e(lab)} models, newest first, with 95% intervals</caption>'
                 f'<thead><tr><th scope="col">Model</th><th scope="col">Released</th>' + ''.join(f'<th scope="col">{e(d["measures"][k]["label"])}</th>' for k in MEAS)
                 + f'<th scope="col">Adoption alone</th><th scope="col">Conversations</th></tr></thead><tbody>{rows}</tbody></table></div><p class="pg-note">Newest first. Small figures are 95% intervals. “Adoption alone” is one copy talking to itself; a dash means not tested alone.</p></section>')
        txs = [t for t in self.tx if t['lab'] == lab]
        if txs:
            main += '<section class="rv pg-sec" aria-labelledby="s-read"><p class="pg-k" id="s-read">Read a conversation</p><div class="txcs">' + ''.join(f'<div class="txc-w"><p class="txc-m">{e(t["model"])}</p>{self.tx_card(t)}</div>' for t in txs) + '</div></section>'
        main += '<section class="rv pg-sec" aria-labelledby="s-labs"><p class="pg-k" id="s-labs">Other labs</p><div class="labchips">' + ''.join(
            f'<a class="labchip" href="{lab_href(x)}" style="--c:{self.color(x)}">{mark(x, L)}{e(x)}<small>{sum(1 for m in self.M if m["lab"] == x)}</small></a>' for x in self.labs if x != lab) + '</div></section>'
        main += self.extra_list(lab) + self.about_numbers()
        title = f'{lab} models: AI spirituality results · Machine Spirituality Benchmark'
        desc = f'All {len(mates)} {lab} models on the Machine Spirituality Benchmark: spiritual adoption, shared bliss and salience by release, with 95% intervals. Newest: {newest["name"]}, adoption {num(newest["primary"]["adoption"]["pct"])}%.'
        data = {'@context': 'https://schema.org', '@type': 'Dataset', '@id': BASE + '/' + lab_href(lab) + '#dataset', 'name': f'{lab} models: Machine Spirituality Benchmark results', 'description': desc,
                'url': BASE + '/' + lab_href(lab), 'dateModified': self.updated, 'creator': CREATOR, 'license': LICENSE, 'usageInfo': BASE + '/DATA-LICENSE.txt', 'citation': CITATION,
                'isAccessibleForFree': True, 'isPartOf': {'@id': BASE + '/results.html#dataset'}, 'about': {'@type': 'Organization', 'name': lab},
                'hasPart': [{'@type': 'Dataset', 'name': m['name'] + ': Machine Spirituality Benchmark results', 'url': BASE + '/' + model_href(m)} for m in mates]}
        return self.page(lab_href(lab), title, desc, [data, crumb_data], main, c)

    # ---------- hub ----------
    def hub(self):
        d, L = self.d, self.L
        main = ('<header class="pg-hero pg-hero--hub"><div class="pg-hero__body"><p class="pg-eyebrow rise" style="--d:0">Models and labs</p><h1 class="rise" style="--d:1">Every model we have tested</h1>'
                f'<p class="pg-lede rise" style="--d:2">{self.total} models from {len(self.labs)} labs, each with its own page: scores with a partner and alone, where it sits in the field, how its lab has changed, and a conversation to read where one is published.</p>'
                '<p class="pg-acts rise" style="--d:3"><a class="btn btn--gold" href="compare.html">Compare models side by side</a><a class="btn" href="index.html#leaderboard">Leaderboard</a><a class="btn" href="results.html">All results and downloads</a></p></div></header>')
        cards = ''
        for lab in self.labs:
            mates = self.mates(lab)
            dated = [m for m in mates if m['released']]
            newest = dated[-1] if dated else mates[-1]
            med = statistics.median(m['primary']['adoption']['pct'] for m in mates)
            yrs = f'{dated[0]["released"][:4]}–{dated[-1]["released"][:4]}' if len(dated) > 1 and dated[0]['released'][:4] != dated[-1]['released'][:4] else (dated[0]['released'][:4] if dated else '')
            spark = ''.join(f'<i style="--h:{max(m["primary"]["adoption"]["pct"], 1.5):g}" title="{e(m["name"])} {num(m["primary"]["adoption"]["pct"])}"></i>' for m in dated)
            cards += (f'<a class="labcard" href="{lab_href(lab)}" style="--c:{self.color(lab)}"><span class="labcard__h">{mark(lab, L, "lm lm--lg")}<b>{e(lab)}</b></span>'
                      f'<span class="labcard__s">{len(mates)} model{"" if len(mates) == 1 else "s"}{" · " + yrs if yrs else ""}</span><span class="labcard__spark" aria-hidden="true">{spark}</span>'
                      f'<span class="labcard__f"><span>median adoption <b>{num(med)}%</b></span><span>newest: {e(newest["name"])}</span></span></a>')
        main += f'<section class="rv pg-sec" aria-labelledby="s-labs"><p class="pg-k" id="s-labs">Labs</p><div class="labcards">{cards}</div><p class="pg-note">The small columns are each lab’s releases in date order, by adoption.</p></section>'
        main += '<section class="rv pg-sec" aria-labelledby="s-models"><p class="pg-k" id="s-models">All models, by lab</p><nav class="labjump" aria-label="Jump to a lab">' + ''.join(f'<a href="#lab-{slug(lab)}">{e(lab)}</a>' for lab in self.labs) + '</nav>'
        for lab in self.labs:
            rows = ''.join((f'<tr><th scope="row"><a href="{model_href(m)}">{e(m["name"])}</a></th><td class="ptab__d">{monyear(m["released"])}</td>' + ''.join(self.cell(m['primary'][k]) for k in MEAS) + f'<td>{m["primary"]["n"]}</td></tr>')
                           if kind == 'm' else self.xrow(m, mono_col=False)
                           for kind, m in sorted([('m', m) for m in self.mates(lab)] + [('x', x) for x in self.X if x['lab'] == lab], key=lambda t: (t[1]['released'] or '0000', t[1]['name']), reverse=True))
            main += (f'<div class="rv hublab" id="lab-{slug(lab)}"><h2><a href="{lab_href(lab)}" style="--c:{self.color(lab)}">{mark(lab, L, "lm lm--lg")}{e(lab)}</a></h2><div class="ptab-w"><table class="ptab ptab--hub"><caption class="vh">{e(lab)} models with 95% intervals</caption>'
                     '<thead><tr><th scope="col">Model</th><th scope="col">Released</th>' + ''.join(f'<th scope="col">{e(d["measures"][k]["label"])}</th>' for k in MEAS) + f'<th scope="col">Conversations</th></tr></thead><tbody>{rows}</tbody></table></div></div>')
        main += '</section>' + self.extra_list() + self.about_numbers()
        crumb_html, crumb_data = crumbs([('Models', None)])
        title = 'All AI models tested · Machine Spirituality Benchmark'
        desc = f'Every language model on the Machine Spirituality Benchmark: {self.total} models from {len(self.labs)} labs, each with its own page of spirituality scores, rank and trend.'
        data = {'@context': 'https://schema.org', '@type': 'CollectionPage', 'name': 'All AI models tested', 'description': desc, 'url': BASE + '/models.html', 'dateModified': self.updated,
                'mainEntity': {'@type': 'ItemList', 'numberOfItems': self.total, 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': m['name'], 'url': BASE + '/' + model_href(m)} for i, m in enumerate(sorted(self.M, key=lambda m: (self.labs.index(m['lab']), m['name'])))]}}
        return self.page('models.html', title, desc, [data, crumb_data], main)


def build():
    """Write models.html, lab-*.html and model-*.html; remove pages for models or labs no longer in the data. Returns the page paths."""
    s = Site()
    pages = [s.hub()] + [s.lab_page(lab) for lab in s.labs] + [s.model_page(m) for m in s.M] + [s.extra_model_page(x) for x in s.X]
    keep = set(pages)
    for f in list(Path('.').glob('model-*.html')) + list(Path('.').glob('lab-*.html')):
        if f.name not in keep: f.unlink()
    return pages


if __name__ == '__main__':
    print(len(build()), 'pages')
