
/* NONZERO v3.13 — fail-safe BikeErg Shortcut controller.
   Intentionally independent from the main application runtime. */
(function(){
  const CFG='nonzeroCloudV1', LINK='nz_simple_bikeerg_url';

  function esc(v){
    return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function status(html){
    const el=document.getElementById('simpleErgStatus');
    if(el) el.innerHTML=html;
  }
  async function sha256(v){
    if(!window.crypto || !window.crypto.subtle) throw new Error('Secure browser crypto is unavailable.');
    const b=new TextEncoder().encode(String(v));
    const d=await crypto.subtle.digest('SHA-256',b);
    return Array.from(new Uint8Array(d),x=>x.toString(16).padStart(2,'0')).join('');
  }
  function cfg(){
    let c={endpoint:'',syncKey:''};
    try{ c={...c,...JSON.parse(localStorage.getItem(CFG)||'{}')}; }catch(e){}
    const ep=document.getElementById('cloudEndpoint')?.value || c.endpoint || '';
    const sk=document.getElementById('syncKey')?.value || c.syncKey || '';
    c.endpoint=String(ep).trim().replace(/\/+$/,'');
    c.syncKey=String(sk).trim();
    try{ localStorage.setItem(CFG,JSON.stringify(c)); }catch(e){}
    return c;
  }
  function enableReady(link){
    try{localStorage.setItem(LINK,link)}catch(e){}
    const copy=document.getElementById('copyOpenShortcutsBtn');
    const test=document.getElementById('testSimpleErgBtn');
    const reset=document.getElementById('resetSimpleErgBtn');
    if(copy)copy.disabled=false;
    if(test)test.disabled=false;
    if(reset)reset.disabled=false;
    const btn=document.getElementById('createSimpleErgLinkBtn');
    if(btn){btn.disabled=false;btn.textContent='RECREATE MY SHORTCUT LINK';}
  }

  window.nzShortcutCreate = async function(ev){
    if(ev){ev.preventDefault();ev.stopPropagation();}
    const btn=document.getElementById('createSimpleErgLinkBtn');
    if(btn){btn.disabled=true;btn.textContent='CREATING…';}
    status('<b>Creating secure BikeErg link…</b>');
    try{
      const c=cfg();
      if(!/^https:\/\//i.test(c.endpoint)) throw new Error('Cloudflare Worker URL is missing in Cloud Sync.');
      if(c.syncKey.length<16) throw new Error('Private Cloud Sync key is missing.');
      const h=await sha256(c.syncKey);
      const link=c.endpoint+'/automation/bikeerg/direct/'+h;
      enableReady(link);
      status('<b>✓ SHORTCUT LINK READY.</b><br>Tap <b>COPY LINK + OPEN SHORTCUTS</b>.');
    }catch(e){
      if(btn){btn.disabled=false;btn.textContent='1 · CREATE MY SHORTCUT LINK';}
      status('<b>SETUP ERROR:</b> '+esc(e && e.message ? e.message : e));
    }
    return false;
  };

  window.nzShortcutCopyOpen = async function(ev){
    if(ev){ev.preventDefault();ev.stopPropagation();}
    const link=localStorage.getItem(LINK)||'';
    if(!link){status('<b>No link yet.</b> Tap CREATE MY SHORTCUT LINK first.');return false;}
    let copied=false;
    try{await navigator.clipboard.writeText(link);copied=true}catch(e){}
    if(!copied){
      try{
        const ta=document.createElement('textarea');
        ta.value=link; ta.setAttribute('readonly',''); ta.style.position='fixed';ta.style.opacity='0';
        document.body.appendChild(ta);ta.focus();ta.select();
        copied=document.execCommand('copy');ta.remove();
      }catch(e){}
    }
    status(copied
      ? '<b>✓ LINK COPIED.</b><br>Opening Shortcuts…'
      : '<b>LINK READY.</b><br>Copy this URL manually if iOS blocks clipboard:<br><textarea readonly style="width:100%;min-height:92px;margin-top:8px">'+esc(link)+'</textarea>');
    if(copied){ setTimeout(()=>{ location.href='shortcuts://'; },120); }
    return false;
  };

  window.nzShortcutReset = function(ev){
    if(ev){ev.preventDefault();ev.stopPropagation();}
    localStorage.removeItem(LINK);
    const btn=document.getElementById('createSimpleErgLinkBtn');
    if(btn){btn.disabled=false;btn.textContent='1 · CREATE MY SHORTCUT LINK';}
    const copy=document.getElementById('copyOpenShortcutsBtn');
    const test=document.getElementById('testSimpleErgBtn');
    const reset=document.getElementById('resetSimpleErgBtn');
    if(copy)copy.disabled=true;if(test)test.disabled=true;if(reset)reset.disabled=true;
    status('Not configured yet.');
    return false;
  };
})();

;

const PROGRAM = {
  0:{name:'Recovery',why:'Keep the habit while giving the hip a low-stress day.',type:'recovery',
    full:[['BikeErg','10–15 min very easy'],['Standing hip abduction','1–2 × 8 each side, small comfortable range'],['Band row','2 × 12'],['Breathing','2 min relaxed breathing']],
    minimum:[['BikeErg','5–10 min very easy'],['Upper-body band work','Easy rows/presses until 10:00']]},
  1:{name:'Strength A — Upper + Hinge',why:'Build strength without forcing deep hip flexion.',type:'strength',
    full:[['BikeErg warm-up','4 min easy'],['Elevated KB deadlift','53 lb — 3 × 8; elevate the bell enough to stay comfortable'],['Push-ups','3 × 8–12; stop 2–3 reps before failure'],['Supported 1-arm KB row','35 lb — 3 × 10 each side'],['Seated KB or band press','2–3 × 8 each side'],['Farmer carry','2 × 35 lb — 3 × 30 sec']],
    minimum:[['BikeErg','2 min easy'],['Elevated KB deadlift','53 lb — 2 × 8'],['Push-ups','2 × 8–12'],['Supported KB row','35 lb — 2 × 8 each side'],['BikeErg','Easy until 10:00']]},
  2:{name:'BikeErg — Aerobic',why:'Build cardiovascular fitness with minimal impact.',type:'bike',
    full:[['Easy spin','5 min'],['Steady aerobic ride','15–20 min conversational effort'],['Easy spin','5 min']],
    minimum:[['BikeErg','10 min continuous easy/moderate riding']]},
  3:{name:'Strength B — Prehab + Upper',why:'Maintain upper-body strength and train tolerable hip-supporting musculature.',type:'strength',
    full:[['BikeErg warm-up','4 min easy'],['High sit-to-stand','3 × 10; remain above painful depth'],['Pull-ups','3 × 2–3; no grinding'],['KB floor press','2 × 35 lb — 3 × 8–10'],['Standing mini-band hip abduction','2 × 10 each side, small range'],['Glute bridge','2 × 10 only if comfortable'],['Band Pallof press','2 × 10 each side']],
    minimum:[['BikeErg','2 min easy'],['High sit-to-stand','2 × 8'],['Pull-ups','2 × 2'],['KB floor press','2 × 35 lb — 2 × 8'],['Pallof press','2 × 8 each side']]},
  4:{name:'BikeErg — Aerobic',why:'Add aerobic volume without accumulating painful walking mileage.',type:'bike',
    full:[['Easy spin','5 min'],['Steady aerobic ride','20–25 min conversational effort'],['Easy spin','5 min']],
    minimum:[['BikeErg','10 min easy/moderate']]},
  5:{name:'Strength — Alternating',why:'Third weekly strength exposure while keeping total workload manageable.',type:'strength',
    full:[['BikeErg warm-up','4 min easy'],['Elevated KB deadlift','53 lb — 2 × 8'],['Push-ups','2 × 10–15'],['Pull-ups','2 × 2–3'],['KB floor press','2 × 35 lb — 2 × 8–10'],['Farmer carry','2 × 35 lb — 3 × 30 sec']],
    minimum:[['BikeErg','2 min easy'],['Push-ups','2 × 10'],['KB row','2 × 8 each side'],['Farmer carry','2 × 30 sec'],['BikeErg','Easy until 10:00']]},
  6:{name:'Long BikeErg',why:'Your main low-impact endurance builder.',type:'bike',
    full:[['Easy spin','5 min'],['Steady BikeErg','30–35 min conversational effort'],['Easy spin','5 min'],['Optional','Add 5 min only if hip and energy are good']],
    minimum:[['BikeErg','10 min easy/moderate. Long ride can wait.']]}
};

const FLARE = [
 ['BikeErg','5–10 min very easy ONLY if riding feels comfortable'],
 ['Upper body','Easy push-ups, band rows or floor press if desired'],
 ['Avoid today','Loaded lower-body work, long walks, deep flexion, anything increasing your limp'],
 ['Win condition','10 calm minutes and stop']
];

const STORAGE_KEY='hipPrehabV2';
const CLOUD_CONFIG_KEY='nonzeroCloudV1';
let state=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')||{
  startDate:new Date().toISOString().slice(0,10), sessions:[], reminderTime:'06:00', wallSchedule:{enabled:true,ambient:'06:00',night:'20:30',deep:'01:00'}, ergDataFirst:{enabled:true}, surgeryPlan:{date:'',label:'RIGHT HIP'}
};
if(!state._meta) state._meta={updatedAt:Date.now(),schema:8,revision:0};
if(!state.wallSchedule) state.wallSchedule={enabled:true,ambient:'06:00',night:'20:30',deep:'01:00'};
if(!state.ergDataFirst) state.ergDataFirst={enabled:true};
if(!state.surgeryPlan) state.surgeryPlan={date:'',label:'RIGHT HIP'};
let cloudConfig=JSON.parse(localStorage.getItem(CLOUD_CONFIG_KEY)||'null')||{endpoint:'',syncKey:''};
let mode='full';
let deferredPrompt=null;
let syncTimer=null;
let workoutTimerInterval=null;
let cloudRevision=Number(state?._meta?.revision||0);
let canonicalSyncInterval=null;
let cloudPushInFlight=false;

function save({sync=true}={}){
 state._meta={...(state._meta||{}),updatedAt:Date.now(),schema:8,revision:cloudRevision};
 localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
 if(sync) queueCloudPush();
}
function normalizeEndpoint(v){return String(v||'').trim().replace(/\/$/,'')}
function cloudReady(){return /^https:\/\//i.test(cloudConfig.endpoint||'') && String(cloudConfig.syncKey||'').length>=16}
function setSyncStatus(text,kind=''){
 const label=document.getElementById('syncStatus'),dot=document.getElementById('syncDot');
 if(label) label.textContent=text;
 if(dot) dot.className='syncdot '+kind;
}
function saveCloudConfig(){
 cloudConfig.endpoint=normalizeEndpoint(document.getElementById('cloudEndpoint')?.value||cloudConfig.endpoint);
 cloudConfig.syncKey=(document.getElementById('syncKey')?.value||cloudConfig.syncKey).trim();
 localStorage.setItem(CLOUD_CONFIG_KEY,JSON.stringify(cloudConfig));
 setSyncStatus(cloudReady()?'Cloud configured':'Local only',cloudReady()?'ok':'');
}
async function cloudRequest(method,body){
 if(!cloudReady()) return null;
 const res=await fetch(cloudConfig.endpoint+'/state',{
   method,headers:{'Content-Type':'application/json','X-NONZERO-Key':cloudConfig.syncKey},
   body:body?JSON.stringify(body):undefined,cache:'no-store'
 });
 let data=null;try{data=await res.json()}catch{}
 if(!res.ok){
   const err=new Error(data?.error||('Sync '+res.status));err.status=res.status;err.data=data;throw err;
 }
 return data;
}
function applyCanonicalState(payload,{render=true}={}){
 const remoteState=payload?.state;
 if(!remoteState)return false;
 state=remoteState;
 cloudRevision=Number(payload?.revision??state?._meta?.revision??cloudRevision??0);
 state._meta={...(state._meta||{}),schema:8,revision:cloudRevision,updatedAt:Number(payload?.updatedAt||state?._meta?.updatedAt||Date.now())};
 if(!state.wallSchedule)state.wallSchedule={enabled:true,ambient:'06:00',night:'20:30',deep:'01:00'};
 if(!state.ergDataFirst)state.ergDataFirst={enabled:true};
 if(!state.surgeryPlan)state.surgeryPlan={date:'',label:'RIGHT HIP'};
 localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
 if(render){
   renderToday();renderWeek();renderProgress();renderTimer();
   if(document.getElementById('startDate'))document.getElementById('startDate').value=state.startDate;
   if(document.getElementById('reminderTime'))document.getElementById('reminderTime').value=state.reminderTime||'06:00';
   if(document.getElementById('wallAmbientTime'))renderWallScheduleSettings();
   renderPreop();
 }
 return true;
}
function queueCloudPush(){
 if(!cloudReady())return;
 clearTimeout(syncTimer);
 syncTimer=setTimeout(()=>pushCloudState(),180);
}
async function pushCloudState({retry=true}={}){
 if(!cloudReady()||cloudPushInFlight)return false;
 cloudPushInFlight=true;
 const snapshot=JSON.parse(JSON.stringify(state));
 try{
   setSyncStatus('Syncing…','busy');
   const payload=await cloudRequest('PUT',{state:snapshot,baseRevision:cloudRevision});
   applyCanonicalState(payload,{render:false});
   setSyncStatus('Synced','ok');
   return true;
 }catch(err){
   if(err.status===409 && err.data?.current){
     const localAW=snapshot.activeWorkout,remotePayload=err.data.current,remoteAW=remotePayload?.state?.activeWorkout;
     applyCanonicalState(remotePayload,{render:false});
     const lp=Number(localAW?.progressUpdatedAt||0),rp=Number(remoteAW?.progressUpdatedAt||0);
     const ll=Number(localAW?.lapUpdatedAt||0),rl=Number(remoteAW?.lapUpdatedAt||0);
     if(localAW && (lp>rp || ll>rl)){
       state.activeWorkout={...(state.activeWorkout||{}),mode:lp>rp?localAW.mode:state.activeWorkout?.mode,checks:lp>rp?(localAW.checks||[]):(state.activeWorkout?.checks||[]),pain:lp>rp?localAW.pain:state.activeWorkout?.pain,energy:lp>rp?localAW.energy:state.activeWorkout?.energy,progressUpdatedAt:Math.max(lp,rp),laps:ll>rl?(localAW.laps||[]):(state.activeWorkout?.laps||[]),lapStartElapsedMs:ll>rl?Number(localAW.lapStartElapsedMs||0):Number(state.activeWorkout?.lapStartElapsedMs||0),lapUpdatedAt:Math.max(ll,rl),updatedAt:Math.max(Number(state.activeWorkout?.updatedAt||0),Number(localAW.updatedAt||0))};
       localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
       cloudPushInFlight=false;
       if(retry)return pushCloudState({retry:false});
     }
     setSyncStatus('Synced · cloud reconciled','ok');
     renderToday();renderWeek();renderProgress();renderTimer();
     return false;
   }
   console.warn(err);setSyncStatus('Offline · saved locally','err');return false;
 }finally{
   cloudPushInFlight=false;
 }
}
async function pullCloudState({force=false}={}){
 if(!cloudReady())return false;
 try{
   setSyncStatus('Checking cloud…','busy');
   const remote=await cloudRequest('GET');
   if(!remote?.state){await pushCloudState();return true}
   const remoteRev=Number(remote?.revision??remote.state?._meta?.revision??0);
   const remoteTime=Number(remote?.updatedAt||remote.state?._meta?.updatedAt||0);
   const localTime=Number(state?._meta?.updatedAt||0);
   if(force || remoteRev>cloudRevision || remoteTime>localTime)applyCanonicalState(remote,{render:true});
   cloudRevision=Math.max(cloudRevision,remoteRev);
   setSyncStatus('Synced','ok');return true;
 }catch(err){console.warn(err);setSyncStatus('Offline · using local state','err');return false}
}
function startCanonicalSyncLoop(){
 if(canonicalSyncInterval)clearInterval(canonicalSyncInterval);
 canonicalSyncInterval=setInterval(()=>{
   if(document.visibilityState==='visible'&&cloudReady())pullCloudState();
 },2000);
}
function makeSyncKey(){
 const bytes=new Uint8Array(24);crypto.getRandomValues(bytes);
 return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
function localDateStr(d=new Date()){return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)}
function weekdayIndex(){return new Date().getDay()}
function surgeryDaysRemaining(){
 const ds=state.surgeryPlan?.date;if(!ds)return null;
 const target=new Date(ds+'T12:00:00'),today=new Date(localDateStr()+'T12:00:00');
 return Math.round((target-today)/86400000);
}
function preopPhase(days=surgeryDaysRemaining()){
 if(days==null)return {name:'DATE TBD',directive:'Set the surgery date when scheduled.'};
 if(days<0)return {name:'POST-OP',directive:'Follow the clinician-cleared recovery plan before resuming pre-op training.'};
 if(days===0)return {name:'SURGERY DAY',directive:'Protect the work. Follow your surgical team’s instructions.'};
 if(days<=3)return {name:'FINAL APPROACH',directive:'Recover, stay loose, and arrive ready. Do not chase extra volume.'};
 if(days<=14)return {name:'ARRIVE READY',directive:'Maintain fitness and consistency; prioritize recovery over last-minute volume.'};
 if(days<=42)return {name:'CONSISTENCY BLOCK',directive:'Keep stacking repeatable sessions. Arrive fit, not beat up.'};
 if(days<=84)return {name:'BUILD CAPACITY',directive:'Build aerobic capacity and repeatable strength while protecting the hip.'};
 return {name:'BUILD BASE',directive:'Stack strength, aerobic capacity, and consistency while protecting the hip.'};
}
function todayProgram(){
 const base=PROGRAM[weekdayIndex()],days=surgeryDaysRemaining(),phase=preopPhase(days);
 if(days!=null&&days<0)return {name:'Post-op · Clinical Plan',why:phase.directive,type:'recovery',full:[['Recovery plan','Use only activities cleared by your surgical / rehabilitation team']],minimum:[['Recovery plan','Use only activities cleared by your surgical / rehabilitation team']]};
 if(days==null)return base;
 return {...base,why:base.why+' · '+phase.name+': '+phase.directive};
}
function renderPreop(){
 const days=surgeryDaysRemaining(),phase=preopPhase(days),big=document.getElementById('preopBig'),meta=document.getElementById('preopMeta'),preview=document.getElementById('surgeryPlanPreview'),dateInput=document.getElementById('surgeryDate');
 if(dateInput)dateInput.value=state.surgeryPlan?.date||'';const todayDateInput=document.getElementById('todaySurgeryDate');if(todayDateInput)todayDateInput.value=state.surgeryPlan?.date||'';
 if(days==null){if(big)big.textContent='SURGERY DATE TBD';if(meta)meta.textContent='Set the date in Settings when it is scheduled. NONZERO will turn it into a live countdown.';if(preview)preview.textContent='TBD · current hip-smart program remains active.';return}
 const unit=Math.abs(days)===1?'DAY':'DAYS';
 if(big)big.textContent=days>0?`${days} ${unit} TO SURGERY`:days===0?'SURGERY DAY':`${Math.abs(days)} ${unit} POST-OP`;
 if(meta)meta.textContent=`${phase.name} · ${phase.directive}`;
 if(preview)preview.textContent=`${state.surgeryPlan.date} · ${days>0?days+' days remaining':days===0?'today':Math.abs(days)+' days post-op'} · ${phase.name}`;
}

function fmtDate(s){return new Date(s+'T12:00:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}
function todaySessionRecord(){return state.sessions.find(x=>x.date===localDateStr())}

function renderToday(){
 renderPreop();
 const p=todayProgram(), rec=todaySessionRecord();
 document.getElementById('todayHeading').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
 document.getElementById('todaySub').textContent=rec ? `Completed: ${rec.mode.toUpperCase()} · ${rec.duration||0} min` : `${p.name}. Your only obligation is to start.`;
 document.getElementById('sessionName').textContent=p.name;
 document.getElementById('sessionWhy').textContent=p.why;
 if(rec){mode=rec.mode||'full';document.getElementById('pain').value=rec.pain??6;document.getElementById('energy').value=rec.energy??3}
 renderWorkout();
 updatePainAdvice();
 renderMetrics();
}

function renderWorkout(){
 const p=todayProgram();
 const items=mode==='flare'?FLARE:p[mode];
 document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
 const rec=todaySessionRecord();
 const active=state.activeWorkout?.date===localDateStr()?state.activeWorkout:null;
 const checks=(rec&&rec.mode===mode&&rec.checks)||(active&&active.mode===mode&&active.checks)||[];
 document.getElementById('workout').innerHTML=items.map((x,i)=>`
 <label class="exercise"><input type="checkbox" data-check="${i}" ${checks[i]?'checked':''}>
 <span><b>${x[0]}</b><small>${x[1]}</small></span></label>`).join('');
 document.querySelectorAll('[data-check]').forEach(c=>c.addEventListener('change',handleExerciseCheckChange));
 updateWorkoutProgress();
 ensureTimerLoop();
}

async function handleExerciseCheckChange(){
 updateWorkoutProgress();
 const now=Date.now();
 const a=ensureActiveWorkout(state.activeWorkout?.status||'ready');
 a.checks=[...document.querySelectorAll('[data-check]')].map(x=>x.checked);
 a.progressUpdatedAt=now;
 a.updatedAt=now;

 const isErg=['bike','row','ski','erg'].includes(String(a.type||'').toLowerCase());
 if(!isErg && !['active','paused','running'].includes(String(a.status||'').toLowerCase())){
   a.status='active';a.statusUpdatedAt=now;
   if(!a.timer?.running){
     a.timer={elapsedMs:Number(a.timer?.elapsedMs||0),running:true,startedAt:now};
     a.timerUpdatedAt=now;
   }
 }
 save({sync:false});
 renderTimer();
 if(cloudReady())await pushCloudState();
}

function timerState(){
 if(!state.activeWorkout||state.activeWorkout.date!==localDateStr()) return {elapsedMs:0,running:false,startedAt:null};
 return state.activeWorkout.timer||{elapsedMs:0,running:false,startedAt:null};
}
function timerElapsed(){
 const t=timerState();
 return Math.max(0,Number(t.elapsedMs||0)+(t.running&&t.startedAt?Date.now()-Number(t.startedAt):0));
}
function fmtTimerParts(ms){
 ms=Math.max(0,Number(ms)||0);
 const total=Math.floor(ms/1000),h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60,hh=Math.floor((ms%1000)/10);
 return {main:h?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`,hundredths:String(hh).padStart(2,'0')};
}
function fmtTimer(ms){const p=fmtTimerParts(ms);return `${p.main}.${p.hundredths}`}
function currentLapElapsed(){
 const a=state.activeWorkout;
 if(!a||a.date!==localDateStr())return 0;
 const total=timerElapsed(),start=Math.max(0,Number(a.lapStartElapsedMs||0));
 return Math.max(0,total-start);
}
function renderLapPanel(){
 const a=state.activeWorkout||{},laps=Array.isArray(a.laps)?a.laps:[];
 const read=document.getElementById('lapReadout'),count=document.getElementById('lapCount'),list=document.getElementById('lapList');
 if(read)read.textContent=fmtTimer(currentLapElapsed());
 if(count)count.textContent=`${laps.length} LAP${laps.length===1?'':'S'}`;
 if(list){
   list.innerHTML=laps.slice().reverse().slice(0,6).map(l=>`<div class="laprow"><span>LAP ${l.number}</span><b>${fmtTimer(l.durationMs)}</b><span class="lapmetrics">${l.rpm?`${Math.round(l.rpm)} RPM`:''}${l.rpm&&l.watts?' · ':''}${l.watts?`${Math.round(l.watts)} W`:''}</span></div>`).join('');
 }
}
async function logLap(){
 const a=ensureActiveWorkout('active');
 if(!a.timer?.running){await startTimer()}
 const now=Date.now(),master=timerElapsed(),start=Math.max(0,Number(a.lapStartElapsedMs||0));
 const duration=Math.max(0,master-start);
 if(duration<500){return}
 const rpmEl=document.getElementById('lapRpm'),wattsEl=document.getElementById('lapWatts');
 const rpm=Number(rpmEl?.value||0)||null,watts=Number(wattsEl?.value||0)||null;
 if(!Array.isArray(a.laps))a.laps=[];
 a.laps.push({number:a.laps.length+1,durationMs:duration,endElapsedMs:master,rpm,watts,loggedAt:now});
 a.lapStartElapsedMs=master;
 a.lapUpdatedAt=now;
 a.updatedAt=now;
 if(rpmEl)rpmEl.value='';if(wattsEl)wattsEl.value='';
 save({sync:false});renderLapPanel();
 if(cloudReady())await pushCloudState();
}
function ergIntentUrl(){return cloudReady()?cloudConfig.endpoint.replace(/\/$/,'')+'/intent/bikeerg/start':''}
async function callErgIntent(action='start'){
 if(!cloudReady())throw new Error('Configure Cloud Sync first');
 const intentPath=action==='start'?'/intent/bikeerg/start':'/intent/erg/'+action; const res=await fetch(cloudConfig.endpoint.replace(/\/$/,'')+intentPath,{method:'POST',headers:{'Content-Type':'application/json','X-NONZERO-Key':cloudConfig.syncKey},body:JSON.stringify({source:'nonzero-phone',ergType:'bike',requestedAt:Date.now()})});
 const body=await res.json();if(!res.ok)throw new Error(body.error||('HTTP '+res.status));return body;
}
function renderErgOrchestration(){
 const a=state.activeWorkout?.date===localDateStr()?state.activeWorkout:null;
 const live=a&&['active','paused','running'].includes(a.status||'');
 const n=document.getElementById('ergNzStatus'),w=document.getElementById('ergWallStatus'),c=document.getElementById('ergC2Status');
 if(n){n.textContent=live?(a.status==='paused'?'PAUSED':'ACTIVE'):'READY';n.className=live?'ok':'wait'}
 if(w){w.textContent=live?'PERFORMANCE':'SCHEDULED';w.className=live?'ok':'wait'}
 if(c){c.textContent=a?.concept2?.id?'SYNCED':'WAITING';c.className=a?.concept2?.id?'ok':'wait'}
 const prev=document.getElementById('ergStartUrlPreview');if(prev)prev.textContent=ergIntentUrl()||'Configure Cloud Sync to generate the endpoint.';
 const en=document.getElementById('ergDataFirstEnabled');if(en)en.checked=state.ergDataFirst?.enabled!==false;
}
function renderTimer(){
 const el=document.getElementById('timerReadout');if(!el)return;
 const parts=fmtTimerParts(timerElapsed());
 el.innerHTML=`${parts.main}<span class="hundredths">.${parts.hundredths}</span>`;
 renderLapPanel();
 const st=document.getElementById('sessionState');const status=state.activeWorkout?.date===localDateStr()?(state.activeWorkout.status||'ready'):'ready';
 if(st){st.className='sessionstate '+(status==='active'?'live':status==='paused'?'paused':'');st.textContent=status==='active'?'LIVE · Wall locked to Performance':status==='paused'?'PAUSED · Wall stays in Performance':status==='complete'?'COMPLETE':'READY · Wall follows schedule';}
 renderErgOrchestration();
}
function ensureActiveWorkout(status='ready'){
 const p=todayProgram();const existing=state.activeWorkout?.date===localDateStr()?state.activeWorkout:{};
 const checks=[...document.querySelectorAll('[data-check]')].map(x=>x.checked);
 const now=Date.now();state.activeWorkout={...existing,date:localDateStr(),name:p.name,type:p.type,mode,checks,pain:Number(document.getElementById('pain').value),energy:Number(document.getElementById('energy').value),timer:existing.timer||{elapsedMs:0,running:false,startedAt:null},status,sessionId:existing.sessionId||('nz-'+now.toString(36)),progressUpdatedAt:existing.progressUpdatedAt||now,statusUpdatedAt:existing.statusUpdatedAt||now,timerUpdatedAt:existing.timerUpdatedAt||now,laps:Array.isArray(existing.laps)?existing.laps:[],lapStartElapsedMs:Number(existing.lapStartElapsedMs||0),lapUpdatedAt:Number(existing.lapUpdatedAt||0),updatedAt:now};
 return state.activeWorkout;
}
async function startTimer(){
 const a=ensureActiveWorkout('active'),t=a.timer||{elapsedMs:0,running:false,startedAt:null};
 const now=Date.now();if(!t.running){t.running=true;t.startedAt=now} a.timer=t;a.timerUpdatedAt=now;a.status='active';a.statusUpdatedAt=now;a.updatedAt=now;save();renderTimer();if(cloudReady())await pushCloudState();
}
async function pauseTimer(){
 const a=ensureActiveWorkout('paused'),t=a.timer||{elapsedMs:0,running:false,startedAt:null};
 const now=Date.now();if(t.running){t.elapsedMs=timerElapsed();t.running=false;t.startedAt=null} a.timer=t;a.timerUpdatedAt=now;a.status='paused';a.statusUpdatedAt=now;a.updatedAt=now;save();renderTimer();if(cloudReady())await pushCloudState();
}
async function restartWorkout(){
 if(!confirm('Reset today’s workout? This clears the timer and checkoffs but keeps pain/energy inputs.'))return;
 const p=todayProgram();state.activeWorkout={date:localDateStr(),name:p.name,type:p.type,mode,checks:[],pain:Number(document.getElementById('pain').value),energy:Number(document.getElementById('energy').value),timer:{elapsedMs:0,running:false,startedAt:null},laps:[],lapStartElapsedMs:0,lapUpdatedAt:Date.now(),status:'ready',sessionId:'nz-'+Date.now().toString(36),progressUpdatedAt:Date.now(),statusUpdatedAt:Date.now(),timerUpdatedAt:Date.now(),updatedAt:Date.now()};save();renderWorkout();renderTimer();if(cloudReady())await pushCloudState();
}
function prefillMetrics(rec=null){
 const p=todayProgram(),elapsed=timerElapsed();
 const get=(id)=>document.getElementById(id);if(!get('metricDuration'))return;
 if(!get('metricDuration').value)get('metricDuration').value=(elapsed?elapsed/60000:(mode==='minimum'||mode==='flare'?10:(p.type==='bike'?(weekdayIndex()===6?40:30):30))).toFixed(1);
 if(!get('metricPainAfter').value)get('metricPainAfter').value=document.getElementById('pain').value;
 if(!get('metricEnergyAfter').value)get('metricEnergyAfter').value=document.getElementById('energy').value;
 if(rec){
   get('metricDuration').value=rec.durationMinutes||get('metricDuration').value;get('metricDistance').value=rec.distance||'';get('metricCalories').value=rec.calories||'';get('metricPace').value=rec.pace||'';get('metricWatts').value=rec.avgWatts||'';get('metricRate').value=rec.rate||'';get('metricAvgHr').value=rec.avgHr||'';get('metricMaxHr').value=rec.maxHr||'';get('metricDrag').value=rec.dragFactor||'';
 }
}
function collectPostMetrics(){
 const n=id=>{const v=document.getElementById(id)?.value;return v===''||v==null?null:Number(v)};
 return {duration:n('metricDuration'),rpe:n('metricRpe'),painAfter:n('metricPainAfter'),energyAfter:n('metricEnergyAfter'),distance:n('metricDistance'),calories:n('metricCalories'),pace:document.getElementById('metricPace')?.value.trim()||null,avgWatts:n('metricWatts'),rate:n('metricRate'),avgHr:n('metricAvgHr'),maxHr:n('metricMaxHr'),dragFactor:n('metricDrag'),notes:document.getElementById('metricNotes')?.value.trim()||null};
}
async function importLatestConcept2({silent=false}={}){
 const status=document.getElementById('ergStatus');
 if(!cloudReady()){status.textContent='Configure Cloud Sync first; the Worker safely holds the Concept2 token.';return}
 try{
   if(!silent)status.textContent='Checking Concept2 Logbook…';
   const res=await fetch(cloudConfig.endpoint+'/concept2/latest?from='+encodeURIComponent(localDateStr()),{headers:{'X-NONZERO-Key':cloudConfig.syncKey},cache:'no-store'});
   const body=await res.json();if(!res.ok)throw new Error(body.error||('Concept2 '+res.status));
   const r=body.result;if(!r){if(!silent)status.textContent='No completed ErgData workout found yet.';return}
   const mapped={durationMinutes:r.time?Number(r.time)/600:null,distance:r.distance||null,calories:r.calories_total||null,pace:r.time&&r.distance?secondsToPace(r.time,r.distance):'',avgWatts:avgWattsFromWattMinutes(r.wattminutes_total,r.time),rate:r.stroke_rate||null,avgHr:r.heart_rate?.average||null,maxHr:r.heart_rate?.max||null,dragFactor:r.drag_factor||null};
   prefillMetrics(mapped);state.activeWorkout={...(state.activeWorkout||{}),concept2:{id:r.id,date:r.date,type:r.type,source:r.source||'Concept2 Logbook',importedAt:Date.now()},ergMetrics:mapped,updatedAt:Date.now()};save();renderErgOrchestration();
   if(!silent)status.textContent=`Imported ${r.type||'erg'} workout · ${r.distance||0} m · ${r.time_formatted||((Number(r.time||0)/600).toFixed(1)+' min')} · source ${r.source||'Logbook'}.`;
 }catch(err){if(!silent)status.textContent='Concept2 import unavailable: '+err.message}
}

function saveActiveWorkout({preserveTimer=true}={}){
 const p=todayProgram();const prev=state.activeWorkout?.date===localDateStr()?state.activeWorkout:{};
 const checks=[...document.querySelectorAll('[data-check]')].map(x=>x.checked);
 state.activeWorkout={...prev,date:localDateStr(),name:p.name,type:p.type,mode,checks,pain:Number(document.getElementById('pain').value),energy:Number(document.getElementById('energy').value),timer:preserveTimer?(prev.timer||{elapsedMs:0,running:false,startedAt:null}):{elapsedMs:0,running:false,startedAt:null},status:prev.status||'ready',sessionId:prev.sessionId||('nz-'+Date.now().toString(36)),concept2:prev.concept2||null,progressUpdatedAt:Date.now(),updatedAt:Date.now()};
 save();renderTimer();
}

function updateWorkoutProgress(){
 const c=[...document.querySelectorAll('[data-check]')];
 const done=c.filter(x=>x.checked).length;
 const pct=c.length?Math.round(done/c.length*100):0;
 document.getElementById('workoutProgress').style.width=pct+'%';
 document.getElementById('progressText').textContent=`${pct}% complete · ${done}/${c.length} steps`;
}

function updatePainAdvice(){
 const p=Number(document.getElementById('pain').value);
 const e=Number(document.getElementById('energy').value);
 let txt='';
 if(p>=8) txt='High-pain day. FLARE mode is the correct workout, not a consolation prize.';
 else if(p>=6) txt='Usual symptom range: use comfortable ROM and immediately modify anything that increases pain, compensation, or limping.';
 else txt='Better symptom day. Keep the prescribed ROM—do not “test” the hip with deep or heavy work.';
 if(e<=2) txt+=' Low energy: Minimum mode is fully acceptable.';
 document.getElementById('painAdvice').textContent=txt;
}

function completeWorkout(){
 const date=localDateStr(), p=todayProgram();
 const checks=[...document.querySelectorAll('[data-check]')].map(x=>x.checked);
 const defaultMinutes=mode==='minimum'?10:mode==='flare'?10:(p.type==='bike'?(weekdayIndex()===6?40:30):30);
 const pain=Number(document.getElementById('pain').value), energy=Number(document.getElementById('energy').value);
 const post=collectPostMetrics();const timerMs=timerElapsed();
 const existing=state.sessions.findIndex(x=>x.date===date);
 const rec={date,name:p.name,type:p.type,mode,pain,energy,duration:post.duration??(timerMs?Math.round(timerMs/6000)/10:defaultMinutes),checks,completed:true,postMetrics:post,timerMs,laps:Array.isArray(state.activeWorkout?.laps)?state.activeWorkout.laps:[],concept2:state.activeWorkout?.concept2||null};
 if(existing>=0)state.sessions[existing]=rec;else state.sessions.push(rec);
 state.activeWorkout={...rec,timer:{elapsedMs:timerMs,running:false,startedAt:null},status:'complete',updatedAt:Date.now()};
 save();
 const msg=motivation(rec);
 document.getElementById('completeMessage').innerHTML=`<p class="success">✓ ${msg}</p>`;
 renderMetrics(); renderWeek(); renderProgress();
}

function motivation(rec){
 const streak=calcStreak();
 if(rec.mode==='flare') return `Smart training. You protected the hip and kept the streak alive — ${streak} day${streak===1?'':'s'}.`;
 if(rec.mode==='minimum') return `Ten minutes beat zero. That is exactly how this becomes permanent — ${streak}-day streak.`;
 if(streak>=14) return `Two weeks of identity change. You are no longer “trying to restart” — you are training consistently.`;
 if(streak>=7) return `A full week of starts. That matters more than any single hard workout.`;
 return `Non-zero day complete. Stack another one tomorrow.`;
}

function weekBounds(){
 const now=new Date(); const day=now.getDay(); const diff=(day+6)%7;
 const mon=new Date(now); mon.setDate(now.getDate()-diff); mon.setHours(0,0,0,0);
 const sun=new Date(mon); sun.setDate(mon.getDate()+6);
 return [mon,sun];
}
function sessionsThisWeek(){
 const [a,b]=weekBounds();
 return state.sessions.filter(s=>{const d=new Date(s.date+'T12:00:00');return d>=a&&d<=new Date(b.getTime()+86400000-1)})
}
function calcStreak(){
 const set=new Set(state.sessions.filter(s=>s.completed).map(s=>s.date));
 let d=new Date(), streak=0;
 if(!set.has(localDateStr(d))){d.setDate(d.getDate()-1)}
 while(set.has(localDateStr(d))){streak++;d.setDate(d.getDate()-1)}
 return streak;
}
function renderMetrics(){
 const w=sessionsThisWeek();
 const bike=w.filter(s=>s.type==='bike').reduce((a,b)=>a+(b.duration||0),0);
 document.getElementById('streak').textContent=calcStreak();
 document.getElementById('weekStarts').textContent=`${w.length}/7`;
 document.getElementById('weekBike').textContent=bike;
}

function renderWeek(){
 const [mon]=weekBounds(), byDate=Object.fromEntries(state.sessions.map(s=>[s.date,s]));
 const names=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
 let html='';
 for(let i=0;i<7;i++){
   const d=new Date(mon); d.setDate(mon.getDate()+i); const ds=localDateStr(d); const r=byDate[ds];
   const program=PROGRAM[(i+1)%7];
   html+=`<div class="dayrow"><b>${names[i]}</b><span><span class="statusdot ${r?'done':''}"></span>${program.name}</span><span class="small">${r?r.mode.toUpperCase():'—'}</span></div>`;
 }
 document.getElementById('weekList').innerHTML=html;
 const w=sessionsThisWeek(), starts=w.length, mins=w.reduce((a,b)=>a+(b.duration||0),0);
 const avgPain=w.length?(w.reduce((a,b)=>a+(b.pain||0),0)/w.length).toFixed(1):'—';
 let text=starts>=6?'Excellent consistency. Keep protecting sleep and the hip; do not add intensity just because adherence is high.':
          starts>=4?'Solid week. Your next win is simply converting one missed day into a 10-minute Minimum day.':
          'The program is designed for imperfect weeks. Focus only on getting the next start.';
 document.getElementById('weeklySummary').innerHTML=`<p><b>${starts}/7 starts</b> · ${mins} total min · average reported pain ${avgPain}/10.</p><p>${text}</p>`;
}

function renderProgress(){
 const s=[...state.sessions].sort((a,b)=>b.date.localeCompare(a.date));
 document.getElementById('totalStarts').textContent=s.length;
 document.getElementById('totalStrength').textContent=s.filter(x=>x.type==='strength').length;
 document.getElementById('totalBike').textContent=s.filter(x=>x.type==='bike').reduce((a,b)=>a+(b.duration||0),0);
 const recent=s.slice(0,14), old=s.slice(14,28);
 let trend='Keep logging sessions; your first useful trend summary appears as history builds.';
 if(recent.length>=5){
   const rp=recent.reduce((a,b)=>a+(b.pain||0),0)/recent.length;
   const op=old.length?old.reduce((a,b)=>a+(b.pain||0),0)/old.length:null;
   if(op!==null){
     const diff=rp-op;
     trend=diff<-0.5?`Reported pain is trending down by about ${Math.abs(diff).toFixed(1)} points versus the prior period. Preserve what is working.`:
           diff>0.5?`Reported pain is trending up by about ${diff.toFixed(1)} points. Favor Minimum/Flare modes and discuss worsening symptoms with your clinician.`:
           `Reported pain is relatively stable. Consistency and pre-op fitness remain the priority.`;
   } else trend=`You have ${recent.length} logged sessions. Keep stacking starts; the app will compare pain trends once there is more history.`;
 }
 document.getElementById('trendSummary').textContent=trend;
 document.getElementById('recentSessions').innerHTML=s.slice(0,10).map(x=>`<div class="dayrow"><span>${fmtDate(x.date)}</span><span>${x.name}<br><span class="small">${x.mode.toUpperCase()} · pain ${x.pain}/10</span></span><span>${x.duration||0}m</span></div>`).join('')||'<p>No sessions saved yet.</p>';
}

document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;renderWorkout();saveActiveWorkout()}));
document.getElementById('pain').addEventListener('input',()=>{updatePainAdvice();saveActiveWorkout()});
document.getElementById('energy').addEventListener('input',()=>{updatePainAdvice();saveActiveWorkout()});
document.getElementById('completeBtn').addEventListener('click',completeWorkout);
document.getElementById('timerStartBtn').addEventListener('click',startTimer);
document.getElementById('timerPauseBtn').addEventListener('click',pauseTimer);
document.getElementById('lapBtn').addEventListener('click',logLap);
document.getElementById('restartWorkoutBtn').addEventListener('click',restartWorkout);
document.getElementById('reviewMetricsBtn').addEventListener('click',()=>{document.getElementById('postMetrics').classList.toggle('hidden');prefillMetrics()});
document.getElementById('importC2Btn').addEventListener('click',()=>importLatestConcept2());
document.getElementById('importC2QuickBtn').addEventListener('click',()=>importLatestConcept2());
document.getElementById('completeBtnTop').addEventListener('click',completeWorkout);

document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{
 document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));
 ['Today','Week','Progress','Settings'].forEach(t=>document.getElementById('tab'+t).classList.toggle('hidden',t!==b.dataset.tab));
 if(b.dataset.tab==='Week')renderWeek();
 if(b.dataset.tab==='Progress')renderProgress();
}));

document.getElementById('startDate').value=state.startDate;
document.getElementById('startDate').addEventListener('change',e=>{state.startDate=e.target.value;save()});
document.getElementById('reminderTime').value=state.reminderTime||'06:00';if(document.getElementById('wallAmbientTime'))renderWallScheduleSettings();renderPreop();
document.getElementById('reminderTime').addEventListener('change',e=>{state.reminderTime=e.target.value;save()});
document.getElementById('ergDataFirstEnabled').addEventListener('change',e=>{state.ergDataFirst={enabled:e.target.checked};save();renderErgOrchestration()});

function renderWallScheduleSettings(){
 const s=state.wallSchedule||{enabled:true,ambient:'06:00',night:'20:30',deep:'01:00'};
 document.getElementById('wallAmbientTime').value=s.ambient||'06:00';document.getElementById('wallNightTime').value=s.night||'20:30';document.getElementById('wallDeepTime').value=s.deep||'01:00';document.getElementById('wallScheduleEnabled').checked=s.enabled!==false;
}
function saveWallSchedule(){state.wallSchedule={enabled:document.getElementById('wallScheduleEnabled').checked,ambient:document.getElementById('wallAmbientTime').value||'06:00',night:document.getElementById('wallNightTime').value||'20:30',deep:document.getElementById('wallDeepTime').value||'01:00'};save();}
renderWallScheduleSettings();['wallAmbientTime','wallNightTime','wallDeepTime','wallScheduleEnabled'].forEach(id=>document.getElementById(id).addEventListener('change',saveWallSchedule));
function saveSurgeryPlan(value){
 const date=value!==undefined?value:(document.getElementById('todaySurgeryDate')?.value||document.getElementById('surgeryDate')?.value||'');
 state.surgeryPlan={...(state.surgeryPlan||{}),date,label:'RIGHT HIP'};
 const a=document.getElementById('surgeryDate'),b=document.getElementById('todaySurgeryDate');
 if(a)a.value=date;if(b)b.value=date;
 save();renderPreop();renderToday();
}
document.getElementById('surgeryDate')?.addEventListener('change',e=>saveSurgeryPlan(e.target.value));
document.getElementById('todaySurgeryDate')?.addEventListener('change',e=>saveSurgeryPlan(e.target.value));
document.getElementById('clearSurgeryDateBtn')?.addEventListener('click',()=>saveSurgeryPlan(''));
document.getElementById('todayClearSurgeryDate')?.addEventListener('click',()=>saveSurgeryPlan(''));
renderPreop();



async function generateRokuPairCode(){
 const btn=document.getElementById('generatePairCodeBtn'),box=document.getElementById('pairCodeBox'),value=document.getElementById('pairCodeValue'),status=document.getElementById('pairCodeStatus');
 saveCloudConfig();
 if(!cloudReady()){
   alert('Configure Cloud Sync first: enter the Worker URL, generate/paste the private sync key, then tap Sync now.');
   return;
 }
 try{
   btn.disabled=true;btn.textContent='Generating…';status.textContent='Creating one-time pairing code…';box.classList.remove('hidden');
   const res=await fetch(cloudConfig.endpoint+'/pair/create',{method:'POST',headers:{'Content-Type':'application/json','X-NONZERO-Key':cloudConfig.syncKey},body:'{}',cache:'no-store'});
   const body=await res.json();
   if(!res.ok||!body.code) throw new Error(body.error||('Pairing '+res.status));
   value.textContent=body.code;
   const mins=Math.max(1,Math.round(Number(body.expiresInSeconds||600)/60));
   status.textContent='Enter this code on the Roku Wall. Expires in about '+mins+' minutes.';
 }catch(err){
   value.textContent='------';status.textContent='Could not create pairing code: '+err.message;
 }finally{btn.disabled=false;btn.textContent='Generate 6-digit pairing code'}
}
document.getElementById('generatePairCodeBtn').addEventListener('click',generateRokuPairCode);

document.getElementById('cloudEndpoint').value=cloudConfig.endpoint||'';
document.getElementById('syncKey').value=cloudConfig.syncKey||'';
document.getElementById('cloudEndpoint').addEventListener('change',()=>{saveCloudConfig();pullCloudState()});
document.getElementById('syncKey').addEventListener('change',()=>{saveCloudConfig();pullCloudState()});
document.getElementById('generateSyncKeyBtn').addEventListener('click',()=>{
 const key=makeSyncKey();document.getElementById('syncKey').value=key;saveCloudConfig();setSyncStatus('Key generated · add Worker URL','ok');
});
document.getElementById('syncNowBtn').addEventListener('click',async()=>{saveCloudConfig();await pullCloudState({force:false});await pushCloudState()});
document.getElementById('wallLaunchBtn')?.addEventListener('click',()=>{location.href='./wall/'});
setSyncStatus(cloudReady()?'Cloud configured':'Local only',cloudReady()?'ok':'');

document.getElementById('exportBtn').addEventListener('click',()=>{
 const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='hip-prehab-progress.json';a.click();URL.revokeObjectURL(a.href);
});
document.getElementById('importBtn').addEventListener('click',()=>document.getElementById('importFile').click());
document.getElementById('importFile').addEventListener('change',async e=>{
 try{const txt=await e.target.files[0].text();state=JSON.parse(txt);save();location.reload()}catch{alert('Could not import that file.')}
});
document.getElementById('resetBtn').addEventListener('click',()=>{
 if(confirm('Reset all saved progress? Cloud sync will mirror the reset after reload.')){localStorage.removeItem(STORAGE_KEY);location.reload()}
});

window.addEventListener('beforeinstallprompt',e=>{
 e.preventDefault(); deferredPrompt=e; document.getElementById('installBanner').style.display='block';
});
document.getElementById('installBtn').addEventListener('click',async()=>{
 if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null}
});


renderToday();renderWeek();renderProgress();renderTimer();
(function animateTimer(){
  renderTimer();
  requestAnimationFrame(animateTimer);
})();
startCanonicalSyncLoop();
if(cloudReady()) pullCloudState();
window.addEventListener('focus',async()=>{if(cloudReady()){await pullCloudState();setTimeout(()=>{if(todayProgram().type==='bike')importLatestConcept2({silent:true})},1200)}renderTimer()});
document.addEventListener('visibilitychange',async()=>{if(document.visibilityState==='hidden'){if(state.activeWorkout?.date===localDateStr())save();if(cloudReady())await pushCloudState()}else{if(cloudReady())await pullCloudState({force:true});renderTimer();setTimeout(()=>{if(todayProgram().type==='bike')importLatestConcept2({silent:true})},1200)}});
window.addEventListener('pagehide',()=>{if(state.activeWorkout?.date===localDateStr()){state.activeWorkout.updatedAt=Date.now();localStorage.setItem(STORAGE_KEY,JSON.stringify(state));if(cloudReady())pushCloudState()}});

// NONZERO v3.13: one-link BikeErg Shortcuts setup.
async function sha256HexLocal(value){
 const data=new TextEncoder().encode(String(value));
 const digest=await crypto.subtle.digest('SHA-256',data);
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}

let simpleBikeErgUrl=localStorage.getItem('nz_simple_bikeerg_url')||'';

function renderSimpleBikeErgSetup(){
 const status=document.getElementById('simpleErgStatus');
 const copy=document.getElementById('copyOpenShortcutsBtn');
 const test=document.getElementById('testSimpleErgBtn');
 const reset=document.getElementById('resetSimpleErgBtn');
 const create=document.getElementById('createSimpleErgLinkBtn');
 if(!status)return;
 const ready=!!simpleBikeErgUrl;
 if(copy)copy.disabled=!ready;if(test)test.disabled=!ready;if(reset)reset.disabled=!ready;
 if(create)create.textContent=ready?'RECREATE MY SHORTCUT LINK':'1 · CREATE MY SHORTCUT LINK';
 status.innerHTML=ready?'<b>✓ Secure NONZERO link ready.</b><br>Next tap “COPY LINK + OPEN SHORTCUTS.”':'Not configured yet.';
}

async function createSimpleBikeErgLink(){
 const status=document.getElementById('simpleErgStatus');
 const btn=document.getElementById('createSimpleErgLinkBtn');
 saveCloudConfig();
 const endpoint=normalizeEndpoint(document.getElementById('cloudEndpoint')?.value||cloudConfig.endpoint);
 const syncKey=(document.getElementById('syncKey')?.value||cloudConfig.syncKey||'').trim();

 if(!/^https:\/\//i.test(endpoint)){
   if(status)status.innerHTML='<b>SETUP BLOCKED:</b> Cloudflare Worker URL is missing.';
   return;
 }
 if(syncKey.length<16){
   if(status)status.innerHTML='<b>SETUP BLOCKED:</b> Cloud Sync key is missing.';
   return;
 }
 if(!window.crypto?.subtle){
   if(status)status.innerHTML='<b>SETUP BLOCKED:</b> Secure browser crypto is unavailable. Open NONZERO from its normal HTTPS GitHub Pages address.';
   return;
 }

 if(btn){btn.disabled=true;btn.textContent='CREATING…'}
 if(status)status.textContent='Creating secure BikeErg link on this phone…';

 try{
   const userHash=await sha256HexLocal(syncKey);
   simpleBikeErgUrl=endpoint+'/automation/bikeerg/direct/'+userHash;
   localStorage.setItem('nz_simple_bikeerg_url',simpleBikeErgUrl);
   if(status)status.innerHTML='<b>✓ SHORTCUT LINK READY.</b><br>No Cloudflare setup call was required. Tap “COPY LINK + OPEN SHORTCUTS.”';
   renderSimpleBikeErgSetup();
 }catch(e){
   if(status)status.innerHTML='<b>LINK CREATION FAILED</b><br>'+escapeHtml(e?.message||String(e));
 }finally{
   if(btn)btn.disabled=false;
   if(!simpleBikeErgUrl)btn.textContent='1 · CREATE MY SHORTCUT LINK';
 }
}

async function copyAndOpenShortcuts(){
 if(!simpleBikeErgUrl)return;
 try{await navigator.clipboard.writeText(simpleBikeErgUrl)}
 catch{
   const ta=document.createElement('textarea');ta.value=simpleBikeErgUrl;document.body.appendChild(ta);
   ta.select();document.execCommand('copy');ta.remove();
 }
 const s=document.getElementById('simpleErgStatus');
 if(s)s.innerHTML='<b>✓ Link copied.</b><br>Shortcuts is opening. Create: Automation → App → ErgData → Is Opened → Run Immediately → Get Contents of URL → Paste → Done.';
 setTimeout(()=>{window.location.href='shortcuts://'},250);
}

async function testSimpleBikeErg(){
 if(!simpleBikeErgUrl)return;
 const s=document.getElementById('simpleErgStatus');
 if(s)s.textContent='Starting BikeErg test…';
 try{
   const r=await fetch(simpleBikeErgUrl,{cache:'no-store'});
   const d=await r.json();
   if(!r.ok)throw new Error(d.error||'Test failed');
   await pullCloudState();renderToday();renderTimer();
   if(s)s.innerHTML='<b>✓ SUCCESS.</b> NONZERO is ACTIVE. The Wall should switch to Performance on its next poll.';
 }catch(e){if(s)s.textContent='Test failed: '+e.message}
}

async function resetSimpleBikeErg(){
 if(!confirm('Clear the saved BikeErg Shortcut link from this phone?'))return;
 simpleBikeErgUrl='';
 localStorage.removeItem('nz_simple_bikeerg_url');
 renderSimpleBikeErgSetup();
}

document.getElementById('testSimpleErgBtn')?.addEventListener('click',testSimpleBikeErg);
renderSimpleBikeErgSetup();

