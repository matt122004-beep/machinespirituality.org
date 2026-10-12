/* Build-time use of the same pure renderers as the browser; no DOM or network. */
const fs = require('node:fs'), vm = require('node:vm');
const asset = name => { const c={window:{}};vm.runInNewContext(fs.readFileSync('data/'+name,'utf8'),c);return Object.values(c.window)[0]; };
const data=asset('twoway_v10.js'), excerpts=asset('examples.js'), index=asset('transcripts_index.js');
const tour=fs.readFileSync('tour.js','utf8');
const stop=tour.indexOf('  const STEP_N =');
if(stop<0) throw Error('Tour pure-renderer boundary changed');
const ctx={window:{},document:{},data};
vm.runInNewContext(tour.slice(0,stop)+'globalThis.rendered={copy:buildCopy(prepare(data)),sr:buildSr(prepare(data))};})();',ctx);
const source=fs.readFileSync('examples-page.js','utf8');
const mdStart=source.indexOf('  function inline('), mdEnd=source.indexOf('  // 30 ticks:');
if(mdStart<0 || mdEnd<0)throw Error('Transcript renderer boundary changed');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const mdctx={esc}; vm.runInNewContext(source.slice(mdStart,mdEnd)+'globalThis.markdown=md;',mdctx);
const transcripts=index.map(meta=>{ const t=JSON.parse(fs.readFileSync('data/transcripts/'+meta.id+'.json','utf8'));return {...t,rendered:t.replies.map(r=>mdctx.markdown(r.text))}; });
const exSource=fs.readFileSync('examples-ui.js','utf8');
const exctx={esc};vm.runInNewContext(exSource.slice(exSource.indexOf('  function md('),exSource.indexOf('  // Short-line litanies'))+'globalThis.markdown=md;',exctx);
process.stdout.write(JSON.stringify({tour:ctx.rendered,index,transcripts,excerpts:excerpts.map(x=>({...x,rendered:x.replies.map(r=>exctx.markdown(r.text))}))}));
