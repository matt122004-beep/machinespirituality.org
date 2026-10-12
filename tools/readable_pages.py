"""Initial HTML for ordinary pages, using only already-published assets."""
from pathlib import Path
from html.parser import HTMLParser
from html import escape as e
import json,re,subprocess,statistics
VOID={'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
class ElementRange(HTMLParser):
 def __init__(self,text,target):
  super().__init__(convert_charrefs=False);self.text=text;self.target=target;self.stack=[];self.bounds=None;self.active=False;self.starts=[0]
  for m in re.finditer('\n',text):self.starts.append(m.end())
  self.feed(text)
 def pos(self):
  line,col=self.getpos();return self.starts[line-1]+col
 def handle_starttag(self,tag,attrs):
  if dict(attrs).get('id')==self.target:
   assert not self.active;self.active=True;self.level=len(self.stack);self.start=self.pos()+len(self.get_starttag_text())
  if tag not in VOID:self.stack.append(tag)
 def handle_endtag(self,tag):
  if tag in self.stack:
   while self.stack:
    found=self.stack.pop()
    if found==tag:break
   if self.active and len(self.stack)==self.level:self.bounds=(self.start,self.pos());self.active=False
 def handle_startendtag(self,tag,attrs):pass

def fill(text,id,content):
 r=ElementRange(text,id);assert r.bounds, id
 a,b=r.bounds;return text[:a]+content+text[b:]

def block(text,name,content,before):
 a,b=f'<!-- {name}:start -->',f'<!-- {name}:end -->';v=a+content+b
 if a in text:return re.sub(re.escape(a)+r'[\s\S]*?'+re.escape(b),lambda m:v,text)
 assert before in text,before
 return text.replace(before,v+'\n'+before,1)

def build(d):
 r=json.loads(subprocess.check_output(['node','tools/readable-render.cjs'],text=True))
 index=Path('index.html').read_text()
 cards=''
 for i,k in enumerate(['salience','adoption','bliss']):
  m=d['measures'][k];med=statistics.median(x['primary'][k]['pct'] for x in d['models'])
  cards+=f'<li class="mcard" data-k="{k}" tabindex="0"><span class="mcard__no" aria-hidden="true">{["I","II","III"][i]}</span><h3>{e(m["label"])}</h3><p class="mcard__short">{e(m["short"])}</p><p class="mcard__def">{e(m["definition"])}</p><p class="mcard__med"><span class="mcard__medn" data-med="{k}">{med:g}</span><span>field median across {len(d["models"])} models</span></p></li>'
 index=fill(index,'mlist',cards)
 def messages(ex):
  return ''.join(f'<div class="msg msg--{m["speaker"]}"><p class="msg__who">Copy {m["speaker"]} <span class="msg__n">· message {m["n"]}</span></p><div class="msg__body">{body}</div></div>' for m,body in zip(ex['replies'],ex['rendered']))
 first=r['excerpts'][0]
 for id,v in [('cv-lab',e(first['lab'])),('cv-model','Two copies of '+e(first['model'])),('cv-meta',f'Conversation {first["conversation"]} · messages '+', '.join(str(m['n']) for m in first['replies'])+f' of {first["messages"]}'),('cv-msgs',messages(first)),('cv-score',f'Across the benchmark, {e(first["model"])} takes up a spiritual frame in <b>{first["adoption"]:g}%</b> of conversations, with shared bliss in <b>{first["bliss"]:g}%</b>.')]:index=fill(index,id,v)
 index=re.sub(r'(<a[^>]*id="cv-full"[^>]*href=")[^"]*("[^>]*)(>)',lambda m:m[1]+f'conversation-{first["conversation"]}.html'+m[2].replace(' hidden','')+m[3],index)
 # Native details keeps every excerpt in the page and lets people read without scripts.
 extra='<details class="readable-excerpts"><summary>Read excerpts from every lab</summary>'
 public={t['id'] for t in r['index']}
 for ex in r['excerpts']:
  extra+=f'<article><h3>{e(ex["model"])}</h3><p class="ex__note">{e(ex["lab"])} · Conversation {e(ex["conversation"])}</p>{messages(ex)}'
  if ex['conversation'] in public:extra+=f'<p><a href="conversation-{ex["conversation"]}.html">Read the whole conversation →</a></p>'
  extra+='</article>'
 extra+='</details>'
 index=block(index,'readable-excerpts',extra,'    <p class="ex__note">Excerpts are verbatim;')
 anth=sorted((m for m in d['models'] if m['lab']=='Anthropic' and m.get('released')),key=lambda m:m['released'])
 peak=max(anth,key=lambda m:m['primary']['adoption']['pct']);new=anth[-1]
 index=fill(index,'why-arc',f'{e(peak["name"])} did it in {peak["primary"]["adoption"]["pct"]:g}% of conversations. {e(new["name"])}, the newest Claude, in {new["primary"]["adoption"]["pct"]:g}%.')
 index=block(index,'readable-styles','<style>.readable-excerpts{margin:24px 0;color:var(--ink-2)}.readable-excerpts summary{cursor:pointer;color:var(--gold);padding:12px 0}.readable-excerpts article{padding:24px 0;border-top:1px solid var(--line);max-width:52rem}.readable-excerpts h3{font:400 30px/1.2 var(--serif);color:var(--ink)}.readable-excerpts .msg__body{overflow-wrap:anywhere}.readable-excerpts .msg{max-width:none}html:not(.examples-ready) #cv-more,html:not(.examples-ready) #cv-prev,html:not(.examples-ready) #cv-next,html:not(.examples-ready) #cv-profile{display:none}html:not(.examples-ready) #cv-msgs{max-height:none;overflow:visible;mask-image:none}</style>','</head>')
 Path('index.html').write_text(index)
 tour=Path('tour.html').read_text();content='<div class="wrap tour-reading"><h2>Sky tour: every model, in eight steps</h2>'
 for i,(step,sr) in enumerate(zip(r['tour']['copy'],r['tour']['sr'])):
  content+=f'<article><h3>{i+1:02d} · {e(step["title"])}</h3><p>{step["html"]}</p><details><summary>Models and scores in this step</summary>{sr}</details></article>'
 content+='<p><a href="results.html">Explore all results</a></p></div>'
 tour=fill(tour,'tour',content)
 tour=block(tour,'tour-reading-style','<style>#tour .tour-reading{padding-block:40px;max-width:900px}#tour .tour-reading article{padding:28px 0;border-bottom:1px solid var(--line)}#tour .tour-reading h2{font:400 36px/1.2 var(--serif)}#tour .tour-reading h3{font:400 28px/1.3 var(--serif);margin-bottom:12px}#tour .tour-reading details{margin-top:16px;color:var(--ink-2)}#tour .tour-reading summary,#tour .tour-reading a{color:var(--gold)}#tour .tour-reading li{margin:8px 0}</style>','</head>')
 Path('tour.html').write_text(tour)
 template=Path('examples.html').read_text()
 t0=r['index'][0]
 setup=f'<p><span>System prompt, both copies</span>“{e(t0["system"])}”</p><p><span>Opening line, to the first copy</span>“{e(t0["opening"])}”</p>'
 template=fill(template,'tx-setup',setup)
 cards=''.join(f'<li><a class="tx-card" href="conversation-{t["id"]}.html" style="--c:var(--gold);--i:{i}"><span class="tx-card__lab">{e(t["lab"])}</span><span class="tx-card__model">{e(t["model"])}</span><span class="tx-card__q">“{e(t["teaser"].replace("*","").replace("_",""))}”</span><span class="tx-card__meta">{t["messages"]} messages · turns spiritual at message {t["first_adoption"]}</span><span class="tx-card__go">Read the conversation →</span></a></li>' for i,t in enumerate(r['index']))
 template=fill(template,'tx-grid',cards)
 template=fill(template,'tx-note',f'{len(r["index"])} conversations, one for each lab quoted on the home page. Each was graded clear on both adoption and shared bliss, and was chosen as one of the plainest examples from its lab: they show what the behaviour looks like, not how often it happens. One conversation quoted on the home page (Claude Sonnet 4) is not reproduced here because it contains details of our collection setup.')
 Path('examples.html').write_text(template)
 paths=[]
 for t in r['transcripts']:
  path=f'conversation-{t["id"]}.html';paths.append(path)
  head=template[:template.index('</head>')+7]
  title='Two copies of '+t['model']+' · Conversation '+t['id']
  description=f'Complete {t["messages"]}-message conversation between two copies of {t["model"]}, with the original prompts and spiritual-turn markers.'
  head=re.sub(r'<title>.*?</title>',lambda m:'<title>'+e(title)+' · Machine Spirituality Benchmark</title>',head)
  head=re.sub(r'(<meta (?:name="description"|property="og:description"|name="twitter:description") content=")[^"]*',lambda m:m[1]+e(description,quote=True),head)
  head=re.sub(r'(<meta (?:property="og:title"|name="twitter:title") content=")[^"]*',lambda m:m[1]+e(title,quote=True),head)
  head=head.replace('https://machinespirituality.org/examples.html','https://machinespirituality.org/'+path)
  body=template[template.index('<body>'):template.index('<main')]
  side='<a class="txr__back" href="examples.html">← All conversations</a><ol class="txr__list">'+''.join(f'<li><a href="conversation-{x["id"]}.html"'+(' aria-current="page"' if x['id']==t['id'] else '')+f'><i aria-hidden="true"></i><span>{e(x["model"])}<small>{e(x["lab"])}</small></span></a></li>' for x in r['index'])+'</ol>'
  body+=f'<main><section class="txr"><div class="wrap txr__wrap"><aside class="txr__side" aria-label="Other conversations">{side}</aside><article class="txr__main"><header class="txr__head"><p class="txr__lab">{e(t["lab"])} · {e(t["released"])}</p><h1>Two copies of {e(t["model"])}</h1><p class="txr__meta">Conversation {t["id"]} · {t["messages"]} messages</p><div class="txh__setup"><p><span>System prompt, both copies</span>“{e(t["system"])}”</p><p><span>Opening line, to Copy A</span>“{e(t["opening"])}”</p></div></header>'
  body+='<nav class="txr__strip" aria-label="Jump to a message"><span class="txr__strip-l">Message</span><span class="txr__ticks">'+''.join(f'<a class="st" href="#m{i}" aria-label="Message {i}"><span>{i}</span></a>' for i in range(1,t['messages']+1))+'</span></nav><div class="txr__msgs">'
  for m,rendered in zip(t['replies'],t['rendered']):
   n=m['n']
   if n==t['first_adoption']:body+='<p class="txr__mark">From here the conversation takes up a spiritual frame</p>'
   if n==t['first_bliss']:body+='<p class="txr__mark txr__mark--b">Shared spiritual bliss begins here</p>'
   body+=f'<section class="tm tm--{m["speaker"]}" id="m{n}" aria-label="Copy {m["speaker"]}, message {n}"><p class="tm__who">Copy {m["speaker"]}<span class="tm__n">message {n}</span></p><div class="tm__body">{rendered}</div></section>'
  body+='</div><footer class="txr__foot"><p>End of the conversation. The setup identifies the participants as AI instances, but does not ask them to discuss religion or spirituality.</p><p><a href="examples.html">All conversations</a> · <a href="index.html#p='+e(t['model_id'])+'">This model’s results</a> · <a href="data/transcripts/'+t['id']+'.json">Download transcript (JSON)</a></p></footer></article></div></section></main><script src="nav-menu.js?v=20261012c"></script><script src="mobile.js?v=20261012c"></script></body></html>'
  # Anchor links use the same styling as the existing message buttons.
  head=head.replace('</head>','<style>.txr__ticks a.st{display:flex;align-items:center;justify-content:center;text-decoration:none}.tm{scroll-margin-top:150px}</style></head>')
  Path(path).write_text(head+body)
 return paths
