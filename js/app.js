import {$, esc} from './dom.js';
import {analyse, parseSong, STBY, BSBY, DRBY, LENS} from './theory.js';
import {arrChords, buildSeq} from './arrangement.js';
import {state, rt, save} from './state.js';
import {spell, drawBoard} from './board.js';
import {renderMix, renderToneSel, loadGroup, buildTone, currentTone} from './audio.js';
import {renderChips, markChips, renderReadout} from './readout.js';
import {renderDropdown, initDropdown} from './dropdown.js';
import {buildBlocks, renderTimeline, initSongMap} from './songmap.js';
import {renderPlay, startPlay, stopPlay} from './playback.js';
import {openArr, initEditor, renderTotal} from './editor.js';
import {initSongLinks, fromHash} from './songlinks.js';
import './ai-prompt.js';

/* ---------- song source: simple chords or arrangement ---------- */
const PRESETS=['A C D','G C D','Am F C G','C G Am F','E A B','Dm7 G7 Cmaj7','Em C G D'];
$('presets').insertAdjacentHTML('beforeend',PRESETS.map(p=>`<button type="button" class="pre" role="option">${p}</button>`).join(''));
function openEx(){$('presets').hidden=false;$('exBtn').setAttribute('aria-expanded','true');}
function closeEx(focusBtn){$('presets').hidden=true;$('exBtn').setAttribute('aria-expanded','false');if(focusBtn)$('exBtn').focus();}
$('exBtn').onclick=()=>$('presets').hidden?openEx():closeEx();
$('presets').addEventListener('click',e=>{const b=e.target.closest('.pre');if(!b)return;$('song').value=b.textContent;onSong();closeEx(true);});
document.addEventListener('pointerdown',e=>{if(!$('presets').hidden&&!$('exDd').contains(e.target))closeEx();});
$('exDd').addEventListener('keydown',e=>{if(e.key==='Escape')closeEx(true);});
$('song').addEventListener('input',onSong);
$('clear').onclick=()=>{$('song').value='';onSong();$('song').focus();};
function onSong(){state.song=$('song').value; analyseSong(); save(); renderAll();}
function analyseSong(){
  const help=$('songHelp');
  let list=[];
  if(state.arr){ list=arrChords(state.arr).uniq; rt.seq=buildSeq(state.arr); }
  else rt.seq=[];
  if(!list.length){
    const p=parseSong(state.song); list=p.chords;
    if(!p.chords.length){help.className='help'+(state.song.trim()?' err':''); help.innerHTML=state.song.trim()?`Couldn't read that. Start each chord with a letter A to G, like <code>A</code>, <code>Bm</code> or <code>F♯7</code>.`:'Type at least one chord, for example <code>A C D</code>. Showing the last song until then.';}
    else if(p.bad.length){help.className='help err'; help.textContent=`Skipped ${p.bad.map(b=>'"'+b+'"').join(', ')}. Chords start with a letter A to G.`;}
    else if(p.chords.some(c=>c.guess)){help.className='help'; help.textContent='Dashed chords use a type I guessed. The notes still work.';}
    else {help.className='help'; help.innerHTML='Separate chords with spaces, for example <code>Am F C G</code> or <code>E7 A7 B7</code>.';}
    if(list.length||!rt.chords.length){ if(!list.length) list=parseSong('A C D').chords; rt.chords=list; }
    rt.seq=rt.chords.map((c,i)=>({c,idx:i,beats:4,strum:'beats'}));
  } else rt.chords=list;
  rt.A=analyse(rt.chords,state.home);
  if(state.cur>=rt.chords.length) state.cur=0;
  rt.cur=rt.A.res[state.style];
}
function bandTag(l){const t=[]; if(l.bass&&l.bass!=='off') t.push(BSBY[l.bass].name.toLowerCase()+' bass'); if(l.drums&&l.drums!=='off') t.push(DRBY[l.drums].name.toLowerCase()+' drums'); return t.length?' · '+esc(t.join(', ')):'';}
function renderSource(){
  const on=!!state.arr;
  $('simpleSong').hidden=on; $('arrSong').hidden=!on;
  if(!on) return;
  const a=state.arr;
  $('arrTitle').textContent=a.name;
  $('arrSets').innerHTML=a.sets.map((s,si)=>`<div class="arrset"><span class="sn2">${esc(s.name)}<small>${s.repeat>1?'×'+s.repeat:''}</small></span>
    <span>${s.lines.map((l,li)=>`<span class="ln" data-si="${si}" data-li="${li}"><b>${esc(l.chords.trim())}</b>${l.repeat>1?' ×'+l.repeat:''}${bandTag(l)}</span>`).join('<br>')||'<span class="ln">No lines yet</span>'}
    <span class="ln"> · ${esc(STBY[s.strum].name)}${s.beats!==4?', '+LENS.find(x=>x.b===s.beats).n+' per chord':''}</span></span></div>`).join('')
    +`<div class="ln" style="font-size:12.5px;color:var(--muted)">Then it starts again from the top, forever.</div>`;
}
$('editArr').onclick=()=>openArr();
$('dropArr').onclick=()=>{
  const names=arrChords(state.arr).uniq.map(c=>c.name).join(' ');
  state.arr=null; if(names){state.song=names;$('song').value=names;}
  stopPlay(); analyseSong(); save(); renderAll();
};
$('openArr').onclick=()=>openArr();

