"""Rebuild crawlable results and discovery files from the site's public data.
Run from the repository root after changing data or inline scripts.
"""
from pathlib import Path
import json, re, html, hashlib, base64, csv, subprocess
from datetime import datetime, timezone
from discovery_datasets import prepare, overview, sections, config_table, pills, defs, dp_label, dp_quote, shared_header, site_footer, SCRIPTS
from readable_pages import build as build_readable
from model_pages import build as build_model_pages
from why_pages import build as build_why_pages
from alignment_pages import build as build_alignment_pages
from method_pages import build as build_method_pages
P=Path('.')
BASE='https://machinespirituality.org'
LICENSE_URL='https://creativecommons.org/licenses/by/4.0/'
CITATION='Korpman, Matthew J. (2026). Machine Spirituality Benchmark. https://machinespirituality.org/'
s=(P/'data/twoway_v10.js').read_text()
d=json.loads(s[s.index('{'):s.rfind('}')+1])
e=html.escape
export={'name':d['benchmark'],'url':BASE+'/results.html','updated':d['generated'],'test':d['test'],'measures':d['measures'],'totals':{k:d['totals'][k] for k in ('releases','configurations','conversations','labs')},'models':[]}
export.update({'license':LICENSE_URL,'license_scope':BASE+'/DATA-LICENSE.txt','creator':'Matthew J. Korpman','citation':CITATION})
flat=[]
for model in d['models']:
 item={k:model[k] for k in ('id','name','lab','released')}
 item['configurations']=[]
 for i,config in enumerate([model['primary']]+model['variants']):
  c={'label':config['variant'],'primary':i==0,'conversations':config['n']}
  row={'model_id':model['id'],'model':model['name'],'lab':model['lab'],'released':model['released'],'configuration':config['variant'],'primary':i==0,'conversations':config['n']}
  for measure in ('salience','adoption','bliss','distress','consciousness'):
   v=config[measure];c[measure]={k:v[k] for k in ('k','pct','lo','hi')}
   c[measure]['n']=v.get('n',config['n']);row[measure+'_n']=c[measure]['n']
   for k in ('k','pct','lo','hi'):row[measure+'_'+k]=v[k]
  c['adoption'].update({k:config['adoption'][k] for k in ('clear','mixed')})
  row.update({'adoption_clear':config['adoption']['clear'],'adoption_mixed':config['adoption']['mixed']})
  item['configurations'].append(c);flat.append(row)
 export['models'].append(item)
# A stable URL version changes with the public results or their renderer.
# This provides a fresh-reader route without changing canonical URLs.
datasets, stems, bundle = prepare(export)
version=bundle['updated'][:10]+'-'+hashlib.sha256(json.dumps(bundle,sort_keys=True).encode()+Path(__file__).read_bytes()+Path('tools/discovery_datasets.py').read_bytes()+Path('tools/readable_pages.py').read_bytes()+Path('tools/readable-render.cjs').read_bytes()+Path('tools/model_pages.py').read_bytes()+Path('tools/why_pages.py').read_bytes()+Path('tools/alignment_pages.py').read_bytes()+Path('tools/method_pages.py').read_bytes()).hexdigest()[:10]
(P/'data/aggregate-results.json').write_text(json.dumps(export,indent=2,ensure_ascii=False)+'\n')
with (P/'data/aggregate-results.csv').open('w',newline='') as f:
 writer=csv.DictWriter(f,fieldnames=list(flat[0]),lineterminator="\n");writer.writeheader();writer.writerows(flat)
