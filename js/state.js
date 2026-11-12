import {SBY} from './theory.js';
import {cleanArr} from './arrangement.js';

/* ---------- persisted state (saved song, sound, view prefs) ---------- */
export const state={song:'A C D',style:'auto',home:'auto',view:'box',labels:'notes',careful:true,tempo:90,cur:0,arr:null,tone:'acoustic',mix:{gtr:1,bass:.9,drums:.8}};
try{
  const s=JSON.parse(localStorage.getItem('noodle-map-v2')||'null');
  if(s&&typeof s.song==='string'&&SBY[s.style]){
    Object.assign(state,s);
    if(state.arr){try{state.arr=cleanArr(state.arr);}catch(e){state.arr=null;}}
  }
}catch(e){}
export function save(){try{localStorage.setItem('noodle-map-v2',JSON.stringify(state));}catch(e){}}

/* ---------- transient runtime state shared across modules ----------
   A plain mutable object (not individually exported `let`s) so every module can read
   and write the same live values without juggling ES module live-binding rules. */
export const rt={
  chords:[], A:null, cur:null, seq:[],
  ctx:null,
  voices:[],
  playing:false, timer:null, nextT:0, seqIdx:0, slotPos:0,
  draft:null, dirty:false,
};
