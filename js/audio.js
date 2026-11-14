import {$} from './dom.js';
import {BSBY, DRBY} from './theory.js';
import {state, rt, save} from './state.js';

/* ---------- audio: tuned Karplus-Strong strings through an amp, cab and room ---------- */
export const TONES={
  acoustic:{name:'Acoustic',inst:'gtr',lvl:.55,b:.2,a:.15,pick:.12,t60:[3.4,1.5],drive:0,voicing:'full',spread:.013,rev:[1.7,.18]},
  blues:{name:'Blues',inst:'el',lvl:1.3,pregain:.55,b:.28,a:.3,pick:.2,t60:[4.2,2.4],drive:2.2,post:.55,cab:{hp:85,lp:4000,mid:[750,3,1]},voicing:'full',spread:.011,rev:[2.6,.24]},
  rock:{name:'Rock',inst:'el',lvl:.8,pregain:1.1,b:.26,a:.28,pick:.16,t60:[4.6,2.8],drive:10,post:.21,pre:[900,5],cab:{hp:95,lp:4600,mid:[1000,2,1.2]},voicing:'power',spread:.008,rev:[1.9,.15]},
  jazz:{name:'Jazz',inst:'el',lvl:1.6,pregain:.4,b:.46,a:.68,pick:.32,t60:[3.6,1.8],drive:.7,post:1.05,cab:{hp:65,lp:1900,mid:[350,2.5,.8]},voicing:'jazz',spread:.016,rev:[2.3,.22],chorus:true},
  metal:{name:'Metal',inst:'el',lvl:.7,pregain:1.2,b:.24,a:.22,pick:.1,t60:[4.6,2.8],drive:42,post:.24,pre:[800,8],cab:{hp:115,lp:5200,mid:[700,-6,.9],low:[120,4]},voicing:'power',spread:.005,rev:[1.3,.08],palm:true}
};
let master=null, glue=null, toneIn=null, toneOut=null; const cache=new Map();
export function ensureAudio(){
  if(!rt.ctx){const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
    rt.ctx=new AC(); master=rt.ctx.createGain(); master.gain.value=.9;
    glue=rt.ctx.createDynamicsCompressor(); glue.threshold.value=-16; glue.ratio.value=3; glue.attack.value=.006; glue.release.value=.2;
    const lim=rt.ctx.createDynamicsCompressor(); lim.threshold.value=-3; lim.knee.value=0; lim.ratio.value=20; lim.attack.value=.001; lim.release.value=.08;
    glue.connect(master); master.connect(lim); lim.connect(rt.ctx.destination); buildBand(); buildTone();}
  if(rt.ctx.state==='suspended') rt.ctx.resume().catch(()=>{});
}
function T_(){return TONES[state.tone]||TONES.acoustic;}
export const currentTone=T_;
function biq(type,f,g,q){const n=rt.ctx.createBiquadFilter(); n.type=type; n.frequency.value=f; if(g!=null)n.gain.value=g; if(q!=null)n.Q.value=q; return n;}
function chainNodes(nodes){for(let i=0;i<nodes.length-1;i++) nodes[i].connect(nodes[i+1]); return nodes;}
function shaperCurve(k){const n=2048,c=new Float32Array(n),d=Math.tanh(k)||1;for(let i=0;i<n;i++){const x=i/(n-1)*2-1; c[i]=k<.01?x:Math.tanh(k*(x+.04*x*x))/d;}return c;}
function roomIR(sec){const sr=rt.ctx.sampleRate,len=Math.floor(sr*sec),b=rt.ctx.createBuffer(2,len,sr);
  for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch); let lp=0; for(let i=0;i<len;i++){const t=i/sr; lp=lp*.55+(Math.random()*2-1)*.45; d[i]=lp*Math.pow(1-i/len,2.2)*Math.exp(-t*2.2)*(t<.012?t/.012:1);}}
  return b;}
