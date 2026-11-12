import {parseSong, STRUMS, STBY, BASSES, BSBY, DRUMS, DRBY, LENS} from './theory.js';

/* ---------- arrangement model ---------- */
export const clampN=(n,lo,hi)=>Math.max(lo,Math.min(hi,Math.round(+n||lo)));
export function newSet(name){return {name:name||'Set',repeat:1,strum:'folk',beats:4,lines:[]};}
export function cleanArr(a){
  if(!a||typeof a!=='object'||!Array.isArray(a.sets)) throw new Error('The file has no "sets" list.');
  const sets=a.sets.slice(0,40).map((s,i)=>{
    if(!s||typeof s!=='object') throw new Error(`Set ${i+1} is not readable.`);
    const lines=(Array.isArray(s.lines)?s.lines:[]).slice(0,64).map(l=>({chords:String(typeof l==='string'?l:(l&&l.chords)||'').slice(0,200),repeat:clampN(l&&l.repeat||1,1,32),
      bass:l&&BSBY[l.bass]?l.bass:'off',drums:l&&DRBY[l.drums]?l.drums:'off'}));
    return {name:String(s.name||`Set ${i+1}`).slice(0,60),repeat:clampN(s.repeat||1,1,32),strum:STBY[s.strum]?s.strum:'folk',
      beats:[2,4,8].includes(+s.beats)?+s.beats:4,lines};
  });
  return {name:String(a.name||'My song').slice(0,80),sets};
}
export function arrChords(a){
  const uniq=[],seen=new Map();
  if(a) a.sets.forEach(s=>s.lines.forEach(l=>parseSong(l.chords).chords.forEach(c=>{if(!seen.has(c.name)){seen.set(c.name,uniq.length);uniq.push(c);}})));
  return {uniq,seen};
}
export function lineText(l){return l.chords.trim()+(l.repeat>1?` - ${l.repeat}x`:'')+(l.bass&&l.bass!=='off'?`  bass:${l.bass}`:'')+(l.drums&&l.drums!=='off'?`  drums:${l.drums}`:'');}
export const HDR=/^(set|part|section|verse|chorus|pre-?chorus|bridge|intro|outro|solo|riff|break|hook|refrain|interlude)\b/i;
export function toText(a){
  return a.sets.map(s=>{
    const out=[HDR.test(s.name)?s.name:s.name+':'];
    if(s.strum!=='folk') out.push('Strum: '+STBY[s.strum].name);
    if(s.beats!==4) out.push('Each chord: '+LENS.find(x=>x.b===s.beats).n);
    s.lines.forEach(l=>out.push(lineText(l)));
    if(s.repeat>1) out.push(`Repeat ${s.repeat}x`);
    return out.join('\n');
  }).join('\n\n');
}
export function fromText(txt,name){
  const sets=[],errs=[]; let cur=null;
  const ensure=()=>{if(!cur){cur=newSet('Set '+(sets.length+1));sets.push(cur);}};
  txt.split(/\r?\n/).forEach((raw,i)=>{
    const l=raw.trim(); if(!l) return;
    let m;
    if((m=l.match(/^(?:repeat|play)\s*[:=]?\s*(\d+)\s*(?:x|times)?\.?$/i))||(m=l.match(/^[x×]\s*(\d+)$/i))||(m=l.match(/^(\d+)\s*[x×]$/i))){ensure();cur.repeat=clampN(m[1],1,32);return;}
    if((m=l.match(/^strum\s*[:=]?\s*(.+)$/i))){ensure(); const v=m[1].trim().toLowerCase();
      const st=STRUMS.find(s=>s.id===v||s.name.toLowerCase()===v||s.name.toLowerCase().startsWith(v)||s.p===m[1].trim().toUpperCase());
      if(st) cur.strum=st.id; else errs.push(`Line ${i+1}: unknown strum "${m[1].trim()}". Try ${STRUMS.map(s=>s.name).join(', ')}.`); return;}
    if((m=l.match(/^each chord\s*[:=]?\s*(.+)$/i))){ensure(); const v=m[1]; cur.beats=/½|1\/2|half/i.test(v)?2:/^2|two/i.test(v.trim())?8:4; return;}
    if(HDR.test(l)||/:$/.test(l)){cur=newSet(l.replace(/:$/,'').trim());sets.push(cur);return;}
    let opts={bass:'off',drums:'off'};
    const lo=l.replace(/\b(bass|drums?)\s*[:=]\s*([a-z-]+)/gi,(_,k,v)=>{k=k.toLowerCase().startsWith('drum')?'drums':'bass'; v=v.toLowerCase();
      const list=k==='bass'?BASSES:DRUMS; const hit=list.find(x=>x.id===v||x.name.toLowerCase().startsWith(v)); if(hit) opts[k]=hit.id; else errs.push(`Line ${i+1}: unknown ${k} "${v}". Try ${list.map(x=>x.id).join(', ')}.`); return '';}).trim();
    let body=lo, rep=1; const mm=lo.match(/^(.*?)\s*(?:[-–—]\s*)?(?:[x×]\s*(\d+)|(\d+)\s*[x×])\s*$/i);
    if(mm&&mm[1].trim()){body=mm[1]; rep=+(mm[2]||mm[3]);}
    const p=parseSong(body);
    if(!p.chords.length){errs.push(`Line ${i+1}: couldn't read "${l}".`);return;}
    if(p.bad.length) errs.push(`Line ${i+1}: skipped ${p.bad.map(b=>'"'+b+'"').join(', ')}.`);
    ensure(); cur.lines.push({chords:body.trim(),repeat:clampN(rep,1,32),bass:opts.bass,drums:opts.drums});
  });
  return {arr:{name:name||'My song',sets},errs};
}
export function buildSeq(a){
  const seq=[]; const {seen}=arrChords(a);
  a.sets.forEach((s,si)=>{for(let sp=1;sp<=s.repeat;sp++) s.lines.forEach((l,li)=>{for(let lp=1;lp<=l.repeat;lp++)
    parseSong(l.chords).chords.forEach((c,ci)=>seq.push({c,idx:seen.get(c.name),beats:s.beats,strum:s.strum,bass:l.bass||'off',drums:l.drums||'off',si,li,sp,lp,ci}));});});
  return seq;
}
export function totalBeats(a){return a.sets.reduce((t,s)=>t+s.repeat*s.lines.reduce((u,l)=>u+l.repeat*parseSong(l.chords).chords.length*s.beats,0),0);}
export const EXAMPLE={name:'Example song',sets:[
  {name:'Set 1',repeat:2,strum:'folk',beats:4,lines:[{chords:'A A C Dm',repeat:2,bass:'fifth',drums:'pop'},{chords:'A A A Bm',repeat:2,bass:'fifth',drums:'pop'}]},
  {name:'Set 2',repeat:1,strum:'eighths',beats:4,lines:[{chords:'D D A A',repeat:2,bass:'eighths',drums:'rock'},{chords:'C C Dm E',repeat:1,bass:'eighths',drums:'rock'}]}
]};
