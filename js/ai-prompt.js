import {$} from './dom.js';

/* make with AI */
function aiPrompt(){const base=$('aiPromptSrc').textContent.trim(), sheet=$('aiSheet').value.trim(); return sheet?base.replace('[PASTE CHORD SHEET OR TAB HERE]',sheet):base;}
function aiRefresh(){
  const p=aiPrompt(), url='https://claude.ai/new?q='+encodeURIComponent(p);
  $('aiOpen').hidden=url.length>12000; $('aiOpen').href=url.length>12000?'https://claude.ai/new':url;
  if(!$('aiFull').hidden) $('aiFull').value=p;
}
$('aiBtn').onclick=()=>{const open=$('aiPane').hidden; $('aiPane').hidden=!open; $('aiBtn').setAttribute('aria-expanded',open); if(open){aiRefresh(); $('aiSheet').focus();}};
$('aiSheet').addEventListener('input',()=>{aiRefresh(); $('aiMsg').textContent='';});
$('aiShow').onclick=()=>{const f=$('aiFull'), show=f.hidden; f.hidden=!show; $('aiShow').setAttribute('aria-expanded',show); $('aiShow').textContent=show?'Hide prompt':'Show prompt'; if(show) f.value=aiPrompt();};
$('aiCopy').onclick=()=>{
  const p=aiPrompt(), m=$('aiMsg');
  const fallback=()=>{const f=$('aiFull'); f.hidden=false; f.value=p; f.focus(); f.select(); $('aiShow').textContent='Hide prompt'; m.className='msg'; m.textContent='Press Ctrl+C or Cmd+C to copy the selected prompt.';};
  try{navigator.clipboard.writeText(p).then(()=>{m.className='msg'; m.textContent=$('aiSheet').value.trim()?'Prompt copied with your song. Paste it into an AI chat.':'Prompt copied. Paste it into an AI chat, then add your song where it says.';},fallback);}catch(e){fallback();}
};
$('aiOpen').addEventListener('click',()=>{ $('aiMsg').className='msg'; $('aiMsg').textContent='Opened Claude in a new tab. If the prompt isn’t filled in there, use Copy prompt.'; });