export function buildTone(){
  if(!rt.ctx) return;
  if(toneOut){try{toneOut.disconnect();}catch(e){}}
  const T=T_(), inp=rt.ctx.createGain(), out=rt.ctx.createGain(); let tail;
  if(!T.drive){ // acoustic: body resonances and air
    tail=SM.buf.gtr?chainNodes([inp,biq('highpass',70,null,.7),biq('peaking',220,-1.5,1),biq('highshelf',6000,1.5)])[3]
      :chainNodes([inp,biq('highpass',75,null,.7),biq('peaking',105,6,1.4),biq('peaking',210,2,1),biq('peaking',2800,3,.7),biq('highshelf',7500,3)])[5];
  } else {
    const pg=rt.ctx.createGain(); pg.gain.value=SM.buf.el?(T.pregain||1):1; const nodes=[inp,pg,biq('highpass',T.cab.hp,null,.7)];
    if(T.pre) nodes.push(biq('peaking',T.pre[0],T.pre[1],.7));
    const sh=rt.ctx.createWaveShaper(); sh.curve=shaperCurve(T.drive); sh.oversample='4x'; nodes.push(sh);
    const post=rt.ctx.createGain(); post.gain.value=T.post; nodes.push(post);
    nodes.push(biq('highpass',T.cab.hp,null,.7));
    if(T.cab.low) nodes.push(biq('peaking',T.cab.low[0],T.cab.low[1],1));
    nodes.push(biq('peaking',T.cab.mid[0],T.cab.mid[1],T.cab.mid[2]),biq('lowpass',T.cab.lp,null,.9),biq('lowpass',T.cab.lp*1.5,null,.5));
    chainNodes(nodes); tail=nodes[nodes.length-1];
  }
  if(T.chorus){const dl=rt.ctx.createDelay(.05); dl.delayTime.value=.014; const lfo=rt.ctx.createOscillator(), lg=rt.ctx.createGain(); lfo.frequency.value=.7; lg.gain.value=.0025; lfo.connect(lg); lg.connect(dl.delayTime); lfo.start();
    const wg=rt.ctx.createGain(); wg.gain.value=.45; tail.connect(dl); dl.connect(wg); wg.connect(out);}
  tail.connect(out);
  const rv=rt.ctx.createConvolver(); rv.buffer=roomIR(T.rev[0]); const wet=rt.ctx.createGain(); wet.gain.value=T.rev[1]; tail.connect(rv); rv.connect(wet); wet.connect(out);
  out.gain.value=SM.buf[T.inst]?T.lvl:(T.drive?1:1.3);
  out.connect(gtrVol||glue); toneIn=inp; toneOut=out;
}
function ksBuffer(m,mute,PP){
  const T=PP||T_(), key=(PP?PP.id:state.tone)+'|'+m+'|'+(mute?1:0);
  if(cache.has(key)){const v=cache.get(key); cache.delete(key); cache.set(key,v); return v;}
  const sr=rt.ctx.sampleRate, f=440*Math.pow(2,(m-69)/12), P=sr/f, b=mute?.5:T.b;
  let N=Math.floor(P-b), frac=P-b-N; if(frac<.1){N--;frac+=1;}
  const C=(1-frac)/(1+frac), x=Math.max(0,Math.min(1,(m-40)/45));
  const t60=mute?.16:T.t60[0]+(T.t60[1]-T.t60[0])*x, g=Math.pow(10,-3/(f*t60));
  const len=Math.floor(sr*Math.min(mute?.4:t60*.8+.25,3.6)), buf=rt.ctx.createBuffer(1,len,sr), d=buf.getChannelData(0);
  const line=new Float32Array(N), a=mute?.82:T.a, k=Math.max(1,Math.round(T.pick*N)); let s=0, pk=0;
  const noise=new Float32Array(N); for(let i=0;i<N;i++){s=a*s+(1-a)*(Math.random()*2-1); noise[i]=s;}
  for(let i=0;i<N;i++){line[i]=noise[i]-(i>=k?noise[i-k]:0); pk=Math.max(pk,Math.abs(line[i]));}
  for(let i=0;i<N;i++) line[i]*=.9/(pk||1);
  let idx=0, prev=0, x1=0, y1=0;
  for(let n=0;n<len;n++){
    const cur=line[idx]; d[n]=cur;
    const v=g*((1-b)*cur+b*prev); prev=cur;
    const y=C*v+x1-C*y1; x1=v; y1=y;
    line[idx]=y; idx++; if(idx===N) idx=0;
  }
  const fade=Math.floor(sr*.08); for(let i=0;i<fade&&i<len;i++) d[len-1-i]*=i/fade;
  cache.set(key,buf); if(cache.size>56) cache.delete(cache.keys().next().value);
  return buf;
}
export function pluck(m,t,vel,dur,mute){
  if(!rt.ctx) return;
  const grp=SM.buf[T_().inst]; if(grp){ playSample(grp,m,toneIn,t,vel*1.15,dur,mute); return; }
  const src=rt.ctx.createBufferSource(); src.buffer=ksBuffer(m,mute);
  const g=rt.ctx.createGain(); g.gain.setValueAtTime(vel,t); src.connect(g); g.connect(toneIn); src.start(t);
  if(dur){g.gain.setValueAtTime(vel,t+dur); g.gain.linearRampToValueAtTime(0.0001,t+dur+.05); src.stop(t+dur+.07);}
  rt.voices.push({src,g}); if(rt.voices.length>90) rt.voices.shift();
}
/* real chord shapes: search guitar positions for a fingerable voicing with the root in the bass */
const STR=[40,45,50,55,59,64]; const vcache=new Map();
function guitarShape(c){
  const key=c.root+':'+c.iv.join(','); if(vcache.has(key)) return vcache.get(key);
  const pcs=new Set(c.iv.map(i=>(c.root+i)%12)); let best=null;
  for(let p=0;p<=9;p++){
    const frets=f=>{const r=[]; if(p<=2) r.push(0); for(let q=Math.max(1,p);q<=p+3;q++) r.push(q); return r;};
    let s0=-1,f0=0;
    for(let s=0;s<3&&s0<0;s++){const o=frets(p).filter(f=>(STR[s]+f)%12===c.root); if(o.length){s0=s;f0=o[0];}}
    if(s0<0) continue;
    const notes=[STR[s0]+f0], got=new Set([c.root]); let used=1, gaps=0, open=false, lastUsed=s0;
    for(let s=s0+1;s<6;s++){
      const o=frets(p).filter(f=>pcs.has((STR[s]+f)%12)&&!notes.includes(STR[s]+f));
      if(!o.length){gaps++;continue;}
      o.sort((A,B)=>((got.has((STR[s]+A)%12)?1:0)-(got.has((STR[s]+B)%12)?1:0))||(A===0?-1:B===0?1:A-B));
      const f=o[0]; notes.push(STR[s]+f); got.add((STR[s]+f)%12); used++; if(f===0)open=true;
      if(s-lastUsed>1) gaps+=2; lastUsed=s;
    }
    const sc=used*1.2+got.size*3-(pcs.size-got.size)*2-p*.8-gaps*1.5+(open?.5:0);
    if(!best||sc>best.sc) best={sc,notes};
  }
  const out=best?best.notes:[40+((c.root-4+12)%12),...c.iv.map(i=>52+((c.root-4+12)%12)+i)];
  vcache.set(key,out); return out;
}
function voicing(c){
  const T=T_();
  if(T.voicing==='power'&&c.iv.includes(7)){
    const e=(c.root-4+12)%12, base=e<=7?40+e:45+((c.root-9+12)%12);
    return [base,base+7,base+12];
  }
  if(T.voicing==='jazz'){
    let iv=c.iv; if(c.type==='maj') iv=[0,4,7,9]; else if(c.type==='min') iv=[0,3,7,10];
    const sh=guitarShape({root:c.root,iv}); return sh.slice(0,4);
  }
  return guitarShape(c);
}
export function strum(c,vel,dir,t,dur,mute){ensureAudio(); if(!rt.ctx) return; t=t||rt.ctx.currentTime+.02;
  const T=T_(); if(T.palm&&dir==='U') dir='D';
  let notes=voicing(c).map(n=>n+(state.capo||0)); if(dir==='U') notes=notes.slice(-4).reverse();
  const spread=T.spread*(dir==='U'?.8:1)*(1.15-.3*Math.min(1,vel)), v=vel*(.92+Math.random()*.12);
  notes.forEach((m,i)=>pluck(m,t+i*spread+Math.random()*.003,(dir==='D'&&i===0?.55:.36)*v*(dir==='U'?.85:1),dur,mute));}
