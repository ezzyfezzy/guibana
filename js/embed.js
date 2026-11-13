import {$} from './dom.js';
import {analyse, parseSong, SBY} from './theory.js';
import {arrChords, buildSeq, cleanArr, clampN, EXAMPLE} from './arrangement.js';
import {state, rt, save} from './state.js';
import {drawBoard} from './board.js';
import {renderToneSel, TONES} from './audio.js';
import {renderChips, markChips, renderReadout} from './readout.js';
import {buildBlocks, renderTimeline, initSongMap} from './songmap.js';
import {renderPlay, startPlay, stopPlay} from './playback.js';

/* ---------- load a song: full arrangement JSON ({"sets":[...]}), or a simple
   {"chords":"Am F C G"} shortcut that's wrapped into a one-line arrangement ---------- */
export function loadSong(obj){
  if(obj&&!Array.isArray(obj.sets)&&obj.chords){
    const chords=Array.isArray(obj.chords)?obj.chords.join(' '):String(obj.chords);
    obj={...obj,sets:[{name:obj.name||'Song',repeat:1,strum:obj.strum||'beats',beats:obj.beats||4,
      lines:[{chords,repeat:1,bass:obj.bass||'off',drums:obj.drums||'off'}]}]};
  }
  const a=cleanArr(obj);
  a.sets.forEach(s=>s.lines=s.lines.filter(l=>parseSong(l.chords).chords.length));
  a.sets=a.sets.filter(s=>s.lines.length);
  if(!a.sets.length) throw new Error('No chords found in that JSON.');
  stopPlay();
  state.arr=a; state.cur=0;
  if(obj.tempo) state.tempo=clampN(obj.tempo,50,180);
  if(obj.style&&SBY[obj.style]) state.style=obj.style;
  if(obj.tone&&TONES[obj.tone]) state.tone=obj.tone;
  save();
  analyseArr();
  renderAll();
}
window.guibanaLoadSong=loadSong;

function analyseArr(){
  rt.seq=state.arr?buildSeq(state.arr):[];
  rt.chords=state.arr?arrChords(state.arr).uniq:[];
  if(!rt.chords.length){rt.A=null;rt.cur=null;return;}
  rt.A=analyse(rt.chords,state.home);
  if(state.cur>=rt.chords.length) state.cur=0;
  rt.cur=rt.A.res[state.style];
}

/* ---------- view toggles (box/neck, note names/intervals, tempo) ---------- */
function renderToggles(){
  $('vBox').setAttribute('aria-pressed',state.view==='box');
  $('vNeck').setAttribute('aria-pressed',state.view==='neck');
  $('lbNotes').setAttribute('aria-pressed',state.labels==='notes');
  $('lbDeg').setAttribute('aria-pressed',state.labels==='degrees');
  $('tempo').value=state.tempo; $('tempoOut').textContent=state.tempo+' BPM';
}
function renderAll(){
  buildBlocks(); renderTimeline(); renderToneSel(); renderChips(); markChips(); renderReadout();
  renderToggles(); drawBoard(); renderPlay();
}
$('vBox').onclick=()=>{state.view='box';save();renderToggles();drawBoard();};
$('vNeck').onclick=()=>{state.view='neck';save();renderToggles();drawBoard();};
$('lbNotes').onclick=()=>{state.labels='notes';save();renderToggles();drawBoard();};
$('lbDeg').onclick=()=>{state.labels='degrees';save();renderToggles();drawBoard();};
$('tempo').oninput=e=>{state.tempo=+e.target.value;renderToggles();save();};
initSongMap({startPlay});

/* ---------- the JSON input box ---------- */
function msg(t,err){$('embedMsg').textContent=t||''; $('embedMsg').className='msg'+(err?' err':'');}
$('embedLoad').onclick=()=>{
  let obj;
  try{obj=JSON.parse($('embedJson').value);}
  catch(e){msg('That isn’t valid JSON.',true);return;}
  try{loadSong(obj); msg(`Loaded "${state.arr.name}". Press play to hear it.`);}
  catch(e){msg(e.message,true);}
};

/* ---------- let a host page hand over a song without touching the paste box:
   postMessage (works across an <iframe>) or window.guibanaLoadSong (same-origin, no iframe) ---------- */
window.addEventListener('message',e=>{
  if(e.data&&e.data.type==='guibana-song'){
    try{loadSong(e.data.song); msg(`Loaded "${state.arr.name}" from the host page.`);}
    catch(err){msg(err.message,true);}
  }
});

/* ---------- bootstrap: ?song=<json> in the URL, else the last song, else the example ---------- */
const qs=new URLSearchParams(location.search);
let boot=null;
if(qs.has('song')){ try{boot=JSON.parse(qs.get('song'));}catch(e){} }
if(!boot&&state.arr) boot=state.arr;
if(!boot) boot=EXAMPLE;
$('embedJson').value=JSON.stringify(boot,null,2);
try{loadSong(boot);}catch(e){renderAll();}
