import {SBY} from './theory.js';
import {cleanArr} from './arrangement.js';

/* ---------- persisted state (saved song, sound, view prefs) ----------
   The storage key can be overridden with window.GUIBANA_STORAGE_KEY (the embed player
   sets its own key so it doesn't share saved state with a full app on the same origin). */
const KEY=window.GUIBANA_STORAGE_KEY||'noodle-map-v2';
export const state={song:'A C D',style:'auto',home:'auto',view:'box',labels:'notes',careful:true,tempo:90,cur:0,arr:null,tone:'acoustic',mix:{gtr:1,bass:.9,drums:.8}};
try{
  const s=JSON.parse(localStorage.getItem(KEY)||'null');
  if(s&&typeof s.song==='string'&&SBY[s.style]){
    Object.assign(state,s);
    if(state.arr){try{state.arr=cleanArr(state.arr);}catch(e){state.arr=null;}}
  }
}catch(e){}
export function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}}

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
