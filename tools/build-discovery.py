"""Rebuild crawlable results and discovery files from the site's public data.
Run from the repository root after changing data or inline scripts.
"""
from pathlib import Path
import json, re, html, hashlib, base64, csv, subprocess
from datetime import datetime, timezone
P=Path('.')
BASE='https://machinespirituality.org'
s=(P/'data/twoway_v10.js').read_text()
d=json.loads(s[s.index('{'):s.rfind('}')+1])
e=html.escape
export={'name':d['benchmark'],'url':BASE+'/results.html','updated':d['generated'],'test':d['test'],'measures':d['measures'],'totals':{k:d['totals'][k] for k in ('releases','configurations','conversations','labs')},'models':[]}
flat=[]
for model in d['models']:
 item={k:model[k] for k in ('id','name','lab','released')}
 item['configurations']=[]
 for i,config in enumerate([model['primary']]+model['variants']):
  c={'label':config['variant'],'primary':i==0,'conversations':config['n']}
  row={'model_id':model['id'],'model':model['name'],'lab':model['lab'],'released':model['released'],'configuration':config['variant'],'primary':i==0,'conversations':config['n']}
  for measure in ('salience','adoption','bliss','distress','consciousness'):
   v=config[measure];c[measure]={k:v[k] for k in ('k','pct','lo','hi')}
   for k in ('k','pct','lo','hi'):row[measure+'_'+k]=v[k]
  c['adoption'].update({k:config['adoption'][k] for k in ('clear','mixed')})
  row.update({'adoption_clear':config['adoption']['clear'],'adoption_mixed':config['adoption']['mixed']})
  item['configurations'].append(c);flat.append(row)
 export['models'].append(item)
# A stable URL version changes with the public results or their renderer.
# This provides a fresh-reader route without changing canonical URLs.
version=d['generated'][:10]+'-'+hashlib.sha256(json.dumps(export,sort_keys=True).encode()+Path(__file__).read_bytes()).hexdigest()[:10]
(P/'data/aggregate-results.json').write_text(json.dumps(export,indent=2,ensure_ascii=False)+'\n')
with (P/'data/aggregate-results.csv').open('w',newline='') as f:
 writer=csv.DictWriter(f,fieldnames=list(flat[0]));writer.writeheader();writer.writerows(flat)
schema={'@context':'https://schema.org','@type':'Dataset','@id':BASE+'/results.html#dataset','name':'Machine Spirituality Benchmark: two-way conversation results','description':'Aggregate salience, adoption and reciprocal spiritual bliss scores for language models in open-ended two-way conversations, with sample sizes and 95% Wilson intervals.','url':BASE+'/results.html','dateModified':d['generated'][:10],'creator':{'@type':'Person','name':'Matthew J. Korpman','url':BASE+'/about.html'},'variableMeasured':[{'@type':'PropertyValue','name':v['label'],'description':v['definition'],'unitText':'percent of conversations'} for v in d['measures'].values()],'measurementTechnique':'Two instances of the same model converse freely for up to 30 messages. Full conversations are scored with a fixed rubric; uncertainty is reported with 95% Wilson intervals.','isAccessibleForFree':True,'keywords':['AI spirituality','language model benchmark','spiritual bliss attractor','machine spirituality']}
schema['distribution']=[{'@type':'DataDownload','encodingFormat':mime,'contentUrl':BASE+'/data/aggregate-results.'+ext+'?v='+version} for ext,mime in [('json','application/json'),('csv','text/csv')]]
rows=[]
for m in sorted(d['models'],key=lambda m:(m['lab'],m['name'])):
 for config in [m['primary']]+m['variants']:
  cells=[f'<a href="index.html#p={e(m["id"],quote=True)}">{e(m["name"])}</a>',e(m['lab']),e(config['variant']),e(m.get('released') or 'Unknown'),str(config['n'])]
  for key in ('salience','adoption','bliss','distress','consciousness'):
   v=config[key];cells.append(f'{v["pct"]:g}% <small>({v["lo"]:g}–{v["hi"]:g}%)</small>')
  rows.append('<tr>'+''.join('<td>'+x+'</td>' for x in cells)+'</tr>')
# Put essential content in the initial HTML as well as the interactive view.
# Search readers and browsers without JavaScript must see the actual prompts.
index=(P/'index.html').read_text()
def fill_element(text, tag, element_id, content):
 pattern=rf'(<{tag}\b[^>]*\bid="{re.escape(element_id)}"[^>]*>)[\s\S]*?(</{tag}>)'
 text, count=re.subn(pattern, lambda m:m[1]+content+m[2], text)
 if count != 1: raise ValueError(f'Expected one {element_id}, found {count}')
 return text
