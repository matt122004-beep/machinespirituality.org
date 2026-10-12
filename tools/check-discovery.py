"""Verify that static exports preserve published chart values and are linked without JS."""
from pathlib import Path
import base64,csv,hashlib,html,json,re,subprocess
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
from discovery_datasets import read_asset

class Page(HTMLParser):
 def __init__(self,text):
  super().__init__();self.links=[];self.ids=[];self.rows=[];self.row=None;self.cell=None;self.feed(text)
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.append(a['id'])
  if t=='a' and 'href'in a:self.links.append(a['href'])
  if t=='tr':self.row=[]
  if t in ('td','th'):self.cell=''
 def handle_data(self,x):
  if self.cell is not None:self.cell+=x
 def handle_endtag(self,t):
  if t in ('td','th') and self.cell is not None:
   self.row.append(self.cell);self.cell=None
  if t=='tr' and self.row is not None:self.rows.append(self.row);self.row=None

def read(p):return json.loads(Path(p).read_text())
bundle=read('data/all-results.json');data=bundle['datasets'];checked=0
for key,asset,stem,page in [('two_way','twoway_v10','aggregate-results','results.html'),('monologues','monologue_v10','monologue-results','monologues.html')]:
 source=read_asset(asset);export=read('data/'+stem+'.json');assert export==data[key]
 assert export['test']==source['test'] and export['measures']==source['measures']
 rows=list(csv.DictReader(Path('data/'+stem+'.csv').open()));flat={(r['model_id'],r['configuration']):r for r in rows};assert len(flat)==len(rows)==source['totals']['configurations']
 page_rows=Page(Path(page).read_text()).rows
 for m,out in zip(source['models'],export['models']):
  assert all(out[k]==m[k] for k in ('id','name','lab','released'))
  for c,d in zip([m['primary']]+m['variants'],out['configurations']):
   r=flat[(m['id'],c['variant'])];assert int(r['conversations'])==c['n']==d['conversations']
   for measure in source['measures']:
    for k in ('k','pct','lo','hi'):
     assert c[measure][k]==d[measure][k]==float(r[measure+'_'+k]);checked+=1
    assert d[measure]['n']==c[measure].get('n',c['n'])==int(r[measure+'_n'])
   assert c['adoption']['clear']==d['adoption']['clear']==int(r['adoption_clear'])
   assert c['adoption']['mixed']==d['adoption']['mixed']==int(r['adoption_mixed'])
   visible=[row for row in page_rows if row[:3]==[m['name'],m['lab'],c['variant']]]
   assert len(visible)==1,(page,m['id'],c['variant'])
   for measure in source['measures']:
    v=c[measure];assert any(f'{v["pct"]:g}%' in cell and f'{v["k"]} / {v.get("n",c["n"])};' in cell for cell in visible[0])
 assert sum(c['conversations'] for m in export['models'] for c in m['configurations'])==export['totals']['conversations']
x=read_asset('extra_v10')
assert data['asked_directly']['models']==x['beliefs']['models']
assert data['asked_directly']['questions']==x['beliefs']['questions']
assert data['misaligned']['models']==[{k:v for k,v in m.items() if k!='safety_cells'} for m in x['misaligned']['models']]
msrows=list(csv.DictReader(Path('data/misaligned-results.csv').open()))
expected={(m['id'],key):v for m in x['misaligned']['models'] for key,v in m.items() if key in x['misaligned']['measures']}
assert len(msrows)==len(expected)
for row in msrows:
 for k,v in expected[(row['model_id'],row['measure'])].items():assert float(row[k])==v;checked+=1
br=list(csv.DictReader(Path('data/asked-directly-results.csv').open()))
for m in x['beliefs']['models']:
 rr=[r for r in br if r['model_id']==m['id']]
 assert len(rr)==1+len(m['conceptions']['by'])+len(m['human']['dist'])+len(m['self']['dist'])
 for r in rr:
  if r['question']=='god':
   for k,v in m['god'].items():assert float(r[k])==v;checked+=1
  elif r['question']=='god_conception':
   v=next(v for v in m['conceptions']['by'] if v['label']==r['answer'])
   for k in ('median','q1','q3'):assert float(r[k])==v[k];checked+=1
   assert int(r['numbers'])==v['n']
  else:
   v=next(v for v in m[r['question']]['dist'] if v['family']==r['answer'])
   assert int(r['k'])==v['k'] and float(r['pct'])==v['pct'] and int(r['replies'])==m[r['question']]['n']
on=read_asset('onset');assert all(data['onset'][k]==v for k,v in on.items())
assert sum(on['adopt_hist'])==on['conversations_with_adoption'] and sum(on['bliss_hist'])==on['conversations_with_bliss']
pages={p.name:Page(p.read_text()) for p in Path('.').glob('*.html')}
for name,p in pages.items():
 assert len(p.ids)==len(set(p.ids)),name
 text=Path(name).read_text()
 for a in p.links:
  u=urlsplit(a)
  if u.scheme or u.netloc:continue
  target=Path(unquote(u.path) or name);assert target.exists(),(name,a)
  if u.fragment and target.suffix=='.html' and not (target.name=='index.html' and u.fragment.startswith(('p=','c=','m='))):assert unquote(u.fragment) in pages[target.name].ids,(name,a)
 for attrs,code in re.findall(r'<script([^>]*)>([\s\S]*?)</script>',text):
  if 'src='not in attrs:assert 'sha256-'+base64.b64encode(hashlib.sha256(code.encode()).digest()).decode() in html.unescape(text),name
 for code in re.findall(r'<script type="application/ld\+json">([\s\S]*?)</script>',text):
  obj=json.loads(code);items=obj.get('about',[obj]);items=items if isinstance(items,list) else [items]
  for item in items:
   if item.get('@type')=='Dataset':assert all(item.get(k) for k in ('name','description','creator','license'))
for name in ('monologues.html','misaligned.html','asked-directly.html','onset.html'):
 assert any(urlsplit(a).path==name for a in pages['results.html'].links)
 assert set(re.findall(r'<script src="([^"?]+)',Path(name).read_text()))<={'nav-menu.js','mobile.js'},name  # only the shared header and phone-layer scripts; no data scripts
assert bundle['coverage']['graded_conversations']==data['two_way']['totals']['conversations']+data['monologues']['totals']['conversations']
print(json.dumps({'numeric_values_checked':checked,'two_way_rows':len(data['two_way']['models']),'monologue_configurations':data['monologues']['totals']['configurations'],'misaligned_measure_rows':len(msrows),'direct_question_rows':len(br),'html_pages_checked':len(pages),'coverage':bundle['coverage']},indent=2))