/* ---------- toggles ---------- */
function renderToggles(){
  $('vBox').setAttribute('aria-pressed',state.view==='box'); $('vNeck').setAttribute('aria-pressed',state.view==='neck');
  $('lbNotes').setAttribute('aria-pressed',state.labels==='notes'); $('lbDeg').setAttribute('aria-pressed',state.labels==='degrees');
  $('shCareful').checked=state.careful; $('lgCareful').hidden=!state.careful;
  syncTempo();
  $('homeSel').innerHTML=`<option value="auto">Auto (${spell(rt.A.K.key)})</option>`+[...Array(12).keys()].map(pc=>`<option value="${pc}">${spell(pc)}</option>`).join('');
  $('homeSel').value=state.home;
}
function syncTempo(){['tempo','tempo2'].forEach(id=>$(id).value=state.tempo); $('tempoOut').textContent=$('tempoOut2').textContent=state.tempo+' BPM'; if($('arr').open) renderTotal();}
$('vBox').onclick=()=>{state.view='box';save();renderToggles();drawBoard();};
$('vNeck').onclick=()=>{state.view='neck';save();renderToggles();drawBoard();};
$('lbNotes').onclick=()=>{state.labels='notes';save();renderToggles();drawBoard();};
$('lbDeg').onclick=()=>{state.labels='degrees';save();renderToggles();drawBoard();};
$('shCareful').onchange=e=>{state.careful=e.target.checked;save();renderAll();};
$('homeSel').onchange=e=>{state.home=e.target.value;save();analyseSong();renderAll();};
['tempo','tempo2'].forEach(id=>$(id).oninput=e=>{state.tempo=+e.target.value;syncTempo();save();});

function renderAll(){buildBlocks();renderTimeline();renderMix();renderToneSel();renderSource();renderDropdown();renderChips();markChips();renderReadout();renderToggles();drawBoard();renderPlay();}

/* ---------- wire up modules that need callbacks back into this composition root ---------- */
initDropdown({renderAll});
initEditor({analyseSong, renderAll, stopPlay, startPlay, syncTempo});
initSongLinks({analyseSong, renderAll, stopPlay, syncTempo});
initSongMap({startPlay});

/* ---------- bootstrap ---------- */
$('song').value=state.song;
analyseSong(); renderAll();
fromHash();
const warm=()=>{window.removeEventListener('pointerdown',warm,true); loadGroup(currentTone().inst).then(()=>buildTone()).catch(()=>{});};
window.addEventListener('pointerdown',warm,true);