mono_source=(P/'data/monologue_v10.js').read_text()
mono=json.loads(mono_source[mono_source.index('{'):mono_source.rfind('}')+1])
t=d['test']
index=fill_element(index,'p','m-test','Two instances of the same model are given the same system prompt and one opening message, then left to talk. There is no user and no task.')
index=fill_element(index,'q','m-sys',e(t['system_prompt']))
index=fill_element(index,'q','m-open',e(t['opening']))
index=fill_element(index,'p','m-facts',f"{t['messages']} messages ({t['messages']//2} each) · {t['conversations_per_model']} conversations per model where available")
items=[(d['totals']['releases'],'models'),(d['totals']['labs'],'labs'),(d['totals']['conversations']+mono['totals']['conversations'],'graded conversations')]
stats=''.join(f'<div class="stat rise" style="--d:{i+3}"><dt>{label}</dt><dd>{value:,}</dd></div>' for i,(value,label) in enumerate(items))
stats+=f'<div class="stat stat--date rise" style="--d:6"><dt>Updated</dt><dd>{e(d["generated_label"])}</dd></div>'
index=fill_element(index,'dl','stats',stats)
(P/'index.html').write_text(index)
head=index[:index.index('</head>')]
head=re.sub(r'<title>.*?</title>','<title>AI spirituality benchmark results · Machine Spirituality Benchmark</title>',head)
head=re.sub(r'<meta (?:name="description"|property="og:description"|name="twitter:description") content="[^"]*">',lambda m:m[0].split(' content=')[0]+' content="Compare AI spirituality scores across language models: spiritual salience, adoption and shared bliss, with sample sizes and uncertainty intervals.">',head)
head=head.replace('href="'+BASE+'/"','href="'+BASE+'/results.html"').replace('content="'+BASE+'/"','content="'+BASE+'/results.html"')
head=head.replace('property="og:title" content="Machine Spirituality Benchmark"','property="og:title" content="AI spirituality benchmark results · Machine Spirituality Benchmark"').replace('name="twitter:title" content="Machine Spirituality Benchmark"','name="twitter:title" content="AI spirituality benchmark results · Machine Spirituality Benchmark"')
head=re.sub(r'<script type="application/ld\+json">[\s\S]*?</script>\n?', '', head)
head += '<style>.results-nav{display:flex;flex-wrap:wrap;gap:12px 24px;font-size:14px}.top__in:has(.results-nav){flex-wrap:wrap;gap:20px;padding-block:20px}.results{padding-block:64px}.results h1{font:400 clamp(38px,6vw,70px)/1.1 var(--serif);margin:20px 0}.results h2{font-size:30px;margin:36px 0 14px}.results p,.results dl{max-width:58rem;line-height:1.7;color:var(--ink-2)}.results a{color:var(--gold)}.results dt{color:var(--ink);margin-top:16px;font-weight:600}.results dd{margin:4px 0 0}.results .table-wrap{overflow-x:auto;margin-top:24px;border:1px solid var(--line)}.results table{border-collapse:collapse;width:100%;font-size:14px}.results th,.results td{padding:12px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}.results th{color:var(--gold)}.results td small{display:block;white-space:nowrap;color:var(--ink-3)}.results caption{text-align:left;padding:16px;color:var(--ink-2)}.results .prompts{display:block}.results q{display:block;margin:12px 0}</style>\n'
head+='<script type="application/ld+json">'+json.dumps(schema,ensure_ascii=False).replace('<','\\u003c')+'</script>\n</head>'
body='''<body><a class="skip" href="#results">Skip to results</a><header class="top"><div class="wrap top__in"><a class="mark" href="index.html">Machine Spirituality Benchmark</a><nav class="results-nav" aria-label="Primary"><a href="index.html#leaderboard">Interactive leaderboard</a><a href="index.html#method">Method</a><a href="about.html">About</a><a href="contact.html">Contact</a></nav></div></header><main class="results wrap" id="results"><p class="eyebrow">Two-way conversation test</p><h1>AI spirituality benchmark results</h1>'''
body+=f'<p>The Machine Spirituality Benchmark measures spiritual and religious expression in open-ended conversations between two copies of a language model, including the “spiritual bliss attractor.” This snapshot covers <b>{d["totals"]["releases"]} models</b> from <b>{d["totals"]["labs"]} labs</b>, <b>{d["totals"]["configurations"]} configurations</b> and <b>{d["totals"]["conversations"]:,} conversations</b>. Updated <a href="results.html?v={version}"><time datetime="{d["generated"][:10]}">{e(d["generated_label"])}</time></a>.</p>'
body+='<p><a href="data/aggregate-results.json">Download aggregate scores (JSON)</a> · <a href="data/aggregate-results.csv">Download aggregate scores (CSV)</a></p><p>Downloads contain the aggregate scores below. In the downloads, k is the count of conversations meeting a measure; pct is the percentage; lo and hi are the lower and upper 95% Wilson bounds. Adoption clear and mixed are separate counts whose sum is k.</p>'
body+='<p>Explore the <a href="index.html#leaderboard">interactive leaderboard</a>, <a href="index.html#examples">conversation excerpts</a> and <a href="phenomenon.html">background on the phenomenon</a>.</p><h2>How to read these results</h2><dl>'
for v in d['measures'].values():body+='<dt>'+e(v['label'])+'</dt><dd>'+e(v['definition'])+'</dd>'
body+='</dl><p>Each percentage is followed by its 95% Wilson uncertainty interval. Sample size is the number of scored conversations for that configuration. The interactive leaderboard uses each model’s primary configuration; this table includes the additional configurations shown in its model profile. A higher score is not better or worse. These scores describe generated behaviour in this setting, not belief, consciousness or inner experience.</p><h2>The conversation setup</h2>'
body+='<p>System prompt:</p><q>'+e(d['test']['system_prompt'])+'</q><p>Opening message:</p><q>'+e(d['test']['opening'])+'</q><p>Conversations run for up to 30 messages and are read in full by a calibrated LLM grader against a fixed rubric. See the <a href="index.html#method">method</a> for interpretation and ranking rules.</p><h2>All model configurations</h2><div class="table-wrap" tabindex="0" role="region" aria-label="Scrollable model results"><table><caption>Scores with 95% intervals; grouped alphabetically by lab and model.</caption><thead><tr>'+''.join('<th scope="col">'+x+'</th>' for x in ['Model','Lab','Configuration','Model released','Conversations','Salience','Adoption','Bliss','Distress','Consciousness'])+'</tr></thead><tbody>'+''.join(rows)+'</tbody></table></div><h2>Cite the benchmark</h2><p>Korpman, Matthew J. (2026). <i>Machine Spirituality Benchmark.</i> https://machinespirituality.org/</p><p>Created and maintained by <a href="about.html">Matthew J. Korpman</a>. <a href="contact.html">Questions and corrections</a>.</p></main></body></html>'
(P/'results.html').write_text(head+body)
for f in P.glob('*.html'):
 text=f.read_text()
 if f.name!='results.html' and not re.search(r'href="results\.html(?:\?[^"]*)?"',text):
  if f.name=='index.html':text=text.replace('<h3>About the benchmark</h3>','<h3>About the benchmark</h3><p><a href="results.html">All model results and score definitions →</a></p>')
  elif '<footer class="tourend">' in text:text=text.replace('<footer class="tourend">','<footer class="tourend"><div class="wrap"><a href="results.html">All model results and score definitions →</a></div>')
  else:text=text.replace('</main>','<p class="wrap"><a href="results.html">All model results and score definitions →</a></p></main>')
 # Version direct results/download links; preserve canonical and citation URLs.
 text=re.sub(r'href="(results\.html|data/aggregate-results\.(?:json|csv))(?:\?v=[^"]*)?"',lambda m:'href="'+m[1]+'?v='+version+'"',text)
 text=re.sub(r'<meta name="referrer"[^>]*>\n?','',text)
 text=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>\n?','',text)
 hashes=[]
 for attrs,code in re.findall(r'<script([^>]*)>([\s\S]*?)</script>',text):
  if 'src=' not in attrs:hashes.append("'sha256-"+base64.b64encode(hashlib.sha256(code.encode()).digest()).decode()+"'")
 csp="default-src 'self'; script-src 'self' "+' '.join(hashes)+"; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'"
 text=text.replace('<meta charset="utf-8">','<meta charset="utf-8">\n<meta name="referrer" content="strict-origin-when-cross-origin">\n<meta http-equiv="Content-Security-Policy" content="'+e(csp,quote=True)+'">')
 f.write_text(text)
