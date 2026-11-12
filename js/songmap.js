import {$, esc} from './dom.js';
import {state, rt} from './state.js';

let _startPlay=()=>{};
export function initSongMap({startPlay}){ _startPlay=startPlay; }

/* ---------- song map: sections timeline, now-playing card and count-in to the next section ---------- */
let blocks=[], blockOf=[], curBlock=-1, secTimers=[];
function secFamily(name){return String(name).toLowerCase().replace(/[\s\d:().#-]+$/,'').replace(/\s+\d+$/,'').trim()||'set';}
function secColor(name){const f=secFamily(name); let h=0; for(const ch of f) h=(h*31+ch.charCodeAt(0))>>>0;
  const known={intro:1,verse:2,'pre-chorus':3,prechorus:3,chorus:4,bridge:5,solo:6,outro:1,riff:6,hook:4,refrain:4,break:5,interlude:5};
  return 'var(--sec'+(known[f]||(h%6)+1)+')';}
export function buildBlocks(){
  blocks=[]; blockOf=new Array(rt.seq.length);
  if(!state.arr) return;
  let beat=0;
  rt.seq.forEach((ev,i)=>{
    const last=blocks[blocks.length-1];
    if(!last||last.si!==ev.si||last.sp!==ev.sp) blocks.push({si:ev.si,sp:ev.sp,start:i,beats:0,startBeat:beat,name:state.arr.sets[ev.si].name,reps:state.arr.sets[ev.si].repeat});
    const b=blocks[blocks.length-1]; blockOf[i]=blocks.length-1; ev.inBlock=b.beats; b.beats+=ev.beats; beat+=ev.beats;
  });
}
export function renderTimeline(){
  const on=!!state.arr&&blocks.length>0; $('secWrap').hidden=!on; if(!on) return;
  $('timeline').innerHTML=blocks.map((b,k)=>`<button type="button" class="blk" data-b="${k}" style="flex-grow:${b.beats};--c:${secColor(b.name)}" title="${esc(b.name)}${b.reps>1?` (${b.sp} of ${b.reps})`:''} · ${b.beats/4} bars. Play from here.">
    <span class="fill"></span><span class="bl">${esc(b.name)}${b.reps>1?` <small>${b.sp}/${b.reps}</small>`:''}</span></button>`).join('');
  if(!rt.playing) idleSection();
}
export function idleSection(){
  curBlock=-1; secTimers.forEach(clearTimeout); secTimers=[];
  const b=blocks[0]; if(!b) return;
  $('secCard').classList.remove('countin');
  $('secCard').style.setProperty('--c',secColor(b.name));
  $('secName').textContent='Song map';
  $('secMeta').textContent=`${blocks.length} section${blocks.length>1?'s':''} · ${Math.round(blocks.reduce((t,x)=>t+x.beats,0)/4)} bars. Tap a section to play from there.`;
  $('secNext').innerHTML='';
  document.querySelectorAll('.blk').forEach(el=>{el.classList.remove('now'); const f=el.querySelector('.fill'); f.style.transition='none'; f.style.width='0';});
}
function nextBlockText(k){
  const nb=blocks[(k+1)%blocks.length], b=blocks[k];
  if(k+1>=blocks.length) return `Back to the top · <b>${esc(nb.name)}</b>`;
  if(nb.si===b.si) return `<b>${esc(nb.name)}</b> again (${nb.sp} of ${nb.reps})`;
  return `<b>${esc(nb.name)}</b>`;
}
export function updateSection(i,d){
  const k=blockOf[i]; if(k==null) return; const b=blocks[k], ev=rt.seq[i], beat=60/state.tempo;
  const card=$('secCard');
  if(k!==curBlock){
    curBlock=k;
    card.style.setProperty('--c',secColor(b.name));
    $('secName').textContent=b.name;
    card.classList.remove('enter'); void card.offsetWidth; card.classList.add('enter');
    document.querySelectorAll('.blk').forEach((el,j)=>{el.classList.toggle('now',j===k); el.classList.toggle('done',j<k);
      const f=el.querySelector('.fill'); if(j!==k){f.style.transition='none'; f.style.width=j<k?'100%':'0';}});
    const el=document.querySelector(`.blk[data-b="${k}"]`); if(el){const tl=$('timeline'); const x=el.offsetLeft-tl.clientWidth/3; if(tl.scrollWidth>tl.clientWidth) tl.scrollTo({left:Math.max(0,x),behavior:'smooth'});}
  }
  const bars=Math.ceil(b.beats/4), bar=Math.floor(ev.inBlock/4)+1;
  $('secMeta').textContent=`${b.reps>1?`Round ${b.sp} of ${b.reps} · `:''}bar ${Math.min(bar,bars)} of ${bars}`;
  // playhead inside the current block
  const f=document.querySelector(`.blk[data-b="${k}"] .fill`);
  if(f){f.style.transition='none'; f.style.width=(ev.inBlock/b.beats*100)+'%'; void f.offsetWidth; f.style.transition=`width ${d}s linear`; f.style.width=((ev.inBlock+ev.beats)/b.beats*100)+'%';}
  // count-in during the last 4 beats of the section
  secTimers.forEach(clearTimeout); secTimers=[];
  const remainStart=b.beats-ev.inBlock;
  const nxt=nextBlockText(k);
  const show=(n)=>{ if(!rt.playing) return;
    if(n>0&&n<=4){card.classList.add('countin'); $('secNext').innerHTML=`<span class="nl">Next</span><span class="nn">${nxt}</span><span class="cnt" aria-label="in ${n} beats">${[4,3,2,1].map(x=>`<i class="${x===n?'on':x>n?'past':''}">${x}</i>`).join('')}</span>`;}
    else {card.classList.remove('countin'); const barsLeft=Math.ceil(n/4); $('secNext').innerHTML=blocks.length>1||b.reps>1?`<span class="nl">Next</span><span class="nn">${nxt}</span><span class="in">in ${barsLeft} bar${barsLeft>1?'s':''}</span>`:'';}
  };
  for(let x=0;x<ev.beats;x++){const n=remainStart-x; if(x===0) show(n); else secTimers.push(setTimeout(()=>show(n),x*beat*1000));}
}
$('timeline').addEventListener('click',e=>{
  const el=e.target.closest('.blk'); if(!el) return; const b=blocks[+el.dataset.b];
  if(rt.playing){ rt.seqIdx=b.start; rt.nextT=rt.ctx.currentTime+.05; rt.slotPos=0; curBlock=-1; secTimers.forEach(clearTimeout); }
  else _startPlay(b.start);
});
