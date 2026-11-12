import {$} from './dom.js';
import {SHARP, FLAT, GEN, SCALES, pcsOf} from './theory.js';
import {state, rt} from './state.js';
import {ensureAudio, pluck} from './audio.js';

export function spellFlats(){
  if(rt.chords.some(c=>c.acc==='b')) return true;
  if(rt.chords.some(c=>c.acc==='#')) return false;
  const t=rt.cur.t, minor=!!SCALES[rt.cur.sc].minor, center=minor?(t+3)%12:t;
  return [5,10,3,8,1].includes(center);
}
export function spell(pc){return (spellFlats()?FLAT:SHARP)[pc];}
export function degLabel(iv){ if(rt.cur.sc==='minBlues'&&iv===6) return '♭5'; return GEN[iv]; }

/* ---------- roles ---------- */
export function scaleSet(){return new Set(SCALES[rt.cur.sc].iv.map(i=>(rt.cur.t+i)%12));}
export function roleOf(pc,S,P){
  if(!S.has(pc)) return null;
  if(P.has(pc)) return 'chord';
  if(state.careful&&P.has((pc+11)%12)) return 'careful';
  return 'scale';
}

/* ---------- fretboard ---------- */
const OPEN=[64,59,55,50,45,40], SNAME=['e','B','G','D','A','E'], FRETS=15;
const NUT=58, OPENX=36, SG=31, EDGE=17, TOP=24;
const wires=[NUT]; for(let n=1;n<=FRETS;n++) wires.push(wires[n-1]+64*Math.pow(0.966,n-1));
const W=Math.ceil(wires[FRETS]+16), BH=EDGE*2+SG*5, H=TOP+BH+30;
const cx=f=>f===0?OPENX:(wires[f-1]+wires[f])/2, cy=s=>TOP+EDGE+s*SG;
function boxRange(){const p=(rt.cur.t-4+12)%12; return p===0?[0,3]:[p-1,p+3];}
let lastBox='';
export function drawBoard(){
  const S=scaleSet(), P=pcsOf(rt.chords[state.cur]), svg=$('board'), [lo,hi]=boxRange(), box=state.view==='box';
  svg.setAttribute('width',W); svg.setAttribute('height',H); svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  let h=`<rect x="${NUT}" y="${TOP}" width="${wires[FRETS]-NUT+8}" height="${BH}" rx="4" fill="var(--board)"/>`;
  h+=`<rect x="${NUT}" y="${TOP+BH-3}" width="${wires[FRETS]-NUT+8}" height="3" fill="var(--board-edge)"/>`;
  const midY=TOP+BH/2;
  [3,5,7,9,15].forEach(f=>h+=`<circle cx="${cx(f)}" cy="${midY}" r="5.5" fill="var(--inlay)" opacity=".85"/>`);
  h+=`<circle cx="${cx(12)}" cy="${cy(1)+SG/2}" r="5.5" fill="var(--inlay)" opacity=".85"/><circle cx="${cx(12)}" cy="${cy(3)+SG/2}" r="5.5" fill="var(--inlay)" opacity=".85"/>`;
  for(let f=1;f<=FRETS;f++) h+=`<rect x="${wires[f]-1.25}" y="${TOP}" width="2.5" height="${BH}" fill="var(--fret)"/>`;
  h+=`<rect x="${NUT-4}" y="${TOP}" width="6" height="${BH}" rx="1.5" fill="var(--nut)"/>`;
  for(let s=0;s<6;s++){const w=0.9+s*0.38;
    h+=`<line x1="${OPENX+16}" y1="${cy(s)}" x2="${wires[FRETS]+8}" y2="${cy(s)}" stroke="var(--string)" stroke-width="${w}"/>`;
    h+=`<text class="sn" x="11" y="${cy(s)}">${SNAME[s]}</text>`;}
  for(let f=1;f<=FRETS;f++) h+=`<text class="fn${[3,5,7,9,12,15].includes(f)?' mk':''}" x="${cx(f)}" y="${TOP+BH+19}">${f}</text>`;
  let bx0=0,bx1=0;
  if(box){bx0=lo===0?20:wires[lo-1]+2; bx1=wires[Math.min(hi,FRETS)]-2;
    h+=`<rect class="boxr" x="${bx0}" y="${TOP-3}" width="${bx1-bx0}" height="${BH+6}" rx="8"/>`;
    h+=`<text class="boxl" x="${(bx0+bx1)/2}" y="${TOP-9}">Start here${lo===0?' · open strings':` · frets ${Math.max(lo,1)}–${hi}`}</text>`;}
  for(let s=0;s<6;s++) for(let f=0;f<=FRETS;f++){
    const x0=f===0?20:wires[f-1], x1=f===0?NUT-4:wires[f];
    h+=`<rect class="hit" x="${x0}" y="${cy(s)-SG/2}" width="${x1-x0}" height="${SG}" data-m="${OPEN[s]+f}" data-k="${s}-${f}"/>`;
  }
  for(let s=0;s<6;s++) for(let f=0;f<=FRETS;f++){
    const m=OPEN[s]+f, pc=m%12, role=roleOf(pc,S,P); if(!role) continue;
    const iv=(pc-rt.cur.t+12)%12, home=iv===0, x=cx(f), y=cy(s);
    const txt=state.labels==='notes'?spell(pc):(home?'R':degLabel(iv)), fs=txt.length>2?9.5:11;
    const dim=box&&(f<lo||f>hi)?' dim':'';
    const shape=home?`<rect x="${x-12}" y="${y-12}" width="24" height="24" rx="6"/>`:`<circle cx="${x}" cy="${y}" r="${role==='careful'?11:12}"/>`;
    h+=`<g class="dot ${role}${home?' home':''}${dim}" id="d${s}-${f}">${shape}<text class="lbl" x="${x}" y="${y+.5}" font-size="${fs}">${txt}</text></g>`;
  }
  svg.innerHTML=h;
  const key=box+':'+lo;
  if(box&&key!==lastBox){const sc=$('boardScroll'); if(sc.scrollWidth>sc.clientWidth) sc.scrollLeft=Math.max(0,bx0-60);}
  lastBox=key;
}
$('board').addEventListener('pointerdown',e=>{
  const t=e.target.closest('.hit'); if(!t) return;
  ensureAudio(); if(!rt.ctx) return; pluck(+t.dataset.m, rt.ctx.currentTime+.005, .55);
  const d=document.getElementById('d'+t.dataset.k);
  if(d){d.classList.add('pop');setTimeout(()=>d.classList.remove('pop'),160);}
});