export function setTone(id){
  if(!TONES[id]) return; state.tone=id; save(); renderToneSel(); renderSnd();
  loadGroup(T_().inst).then(()=>{buildTone(); renderSnd();}).catch(()=>{});
  if(rt.ctx){buildTone(); if(!rt.playing) strum(rt.chords[state.cur],1,'D');}
}
export function renderToneSel(){$('toneSel').innerHTML=Object.entries(TONES).map(([id,t])=>`<button type="button" data-tone="${id}" aria-pressed="${id===state.tone}">${t.name}</button>`).join('');}
$('toneSel').addEventListener('click',e=>{const b=e.target.closest('button[data-tone]'); if(b){ensureAudio(); setTone(b.dataset.tone);}});
export function renderMix(){const m=state.mix||{}; $('mixGtr').value=m.gtr??1; $('mixBass').value=m.bass??.9; $('mixDrums').value=m.drums??.8;}
[['mixGtr','gtr'],['mixBass','bass'],['mixDrums','drums']].forEach(([id,k])=>{$(id).oninput=e=>{state.mix=state.mix||{}; state.mix[k]=+e.target.value; applyMix(); save();};});

/* ---------- band: synthesized bass guitar and drum kit ---------- */
let bassIn=null, drumIn=null, gtrVol=null, bassVol=null, drumVol=null, noiseBuf=null;
function buildBand(){
  const bv=rt.ctx.createGain(), dv=rt.ctx.createGain(), gv=rt.ctx.createGain();
  bassVol=bv; drumVol=dv; gtrVol=gv; gv.connect(glue); applyMix();
  // bass: dark string, gentle saturation, no reverb
  bassIn=rt.ctx.createGain(); const sh=rt.ctx.createWaveShaper(); sh.curve=shaperCurve(.9);
  chainNodes([bassIn,biq('highpass',35,null,.7),biq('peaking',90,2.5,1),biq('lowpass',2600,null,.7),sh,biq('lowpass',4000,null,.6),bv,glue]);
  // drums: light bus compression and a small room
  drumIn=rt.ctx.createGain(); const dc=rt.ctx.createDynamicsCompressor(); dc.threshold.value=-14; dc.ratio.value=3; dc.attack.value=.003;
  chainNodes([drumIn,dc,dv,glue]);
  const rv=rt.ctx.createConvolver(); rv.buffer=roomIR(.9); const wet=rt.ctx.createGain(); wet.gain.value=.12; dc.connect(rv); rv.connect(wet); wet.connect(dv);
  const len=rt.ctx.sampleRate*2; noiseBuf=rt.ctx.createBuffer(1,len,rt.ctx.sampleRate); const d=noiseBuf.getChannelData(0); for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
}
function applyMix(){ if(!gtrVol) return; const m=state.mix||{}; gtrVol.gain.value=m.gtr??1; bassVol.gain.value=(m.bass??.9)*.7; drumVol.gain.value=(m.drums??.8)*.9; }
const BASS_P={b:.5,a:.86,pick:.22,t60:[2.6,1.8],id:'bass'};
export function bassNote(m,t,vel,dur){
  if(SM.buf.bass){ playSample(SM.buf.bass,m,bassIn,t,vel,dur?dur+.03:dur,false); return; }
  const src=rt.ctx.createBufferSource(); src.buffer=ksBuffer(m,false,BASS_P);
  const g=rt.ctx.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vel,t+.004);
  src.connect(g); g.connect(bassIn); src.start(t);
  if(dur){g.gain.setValueAtTime(vel,t+dur); g.gain.linearRampToValueAtTime(0.0001,t+dur+.04); src.stop(t+dur+.06);}
  rt.voices.push({src,g}); if(rt.voices.length>140) rt.voices.shift();
}
function noiseHit(t,dur,filters,vel,attack){
  const src=rt.ctx.createBufferSource(); src.buffer=noiseBuf; const g=rt.ctx.createGain();
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vel,t+(attack||.001)); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  const ns=[src,...filters.map(f=>biq(f[0],f[1],null,f[2]||.7)),g,drumIn]; chainNodes(ns);
  src.start(t,Math.random()*1.5); src.stop(t+dur+.02);
}
function toneHit(t,type,f0,f1,dur,vel,sweep){
  const o=rt.ctx.createOscillator(), g=rt.ctx.createGain(); o.type=type; o.frequency.setValueAtTime(f0,t); if(f1) o.frequency.exponentialRampToValueAtTime(f1,t+(sweep||.08));
  g.gain.setValueAtTime(vel,t); g.gain.exponentialRampToValueAtTime(.0001,t+dur); o.connect(g); g.connect(drumIn); o.start(t); o.stop(t+dur+.02);
}
const DRUM={
  kick:(t,v)=>{toneHit(t,'sine',130,42,.42,v*1.1,.07); noiseHit(t,.012,[['highpass',2500]],v*.25);},
  snare:(t,v)=>{toneHit(t,'triangle',210,160,.11,v*.45,.05); noiseHit(t,.2,[['highpass',1400],['peaking',4000]],v*.55);},
  rim:(t,v)=>{toneHit(t,'square',820,null,.035,v*.18); noiseHit(t,.03,[['bandpass',2200,3]],v*.4);},
  hat:(t,v)=>noiseHit(t,.05,[['highpass',7500],['bandpass',10000,.8]],v*.32),
  pedal:(t,v)=>noiseHit(t,.04,[['highpass',8000]],v*.16),
  open:(t,v)=>noiseHit(t,.32,[['highpass',7000],['bandpass',9500,.7]],v*.26,.004),
  ride:(t,v)=>{noiseHit(t,.7,[['highpass',5000],['bandpass',7500,1.2]],v*.16,.002); [3.1,4.7,5.9].forEach(r=>toneHit(t,'square',r*290,null,.5,v*.012));},
  crash:(t,v)=>noiseHit(t,1.6,[['highpass',4200]],v*.36,.003)
};
function bassBase(root){return 28+((root-4+12)%12)+(state.capo||0);}
export function playBass(ev,next,t0,slots,slotPos,slot,swingT){
  const B=BSBY[ev.bass]; if(!B||B.id==='off') return;
  const c=ev.c, base=bassBase(c.root), third=c.iv.includes(3)?3:c.iv.includes(4)?4:c.iv.includes(5)?5:2, fifth=c.iv.includes(7)?7:c.iv.includes(6)?6:c.iv.includes(8)?8:7;
  if(B.id==='walk'){
    const beats=slots/2, tones=[0,third,fifth,12,c.iv.includes(10)?10:9,fifth,third];
    const tgt=bassBase(next.c.root), appr=tgt-1>=28?tgt-1:tgt+1;
    for(let b=0;b<beats;b++){const m=b===beats-1&&beats>1?appr:base+tones[b%tones.length]; bassNote(m,t0+b*2*slot,b===0?.95:.8,slot*1.85);}
    return;
  }
  const p=B.p;
  for(let k=0;k<slots;k++){
    const ch=p[(slotPos+k)%8]; if(ch==='-') continue;
    let gap=1; while(gap<8&&p[(slotPos+k+gap)%8]==='-'&&k+gap<slots) gap++;
    const m=base+(ch==='5'?fifth:ch==='O'?12:0), on=(slotPos+k)%2===0;
    bassNote(m,swingT(k),on?.95:.8,gap*slot*(gap===1?.8:.92));
  }
}
export function playDrums(ev,t0,slots,slotPos,slot,swingT,crash){
  const D=DRBY[ev.drums]; if(!D||D.id==='off') return;
  const kit=KIT_OF[D.id]||'std', H=(n,t,v)=>drumHit(kit,n,t,v);
  for(let k=0;k<slots;k++){
    const g=(slotPos+k)%8, t=swingT(k), beat=g%2===0, down=g===0;
    const hum=()=>.9+Math.random()*.12;
    if(D.k&&D.k[g]==='x') H('kick',t,(D.kv||1)*hum());
    if(D.k&&D.k[g]==='d'){H('kick',t,.7*hum()); H('kick',t+slot/2,.58*hum());}
    if(D.s&&D.s[g]==='x') H('snare',t,hum());
    if(D.rim&&D.rim[g]==='x') H('rim',t,hum());
    if(crash&&k===0&&!D.nocrash){H('crash',t,1); continue;}
    if(D.h&&D.h[g]==='x') H('hat',t,(beat?1:.6)*(down?1.1:1)*hum());
    if(D.h&&D.h[g]==='o') H('open',t,hum());
    if(D.h&&D.h[g]==='c') H('pedal',t,hum());
    if(D.r&&D.r[g]==='x') H('ride',t,(beat?1:.75)*hum());
  }
}