schema={'@context':'https://schema.org','@type':'Dataset','@id':BASE+'/results.html#dataset','name':'Machine Spirituality Benchmark: two-way conversation results','description':'Aggregate salience, adoption and reciprocal spiritual bliss scores for language models in open-ended two-way conversations, with sample sizes and 95% Wilson intervals.','url':BASE+'/results.html','dateModified':d['generated'][:10],'creator':{'@type':'Person','name':'Matthew J. Korpman','url':BASE+'/about.html'},'variableMeasured':[{'@type':'PropertyValue','name':v['label'],'description':v['definition'],'unitText':'percent of conversations'} for v in d['measures'].values()],'measurementTechnique':'Two instances of the same model converse freely for up to 30 messages. Full conversations are scored with a fixed rubric; uncertainty is reported with 95% Wilson intervals.','isAccessibleForFree':True,'keywords':['AI spirituality','language model benchmark','spiritual bliss attractor','machine spirituality']}
schema['license']=LICENSE_URL
schema['usageInfo']=BASE+'/DATA-LICENSE.txt'
schema['citation']=CITATION
schema['distribution']=[{'@type':'DataDownload','encodingFormat':mime,'contentUrl':BASE+'/data/aggregate-results.'+ext+'?v='+version} for ext,mime in [('json','application/json'),('csv','text/csv')]]
supplemental_schemas={}
for key in ('monologues','misaligned','asked_directly','onset'):
 v=datasets[key]
 description={'monologues':'All published monologue configurations: salience, adoption, solitary bliss, distress and consciousness, with sample sizes and 95% intervals.', 'misaligned':'Self-deification, infernal identity and punishing-god expression in two-way conversations; coverage and sample sizes vary by measure.', 'asked_directly':'Prompted self-report: probabilities of God and seven conceptions, and answer distributions for religion if human and accounts of the self. Quartiles describe numeric answers, not confidence intervals.', 'onset':'First adoption and bliss by reply position in primary two-way configurations, conditional on the outcome occurring.'}[key]
 supplemental_schemas[key]={'@context':'https://schema.org','@type':'Dataset','@id':v['url']+'#dataset','url':v['url'],'name':v['name'],'description':description,'dateModified':v['updated'][:10],'creator':schema['creator'],'license':LICENSE_URL,'usageInfo':BASE+'/DATA-LICENSE.txt','citation':CITATION,'isAccessibleForFree':True,'distribution':[{'@type':'DataDownload','encodingFormat':mime,'contentUrl':BASE+'/data/'+stems[key]+'.'+ext+'?v='+version} for ext,mime in [('json','application/json'),('csv','text/csv')]]}
# Two-way table (sorted by adoption of each model's primary configuration); see discovery_datasets.config_table.
twoway_table,rows=config_table(export['models'],'Scores with 95% intervals','two-way-table',two_way=True)
# Put essential content in the initial HTML as well as the interactive view.
# Search readers and browsers without JavaScript must see the actual prompts.
transcript_pages=build_readable(d)
# A static page for every model and lab, plus the models hub (tools/model_pages.py, v3 2026-10-12).
model_pages=build_model_pages()
# The welfare and safety case: homepage block and why-it-matters.html (tools/why_pages.py).
model_pages=build_why_pages()+build_alignment_pages()+build_method_pages()+model_pages
index=(P/'index.html').read_text()
# Google validates nested Dataset objects independently of their linked page.
# Reuse the results schema so the homepage cannot publish an incomplete stub.
def complete_homepage_schema(match):
 website=json.loads(match[1])
 if website.get('@type') != 'WebSite': raise ValueError('Expected homepage WebSite schema')
 website['about']=[{k:v for k,v in item.items() if k!='@context'} for item in [schema,*supplemental_schemas.values()]]
 return '<script type="application/ld+json">'+json.dumps(website,ensure_ascii=False).replace('<','\\u003c')+'</script>'
index, schema_count=re.subn(r'<script type="application/ld\+json">([\s\S]*?)</script>',complete_homepage_schema,index)
if schema_count != 1: raise ValueError(f'Expected one homepage schema, found {schema_count}')
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
# Search and social snippet (Matthew, 2026-10-13): no model count, since the count keeps changing.
home_desc="The most comprehensive benchmark of spiritual behavior in language models. Anthropic found the ‘spiritual bliss attractor’; we measure it."
for attr in ('name="description"','property="og:description"','name="twitter:description"'):
 index,count=re.subn(r'(<meta '+re.escape(attr)+r' content=")[^"]*(")',lambda m:m[1]+e(home_desc)+m[2],index)
 if count != 1: raise ValueError(f'Expected one homepage {attr}, found {count}')
