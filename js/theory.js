/* ---------- music theory: scales, chords, strums, bass/drum patterns, chord parsing, fit scoring ---------- */
export const SHARP=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
export const FLAT =['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];
export const GEN={0:'R',1:'♭2',2:'2',3:'♭3',4:'3',5:'4',6:'♭5',7:'5',8:'♭6',9:'6',10:'♭7',11:'7'};

export const SCALES={
  minPent:{name:'minor pentatonic',iv:[0,3,5,7,10],minor:true},
  minBlues:{name:'blues scale',iv:[0,3,5,6,7,10],minor:true},
  majPent:{name:'major pentatonic',iv:[0,2,4,7,9]},
  ionian:{name:'major scale',iv:[0,2,4,5,7,9,11]},
  aeolian:{name:'natural minor',iv:[0,2,3,5,7,8,10],minor:true},
  dorian:{name:'Dorian',iv:[0,2,3,5,7,9,10],minor:true},
  mixo:{name:'Mixolydian',iv:[0,2,4,5,7,9,10]}
};
export const STYLES=[
  {id:'auto',name:'Best fit',desc:'Let the app choose. Fewest sour notes over your chords.'},
  {id:'rock',name:'Rock & Blues',sc:'minPent',home:'key',desc:'The classic solo box. Five gritty notes that suit most rock songs.'},
  {id:'country',name:'Country & Happy',sc:'majPent',home:'major',desc:'Sweet and bright. Five notes that never sound sour in a cheerful song.'},
  {id:'blues',name:'Blues',sc:'minBlues',home:'key',desc:'Rock & Blues plus one spicy blue note. Slide through it, don’t sit on it.'},
  {id:'pop',name:'Pop & Folk',sc:'ionian',home:'major',desc:'The full major scale. Seven notes for singable melodies.'},
  {id:'sad',name:'Sad & Moody',sc:'aeolian',home:'minor',desc:'Dark and dramatic. For minor-key ballads and heavier songs.'},
  {id:'jazz',name:'Jazz & Funk',sc:'dorian',home:'minor',desc:'Smooth minor with a hopeful lift. Great for funky grooves.'},
  {id:'jam',name:'Jam & Southern Rock',sc:'mixo',home:'major',desc:'Major with a laid-back flat 7. Long, loose jams.'}
];
export const SBY=Object.fromEntries(STYLES.map(s=>[s.id,s]));

/* strum patterns: 8 eighth-note slots per bar. D = down, U = up, - = rest */
export const STRUMS=[
  {id:'beats',name:'Every beat',p:'D-D-D-D-'},
  {id:'folk',name:'Folk',p:'D-DU-UDU'},
  {id:'pop',name:'Pop',p:'D-DUD-DU'},
  {id:'eighths',name:'Rock eighths',p:'DUDUDUDU'},
  {id:'ballad',name:'Ballad',p:'D---D-DU'},
  {id:'slow',name:'Slow and open',p:'D-------'},
  {id:'offbeat',name:'Offbeat (reggae)',p:'-U-U-U-U'}
];
export const STBY=Object.fromEntries(STRUMS.map(s=>[s.id,s]));
export const LENS=[{b:2,n:'½ bar'},{b:4,n:'1 bar'},{b:8,n:'2 bars'}];
export const BASSES=[
  {id:'off',name:'No bass'},
  {id:'root',name:'Root notes',p:'R---R---'},
  {id:'fifth',name:'Root and fifth',p:'R---5---'},
  {id:'eighths',name:'Rock eighths',p:'RRRRRRRR'},
  {id:'groove',name:'Pop groove',p:'R--R-5O-'},
  {id:'octaves',name:'Disco octaves',p:'RORORORO'},
  {id:'walk',name:'Walking (jazz)'}
];
export const DRUMS=[
  {id:'off',name:'No drums'},
  {id:'rock',name:'Rock',k:'x---xx--',s:'--x---x-',h:'xxxxxxxx'},
  {id:'pop',name:'Pop',k:'x--xx---',s:'--x---x-',h:'xxxxxxxx'},
  {id:'four',name:'Four on the floor',k:'x-x-x-x-',s:'--x---x-',h:'-o-o-o-o'},
  {id:'half',name:'Half-time',k:'x-----x-',s:'----x---',h:'xxxxxxxx'},
  {id:'shuffle',name:'Blues shuffle',k:'x---x---',s:'--x---x-',h:'xxxxxxxx',swing:true},
  {id:'jazz',name:'Jazz swing',k:'x-x-x-x-',kv:.3,r:'x-xxx-xx',h:'--c---c-',swing:true,nocrash:true},
  {id:'metal',name:'Metal double kick',k:'dddddddd',s:'--x---x-',r:'x-x-x-x-'},
  {id:'reggae',name:'Reggae one drop',k:'----x---',rim:'----x---',h:'xxxxxxxx',swing:true}
];
export const BSBY=Object.fromEntries(BASSES.map(b=>[b.id,b])), DRBY=Object.fromEntries(DRUMS.map(d=>[d.id,d]));

export const T={maj:[0,4,7],min:[0,3,7],dom7:[0,4,7,10],maj7:[0,4,7,11],m7:[0,3,7,10],m7b5:[0,3,6,10],dim:[0,3,6],dim7:[0,3,6,9],
  sus4:[0,5,7],sus2:[0,2,7],six:[0,4,7,9],m6:[0,3,7,9],nine:[0,4,7,10,14],m9:[0,3,7,10,14],add9:[0,4,7,14],aug:[0,4,8],five:[0,7],s9:[0,4,7,10,15],maj9:[0,4,7,11,14]};
export const SUF={'':'maj','maj':'maj','M':'maj','m':'min','min':'min','mi':'min','-':'min','7':'dom7','dom7':'dom7','m7':'m7','min7':'m7','-7':'m7','mi7':'m7',
  'maj7':'maj7','M7':'maj7','ma7':'maj7','Δ':'maj7','Δ7':'maj7','m7b5':'m7b5','ø':'m7b5','ø7':'m7b5','min7b5':'m7b5','dim':'dim','°':'dim','o':'dim',
  'dim7':'dim7','°7':'dim7','o7':'dim7','sus4':'sus4','sus':'sus4','7sus4':'sus4','sus2':'sus2','6':'six','m6':'m6','9':'nine','m9':'m9','add9':'add9','add2':'add9','2':'add9',
  'aug':'aug','+':'aug','5':'five','7#9':'s9','maj9':'maj9','11':'dom7','13':'dom7','m11':'m7','min9':'m9','6/9':'six','69':'six'};

export function parseSong(str){
  const out=[],bad=[];
  String(str||'').split(/[\s,|]+/).filter(Boolean).forEach(tok=>{
    const m=tok.match(/^([A-Ga-g])([#♯b♭]?)(.*)$/);
    if(!m){bad.push(tok);return;}
    const L=m[1].toUpperCase(), acc=m[2].replace('♯','#').replace('♭','b');
    let pc={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[L]; if(acc==='#')pc++; if(acc==='b')pc--; pc=(pc+12)%12;
    let raw=m[3]; const slash=raw.match(/^(.*?)\/[A-Ga-g][#♯b♭]?$/); if(slash) raw=slash[1];
    const suf=raw.replace(/♯/g,'#').replace(/♭/g,'b');
    let type=SUF[suf], guess=false;
    if(!type){guess=true; type=/^(m|min|mi|-)(?!aj)/.test(suf)?'min':'maj'; if(/^\d/.test(suf)) type='dom7';}
    out.push({root:pc,type,iv:T[type],name:L+(acc==='#'?'♯':acc==='b'?'♭':'')+raw.replace(/#/g,'♯').replace(/(\d)b/g,'$1♭'),acc,guess});
  });
  return {chords:out,bad};
}

/* ---------- fit scoring ---------- */
export function pcsOf(c){return new Set(c.iv.map(i=>(c.root+i)%12));}
export function fit(scKey,t,chords){
  const S=new Set(SCALES[scKey].iv.map(i=>(t+i)%12)); let sum=0, rootsIn=0;
  chords.forEach(c=>{
    const P=pcsOf(c); let inS=0; P.forEach(p=>{if(S.has(p))inS++;});
    let s=3*inS/P.size;
    S.forEach(n=>{ if(P.has(n))return; const below=(n+11)%12; if(P.has(below)) s-= below===c.root?2.5:1.5; });
    if(S.has(c.root)) rootsIn++; else s-=1;
    sum+=s;
  });
  return {score:sum/chords.length*3+(SCALES[scKey].iv.length===5?1.5:0),rootsIn};
}
export function detectKey(chords){
  let best=null;
  Object.keys(SCALES).forEach(k=>{for(let t=0;t<12;t++){
    let sc=fit(k,t,chords).score+(t===chords[0].root?3:chords.some(c=>c.root===t)?.5:0);
    if(!best||sc>best.sc+1e-9) best={sc,t,k};
  }});
  const tonicChord=chords.find(c=>c.root===best.t);
  let minor;
  if(tonicChord){const P=tonicChord.iv; minor=P.includes(3)&&!P.includes(4);} else minor=!!SCALES[best.k].minor;
  return {key:best.t,minor};
}
/* home: the state.home UI setting ('auto' or a fixed pitch class), kept out of this module so theory.js has no dependency on app state */
export function analyse(chords,home){
  const K=detectKey(chords);
  const res={};
  STYLES.forEach(st=>{ if(st.id==='auto') return;
    let t;
    if(home!=='auto') t=+home;
    else if(st.home==='key') t=K.key;
    else if(st.home==='major') t=K.minor?(K.key+3)%12:K.key;
    else t=K.minor?K.key:(K.key+9)%12;
    res[st.id]={t,sc:st.sc,...fit(st.sc,t,chords)};
  });
  let bestId=null; STYLES.forEach(st=>{if(st.id!=='auto'&&(!bestId||res[st.id].score>res[bestId].score+1e-9)) bestId=st.id;});
  const top=res[bestId].score;
  Object.entries(res).forEach(([id,r])=>{r.badge= id===bestId?'best': r.score>=top-1.5?'good':'spicy';});
  res.auto={...res[bestId],pick:bestId,badge:'best'};
  return {K,res,bestId};
}
