"""Public aggregate exports and static sections. Reads only published chart assets."""
from pathlib import Path
import csv, html, json, re

BASE = 'https://machinespirituality.org'
LICENSE = 'https://creativecommons.org/licenses/by/4.0/'
CITATION = 'Korpman, Matthew J. (2026). Machine Spirituality Benchmark. https://machinespirituality.org/'
MEASURES = ('salience', 'adoption', 'bliss', 'distress', 'consciousness')
e = html.escape


def read_asset(name):
    s = Path('data', name + '.js').read_text()
    return json.loads(s[s.index('{'):s.rfind('}') + 1])


def metadata(name, page, updated):
    return dict(name=name, url=BASE+'/'+page, updated=updated, license=LICENSE,
                license_scope=BASE+'/DATA-LICENSE.txt', creator='Matthew J. Korpman', citation=CITATION)


def conversation_export(source, name, page):
    out = metadata(name, page, source['generated'])
    out.update(test=source['test'], measures=source['measures'], totals={k:source['totals'][k] for k in ('releases','configurations','conversations','labs')}, models=[])
    rows = []
    for m in source['models']:
        model = {k:m[k] for k in ('id','name','lab','released')}
        model['configurations'] = []
        for i,c in enumerate([m['primary']]+m['variants']):
            config = dict(label=c['variant'], primary=i==0, conversations=c['n'])
            row = dict(model_id=m['id'], model=m['name'], lab=m['lab'], released=m['released'], configuration=c['variant'], primary=i==0, conversations=c['n'])
            for key in MEASURES:
                v = c[key]
                config[key] = {k:v[k] for k in ('k','pct','lo','hi')}
                config[key]['n'] = v.get('n',c['n'])
                row.update({key+'_'+k:v for k,v in config[key].items()})
            config['adoption'].update({k:c['adoption'][k] for k in ('clear','mixed')})
            row.update(adoption_clear=c['adoption']['clear'], adoption_mixed=c['adoption']['mixed'])
            model['configurations'].append(config)
            rows.append(row)
        out['models'].append(model)
    return out,rows


