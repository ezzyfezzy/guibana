import {$, esc} from './dom.js';
import {STRUMS, STBY, LENS, BASSES, BSBY, DRUMS, DRBY, SBY, parseSong} from './theory.js';
import {clampN, newSet, cleanArr, toText, fromText, totalBeats, EXAMPLE} from './arrangement.js';
import {state, rt, save} from './state.js';
import {ensureAudio, strum, TONES, renderToneSel, buildTone} from './audio.js';

let _deps={analyseSong(){}, renderAll(){}, stopPlay(){}, startPlay(){}, syncTempo(){}};
export function initEditor(deps){ _deps=deps; }

/* ---------- arrangement dialog ---------- */
let tab='ed';
const dlg=$('arr');
export function msg(t,err){$('arrMsg').textContent=t||''; $('arrMsg').className='msg'+(err?' err':'');}
export function openArr(){
  rt.draft=state.arr?JSON.parse(JSON.stringify(state.arr)):{name:'My song',sets:[Object.assign(newSet('Set 1'),{lines:[{chords:rt.chords.map(c=>c.name).join(' '),repeat:1}]})]};
  rt.dirty=false; tab='ed'; msg(''); $('copyBox').hidden=true;
  $('arrName').value=rt.draft.name; renderTabs(); renderEditor(); renderTotal();
  dlg.showModal();
}
function closeArr(){dlg.close();}
$('arrX').onclick=closeArr; $('arrCancel').onclick=closeArr;
dlg.addEventListener('click',e=>{if(e.target===dlg)closeArr();});
$('arrName').oninput=e=>{rt.draft.name=e.target.value;rt.dirty=true;};
function renderTabs(){
  $('tabEd').setAttribute('aria-selected',tab==='ed'); $('tabTx').setAttribute('aria-selected',tab==='tx');
  $('edPane').hidden=tab!=='ed'; $('txPane').hidden=tab!=='tx';
}
$('tabEd').onclick=()=>{if(tab==='ed')return; tab='ed'; renderTabs(); renderEditor();};
$('tabTx').onclick=()=>{if(tab==='tx')return; tab='tx'; $('arrText').value=toText(rt.draft); $('txErr').textContent=''; renderTabs();};
$('arrText').addEventListener('input',()=>{
  const v=$('arrText').value.trim();
  if(v.startsWith('{')||/"sets"\s*:/.test(v)){try{const o=JSON.parse(v.slice(v.indexOf('{'),v.lastIndexOf('}')+1)); const a=cleanArr(o); rt.draft.sets=a.sets; if(o.name){rt.draft.name=a.name;$('arrName').value=a.name;} rt.dirty=true; $('txErr').textContent=''; renderTotal(); return;}catch(e){}}
  const r=fromText($('arrText').value,rt.draft.name); rt.draft.sets=r.arr.sets; rt.dirty=true;
  $('txErr').textContent=r.errs.slice(0,3).join(' '); renderTotal();
});

/* refresh whichever view (blocks or text) is showing, plus the running total */
export function refreshDraft(){
  if(tab==='tx') $('arrText').value=toText(rt.draft); else renderEditor();
  renderTotal();
}

