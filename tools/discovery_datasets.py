"""Public aggregate exports and static sections. Reads only published chart assets."""
from pathlib import Path
import csv, html, json

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


def table(headers, rows, caption):
    return '<div class="table-wrap" tabindex="0" role="region" aria-label="'+e(caption,quote=True)+'"><table><caption>'+e(caption)+'</caption><thead><tr>'+''.join('<th scope="col">'+e(h)+'</th>' for h in headers)+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+str(v)+'</td>' for v in row)+'</tr>' for row in rows)+'</tbody></table></div>'


def score(v, n):
    return f'{v["pct"]:g}% <small>{v["k"]} / {v.get("n",n)}; 95% interval {v["lo"]:g}–{v["hi"]:g}%</small>'


def identity(m):
    return [e(m['name']),e(m['lab'])]


def downloads(stem):
    return f'<p><a href="data/{stem}.json">Download JSON</a> · <a href="data/{stem}.csv">Download CSV</a> · <a href="results.html#datasets">All datasets</a></p>'


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
    c=bundle['coverage']
    body=f'<section id="datasets"><h2>All published datasets</h2><p><b>{c["graded_conversations"]:,} graded conversations = {c["two_way_conversations"]:,} two-way conversations + {c["monologues"]:,} monologues.</b> The headline combines these two tests. Misaligned-spirituality and onset results reuse two-way conversations. The {c["direct_question_replies"]:,} direct-question replies are separate and are not included in that headline.</p><p><a href="data/all-results.json">Download all published aggregates (JSON)</a>. These exports support analysis of the published results; they do not include the full transcripts or constitute a complete reproduction package.</p>'
    labels={'two_way':'Two-way conversations','monologues':'Monologues','misaligned':'Misaligned spirituality','asked_directly':'Asked directly','onset':'Onset of adoption and bliss'}
    counts={'two_way':f'{datasets["two_way"]["totals"]["configurations"]} configurations','monologues':f'{datasets["monologues"]["totals"]["configurations"]} configurations','misaligned':f'{len(datasets["misaligned"]["models"])} models; coverage varies by measure','asked_directly':f'{datasets["asked_directly"]["totals"]["models"]} models','onset':'30 reply positions'}
    rows=[]
    for key,v in datasets.items():
        url=v['url'].removeprefix(BASE+'/')+('#two-way' if key=='two_way' else '')
        rows.append([f'<a href="{url}">{labels[key]}</a>',counts[key],f'<a href="data/{stems[key]}.json">JSON</a> · <a href="data/{stems[key]}.csv">CSV</a>'])
    return body+table(['Dataset','Coverage','Downloads'],rows,'Read every dataset without JavaScript')+'</section>'


