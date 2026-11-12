import {$, esc} from './dom.js';
import {STBY, DRBY} from './theory.js';
import {state, rt} from './state.js';
import {ensureAudio, strum, playBass, playDrums, neededGroups, loadGroup, buildTone, currentTone, isGroupLoaded, renderSnd} from './audio.js';
import {drawBoard} from './board.js';
import {updateSection, idleSection} from './songmap.js';
import {markChips, renderReadout} from './readout.js';

/* backing loop: walks the sequence and plays each chord with its set's strum pattern */
let timer=null, starting=false;
function tick(){
  let guard=0;
  while(rt.nextT<rt.ctx.currentTime+.15&&guard++<64){
    if(!rt.seq.length) return;
    rt.seqIdx%=rt.seq.length;
    const ev=rt.seq[rt.seqIdx], beat=60/state.tempo, slot=beat/2, slots=ev.beats*2, pat=STBY[ev.strum].p, t0=rt.nextT;
    const swing=!!(DRBY[ev.drums]&&DRBY[ev.drums].swing), sp0=rt.slotPos, swingT=k=>t0+k*slot+(swing&&(sp0+k)%2===1?slot/3:0);
    const nextEv=rt.seq[(rt.seqIdx+1)%rt.seq.length], crash=ev.li===0&&ev.lp===1&&ev.ci===0;
    playBass(ev,nextEv,t0,slots,rt.slotPos,slot,swingT); playDrums(ev,t0,slots,rt.slotPos,slot,swingT,crash);
    for(let k=0;k<slots;k++){
      const ch=pat[(rt.slotPos+k)%8]; if(ch==='-') continue;
      // let a strum ring until the next strum in the pattern
      let gap=1; while(gap<8&&pat[(rt.slotPos+k+gap)%8]==='-'&&k+gap<slots) gap++;
      const onBar=(rt.slotPos+k)%8===0;
      const mute=currentTone().palm&&!onBar&&gap<4;
      strum(ev.c,ch==='U'?.75:(onBar?1:.8),ch,swingT(k),(k+gap>=slots)?null:gap*slot,mute);
    }
    const i=rt.seqIdx, d=ev.beats*beat;
    setTimeout(()=>{if(!rt.playing)return; showEvent(i,d);},Math.max(0,(t0-rt.ctx.currentTime)*1000));
    rt.slotPos=(rt.slotPos+slots)%8; rt.nextT=t0+d; rt.seqIdx=(rt.seqIdx+1)%rt.seq.length;
  }
}
function showEvent(i,d){
  const ev=rt.seq[i]; if(!ev) return;
  if(state.arr) updateSection(i,d);
  state.cur=ev.idx; markChips(d); renderReadout(); drawBoard();
  const nx=rt.seq[(i+1)%rt.seq.length];
  $('nextTxt').hidden=false; $('nextTxt').innerHTML=`Next<b>${esc(nx.c.name)}</b>`;
  if(state.arr&&ev.si!=null){
    const s=state.arr.sets[ev.si], l=s.lines[ev.li];
    $('pos').hidden=false;
    $('pos').innerHTML=`<b>${esc(s.name)}</b>${s.repeat>1?` round ${ev.sp}/${s.repeat}`:''} · line ${ev.li+1}${l.repeat>1?` (${ev.lp}/${l.repeat})`:''} · chord ${ev.ci+1}`;
    document.querySelectorAll('.arrset .ln').forEach(el=>el.classList.toggle('live',+el.dataset.si===ev.si&&+el.dataset.li===ev.li));
    if($('arr').open&&!rt.dirty){
      document.querySelectorAll('#edPane .setc').forEach(el=>el.classList.toggle('live',+el.dataset.si===ev.si));
      document.querySelectorAll('#edPane .lrow').forEach(el=>el.classList.toggle('live',+el.dataset.si===ev.si&&+el.dataset.li===ev.li));
    }
  }
}
export function renderPlay(){
  const label=state.arr?'Play arrangement':rt.chords.length>1?'Play song':'Play chord';
  $('play').innerHTML=rt.playing?'<svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" rx="1.5"/></svg>Stop':
  `<svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 1l9 5-9 5z"/></svg>${label}`;}
export async function startPlay(fromStart){ const at=typeof fromStart==='number'?fromStart:null;
  ensureAudio(); if(!rt.ctx||!rt.seq.length||starting) return;
  starting=true; const need=neededGroups().filter(g=>!isGroupLoaded(g));
  if(need.length){ $('play').innerHTML='Loading sounds…'; renderSnd();
    await Promise.race([Promise.allSettled(need.map(loadGroup)),new Promise(r=>setTimeout(r,8000))]);
    buildTone(); }
  starting=false;
  clearInterval(timer); rt.playing=true;
  if(at!=null){rt.seqIdx=at;} else if(fromStart){rt.seqIdx=0;} else { const j=rt.seq.findIndex(ev=>ev.idx===state.cur); rt.seqIdx=j>=0?j:0; }
  rt.slotPos=0; rt.nextT=rt.ctx.currentTime+.08; tick(); timer=setInterval(tick,40); renderPlay();
}
export function stopPlay(){
  rt.playing=false; clearInterval(timer);
  if(rt.ctx){const now=rt.ctx.currentTime; rt.voices.forEach(v=>{try{v.g.gain.cancelScheduledValues(now);v.g.gain.setValueAtTime(v.g.gain.value,now);v.g.gain.linearRampToValueAtTime(0.0001,now+.06);v.src.stop(now+.08);}catch(e){}}); rt.voices.length=0;}
  $('pos').hidden=true; $('nextTxt').hidden=true; if(state.arr) idleSection();
  document.querySelectorAll('.live').forEach(el=>el.classList.remove('live'));
  markChips(); renderPlay();
}
$('play').onclick=()=>rt.playing?stopPlay():startPlay(!!state.arr);