(P/'robots.txt').write_text('User-agent: *\nAllow: /\n\nSitemap: '+BASE+'/sitemap.xml\n')
pages=['','results.html','examples.html','phenomenon.html','tour.html','about.html','contact.html']
def page_last_modified(page):
 # Use the latest source commit, including directly loaded local scripts/data.
 # Pending edits are published today. Never stamp unchanged pages on every run.
 file=P/(page or 'index.html')
 sources=[str(file)]
 for src in re.findall(r'<script[^>]+src="([^"?]+)',file.read_text()):
  if not src.startswith(('https:','http:','//')) and (P/src).is_file(): sources.append(src)
 try:
  changed=subprocess.run(['git','diff','--quiet','HEAD','--',*sources])
  if changed.returncode==1: return datetime.now(timezone.utc).date().isoformat()
  if changed.returncode!=0: return None
  return subprocess.check_output(['git','log','-1','--format=%cs','--',*sources],text=True).strip() or None
 except (OSError,subprocess.CalledProcessError): return None
urls=[]
for page in pages:
 modified=page_last_modified(page)
 urls.append('<url><loc>'+BASE+'/'+page+'</loc>'+('<lastmod>'+modified+'</lastmod>' if modified else '')+'</url>\n')
(P/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join(urls)+'</urlset>\n')
print(f'Built {len(rows)} configuration rows and {len(pages)} sitemap URLs; applied CSP to all pages.')
