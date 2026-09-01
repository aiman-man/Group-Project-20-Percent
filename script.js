(function(global){
'use strict';
const BG_MUSIC_LIMIT_SECONDS=120; // background music auto-stops after this many seconds. Change this number to adjust the limit.
const STORAGE_KEY='jobverse_aiman_haziq_v2_custom';
const statusLabel=s=>String(s||'OPEN').toUpperCase();
const clone=o=>JSON.parse(JSON.stringify(o));
function makeStudent(id){
  const isS1=id==='s1';
  return {id,name:isS1?'Aiman':'Haziq',dimension:isS1?'Aiman':'Haziq',accent:isS1?'crimson':'electric',missions:[]};
}
function createMission(student,title,description){
  const s=clone(student);
  const number=s.missions.length?Math.max(...s.missions.map(m=>m.number))+1:1;
  s.missions.push({number,title:String(title||'').slice(0,120),description:String(description||'').slice(0,600),status:'OPEN',pdfFile:null,htmlFile:null,versions:[],createdAt:new Date().toISOString(),submittedAt:null,gradedAt:null,mark:null,maxMark:100,feedback:'',resubmissionNote:'',due:''});
  return s;
}
function makeDemoState(){return {students:{s1:makeStudent('s1'),s2:makeStudent('s2')},selectedStudent:'s1',currentMission:{s1:1,s2:1},activity:[]}}
function updateMission(student,number,fn){const s=clone(student),idx=Number(number)-1;if(!s.missions[idx])return s;s.missions[idx]=fn(clone(s.missions[idx]));return s}
function setSubmissionPackage(student,number,pkg){return updateMission(student,number,m=>{m.pdfFile=pkg?.pdfFile||m.pdfFile||null;m.htmlFile=pkg?.htmlFile||m.htmlFile||null;return m})}
function hasDualPackage(m){return !!(m?.pdfFile&&m?.htmlFile)}
function submitMission(student,number){return updateMission(student,number,m=>{if(!hasDualPackage(m))throw new Error('Both PDF and HTML are required before submission.');m.status='SUBMITTED';m.submittedAt=new Date().toISOString();m.resubmissionNote='';m.versions.push({at:m.submittedAt,pdfFile:clone(m.pdfFile),htmlFile:clone(m.htmlFile)});return m})}
function deleteMission(student,number){
  const s=clone(student);
  const idx=s.missions.findIndex(m=>m.number===Number(number));
  if(idx<0)throw new Error('Submission not found.');
  s.missions.splice(idx,1);
  s.missions.forEach((m,i)=>{m.number=i+1});
  return s;
}
function gradeMission(student,number,mark,maxMark=100,feedback=''){return updateMission(student,number,m=>{m.status='GRADED';m.mark=Math.max(0,Number(mark));m.maxMark=Math.max(1,Number(maxMark));m.feedback=String(feedback||'');m.gradedAt=new Date().toISOString();m.resubmissionNote='';return m})}
function requestResubmission(student,number,note='Revision requested'){return updateMission(student,number,m=>{m.status='RESUBMISSION REQUIRED';m.resubmissionNote=String(note);return m})}
function weightedGrade(student){let got=0,max=0;student.missions.forEach(m=>{if(m.status==='GRADED'&&m.mark!=null){got+=Number(m.mark);max+=Number(m.maxMark||100)}});return max?Math.round(got/max*100):0}
function counts(student){const c={graded:0,submitted:0,open:0,resubmission:0,complete:0};student.missions.forEach(m=>{if(m.status==='GRADED'){c.graded++;c.complete++}else if(m.status==='SUBMITTED'){c.submitted++;c.complete++}else if(m.status==='RESUBMISSION REQUIRED'){c.resubmission++;}else c.open++});return c}
const GH_CFG_KEY='jobverse_github_cfg_v1';
const GH_DEFAULTS={owner:'aiman-man',repo:'Group-Project-20-Percent',branch:'main',prefix:'submissions'};
function getGithubConfig(){if(typeof localStorage==='undefined')return{...GH_DEFAULTS};try{const saved=JSON.parse(localStorage.getItem(GH_CFG_KEY));return saved?{...GH_DEFAULTS,...saved}:{...GH_DEFAULTS}}catch(e){return{...GH_DEFAULTS}}}
function saveGithubConfig(cfg){try{localStorage.setItem(GH_CFG_KEY,JSON.stringify(cfg))}catch(e){}}
function githubConfigured(){const c=getGithubConfig();return !!(c.owner&&c.repo&&c.token)}
function ghSlug(s){return String(s||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')||'file'}
function fileToBase64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(new Error('Could not read file'));r.readAsDataURL(file)})}
function submissionGithubPath(student,mission,file,kind){const cfg=getGithubConfig();const prefix=String(cfg.prefix||'').replace(/^\/+|\/+$/g,'');const folder=[prefix,ghSlug(student.dimension),`mission-${String(mission.number).padStart(2,'0')}-${ghSlug(mission.title||'submission')}`].filter(Boolean).join('/');return `${folder}/${kind}-${file.name}`.replace(/\/+/g,'/')}
function submissionGithubFolder(student,mission){const cfg=getGithubConfig();const prefix=String(cfg.prefix||'').replace(/^\/+|\/+$/g,'');return [prefix,ghSlug(student.dimension),`mission-${String(mission.number).padStart(2,'0')}-${ghSlug(mission.title||'submission')}`].filter(Boolean).join('/').replace(/\/+/g,'/')}
async function pushMissionMeta(sid,mission){
  if(!githubConfigured())return;
  try{
    const student=state.students[sid];
    const folder=submissionGithubFolder(student,mission);
    const payload={
      number:mission.number,title:mission.title,description:mission.description,
      status:mission.status,submittedAt:mission.submittedAt,gradedAt:mission.gradedAt,
      mark:mission.mark,maxMark:mission.maxMark,feedback:mission.feedback,
      resubmissionNote:mission.resubmissionNote
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const file=new File([blob],'meta.json',{type:'application/json'});
    await githubPutFile(`${folder}/meta.json`,file,`Update metadata for ${mission.title}`);
  }catch(e){console.warn('pushMissionMeta failed:',e.message)}
}
async function githubPutFile(path,file,message){
  const cfg=getGithubConfig();
  if(!cfg.owner||!cfg.repo||!cfg.token)throw new Error('GitHub is not connected yet. Open GitHub setup first.');
  const content=await fileToBase64(file);
  const branch=cfg.branch||'main';
  const url=`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
  let sha;
  try{const chk=await fetch(`${url}?ref=${encodeURIComponent(branch)}`,{headers:{Authorization:`Bearer ${cfg.token}`,Accept:'application/vnd.github+json'}});if(chk.ok){const j=await chk.json();sha=j.sha}}catch(e){}
  const res=await fetch(url,{method:'PUT',headers:{Authorization:`Bearer ${cfg.token}`,Accept:'application/vnd.github+json','Content-Type':'application/json'},body:JSON.stringify({message,content,branch,...(sha?{sha}:{})})});
  if(!res.ok){let msg=`GitHub push failed (${res.status})`;try{const j=await res.json();if(j.message)msg=j.message}catch(e){}throw new Error(msg)}
  const data=await res.json().catch(()=>({}));
  return {path,branch,rawUrl:`https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${branch}/${path}`,liveUrl:`https://raw.githack.com/${cfg.owner}/${cfg.repo}/${branch}/${path}`,htmlUrl:(data.content&&data.content.html_url)||''};
}
const exported={makeStudent,createMission,setSubmissionPackage,hasDualPackage,submitMission,gradeMission,requestResubmission,weightedGrade,counts};
if(typeof module!=='undefined'&&module.exports)module.exports=exported;
if(typeof document==='undefined')return;

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function openDlg(sel){const d=typeof sel==='string'?$(sel):sel;if(!d)return;d.style.removeProperty('display');try{if(!d.open)d.showModal()}catch(e){d.setAttribute('open','');d.open=true}}
function closeDlg(sel){const d=typeof sel==='string'?$(sel):sel;if(!d)return;try{d.close()}catch(e){}d.removeAttribute('open');d.open=false;d.style.display='none'}
let state=loadState(); let activeStudent='s1', activeMission=1, pendingPackage={pdfFile:null,htmlFile:null}, pendingBlobs={pdf:null,html:null}; let soundOn=false; let activePreviewUrl=null;
let sunClickTimes=[]; const MILESTONE_STEPS=[3,5,10,15,20,30]; let freshDraftNumber=null;
function loadState(){try{const raw=localStorage.getItem(STORAGE_KEY);if(raw){const x=JSON.parse(raw);if(Array.isArray(x.students?.s1?.missions)&&Array.isArray(x.students?.s2?.missions)){x.students.s1.name='Aiman';x.students.s1.dimension='Aiman';x.students.s2.name='Haziq';x.students.s2.dimension='Haziq';return x}}}catch(e){}return makeDemoState()}
function saveState(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch(e){}}
function fmtDate(v){if(!v)return'—';try{return new Intl.DateTimeFormat('en-MY',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v))}catch(e){return'—'}}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1800)}
function beep(freq=520,dur=.06){if(!soundOn)return;try{const ctx=beep.ctx||(beep.ctx=new (AudioContext||webkitAudioContext)());const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.04,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+dur);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+dur)}catch(e){}}
let ambientHum=null;
function startAmbientHum(){
  if(ambientHum)return;
  try{
    const ctx=beep.ctx||(beep.ctx=new (AudioContext||webkitAudioContext)());
    const o1=ctx.createOscillator(),o2=ctx.createOscillator(),g=ctx.createGain();
    o1.type='sine';o1.frequency.value=67;o2.type='sine';o2.frequency.value=100.5;
    g.gain.value=0;o1.connect(g);o2.connect(g);g.connect(ctx.destination);o1.start();o2.start();
    g.gain.linearRampToValueAtTime(.016,ctx.currentTime+1.4);
    ambientHum={o1,o2,g,ctx};
  }catch(e){}
}
function stopAmbientHum(){
  if(!ambientHum)return;
  const {o1,o2,g,ctx}=ambientHum;
  try{g.gain.linearRampToValueAtTime(0,ctx.currentTime+.7);setTimeout(()=>{try{o1.stop();o2.stop()}catch(e){}},720)}catch(e){}
  ambientHum=null;
}
function animateCountUp(el,to,opts={}){
  if(!el)return;
  const duration=opts.duration||650,suffix=opts.suffix||'';
  if(reduceMotion()){el.textContent=`${to}${suffix}`;return}
  const start=performance.now();
  const step=now=>{
    const p=Math.min(1,(now-start)/duration),eased=1-Math.pow(1-p,3);
    el.textContent=`${Math.round(to*eased)}${suffix}`;
    if(p<1)requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function initCustomSelects(){
  $$('.jv-select').forEach(wrap=>{
    const trigger=wrap.querySelector('.jv-select-trigger'),label=wrap.querySelector('.jv-select-value'),menu=wrap.querySelector('.jv-select-menu'),nativeSelect=wrap.querySelector('select');
    if(!trigger||!menu||!nativeSelect||wrap.dataset.bound)return;
    wrap.dataset.bound='1';
    const items=()=>[...wrap.querySelectorAll('.jv-select-menu li')];
    const closeMenu=()=>{if(menu.classList.contains('hidden'))return;menu.classList.remove('show');trigger.setAttribute('aria-expanded','false');setTimeout(()=>menu.classList.add('hidden'),160)};
    const openMenu=()=>{$$('.jv-select-menu').forEach(m=>{if(m!==menu){m.classList.remove('show');m.classList.add('hidden');m.closest('.jv-select')?.querySelector('.jv-select-trigger')?.setAttribute('aria-expanded','false')}});menu.classList.remove('hidden');requestAnimationFrame(()=>menu.classList.add('show'));trigger.setAttribute('aria-expanded','true')};
    trigger.addEventListener('click',e=>{e.stopPropagation();menu.classList.contains('hidden')?openMenu():closeMenu()});
    items().forEach(li=>li.addEventListener('click',e=>{e.stopPropagation();items().forEach(x=>x.setAttribute('aria-selected','false'));li.setAttribute('aria-selected','true');label.textContent=li.textContent;nativeSelect.value=li.dataset.value;nativeSelect.dispatchEvent(new Event('change',{bubbles:true}));closeMenu()}));
    wrap._jvClose=closeMenu;
  });
  document.addEventListener('click',e=>{if(!e.target.closest('.jv-select'))$$('.jv-select').forEach(w=>w._jvClose?.())});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')$$('.jv-select').forEach(w=>w._jvClose?.())});
}
function initMagneticButtons(){
  if(reduceMotion())return;
  if(!window.matchMedia?.('(hover:hover) and (pointer:fine)').matches)return;
  const SOFT=['.dimension-card'],STRONG=['.primary-button','.outline-button','.protocol-arrow'],SEL=[...STRONG,...SOFT].join(',');
  let current=null;
  document.addEventListener('pointermove',e=>{
    const el=e.target.closest?.(SEL);
    if(el){
      current=el;
      const soft=SOFT.some(s=>el.matches(s)),kx=soft?.05:.24,ky=soft?.06:.32;
      const r=el.getBoundingClientRect();
      const relX=e.clientX-(r.left+r.width/2), relY=e.clientY-(r.top+r.height/2);
      if(soft){
        const rx=(-relY/r.height*6).toFixed(2), ry=(relX/r.width*8).toFixed(2);
        el.style.transform=`perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translate3d(${(relX*kx).toFixed(1)}px,${(relY*ky).toFixed(1)}px,0)`;
      }else{
        el.style.transform=`translate3d(${(relX*kx).toFixed(1)}px,${(relY*ky).toFixed(1)}px,0)`;
      }
    }else if(current){current.style.transform='';current=null}
  });
  window.addEventListener('pointerout',e=>{if(!e.relatedTarget&&current){current.style.transform='';current=null}});
}
function initCustomSelect(select){
  if(!select||select.dataset.customized)return;select.dataset.customized='1';
  const wrap=document.createElement('div');wrap.className='jv-select';
  select.parentNode.insertBefore(wrap,select);wrap.appendChild(select);
  select.classList.add('jv-select-native');select.tabIndex=-1;select.setAttribute('aria-hidden','true');
  const trigger=document.createElement('button');trigger.type='button';trigger.className='jv-select-trigger';trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');trigger.innerHTML=`<span class="jv-select-label"></span><span class="jv-select-arrow">▾</span>`;
  const menu=document.createElement('ul');menu.className='jv-select-menu';menu.setAttribute('role','listbox');menu.hidden=true;
  [...select.options].forEach(opt=>{const li=document.createElement('li');li.textContent=opt.textContent;li.dataset.value=opt.value;li.setAttribute('role','option');li.tabIndex=-1;menu.appendChild(li)});
  wrap.appendChild(trigger);wrap.appendChild(menu);
  const syncLabel=()=>{const opt=select.options[select.selectedIndex];trigger.querySelector('.jv-select-label').textContent=opt?opt.textContent:'';[...menu.children].forEach(li=>li.setAttribute('aria-selected',String(li.dataset.value===select.value)))};
  const open=()=>{menu.hidden=false;trigger.setAttribute('aria-expanded','true');wrap.classList.add('open')};
  const close=()=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false');wrap.classList.remove('open')};
  trigger.addEventListener('click',e=>{e.stopPropagation();menu.hidden?open():close()});
  menu.addEventListener('click',e=>{const li=e.target.closest('li');if(!li)return;select.value=li.dataset.value;select.dispatchEvent(new Event('change',{bubbles:true}));syncLabel();close();trigger.focus()});
  document.addEventListener('click',e=>{if(!wrap.contains(e.target))close()});
  trigger.addEventListener('keydown',e=>{if(e.key==='Escape')close();if(['ArrowDown','Enter',' '].includes(e.key)){e.preventDefault();open();menu.querySelector('li')?.focus()}});
  menu.addEventListener('keydown',e=>{const items=[...menu.children],idx=items.indexOf(document.activeElement);if(e.key==='ArrowDown'){e.preventDefault();(items[idx+1]||items[0]).focus()}else if(e.key==='ArrowUp'){e.preventDefault();(items[idx-1]||items[items.length-1]).focus()}else if(e.key==='Enter'||e.key===' '){e.preventDefault();document.activeElement.click()}else if(e.key==='Escape'){close();trigger.focus()}});
  syncLabel();
}
function initCursorLight(){
  const orb=$('#cursor-light');if(!orb)return;
  const fine=window.matchMedia?.('(hover:hover) and (pointer:fine)').matches;
  if(!fine||reduceMotion())return;
  let raf=0,px=innerWidth/2,py=innerHeight/2;
  window.addEventListener('pointermove',e=>{px=e.clientX;py=e.clientY;orb.classList.add('active');if(!raf)raf=requestAnimationFrame(()=>{orb.style.transform=`translate3d(${px}px,${py}px,0)`;raf=0})});
  window.addEventListener('pointerdown',()=>orb.classList.add('pressed'));
  window.addEventListener('pointerup',()=>orb.classList.remove('pressed'));
  document.addEventListener('mouseleave',()=>orb.classList.remove('active'));
}
function cosmicClick(){
  if(!soundOn)return;
  try{
    const ctx=beep.ctx||(beep.ctx=new (AudioContext||webkitAudioContext)());
    const t=ctx.currentTime;
    const o1=ctx.createOscillator(),o2=ctx.createOscillator(),g=ctx.createGain();
    o1.type='sine';o2.type='sine';
    const base=activeStudent==='s2'?900:760;
    o1.frequency.setValueAtTime(base,t);
    o1.frequency.exponentialRampToValueAtTime(base*.42,t+.1);
    o2.frequency.setValueAtTime(base*1.5,t);
    o2.frequency.exponentialRampToValueAtTime(base*.72,t+.1);
    g.gain.setValueAtTime(.045,t);
    g.gain.exponentialRampToValueAtTime(.001,t+.13);
    o1.connect(g);o2.connect(g);g.connect(ctx.destination);
    o1.start(t);o2.start(t);o1.stop(t+.13);o2.stop(t+.13);
  }catch(e){}
}
function initClickSound(){
  document.addEventListener('pointerdown',e=>{const b=e.target.closest('button,[role="button"],.dimension-card,.package-slot,.journey-node,.queue-row,.mission-list-row');if(!b||b.disabled)return;cosmicClick()});
}
const FILE_DB='jobverse_submission_files_v1',FILE_STORE='files';
function openFileDB(){return new Promise((resolve,reject)=>{if(!('indexedDB'in window))return reject(new Error('IndexedDB unavailable'));const req=indexedDB.open(FILE_DB,1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(FILE_STORE))db.createObjectStore(FILE_STORE)};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function putSubmissionBlob(key,blob){const db=await openFileDB();return new Promise((resolve,reject)=>{const tx=db.transaction(FILE_STORE,'readwrite');tx.objectStore(FILE_STORE).put(blob,key);tx.oncomplete=()=>{db.close();resolve(key)};tx.onerror=()=>{db.close();reject(tx.error)}})}
async function getSubmissionBlob(key){if(!key)return null;const db=await openFileDB();return new Promise((resolve,reject)=>{const tx=db.transaction(FILE_STORE,'readonly'),req=tx.objectStore(FILE_STORE).get(key);req.onsuccess=()=>{db.close();resolve(req.result||null)};req.onerror=()=>{db.close();reject(req.error)}})}
function packageMeta(file,key){return file?{name:file.name,size:file.size,type:file.type||'',key}:null}
async function persistPendingPackage(){
  const stamp=Date.now();let pdfMeta=pendingPackage.pdfFile,htmlMeta=pendingPackage.htmlFile;
  if(pendingBlobs.pdf){const key=`${activeStudent}-${activeMission}-pdf-${stamp}`;await putSubmissionBlob(key,pendingBlobs.pdf);pdfMeta=packageMeta(pendingBlobs.pdf,key)}
  if(pendingBlobs.html){const key=`${activeStudent}-${activeMission}-html-${stamp}`;await putSubmissionBlob(key,pendingBlobs.html);htmlMeta=packageMeta(pendingBlobs.html,key)}
  pendingPackage={pdfFile:pdfMeta,htmlFile:htmlMeta};
  const titleVal=($('#dialog-title-input')?.value||'').trim(),descVal=($('#dialog-description-input')?.value||'').trim();
  state.students[activeStudent]=updateMission(state.students[activeStudent],activeMission,mm=>{if(!$('#dialog-title-input')?.disabled){mm.title=titleVal||mm.title||`Submission ${activeMission}`;mm.description=descVal}return mm});
  state.students[activeStudent]=setSubmissionPackage(state.students[activeStudent],activeMission,pendingPackage);
  saveState();pendingBlobs={pdf:null,html:null};
  return state.students[activeStudent].missions[activeMission-1];
}
async function previewSubmission(sid,number,kind){
  const m=state.students[sid]?.missions?.[Number(number)-1],meta=kind==='pdf'?m?.pdfFile:m?.htmlFile;
  if(!meta){toast(`${kind.toUpperCase()} file is not available.`);return}
  const remoteUrl=kind==='pdf'?meta.rawUrl:meta.liveUrl;
  const frame=$('#preview-frame'),pdfBox=$('#preview-pdf-container');

  $('#preview-title').textContent=kind==='pdf'?'PDF PREVIEW':'LIVE WEBSITE PREVIEW';
  $('#preview-file-name').textContent=meta.name||'';
  frame.src='about:blank';
  pdfBox.innerHTML='';
  if(kind==='pdf'){frame.style.display='none';pdfBox.style.display='block'}
  else{frame.style.display='';pdfBox.style.display='none'}
  openDlg('#submission-preview');

  try{
    let blob;
    if(remoteUrl){
      const res=await fetch(remoteUrl);
      if(!res.ok)throw new Error('GitHub fetch failed ('+res.status+')');
      blob=await res.blob();
    }else if(meta.key){
      blob=await getSubmissionBlob(meta.key);
      if(!blob)throw new Error('Stored file is missing. Please upload it again.');
    }else{toast('This file has not been pushed to GitHub yet.');return}
    const typedBlob=new Blob([blob],{type:kind==='pdf'?'application/pdf':'text/html'});
    if(activePreviewUrl){URL.revokeObjectURL(activePreviewUrl);activePreviewUrl=null}
    activePreviewUrl=URL.createObjectURL(typedBlob);
    if(kind==='pdf'){
      const embed=document.createElement('embed');
      embed.src=activePreviewUrl;
      embed.type='application/pdf';
      embed.style.width='100%';embed.style.height='100%';
      pdfBox.appendChild(embed);
    }else{
      frame.src=activePreviewUrl;
    }
  }catch(e){toast('Unable to load preview. '+e.message)}
}

function openNewSubmission(){
  state.students[activeStudent]=createMission(state.students[activeStudent],'','');
  saveState();
  const s=state.students[activeStudent],num=s.missions[s.missions.length-1].number;
  renderJourney();renderMissionList();updateGlobalStats();
  const jl=$('#journey-count-label');if(jl)jl.textContent=`${s.missions.length} SUBMISSION${s.missions.length===1?'':'S'}`;
  const mit=$('#mission-index-title');if(mit)mit.textContent=`${s.missions.length} SUBMISSION${s.missions.length===1?'':'S'}`;
  openMission(num);
  freshDraftNumber=num;
  beep(560,.06);
}
function cleanupEmptyDraft(){
  if(freshDraftNumber==null)return;
  const s=state.students[activeStudent];
  const idx=s.missions.findIndex(m=>m.number===freshDraftNumber);
  freshDraftNumber=null;
  if(idx<0)return;
  const m=s.missions[idx];
  const isEmpty=!m.title&&!m.description&&!m.pdfFile&&!m.htmlFile;
  if(isEmpty){
    const s2=clone(s);
    s2.missions.splice(idx,1);
    state.students[activeStudent]=s2;
    saveState();
    renderStudent();
  }
}
function openGithubSetup(){
  const cfg=getGithubConfig();
  $('#gh-owner').value=cfg.owner||'';$('#gh-repo').value=cfg.repo||'';$('#gh-branch').value=cfg.branch||'main';$('#gh-prefix').value=cfg.prefix||'';$('#gh-token').value=cfg.token||'';
  const err=$('#github-setup-error');if(err)err.textContent='';
  openDlg('#github-setup');
  setTimeout(()=>$('#gh-owner')?.focus(),60);
}
function saveGithubSetupFromForm(){
  const owner=$('#gh-owner').value.trim(),repo=$('#gh-repo').value.trim(),branch=$('#gh-branch').value.trim()||'main',prefix=$('#gh-prefix').value.trim(),token=$('#gh-token').value.trim();
  const err=$('#github-setup-error');
  if(!owner||!repo||!token){if(err)err.textContent='Owner, repository and token are all required.';return}
  saveGithubConfig({owner,repo,branch,prefix,token});
  closeDlg('#github-setup');
  toast('GitHub connected. You can submit now.');beep(600,.08);
}
let lastAutoSync=0;
async function syncFromGithub(opts){
  const silent=!!(opts&&opts.silent);
  if(!githubConfigured()){if(!silent){const err=$('#github-setup-error');if(err)err.textContent='Connect GitHub (owner/repo/token) first, then sync.'}return}
  const cfg=getGithubConfig();
  const branch=cfg.branch||'main';
  const prefix=String(cfg.prefix||'submissions').replace(/^\/+|\/+$/g,'')||'submissions';
  const btn=$('#github-sync-btn');
  if(btn&&!silent){btn.disabled=true;btn.textContent='SYNCING…'}
  try{
    const res=await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,{
      headers:{Authorization:`Bearer ${cfg.token}`,Accept:'application/vnd.github+json'}
    });
    if(!res.ok)throw new Error('GitHub fetch failed ('+res.status+')');
    const data=await res.json();
    const files=(data.tree||[]).filter(t=>t.type==='blob'&&t.path.startsWith(prefix+'/'));
    const escPrefix=prefix.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const re=new RegExp('^'+escPrefix+'/([a-z0-9-]+)/mission-(\\d+)-([a-z0-9-]+)/(report|live|meta\\.json)(-(.+))?$');
    const groups={};
    files.forEach(f=>{
      const m=f.path.match(re);
      if(!m)return;
      const [,studentSlug,numStr,titleSlug,kindRaw,,filename]=m;
      const key=studentSlug+'|'+numStr;
      if(!groups[key])groups[key]={studentSlug,number:Number(numStr),titleSlug,report:null,live:null,meta:null};
      if(kindRaw==='meta.json')groups[key].meta={path:f.path};
      else groups[key][kindRaw]={path:f.path,name:filename};
    });
    const mkMeta=(f,kind)=>f?{name:f.name,size:0,type:kind==='report'?'application/pdf':'text/html',rawUrl:`https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${branch}/${f.path}`,liveUrl:`https://raw.githack.com/${cfg.owner}/${cfg.repo}/${branch}/${f.path}`,htmlUrl:`https://github.com/${cfg.owner}/${cfg.repo}/blob/${branch}/${f.path}`}:null;
    let added=0,updated=0;
    for(const sid of ['s1','s2']){
      const s=state.students[sid];
      const slug=ghSlug(s.dimension);
      for(const g of Object.values(groups)){
        if(g.studentSlug!==slug)continue;
        if(!g.report&&!g.live)continue;
        let metaPayload=null;
        if(g.meta){
          try{
            const mres=await fetch(`https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${branch}/${g.meta.path}`);
            if(mres.ok)metaPayload=await mres.json();
          }catch(e){}
        }
        const fallbackTitle=g.titleSlug.split('-').filter(Boolean).map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ')||'Untitled';
        const pdfFile=mkMeta(g.report,'report'),htmlFile=mkMeta(g.live,'live');
        const idx=s.missions.findIndex(m=>m.number===g.number);
        if(idx<0){
          s.missions.push({
            number:g.number,
            title:metaPayload?.title||fallbackTitle,
            description:metaPayload?.description||'Synced from GitHub — original description not available.',
            status:metaPayload?.status||'SUBMITTED',
            submittedAt:metaPayload?.submittedAt||null,gradedAt:metaPayload?.gradedAt||null,
            mark:metaPayload?.mark??null,maxMark:metaPayload?.maxMark||100,
            feedback:metaPayload?.feedback||'',resubmissionNote:metaPayload?.resubmissionNote||'',
            pdfFile,htmlFile,versions:[]
          });
          added++;
        }else if(metaPayload){
          const existing=s.missions[idx];
          const changed=existing.status!==metaPayload.status||existing.mark!==metaPayload.mark||existing.feedback!==metaPayload.feedback||existing.title!==metaPayload.title;
          s.missions[idx]={...existing,
            title:metaPayload.title||existing.title,
            description:metaPayload.description||existing.description,
            status:metaPayload.status||existing.status,
            submittedAt:metaPayload.submittedAt||existing.submittedAt,
            gradedAt:metaPayload.gradedAt||existing.gradedAt,
            mark:metaPayload.mark??existing.mark,
            feedback:metaPayload.feedback||existing.feedback,
            resubmissionNote:metaPayload.resubmissionNote||existing.resubmissionNote,
            pdfFile:pdfFile||existing.pdfFile,htmlFile:htmlFile||existing.htmlFile
          };
          if(changed)updated++;
        }
      }
      s.missions.sort((a,b)=>a.number-b.number);
    }
    if(added||updated){saveState();renderStudent();renderHome()}
    if(!silent){
      closeDlg('#github-setup');
      const parts=[];if(added)parts.push(`${added} new`);if(updated)parts.push(`${updated} updated`);
      toast(parts.length?`Synced: ${parts.join(', ')}.`:'Everything is already up to date.');
      beep((added||updated)?640:420,.08);
    }else if(added||updated){
      toast(`GitHub sync: ${added?added+' new':''}${added&&updated?', ':''}${updated?updated+' updated':''}.`);
    }
  }catch(e){
    if(!silent){const err=$('#github-setup-error');if(err)err.textContent='Sync failed. '+e.message}
  }
  finally{if(btn&&!silent){btn.disabled=false;btn.textContent='↺ SYNC SUBMISSIONS FROM GITHUB'}}
}
function autoSyncIfDue(){
  if(!githubConfigured())return;
  const now=Date.now();
  if(now-lastAutoSync<15000)return;
  lastAutoSync=now;
  syncFromGithub({silent:true});
}
function closeSubmissionPreview(){closeDlg('#submission-preview');$('#preview-frame').src='about:blank';const pdfBox=$('#preview-pdf-container');if(pdfBox)pdfBox.innerHTML='';if(activePreviewUrl){URL.revokeObjectURL(activePreviewUrl);activePreviewUrl=null}}

function showView(name){$$('.view').forEach(v=>v.classList.add('hidden'));$(`#${name}-view`)?.classList.remove('hidden');$('#site-header').classList.toggle('hidden',name!=='home');window.scrollTo({top:0,behavior:'instant'});location.hash=name==='home'?'':name}
function enterStudent(id,evt){activeStudent=id;state.selectedStudent=id;saveState();const x=evt?.clientX||innerWidth/2,y=evt?.clientY||innerHeight/2;startPortalCameraTransition(id,x,y,()=>{renderStudent();showView('student');autoSyncIfDue()})}
function openLecturerLogin(){const err=$('#lecturer-login-error'),pass=$('#lecturer-passcode');if(err)err.textContent='';if(pass)pass.value='';openDlg('#lecturer-login');setTimeout(()=>pass?.focus(),50)}
const LECTURER_PASSCODE='LECTURER2026';
function submitLecturerLogin(){const val=($('#lecturer-passcode')?.value||'').trim();if(val.toUpperCase()!==LECTURER_PASSCODE){$('#lecturer-login-error').textContent=val?'Incorrect passcode. Try again.':'Please enter the passcode first.';const card=document.querySelector('#lecturer-login .login-card');if(card){card.classList.remove('shake');void card.offsetWidth;card.classList.add('shake')}beep(180,.12);return}closeDlg('#lecturer-login');const go=()=>{showView('lecturer');renderLecturer('overview');toast('Welcome back, staff reviewer.');beep(640,.09);autoSyncIfDue()};if(reduceMotion()){go();return}startPortalCameraTransition('lecturer',innerWidth/2,innerHeight/2,go)}

function renderHome(){
  renderActivityFeed();updateGlobalStats();
  const steps=[['01','SELECT','Choose your mission.'],['02','OPEN','Read the brief and requirements.'],['03','UPLOAD','Add your mission files.'],['04','SUBMIT','Commit the PDF + HTML package for review.'],['05','REVIEW','Check evidence and quality.'],['06','GRADE','Receive marks, feedback and next action.']];
  $('#protocol-steps').innerHTML=steps.map(s=>`<article class="protocol-card"><b>${s[0]}</b><h3>${s[1]}</h3><p>${s[2]}</p><i></i></article>`).join('')
}
function updateGlobalStats(){
  const total=state.students.s1.missions.length+state.students.s2.missions.length;
  const heroEl=$('#hero-stat-missions'); if(heroEl)heroEl.textContent=total;
  const footEl=$('#footer-mission-count'); if(footEl)footEl.textContent=`${total} SUBMISSION${total===1?'':'S'} · AIMAN & HAZIQ`;
  const d1=$('#dim-count-s1'); if(d1)d1.textContent=`AIMAN · ${state.students.s1.missions.length} SUBMISSION${state.students.s1.missions.length===1?'':'S'}`;
  const d2=$('#dim-count-s2'); if(d2)d2.textContent=`HAZIQ · ${state.students.s2.missions.length} SUBMISSION${state.students.s2.missions.length===1?'':'S'}`;
}
function renderActivityFeed(){
  const grid=$('#home-mission-grid'); if(!grid)return;
  const all=[...state.students.s1.missions.map(m=>({...m,sid:'s1',sname:'AIMAN'})),...state.students.s2.missions.map(m=>({...m,sid:'s2',sname:'HAZIQ'}))];
  const recent=all.filter(m=>m.createdAt).sort((a,b)=>new Date(b.submittedAt||b.createdAt)-new Date(a.submittedAt||a.createdAt)).slice(0,8);
  grid.innerHTML=recent.length?recent.map(m=>`<button type="button" class="activity-row" data-feed-student="${m.sid}" data-feed-mission="${m.number}"><b class="${m.sid==='s1'?'dot crimson':'dot electric'}"></b><span class="activity-title">${(m.title||'Untitled submission').toUpperCase()}</span><span class="activity-student">${m.sname}</span><span class="activity-date">${fmtDate(m.submittedAt||m.createdAt)}</span><span class="status ${m.status.toLowerCase().replaceAll(' ','-')}">${m.status}</span></button>`).join(''):`<p class="muted" style="padding:20px">No submissions yet — be the first to create one inside a student portal.</p>`
}
function renderStudent(){const s=state.students[activeStudent],c=counts(s),pct=c.complete?Math.round(c.graded/c.complete*100):0;document.body.dataset.student=activeStudent;planet3D?.applyStudent(activeStudent);$('#student-title').textContent=s.name.toUpperCase();$('#student-path-label').textContent=`${s.accent.toUpperCase()} PATH`;$('#side-student-name').textContent=s.name.toUpperCase();$('#side-student-dimension').textContent=`${s.accent.toUpperCase()} PATH`;$('#side-student-dimension').style.color=activeStudent==='s1'?'var(--crimson)':'var(--electric)';$('#progress-count').textContent=c.complete;$('#progress-of-label').textContent=`OF ${s.missions.length}`;$('#progress-percent').textContent=`${pct}%`;$('#metric-graded').textContent=c.graded;$('#metric-submitted').textContent=c.submitted;$('#metric-open').textContent=c.open+c.resubmission;$('#progress-ring').style.setProperty('--pct',`${pct}%`);const jl=$('#journey-count-label');if(jl)jl.textContent=`${s.missions.length} SUBMISSION${s.missions.length===1?'':'S'}`;const mit=$('#mission-index-title');if(mit)mit.textContent=`${s.missions.length} SUBMISSION${s.missions.length===1?'':'S'}`;renderJourney();renderDashboard();renderMissionList();renderTables();updateGlobalStats();showStudentSection('overview')}
function renderJourney(){const s=state.students[activeStudent],c=counts(s),wrap=$('#student-journey');if(!s.missions.length){wrap.style.gridTemplateColumns='1fr';wrap.innerHTML='<p class="muted journey-empty">No submissions yet. Tap + NEW SUBMISSION to start your first one.</p>';wrap.style.setProperty('--progress-frac',0);return}const openM=s.missions.find(m=>m.status==='OPEN');const current=openM?openM.number:s.missions[s.missions.length-1].number;wrap.style.gridTemplateColumns=`repeat(${s.missions.length},minmax(24px,1fr))`;wrap.innerHTML=s.missions.map(m=>`<button type="button" class="journey-node ${m.status.toLowerCase().replaceAll(' ','-')} ${m.number===current?'current':''}" data-open-mission="${m.number}" title="${m.title||'Untitled'}">${m.number}</button>`).join('');requestAnimationFrame(()=>wrap.style.setProperty('--progress-frac',(c.complete/s.missions.length).toFixed(3)))}
function nextMission(student){if(!student.missions.length)return null;return student.missions.find(m=>m.status!=='GRADED')||student.missions[student.missions.length-1]}
function renderDashboard(){
  const s=state.students[activeStudent],m=nextMission(s),graded=[...s.missions].filter(x=>x.status==='GRADED').pop();
  if(!m){
    state.currentMission[activeStudent]=null;
    $('#current-mission').innerHTML=`<span class="kicker">GET STARTED</span><div class="current-no">＋</div><h2>CREATE YOUR FIRST SUBMISSION</h2><p>Give it a title, a description, attach your files, then submit — it pushes straight to your connected GitHub repo.</p><button class="primary-button" type="button" id="dashboard-new-submission">+ NEW SUBMISSION ↗</button>`;
    $('#student-feedback').innerHTML=`<h3>REVIEW FEEDBACK</h3><blockquote>No graded feedback yet. Create and submit your first mission to begin the review cycle.</blockquote>`;
    $('#recent-submission-list').innerHTML=`<p class="muted">No submissions yet.</p>`;
    return;
  }
  state.currentMission[activeStudent]=m.number;saveState();
  $('#current-mission').innerHTML=`<span class="kicker">CURRENT MISSION</span><div class="current-no">${String(m.number).padStart(2,'0')}</div><h2>${(m.title||'Untitled submission').toUpperCase()}</h2><p>${m.description||'No description yet.'}</p><div class="current-meta"><span>STATUS // ${statusLabel(m.status)}</span><span>DUE // ${m.due||'—'}</span></div><button class="primary-button" type="button" data-open-mission="${m.number}">${m.status==='SUBMITTED'?'VIEW SUBMISSION':'CONTINUE MISSION'} ↗</button>`;
  $('#student-feedback').innerHTML=`<h3>REVIEW FEEDBACK</h3>${graded?`<blockquote>“${graded.feedback||'Mission reviewed.'}”</blockquote><span class="kicker">${graded.title}</span><div class="feedback-grade"><span id="feedback-grade-num">0</span><small>/${graded.maxMark}</small></div><button class="outline-button" type="button" data-open-mission="${graded.number}">VIEW FEEDBACK ↗</button>`:`<blockquote>No graded feedback yet. Submit a mission to begin the review cycle.</blockquote>`}`;
  if(graded)animateCountUp($('#feedback-grade-num'),graded.mark,{duration:700});
  const recent=s.missions.filter(x=>x.submittedAt).sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt)).slice(0,5);
  $('#recent-submission-list').innerHTML=recent.length?recent.map((x,i)=>`<div class="recent-row" style="animation-delay:${i*45}ms"><b>${String(x.number).padStart(2,'0')}</b><span>${(x.title||'Untitled').toUpperCase()}</span><span>${fmtDate(x.submittedAt)}</span><span class="status ${x.status.toLowerCase().replaceAll(' ','-')}">${x.status}</span></div>`).join(''):`<p class="muted">No submissions yet.</p>`
}
function renderMissionList(){const s=state.students[activeStudent],q=($('#student-search')?.value||'').toLowerCase(),f=$('#student-filter')?.value||'ALL';const items=s.missions.filter(m=>(f==='ALL'||m.status===f)&&(`${m.number} ${m.title}`.toLowerCase().includes(q)));$('#student-mission-list').innerHTML=items.map((m,i)=>`<article class="mission-list-row ${hasDualPackage(m)?'has-package':''}" style="animation-delay:${Math.min(i,10)*35}ms" data-open-mission="${m.number}"><b>${String(m.number).padStart(2,'0')}</b><div><h3>${m.title.toUpperCase()}</h3><p>${m.description}</p></div><span class="status ${m.status.toLowerCase().replaceAll(' ','-')}">${m.status}</span>${hasDualPackage(m)?`<div class="mission-row-actions"><button type="button" data-preview-kind="pdf" data-preview-sid="${activeStudent}" data-preview-mission="${m.number}">VIEW PDF</button><button type="button" data-preview-kind="html" data-preview-sid="${activeStudent}" data-preview-mission="${m.number}">VIEW LIVE</button></div>`:`<span>${m.mark!=null?`${m.mark}/${m.maxMark}`:'OPEN ↗'}</span>`}</article>`).join('')}
function renderTables(){const s=state.students[activeStudent];const subs=s.missions.filter(m=>m.submittedAt);$('#student-submission-table').innerHTML=subs.map(m=>`<div class="table-row"><b>${String(m.number).padStart(2,'0')}</b><span>${m.title}</span><span>${fmtDate(m.submittedAt)}</span><span class="status ${m.status.toLowerCase().replaceAll(' ','-')}">${m.status}</span><span>${m.mark!=null?`${m.mark}/${m.maxMark}`:'—'}</span></div>`).join('')||'<p>No submissions yet.</p>';const graded=s.missions.filter(m=>m.status==='GRADED');$('#student-grade-table').innerHTML=`<div class="table-row"><b>#</b><span>MISSION</span><span>DATE</span><span>STATUS</span><span>GRADE</span></div>`+graded.map(m=>`<div class="table-row"><b>${String(m.number).padStart(2,'0')}</b><span>${m.title}</span><span>${fmtDate(m.gradedAt)}</span><span class="status graded">GRADED</span><span>${m.mark}/${m.maxMark}</span></div>`).join('')+`<p style="margin-top:20px;color:var(--gold)">OVERALL GRADE // ${weightedGrade(s)}%</p>`;$('#all-feedback').innerHTML=graded.map(m=>`<article class="feedback-card"><span class="kicker">MISSION ${String(m.number).padStart(2,'0')} · ${m.mark}/${m.maxMark}</span><h3>${m.title}</h3><p>${m.feedback||'Mission reviewed.'}</p></article>`).join('')||'<p>No feedback yet.</p>'}
function showStudentSection(name){$$('.student-nav button').forEach(b=>b.classList.toggle('active',b.dataset.studentSection===name));['overview','missions','submissions','grades','feedback'].forEach(n=>{const id=n==='overview'?'student-dashboard':n==='feedback'?'student-feedback-section':`student-${n}`;const el=$(`#${id}`);if(el)el.classList.toggle('hidden',n!==name)});$('#student-overview').classList.toggle('hidden',name!=='overview');$('#student-journey-wrap').classList.toggle('hidden',name!=='overview');if(name==='missions')renderMissionList();if(['submissions','grades','feedback'].includes(name))renderTables();window.scrollTo({top:0,behavior:'smooth'})}
function openMission(number){
  activeMission=Number(number);
  freshDraftNumber=null;
  const s=state.students[activeStudent],m=s.missions[activeMission-1];
  if(!m){toast('Submission not found.');return}
  pendingPackage={pdfFile:m.pdfFile?clone(m.pdfFile):null,htmlFile:m.htmlFile?clone(m.htmlFile):null};
  pendingBlobs={pdf:null,html:null};
  const locked=['SUBMITTED','GRADED'].includes(m.status);
  $('#dialog-kicker').textContent=`MISSION ${String(m.number).padStart(2,'0')}`;
  const titleInput=$('#dialog-title-input'),descInput=$('#dialog-description-input');
  titleInput.value=m.title||'';titleInput.disabled=locked;
  descInput.value=m.description||'';descInput.disabled=locked;
  const ghBits=[];
  if(m.pdfFile?.htmlUrl||m.pdfFile?.rawUrl)ghBits.push(`<a href="${m.pdfFile.htmlUrl||m.pdfFile.rawUrl}" target="_blank" rel="noopener">REPORT ON GITHUB ↗</a>`);
  if(m.htmlFile?.htmlUrl||m.htmlFile?.rawUrl)ghBits.push(`<a href="${m.htmlFile.htmlUrl||m.htmlFile.rawUrl}" target="_blank" rel="noopener">LIVE ON GITHUB ↗</a>`);
  $('#dialog-meta').innerHTML=`<span>STATUS // ${m.status}</span><span>PACKAGE // ${hasDualPackage(m)?'BOTH FILES READY':'INCOMPLETE'}</span>${ghBits.join('')}`;
  renderDialogPackage(m);
  if(m.mark!=null){$('#dialog-grade').innerHTML=`<span id="dialog-grade-num">0</span><span style="font-size:.38em;opacity:.6">/${m.maxMark}</span>`;animateCountUp($('#dialog-grade-num'),m.mark,{duration:700})}else{$('#dialog-grade').textContent='—'}
  $('#dialog-feedback').textContent=m.feedback||m.resubmissionNote||'No lecturer feedback yet.';
  $('#dialog-versions').innerHTML=m.versions.slice().reverse().map((v,i)=>`<div class="version-item">VERSION ${m.versions.length-i} · ${fmtDate(v.at)} · pushed to GitHub</div>`).join('');
  $('#mission-pdf-file').disabled=locked;$('#mission-html-file').disabled=locked;$('#mission-save').disabled=locked;
  $('#mission-submit').disabled=locked||!hasDualPackage(m);
  $('#mission-submit').classList.toggle('mission-submit-locked',$('#mission-submit').disabled);
  openDlg('#mission-dialog');
  setTimeout(()=>{if(!locked)titleInput.focus()},80);
}
function renderDialogPackage(m=state.students[activeStudent].missions[activeMission-1]){const pdf=pendingPackage.pdfFile,html=pendingPackage.htmlFile;$('#pdf-slot').classList.toggle('ready',!!pdf);$('#html-slot').classList.toggle('ready',!!html);$('#pdf-slot-file').textContent=pdf?`${pdf.name} · ${(pdf.size/1024).toFixed(0)} KB`:'NO FILE SELECTED';$('#html-slot-file').textContent=html?`${html.name} · ${(html.size/1024).toFixed(0)} KB`:'NO FILE SELECTED';$('#dialog-package-actions').innerHTML=hasDualPackage({pdfFile:pdf,htmlFile:html})?`<button type="button" data-preview-kind="pdf" data-preview-sid="${activeStudent}" data-preview-mission="${activeMission}">VIEW PDF</button><button type="button" data-preview-kind="html" data-preview-sid="${activeStudent}" data-preview-mission="${activeMission}">VIEW LIVE</button>`:'';const canSubmit=!!(pdf&&html)&&!['SUBMITTED','GRADED'].includes(m.status);$('#mission-submit').disabled=!canSubmit;$('#mission-submit').classList.toggle('mission-submit-locked',!canSubmit)}
async function savePendingPackage(){try{await persistPendingPackage();renderStudent();toast('Draft saved.');openMission(activeMission)}catch(e){toast('Unable to save draft. '+e.message)}}
function deleteCurrentMission(){
  const s=state.students[activeStudent],m=s.missions[activeMission-1];
  const label=m?.title?`"${m.title}"`:`mission ${activeMission}`;
  if(!confirm(`Delete ${label}? This removes it from JOBVERSE permanently. Note: if this was already pushed to GitHub, the file will stay in your repo unless you delete it there too.`))return;
  try{
    state.students[activeStudent]=deleteMission(s,activeMission);
    saveState();
    closeDlg('#mission-dialog');
    renderStudent();
    toast('Submission deleted.');
    beep(260,.08);
  }catch(e){toast(e.message)}
}
async function submitCurrentMission(bx,by){
  const btn=$('#mission-submit');
  try{
    if(!githubConfigured()){closeDlg('#mission-dialog');openGithubSetup();toast('Connect GitHub first, then submit again.');return}
    await persistPendingPackage();
    const s0=state.students[activeStudent],m0=s0.missions[activeMission-1];
    if(!hasDualPackage(m0))throw new Error('Both files are required before submission.');
    if(btn){btn.disabled=true;btn.textContent='PUSHING TO GITHUB…'}
    let pdfMeta=m0.pdfFile,htmlMeta=m0.htmlFile;
    if(pendingBlobs.pdf){
      const r=await githubPutFile(submissionGithubPath(s0,m0,pendingBlobs.pdf,'report'),pendingBlobs.pdf,`Add report for ${m0.title}`);
      pdfMeta={...packageMeta(pendingBlobs.pdf,pdfMeta?.key),...r};
    }else if(pdfMeta&&!pdfMeta.rawUrl&&pdfMeta.key){
      const blob=await getSubmissionBlob(pdfMeta.key);
      if(blob){const f=new File([blob],pdfMeta.name,{type:pdfMeta.type});const r=await githubPutFile(submissionGithubPath(s0,m0,f,'report'),f,`Add report for ${m0.title}`);pdfMeta={...pdfMeta,...r}}
    }
    if(pendingBlobs.html){
      const r=await githubPutFile(submissionGithubPath(s0,m0,pendingBlobs.html,'live'),pendingBlobs.html,`Add live file for ${m0.title}`);
      htmlMeta={...packageMeta(pendingBlobs.html,htmlMeta?.key),...r};
    }else if(htmlMeta&&!htmlMeta.liveUrl&&htmlMeta.key){
      const blob=await getSubmissionBlob(htmlMeta.key);
      if(blob){const f=new File([blob],htmlMeta.name,{type:htmlMeta.type});const r=await githubPutFile(submissionGithubPath(s0,m0,f,'live'),f,`Add live file for ${m0.title}`);htmlMeta={...htmlMeta,...r}}
    }
    state.students[activeStudent]=setSubmissionPackage(state.students[activeStudent],activeMission,{pdfFile:pdfMeta,htmlFile:htmlMeta});
    state.students[activeStudent]=submitMission(state.students[activeStudent],activeMission);
    saveState();
    pushMissionMeta(activeStudent,state.students[activeStudent].missions[activeMission-1]);
    spawnSubmitBurst(bx||innerWidth/2,by||innerHeight/2);
    renderStudent();closeDlg('#mission-dialog');
    toast('Pushed to GitHub and submitted for review.');beep(620,.09);
    checkMilestone(state.students[activeStudent]);
  }catch(e){
    toast('Submit failed: '+e.message);
  }finally{
    if(btn){btn.disabled=false;btn.textContent='SUBMIT & PUSH TO GITHUB ↗'}
  }
}

function lecturerStats(){const a=state.students.s1,b=state.students.s2,all=[...a.missions,...b.missions];return {total:all.length,submitted:all.filter(m=>m.status==='SUBMITTED').length,graded:all.filter(m=>m.status==='GRADED').length,resub:all.filter(m=>m.status==='RESUBMISSION REQUIRED').length,open:all.filter(m=>m.status==='OPEN').length}}
function renderLecturer(tab='overview'){const st=lecturerStats();$$('.lecturer-sidebar nav button').forEach(b=>b.classList.toggle('active',b.dataset.lecturerTab===tab));const w=$('#lecturer-workspace');if(tab==='overview'){w.innerHTML=`<div class="lecturer-stats"><div class="lecturer-stat"><b id="lstat-total">0</b><span>TOTAL MISSIONS</span></div><div class="lecturer-stat"><b id="lstat-pending">0</b><span>PENDING REVIEW</span></div><div class="lecturer-stat"><b id="lstat-graded">0</b><span>GRADED</span></div><div class="lecturer-stat"><b id="lstat-resub">0</b><span>RESUBMISSION</span></div><div class="lecturer-stat"><b id="lstat-open">0</b><span>OPEN</span></div></div>${lecturerMarkingLayout()}`;[['lstat-total',st.total],['lstat-pending',st.submitted],['lstat-graded',st.graded],['lstat-resub',st.resub],['lstat-open',st.open]].forEach(([id,val],i)=>{const el=$('#'+id);if(el)setTimeout(()=>animateCountUp(el,val,{duration:650}),i*60)});markOldestPending($$('.queue-row'),state.students[$('#lecturer-student-select')?.value||'s1'].missions.filter(m=>['SUBMITTED','RESUBMISSION REQUIRED'].includes(m.status)))}else if(tab==='queue'){w.innerHTML=lecturerMarkingLayout();markOldestPending($$('.queue-row'),state.students[$('#lecturer-student-select')?.value||'s1'].missions.filter(m=>['SUBMITTED','RESUBMISSION REQUIRED'].includes(m.status)))}else{const c1=counts(state.students.s1),c2=counts(state.students.s2),t1=state.students.s1.missions.length,t2=state.students.s2.missions.length;w.innerHTML=`<section class="student-compare"><span class="kicker">STUDENT COMPARISON</span><div class="compare-grid"><article class="compare-card"><h3>AIMAN</h3><p>AIMAN</p><b>${c1.complete}/${t1||0}</b><span>COMPLETE · ${weightedGrade(state.students.s1)}% GRADE</span><div class="compare-bar" id="compare-bar-s1"><span></span></div></article><article class="compare-card"><h3>HAZIQ</h3><p>HAZIQ</p><b>${c2.complete}/${t2||0}</b><span>COMPLETE · ${weightedGrade(state.students.s2)}% GRADE</span><div class="compare-bar" id="compare-bar-s2"><span></span></div></article></div></section>`;animateCompareBar('#compare-bar-s1 span',t1?Math.round(c1.complete/t1*100):0);animateCompareBar('#compare-bar-s2 span',t2?Math.round(c2.complete/t2*100):0)}}
function lecturerMarkingLayout(){const sid=$('#lecturer-student-select')?.value||'s1',s=state.students[sid],queue=s.missions.filter(m=>['SUBMITTED','RESUBMISSION REQUIRED'].includes(m.status));const selected=queue[0]||s.missions.find(m=>m.status==='GRADED')||s.missions[s.missions.length-1]||null;return `<section class="lecturer-grid"><div class="queue-panel"><div class="panel-heading" style="padding:18px"><span>MARKING QUEUE · ${s.name.toUpperCase()}</span></div>${queue.length?queue.map((m,i)=>`<button type="button" class="queue-row ${i===0?'active':''}" data-mark-mission="${m.number}"><b>${String(m.number).padStart(2,'0')}</b><span>${m.title}</span><span class="status ${m.status.toLowerCase().replaceAll(' ','-')}">${m.status}</span></button>`).join(''):'<p style="padding:20px;color:#8d877c">No pending submissions.</p>'}</div><div id="mark-card-wrap">${markCard(sid,selected)}</div></section>`}
function markCard(sid,m){if(!m)return `<div class="mark-card"><span class="kicker">NO SUBMISSIONS</span><h2>Nothing to mark yet</h2><p style="color:#8f897f">This student has not created any submissions yet. Once they add one from their dashboard, it will appear here for review.</p></div>`;return `<form class="mark-card" id="mark-form" data-sid="${sid}" data-mission="${m.number}"><span class="kicker">MISSION ${String(m.number).padStart(2,'0')}</span><h2>${m.title}</h2><p style="color:#8f897f">${m.description}</p>${hasDualPackage(m)?`<div class="submission-package-card"><span>SUBMISSION PACKAGE</span><div class="submission-package-files"><div>PDF // ${m.pdfFile.name}</div><div>LIVE // ${m.htmlFile.name}</div></div><div class="lecturer-preview-actions"><button type="button" data-preview-kind="pdf" data-preview-sid="${sid}" data-preview-mission="${m.number}">VIEW PDF</button><button type="button" data-preview-kind="html" data-preview-sid="${sid}" data-preview-mission="${m.number}">VIEW LIVE</button></div></div>`:`<p class="package-hint">NO PDF + HTML PACKAGE SUBMITTED</p>`}<label>MARK<input id="mark-value" type="number" min="0" max="100" value="${m.mark??''}" placeholder="0–100"></label><label>FEEDBACK<textarea id="mark-feedback" placeholder="Write lecturer feedback…">${m.feedback||m.resubmissionNote||''}</textarea></label><div class="mark-actions"><button class="primary-button" type="submit" ${m.status!=='SUBMITTED'?'disabled':''}>SAVE GRADE</button><button class="outline-button" id="request-resub" type="button" ${!['SUBMITTED','GRADED'].includes(m.status)?'disabled':''}>REQUEST RESUBMISSION</button></div></form>`}
function showMarkMission(number){const sid=$('#lecturer-student-select').value,s=state.students[sid],m=s.missions[Number(number)-1];$('#mark-card-wrap').innerHTML=markCard(sid,m);$$('.queue-row').forEach(r=>r.classList.toggle('active',Number(r.dataset.markMission)===Number(number)))}
function saveGrade(form){const sid=form.dataset.sid,n=Number(form.dataset.mission),mark=Number($('#mark-value').value),feedback=$('#mark-feedback').value.trim();if(!Number.isFinite(mark)||mark<0||mark>100){toast('Enter a mark between 0 and 100.');return}state.students[sid]=gradeMission(state.students[sid],n,mark,100,feedback);saveState();pushMissionMeta(sid,state.students[sid].missions[n-1]);revealGradeSaved(form,mark,()=>{renderLecturer('queue');toast('Grade and feedback saved.')})}
function revealGradeSaved(form,mark,done){const card=form.closest('.mark-card')||form;const overlay=document.createElement('div');overlay.className='grade-reveal-overlay';overlay.innerHTML=`<span class="kicker">GRADE SAVED</span><b id="grade-reveal-num">0</b><small>/100</small>`;card.appendChild(overlay);beep(560,.07);requestAnimationFrame(()=>{overlay.classList.add('show');animateCountUp($('#grade-reveal-num'),mark,{duration:750})});setTimeout(()=>{overlay.classList.remove('show');beep(680,.09);setTimeout(()=>{overlay.remove();done?.()},reduceMotion()?0:280)},reduceMotion()?250:1080)}
function resubmission(form){const sid=form.dataset.sid,n=Number(form.dataset.mission),note=$('#mark-feedback').value.trim()||'Please revise and submit again.';state.students[sid]=requestResubmission(state.students[sid],n,note);saveState();pushMissionMeta(sid,state.students[sid].missions[n-1]);renderLecturer('queue');toast('Resubmission requested.')}

/* ===== Round 2 additions ===== */
function spawnSubmitBurst(x,y){
  if(reduceMotion())return;
  const n=10;
  for(let i=0;i<n;i++){
    const s=document.createElement('i');s.className='submit-spark';
    const ang=(Math.PI*2*i)/n+Math.random()*.4, dist=40+Math.random()*46;
    s.style.left=x+'px';s.style.top=y+'px';
    s.style.setProperty('--sx',(Math.cos(ang)*dist).toFixed(1)+'px');
    s.style.setProperty('--sy',(Math.sin(ang)*dist).toFixed(1)+'px');
    document.body.appendChild(s);
    setTimeout(()=>s.remove(),750);
  }
}
function checkMilestone(student){
  const c=counts(student);
  if(MILESTONE_STEPS.includes(c.complete)){
    setTimeout(()=>{toast(c.complete===24?'🏁 All 24 missions complete!':`🎉 ${c.complete} missions complete!`);beep(760,.1)},650);
  }
}
let planet3D=null;
function makePlanetTexture(kind){
  const c=document.createElement('canvas');c.width=1024;c.height=512;
  const ctx=c.getContext('2d');
  const grad=ctx.createLinearGradient(0,0,0,512);
  if(kind==='saturn'){
    grad.addColorStop(0,'#f6ecd2');grad.addColorStop(.14,'#eeddb5');grad.addColorStop(.26,'#e3cc9c');
    grad.addColorStop(.38,'#d8bb84');grad.addColorStop(.5,'#ecd7a4');grad.addColorStop(.62,'#d6b47c');
    grad.addColorStop(.76,'#f0dfae');grad.addColorStop(.88,'#e0c890');grad.addColorStop(1,'#dcc491');
  }else{
    grad.addColorStop(0,'#6a9ce8');grad.addColorStop(.14,'#5a90dd');grad.addColorStop(.26,'#4a7fd0');
    grad.addColorStop(.38,'#3d6fc0');grad.addColorStop(.5,'#5286d8');grad.addColorStop(.62,'#3a63b6');
    grad.addColorStop(.76,'#5d94e0');grad.addColorStop(.88,'#3f6fc4');grad.addColorStop(1,'#375ea8');
  }
  ctx.fillStyle=grad;ctx.fillRect(0,0,1024,512);
  ctx.globalAlpha=.14;
  for(let i=0;i<7;i++){
    ctx.fillStyle=i%2===0?'rgba(255,255,255,.5)':'rgba(0,0,0,.4)';
    const y=40+i*66,h=18+Math.random()*10;
    ctx.beginPath();
    ctx.ellipse(512,y,560,h,0,0,Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha=1;
  if(kind==='neptune'){
    ctx.save();
    ctx.translate(330,300);
    ctx.scale(1.5,1);
    const spot=ctx.createRadialGradient(0,0,0,0,0,46);
    spot.addColorStop(0,'rgba(8,16,42,.65)');spot.addColorStop(1,'rgba(8,16,42,0)');
    ctx.fillStyle=spot;
    ctx.beginPath();ctx.arc(0,0,46,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  const tex=new THREE.CanvasTexture(c);
  tex.needsUpdate=true;
  return tex;
}
function makeRingTexture(kind){
  const c=document.createElement('canvas');c.width=512;c.height=8;
  const ctx=c.getContext('2d');
  const g=ctx.createLinearGradient(0,0,512,0);
  if(kind==='saturn'){
    g.addColorStop(0,'rgba(226,196,140,0)');g.addColorStop(.08,'rgba(214,182,122,.75)');
    g.addColorStop(.2,'rgba(176,144,88,.55)');g.addColorStop(.36,'rgba(238,216,168,.9)');
    g.addColorStop(.5,'rgba(146,114,66,.6)');g.addColorStop(.64,'rgba(238,216,168,.9)');
    g.addColorStop(.8,'rgba(176,144,88,.55)');g.addColorStop(.92,'rgba(214,182,122,.75)');
    g.addColorStop(1,'rgba(226,196,140,0)');
  }else{
    g.addColorStop(0,'rgba(190,208,235,0)');g.addColorStop(.08,'rgba(190,208,235,.5)');
    g.addColorStop(.22,'rgba(190,208,235,0)');g.addColorStop(.26,'rgba(150,172,208,.35)');
    g.addColorStop(.46,'rgba(190,208,235,0)');g.addColorStop(.5,'rgba(190,208,235,.6)');
    g.addColorStop(.7,'rgba(190,208,235,0)');g.addColorStop(.74,'rgba(150,172,208,.35)');
    g.addColorStop(.92,'rgba(190,208,235,.5)');g.addColorStop(1,'rgba(190,208,235,0)');
  }
  ctx.fillStyle=g;ctx.fillRect(0,0,512,8);
  const tex=new THREE.CanvasTexture(c);
  tex.needsUpdate=true;
  return tex;
}
function initPlanet3D(){
  const canvas=document.getElementById('planet-canvas');
  if(!canvas||typeof THREE==='undefined')return;
  try{
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2.5));
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(36,1,.1,100);
  camera.position.set(0,0,9.5);
  scene.add(new THREE.AmbientLight(0xffffff,.42));
  const dir=new THREE.DirectionalLight(0xffffff,1.25);
  dir.position.set(-3.4,2.4,4);
  scene.add(dir);
  const sphereGeo=new THREE.SphereGeometry(1.55,72,72);
  const material=new THREE.MeshPhongMaterial({shininess:6,specular:0x333333});
  const sphere=new THREE.Mesh(sphereGeo,material);
  scene.add(sphere);
  let ringMesh=null;
  function setRing(kind){
    if(ringMesh){scene.remove(ringMesh);ringMesh.geometry.dispose();ringMesh.material.dispose();ringMesh=null}
    const inner=kind==='saturn'?1.75:1.7,outer=kind==='saturn'?2.6:2.3;
    const geo=new THREE.RingGeometry(inner,outer,96);
    const pos=geo.attributes.position,uv=geo.attributes.uv;
    const v=new THREE.Vector3();
    for(let i=0;i<pos.count;i++){
      v.fromBufferAttribute(pos,i);
      const r=v.length();
      uv.setXY(i,(r-inner)/(outer-inner),0.5);
    }
    const mat=new THREE.MeshBasicMaterial({map:makeRingTexture(kind),side:THREE.DoubleSide,transparent:true});
    ringMesh=new THREE.Mesh(geo,mat);
    ringMesh.rotation.x=Math.PI/2-.36;
    ringMesh.rotation.z=.08;
    scene.add(ringMesh);
  }
  function applyStudent(sid){
    const kind=sid==='s1'?'saturn':'neptune';
    material.map=makePlanetTexture(kind);
    material.needsUpdate=true;
    setRing(kind);
  }
  function resize(){
    const rect=canvas.getBoundingClientRect();
    const size=Math.max(Math.round(rect.width),Math.round(rect.height))||220;
    renderer.setSize(size,size,false);
    camera.aspect=1;camera.updateProjectionMatrix();
  }
  window.addEventListener('resize',resize);
  resize();
  let spin=!reduceMotion();
  function animate(){
    requestAnimationFrame(animate);
    if(spin){sphere.rotation.y+=0.0035;if(ringMesh)ringMesh.rotation.y+=0.0006}
    renderer.render(scene,camera);
  }
  animate();
  planet3D={applyStudent};
  applyStudent(activeStudent);
  }catch(e){console.warn('3D planet unavailable:',e.message)}
}
function initSunEasterEgg(){
  const sun=$('#hero-sun'); if(!sun)return;
  sun.addEventListener('click',()=>{
    const now=Date.now();
    sunClickTimes=sunClickTimes.filter(t=>now-t<1200);
    sunClickTimes.push(now);
    if(sunClickTimes.length>=3){
      sunClickTimes=[];
      const scene=sun.closest('.solar-scene');
      if(!scene||reduceMotion())return;
      scene.classList.add('supernova');
      beep(880,.14);setTimeout(()=>beep(220,.2),120);
      setTimeout(()=>scene.classList.remove('supernova'),950);
    }
  });
}
function initHeroParallax(){
  const scene=document.querySelector('.solar-scene'); if(!scene)return;
  if(reduceMotion()||!window.matchMedia?.('(hover:hover) and (pointer:fine)').matches)return;
  const band=scene.closest('.solar-intro-section'); if(!band)return;
  band.addEventListener('pointermove',e=>{
    const r=band.getBoundingClientRect();
    const px=(e.clientX-r.left)/r.width-.5, py=(e.clientY-r.top)/r.height-.5;
    scene.style.transform=`translate3d(${(px*16).toFixed(1)}px,${(py*12).toFixed(1)}px,0)`;
  });
  band.addEventListener('pointerleave',()=>{scene.style.transform=''});
}
function initBootSplash(){
  const el=$('#boot-splash'); if(!el)return;
  if(reduceMotion()){el.remove();return}
  const dismiss=()=>{if(el.classList.contains('hide'))return;el.classList.add('hide');setTimeout(()=>el.remove(),650)};
  setTimeout(dismiss,1900);
  ['click','keydown','touchstart','wheel'].forEach(ev=>window.addEventListener(ev,dismiss,{once:true,passive:true}));
}
function animateCompareBar(sel,pct){
  const bar=document.querySelector(sel); if(!bar)return;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{bar.style.width=pct+'%'}));
}
function markOldestPending(rows,queue){
  const withDates=queue.filter(m=>m.submittedAt);
  if(!withDates.length)return;
  const oldest=withDates.slice().sort((a,b)=>new Date(a.submittedAt)-new Date(b.submittedAt))[0];
  const row=rows.find(r=>Number(r.dataset.markMission)===oldest.number);
  row?.classList.add('priority');
}
function attachDropZone(labelEl,inputEl,onFile){
  if(!labelEl||!inputEl)return;
  ['dragenter','dragover'].forEach(ev=>labelEl.addEventListener(ev,e=>{e.preventDefault();e.stopPropagation();labelEl.classList.add('dragover')}));
  ['dragleave','dragend','drop'].forEach(ev=>labelEl.addEventListener(ev,e=>{e.preventDefault();e.stopPropagation();labelEl.classList.remove('dragover')}));
  labelEl.addEventListener('drop',e=>{const f=e.dataTransfer?.files?.[0];if(f)onFile(f)});
}
function acceptPdfFile(f){if(!f)return;if(!(f.type==='application/pdf'||/\.pdf$/i.test(f.name))){toast('PDF slot only accepts .pdf files.');return}pendingBlobs.pdf=f;pendingPackage.pdfFile=packageMeta(f,'pending');renderDialogPackage();beep(500,.05)}
function acceptHtmlFile(f){if(!f)return;if(!(/\.html?$/i.test(f.name)||f.type==='text/html')){toast('LIVE slot only accepts .html or .htm files.');return}pendingBlobs.html=f;pendingPackage.htmlFile=packageMeta(f,'pending');renderDialogPackage();beep(520,.05)}

function bind(){
  const goHomeWarp=(evt)=>{const x=evt?.clientX||innerWidth/2,y=evt?.clientY||innerHeight/2;if(reduceMotion()){showView('home');return}startPortalCameraTransition('home',x,y,()=>showView('home'))};
  $('#brand-home').onclick=goHomeWarp;$$('[data-route-home]').forEach(b=>b.onclick=goHomeWarp);$$('[data-home-anchor]').forEach(b=>b.onclick=()=>{showView('home');setTimeout(()=>document.getElementById(b.dataset.homeAnchor)?.scrollIntoView({behavior:'smooth'}),20)});$$('[data-enter-student]').forEach(b=>b.onclick=e=>enterStudent(b.dataset.enterStudent,e));const goAbout=()=>{showView('home');setTimeout(()=>document.getElementById('about')?.scrollIntoView({behavior:'smooth'}),20)};$('#nav-about').onclick=goAbout;$('#footer-about').onclick=goAbout;$('#sound-toggle').onclick=()=>{soundOn=!soundOn;$('#sound-toggle').textContent=soundOn?'SOUND ON':'SOUND OFF';$('#sound-toggle').setAttribute('aria-pressed',String(soundOn));beep(540,.07);if(soundOn){startAmbientHum();const bg=document.getElementById('bg-music');if(bg){bg.volume=0.18;bg.currentTime=0;bg.play().catch(()=>{});clearTimeout(window._bgMusicLimit);window._bgMusicLimit=setTimeout(()=>{bg.pause()},BG_MUSIC_LIMIT_SECONDS*1000)}}else{stopAmbientHum();const bg=document.getElementById('bg-music');if(bg)bg.pause();clearTimeout(window._bgMusicLimit)}};
  $('#nav-lecturer').onclick=openLecturerLogin;$('#lecturer-login-close').onclick=()=>closeDlg('#lecturer-login');$('#lecturer-login-submit').onclick=submitLecturerLogin;$('#lecturer-passcode').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();submitLecturerLogin()}});$('#github-setup-close').onclick=()=>closeDlg('#github-setup');$('#github-setup-save').onclick=saveGithubSetupFromForm;$('#github-sync-btn').onclick=syncFromGithub;$('#github-setup-btn').onclick=openGithubSetup;$('#new-submission-btn').onclick=openNewSubmission;$('#quick-github-setup').onclick=openGithubSetup;
  initCursorLight();initClickSound();initMagneticButtons();initCustomSelects();
  document.addEventListener('click',e=>{const preview=e.target.closest('[data-preview-kind]');if(preview){e.stopPropagation();previewSubmission(preview.dataset.previewSid,preview.dataset.previewMission,preview.dataset.previewKind);return}const open=e.target.closest('[data-open-mission]');if(open){openMission(open.dataset.openMission);return}const feed=e.target.closest('[data-feed-student]');if(feed){const sid=feed.dataset.feedStudent,num=Number(feed.dataset.feedMission);enterStudent(sid,e);setTimeout(()=>openMission(num),500);return}const mark=e.target.closest('[data-mark-mission]');if(mark){showMarkMission(mark.dataset.markMission)}if(e.target.id==='dashboard-new-submission'){openNewSubmission()}});
  $$('.student-nav [data-student-section], [data-student-section]').forEach(b=>b.onclick=()=>showStudentSection(b.dataset.studentSection));$('#student-search').oninput=renderMissionList;$('#student-filter').onchange=renderMissionList;$('#mission-close').onclick=()=>closeDlg('#mission-dialog');$('#mission-dialog').addEventListener('close',cleanupEmptyDraft);$('#preview-close').onclick=closeSubmissionPreview;$('#submission-preview').addEventListener('close',closeSubmissionPreview);$('#mission-pdf-file').onchange=e=>{const f=e.target.files?.[0];acceptPdfFile(f);if(!f)e.target.value=''};$('#mission-html-file').onchange=e=>{const f=e.target.files?.[0];acceptHtmlFile(f);if(!f)e.target.value=''};attachDropZone($('#pdf-slot'),$('#mission-pdf-file'),acceptPdfFile);attachDropZone($('#html-slot'),$('#mission-html-file'),acceptHtmlFile);$('#mission-save').onclick=savePendingPackage;$('#mission-delete').onclick=deleteCurrentMission;$('#mission-submit').onclick=e=>{const r=e.currentTarget.getBoundingClientRect();submitCurrentMission(r.left+r.width/2,r.top+r.height/2)};
  $$('[data-lecturer-tab]').forEach(b=>b.onclick=()=>renderLecturer(b.dataset.lecturerTab));const lecturerSelect=$('#lecturer-student-select');if(lecturerSelect)lecturerSelect.onchange=()=>renderLecturer('queue');window.jobverseReset=()=>{state=makeDemoState();saveState();renderStudent();renderHome();toast('Demo data reset.');console.log('JOBVERSE demo data reset to blank state.')};document.addEventListener('submit',e=>{if(e.target.id==='mark-form'){e.preventDefault();saveGrade(e.target)}});document.addEventListener('click',e=>{if(e.target.id==='request-resub'){e.preventDefault();const form=e.target.closest('#mark-form');resubmission(form)}})
}

