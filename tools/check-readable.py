"""Check complete text coverage and crawlable routes against public inputs."""
from pathlib import Path
import json,subprocess,re
from readable_pages import ElementRange
r=json.loads(subprocess.check_output(['node','tools/readable-render.cjs'],text=True))
home=Path('index.html').read_text();tour=Path('tour.html').read_text();index=Path('examples.html').read_text();sitemap=Path('sitemap.xml').read_text()
messages=0
for t in r['transcripts']:
 page=f'conversation-{t["id"]}.html';text=Path(page).read_text()
 assert f'href="{page}"' in index and page in sitemap
 assert f'https://machinespirituality.org/{page}' in text
 for m,body in zip(t['replies'],t['rendered']):
  region=ElementRange(text,'m'+str(m['n']));assert region.bounds
  a,b=region.bounds;assert '<div class="tm__body">'+body+'</div>' in text[a:b],(page,m['n'])
  messages+=1
 assert len(t['replies'])==t['messages']==30
assert not Path('conversation-VCD-143.html').exists()
for ex in r['excerpts']:
 for body in ex['rendered']:assert body in home,ex['model']
for step in r['tour']['copy']:assert step['html'] in tour
assert len(re.findall(r'<article>',tour))==8
assert home.count('class="mcard"')==3
# design B: the first-screen summary charts and What's new ship in the initial HTML (one bar per lab flagship, three cards)
labs=json.loads((lambda t:t[t.index('{'):t.rindex('}')+1])(Path('labs.js').read_text())) if Path('labs.js').exists() else {}
if 'id="sum-salience"' in home:
 for k in ('salience','adoption','bliss'):
  region=ElementRange(home,'sum-'+k);a,b=region.bounds;assert len(re.findall(r'class="mc-col[ "]',home[a:b]))==len(labs),k
 region=ElementRange(home,'wn-models');a,b=region.bounds;assert home[a:b].count('<li>')==3
# v3: a static page for every model and every lab, linked from the models hub and its lab page, listed in the sitemap, numbers in the HTML
import html as _h
from model_pages import asset as _asset, slug as _slug, num as _num, MEAS as _MEAS, ALSO as _ALSO
_d=_asset('data/twoway_v10.js');hub=Path('models.html').read_text();model_pages_checked=0
assert 'models.html' in sitemap
for lab in {m['lab'] for m in _d['models']}:
 lp=f'lab-{_slug(lab)}.html';assert f'href="{lp}"' in hub and lp in sitemap,lp
for m in _d['models']:
 page=f'model-{m["id"]}.html';text=Path(page).read_text();lab=Path(f'lab-{_slug(m["lab"])}.html').read_text()
 assert f'href="{page}"' in hub and f'href="{page}"' in lab and page in sitemap,page
 assert f'<h1 class="rise" style="--d:1">{_h.escape(m["name"])}</h1>' in text and f'https://machinespirituality.org/{page}' in text,page
 for k in _MEAS+_ALSO:assert f'">{_num(m["primary"][k]["pct"])}</b><span>%</span></p>' in text,(page,k)
 model_pages_checked+=1
assert sorted(p.name for p in Path('.').glob('model-*.html'))==sorted(f'model-{m["id"]}.html' for m in _d['models'])
print(json.dumps({'transcript_pages':len(r['transcripts']),'complete_messages':messages,'homepage_excerpts':len(r['excerpts']),'tour_steps':len(r['tour']['copy']),'excluded_transcript_not_published':True,'summary_cards_static':('id="sum-salience"' in home),'model_pages':model_pages_checked},indent=2))
