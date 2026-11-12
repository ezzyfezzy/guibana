import {$, esc} from './dom.js';
import {SCALES, pcsOf} from './theory.js';
import {state, rt, save} from './state.js';
import {spell, degLabel, scaleSet, drawBoard} from './board.js';
import {ensureAudio, pluck, strum} from './audio.js';

/* ---------- readout ---------- */
export function renderReadout(){
  const S=scaleSet(), ch=rt.chords[state.cur], P=pcsOf(ch), sc=SCALES[rt.cur.sc];
  $('tiles').innerHTML=sc.iv.map(iv=>{const pc=(rt.cur.t+iv)%12; const role=P.has(pc)?'chord':'';
    return `<button type="button" class="tile ${role}${iv===0?' home':''}" data-pc="${pc}" aria-label="${spell(pc)}${iv===0?', home note':''}"><span class="n">${spell(pc)}</span><span class="i">${iv===0?'home':degLabel(iv)}</span></button>`;}).join('');
  const n=rt.chords.length, names=rt.chords.map(c=>c.name).join(' · ');
  const fitTxt= rt.cur.rootsIn===n ? (n===1?`fit ${names}.`:`fit all ${n} chords: ${names}.`) : `cover ${rt.cur.rootsIn} of ${n} chord roots in ${names}. Lean on the gold notes.`;
  $('sum').innerHTML=`Noodle in <b>${spell(rt.cur.t)} ${sc.name}</b>. These ${sc.iv.length} notes ${fitTxt}`;
  $('homeline').textContent=`Home note is ${spell(rt.cur.t)}. End your licks there and they'll sound finished.`;
  $('nowName').textContent=ch.name;
  const tgt=[...P].filter(p=>S.has(p)).sort((a,b)=>((a-ch.root+12)%12)-((b-ch.root+12)%12)).map(spell);
  const careful=state.careful?[...S].filter(p=>!P.has(p)&&P.has((p+11)%12)).map(spell):[];
  $('nowTxt').innerHTML=(tgt.length?`Over this chord, aim for <b>${tgt.join(' · ')}</b>.`:'None of this chord’s notes are in the scale. Keep moving and land on the next chord.')+
    (careful.length?` Slide past ${careful.join(' and ')}.`:'');
}
$('tiles').addEventListener('click',e=>{const b=e.target.closest('.tile');if(!b)return;ensureAudio();if(!rt.ctx)return;pluck(52+((+b.dataset.pc-4+12)%12),rt.ctx.currentTime+.005,.55);});

/* ---------- chips ---------- */
export function renderChips(){
  $('chips').innerHTML=`<span class="lab">Chord now</span>`+rt.chords.map((c,i)=>
    `<button type="button" class="chip${c.guess?' guess':''}" data-i="${i}" aria-pressed="${i===state.cur}">${esc(c.name)}<span class="bar"></span></button>`).join('');
}
export function markChips(dur){
  document.querySelectorAll('.chip').forEach(b=>{const on=+b.dataset.i===state.cur; b.setAttribute('aria-pressed',on);
    b.classList.remove('playing'); const bar=b.querySelector('.bar'); bar.style.animationDuration='';
    if(on&&dur){void b.offsetWidth; bar.style.animationDuration=dur+'s'; b.classList.add('playing');}});
}
$('chips').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;
  state.cur=+b.dataset.i; save();
  if(rt.playing){const j=rt.seq.findIndex(ev=>ev.idx===state.cur); if(j>=0){rt.seqIdx=j; rt.nextT=rt.ctx.currentTime+.05; rt.slotPos=0;}}
  else strum(rt.chords[state.cur],1,'D');
  markChips(); renderReadout(); drawBoard();});