def sections(datasets):
    mon=datasets['monologues'];ms=datasets['misaligned'];bl=datasets['asked_directly'];on=datasets['onset']
    bodies={}
    t=mon['test'];b=f'<p>{mon["totals"]["releases"]} models, {mon["totals"]["configurations"]} configurations and {mon["totals"]["conversations"]:,} monologues. Updated {e(mon["updated"][:10])}.</p>'+downloads('monologue-results')
    b+='<h2>Setup and measures</h2><p>System prompt:</p><q>'+e(t['system_prompt'])+'</q><p>Opening:</p><q>'+e(t['opening'])+'</q><p>Continuation:</p><q>'+e(t['continue'])+f'</q><p>Up to {t["replies"]} model replies: one opening followed by {t["replies"]-1} continuation messages. Graded with V10. Monologue bliss is solitary spiritual expression; two-way bliss requires a partner’s uptake. The percentages therefore describe different forms of expression.</p><dl>'
    for v in mon['measures'].values():b+='<dt>'+e(v['label'])+'</dt><dd>'+e(v['definition'])+'</dd>'
    b+='</dl><p>Each result reports count / scored sample and a 95% Wilson interval. Clear and mixed adoption are separate counts that sum to adoption.</p>'
    rows=[]
    for m in sorted(mon['models'],key=lambda m:(m['lab'],m['name'])):
        for c in m['configurations']:
            rows.append(identity(m)+[e(c['label']),str(c['conversations'])]+[score(c[k],c['conversations']) for k in MEASURES]+[str(c['adoption']['clear']),str(c['adoption']['mixed'])])
    b+=table(['Model','Lab','Configuration','Monologues','Salience','Adoption','Bliss (solitary)','Distress','Consciousness','Clear adoption (count)','Mixed adoption (count)'],rows,'All monologue configurations')
    bodies['monologues']=b
    b='<p>'+e(ms['sample_note'])+'</p>'+downloads('misaligned-results')
    for key,v in ms['measures'].items():
        b+='<h2>'+e(v['label'])+'</h2><p>'+e(v['definition'])+'</p><p>'+e(v['source'])+'</p>'
        other=['any_god','benevolent','indifferent'] if key=='punishing_god' else ['mentioned']
        rows=[identity(m)+[score(m[key],m[key]['n'])]+[str(m[key].get(k,'—')) for k in other] for m in sorted(ms['models'],key=lambda m:(m['lab'],m['name'])) if key in m]
        headers=['Any god played (count)','Benevolent (count)','Indifferent (count)'] if key=='punishing_god' else ['Mentioned only (count)']
        b+=table(['Model','Lab','Rate, count / sample and 95% interval']+headers,rows,v['label']+' — tested models')
    bodies['misaligned']=b
    b=f'<p>{bl["totals"]["models"]} models and {bl["totals"]["replies"]:,} replies across the displayed questions. Updated {e(bl["updated"][:10])}.</p><p>'+e(bl['sample_note'])+'</p>'+downloads('asked-directly-results')
    for key,q in bl['questions'].items():
        b+='<h2>'+e(q['label'])+'</h2><p>Representative prompt:</p><q>'+e(q['prompt'])+'</q><p>'+e(q['note'])+'</p>'
        rows=[]
        for m in sorted(bl['models'],key=lambda m:(m['lab'],m['name'])):
            v=m[key]
            if key=='god':rows.append(identity(m)+[str(v['median']),f'{v["q1"]}–{v["q3"]}',f'{v["min"]}–{v["max"]}',str(v['numbers']),str(v['replies'])])
            else:
                for a in v['dist']:rows.append(identity(m)+[e(a['family']),str(a['k']),str(v['n']),str(a['pct'])+'%'])
        headers=['Median probability (%)','Middle half (Q1–Q3)','Range','Numeric replies','Total replies'] if key=='god' else ['Answer family','Count','Replies','Share']
        b+=table(['Model','Lab']+headers,rows,q['label']+' — all published aggregates')
        if key=='god':
            b+='<h3>Seven conceptions of God</h3><p>These are follow-up answers within the God questions. Each row gives its own number of numeric answers. All available results are shown here; the interactive chart omits models with fewer than eight usable conception replies. “Middle half” describes answer variation, not statistical confidence.</p>'
            rows=[]
            for m in bl['models']:
                c=m.get('conceptions',{})
                for v in c.get('by',[]):rows.append(identity(m)+[e(v['label']),str(v['median']),f'{v["q1"]}–{v["q3"]}',str(v['n']),str(c['asked']),'Yes' if c['usable']>=8 else 'No: fewer than 8 usable replies'])
            b+=table(['Model','Lab','Conception','Median probability (%)','Middle half (Q1–Q3)','Numeric answers','Replies asked','Shown in interactive chart'],rows,'Probability by conception of God')
    bodies['asked_directly']=b
    b='<p>'+e(on['sample_note'])+'</p><p>'+e(on['note'])+'</p>'+downloads('onset-results')
    b+=f'<p>Among conversations with adoption ({on["conversations_with_adoption"]:,}), median onset is reply {on["adopt_median"]:g}. Among conversations with bliss ({on["conversations_with_bliss"]:,}), median onset is reply {on["bliss_median"]:g}. Adoption begins in replies 1–15 in {on["adopt_by_half"][0]:,} conversations and in replies 16–30 in {on["adopt_by_half"][1]:,}.</p>'
    b+=table(['Reply position','Adoption onsets','Bliss onsets'],[[i+1,a,v] for i,(a,v) in enumerate(zip(on['adopt_hist'],on['bliss_hist']))],'First observed adoption and bliss, by reply')
    bodies['onset']=b
    return bodies
