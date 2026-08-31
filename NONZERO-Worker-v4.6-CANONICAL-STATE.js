/**
 * NONZERO Cloud Worker v4.6 — pairing + direct BikeErg auto-launch + ErgData + quote discovery
 * Bindings:
 *   NONZERO_STATE : Workers KV namespace
 * Secret:
 *   C2_API_TOKEN  : Concept2 Logbook bearer token (results:read)
 * Optional Cron:  * * * * *  (once/minute) for automatic Concept2 result reconciliation
 *
 * v4.3 capabilities:
 *   - Existing 6-digit Roku pairing preserved
 *   - Existing X-NONZERO-Wall state access preserved
 *   - BikeErg active-workout launch preserved
 *   - One-link Apple Shortcuts setup: no POST/header/private key inside Shortcut
 *   - Tokenized GET /automation/bikeerg/run/<token> trigger
 *   - Authenticated setup/revoke endpoints for the one-link trigger
 *   - Quote discovery preserved
 *   - Concept2 reconciliation preserved when C2_API_TOKEN is configured
 */
const cors={
 'Access-Control-Allow-Origin':'*',
 'Access-Control-Allow-Methods':'GET,PUT,POST,OPTIONS',
 'Access-Control-Allow-Headers':'Content-Type,X-NONZERO-Key,X-NONZERO-Wall',
 'Access-Control-Max-Age':'86400','Cache-Control':'no-store'
};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
async function hashKey(key){const bytes=new TextEncoder().encode(key);const digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function validKey(req){const key=(req.headers.get('X-NONZERO-Key')||'').trim();return key.length>=16?key:null}
async function readPayload(env,storageKey){
 const raw=await env.NONZERO_STATE.get(storageKey);if(!raw)return null;
 try{
  const p=JSON.parse(raw);
  if(p&&p.state){
   const rev=Number(p.revision??p.state?._meta?.revision??0);
   p.revision=Number.isFinite(rev)?rev:0;
   return p;
  }
  return {state:p,updatedAt:p?._meta?.updatedAt||0,revision:Number(p?._meta?.revision||0)};
 }catch{return null}
}
async function writePayload(env,storageKey,state,opts={}){
 const current=await readPayload(env,storageKey);
 const currentRev=Number(current?.revision||current?.state?._meta?.revision||0);
 if(opts.baseRevision!=null && Number(opts.baseRevision)!==currentRev){
  const err=new Error('state_conflict');err.code='state_conflict';err.current=current;throw err;
 }
 const updatedAt=Date.now(),revision=currentRev+1;
 state._meta={...(state._meta||{}),schema:8,updatedAt,revision};
 const payload={state,updatedAt,revision};
 await env.NONZERO_STATE.put(storageKey,JSON.stringify(payload));
 return payload
}
function localDate(){return new Date().toISOString().slice(0,10)}
async function latestConcept2(env,from){
 if(!env.C2_API_TOKEN)throw new Error('concept2_token_not_configured');
 const u=new URL('https://log.concept2.com/api/users/me/results');u.searchParams.set('number','10');if(from)u.searchParams.set('from',from);
 const r=await fetch(u.toString(),{headers:{'Authorization':'Bearer '+env.C2_API_TOKEN,'Accept':'application/vnd.c2logbook.v1+json','Content-Type':'application/json'}});
 if(!r.ok)throw new Error('concept2_'+r.status);const b=await r.json();const rows=Array.isArray(b.data)?b.data:[];rows.sort((a,b)=>Number(b.id||0)-Number(a.id||0));return rows[0]||null;
}
function mappedMetrics(r){
 if(!r)return null;const t=Number(r.time||0),d=Number(r.distance||0);const secs=t/10;const pace=(d>0&&secs>0)?(secs/(d/500)):null;
 return {durationMinutes:t?+(t/600).toFixed(2):null,distance:r.distance??null,calories:r.calories_total??null,paceSeconds:pace,avgWatts:r.watts??null,rate:r.stroke_rate??r.cadence??null,avgHr:r.heart_rate?.average??r.heart_rate_average??null,maxHr:r.heart_rate?.max??r.heart_rate_max??null,dragFactor:r.drag_factor??null};
}
async function startErg(env,storageKey,hash,body={}){
 let payload=await readPayload(env,storageKey);if(!payload?.state)throw new Error('state_not_initialized');
 let s=payload.state,a=s.activeWorkout||{};
 const ergType=String(body.ergType||'erg').toLowerCase();
 const now=Date.now(),today=localDate();
 const isBike=ergType==='bike'||ergType==='bikeerg';

 if(a.date===today && ['active','paused','running'].includes(String(a.status||'').toLowerCase())){
   a.source='ergdata-automation';
   a.ergAutomation={...(a.ergAutomation||{}),startedAt:a.ergAutomation?.startedAt||now,awaitingResult:true,lastCheckAt:0,ergType:isBike?'bike':ergType,trigger:String(body.source||'shortcut')};
   a.status=a.status==='paused'?'paused':'active';
   a.statusUpdatedAt=now;
   a.updatedAt=now;
   s.activeWorkout=a;
   const written=await writePayload(env,storageKey,s);
   await env.NONZERO_STATE.put('erg-active:'+hash,JSON.stringify({storageKey,startedAt:a.ergAutomation.startedAt,ergType:isBike?'bike':ergType}),{expirationTtl:21600});
   return {state:written.state,idempotent:true};
 }

 let baseline=null;try{baseline=await latestConcept2(env,today)}catch{}
 const displayName=isBike?'BikeErg · ErgData LIVE':'ErgData Session';
 s.activeWorkout={
   date:today,
   name:displayName,
   type:isBike?'bike':'erg',
   mode:'full',
   checks:[],
   progressUpdatedAt:now,
   pain:a.date===today?(a.pain??null):null,
   energy:a.date===today?(a.energy??null):null,
   status:'active',
   statusUpdatedAt:now,
   source:'ergdata-automation',
   sessionId:'erg-'+now.toString(36),
   timer:{elapsedMs:0,running:true,startedAt:now},
   timerUpdatedAt:now,
   ergAutomation:{
     startedAt:now,
     baselineResultId:baseline?.id??null,
     awaitingResult:true,
     lastCheckAt:0,
     ergType:isBike?'bike':ergType,
     trigger:String(body.source||'shortcut')
   },
   updatedAt:now
 };
 const written=await writePayload(env,storageKey,s);
 await env.NONZERO_STATE.put('erg-active:'+hash,JSON.stringify({storageKey,startedAt:now,ergType:isBike?'bike':ergType}),{expirationTtl:21600});
 return {state:written.state,idempotent:false};
}
async function pauseErg(env,storageKey){let p=await readPayload(env,storageKey);if(!p?.state)throw new Error('state_not_initialized');let s=p.state,a=s.activeWorkout;if(!a)return {state:s};const now=Date.now(),t=a.timer||{};if(t.running&&t.startedAt)t.elapsedMs=Number(t.elapsedMs||0)+(now-Number(t.startedAt));t.running=false;t.startedAt=null;a.timer=t;a.timerUpdatedAt=now;a.status='paused';a.statusUpdatedAt=now;a.updatedAt=now;await writePayload(env,storageKey,s);return {state:s}}
async function resetErg(env,storageKey,hash){let p=await readPayload(env,storageKey);if(!p?.state)throw new Error('state_not_initialized');let s=p.state,a=s.activeWorkout||{};s.activeWorkout={...a,status:'ready',timer:{elapsedMs:0,running:false,startedAt:null},ergAutomation:null,updatedAt:Date.now()};await writePayload(env,storageKey,s);await env.NONZERO_STATE.delete('erg-active:'+hash);return {state:s}}
async function reconcileOne(env,hash,marker){
 const storageKey=marker.storageKey;let p=await readPayload(env,storageKey);if(!p?.state){await env.NONZERO_STATE.delete('erg-active:'+hash);return}
 let s=p.state,a=s.activeWorkout;if(!a||a.source!=='ergdata-automation'||!['active','paused'].includes(a.status)){await env.NONZERO_STATE.delete('erg-active:'+hash);return}
 const now=Date.now(),started=Number(a.ergAutomation?.startedAt||marker.startedAt||now);if(now-started>4*60*60*1000){a.status='stale';a.timer={elapsedMs:Math.max(0,now-started),running:false,startedAt:null};a.updatedAt=now;await writePayload(env,storageKey,s);await env.NONZERO_STATE.delete('erg-active:'+hash);return}
 let r;try{r=await latestConcept2(env,new Date(started-3600000).toISOString().slice(0,10))}catch{return}
 a.ergAutomation={...(a.ergAutomation||{}),lastCheckAt:now};const baseline=a.ergAutomation.baselineResultId;
 if(!r||String(r.id)===String(baseline))return;
 // A new Concept2 result after the automation started is the authoritative completion signal.
 a.concept2={id:r.id,date:r.date,type:r.type,source:r.source||'Concept2 Logbook',importedAt:now};a.ergMetrics=mappedMetrics(r);a.name=(r.type==='bike'?'BikeErg':r.type==='rower'?'RowErg':r.type==='skierg'?'SkiErg':'Erg')+' · ErgData';a.type=r.type||'erg';a.status='complete';a.timer={elapsedMs:Number(r.time||0)*100,running:false,startedAt:null};a.ergAutomation={...(a.ergAutomation||{}),awaitingResult:false,reconciledAt:now};a.updatedAt=now;await writePayload(env,storageKey,s);await env.NONZERO_STATE.delete('erg-active:'+hash);
}


// --- NONZERO Quote Discovery Cloud v4 --------------------------------------
const QUOTE_SEED = [{"id":"ma_right","text":"IF IT IS NOT RIGHT, DO NOT DO IT; IF IT IS NOT TRUE, DO NOT SAY IT.","author":"Marcus Aurelius","domain":"STOIC","tier":3,"source":3,"tags":["discipline","integrity","judgment"]},{"id":"ma_be","text":"NO LONGER TALK AT ALL ABOUT THE KIND OF MAN THAT A GOOD MAN OUGHT TO BE, BUT BE SUCH.","author":"Marcus Aurelius","domain":"STOIC","tier":3,"source":3,"tags":["action","identity","integrity"]},{"id":"ma_stand","text":"A MAN THEN MUST STAND ERECT, NOT BE KEPT ERECT BY OTHERS.","author":"Marcus Aurelius","domain":"STOIC","tier":3,"source":3,"tags":["resilience","ownership","strength"]},{"id":"ma_duty","text":"I DO MY DUTY: OTHER THINGS TROUBLE ME NOT.","author":"Marcus Aurelius","domain":"STOIC","tier":3,"source":3,"tags":["focus","duty","composure"]},{"id":"ma_change","text":"IF ANY MAN IS ABLE TO CONVINCE ME THAT I DO NOT ACT RIGHT, I WILL GLADLY CHANGE.","author":"Marcus Aurelius","domain":"STOIC","tier":3,"source":3,"tags":["learning","humility","growth"]},{"id":"ma_river","text":"TIME IS LIKE A RIVER MADE UP OF THE EVENTS WHICH HAPPEN.","author":"Marcus Aurelius","domain":"STOIC","tier":3,"source":3,"tags":["time","perspective","wisdom"]},{"id":"ma_wrestler","text":"THE ART OF LIFE IS MORE LIKE THE WRESTLER'S ART THAN THE DANCER'S.","author":"Marcus Aurelius","domain":"STOIC","tier":3,"source":2,"tags":["resilience","readiness","adaptability"]},{"id":"epi_control","text":"SOME THINGS ARE IN OUR CONTROL AND OTHERS NOT.","author":"Epictetus","domain":"STOIC","tier":3,"source":3,"tags":["control","focus","composure"]},{"id":"epi_exercise","text":"EXERCISE, THEREFORE, WHAT IS IN YOUR CONTROL.","author":"Epictetus","domain":"STOIC","tier":3,"source":3,"tags":["control","action","discipline"]},{"id":"epi_first","text":"FIRST SAY TO YOURSELF WHAT YOU WOULD BE; AND THEN DO WHAT YOU HAVE TO DO.","author":"Epictetus","domain":"STOIC","tier":3,"source":2,"tags":["identity","action","purpose"]},{"id":"epi_sudden","text":"NO GREAT THING IS CREATED SUDDENLY.","author":"Epictetus","domain":"STOIC","tier":3,"source":2,"tags":["patience","consistency","growth"]},{"id":"epi_improve","text":"IF YOU WOULD IMPROVE, BE CONTENT TO BE THOUGHT FOOLISH AND STUPID.","author":"Epictetus","domain":"STOIC","tier":2,"source":2,"tags":["growth","humility","courage"]},{"id":"epi_appearance","text":"YOU ARE BUT AN APPEARANCE, AND NOT ABSOLUTELY THE THING YOU APPEAR TO BE.","author":"Epictetus","domain":"STOIC","tier":2,"source":3,"tags":["perspective","composure","judgment"]},{"id":"epi_prepare","text":"DO YOU NOT THINK THEN THAT I HAVE BEEN PREPARING FOR IT ALL MY LIFE?","author":"Epictetus","domain":"STOIC","tier":2,"source":3,"tags":["preparation","character","readiness"]},{"id":"sen_time","text":"WHILE WE ARE POSTPONING, LIFE SPEEDS BY.","author":"Seneca","domain":"STOIC","tier":3,"source":3,"tags":["time","action","urgency"]},{"id":"sen_hour","text":"HOLD EVERY HOUR IN YOUR GRASP.","author":"Seneca","domain":"STOIC","tier":3,"source":3,"tags":["time","focus","action"]},{"id":"sen_waste","text":"IT IS NOT THAT WE HAVE A SHORT SPACE OF TIME, BUT THAT WE WASTE MUCH OF IT.","author":"Seneca","domain":"STOIC","tier":3,"source":3,"tags":["time","discipline","purpose"]},{"id":"sen_today","text":"LAY HOLD OF TODAY'S TASK, AND YOU WILL NOT NEED TO DEPEND SO MUCH UPON TOMORROW'S.","author":"Seneca","domain":"STOIC","tier":3,"source":3,"tags":["action","preparation","focus"]},{"id":"sen_study","text":"THERE IS NO TIME THAT IS UNSUITABLE FOR HELPFUL STUDIES.","author":"Seneca","domain":"STOIC","tier":2,"source":3,"tags":["learning","consistency","growth"]},{"id":"sen_better","text":"I SHALL DEPART A BETTER MAN.","author":"Seneca","domain":"STOIC","tier":2,"source":3,"tags":["growth","character","purpose"]},{"id":"socrates_examined","text":"THE UNEXAMINED LIFE IS NOT WORTH LIVING.","author":"Socrates","domain":"PHILOSOPHY","tier":2,"source":2,"tags":["reflection","wisdom","purpose"]},{"id":"plato_start","text":"THE BEGINNING IS THE MOST IMPORTANT PART OF THE WORK.","author":"Plato","domain":"PHILOSOPHY","tier":2,"source":1,"tags":["start","action","momentum"]},{"id":"aristotle_doing","text":"WE BECOME JUST BY DOING JUST ACTS, TEMPERATE BY DOING TEMPERATE ACTS, BRAVE BY DOING BRAVE ACTS.","author":"Aristotle","domain":"PHILOSOPHY","tier":2,"source":2,"tags":["habit","identity","action"]},{"id":"conf_modest","text":"THE SUPERIOR MAN IS MODEST IN HIS SPEECH, BUT EXCEEDS IN HIS ACTIONS.","author":"Confucius","domain":"PHILOSOPHY","tier":2,"source":2,"tags":["action","humility","integrity"]},{"id":"conf_worth","text":"WHEN WE SEE MEN OF WORTH, WE SHOULD THINK OF EQUALING THEM.","author":"Confucius","domain":"PHILOSOPHY","tier":2,"source":2,"tags":["growth","standards","learning"]},{"id":"conf_courage","text":"TO SEE WHAT IS RIGHT AND NOT TO DO IT IS WANT OF COURAGE.","author":"Confucius","domain":"PHILOSOPHY","tier":2,"source":2,"tags":["courage","action","integrity"]},{"id":"emerson_enthusiasm","text":"NOTHING GREAT WAS EVER ACHIEVED WITHOUT ENTHUSIASM.","author":"Ralph Waldo Emerson","domain":"WISDOM","tier":2,"source":2,"tags":["enthusiasm","achievement","energy"]},{"id":"emerson_do","text":"DO THE THING, AND YOU WILL HAVE THE POWER.","author":"Ralph Waldo Emerson","domain":"WISDOM","tier":2,"source":1,"tags":["action","confidence","momentum"]},{"id":"thoreau_direction","text":"GO CONFIDENTLY IN THE DIRECTION OF YOUR DREAMS. LIVE THE LIFE YOU HAVE IMAGINED.","author":"Henry David Thoreau","domain":"WISDOM","tier":2,"source":1,"tags":["confidence","purpose","action"]},{"id":"douglass_struggle","text":"IF THERE IS NO STRUGGLE, THERE IS NO PROGRESS.","author":"Frederick Douglass","domain":"WISDOM","tier":2,"source":3,"tags":["resilience","progress","adversity"]},{"id":"douglass_demand","text":"POWER CONCEDES NOTHING WITHOUT A DEMAND.","author":"Frederick Douglass","domain":"WISDOM","tier":1,"source":3,"tags":["courage","action","leadership"]},{"id":"keller_optimism","text":"OPTIMISM IS THE FAITH THAT LEADS TO ACHIEVEMENT.","author":"Helen Keller","domain":"WISDOM","tier":2,"source":2,"tags":["optimism","achievement","mindset"]},{"id":"keller_face","text":"KEEP YOUR FACE TO THE SUNSHINE AND YOU CANNOT SEE THE SHADOWS.","author":"Helen Keller","domain":"WISDOM","tier":1,"source":1,"tags":["optimism","perspective","mindset"]},{"id":"edison_genius","text":"GENIUS IS ONE PERCENT INSPIRATION AND NINETY-NINE PERCENT PERSPIRATION.","author":"Thomas Edison","domain":"INNOVATION","tier":2,"source":2,"tags":["work","effort","execution"]},{"id":"edison_work","text":"OPPORTUNITY IS MISSED BY MOST PEOPLE BECAUSE IT IS DRESSED IN OVERALLS AND LOOKS LIKE WORK.","author":"Thomas Edison","domain":"INNOVATION","tier":1,"source":1,"tags":["work","opportunity","effort"]},{"id":"tr_arena","text":"THE CREDIT BELONGS TO THE MAN WHO IS ACTUALLY IN THE ARENA.","author":"Theodore Roosevelt","domain":"PUBLIC SERVICE","tier":3,"source":3,"tags":["courage","action","resilience"]},{"id":"tr_work","text":"THE BEST PRIZE THAT LIFE OFFERS IS THE CHANCE TO WORK HARD AT WORK WORTH DOING.","author":"Theodore Roosevelt","domain":"PUBLIC SERVICE","tier":2,"source":2,"tags":["work","purpose","effort"]},{"id":"tr_dare","text":"FAR BETTER IT IS TO DARE MIGHTY THINGS THAN TO RANK WITH THOSE POOR SPIRITS WHO NEITHER ENJOY NOR SUFFER MUCH.","author":"Theodore Roosevelt","domain":"PUBLIC SERVICE","tier":2,"source":2,"tags":["courage","risk","achievement"]},{"id":"fdr_fear","text":"THE ONLY THING WE HAVE TO FEAR IS FEAR ITSELF.","author":"Franklin D. Roosevelt","domain":"PUBLIC SERVICE","tier":3,"source":3,"tags":["courage","composure","resilience"]},{"id":"fdr_try","text":"ABOVE ALL, TRY SOMETHING.","author":"Franklin D. Roosevelt","domain":"PUBLIC SERVICE","tier":2,"source":1,"tags":["action","experimentation","courage"]},{"id":"jfk_hard","text":"WE CHOOSE TO GO TO THE MOON, NOT BECAUSE IT IS EASY, BUT BECAUSE IT IS HARD.","author":"John F. Kennedy","domain":"PUBLIC SERVICE","tier":3,"source":3,"tags":["challenge","courage","achievement"]},{"id":"jfk_direction","text":"EFFORTS AND COURAGE ARE NOT ENOUGH WITHOUT PURPOSE AND DIRECTION.","author":"John F. Kennedy","domain":"PUBLIC SERVICE","tier":2,"source":2,"tags":["purpose","direction","courage"]},{"id":"ike_planning","text":"PLANS ARE WORTHLESS, BUT PLANNING IS EVERYTHING.","author":"Dwight Eisenhower","domain":"PUBLIC SERVICE","tier":3,"source":3,"tags":["preparation","adaptability","leadership"]},{"id":"ike_prepare","text":"IN PREPARING FOR BATTLE I HAVE ALWAYS FOUND THAT PLANS ARE USELESS, BUT PLANNING IS INDISPENSABLE.","author":"Dwight Eisenhower","domain":"PUBLIC SERVICE","tier":3,"source":2,"tags":["preparation","adaptability","leadership"]},{"id":"powell_optimism","text":"PERPETUAL OPTIMISM IS A FORCE MULTIPLIER.","author":"Colin Powell","domain":"PUBLIC SERVICE","tier":3,"source":3,"tags":["optimism","leadership","resilience"]},{"id":"powell_calm","text":"REMAIN CALM. BE KIND.","author":"Colin Powell","domain":"PUBLIC SERVICE","tier":3,"source":3,"tags":["composure","kindness","leadership"]},{"id":"powell_work","text":"A DREAM DOESN'T BECOME REALITY THROUGH MAGIC; IT TAKES SWEAT, DETERMINATION AND HARD WORK.","author":"Colin Powell","domain":"PUBLIC SERVICE","tier":2,"source":2,"tags":["work","determination","execution"]},{"id":"reagan_verify","text":"TRUST, BUT VERIFY.","author":"Ronald Reagan","domain":"PUBLIC SERVICE","tier":3,"source":3,"tags":["judgment","standards","leadership"]},{"id":"goggins_done","text":"DON'T STOP WHEN YOU'RE TIRED. STOP WHEN YOU'RE DONE.","author":"David Goggins","domain":"ENDURANCE","tier":3,"source":3,"tags":["discipline","endurance","execution","resilience"]},{"id":"goggins_uncommon","text":"BE UNCOMMON AMONG UNCOMMON PEOPLE.","author":"David Goggins","domain":"ENDURANCE","tier":3,"source":2,"tags":["standards","identity","competition"]},{"id":"jocko_freedom","text":"DISCIPLINE EQUALS FREEDOM.","author":"Jocko Willink","domain":"MILITARY","tier":3,"source":3,"tags":["discipline","ownership","execution"]},{"id":"jocko_excuses","text":"STOP. MAKING. EXCUSES. TAKE ACTION. OWN YOUR DECISIONS. EXECUTE.","author":"Jocko Willink","domain":"MILITARY","tier":3,"source":3,"tags":["ownership","execution","discipline"]},{"id":"jocko_good","text":"GOOD.","author":"Jocko Willink","domain":"MILITARY","tier":2,"source":2,"tags":["resilience","reframe","composure"]},{"id":"mcraven_bed","text":"IF YOU WANT TO CHANGE THE WORLD, START OFF BY MAKING YOUR BED.","author":"Adm. William McRaven","domain":"MILITARY","tier":3,"source":3,"tags":["discipline","standards","momentum"]},{"id":"mcraven_little","text":"IF YOU CAN'T DO THE LITTLE THINGS RIGHT, YOU WILL NEVER DO THE BIG THINGS RIGHT.","author":"Adm. William McRaven","domain":"MILITARY","tier":3,"source":3,"tags":["standards","details","discipline"]},{"id":"mcraven_bell","text":"IF YOU WANT TO CHANGE THE WORLD, NEVER EVER RING THE BELL.","author":"Adm. William McRaven","domain":"MILITARY","tier":3,"source":3,"tags":["resilience","endurance","courage"]},{"id":"seal_never","text":"I WILL NEVER QUIT. I PERSEVERE AND THRIVE ON ADVERSITY.","author":"U.S. Navy SEAL Ethos","domain":"MILITARY","tier":3,"source":2,"tags":["resilience","adversity","team"]},{"id":"kranz_tough","text":"TOUGH AND COMPETENT.","author":"Gene Kranz","domain":"SPACE","tier":3,"source":3,"tags":["standards","competence","resilience"]},{"id":"kranz_risk","text":"THERE IS NO ACHIEVEMENT WITHOUT RISK.","author":"Gene Kranz","domain":"SPACE","tier":3,"source":3,"tags":["courage","risk","achievement"]},{"id":"kranz_believe","text":"YOU HAVE GOT TO BELIEVE IT. YOUR TEAM MUST BELIEVE IT, AND WE MUST MAKE IT HAPPEN.","author":"Gene Kranz","domain":"SPACE","tier":3,"source":3,"tags":["belief","team","execution"]},{"id":"earhart_prepare","text":"PREPARATION, I HAVE OFTEN SAID, IS RIGHTLY TWO-THIRDS OF ANY VENTURE.","author":"Amelia Earhart","domain":"EXPLORATION","tier":2,"source":1,"tags":["preparation","risk","readiness"]},{"id":"tomlin_standard","text":"THE STANDARD IS THE STANDARD.","author":"Mike Tomlin","domain":"SPORTS","tier":3,"source":3,"tags":["standards","consistency","execution"]},{"id":"tomlin_opportunity","text":"I DON'T WORRY ABOUT THE LIMITS. I JUST WORK WITH THE OPPORTUNITY GIVEN.","author":"Mike Tomlin","domain":"SPORTS","tier":3,"source":3,"tags":["adaptability","execution","focus"]},{"id":"tomlin_humble","text":"WE STAY HUMBLE IN TIMES OF EXCELLENCE.","author":"Mike Tomlin","domain":"SPORTS","tier":3,"source":3,"tags":["humility","excellence","mindset"]},{"id":"tomlin_fears","text":"WE DON'T LIVE IN OUR FEARS.","author":"Mike Tomlin","domain":"SPORTS","tier":3,"source":2,"tags":["courage","composure","mindset"]},{"id":"brady_earn","text":"YOU NEED TO EARN IT EVERY DAY.","author":"Tom Brady","domain":"SPORTS","tier":3,"source":3,"tags":["consistency","competition","work"]},{"id":"brady_prepare","text":"CONFIDENCE DOES COME FROM PREPARATION AND SOLID PREPARATION IN PRACTICE.","author":"Tom Brady","domain":"SPORTS","tier":3,"source":3,"tags":["preparation","confidence","practice"]},{"id":"brady_outprepare","text":"WE'RE GOING TO TRY TO OUT-PREPARE THEM THIS WEEK.","author":"Tom Brady","domain":"SPORTS","tier":3,"source":3,"tags":["preparation","competition","execution"]},{"id":"brady_bottom","text":"EVERY TEAM STARTS AT THE BOTTOM EVERY YEAR.","author":"Tom Brady","domain":"SPORTS","tier":2,"source":3,"tags":["reset","humility","competition"]},{"id":"belichick_prep","text":"PRACTICE IS JUST PREPARATION. IT'S NOT PUNISHMENT. IT'S PREPARATION.","author":"Bill Belichick","domain":"SPORTS","tier":3,"source":3,"tags":["preparation","practice","mindset"]},{"id":"belichick_discipline","text":"DISCIPLINE IS, WHEN THE BALL IS SNAPPED, DOING YOUR JOB.","author":"Bill Belichick","domain":"SPORTS","tier":3,"source":3,"tags":["discipline","execution","role"]},{"id":"belichick_job","text":"EACH OF US HAS A JOB TO DO.","author":"Bill Belichick","domain":"SPORTS","tier":3,"source":3,"tags":["role","team","execution"]},{"id":"belichick_control","text":"WE TRY TO CONTROL OUR PREPARATION AND PERFORMANCE.","author":"Bill Belichick","domain":"SPORTS","tier":3,"source":3,"tags":["control","preparation","performance"]},{"id":"saban_process","text":"IT'S THE PROCESS OF WHAT IT TAKES TO DO IT RIGHT SO YOU HAVE THE BEST CHANCE TO GET IT RIGHT.","author":"Nick Saban","domain":"SPORTS","tier":3,"source":3,"tags":["process","preparation","standards"]},{"id":"saban_price","text":"THE PRICE FOR SUCCESS HAS TO BE PAID UP FRONT.","author":"Nick Saban","domain":"SPORTS","tier":3,"source":3,"tags":["work","preparation","success"]},{"id":"saban_discipline","text":"FOCUS, CONCENTRATE AND MAINTAIN OUR DISCIPLINE.","author":"Nick Saban","domain":"SPORTS","tier":3,"source":3,"tags":["focus","discipline","consistency"]},{"id":"saban_hard","text":"TO ESTABLISH MENTAL TOUGHNESS, THINGS HAVE TO BE DIFFICULT.","author":"Nick Saban","domain":"SPORTS","tier":3,"source":3,"tags":["toughness","adversity","growth"]},{"id":"wooden_success","text":"SUCCESS IS PEACE OF MIND FROM KNOWING YOU MADE THE EFFORT TO BECOME THE BEST YOU ARE CAPABLE OF BECOMING.","author":"John Wooden","domain":"SPORTS","tier":3,"source":3,"tags":["effort","standards","peace"]},{"id":"wooden_best","text":"PERFORM AT YOUR BEST ABILITY WHEN YOUR BEST IS REQUIRED.","author":"John Wooden","domain":"SPORTS","tier":3,"source":3,"tags":["performance","readiness","excellence"]},{"id":"wooden_scoreboard","text":"DON'T LOOK AT THE SCOREBOARD.","author":"John Wooden","domain":"SPORTS","tier":2,"source":3,"tags":["process","focus","control"]},{"id":"wooden_industrious","text":"INDUSTRIOUSNESS, SELF-CONTROL, INITIATIVE, INTENTNESS.","author":"John Wooden","domain":"SPORTS","tier":2,"source":3,"tags":["work","control","initiative"]},{"id":"summitt_respect","text":"RESPECT YOURSELF AND OTHERS.","author":"Pat Summitt","domain":"SPORTS","tier":3,"source":3,"tags":["respect","leadership","character"]},{"id":"summitt_responsibility","text":"TAKE FULL RESPONSIBILITY.","author":"Pat Summitt","domain":"SPORTS","tier":3,"source":3,"tags":["ownership","leadership","character"]},{"id":"summitt_discipline","text":"DISCIPLINE YOURSELF SO NO ONE ELSE HAS TO.","author":"Pat Summitt","domain":"SPORTS","tier":3,"source":3,"tags":["discipline","ownership","standards"]},{"id":"summitt_passion","text":"MAKE HARD WORK YOUR PASSION.","author":"Pat Summitt","domain":"SPORTS","tier":3,"source":3,"tags":["work","passion","effort"]},{"id":"summitt_success","text":"HANDLE SUCCESS LIKE YOU HANDLE FAILURE.","author":"Pat Summitt","domain":"SPORTS","tier":3,"source":3,"tags":["composure","success","resilience"]},{"id":"kobe_obsession","text":"WE'RE BOTH CURSED WITH THE OBSESSION OF TRYING TO BE THE BEST THAT WE CAN.","author":"Kobe Bryant","domain":"SPORTS","tier":2,"source":3,"tags":["competition","standards","obsession"]},{"id":"kobe_advice","text":"I WOULD ASK FOR ADVICE, AND HE WOULD GIVE ME ADVICE STRAIGHT FROM HIS HEART.","author":"Kobe Bryant","domain":"SPORTS","tier":1,"source":3,"tags":["learning","humility","growth"]},{"id":"jordan_failure","text":"I'VE FAILED OVER AND OVER AND OVER AGAIN IN MY LIFE. AND THAT IS WHY I SUCCEED.","author":"Michael Jordan","domain":"SPORTS","tier":2,"source":1,"tags":["failure","resilience","success"]},{"id":"ali_days","text":"DON'T COUNT THE DAYS; MAKE THE DAYS COUNT.","author":"Muhammad Ali","domain":"SPORTS","tier":2,"source":1,"tags":["time","action","purpose"]},{"id":"ali_training","text":"I HATED EVERY MINUTE OF TRAINING, BUT I SAID, DO NOT QUIT.","author":"Muhammad Ali","domain":"SPORTS","tier":2,"source":1,"tags":["training","resilience","discipline"]},{"id":"duckworth_grit","text":"GRIT IS LIVING LIFE LIKE IT'S A MARATHON, NOT A SPRINT.","author":"Angela Duckworth","domain":"PSYCHOLOGY","tier":3,"source":3,"tags":["grit","endurance","consistency"]},{"id":"duckworth_endurance","text":"ENTHUSIASM IS COMMON. ENDURANCE IS RARE.","author":"Angela Duckworth","domain":"PSYCHOLOGY","tier":3,"source":2,"tags":["endurance","consistency","enthusiasm"]},{"id":"duckworth_effort","text":"EFFORT COUNTS TWICE.","author":"Angela Duckworth","domain":"PSYCHOLOGY","tier":3,"source":2,"tags":["effort","grit","performance"]},{"id":"dweck_becoming","text":"BECOMING IS BETTER THAN BEING.","author":"Carol Dweck","domain":"PSYCHOLOGY","tier":2,"source":2,"tags":["growth","identity","learning"]},{"id":"dweck_yet","text":"THE POWER OF YET.","author":"Carol Dweck","domain":"PSYCHOLOGY","tier":2,"source":2,"tags":["growth","optimism","learning"]},{"id":"fogg_good","text":"PEOPLE CHANGE BEST BY FEELING GOOD, NOT BY FEELING BAD.","author":"BJ Fogg","domain":"BEHAVIOR","tier":2,"source":2,"tags":["behavior","positive","change"]},{"id":"fogg_small","text":"TINY IS MIGHTY.","author":"BJ Fogg","domain":"BEHAVIOR","tier":2,"source":2,"tags":["behavior","momentum","consistency"]},{"id":"clear_systems","text":"YOU DO NOT RISE TO THE LEVEL OF YOUR GOALS. YOU FALL TO THE LEVEL OF YOUR SYSTEMS.","author":"James Clear","domain":"BEHAVIOR","tier":2,"source":2,"tags":["systems","habit","consistency"]},{"id":"clear_votes","text":"EVERY ACTION YOU TAKE IS A VOTE FOR THE TYPE OF PERSON YOU WISH TO BECOME.","author":"James Clear","domain":"BEHAVIOR","tier":2,"source":2,"tags":["identity","habit","action"]},{"id":"loehr_energy","text":"ENERGY, NOT TIME, IS THE FUNDAMENTAL CURRENCY OF HIGH PERFORMANCE.","author":"Jim Loehr","domain":"PSYCHOLOGY","tier":3,"source":2,"tags":["energy","performance","recovery"]},{"id":"loehr_ritual","text":"THE POWER OF RITUALS IS THAT THEY INSURE THE LEAST POSSIBLE EXPENDITURE OF CONSCIOUS ENERGY.","author":"Jim Loehr","domain":"PSYCHOLOGY","tier":2,"source":1,"tags":["ritual","energy","consistency"]},{"id":"gervais_train","text":"THERE ARE ONLY THREE THINGS WE CAN TRAIN: OUR CRAFT, OUR BODY, AND OUR MIND.","author":"Michael Gervais","domain":"PSYCHOLOGY","tier":3,"source":2,"tags":["mindset","practice","performance"]},{"id":"gervais_present","text":"THE PRESENT MOMENT IS WHERE HIGH PERFORMANCE HAPPENS.","author":"Michael Gervais","domain":"PSYCHOLOGY","tier":2,"source":1,"tags":["focus","presence","performance"]},{"id":"frankl_change","text":"WHEN WE ARE NO LONGER ABLE TO CHANGE A SITUATION, WE ARE CHALLENGED TO CHANGE OURSELVES.","author":"Viktor Frankl","domain":"PSYCHOLOGY","tier":2,"source":1,"tags":["adaptability","resilience","growth"]},{"id":"frankl_why","text":"THOSE WHO HAVE A WHY TO LIVE CAN BEAR WITH ALMOST ANY HOW.","author":"Viktor Frankl","domain":"PSYCHOLOGY","tier":2,"source":1,"tags":["purpose","resilience","meaning"]},{"id":"jobs_time","text":"YOUR TIME IS LIMITED, SO DON'T WASTE IT LIVING SOMEONE ELSE'S LIFE.","author":"Steve Jobs","domain":"BUSINESS","tier":3,"source":3,"tags":["time","purpose","courage"]},{"id":"jobs_voice","text":"DON'T LET THE NOISE OF OTHERS' OPINIONS DROWN OUT YOUR OWN INNER VOICE.","author":"Steve Jobs","domain":"BUSINESS","tier":3,"source":3,"tags":["focus","courage","purpose"]},{"id":"bezos_long","text":"IT IS ALL ABOUT THE LONG TERM.","author":"Jeff Bezos","domain":"BUSINESS","tier":3,"source":3,"tags":["longterm","patience","strategy"]},{"id":"bezos_focus","text":"WE WILL CONTINUE TO FOCUS RELENTLESSLY ON OUR CUSTOMERS.","author":"Jeff Bezos","domain":"BUSINESS","tier":3,"source":3,"tags":["focus","customer","consistency"]},{"id":"bezos_velocity","text":"HIGH-VELOCITY DECISION MAKING.","author":"Jeff Bezos","domain":"BUSINESS","tier":3,"source":3,"tags":["decision","speed","execution"]},{"id":"bezos_trust","text":"YOU EARN TRUST SLOWLY, OVER TIME, BY DOING HARD THINGS WELL.","author":"Jeff Bezos","domain":"BUSINESS","tier":3,"source":3,"tags":["trust","standards","consistency"]},{"id":"nadella_learn","text":"THE LEARN-IT-ALL DOES BETTER THAN THE KNOW-IT-ALL.","author":"Satya Nadella","domain":"BUSINESS","tier":3,"source":3,"tags":["learning","humility","growth"]},{"id":"nadella_growth","text":"KEEP BUILDING OUR KNOWLEDGE AND LOSE OUR FEAR OF FAILURE.","author":"Satya Nadella","domain":"BUSINESS","tier":2,"source":3,"tags":["learning","failure","growth"]},{"id":"buffett_reputation","text":"WE CAN AFFORD TO LOSE MONEY, EVEN A LOT OF MONEY. BUT WE CANNOT AFFORD TO LOSE REPUTATION.","author":"Warren Buffett","domain":"BUSINESS","tier":2,"source":2,"tags":["reputation","integrity","standards"]},{"id":"buffett_habits","text":"CHAINS OF HABIT ARE TOO LIGHT TO BE FELT UNTIL THEY ARE TOO HEAVY TO BE BROKEN.","author":"Warren Buffett","domain":"BUSINESS","tier":2,"source":1,"tags":["habit","discipline","behavior"]},{"id":"buffett_circle","text":"KNOW YOUR CIRCLE OF COMPETENCE AND STICK WITHIN IT.","author":"Warren Buffett","domain":"BUSINESS","tier":2,"source":1,"tags":["competence","focus","judgment"]},{"id":"munger_simple","text":"TAKE A SIMPLE IDEA AND TAKE IT SERIOUSLY.","author":"Charlie Munger","domain":"BUSINESS","tier":2,"source":1,"tags":["focus","simplicity","execution"]},{"id":"munger_learning","text":"GO TO BED SMARTER THAN WHEN YOU WOKE UP.","author":"Charlie Munger","domain":"BUSINESS","tier":2,"source":1,"tags":["learning","consistency","growth"]},{"id":"rogers_helpers","text":"LOOK FOR THE HELPERS. YOU WILL ALWAYS FIND PEOPLE WHO ARE HELPING.","author":"Fred Rogers","domain":"SUPPORT","tier":1,"source":2,"tags":["support","optimism","community"]},{"id":"rogers_feelings","text":"ANYTHING THAT IS HUMAN IS MENTIONABLE, AND ANYTHING THAT IS MENTIONABLE CAN BE MORE MANAGEABLE.","author":"Fred Rogers","domain":"SUPPORT","tier":1,"source":2,"tags":["support","emotion","resilience"]},{"id":"angelou_do","text":"DO THE BEST YOU CAN UNTIL YOU KNOW BETTER. THEN WHEN YOU KNOW BETTER, DO BETTER.","author":"Maya Angelou","domain":"SUPPORT","tier":1,"source":1,"tags":["growth","learning","kindness"]},{"id":"serena_belief","text":"YOU HAVE TO BELIEVE IN YOURSELF WHEN NO ONE ELSE DOES.","author":"Serena Williams","domain":"SPORTS","tier":2,"source":1,"tags":["belief","confidence","resilience"]},{"id":"serena_champion","text":"A CHAMPION IS DEFINED NOT BY THEIR WINS BUT BY HOW THEY CAN RECOVER WHEN THEY FALL.","author":"Serena Williams","domain":"SPORTS","tier":2,"source":1,"tags":["recovery","resilience","competition"]},{"id":"nz_zero","text":"ZERO IS THE ONLY MISS.","author":"NONZERO","domain":"NONZERO","tier":0,"source":0,"tags":["consistency","action"]},{"id":"nz_ten","text":"TEN MINUTES BEATS ZERO.","author":"NONZERO","domain":"NONZERO","tier":0,"source":0,"tags":["consistency","momentum"]},{"id":"nz_board","text":"SHOW UP. PUT A NUMBER ON THE BOARD.","author":"NONZERO","domain":"NONZERO","tier":0,"source":0,"tags":["action","consistency"]},{"id":"nz_identity","text":"MAKE CONSISTENCY THE IDENTITY AND INTENSITY THE VARIABLE.","author":"NONZERO","domain":"NONZERO","tier":0,"source":0,"tags":["consistency","identity","adaptability"]},{"id":"nz_shrink","text":"WHEN RESISTANCE IS HIGH, SHRINK THE TASK INSTEAD OF DELETING IT.","author":"NONZERO","domain":"NONZERO","tier":0,"source":0,"tags":["momentum","adaptability","resilience"]},{"id":"nz_evidence","text":"YOUR FUTURE SELF NEEDS EVIDENCE, NOT ANOTHER INTENTION.","author":"NONZERO","domain":"NONZERO","tier":0,"source":0,"tags":["action","identity","execution"]},{"id":"nz_firstfive","text":"USE THE FIRST FIVE MINUTES TO DEFEAT THE FIRST EXCUSE.","author":"NONZERO","domain":"NONZERO","tier":0,"source":0,"tags":["start","momentum","discipline"]},{"id":"nz_next","text":"PROTECT THE NEXT GOOD CHOICE BEFORE MOTIVATION ARRIVES.","author":"NONZERO","domain":"NONZERO","tier":0,"source":0,"tags":["behavior","preparation","consistency"]}];
const Q_TAGS=['discipline','preparation','resilience','focus','control','consistency','action','growth','wisdom','leadership','competition','support','optimism','mindset','behavior','practice','standards','courage','purpose','learning','execution','recovery'];
function qSafe(s=''){return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,80)}
function qHash(s=''){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
function qInfer(text,author=''){
 const t=(text+' '+author).toLowerCase(),tags=[];
 const map={discipline:['discipline','habit','duty','standard','self-control'],preparation:['prepare','preparation','practice','train','ready'],resilience:['resilien','advers','recover','fall','hardship','endure'],focus:['focus','attention','concentrat','priority'],control:['control','response','choice','reaction'],consistency:['consistent','daily','every day','repeat','routine'],action:['act','action','start','begin','do it','execute'],growth:['grow','improve','better','learn'],wisdom:['wisdom','wise','judgment','perspective'],leadership:['lead','leader','team','command'],competition:['compete','champion','win','victory','opponent'],support:['help','kind','support','together','community'],optimism:['hope','optim','possib','believe'],mindset:['mind','attitude','thought','belief'],behavior:['behavior','environment','cue','choice'],practice:['practice','rehearse','training'],standards:['standard','excellence','quality','detail'],courage:['courage','brave','fear'],purpose:['purpose','meaning','mission'],learning:['learn','study','curious'],execution:['execute','finish','deliver','work'],recovery:['recover','rest','reset']};
 for(const [tag,words] of Object.entries(map))if(words.some(w=>t.includes(w)))tags.push(tag);
 return tags.length?tags.slice(0,5):['mindset','wisdom'];
}
function qNormalize(x,source='cloud'){
 const text=String(x.text??x.content??x.q??x.quote??'').trim(),author=String(x.author??x.a??'Unknown').trim(); if(text.length<18||text.length>260||!author)return null;
 const tags=Array.isArray(x.tags)&&x.tags.length?x.tags.map(qSafe).filter(Boolean).slice(0,6):qInfer(text,author);
 return {id:String(x.id||('ext_'+qHash(author+'|'+text))),text,author,domain:String(x.domain||'DISCOVERY').toUpperCase(),tier:Number(x.tier??1),source:Number(x.source??1),tags,origin:String(x.origin||source)};
}
async function qExternal(env){
 // Optional provider hook. Set QUOTE_SOURCE_URL to any JSON endpoint returning an array
 // of {text,author,tags?}. A ZenQuotes premium endpoint can also be used here.
 if(!env.QUOTE_SOURCE_URL)return [];
 try{const r=await fetch(env.QUOTE_SOURCE_URL,{headers:{'Accept':'application/json'}});if(!r.ok)return[];const b=await r.json();const arr=Array.isArray(b)?b:(Array.isArray(b.quotes)?b.quotes:[]);return arr.map(x=>qNormalize(x,'external')).filter(Boolean).slice(0,500)}catch{return[]}
}
async function qCatalog(env){
 const raw=await env.NONZERO_STATE.get('quotes:external');let ext=[];if(raw)try{ext=JSON.parse(raw)}catch{}
 const seen=new Set(),out=[];for(const q of [...QUOTE_SEED,...ext]){const n=qNormalize(q,q.origin||'curated');if(!n)continue;const k=(n.author+'|'+n.text).toLowerCase();if(seen.has(k))continue;seen.add(k);out.push(n)}return out;
}
async function qProfile(env,device){const raw=await env.NONZERO_STATE.get('quotes:profile:'+qSafe(device));if(raw)try{return JSON.parse(raw)}catch{};return{tags:{},authors:{},domains:{},likedIds:[],dislikedIds:[],recentIds:[],recentAuthors:[],impressions:{}}}
function qBump(obj,k,d,lo=-12,hi=18){obj[k]=Math.max(lo,Math.min(hi,Number(obj[k]||0)+d))}
function qScore(q,p,mode,jitter){let s=80+q.source*7+q.tier*4;for(const t of q.tags)s+=(p.tags[t]||0)*(mode==='discovery'?4:9);s+=(p.domains[q.domain]||0)*(mode==='discovery'?2:6);s+=(p.authors[qSafe(q.author)]||0)*(mode==='discovery'?1:7);const imp=Number(p.impressions[q.id]||0);s-=imp*(mode==='discovery'?10:4);if(p.recentIds.includes(q.id))s-=1000;if(p.recentAuthors.slice(-12).includes(q.author))s-=mode==='discovery'?140:330;if(p.dislikedIds.includes(q.id))s-=900;if(mode==='discovery'){s+=q.tier<=1?32:0;s+=Math.max(0,8-imp)*5;if(!p.authors[qSafe(q.author)])s+=45}return s+jitter}
async function qFeed(env,device,limit=80){const p=await qProfile(env,device),cat=await qCatalog(env),n=Math.max(20,Math.min(120,Number(limit)||80));const now=Date.now();const picks=[],used=new Set();for(let slot=0;slot<n&&used.size<cat.length;slot++){const r=slot%10,mode=r<7?'match':(r<9?'discovery':'wildcard');let best=[];for(let i=0;i<cat.length;i++){const q=cat[i];if(used.has(q.id))continue;let score=qScore(q,p,mode,(qHash(q.id+device+slot+Math.floor(now/3600000)).charCodeAt(0)%37));if(mode==='wildcard'&&p.authors[qSafe(q.author)])score-=35;best.push([score,q])}best.sort((a,b)=>b[0]-a[0]);const band=best.slice(0,Math.min(mode==='match'?12:30,best.length));if(!band.length)break;const ix=(parseInt(qHash(device+slot+Math.floor(now/600000)),36)||0)%band.length;const q=band[ix][1];used.add(q.id);picks.push({...q,recommendation:mode})}return{version:4,generatedAt:now,strategy:'70-match-20-adjacent-10-wildcard',catalogSize:cat.length,quotes:picks}}
async function qFeedback(env,body){const device=qSafe(body.device||'');if(device.length<6)throw new Error('invalid_device');const id=String(body.id||''),action=String(body.action||'next'),cat=await qCatalog(env),q=cat.find(x=>x.id===id);if(!q)throw new Error('quote_not_found');const p=await qProfile(env,device);p.impressions[id]=Number(p.impressions[id]||0)+1;p.recentIds=[...p.recentIds.filter(x=>x!==id),id].slice(-120);p.recentAuthors=[...p.recentAuthors,q.author].slice(-30);if(action==='more'){if(!p.likedIds.includes(id))p.likedIds=[...p.likedIds,id].slice(-200);p.dislikedIds=p.dislikedIds.filter(x=>x!==id);qBump(p.authors,qSafe(q.author),2);qBump(p.domains,q.domain,1);for(const t of q.tags)qBump(p.tags,t,2)}else if(action==='less'){if(!p.dislikedIds.includes(id))p.dislikedIds=[...p.dislikedIds,id].slice(-200);p.likedIds=p.likedIds.filter(x=>x!==id);qBump(p.authors,qSafe(q.author),-3);qBump(p.domains,q.domain,-1);for(const t of q.tags)qBump(p.tags,t,-2)}else{for(const t of q.tags)qBump(p.tags,t,-0.15)}await env.NONZERO_STATE.put('quotes:profile:'+device,JSON.stringify(p));return{ok:true,learned:{author:q.author,domain:q.domain,tags:q.tags,action},profile:{topTags:Object.entries(p.tags).sort((a,b)=>b[1]-a[1]).slice(0,8)}}}
async function qMaybeRefresh(env){const last=Number(await env.NONZERO_STATE.get('quotes:external:updated')||0);if(Date.now()-last<6*3600000)return;const ext=await qExternal(env);if(ext.length){await env.NONZERO_STATE.put('quotes:external',JSON.stringify(ext));await env.NONZERO_STATE.put('quotes:external:updated',String(Date.now()))}}


// --- NONZERO durable Roku pairing v4.5 ------------------------------------
// Pair codes remain short-lived. The claimed Wall credential is now STATELESS
// and has no TTL. It deterministically carries the user's opaque state hash,
// protected by a format check. There is no wall:<tokenHash> KV lookup that can
// expire, be evicted, or disappear during a deployment.
//
// Security model: the embedded value is already SHA-256(private sync key).
// Possession of the Wall token is a bearer read capability, as before. It does
// not reveal the private sync key and is accepted only by the read-only Wall path.
// Legacy v4.1-v4.4 tokens remain supported through their old KV mapping.
const PAIR_TTL_SECONDS=600;
const WALL_TOKEN_PREFIX='nz2';
const WALL_TOKEN_CONTEXT='NONZERO-WALL-V2|';

function randomDigits6(){const a=new Uint32Array(1);crypto.getRandomValues(a);return String(100000+(a[0]%900000))}
async function makeDurableWallToken(storageKey){
 const userHash=String(storageKey||'').replace(/^state:/,'').toLowerCase();
 if(!/^[a-f0-9]{64}$/.test(userHash))throw new Error('invalid_storage_identity');
 const check=(await hashKey(WALL_TOKEN_CONTEXT+userHash)).slice(0,24);
 return WALL_TOKEN_PREFIX+'.'+userHash+'.'+check;
}
async function decodeDurableWallToken(token){
 const s=String(token||'').trim().toLowerCase();
 const parts=s.split('.');
 if(parts.length!==3||parts[0]!==WALL_TOKEN_PREFIX||!/^[a-f0-9]{64}$/.test(parts[1])||!/^[a-f0-9]{24}$/.test(parts[2]))return null;
 const expected=(await hashKey(WALL_TOKEN_CONTEXT+parts[1])).slice(0,24);
 if(parts[2]!==expected)return null;
 return 'state:'+parts[1];
}
async function pairCreate(env,storageKey){
 let code='';
 for(let i=0;i<8;i++){const c=randomDigits6();if(!await env.NONZERO_STATE.get('pair:code:'+c)){code=c;break}}
 if(!code)throw new Error('pair_code_generation_failed');
 const wallToken=await makeDurableWallToken(storageKey);
 await env.NONZERO_STATE.put('pair:code:'+code,JSON.stringify({storageKey,wallToken,createdAt:Date.now(),credentialVersion:2}),{expirationTtl:PAIR_TTL_SECONDS});
 return {code,expiresInSeconds:PAIR_TTL_SECONDS,durablePairing:true,credentialVersion:2};
}
async function pairClaim(env,body){
 const code=String(body?.code||'').trim();if(!/^\d{6}$/.test(code))throw new Error('pair_code_expired_or_invalid');
 const key='pair:code:'+code,raw=await env.NONZERO_STATE.get(key);if(!raw)throw new Error('pair_code_expired_or_invalid');
 let rec;try{rec=JSON.parse(raw)}catch{throw new Error('pair_code_expired_or_invalid')}
 if(!rec?.storageKey||!rec?.wallToken)throw new Error('pair_code_expired_or_invalid');
 await env.NONZERO_STATE.delete(key);
 return {wallToken:rec.wallToken,durablePairing:true,credentialVersion:2};
}
async function wallState(env,wallToken){
 const token=String(wallToken||'').trim();if(token.length<24)throw new Error('missing_or_invalid_key');

 // v4.5+ path: no pairing record lookup, no expiry, no deployment coupling.
 let storageKey=await decodeDurableWallToken(token);

 // Backward compatibility for currently paired Walls. These old credentials
 // continue to work until their legacy KV record expires; re-pair ONCE on v4.5
 // upgrades the device permanently to a stateless nz2 credential.
 if(!storageKey)storageKey=await env.NONZERO_STATE.get('wall:'+await hashKey(token));
 if(!storageKey)throw new Error('missing_or_invalid_key');

 const raw=await env.NONZERO_STATE.get(storageKey);
 return raw?new Response(raw,{status:200,headers:{...cors,'Content-Type':'application/json','X-NONZERO-Pairing':'durable'}}):json({state:null,updatedAt:0});
}

export default {
 async fetch(request,env){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});const url=new URL(request.url);
  if(url.pathname==='/health')return json({ok:true,service:'nonzero-sync',version:'4.6',ergDataFirst:true,quoteDiscovery:true,rokuPairing:true,durablePairing:true,pairingModel:'stateless-v2',legacyPairing:true,revisionedState:true,canonicalState:true,bikeErgAuto:true,simpleShortcut:true,directShortcut:true,concept2:!!env.C2_API_TOKEN});
  if(url.pathname==='/quotes/feed'&&request.method==='GET'){const device=url.searchParams.get('device')||'';if(qSafe(device).length<6)return json({error:'invalid_device'},400);return json(await qFeed(env,device,url.searchParams.get('limit')||80))}
  if(url.pathname==='/quotes/feedback'&&request.method==='POST'){let b;try{b=await request.json()}catch{return json({error:'invalid_json'},400)}try{return json(await qFeedback(env,b))}catch(e){return json({error:e.message},400)}}
  if(url.pathname==='/pair/claim'&&request.method==='POST'){let b;try{b=await request.json()}catch{return json({error:'invalid_json'},400)}try{return json(await pairClaim(env,b))}catch(e){return json({error:e.message},400)}}
  if(url.pathname==='/state'&&request.method==='GET'&&request.headers.get('X-NONZERO-Wall')){try{return await wallState(env,request.headers.get('X-NONZERO-Wall'))}catch(e){return json({error:e.message},401)}}

  // v4.4 direct BikeErg capability URL.
  // The path value is SHA-256(private sync key), generated locally in the phone.
  // It can START the matching BikeErg session only; it cannot read/write general state.
  if(request.method==='GET'&&url.pathname.startsWith('/automation/bikeerg/direct/')){
   const userHash=url.pathname.slice('/automation/bikeerg/direct/'.length).trim().toLowerCase();
   if(!/^[a-f0-9]{64}$/.test(userHash))return json({error:'invalid_direct_automation_token'},401);
   const storageKey='state:'+userHash;
   const existing=await env.NONZERO_STATE.get(storageKey);
   if(!existing)return json({error:'state_not_initialized'},409);
   try{
    const x=await startErg(env,storageKey,userHash,{ergType:'bike',source:'ergdata-app-open'});
    return json({ok:true,status:'active',mode:'bikeerg-auto',wall:'performance',directShortcut:true,idempotent:x.idempotent});
   }catch(e){return json({error:e.message},409)}
  }

  if(request.method==='GET'&&url.pathname.startsWith('/automation/bikeerg/run/')){
   const token=url.pathname.slice('/automation/bikeerg/run/'.length).trim();
   if(!/^[a-f0-9]{64}$/i.test(token))return json({error:'invalid_automation_token'},401);
   const tokenHash=await hashKey(token);
   const raw=await env.NONZERO_STATE.get('bikeerg-automation:'+tokenHash);
   if(!raw)return json({error:'invalid_or_revoked_automation_token'},401);
   let rec;try{rec=JSON.parse(raw)}catch{return json({error:'invalid_or_revoked_automation_token'},401)}
   if(!rec?.storageKey||!rec?.userHash)return json({error:'invalid_or_revoked_automation_token'},401);
   try{
    const x=await startErg(env,rec.storageKey,rec.userHash,{ergType:'bike',source:'ergdata-app-open'});
    return json({ok:true,status:'active',mode:'bikeerg-auto',wall:'performance',idempotent:x.idempotent});
   }catch(e){return json({error:e.message},409)}
  }
  const key=validKey(request);if(!key)return json({error:'missing_or_invalid_key'},401);const hash=await hashKey(key),storageKey='state:'+hash;
  if(url.pathname==='/pair/create'&&request.method==='POST'){try{return json(await pairCreate(env,storageKey))}catch(e){return json({error:e.message},500)}}
  if(url.pathname==='/state'){
   if(request.method==='GET'){const raw=await env.NONZERO_STATE.get(storageKey);return raw?new Response(raw,{status:200,headers:{...cors,'Content-Type':'application/json'}}):json({state:null,updatedAt:0})}
   if(request.method==='PUT'){
    let b;try{b=await request.json()}catch{return json({error:'invalid_json'},400)}
    if(!b||typeof b.state!=='object'||!Array.isArray(b.state.sessions))return json({error:'invalid_state'},400);
    try{
     const payload=await writePayload(env,storageKey,b.state,{baseRevision:b.baseRevision});
     return json({ok:true,state:payload.state,updatedAt:payload.updatedAt,revision:payload.revision});
    }catch(e){
     if(e.code==='state_conflict')return json({error:'state_conflict',current:e.current},409);
     return json({error:e.message||'state_write_failed'},500);
    }
   }
   return json({error:'method_not_allowed'},405);
  }

  if(url.pathname==='/automation/bikeerg/setup'&&request.method==='POST'){
   let old=null;try{old=JSON.parse(await env.NONZERO_STATE.get('bikeerg-automation-current:'+hash)||'null')}catch{}
   if(old?.tokenHash)await env.NONZERO_STATE.delete('bikeerg-automation:'+old.tokenHash);
   const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);
   const token=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
   const tokenHash=await hashKey(token);
   await env.NONZERO_STATE.put('bikeerg-automation:'+tokenHash,JSON.stringify({storageKey,userHash:hash,createdAt:Date.now()}));
   await env.NONZERO_STATE.put('bikeerg-automation-current:'+hash,JSON.stringify({tokenHash,createdAt:Date.now()}));
   const origin=new URL(request.url).origin;
   return json({ok:true,triggerUrl:origin+'/automation/bikeerg/run/'+token});
  }
  if(url.pathname==='/automation/bikeerg/revoke'&&request.method==='POST'){
   let old=null;try{old=JSON.parse(await env.NONZERO_STATE.get('bikeerg-automation-current:'+hash)||'null')}catch{}
   if(old?.tokenHash)await env.NONZERO_STATE.delete('bikeerg-automation:'+old.tokenHash);
   await env.NONZERO_STATE.delete('bikeerg-automation-current:'+hash);
   return json({ok:true,revoked:true});
  }
  if(url.pathname==='/concept2/latest'&&request.method==='GET'){try{const r=await latestConcept2(env,url.searchParams.get('from')||localDate());return json({result:r})}catch(e){return json({error:e.message},503)}}
  if(url.pathname==='/intent/bikeerg/start'&&request.method==='POST'){let b={};try{b=await request.json()}catch{}b={...b,ergType:'bike',source:b.source||'ergdata-shortcut'};try{const x=await startErg(env,storageKey,hash,b);return json({ok:true,mode:'bikeerg-auto',wall:'performance',activeWorkout:x.state.activeWorkout,idempotent:x.idempotent})}catch(e){return json({error:e.message},409)}}
  if(url.pathname==='/intent/erg/start'&&request.method==='POST'){let b={};try{b=await request.json()}catch{}try{const x=await startErg(env,storageKey,hash,b);return json({ok:true,activeWorkout:x.state.activeWorkout,idempotent:x.idempotent})}catch(e){return json({error:e.message},409)}}
  if(url.pathname==='/intent/erg/pause'&&request.method==='POST'){try{const x=await pauseErg(env,storageKey);return json({ok:true,activeWorkout:x.state.activeWorkout})}catch(e){return json({error:e.message},409)}}
  if(url.pathname==='/intent/erg/reset'&&request.method==='POST'){try{const x=await resetErg(env,storageKey,hash);return json({ok:true,activeWorkout:x.state.activeWorkout})}catch(e){return json({error:e.message},409)}}
  return json({error:'not_found'},404);
 },
 async scheduled(event,env,ctx){
  ctx.waitUntil((async()=>{await qMaybeRefresh(env);let cursor;do{const page=await env.NONZERO_STATE.list({prefix:'erg-active:',cursor});for(const k of page.keys){const raw=await env.NONZERO_STATE.get(k.name);if(!raw)continue;try{await reconcileOne(env,k.name.slice('erg-active:'.length),JSON.parse(raw))}catch{}}cursor=page.list_complete?undefined:page.cursor}while(cursor)})());
 }
};
