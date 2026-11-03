// NONZERO Nutrition Cloud v7.18.0.0 (legacy v1) — single-user D1 API. No credentials in source.
const kinds = new Set(['food','favorite','target','recipe','meal_plan','weight','autopilot_agenda']);
const json=(x,status=200,headers={})=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
function cors(req,env){const origin=req.headers.get('Origin')||'';const allowed=(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);return origin&&allowed.includes(origin)?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin'}:{};}
function validPayload(kind,p){if(!p||typeof p!=='object'||Array.isArray(p))return false;if(kind==='food')return typeof p.name==='string'&&p.name.length<=180&&/^\d{4}-\d\d-\d\d$/.test(p.day||'')&&['cal','protein','carbs','fat'].every(k=>p[k]===null||(Number.isFinite(p[k])&&p[k]>=0&&p[k]<=100000));if(kind==='weight')return typeof p.day==='string'&&Number.isFinite(p.value)&&p.value>0&&p.value<1000;return JSON.stringify(p).length<=24000;}
function nutrients(f){const a={};for(const n of f.foodNutrients||[]){const id=Number(n.nutrientId||n.nutrient?.id);const name=String(n.nutrientName||n.nutrient?.name||'').toLowerCase();const value=Number(n.value??n.amount);if(!Number.isFinite(value))continue;
 if(id===1008||(name.includes('energy')&&String(n.unitName||n.nutrient?.unitName||'').toLowerCase()==='kcal'))a.cal=value;
 if(id===1003||name==='protein')a.protein=value;if(id===1005||name==='carbohydrate, by difference')a.carbs=value;if(id===1004||name==='total lipid (fat)')a.fat=value;if(id===1079||name==='fiber, total dietary')a.fiber=value;}return a}
function usdaFood(f){if(!f?.description)return null;const a=nutrients(f);if(['cal','protein','carbs','fat'].some(k=>!Number.isFinite(a[k])))return null;return {name:[f.brandOwner||f.brandName,f.description].filter(Boolean).join(' · ').slice(0,180),code:String(f.gtinUpc||''),serving:f.servingSize?String(f.servingSize)+' '+String(f.servingSizeUnit||'g'):'100 g',grams:f.servingSizeUnit?.toLowerCase()==='g'?Number(f.servingSize):100,per100:{cal:a.cal,protein:a.protein,carbs:a.carbs,fat:a.fat,fiber:a.fiber??null},source:'USDA FoodData Central',fdcId:f.fdcId,confidence:'database'}}
function offFood(f){if(!f)return null;const n=f.nutriments||{},num=k=>{const x=Number(n[k+'_100g']);return Number.isFinite(x)&&x>=0?x:null};const a={cal:num('energy-kcal'),protein:num('proteins'),carbs:num('carbohydrates'),fat:num('fat'),fiber:num('fiber')};if(['cal','protein','carbs','fat'].some(k=>a[k]===null))return null;return {name:[f.brands,f.product_name||f.product_name_en].filter(Boolean).join(' · ').slice(0,180),code:String(f.code||''),serving:String(f.serving_size||'100 g'),grams:Number.parseFloat(f.serving_quantity)||100,per100:a,source:'Open Food Facts (community)',confidence:'community'}}

export default {async fetch(req,env){const h=cors(req,env);if(req.method==='OPTIONS')return new Response(null,{status:Object.keys(h).length?204:403,headers:h});const send=(x,s=200)=>json(x,s,h);
try{
 const url=new URL(req.url);if(url.pathname==='/version')return send({product:'NONZERO',component:'nutrition-api',version:'7.19.0',platformBaseline:'7.18.0',legacyVersion:'1',schema:1});
 if(url.pathname==='/health')return send({ok:true,service:'nonzero-nutrition',schema:1,version:'7.19.0',platformBaseline:'7.18.0'});
 if(!env.DB||!env.API_TOKEN)return send({error:'server_not_configured'},503);
 const auth=req.headers.get('Authorization')||'';if(auth!==`Bearer ${env.API_TOKEN}`)return send({error:'unauthorized'},401);

 // Conversational nutrition: reserve budget before calling AI; never expose API keys.
 if(url.pathname==='/v3/nutrition/usage'&&req.method==='GET'){
  const month=new Date().toISOString().slice(0,7);
  const row=await env.DB.prepare('SELECT spent_usd,reserved_usd,requests FROM nutrition_ai_usage WHERE month=?').bind(month).first();
  return send({month,spentUsd:row?.spent_usd||0,reservedUsd:row?.reserved_usd||0,requests:row?.requests||0,warningUsd:3,limitUsd:5});
 }
 if(url.pathname==='/v3/nutrition/interpret'&&req.method==='POST'){
  if(!env.OPENAI_API_KEY)return send({error:'ai_not_configured'},503);
  if(Number(req.headers.get('content-length')||0)>16000)return send({error:'too_large'},413);
  let b;try{b=await req.json()}catch{return send({error:'invalid_json'},400)}
  const description=String(b?.text||'').trim();
  if(description.length<3||description.length>3000)return send({error:'invalid_description'},400);
  const known=Array.isArray(b?.knownFoods)?b.knownFoods.slice(0,12).map(f=>({name:String(f.name||'').slice(0,100),cal:Number(f.cal)||0,protein:Number(f.protein)||0,carbs:Number(f.carbs)||0,fat:Number(f.fat)||0})):[];
  const month=new Date().toISOString().slice(0,7),reservation=0.03;
  await env.DB.prepare('INSERT OR IGNORE INTO nutrition_ai_usage(month,spent_usd,reserved_usd,requests) VALUES(?,0,0,0)').bind(month).run();
  const reserved=await env.DB.prepare('UPDATE nutrition_ai_usage SET reserved_usd=reserved_usd+? WHERE month=? AND spent_usd+reserved_usd+?<=5').bind(reservation,month,reservation).run();
  if(reserved.meta.changes!==1)return send({error:'monthly_ai_budget_reached',limitUsd:5},429);
  let actual=0;
  try{
   const model=env.OPENAI_NUTRITION_MODEL||'gpt-4.1-mini';
   const messages=[{role:'system',content:'Interpret a natural-language meal log. Return JSON with items array. Each item has name, meal (Breakfast|Lunch|Dinner|Snack), quantityDescription, cal, protein, carbs, fat, fiber (number or null), confidence (low|medium|high), basis (saved_food|label|standard_estimate), notes. Also return assumptions array of strings and one short clarification string (empty if not necessary). Split multi-food entries into separate items. Use supplied known foods only if they clearly match; do not invent branded label values. If amounts are missing, estimate plausible standard portions, clearly mark low confidence. If a dish is ambiguous, give a conservative ballpark estimate and say so. Never claim exact measurements. Do not include dietary advice. No markdown.'},{role:'user',content:JSON.stringify({description,knownFoods:known})}];
   const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model,temperature:0.1,max_tokens:1100,response_format:{type:'json_object'},messages}),signal:AbortSignal.timeout(25000)});
   if(!r.ok)return send({error:'nutrition_ai_unavailable'},502);
   const raw=await r.json();
   // Conservative per-token estimates for gpt-4.1-mini; configurable via Worker vars.
   const inputRate=Math.max(0,Number(env.AI_INPUT_USD_PER_M_TOKEN)||0.4),outputRate=Math.max(0,Number(env.AI_OUTPUT_USD_PER_M_TOKEN)||1.6);
   actual=Math.min(reservation,Math.max(0.000001,((raw.usage?.prompt_tokens||0)*inputRate+(raw.usage?.completion_tokens||0)*outputRate)/1000000));
   let parsed;try{parsed=JSON.parse(raw.choices?.[0]?.message?.content||'{}')}catch{return send({error:'invalid_ai_response'},502)}
   const fields=['cal','protein','carbs','fat','fiber'];
   const items=(Array.isArray(parsed.items)?parsed.items:[]).slice(0,15).map(x=>{
    const o={name:String(x.name||'Food').slice(0,150),meal:['Breakfast','Lunch','Dinner','Snack'].includes(x.meal)?x.meal:'Snack',quantityDescription:String(x.quantityDescription||'Estimated serving').slice(0,150),confidence:['low','medium','high'].includes(x.confidence)?x.confidence:'low',basis:['saved_food','label','standard_estimate'].includes(x.basis)?x.basis:'standard_estimate',notes:String(x.notes||'').slice(0,300)};
    for(const k of fields)o[k]=typeof x[k]==='number'&&Number.isFinite(x[k])&&x[k]>=0&&x[k]<=10000?Math.round(x[k]*10)/10:null;
    return o;
   });
   if(!items.length)return send({error:'no_foods_identified'},422);
   return send({items,assumptions:(Array.isArray(parsed.assumptions)?parsed.assumptions:[]).slice(0,5).map(x=>String(x).slice(0,200)),clarification:String(parsed.clarification||'').slice(0,250),estimated:true,model,usage:{estimatedUsd:actual}});
  }finally{
   await env.DB.prepare('UPDATE nutrition_ai_usage SET reserved_usd=MAX(0,reserved_usd-?),spent_usd=spent_usd+?,requests=requests+1 WHERE month=?').bind(reservation,actual,month).run();
  }
 }

 // Smart catalog endpoints; existing D1 records and synchronization remain unchanged.
 if(url.pathname==='/v2/food/catalog'&&req.method==='POST'){
  let b;try{b=await req.json()}catch{return send({error:'invalid_json'},400)}
  const f=b?.food||{},name=String(f.name||'').trim().slice(0,180),brand=String(f.brand||'').trim().slice(0,100);
  if(name.length<2||JSON.stringify(b).length>8000||!['cal','protein','carbs','fat'].every(k=>Number.isFinite(Number((f.per100||f)[k]))&&Number((f.per100||f)[k])>=0))return send({error:'invalid_food'},400);
  const id=String(f.code||f.fdcId||('custom:'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-'))).slice(0,120);
  const payload=JSON.stringify({...f,name,brand,source:f.source||'Personal verified',verifiedByUser:true});
  await env.DB.prepare("INSERT INTO food_catalog (id,name,brand,normalized,payload,uses,updated_at) VALUES(?,?,?,?,?,1,datetime('now')) ON CONFLICT(id) DO UPDATE SET name=excluded.name,brand=excluded.brand,normalized=excluded.normalized,payload=excluded.payload,uses=food_catalog.uses+1,updated_at=datetime('now')").bind(id,name,brand,(brand+' '+name).toLowerCase(),payload).run();
  return send({ok:true,id});
 }
 if(url.pathname==='/v2/food/search'&&req.method==='GET'){
  const term=String(url.searchParams.get('q')||'').trim().slice(0,100);
  if(term.length<2)return send({foods:[],query:term,hint:'type_more'});
  const norm=term.toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  const tokens=norm.split(' ').filter(Boolean);if(!tokens.length)return send({foods:[],query:term,hint:'type_more'});
  const matches=await env.DB.prepare('SELECT payload,uses FROM food_catalog ORDER BY uses DESC, updated_at DESC LIMIT 500').all();
  const local=(matches.results||[]).map(x=>{try{return {...JSON.parse(x.payload),uses:x.uses,source:JSON.parse(x.payload).source||'My foods'}}catch{return null}}).filter(Boolean);
  let external=[];const cacheKey='smart:'+norm;
  const cached=await env.DB.prepare('SELECT payload FROM food_search_cache WHERE cache_key=? AND expires_at>datetime(\'now\')').bind(cacheKey).first();
  if(cached){try{external=JSON.parse(cached.payload)}catch{}}
  else {
   const queries=[];
   if(env.USDA_API_KEY){queries.push((async()=>{try{const u=new URL('https://api.nal.usda.gov/fdc/v1/foods/search');u.searchParams.set('api_key',env.USDA_API_KEY);u.searchParams.set('query',term);u.searchParams.set('pageSize','45');const r=await fetch(u,{signal:AbortSignal.timeout(9500)});if(!r.ok)return [];const j=await r.json();return (j.foods||[]).map(f=>{const item=usdaFood(f);return item?{...item,brand:String(f.brandOwner||f.brandName||''),shortName:String(f.description||'').slice(0,90)}:null}).filter(Boolean)}catch{return []}})());}
   // Open Food Facts text search is rate-limited; only call for brand-like searches, never per keystroke.
   if(tokens.length>=2){queries.push((async()=>{try{const u=new URL('https://world.openfoodfacts.org/cgi/search.pl');u.searchParams.set('search_terms',term);u.searchParams.set('search_simple','1');u.searchParams.set('action','process');u.searchParams.set('json','1');u.searchParams.set('page_size','15');const r=await fetch(u,{headers:{'User-Agent':'NONZERO-Nutrition/7.19.0 (food search)'},signal:AbortSignal.timeout(8500)});if(!r.ok)return [];const j=await r.json();return (j.products||[]).map(f=>{const item=offFood(f);return item?{...item,brand:String(f.brands||''),shortName:String(f.product_name||f.product_name_en||'').slice(0,90)}:null}).filter(Boolean)}catch{return []}})());}
   external=(await Promise.all(queries)).flat();
   await env.DB.prepare("INSERT INTO food_search_cache(cache_key,payload,expires_at) VALUES(?,?,datetime('now','+12 hours')) ON CONFLICT(cache_key) DO UPDATE SET payload=excluded.payload,expires_at=excluded.expires_at").bind(cacheKey,JSON.stringify(external.slice(0,90))).run();
  }
  const score=f=>{const text=String([f.brand,f.shortName,f.name].filter(Boolean).join(' ')).toLowerCase().replace(/[^a-z0-9 ]/g,' '),words=text.split(/\s+/),hits=tokens.filter(t=>words.some(w=>w===t||w.startsWith(t)||(t.length>=5&&w.includes(t)))).length;
    if(!hits||hits<tokens.length)return -1;let n=hits*20+((text.includes(norm))?45:0)+((String(f.brand||'').toLowerCase().includes(tokens[0]))?12:0)+(f.verifiedByUser?65:0)+Math.min(20,Number(f.uses||0)*3);return n;};
  const seen=new Set();const ranked=[...local,...external].map(f=>({...f,score:score(f)})).filter(f=>f.score>=0).sort((a,b)=>b.score-a.score).filter(f=>{const key=(String(f.code||'')||String(f.brand||'')+'|'+String(f.shortName||f.name||'')).toLowerCase();if(seen.has(key))return false;seen.add(key);return true}).slice(0,10);
  return send({foods:ranked,query:term,noExactMatch:!ranked.some(f=>f.score>=75),sources:['personal','USDA','Open Food Facts']});
 }
 // Nutrition intelligence endpoints: credentials remain server-side.
 if(url.pathname==='/v1/food/search'&&req.method==='GET'){
  const term=(url.searchParams.get('q')||'').trim();if(term.length<2||term.length>100)return send({error:'invalid_query'},400);
  if(!env.USDA_API_KEY)return send({error:'usda_not_configured'},503);
  const u=new URL('https://api.nal.usda.gov/fdc/v1/foods/search');u.searchParams.set('api_key',env.USDA_API_KEY);u.searchParams.set('query',term);u.searchParams.set('pageSize','40');
  const response=await fetch(u,{method:'GET',signal:AbortSignal.timeout(12000)});if(!response.ok)return send({error:'usda_unavailable'},502);
  const data=await response.json();
  const words=term.toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(x=>x.length>1);
  const ranked=(data.foods||[]).map(f=>{const item=usdaFood(f);if(!item)return null;
    const title=String(f.description||'').toLowerCase(),brand=String(f.brandOwner||f.brandName||'').toLowerCase(),all=(brand+' '+title).replace(/[^a-z0-9 ]/g,' ');
    const hits=words.filter(t=>all.includes(t)).length;
    const score=hits*10+(words.length&&hits===words.length?50:0)+(brand&&words.some(t=>brand.includes(t))?15:0)+(title.startsWith(term.toLowerCase())?12:0);
    return {...item,brand:String(f.brandOwner||f.brandName||'').slice(0,70),shortName:String(f.description||'').slice(0,110),score};
  }).filter(Boolean).filter(f=>f.score>=(words.length>=3?20:10)).sort((a,b)=>b.score-a.score).slice(0,12);
  return send({foods:ranked,source:'USDA FoodData Central',query:term,noExactMatch:!ranked.some(f=>f.score>=50)});
 }
 if(url.pathname==='/v1/food/barcode'&&req.method==='GET'){
  const code=(url.searchParams.get('code')||'').trim();if(!/^\d{8,14}$/.test(code))return send({error:'invalid_barcode'},400);
  let off=null,usda=null;
  try{const r=await fetch('https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(code)+'.json',{headers:{'User-Agent':'NONZERO-Nutrition/7.18.2 (personal food logging)'},signal:AbortSignal.timeout(10000)});if(r.ok){const j=await r.json();if(j.status===1)off=offFood(j.product)}}catch(_){}
  if(env.USDA_API_KEY){try{const u=new URL('https://api.nal.usda.gov/fdc/v1/foods/search');u.searchParams.set('api_key',env.USDA_API_KEY);u.searchParams.set('query',code);u.searchParams.set('dataType','Branded');u.searchParams.set('pageSize','15');const r=await fetch(u,{signal:AbortSignal.timeout(12000)});if(r.ok){const j=await r.json();usda=(j.foods||[]).filter(f=>String(f.gtinUpc||'').replace(/^0+/,'')===code.replace(/^0+/,'')).map(usdaFood).filter(Boolean)[0]||null}}catch(_){}}
  return send({foods:[usda,off].filter(Boolean),barcode:code});
 }
 if(url.pathname==='/v1/food/analyze'&&req.method==='POST'){
  if(!env.OPENAI_API_KEY)return send({error:'photo_ai_not_configured'},503);
  if(Number(req.headers.get('content-length')||0)>4500000)return send({error:'image_too_large'},413);
  let body;try{body=await req.json()}catch{return send({error:'invalid_json'},400)}
  if(!['meal','label'].includes(body?.mode)||typeof body?.image!=='string'||body.image.length>4200000||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(body.image))return send({error:'invalid_image'},400);
  const instruction=body.mode==='label'?'Read only visible Nutrition Facts. Extract values per serving, serving description, and food name if visible. Do not invent missing numbers.':'Identify likely foods and estimate TOTAL meal nutrition, including uncertainty from portions, oil and hidden ingredients. Do not imply measurements are exact.';
  const ai=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:env.OPENAI_VISION_MODEL||'gpt-4.1-mini',temperature:0.1,response_format:{type:'json_object'},messages:[{role:'system',content:'You are a nutrition information extraction assistant. Return only JSON with fields name (string), serving (string), cal, protein, carbs, fat, fiber (numbers or null), confidence (low|medium|high), notes (string). '+instruction+' All nutrients in grams except cal kcal. Missing nutrients must be null. Never invent exact values from a photograph.'},{role:'user',content:[{type:'text',text:body.mode==='meal'?'Estimate nutrition of the entire visible meal.':'Transcribe the visible nutrition label per serving.'},{type:'image_url',image_url:{url:body.image,detail:'high'}}]}]}),signal:AbortSignal.timeout(25000)});
  if(!ai.ok)return send({error:'photo_analysis_unavailable'},502);
  const raw=await ai.json();let v;try{v=JSON.parse(raw.choices?.[0]?.message?.content||'{}')}catch{return send({error:'invalid_ai_response'},502)}
  const nutrients={};for(const k of ['cal','protein','carbs','fat','fiber']){const x=v[k];nutrients[k]=typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<100000?x:null}
  return send({food:{name:String(v.name||'Unidentified meal').slice(0,180),serving:String(v.serving||'').slice(0,100),...nutrients,source:body.mode==='meal'?'AI meal estimate':'Photo nutrition label',confidence:['low','medium','high'].includes(v.confidence)?v.confidence:'low',notes:String(v.notes||'').slice(0,600)},estimated:body.mode==='meal'});
 }
 if(url.pathname==='/v1/records'&&req.method==='GET'){
  const kind=url.searchParams.get('kind');if(kind&&!kinds.has(kind))return send({error:'invalid_kind'},400);
  const q=kind?env.DB.prepare('SELECT kind,id,payload,deleted,revision,updated_at FROM records WHERE kind=? ORDER BY updated_at,id LIMIT 3000').bind(kind):env.DB.prepare('SELECT kind,id,payload,deleted,revision,updated_at FROM records ORDER BY updated_at,id LIMIT 3000');
  const r=await q.all();return send({records:r.results.map(x=>({...x,payload:JSON.parse(x.payload)})),truncated:r.results.length===3000});
 }
 if(url.pathname==='/v1/records'&&req.method==='POST'){
  if(Number(req.headers.get('content-length')||0)>50000)return send({error:'too_large'},413);
  let body;try{body=await req.json()}catch{return send({error:'invalid_json'},400)}
  const {kind,id,payload,mutationId,expectedRevision,deleted=false}=body||{};
  if(!kinds.has(kind)||typeof id!=='string'||!(/^[\w-]{1,100}$/).test(id)||typeof mutationId!=='string'||!(/^[\w-]{8,100}$/).test(mutationId)||!Number.isInteger(expectedRevision)||expectedRevision<0||typeof deleted!=='boolean')return send({error:'invalid_request'},400);
  if(!deleted&&!validPayload(kind,payload))return send({error:'invalid_payload'},400);
  const encoded=JSON.stringify(deleted?{}:payload);if(encoded.length>24000)return send({error:'too_large'},413);
  const prior=await env.DB.prepare('SELECT kind,record_id,result_revision FROM mutations WHERE mutation_id=?').bind(mutationId).first();if(prior){if(prior.kind!==kind||prior.record_id!==id)return send({error:'mutation_id_reused'},409);return send({ok:true,revision:prior.result_revision,replayed:true});}
  const current=await env.DB.prepare('SELECT revision FROM records WHERE kind=? AND id=?').bind(kind,id).first();const rev=current?.revision||0;
  if(rev!==expectedRevision)return send({error:'revision_conflict',currentRevision:rev},409);
  // Conditional upsert ensures concurrent writes cannot silently overwrite each other.
  const statement=current
    ?env.DB.prepare("UPDATE records SET payload=?,deleted=?,revision=revision+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE kind=? AND id=? AND revision=?").bind(encoded,deleted?1:0,kind,id,rev)
    :env.DB.prepare("INSERT OR IGNORE INTO records(kind,id,payload,deleted,revision) VALUES(?,?,?,?,1)").bind(kind,id,encoded,deleted?1:0);
  const result=await statement.run();if(result.meta.changes!==1)return send({error:'revision_conflict'},409);
  const newRev=rev+1;await env.DB.prepare('INSERT OR IGNORE INTO mutations(mutation_id,kind,record_id,result_revision) VALUES(?,?,?,?)').bind(mutationId,kind,id,newRev).run();
  return send({ok:true,revision:newRev});
 }
 return send({error:'not_found'},404);
}catch(e){return send({error:'internal_error'},500)}
}};
