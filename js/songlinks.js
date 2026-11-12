import {$} from './dom.js';
import {SBY, parseSong} from './theory.js';
import {clampN, cleanArr, fromText} from './arrangement.js';
import {state, rt, save} from './state.js';
import {TONES, renderToneSel, buildTone} from './audio.js';
import {msg, refreshDraft} from './editor.js';

let _deps={analyseSong(){}, renderAll(){}, stopPlay(){}, syncTempo(){}};
export function initSongLinks(deps){ _deps=deps; }

/* ---------- songs in links: #song-<code>, base32 of deflated JSON ---------- */
const B32='abcdefghijklmnopqrstuvwxyz234567';
function b32(bytes){let bits=0,val=0,out='';for(const b of bytes){val=(val<<8)|b;bits+=8;while(bits>=5){out+=B32[(val>>>(bits-5))&31];bits-=5;}val&=(1<<bits)-1;}if(bits>0)out+=B32[(val<<(5-bits))&31];return out;}
function unb32(s){let bits=0,val=0;const out=[];for(const ch of s){const i=B32.indexOf(ch);if(i<0)throw new Error('The song code has a typo.');val=(val<<5)|i;bits+=5;if(bits>=8){out.push((val>>>(bits-8))&255);bits-=8;}val&=(1<<bits)-1;}return new Uint8Array(out);}
async function pipeBytes(bytes,stream){return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());}
async function encodeSong(a){
  const o={name:a.name,tempo:state.tempo,style:state.style,tone:state.tone,sets:a.sets};
  const raw=new TextEncoder().encode(JSON.stringify(o));
  if(window.CompressionStream){try{return 'song-z'+b32(await pipeBytes(raw,new CompressionStream('deflate-raw')));}catch(e){}}
  return 'song-r'+b32(raw);
}
async function decodeSong(code){
  const m=String(code).toLowerCase().match(/song-([zr])([a-z2-7]+)/); if(!m) throw new Error('That isn’t a song link.');
  let bytes=unb32(m[2]);
  if(m[1]==='z'){ if(!window.DecompressionStream) throw new Error('This browser can’t open compressed song links.'); bytes=await pipeBytes(bytes,new DecompressionStream('deflate-raw')); }
  return JSON.parse(new TextDecoder().decode(bytes));
}
function applyLoaded(o,source){
  const a=cleanArr(o); a.sets.forEach(s=>s.lines=s.lines.filter(l=>parseSong(l.chords).chords.length)); a.sets=a.sets.filter(s=>s.lines.length);
  if(!a.sets.length) throw new Error('The song has no chords.');
  const prev={arr:state.arr,song:state.song,tempo:state.tempo,style:state.style,tone:state.tone};
  const changed=JSON.stringify(state.arr)!==JSON.stringify(a);
  state.arr=a; state.cur=0;
  if(o.tempo) state.tempo=clampN(o.tempo,50,180);
  if(o.style&&SBY[o.style]) state.style=o.style; if(o.tone&&TONES[o.tone]){state.tone=o.tone; renderToneSel(); if(rt.ctx) buildTone();}
  _deps.stopPlay(); save(); _deps.analyseSong(); _deps.renderAll();
  $('bannerTxt').textContent=`Opened "${a.name}" from ${source}. Press Play arrangement to hear it.`;
  $('bannerUndo').hidden=!(changed&&prev.arr);
  $('bannerUndo').onclick=()=>{Object.assign(state,prev); renderToneSel(); if(rt.ctx) buildTone(); save(); _deps.analyseSong(); _deps.renderAll(); $('banner').hidden=true;};
  $('banner').hidden=false;
}
$('bannerX').onclick=()=>{$('banner').hidden=true;};
async function putInLink(a,msgFn){
  try{
    const code=await encodeSong(a);
    state.linkCode=code; save();
    try{location.hash=code;}catch(e){}
    msgFn(`Song added to this page's link. Copy the link from the address bar or with Share → Copy link. Anyone who opens it gets this song.`);
    const box=$('copyBox'); if($('arr').open){box.hidden=false; box.value='#'+code;}
  }catch(e){msgFn('Couldn’t make a link for this song.',true);}
}
$('linkArr').onclick=()=>putInLink(state.arr,(t,err)=>{$('cardMsg').textContent=t;$('cardMsg').className='msg'+(err?' err':'');});
$('lkBtn').onclick=()=>{try{putInLink(cleanArr(Object.assign({},rt.draft,{name:$('arrName').value||'My song'})),msg);}catch(e){msg(e.message,true);}};
$('pasteGo').onclick=async()=>{
  const v=$('pasteIn').value.trim(); if(!v){msg('Paste a song link, a song code or JSON first.',true);return;}
  try{
    let o;
    if(/song-[zr][a-z2-7]+/i.test(v)) o=await decodeSong(v);
    else if(v.includes('{')&&v.lastIndexOf('}')>v.indexOf('{')) o=JSON.parse(v.slice(v.indexOf('{'),v.lastIndexOf('}')+1));
    else if(/^https?:\/\//i.test(v)){msg('This page can’t fetch files from other websites. Open the file, copy its JSON and paste it here, or use Upload file.',true);return;}
    else {const r=fromText(v,'Pasted song'); if(!r.arr.sets.length) throw new Error('No chords found.'); o=r.arr;}
    const a=cleanArr(o); rt.draft=a; $('arrName').value=a.name;
    if(o.tempo){state.tempo=clampN(o.tempo,50,180);_deps.syncTempo();}
    if(o.style&&SBY[o.style]) state.style=o.style; if(o.tone&&TONES[o.tone]){state.tone=o.tone; renderToneSel(); if(rt.ctx) buildTone();}
    rt.dirty=true; refreshDraft();
    $('pasteIn').value=''; msg(`Loaded "${a.name}". Press Save and play to use it.`);
  }catch(err){msg('Couldn’t open that. '+(err.message||''),true);}
};
$('pasteIn').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('pasteGo').click();}});
export async function fromHash(){
  const h=(location.hash||'').slice(1);
  if(!/^song-[zr][a-z2-7]+$/.test(h)||h===state.linkCode) return;
  try{const o=await decodeSong(h); state.linkCode=h; applyLoaded(o,'the link');}
  catch(e){$('bannerTxt').textContent='This link has a song in it, but it couldn’t be opened. It may be cut off.'; $('bannerUndo').hidden=true; $('banner').hidden=false;}
}
window.addEventListener('hashchange',fromHash);