/* ===== Cinematic scroll choreography ===== */
const PROTOCOL_STEPS=[
  ['01','SELECT','Choose your mission.'],
  ['02','OPEN','Read the brief and requirements.'],
  ['03','UPLOAD','Complete your work and add the required files.'],
  ['04','SUBMIT','Commit the mission package for review.'],
  ['05','REVIEW','Review evidence, quality and structure.'],
  ['06','GRADE','Receive marks, feedback and your next action.']
];
let cinematicRAF=0, smoothY=window.scrollY||0, targetY=window.scrollY||0, protocolIndex=0;
const reduceMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const clamp01=n=>Math.max(0,Math.min(1,n));
function sectionProgress(el,visualY=smoothY){
  if(!el)return 0;
  const top=el.offsetTop, travel=Math.max(1,el.offsetHeight-innerHeight);
  return clamp01((visualY-top)/travel);
}
function updateHeroChoreography(p){
  const root=document.documentElement;
  root.style.setProperty('--hero-progress',p.toFixed(4));
  const job=$('.hero-job'), verse=$('.hero-verse'), band=$('.hero-band-mask'), copy=$('.hero-copy'), stats=$('.hero-stats'), grid=$('.hero-grid'), cue=$('.scroll-indicator');
  if(grid)grid.style.transform=`translate3d(${-p*34}px,${-p*28}px,0)`;
  if(job)job.style.transform=`translate3d(${-p*54}px,0,0) scale(${1-p*.08})`;
  if(verse){verse.style.transform=`translate3d(${(1-p)*76}px,${(1-p)*24}px,0) scale(${.92+p*.08})`;verse.style.opacity=String(.42+p*.58)}
  if(band){const cut=(1-p)*10;band.style.clipPath=`inset(${cut}% ${cut*1.1}% 0 0)`;band.style.transform=`translate3d(0,${(p-.5)*12}px,0) scale(${.945+p*.055})`;band.style.filter=`saturate(${.78+p*.22}) brightness(${.78+p*.14})`}
  if(copy)copy.style.opacity=String(Math.max(.25,1-p*.7));
  if(stats)stats.style.transform=`translate3d(${p*28}px,0,0)`;
  if(cue){cue.style.opacity=String(Math.max(0,1-p*1.55));cue.style.transform=`translateY(${p*14}px)`}
}
function updateMissionChoreography(p){
  document.documentElement.style.setProperty('--missions-progress',p.toFixed(4));
  const nodes=$$('#home-mission-grid button');
  nodes.forEach((node,i)=>{
    const start=i/58*.76, local=clamp01((p-start)/.18);
    node.style.setProperty('--node-reveal',local.toFixed(3));
    node.style.opacity=String(.06+local*.94);
    node.style.transform=`translate3d(0,${(1-local)*22}px,0) scale(${.92+local*.08})`;
    node.style.filter=`blur(${(1-local)*2.7}px)`;
  });
}
function setProtocolStep(index,phase=1){
  protocolIndex=Math.max(0,Math.min(PROTOCOL_STEPS.length-1,index));
  const [num,title,note]=PROTOCOL_STEPS[protocolIndex];
  const word=$('#protocol-focus-word'), desc=$('#protocol-focus-note'), counter=$('#protocol-counter');
  if(word)word.textContent=title;
  if(desc)desc.textContent=note;
  if(counter)counter.textContent=`STEP ${num} / 06`;
  $$('#protocol-steps .protocol-card').forEach((el,i)=>el.classList.toggle('active',i===protocolIndex));
  const edge=Math.abs(phase-.5)*2;
  if(word){word.style.opacity=String(Math.max(.22,1-edge*.7));word.style.transform=`translate3d(0,${(phase-.5)*-28}px,0) scale(${.96+(1-edge)*.04})`}
  if(desc)desc.style.opacity=String(Math.max(.28,1-edge*.55));
}
function updateProtocolChoreography(p){
  document.documentElement.style.setProperty('--protocol-progress',p.toFixed(4));
  const exact=p*(PROTOCOL_STEPS.length-.0001), idx=Math.min(5,Math.floor(exact)), phase=exact-idx;
  setProtocolStep(idx,phase);
}
function updateDimensionChoreography(p){
  document.documentElement.style.setProperty('--dimensions-progress',p.toFixed(4));
  $$('.dimension-card').forEach((card,i)=>{
    const local=clamp01((p-i*.06)/.36);
    card.style.opacity=String(.2+local*.8);
    card.style.transform=`translate3d(0,${(1-local)*42}px,0) scale(${.975+local*.025})`;
  });
}
function initDimensionBias(){
  const wrap=$('.dimension-cards'); if(!wrap)return;
  const apply=x=>{const r=wrap.getBoundingClientRect(),t=clamp01((x-r.left)/Math.max(1,r.width));const delta=(.5-t)*18;wrap.style.gridTemplateColumns=`${50+delta}% ${50-delta}%`;wrap.dataset.focus=t<.5?'s1':'s2'};
  wrap.addEventListener('pointermove',e=>apply(e.clientX));
  wrap.addEventListener('pointerleave',()=>{wrap.style.gridTemplateColumns='1fr 1fr';delete wrap.dataset.focus});
}
function startPortalCameraTransition(id,x,y,onMid){
  const warp=$('#portal-warp'); if(!warp){onMid?.();return}
  warp.style.setProperty('--warp-x',`${x}px`);warp.style.setProperty('--warp-y',`${y}px`);warp.dataset.dimension=id;warp.classList.remove('active');void warp.offsetWidth;warp.classList.add('active');
  beep(id==='s1'?360:560,.11);
  setTimeout(()=>onMid?.(),520);
  setTimeout(()=>warp.classList.remove('active'),1180);
}
function scrollProtocolTo(index){
  const sec=$('#protocol'); if(!sec)return;
  const travel=Math.max(1,sec.offsetHeight-innerHeight), p=Math.max(0,Math.min(5,index))/5;
  window.scrollTo({top:sec.offsetTop+travel*p,behavior:'smooth'});
}
function initCinematicScroll(){
  if(reduceMotion()){updateHeroChoreography(1);updateMissionChoreography(1);updateProtocolChoreography(0);updateDimensionChoreography(1);return}
  targetY=window.scrollY||0;smoothY=targetY;
  let previous=smoothY;
  const tick=()=>{
    targetY=window.scrollY||0;
    smoothY+=(targetY-smoothY)*.105;
    const velocity=Math.max(-1,Math.min(1,(smoothY-previous)/45));previous=smoothY;
    document.documentElement.style.setProperty('--scroll-velocity',velocity.toFixed(3));
    updateHeroChoreography(sectionProgress($('#hero')));
    updateMissionChoreography(sectionProgress($('#missions')));
    updateProtocolChoreography(sectionProgress($('#protocol')));
    updateDimensionChoreography(sectionProgress($('#dimensions')));
    cinematicRAF=requestAnimationFrame(tick);
  };
  cancelAnimationFrame(cinematicRAF);cinematicRAF=requestAnimationFrame(tick);
  initDimensionBias();
  $('.protocol-arrow.prev')?.addEventListener('click',()=>scrollProtocolTo(protocolIndex-1));
  $('.protocol-arrow.next')?.addEventListener('click',()=>scrollProtocolTo(protocolIndex+1));
}

renderHome();bind();showView('home');initCinematicScroll();initBootSplash();initSunEasterEgg();initHeroParallax();initPlanet3D();
})(typeof window!=='undefined'?window:globalThis);
