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
print(json.dumps({'transcript_pages':len(r['transcripts']),'complete_messages':messages,'homepage_excerpts':len(r['excerpts']),'tour_steps':len(r['tour']['copy']),'excluded_transcript_not_published':True,'summary_cards_static':('id="sum-salience"' in home)},indent=2))