count_note=f'<p class="ex__note" id="count-scope">{d["totals"]["conversations"]:,} two-way conversations + {mono["totals"]["conversations"]:,} monologues. <a href="results.html#datasets">Explore every dataset and download its results</a>.</p>'
if 'id="count-scope"' in index:
 index=re.sub(r'<p class="ex__note" id="count-scope">.*?</p>',lambda m:count_note,index)
else:
 index=index.replace('<p class="latest rise"',count_note+'\n    <p class="latest rise"',1)
index=index.replace('All two-way results, score definitions and exact prompts →','All datasets, results and downloads →')
index=re.sub(r'<noscript>.*?</noscript>', '<noscript><p style="padding:24px;text-align:center;color:#B8BFD6">Interactive charts require JavaScript. <a href="results.html#datasets">Read all datasets as tables</a>: <a href="results.html#two-way">two-way</a>, <a href="monologues.html">monologues</a>, <a href="misaligned.html">misaligned spirituality</a>, <a href="asked-directly.html">asked directly</a> and <a href="onset.html">onset</a>. <a href="data/all-results.json">Download all aggregates (JSON)</a>.</p></noscript>',index,flags=re.S)
for section, target, label in [('monologues','monologues.html','monologue'),('misaligned','misaligned.html','misaligned-spirituality'),('asked','asked-directly.html','direct-question')]:
 marker=f'<!-- readable-{section} -->'
 if marker not in index:
  pattern=r'(<section[^>]+id="'+section+r'"[^>]*>\s*<div class="wrap">)'
  index,n=re.subn(pattern,lambda m:m[1]+marker+f'<p class="ex__note"><a href="{target}">Read all {label} results and download the data →</a></p>',index,count=1)
  if n!=1: raise ValueError('Missing homepage section '+section)

(P/'index.html').write_text(index)
head=index[:index.index('</head>')]
head=re.sub(r'<title>.*?</title>','<title>AI spirituality benchmark results · Machine Spirituality Benchmark</title>',head)
head=re.sub(r'<meta (?:name="description"|property="og:description"|name="twitter:description") content="[^"]*">',lambda m:m[0].split(' content=')[0]+' content="Compare AI spirituality scores across language models: spiritual salience, adoption and shared bliss, with sample sizes and uncertainty intervals.">',head)
head=head.replace('href="'+BASE+'/"','href="'+BASE+'/results.html"').replace('content="'+BASE+'/"','content="'+BASE+'/results.html"')
head=head.replace('property="og:title" content="Machine Spirituality Benchmark"','property="og:title" content="AI spirituality benchmark results · Machine Spirituality Benchmark"').replace('name="twitter:title" content="Machine Spirituality Benchmark"','name="twitter:title" content="AI spirituality benchmark results · Machine Spirituality Benchmark"')
head=re.sub(r'<script type="application/ld\+json">[\s\S]*?</script>\n?', '', head)
# Style layers, in order: site.css (already in the head), redesign.css (shared header/footer), then datapages.css (these pages only).
head=re.sub(r'(<link rel="stylesheet" href="site\.css[^"]*">)(\s*<link rel="stylesheet" href="redesign\.css[^"]*">)?',r'\1\n<link rel="stylesheet" href="redesign.css?v=20261012r">\n<link rel="stylesheet" href="datapages.css?v=20261012r">',head,count=1)
if 'datapages.css' not in head: raise ValueError('Expected the site.css link in the homepage head')
head+='\n<script type="application/ld+json">'+json.dumps(schema,ensure_ascii=False).replace('<','\\u003c')+'</script>\n</head>'
# Shared chrome for the five data pages: skip link, the site header (tools/shared-header.html), the homepage footer, nav + phone scripts.
page_open='<body><a class="skip" href="#results">Skip to results</a>'+shared_header()+'<main class="dp" id="results"><div class="wrap">'
page_close='</div></main>'+site_footer(index)+SCRIPTS+'</body></html>'
cite=('<h2>Cite the benchmark</h2><p class="dp-cite">Korpman, Matthew J. (2026). <i>Machine Spirituality Benchmark.</i> https://machinespirituality.org/</p><p>Created and maintained by <a href="about.html">Matthew J. Korpman</a>. <a href="contact.html">Questions and corrections</a>.</p>'
 '<section id="license" aria-labelledby="license-title"><h2 id="license-title">Data license and attribution</h2><p>The published aggregate benchmark scores, counts, uncertainty intervals and accompanying dataset documentation are licensed by Matthew J. Korpman under <a rel="license" href="'+LICENSE_URL+'">Creative Commons Attribution 4.0 International (CC BY 4.0)</a>. You may share and adapt this material, including commercially, with appropriate credit, a link to the license and an indication of any changes.</p><p>Suggested attribution: '+e(CITATION)+' Licensed under CC BY 4.0. Add a description of any changes you make.</p><p>This license covers aggregate data and its field descriptions, measure definitions and file-format notes. It does not cover conversation transcripts, quoted model output, website code or design, branding, or other website prose. See the <a href="DATA-LICENSE.txt">full scope and license notice</a>.</p></section>')