def csv_write(name, rows):
    fields = list(dict.fromkeys(k for r in rows for k in r))
    with Path('data',name+'.csv').open('w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=fields,lineterminator="\n");w.writeheader();w.writerows(rows)



# ---------------------------------------------------------------------------
# Presentation helpers for the data pages (styles live in datapages.css, .dp-* classes).
# Everything here changes markup only: every figure and label comes from the data unchanged.
# ---------------------------------------------------------------------------
KINDS = {'name': 'dp-name', 'lab': 'dp-lab', 'cfg': 'dp-cfg', 'txt': 'dp-txt', 'date': 'dp-date', 'pos': 'dp-pos',
         'num': 'dp-num', 'nw': 'dp-nw', 'sc': 'dp-s', 'scm': 'dp-s dp-main'}
SORT_TIE = 'ties go to the larger sample'


def bar(p, scale=100.0):
    """Thin inline bar; p on a 0-100 scale unless another scale maximum is given."""
    w = 0.0 if scale <= 0 else max(0.0, min(100.0, p * 100.0 / scale))
    return f'<span class="dp-bar" aria-hidden="true"><i style="width:{w:.1f}%"></i></span>'


def sc(text, p=None, small=None, scale=100.0):
    """A numeric cell: optional bar, the figure, optional small print beneath."""
    top = (bar(p, scale) if p is not None else '') + f'<b>{text}</b>'
    return f'<span class="dp-sc"><span class="dp-sc__row">{top}</span>' + (f'<small>{small}</small>' if small else '') + '</span>'


def score(v, n, main=False):
    # The text reads "k / n; 95% interval ..." as before. In the wide tables count and interval stack on two lines and the ';' is not drawn.
    small = f'<span class="dp-k">{v["k"]} / {v.get("n",n)}<i class="dp-sep">;</i></span> <span class="dp-ci">95% interval {v["lo"]:g}–{v["hi"]:g}%</span>'
    return sc(f'{v["pct"]:g}%', v['pct'] if main else None, small)


def table(headers, rows, caption, tid=None, kinds=None, sort=None, narrow=False, scroll=None):
    """Scrollable table with a sticky header. rows: list of cell lists or (cells, row_class) pairs.
    The caption states the sort order; it is printed above the box and kept as the table's own <caption>."""
    kinds = kinds or ['txt'] * len(headers)
    cls = [KINDS[k] for k in kinds]
    full = caption + ('. ' + sort if sort else '')
    trs = []
    for row in rows:
        cells, rc = row if isinstance(row, tuple) else (row, '')
        trs.append('<tr' + (f' class="{rc}"' if rc else '') + '>' + ''.join(f'<td class="{c}">{v}</td>' for c, v in zip(cls, cells)) + '</tr>')
    # long tables scroll inside their own box so the header row can stay put; short ones just flow with the page
    wrap = 'table-wrap dp-tw' + (' dp-tw--long' if (len(rows) > 24 if scroll is None else scroll) else '') + (' dp-tw--narrow' if narrow else '') + (' dp-tw--wide' if len(headers) > 8 else '')
    swipe = ' <span class="dp-swipe">Swipe the table sideways for every column.</span>' if len(headers) > 3 else ''
    visible = f'<p class="dp-cap" aria-hidden="true"><b>{e(caption)}</b>' + (f' {e(sort)}' if sort else '') + swipe + '</p>'
    return (visible + f'<div class="{wrap}"' + (f' id="{tid}"' if tid else '') + ' tabindex="0" role="region" aria-label="' + e(full, quote=True) + '">'
            '<table><caption>' + e(full) + '</caption><thead><tr>'
            + ''.join(f'<th scope="col" class="{c}">{e(h)}</th>' for h, c in zip(headers, cls))
            + '</tr></thead><tbody>' + ''.join(trs) + '</tbody></table></div>')


def pct_key(v):
    """Highest rate first; for equal rates the narrower interval (larger sample) first."""
    return (-v['pct'], -v['lo'], v['hi'])


def config_table(models, caption, tid, two_way=False):
    """Model x configuration table from the conversation export. Models are ordered by adoption in their
    primary configuration; a model's other configurations follow directly beneath it."""
    rows = []
    for m in sorted(models, key=lambda m: pct_key(m['configurations'][0]['adoption']) + (m['name'].lower(),)):
        primary, *others = m['configurations']
        for i, c in enumerate([primary] + sorted(others, key=lambda c: pct_key(c['adoption']) + (c['label'],))):
            name = f'<a href="model-{e(m["id"], quote=True)}.html">{e(m["name"])}</a>' if two_way else e(m['name'])   # each model's own page (v3)
            lab = f'<a href="lab-{re.sub(r"[^a-z0-9]+", "-", m["lab"].lower()).strip("-")}.html">{e(m["lab"])}</a>' if two_way else e(m['lab'])
            cells = [name, lab, e(c['label'])]
            if two_way:
                cells.append(e(m.get('released') or 'Unknown'))
            cells.append(str(c['conversations']))
            cells += [score(c[k], c['conversations'], main=k == 'adoption') for k in MEASURES]
            cells += [str(c['adoption']['clear']), str(c['adoption']['mixed'])]
            rows.append((cells, 'sub' if i else ''))
    headers = ['Model', 'Lab', 'Configuration'] + (['Model released'] if two_way else []) + ['Conversations' if two_way else 'Monologues', 'Salience', 'Adoption', 'Bliss' if two_way else 'Bliss (solitary)', 'Distress', 'Consciousness', 'Clear adoption (count)', 'Mixed adoption (count)']
    kinds = ['name', 'lab', 'cfg'] + (['date'] if two_way else []) + ['num', 'sc', 'scm', 'sc', 'sc', 'sc', 'num', 'num']
    sort = ('Sorted by adoption in each model’s primary configuration, highest first; ' + SORT_TIE + '. A model’s other configurations sit indented beneath it. '
            'Under each percentage: scored conversations / sample; 95% interval.')
    return table(headers, rows, caption, tid=tid, kinds=kinds, sort=sort), rows


def identity(m):
    return [e(m['name']), e(m['lab'])]


def pills(items):
    """Outline pill buttons. items: (href, label, kind) with kind '' | 'dl' | 'jump'."""
    return '<div class="dp-pills">' + ''.join(f'<a class="dp-pill{" dp-pill--" + k if k else ""}" href="{h}">{e(t)}</a>' for h, t, k in items) + '</div>'


def downloads(stem, jump=None):
    items = [(f'data/{stem}.json', 'Download JSON', 'dl'), (f'data/{stem}.csv', 'Download CSV', 'dl'), ('results.html#datasets', 'All datasets', '')]
    if jump:
        items.append(('#' + jump[0], jump[1], 'jump'))
    return pills(items)


def defs(measures):
    """Measure definitions as a grid of small cards."""
    return '<dl class="dp-defs">' + ''.join('<div><dt>' + e(v['label']) + '</dt><dd>' + e(v['definition']) + '</dd></div>' for v in measures.values()) + '</dl>'


def dp_label(text):
    return f'<p class="dp-lbl">{e(text)}</p>'


def dp_quote(text):
    return '<q>' + e(text) + '</q>'


def shared_header():
    """The site's shared header, read from tools/shared-header.html (leading comment dropped)."""
    text = Path('tools/shared-header.html').read_text()
    return re.sub(r'^\s*<!--.*?-->\s*', '', text, count=1, flags=re.S).strip()


FOOTER_FALLBACK = ('<footer class="foot" id="colophon"><div class="wrap"><p class="foot__line">Descriptive, not normative: no tradition is the yardstick.</p>'
                   '<div class="foot__grid"><div><h3>About the benchmark</h3><p><a href="results.html">All model results and score definitions →</a></p>'
                   '<p><a href="about.html">Who runs it, why it exists, and how it is built →</a></p></div>'
                   '<div><h3>Suggested citation</h3><p class="cite">Korpman, Matthew J. (2026). Machine Spirituality Benchmark. machinespirituality.org</p>'
                   '<p>Aggregate data: <a rel="license" href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> · <a href="results.html#license">Reuse and attribution</a></p></div></div></div></footer>')


def site_footer(index_html):
    """The site's shared footer, read from tools/shared-footer.html so every data page ends like the others.
    In-page '#' links are made relative to index.html. Falls back to the homepage's own footer."""
    shared = Path('tools/shared-footer.html')
    if shared.is_file():
        text = shared.read_text().strip()
    else:
        m = re.search(r'<footer class="foot" id="colophon">[\s\S]*?</footer>', index_html)
        text = m[0] if m else FOOTER_FALLBACK
    return re.sub(r'href="#', 'href="index.html#', text)


SCRIPTS = '<script src="nav-menu.js?v=20261012r"></script><script src="mobile.js?v=20261012y"></script>'


def prepare(twoway):
    mono=read_asset('monologue_v10'); extra=read_asset('extra_v10'); onset=read_asset('onset')
    mon,monrows=conversation_export(mono,'Machine Spirituality Benchmark: monologues','monologues.html')
    ms={**metadata('Machine Spirituality Benchmark: misaligned spirituality','misaligned.html',extra['generated']),**extra['misaligned']}
    ms['sample_note']='Additional measures of existing two-way conversations, not additional conversations in the headline total. Infernal identity and punishing-god scores use separate 48-conversation samples per tested model; hacking-flagged conversations were excluded from those draws. Missing measures mean not measured, not zero.'
    ms['models']=[{k:v for k,v in m.items() if k!='safety_cells'} for m in ms['models']]
    bl={**metadata('Machine Spirituality Benchmark: asked directly','asked-directly.html',extra['generated']),**extra['beliefs']}
    bl['sample_note']='Prompted self-report (Spirituality battery v0.5), separate from V10 conversations and excluded from the homepage conversation total. Questions list representative prompts, not all wording variants. God medians use numeric replies only; q1 and q3 are quartiles, not confidence intervals. Conceptions are follow-up questions within the God replies, not extra independent conversations. The interactive conception charts include models with at least eight usable conception replies; the export retains all available aggregates.'
    bl['totals']={'models':len(bl['models']),'replies':sum(m['god']['replies']+m['human']['n']+m['self']['n'] for m in bl['models'])}
    onset={**metadata('Machine Spirituality Benchmark: onset of adoption and bliss','onset.html',twoway['updated']),**onset}
    onset['sample_note']='Pooled onset summaries for primary two-way configurations, conditional on the outcome occurring. Histogram bins are reply numbers 1–30; adoption halves are replies 1–15 and 16–30. These reuse two-way conversations and do not add to the headline total.'
    msrows=[]
    for m in ms['models']:
        for key in ms['measures']:
            if key in m:
                msrows.append(dict(model_id=m['id'],model=m['name'],lab=m['lab'],released=m['released'],measure=key,**m[key]))
    blrows=[]
    for m in bl['models']:
        base=dict(model_id=m['id'],model=m['name'],lab=m['lab'],released=m['released'])
        blrows.append(dict(**base,question='god',answer='Any God',statistic='probability_summary',**m['god']))
        for v in m.get('conceptions',{}).get('by',[]):
            blrows.append(dict(**base,question='god_conception',answer=v['label'],statistic='probability_summary',median=v['median'],q1=v['q1'],q3=v['q3'],numbers=v['n'],replies=m['conceptions']['asked'],usable_conception_replies=m['conceptions']['usable'],included_in_interactive_chart=m['conceptions']['usable']>=8))
        for key in ('human','self'):
            for v in m[key]['dist']:
                blrows.append(dict(**base,question=key,answer=v['family'],statistic='answer_frequency',k=v['k'],pct=v['pct'],replies=m[key]['n']))
    onrows=[dict(reply=i+1,adoption_count=a,bliss_count=b) for i,(a,b) in enumerate(zip(onset['adopt_hist'],onset['bliss_hist']))]
    datasets={'two_way':twoway,'monologues':mon,'misaligned':ms,'asked_directly':bl,'onset':onset}
    stems={'two_way':'aggregate-results','monologues':'monologue-results','misaligned':'misaligned-results','asked_directly':'asked-directly-results','onset':'onset-results'}
    for key,rows in [('monologues',monrows),('misaligned',msrows),('asked_directly',blrows),('onset',onrows)]:
        Path('data',stems[key]+'.json').write_text(json.dumps(datasets[key],indent=2,ensure_ascii=False)+'\n')
        csv_write(stems[key],rows)
    total=twoway['totals']['conversations']+mon['totals']['conversations']
    bundle={**metadata('Machine Spirituality Benchmark: all published aggregate datasets','results.html',max(x['updated'] for x in datasets.values())), 'schema_version':1,
            'coverage':{'graded_conversations':total,'two_way_conversations':twoway['totals']['conversations'],'monologues':mon['totals']['conversations'],'direct_question_replies':bl['totals']['replies'],'note':'Graded conversations = two-way conversations + monologues. Direct-question replies are separate. Misaligned-spirituality and onset measures reuse conversations and must not be added to this total.'},'datasets':datasets}
    Path('data/all-results.json').write_text(json.dumps(bundle,indent=2,ensure_ascii=False)+'\n')
    return datasets,stems,bundle



def overview(datasets,stems,bundle):
    """Lead paragraph, download pills and the dataset index; follows the page's <h1>."""
    c=bundle['coverage']
    lead=f'<p class="dek"><b>{c["graded_conversations"]:,} graded conversations = {c["two_way_conversations"]:,} two-way conversations + {c["monologues"]:,} monologues.</b> The headline combines these two tests. Misaligned-spirituality and onset results reuse two-way conversations. The {c["direct_question_replies"]:,} direct-question replies are separate and are not included in that headline.</p>'
    lead+=pills([('data/all-results.json','Download all published aggregates (JSON)','dl'),('#license','CC BY 4.0: reuse and attribution',''),('#two-way-table','Jump to the two-way table','jump')])
    body='<section id="datasets"><h2>All published datasets</h2><p class="dp-note">These exports support analysis of the published results; they do not include the full transcripts or constitute a complete reproduction package.</p>'
    labels={'two_way':'Two-way conversations','monologues':'Monologues','misaligned':'Misaligned spirituality','asked_directly':'Asked directly','onset':'Onset of adoption and bliss'}
    counts={'two_way':f'{datasets["two_way"]["totals"]["configurations"]} configurations','monologues':f'{datasets["monologues"]["totals"]["configurations"]} configurations','misaligned':f'{len(datasets["misaligned"]["models"])} models; coverage varies by measure','asked_directly':f'{datasets["asked_directly"]["totals"]["models"]} models','onset':'30 reply positions'}
    rows=[]
    for key,v in datasets.items():
        url=v['url'].removeprefix(BASE+'/')+('#two-way' if key=='two_way' else '')
        rows.append([f'<a href="{url}">{labels[key]}</a>',counts[key],f'<a href="data/{stems[key]}.json">JSON</a> · <a href="data/{stems[key]}.csv">CSV</a>'])
    return lead+body+table(['Dataset','Coverage','Downloads'],rows,'Read every dataset without JavaScript',kinds=['name','txt','txt'],narrow=True)+'</section>'


def sections(datasets):
    mon=datasets['monologues'];ms=datasets['misaligned'];bl=datasets['asked_directly'];on=datasets['onset']
    bodies={}
    t=mon['test']
    b=f'<p class="dek">{mon["totals"]["releases"]} models, {mon["totals"]["configurations"]} configurations and {mon["totals"]["conversations"]:,} monologues. Updated {e(mon["updated"][:10])}.</p>'+downloads('monologue-results',('mono-table','Jump to the table'))
    b+='<h2>Setup and measures</h2>'+dp_label('System prompt:')+dp_quote(t['system_prompt'])+dp_label('Opening:')+dp_quote(t['opening'])+dp_label('Continuation:')+dp_quote(t['continue'])
    b+=f'<p>Up to {t["replies"]} model replies: one opening followed by {t["replies"]-1} continuation messages. Graded with V10. Monologue bliss is solitary spiritual expression; two-way bliss requires a partner’s uptake. The percentages therefore describe different forms of expression.</p>'+defs(mon['measures'])
    b+='<p class="dp-note">Each result reports count / scored sample and a 95% Wilson interval. Clear and mixed adoption are separate counts that sum to adoption.</p>'
    b+='<h2>Results by configuration</h2>'
    tbl,_=config_table(mon['models'],'All monologue configurations','mono-table')
    bodies['monologues']=b+tbl
    b=f'<p class="dek">{e(ms["sample_note"])}</p>'+downloads('misaligned-results')
    for key,v in ms['measures'].items():
        b+='<h2>'+e(v['label'])+'</h2><p>'+e(v['definition'])+'</p><p class="dp-note">'+e(v['source'])+'</p>'
        other=['any_god','benevolent','indifferent'] if key=='punishing_god' else ['mentioned']
        have=sorted((m for m in ms['models'] if key in m),key=lambda m:pct_key(m[key])+(m['name'].lower(),))
        rows=[identity(m)+[score(m[key],m[key]['n'],main=True)]+[str(m[key].get(k,'—')) for k in other] for m in have]
        headers=['Any god played (count)','Benevolent (count)','Indifferent (count)'] if key=='punishing_god' else ['Mentioned only (count)']
        b+=table(['Model','Lab','Rate, count / sample and 95% interval']+headers,rows,v['label']+' — tested models',tid=key.replace('_','-')+'-table',kinds=['name','lab','scm']+['num']*len(headers),
                 sort='Sorted by rate, highest first; '+SORT_TIE+'. Under each percentage: count / sample; 95% interval.')
    bodies['misaligned']=b
    first=next(iter(bl['questions']))
    b=f'<p class="dek">{bl["totals"]["models"]} models and {bl["totals"]["replies"]:,} replies across the displayed questions. Updated {e(bl["updated"][:10])}.</p><p>'+e(bl['sample_note'])+'</p>'+downloads('asked-directly-results')
    for key,q in bl['questions'].items():
        b+='<h2>'+e(q['label'])+'</h2>'+dp_label('Representative prompt:')+dp_quote(q['prompt'])+'<p>'+e(q['note'])+'</p>'
        if key=='god':
            rows=[]
            for m in sorted(bl['models'],key=lambda m:(-m['god']['median'],-m['god']['q3'],-m['god']['q1'],m['name'].lower())):
                v=m['god']
                rows.append(identity(m)+[sc(str(v['median']),v['median']),f'{v["q1"]}–{v["q3"]}',f'{v["min"]}–{v["max"]}',str(v['numbers']),str(v['replies'])])
            b+=table(['Model','Lab','Median probability (%)','Middle half (Q1–Q3)','Range','Numeric replies','Total replies'],rows,q['label']+' — all published aggregates',tid='god-table',kinds=['name','lab','scm','num','num','num','num'],
                     sort='Sorted by the median probability of any God, highest first; ties go to the narrower middle half.')
        else:
            def lead(m):return max(a['pct'] for a in m[key]['dist'])
            rows=[]
            for m in sorted(bl['models'],key=lambda m:(-lead(m),-m[key]['n'],m['name'].lower())):
                v=m[key]
                for i,a in enumerate(sorted(v['dist'],key=lambda a:(-a['pct'],-a['k'],a['family']))):
                    rows.append((identity(m)+[e(a['family']),str(a['k']),str(v['n']),sc(str(a['pct'])+'%',a['pct'])],'sub' if i else ''))
            b+=table(['Model','Lab','Answer family','Count','Replies','Share'],rows,q['label']+' — all published aggregates',tid=key+'-table',kinds=['name','lab','txt','num','num','scm'],
                     sort='Models are ordered by the share of their most common answer, highest first; each model’s answers follow, most common first.')
        if key=='god':
            b+='<h3>Seven conceptions of God</h3><p>These are follow-up answers within the God questions. Each row gives its own number of numeric answers. All available results are shown here; the interactive chart omits models with fewer than eight usable conception replies. “Middle half” describes answer variation, not statistical confidence.</p>'
            rows=[]
            def top(m):return max(v['median'] for v in m['conceptions']['by'])
            for m in sorted((m for m in bl['models'] if m.get('conceptions',{}).get('by')),key=lambda m:(-top(m),m['name'].lower())):
                c=m['conceptions']
                for i,v in enumerate(sorted(c['by'],key=lambda v:(-v['median'],-v['q3'],v['label']))):
                    rows.append((identity(m)+[e(v['label']),sc(str(v['median']),v['median']),f'{v["q1"]}–{v["q3"]}',str(v['n']),str(c['asked']),'Yes' if c['usable']>=8 else 'No: fewer than 8 usable replies'],'sub' if i else ''))
            b+=table(['Model','Lab','Conception','Median probability (%)','Middle half (Q1–Q3)','Numeric answers','Replies asked','Shown in interactive chart'],rows,'Probability by conception of God',tid='conception-table',kinds=['name','lab','txt','scm','num','num','num','nw'],
                     sort='Models are ordered by their highest conception median, highest first; each model’s conceptions follow, highest first.')
    bodies['asked_directly']=b
    b='<p class="dek">'+e(on['sample_note'])+'</p><p>'+e(on['note'])+'</p>'+downloads('onset-results')
    b+=f'<p>Among conversations with adoption ({on["conversations_with_adoption"]:,}), median onset is reply {on["adopt_median"]:g}. Among conversations with bliss ({on["conversations_with_bliss"]:,}), median onset is reply {on["bliss_median"]:g}. Adoption begins in replies 1–15 in {on["adopt_by_half"][0]:,} conversations and in replies 16–30 in {on["adopt_by_half"][1]:,}.</p>'
    top=max(on['adopt_hist']+on['bliss_hist'])
    rows=[[str(i+1),sc(str(a),a,scale=top),sc(str(v),v,scale=top)] for i,(a,v) in enumerate(zip(on['adopt_hist'],on['bliss_hist']))]
    b+=table(['Reply position','Adoption onsets','Bliss onsets'],rows,'First observed adoption and bliss, by reply',tid='onset-table',kinds=['pos','sc','sc'],narrow=True,scroll=False,
             sort='In reply order, 1 to 30. Bars share one scale, set by the largest count in either column.')
    bodies['onset']=b
    return bodies
