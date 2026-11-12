import {$} from './dom.js';
import {STYLES, SBY, SCALES} from './theory.js';
import {state, rt, save} from './state.js';
import {spell} from './board.js';

let _renderAll=()=>{};
export function initDropdown({renderAll}){ _renderAll=renderAll; }

function clockSVG(scKey,size){
  const iv=SCALES[scKey].iv, r=size/2-3.5, c=size/2; let h=`<svg class="clock" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">`;
  for(let i=0;i<12;i++){const a=(i/12)*Math.PI*2-Math.PI/2, on=iv.includes(i);
    h+=`<circle class="${i===0?'hm':on?'on':'off'}" cx="${(c+r*Math.cos(a)).toFixed(2)}" cy="${(c+r*Math.sin(a)).toFixed(2)}" r="${on?2.7:1.5}"/>`;}
  return h+'</svg>';
}
const BADGE={best:'Best match',good:'Good match',spicy:'Spicy'};
export function renderDropdown(){
  const st=SBY[state.style], r=rt.A.res[state.style];
  const shown= state.style==='auto'? SBY[r.pick] : st;
  $('ddBtn').innerHTML=`${clockSVG(r.sc,40)}<span><span class="dd-name">${state.style==='auto'?`Best fit <em>· ${shown.name}</em>`:st.name}</span>
    <span class="dd-sub">${spell(r.t)} ${SCALES[r.sc].name}. ${state.style==='auto'?'Picked for your chords.':st.desc}</span></span><span class="chev"></span>`;
  $('ddPanel').innerHTML=STYLES.map((s,i)=>{const rr=rt.A.res[s.id];
    const notes=SCALES[rr.sc].iv.map(x=>spell((rr.t+x)%12)).join(' ');
    const badge= s.id==='auto'?`<span class="badge good">Picks ${SBY[rr.pick].name}</span>`:`<span class="badge ${rr.badge}">${BADGE[rr.badge]}</span>`;
    return `<li class="opt${i===0?' sep':''}" role="option" id="opt-${s.id}" data-id="${s.id}" aria-selected="${s.id===state.style}">${clockSVG(rr.sc,30)}
      <span><span class="row"><b>${s.name}</b>${badge}</span><span class="ds">${s.desc}</span><span class="nn">${spell(rr.t)} ${SCALES[rr.sc].name} · ${notes}</span></span></li>`;}).join('');
}
let ddOpen=false, act=0;
function openDD(){ddOpen=true;$('ddPanel').hidden=false;$('ddBtn').setAttribute('aria-expanded','true');act=STYLES.findIndex(s=>s.id===state.style);setAct();$('ddPanel').focus();}
function closeDD(focusBtn){ddOpen=false;$('ddPanel').hidden=true;$('ddBtn').setAttribute('aria-expanded','false');if(focusBtn)$('ddBtn').focus();}
function setAct(){document.querySelectorAll('.opt').forEach((o,i)=>o.classList.toggle('act',i===act));
  const el=document.querySelectorAll('.opt')[act]; if(el){el.scrollIntoView({block:'nearest'});$('ddPanel').setAttribute('aria-activedescendant',el.id);}}
function choose(id){state.style=id; rt.cur=rt.A.res[id]; save(); closeDD(true); _renderAll();}
$('ddBtn').onclick=()=>ddOpen?closeDD():openDD();
$('ddPanel').addEventListener('click',e=>{const o=e.target.closest('.opt');if(o)choose(o.dataset.id);});
$('ddPanel').addEventListener('mousemove',e=>{const o=e.target.closest('.opt');if(!o)return;const i=STYLES.findIndex(s=>s.id===o.dataset.id);if(i!==act){act=i;setAct();}});
$('ddPanel').addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'){act=Math.min(STYLES.length-1,act+1);setAct();e.preventDefault();}
  else if(e.key==='ArrowUp'){act=Math.max(0,act-1);setAct();e.preventDefault();}
  else if(e.key==='Enter'||e.key===' '){choose(STYLES[act].id);e.preventDefault();}
  else if(e.key==='Escape'||e.key==='Tab'){closeDD(e.key==='Escape');}
});
$('ddBtn').addEventListener('keydown',e=>{if(e.key==='ArrowDown'&&!ddOpen){openDD();e.preventDefault();}});
document.addEventListener('pointerdown',e=>{if(ddOpen&&!$('dd').contains(e.target))closeDD();});