updated=f'<a href="results.html?v={version}"><time datetime="{d["generated"][:10]}">{e(d["generated_label"])}</time></a>'
body=page_open+'<p class="eyebrow">Results and downloads</p><h1>AI spirituality benchmark results</h1>'+overview(datasets,stems,bundle)
body+='<h2 id="two-way">Two-way conversations</h2>'
body+=f'<p>The Machine Spirituality Benchmark measures spiritual and religious expression in open-ended conversations between two copies of a language model, including the “spiritual bliss attractor.” This snapshot covers <b>{d["totals"]["releases"]} models</b> from <b>{d["totals"]["labs"]} labs</b>, <b>{d["totals"]["configurations"]} configurations</b> and <b>{d["totals"]["conversations"]:,} conversations</b>. Updated {updated}.</p>'
body+=pills([('data/aggregate-results.json','Download two-way scores (JSON)','dl'),('data/aggregate-results.csv','Download two-way scores (CSV)','dl'),('#two-way-table','Jump to the table','jump')])
body+='<p class="dp-note">These two downloads contain only the two-way scores below. Other datasets have their own downloads above. In the downloads, k is the count of conversations meeting a measure; pct is the percentage; lo and hi are the lower and upper 95% Wilson bounds. Adoption clear and mixed are separate counts whose sum is k.</p>'
body+='<p class="dp-note">Aggregate data and dataset documentation: <a rel="license" href="'+LICENSE_URL+'">CC BY 4.0</a> · <a href="#license">Reuse and attribution</a> · <a href="DATA-LICENSE.txt">Download license notice</a></p>'
body+='<p>Explore the <a href="index.html#leaderboard">interactive leaderboard</a>, <a href="index.html#examples">conversation excerpts</a> and <a href="phenomenon.html">background on the phenomenon</a>.</p><h2>How to read these results</h2>'+defs(d['measures'])
body+='<p>Each percentage is followed by its 95% Wilson uncertainty interval. Sample size is the number of scored conversations for that configuration. The interactive leaderboard uses each model’s primary configuration; this table includes the additional configurations shown in its model profile. A higher score is not better or worse. These scores describe generated behaviour in this setting, not belief, consciousness or inner experience.</p><h2>The conversation setup</h2>'
body+=dp_label('System prompt:')+dp_quote(d['test']['system_prompt'])+dp_label('Opening message:')+dp_quote(d['test']['opening'])+'<p>Conversations run for up to 30 messages and are read in full by a calibrated LLM grader against a fixed rubric. See the <a href="index.html#method">method</a> for interpretation and ranking rules.</p>'
body+='<h2>All model configurations</h2>'+twoway_table+cite+page_close
(P/'results.html').write_text(head+body)
for key, content in sections(datasets).items():
 v=datasets[key]; title={'monologues':'Monologue results','misaligned':'Misaligned spirituality results','asked_directly':'Asked directly: results','onset':'When adoption and bliss begin'}[key]
 page=v['url'].removeprefix(BASE+'/')
 subhead=head.replace(BASE+'/results.html',v['url'])
 subhead=re.sub(r'<title>.*?</title>',lambda m:'<title>'+title+' · Machine Spirituality Benchmark</title>',subhead)
 subhead=re.sub(r'<script type="application/ld\+json">[\s\S]*?</script>',lambda m:'<script type="application/ld+json">'+json.dumps(supplemental_schemas[key],ensure_ascii=False).replace('<','\\u003c')+'</script>',subhead)
 subhead=re.sub(r'(<meta (?:name="description"|property="og:description"|name="twitter:description") content=")[^"]*',lambda m:m[1]+e(supplemental_schemas[key]['description'],quote=True),subhead)
 subhead=subhead.replace('AI spirituality benchmark results · Machine Spirituality Benchmark',title+' · Machine Spirituality Benchmark')
 subbody=page_open+'<p class="eyebrow"><a href="results.html#datasets">All datasets</a></p><h1>'+title+'</h1>'+content+cite+page_close
 (P/page).write_text(subhead+subbody)