const ICON={
  up:'<svg viewBox="0 0 16 16"><path d="M8 13V3M4 7l4-4 4 4"/></svg>',
  down:'<svg viewBox="0 0 16 16"><path d="M8 3v10M4 9l4 4 4-4"/></svg>',
  dup:'<svg viewBox="0 0 16 16"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 10V4.5A1.5 1.5 0 0 1 4.5 3H10"/></svg>',
  del:'<svg viewBox="0 0 16 16"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5"/></svg>',
  play:'<svg viewBox="0 0 16 16"><path d="M5 3.5l7 4.5-7 4.5z" fill="currentColor" stroke="none"/></svg>'
};
function patHTML(id){
  const p=STBY[id].p, cnt=['1','&','2','&','3','&','4','&'];
  return `<span class="pat" aria-label="${p.split('').map(c=>c==='D'?'down':c==='U'?'up':'rest').join(', ')}">`+p.split('').map((c,i)=>
    `<span><i class="${c==='U'?'u':c==='-'?'r':''}">${c==='D'?'↓':c==='U'?'↑':'·'}</i><small>${cnt[i]}</small></span>`).join('')+'</span>';
}
function stepHTML(act,val,label){return `<span class="step" role="group" aria-label="${label}"><button type="button" data-act="${act}" data-d="-1" aria-label="Fewer">−</button><output>${val}×</output><button type="button" data-act="${act}" data-d="1" aria-label="More">+</button></span>`;}
function allSame(s,k){const v=s.lines.map(l=>l[k]||'off'); return v.length&&v.every(x=>x===v[0])?v[0]:'mixed';}
function bandSel(act,list,val,allowMixed){return `<select data-act="${act}" class="bsel">${allowMixed&&val==='mixed'?'<option value="mixed" selected>Mixed</option>':''}${list.map(x=>`<option value="${x.id}"${x.id===val?' selected':''}>${x.name}</option>`).join('')}</select>`;}
function renderEditor(){
  const n=rt.draft.sets.length;
  $('edPane').innerHTML=`<div style="display:flex;flex-direction:column;gap:14px">`+rt.draft.sets.map((s,si)=>`
    <div class="setc" data-si="${si}">
      <div class="seth">
        <span class="setnum">${String(si+1).padStart(2,'0')}</span>
        <input class="setname" data-act="sname" value="${esc(s.name)}" aria-label="Set name">
        <span class="steplab">Play set ${stepHTML('srep',s.repeat,'Times to play this set')}</span>
        <span>
          <button class="iconbtn" type="button" data-act="sup" aria-label="Move set up" ${si===0?'disabled':''}>${ICON.up}</button>
          <button class="iconbtn" type="button" data-act="sdown" aria-label="Move set down" ${si===n-1?'disabled':''}>${ICON.down}</button>
          <button class="iconbtn" type="button" data-act="sdup" aria-label="Duplicate set">${ICON.dup}</button>
          <button class="iconbtn del" type="button" data-act="sdel" aria-label="Delete set" ${n===1?'disabled':''}>${ICON.del}</button>
        </span>
      </div>
      <div class="setopts">
        <label class="steplab">Strum <select data-act="strum">${STRUMS.map(x=>`<option value="${x.id}"${x.id===s.strum?' selected':''}>${x.name}</option>`).join('')}</select></label>
        ${patHTML(s.strum)}
        <button class="iconbtn" type="button" data-act="hear" aria-label="Hear this strum">${ICON.play}</button>
        <label class="steplab">Each chord <select data-act="beats">${LENS.map(x=>`<option value="${x.b}"${x.b===s.beats?' selected':''}>${x.n}</option>`).join('')}</select></label>
        <span class="setband"><label class="steplab">Bass, all lines ${bandSel('sbass',BASSES,allSame(s,'bass'),true)}</label>
        <label class="steplab">Drums, all lines ${bandSel('sdrums',DRUMS,allSame(s,'drums'),true)}</label></span>
      </div>
      <div class="lines">
        ${s.lines.map((l,li)=>{const p=parseSong(l.chords); const bad=!p.chords.length||p.bad.length;
          return `<div class="lrow" data-si="${si}" data-li="${li}">
          <span class="lnum">${li+1}</span>
          <input class="linp${bad?' bad':''}" data-act="lchords" value="${esc(l.chords)}" placeholder="A A C Dm" aria-label="Chords for line ${li+1}" spellcheck="false" autocapitalize="characters">
          ${stepHTML('lrep',l.repeat,'Times to play this line')}
          <button class="iconbtn del" type="button" data-act="ldel" aria-label="Delete line ${li+1}">${ICON.del}</button>
          <span class="lband"><label>Bass ${bandSel('lbass',BASSES,l.bass||'off')}</label><label>Drums ${bandSel('ldrums',DRUMS,l.drums||'off')}</label></span>
          ${bad?`<span class="lerr">${!p.chords.length?'Type chords separated by spaces, like A A C Dm.':'Skipped '+p.bad.map(b=>'"'+esc(b)+'"').join(', ')+'.'}</span>`:''}
        </div>`;}).join('')}
        <button class="addl" type="button" data-act="ladd">+ Add line</button>
      </div>
    </div>`).join('')+
    `<button class="adds" type="button" data-act="sadd">+ Add set</button>
     <div class="forever"><svg viewBox="0 0 18 18"><path d="M14 6.5A5.5 5.5 0 1 0 15 11"/><path d="M15 3v4h-4"/></svg>After the last set, the whole arrangement starts again from the top.</div></div>`;
}
export function renderTotal(){
  if(!rt.draft) return;
  const beats=totalBeats(rt.draft), bars=beats/4, secs=Math.round(beats*60/state.tempo);
  $('arrTotal').innerHTML=beats?`One time through: <b>${Number.isInteger(bars)?bars:bars.toFixed(1)}</b> bars · <b>${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}</b> at ${state.tempo} BPM`:'Add some chords to hear it.';
  $('arrSave').disabled=!beats;
}
function setOf(el){return rt.draft.sets[+el.closest('.setc').dataset.si];}
$('edPane').addEventListener('click',e=>{
  const b=e.target.closest('button[data-act]'); if(!b) return;
  const a=b.dataset.act, si=b.closest('.setc')?+b.closest('.setc').dataset.si:-1, s=rt.draft.sets[si];
  if(a==='srep'){s.repeat=clampN(s.repeat+ +b.dataset.d,1,32);}
  else if(a==='lrep'){const li=+b.closest('.lrow').dataset.li; s.lines[li].repeat=clampN(s.lines[li].repeat+ +b.dataset.d,1,32);}
  else if(a==='sup'&&si>0){[rt.draft.sets[si-1],rt.draft.sets[si]]=[rt.draft.sets[si],rt.draft.sets[si-1]];}
  else if(a==='sdown'&&si<rt.draft.sets.length-1){[rt.draft.sets[si+1],rt.draft.sets[si]]=[rt.draft.sets[si],rt.draft.sets[si+1]];}
  else if(a==='sdup'){const c=JSON.parse(JSON.stringify(s)); c.name=s.name+' (copy)'; rt.draft.sets.splice(si+1,0,c);}
  else if(a==='sdel'&&rt.draft.sets.length>1){rt.draft.sets.splice(si,1);}
  else if(a==='ladd'){const pl=s.lines[s.lines.length-1]||{}; s.lines.push({chords:'',repeat:1,bass:pl.bass||'off',drums:pl.drums||'off'}); rt.dirty=true; renderEditor(); renderTotal();
    const ins=document.querySelectorAll(`.setc[data-si="${si}"] .linp`); ins[ins.length-1].focus(); return;}
  else if(a==='ldel'){s.lines.splice(+b.closest('.lrow').dataset.li,1);}
  else if(a==='sadd'){const ns=newSet('Set '+(rt.draft.sets.length+1)); ns.lines.push({chords:'',repeat:1}); rt.draft.sets.push(ns); rt.dirty=true; renderEditor(); renderTotal();
    const ins=document.querySelectorAll('.setc:last-of-type .linp'); if(ins.length) ins[0].focus(); return;}
  else if(a==='hear'){
    const c=s.lines.map(l=>parseSong(l.chords).chords[0]).find(Boolean)||rt.chords[0]; ensureAudio(); if(!rt.ctx) return;
    const slot=30/state.tempo, t=rt.ctx.currentTime+.05, p=STBY[s.strum].p;
    for(let k=0;k<8;k++){const ch=p[k]; if(ch!=='-') strum(c,ch==='U'?.75:k===0?1:.8,ch,t+k*slot,null);} return;}
  else return;
  rt.dirty=true; renderEditor(); renderTotal();
});
$('edPane').addEventListener('input',e=>{
  const el=e.target, a=el.dataset.act; if(!a) return; const s=setOf(el); rt.dirty=true;
  if(a==='sname') s.name=el.value;
  else if(a==='lchords'){const li=+el.closest('.lrow').dataset.li; s.lines[li].chords=el.value;
    const p=parseSong(el.value); el.classList.toggle('bad',!!el.value.trim()&&(!p.chords.length||p.bad.length>0)); renderTotal();}
});
$('edPane').addEventListener('change',e=>{
  const el=e.target, a=el.dataset.act; if(!a) return; const s=setOf(el); rt.dirty=true;
  if(a==='strum'){s.strum=el.value; renderEditor();}
  else if(a==='beats'){s.beats=+el.value; renderTotal();}
  else if(a==='sbass'||a==='sdrums'){if(el.value==='mixed')return; const k=a==='sbass'?'bass':'drums'; s.lines.forEach(l=>l[k]=el.value); renderEditor();}
  else if(a==='lbass'||a==='ldrums'){const li=+el.closest('.lrow').dataset.li; s.lines[li][a==='lbass'?'bass':'drums']=el.value; renderEditor();}
  else if(a==='lchords'){ // move a typed "- 2x" into the repeat counter
    const li=+el.closest('.lrow').dataset.li, l=s.lines[li];
    const mm=l.chords.match(/^(.*?)\s*(?:[-–—]\s*)?(?:[x×]\s*(\d+)|(\d+)\s*[x×])\s*$/i);
    if(mm&&mm[1].trim()){l.chords=mm[1].trim(); l.repeat=clampN(mm[2]||mm[3],1,32);}
    renderEditor(); renderTotal();
  }
});
$('arrSave').onclick=()=>{
  try{
    const a=cleanArr(Object.assign({},rt.draft,{name:$('arrName').value||'My song'}));
    a.sets.forEach(s=>s.lines=s.lines.filter(l=>parseSong(l.chords).chords.length));
    a.sets=a.sets.filter(s=>s.lines.length);
    if(!a.sets.length){msg('Add at least one line of chords first.',true);return;}
    state.arr=a; state.cur=0; save(); closeArr();
    _deps.stopPlay(); _deps.analyseSong(); _deps.renderAll(); _deps.startPlay(true);
  }catch(err){msg(err.message,true);}
};
$('exBtn').onclick=()=>{rt.draft=JSON.parse(JSON.stringify(EXAMPLE)); $('arrName').value=rt.draft.name; rt.dirty=true;
  refreshDraft(); msg('Loaded the example. Press Save and play to hear it.');};