/* ---------- recorded samples: guitars and bass (tonejs-instruments, CC BY 3.0), drums (GeneralUser GS) ---------- */
const SM={man:null,buf:{},loading:{},failed:false};
export function isGroupLoaded(g){return !!SM.buf[g];}
async function smManifest(){ if(SM.man) return SM.man; const r=await fetch('smp/manifest.json'); if(!r.ok) throw new Error('no samples'); SM.man=await r.json(); return SM.man; }
function decode(ab){return new Promise((res,rej)=>{try{const p=rt.ctx.decodeAudioData(ab,res,rej); if(p&&p.then) p.then(res,rej);}catch(e){rej(e);}});}
function prepBuf(b){
  const d=b.getChannelData(0); let pk=0; for(let i=0;i<d.length;i++){const v=Math.abs(d[i]); if(v>pk) pk=v;}
  const thr=pk*.04; let on=0; while(on<d.length&&Math.abs(d[on])<thr) on++;
  return {b,off:Math.max(0,on-24)/b.sampleRate,gain:pk?.9/pk:1};
}
export function loadGroup(g){
  if(SM.buf[g]) return Promise.resolve(SM.buf[g]);
  if(SM.loading[g]) return SM.loading[g];
  ensureAudio(); if(!rt.ctx) return Promise.reject(new Error('no audio'));
  const p=(async()=>{
    const man=await smManifest(); const map=g.startsWith('kit:')?man.kits[g.slice(4)]:man[g];
    const out={};
    await Promise.all(Object.entries(map).map(async([k,f])=>{const r=await fetch('smp/'+f); if(!r.ok) throw new Error(f); out[k]=prepBuf(await decode(await r.arrayBuffer()));}));
    out._keys=Object.keys(out).filter(k=>k!=='_keys').map(Number).filter(n=>!isNaN(n)).sort((a,b)=>a-b);
    SM.buf[g]=out; renderSnd(); return out;
  })();
  SM.loading[g]=p; p.catch(()=>{delete SM.loading[g]; SM.failed=true; renderSnd();});
  return p;
}
function nearestKey(grp,m){let best=grp._keys[0]; for(const k of grp._keys) if(Math.abs(k-m)<Math.abs(best-m)) best=k; return best;}
function playSample(grp,m,dest,t,vel,dur,mute){
  const k=nearestKey(grp,m), s=grp[k], src=rt.ctx.createBufferSource(); src.buffer=s.b; src.playbackRate.value=Math.pow(2,(m-k)/12);
  const g=rt.ctx.createGain(); let node=src;
  if(mute){const lp=biq('lowpass',900,null,.6); src.connect(lp); node=lp; dur=Math.min(dur||.13,.13);}
  node.connect(g); g.connect(dest);
  const lv=vel*s.gain; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(lv,t+.003); src.start(t,s.off);
  if(dur){g.gain.setValueAtTime(lv,t+dur); g.gain.linearRampToValueAtTime(.0001,t+dur+.07); src.stop(t+dur+.09);}
  rt.voices.push({src,g}); if(rt.voices.length>160) rt.voices.shift();
}
const KIT_OF={metal:'power',rock:'power',jazz:'jazz'};
const DLVL={kick:1,snare:.8,rim:.55,hat:.32,pedal:.3,open:.34,crash:.5,ride:.6};
let openHat=null;
function drumHit(kit,name,t,v){
  const grp=SM.buf['kit:'+kit];
  if(!grp||!grp[name]){ if(name==='kick'||name==='snare'||!SM.buf['kit:std']) return DRUM[name](t,v); return drumHit('std',name,t,v); }
  if((name==='hat'||name==='pedal')&&openHat){try{openHat.gain.cancelScheduledValues(t); openHat.gain.setTargetAtTime(0,t,.015);}catch(e){} openHat=null;}
  const s=grp[name], src=rt.ctx.createBufferSource(); src.buffer=s.b; src.playbackRate.value=.985+Math.random()*.03;
  const g=rt.ctx.createGain(); g.gain.value=v*DLVL[name]*s.gain; src.connect(g); g.connect(drumIn); src.start(t,s.off);
  if(name==='open') openHat=g.gain;
}
export function neededGroups(){
  const gs=new Set([T_().inst]);
  rt.seq.forEach(ev=>{ if(ev.bass&&ev.bass!=='off') gs.add('bass'); if(ev.drums&&ev.drums!=='off') gs.add('kit:'+(KIT_OF[ev.drums]||'std')); });
  return [...gs];
}
export function renderSnd(){
  const el=$('snd'); if(!el) return;
  const g=T_().inst;
  el.textContent= SM.buf[g]?'Recorded samples': SM.loading[g]?'Loading samples…': SM.failed?'Built-in synth (samples didn’t load)':'';
}