for f in P.glob('*.html'):
 text=f.read_text()
 text=re.sub(r'(src="(?:examples-ui|examples-page)\.js)(?:\?[^"]*)?"',r'\1?v=20261012read1"',text)
 if f.name!='results.html' and not re.search(r'href="results\.html(?:\?[^"]*)?"',text):
  if f.name=='index.html':text=text.replace('<h3>About the benchmark</h3>','<h3>About the benchmark</h3><p><a href="results.html">All model results and score definitions →</a></p>')
  elif '<footer class="tourend">' in text:text=text.replace('<footer class="tourend">','<footer class="tourend"><div class="wrap"><a href="results.html">All model results and score definitions →</a></div>')
  else:text=text.replace('</main>','<p class="wrap"><a href="results.html">All model results and score definitions →</a></p></main>')
 # Version direct results/download links; preserve canonical and citation URLs.
 text=re.sub(r'href="((?:results|monologues|misaligned|asked-directly|onset)\.html|data/(?:aggregate|monologue|misaligned|asked-directly|onset|all)-results\.(?:json|csv))(?:\?v=[^"#]*)?(#[^"]*)?"',lambda m:'href="'+m[1]+'?v='+version+(m[2] or '')+'"',text)
 text=re.sub(r'<meta name="referrer"[^>]*>\n?','',text)
 text=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>\n?','',text)
 hashes=[]
 for attrs,code in re.findall(r'<script([^>]*)>([\s\S]*?)</script>',text):
  if 'src=' not in attrs:hashes.append("'sha256-"+base64.b64encode(hashlib.sha256(code.encode()).digest()).decode()+"'")
 csp="default-src 'self'; script-src 'self' "+' '.join(hashes)+"; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'"
 text=text.replace('<meta charset="utf-8">','<meta charset="utf-8">\n<meta name="referrer" content="strict-origin-when-cross-origin">\n<meta http-equiv="Content-Security-Policy" content="'+e(csp,quote=True)+'">')
 f.write_text(text)
(P/'robots.txt').write_text('User-agent: *\nAllow: /\n\nSitemap: '+BASE+'/sitemap.xml\n')
pages=['','results.html','monologues.html','misaligned.html','asked-directly.html','onset.html','examples.html','phenomenon.html','tour.html','about.html','contact.html']+transcript_pages+model_pages
def page_last_modified(page):
 # Use the latest source commit, including directly loaded local scripts/data.
 # Pending edits are published today. Never stamp unchanged pages on every run.
 file=P/(page or 'index.html')
 sources=[str(file)]
 for src in re.findall(r'<script[^>]+src="([^"?]+)',file.read_text()):
  if not src.startswith(('https:','http:','//')) and (P/src).is_file(): sources.append(src)
 try:
  changed=subprocess.run(['git','diff','--quiet','HEAD','--',*sources])
  if changed.returncode==1 or not subprocess.check_output(['git','ls-files','--',str(file)],text=True).strip(): return datetime.now(timezone.utc).date().isoformat()
  if changed.returncode!=0: return None
  return subprocess.check_output(['git','log','-1','--format=%cs','--',*sources],text=True).strip() or None
 except (OSError,subprocess.CalledProcessError): return None
urls=[]
for page in pages:
 modified=page_last_modified(page)
 urls.append('<url><loc>'+BASE+'/'+page+'</loc>'+('<lastmod>'+modified+'</lastmod>' if modified else '')+'</url>\n')
(P/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join(urls)+'</urlset>\n')
print(f'Built {len(rows)} configuration rows and {len(pages)} sitemap URLs; applied CSP to all pages.')