/* export / import */
function exportObj(){return {app:'guibana',version:1,name:$('arrName').value||rt.draft.name||'My song',tempo:state.tempo,style:state.style,tone:state.tone,sets:cleanArr(rt.draft).sets};}
function slug(s){return (s||'arrangement').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'arrangement';}
let downloads=null;
(async()=>{try{ if(window.claude&&window.claude.use){ downloads=await window.claude.use('downloads'); } }catch(e){} $('dlBtn').hidden=!downloads;})();
$('dlBtn').onclick=async()=>{
  if(!downloads) return;
  const o=exportObj();
  try{const r=await downloads.save({filename:slug(o.name)+'.guibana.json',data:JSON.stringify(o,null,2)}); if(r&&r.status==='saved') msg('Saved '+slug(o.name)+'.guibana.json.');}
  catch(err){const c=err&&err.code;
    if(c==='declined') msg('Download cancelled.');
    else if(c==='rate_limited') msg('A save prompt is already open. Try again in a moment.',true);
    else {msg('Downloads aren’t available here. Use Copy JSON instead.',true); $('dlBtn').hidden=true;}}
};
$('cpBtn').onclick=()=>{
  const txt=JSON.stringify(exportObj(),null,2);
  const fallback=()=>{const box=$('copyBox'); box.hidden=false; box.value=txt; box.focus(); box.select(); msg('Copy the JSON below and save it in a text file.');};
  try{ navigator.clipboard.writeText(txt).then(()=>{msg('JSON copied. Paste it into a file to keep it.'); $('copyBox').hidden=true;},fallback); }catch(e){fallback();}
};
$('impBtn').onclick=()=>$('impFile').click();
$('impFile').onchange=e=>{
  const f=e.target.files&&e.target.files[0]; e.target.value=''; if(!f) return;
  if(f.size>512*1024){msg('That file is too big for an arrangement.',true);return;}
  const rd=new FileReader();
  rd.onload=()=>{
    const txt=String(rd.result||'');
    try{
      let o; try{o=JSON.parse(txt);}catch(_){o=null;}
      if(o){
        const a=cleanArr(o); rt.draft=a; $('arrName').value=a.name;
        if(o.tempo) {state.tempo=clampN(o.tempo,50,180); _deps.syncTempo();}
        if(o.style&&SBY[o.style]) state.style=o.style; if(o.tone&&TONES[o.tone]){state.tone=o.tone; renderToneSel(); if(rt.ctx) buildTone();}
      } else {
        const r=fromText(txt,f.name.replace(/\.[^.]+$/,'')); if(!r.arr.sets.length) throw new Error('No chords found in that file.');
        rt.draft=r.arr; $('arrName').value=rt.draft.name;
      }
      rt.dirty=true; refreshDraft();
      msg(`Loaded "${rt.draft.name}". Press Save and play to use it.`);
    }catch(err){msg('Couldn’t read that file. '+err.message,true);}
  };
  rd.onerror=()=>msg('Couldn’t read that file.',true);
  rd.readAsText(f);
};
