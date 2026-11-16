(() => {
"use strict";
const root=document.getElementById("app");
const qs=Array.isArray(window.BOXQUIZ_SEED)?window.BOXQUIZ_SEED:[];
const categories=["Fundamentos del box","Fundamentos del box","Técnica y movimientos","Técnica y movimientos","WODs clásicos","WODs clásicos","CrossFit Games","CrossFit Games","CrossFit Open","Reglas y estrategia"];
const levels=["easy","medium","hard"], quotas={easy:6,medium:2,hard:2};
const params=new URLSearchParams(location.search), incoming=(params.get("sala")||"").toUpperCase();
const s={code:/^[A-Z2-9]{6}$/.test(incoming)?incoming:"",name:localStorage.getItem("bq_league_name")||"",draft:localStorage.getItem("bq_league_name")||"",codeDraft:incoming,room:null,client:null,userId:null,busy:false,loading:false,error:"",poll:null,polling:false,hash:"",qkey:"",deadline:0};
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const btn=(action,label,disabled=false,cls="")=>"<button class='btn "+cls+"' data-action='"+action+"' "+(disabled?"disabled":"")+">"+label+"</button>";
const bar=n=>"<div class='meter'><i style='width:"+Math.min(100,Math.max(0,n))+"%'></i></div>";
const link=()=>location.origin+location.pathname+"?sala="+encodeURIComponent(s.code);
const sh=a=>{let v=a.slice();for(let i=v.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[v[i],v[j]]=[v[j],v[i]];}return v;};
function pick(){
 if(qs.length<10)throw Error("No están disponibles las 500 preguntas");
 const bins=new Map();
 for(const q of qs){let k=q.category+"|"+q.difficulty;if(!bins.has(k))bins.set(k,[]);bins.get(k).push(q);}
 const slots=sh(categories);
 slots.sort((a,b)=>levels.filter(x=>(bins.get(a+"|"+x)||[]).length).length-levels.filter(x=>(bins.get(b+"|"+x)||[]).length).length);
 let assignment=null;
 function solve(i,quota,parts){
  if(i===10){if(levels.every(l=>quota[l]===0)){assignment=parts.slice();return true;}return false;}
  const cat=slots[i];
  for(const lvl of sh(levels.filter(l=>quota[l]>0&&(bins.get(cat+"|"+l)||[]).length))){
   quota[lvl]--;parts.push([cat,lvl]);if(solve(i+1,quota,parts))return true;parts.pop();quota[lvl]++;
  }
  return false;
 }
 if(!solve(0,{...quotas},[]))throw Error("No hay suficientes preguntas equilibradas");
 const used=new Set();
 return sh(assignment.map(([cat,lvl])=>{
  const pool=(bins.get(cat+"|"+lvl)||[]).filter(q=>!used.has(q.id));
  if(!pool.length)throw Error("Faltan preguntas sin repetir");
  const q=sh(pool)[0];used.add(q.id);
  const options=sh(q.options.map((value,i)=>({value,i})));
  return {id:q.id,question:q.question,category:q.category,difficulty:q.difficulty,options:options.map(x=>x.value),correct:options.findIndex(x=>x.i===q.correct),explanation:q.explanation||""};
 }));
}
function showError(e){let m=String(e?.message||e||"Error inesperado");if(m.includes("schema cache")||m.includes("Could not find the function")||m.includes("bq_league_"))m="Falta activar la liga en Supabase. Ejecuta el SQL de BOX QUIZ V4.";if(m.toLowerCase().includes("anonymous"))m="Activa Allow anonymous sign-ins en Supabase → Authentication → Providers.";s.error=m;view();}
function title(t,detail){return "<section class='hero'><span class='eye'>⚡ BOX QUIZ · LIGA</span><h1>"+t+"</h1><p class='lead'>"+detail+"</p></section>";}
function nameOf(room,id){return esc(room.players.find(p=>p.id===id)?.name||"Jugador");}
function label(p,r){return esc(p.name)+(p.id===r.my_id?" <span style='color:var(--lime)'>(tú)</span>":"");}
function rules(){const a=[["Participantes por sala","2 a 10"],["Preguntas por partida","10"],["Dificultad","6 fáciles · 2 medias · 2 difíciles"],["Puntos por puesto","10 · 8 · 6 · 3 · 2 · 1 · 0"],["Gana la liga","Primero en alcanzar 100"]];return "<section class='panel'><div class='eye'>REGLAS</div>"+a.map(x=>"<div class='rule'><span>"+x[0]+"</span><strong>"+x[1]+"</strong></div>").join("")+"<p class='fine'>Los puestos se ordenan por aciertos y, en caso de empate, por tiempo empleado. Cada partida suma puntos una sola vez, cuando todos hayan terminado.</p></section>";}
function entry(){
 const invite=!!s.code;
 let create=invite?"":"<div class='panel'><div class='tag'>ANFITRIÓN</div><h2>Crear una sala</h2><p class='lead'>Serás el anfitrión y podrás invitar hasta a otras 9 personas.</p><div class='field'><label>Tu nombre</label><input id='create-name' maxlength='24' placeholder='Tu nombre' value='"+esc(s.draft)+"'></div>"+btn("create","CREAR SALA →",s.busy,"full")+"</div>";
 let join="<div class='panel'><div class='tag'>JUGADOR</div><h2>"+(invite?"Te han invitado a jugar":"Unirme a una sala")+"</h2><div class='field'><label>Tu nombre</label><input id='join-name' maxlength='24' placeholder='Tu nombre' value='"+esc(s.draft)+"'></div><div class='field'><label>Código de 6 caracteres</label><input id='join-code' maxlength='6' placeholder='ABC123' value='"+esc(s.code||s.codeDraft)+"'></div>"+btn("join","ENTRAR EN LA SALA →",s.busy,"full")+"</div>";
 return title(invite?"¡TE HAN INVITADO!":"¿QUIÉN SABE MÁS DE CROSSFIT?",invite?"Sala "+esc(s.code)+". Introduce tu nombre y entra al grupo.":"Crea un grupo, comparte el enlace por WhatsApp y jugad hasta que alguien llegue a 100 puntos.")+"<div class='cols'>"+create+join+"</div>"+rules();
}
function header(r){return title(r.phase==="finished"?"¡TENEMOS CAMPEÓN!":r.phase==="results"?"CLASIFICACIÓN ACTUAL":r.phase==="lobby"?"SALA DE ESPERA":"LIGA EN JUEGO","<span class='tag'>SALA "+esc(r.code)+"</span><span class='tag'>"+r.players.length+"/10 JUGADORES</span><span class='tag'>RONDA "+(r.round_no||"—")+"</span>");}
function roster(r){return "<div class='panel'><h2>Participantes ("+r.players.length+"/10)</h2><div class='members'>"+r.players.map(p=>"<div class='member'><strong>"+label(p,r)+"</strong><small>"+(p.is_host?"👑 Anfitrión":p.points+" puntos")+"</small></div>").join("")+"</div></div>";}
function sharebox(r){return "<div class='panel center'><span class='eye'>ENLACE DE INVITACIÓN</span><div class='code'>"+esc(r.code)+"</div><div class='btnrow'>"+btn("share","COMPARTIR ENLACE ↗")+btn("copy","COPIAR LINK",false,"alt")+"</div><p class='fine' style='overflow-wrap:anywhere'>"+esc(link())+"</p></div>";}
function standings(r){const a=r.players.slice().sort((x,y)=>y.points-x.points||x.name.localeCompare(y.name));return "<section class='panel'><div class='eye'>RANKING GENERAL</div><h2>Camino a los 100 puntos</h2><div class='standings'>"+a.map((p,i)=>"<div class='standing "+(p.id===r.my_id?"me":"")+"'><span class='rank'>"+(i+1)+"</span><div><strong>"+label(p,r)+"</strong>"+bar(p.points)+"</div><span class='earned'></span><span class='total'>"+p.points+"</span></div>").join("")+"</div></section>";}
function lobby(r){return header(r)+sharebox(r)+roster(r)+(r.my_id===r.host_id?"<div class='panel'><h2>¿Empezamos?</h2><p class='lead'>Elige cuándo empezar. Después cada persona jugará sus 10 preguntas a su ritmo.</p>"+btn("start","EMPEZAR PRIMERA PARTIDA →",r.players.length<2||s.busy,"full")+"<p class='fine'>Se necesitan al menos dos personas.</p></div>":"<div class='status'><h2>Esperando al anfitrión</h2><p class='muted'>En cuanto inicie la liga, podrás jugar tu partida.</p></div>")+rules();}
function progress(r){
 const n=r.runs.length,done=r.runs.filter(x=>x.finished).length;
 return "<section class='panel'><div class='progress'><span>HAN TERMINADO "+done+" DE "+n+"</span><span>"+(n?Math.round(100*done/n):0)+"%</span></div>"+bar(n?100*done/n:0)+"<div class='members'>"+r.players.map(p=>{const v=r.runs.find(x=>x.id===p.id);const state=!v?"Próxima ronda":v.finished?"✅ Terminado":v.started?"🟢 Jugando":"⏳ Pendiente";return "<div class='member'><strong>"+label(p,r)+"</strong><small>"+state+"</small></div>";}).join("")+"</div></section>";
}
function playing(r){
 let base=header(r),run=r.runs.find(x=>x.id===r.my_id),n=r.answers.length;
 if(!run)base+="<div class='panel center'><h2>Te has unido a la sala ✅</h2><p class='lead'>Esta partida ya había comenzado. Jugarás en la siguiente ronda.</p></div>"+progress(r)+standings(r);
 else if(run.finished||n>=10)base+="<div class='panel center'><h2>✅ ¡Has terminado!</h2><p class='lead'>Cuando todas las personas de esta ronda terminen, aparecerá la clasificación con los puntos.</p></div>"+progress(r)+standings(r);
 else if(!run.started)base+="<div class='panel center'><h2>⚡ ¡Tu partida está preparada!</h2><p class='lead'>Las mismas 10 preguntas para todos. Gana más aciertos y desempata por tiempo.</p>"+btn("begin","EMPEZAR MIS 10 PREGUNTAS →",s.busy,"full")+"</div>"+progress(r);
 else{
  let q=r.questions[n];if(!q)return base+"<div class='error'>No se puede encontrar la pregunta.</div>";
  let key=r.round_no+":"+n;if(key!==s.qkey){s.qkey=key;s.deadline=Date.now()+20000;}
  let time=Math.max(0,Math.ceil((s.deadline-Date.now())/1000));
  base+="<div class='panel'><div class='progress'><span>PREGUNTA "+(n+1)+"/10</span><span class='clock' id='clock'>"+time+" s</span></div>"+bar((n+1)*10)+"<p><span class='tag'>"+esc(q.category)+"</span><span class='tag'>"+({easy:"Fácil",medium:"Media",hard:"Difícil"}[q.difficulty]||"Media")+"</span></p><h2>"+esc(q.question)+"</h2>"+q.options.map((o,i)=>"<button class='opt' data-action='answer' data-index='"+i+"' "+(s.busy?"disabled":"")+"><span class='letter'>"+("ABCD"[i])+"</span>"+esc(o)+"</button>").join("")+"<p class='fine'>20 segundos por pregunta. La respuesta correcta se revela cuando finalice la ronda.</p></div>";
 }
 if(r.my_id===r.host_id&&(!run||run.finished))base+="<div class='panel'><p class='fine'>Si alguien no termina, puedes cerrar la ronda después de 12 minutos. Quienes no terminen obtendrán 0 puntos.</p>"+btn("close","CERRAR RONDA BLOQUEADA",s.busy,"line full")+"</div>";
 return base;
}
function results(r){
 let runners=r.runs.slice().sort((a,b)=>(a.position||99)-(b.position||99));
 let result=header(r);
 if(r.phase==="finished")result+="<div class='panel win'><div class='trophy'>🏆</div><h2>¡"+nameOf(r,r.winner_id)+" gana la liga!</h2><p class='lead'>Ha llegado a 100 puntos. ¡Enhorabuena!</p></div>";
 result+="<div class='panel'><div class='eye'>RESULTADOS DE LA PARTIDA "+r.round_no+"</div><h2>Puntos de esta ronda</h2><div class='standings'>"+runners.map(x=>{const p=r.players.find(p=>p.id===x.id);return "<div class='standing "+(x.id===r.my_id?"me":"")+"'><span class='rank'>"+x.position+"</span><div><strong>"+esc(p?.name||"Jugador")+"</strong><small>"+x.correct+"/10 aciertos · "+(x.duration_ms===2147483647?"Sin terminar":Math.round(x.duration_ms/1000)+" s")+"</small></div><span class='earned'>+"+x.round_points+"</span><span class='total'>"+p?.points+"</span></div>";}).join("")+"</div><p class='fine'>Los puntos se han añadido al ranking general.</p></div>"+standings(r);
 if(r.phase==="results")result+=r.my_id===r.host_id?"<div class='panel center'><h2>¿Seguimos?</h2>"+btn("start","EMPEZAR SIGUIENTE PARTIDA →",s.busy,"full")+"</div>":"<div class='status'><h2>Esperando al anfitrión</h2><p class='muted'>Cuando empiece la siguiente partida aparecerá automáticamente.</p></div>";
 else result+="<div class='panel center'>"+btn("leave","VOLVER AL INICIO",false,"alt full")+"</div>";
 return result;
}
function view(){
 const body=s.loading&&!s.room?"<div class='spinner'>Conectando con tu sala…</div>":!s.room?entry():s.room.phase==="lobby"?lobby(s.room):s.room.phase==="playing"?playing(s.room):results(s.room);
 root.innerHTML="<div class='wrap'><header class='top'><a href='./' class='brand'>⚡ BOX <b>QUIZ</b></a><a href='./' class='nav'>← Juego individual</a></header>"+(s.error?"<div class='error'>⚠ "+esc(s.error)+"</div>":"")+body+"<footer class='footer'>BOX QUIZ · Ligas de hasta 10 jugadores · Meta de 100 puntos</footer></div>";
}
let sdk;
function ensureSDK(){if(window.supabase?.createClient)return Promise.resolve();if(sdk)return sdk;sdk=new Promise((resolve,reject)=>{const sc=document.createElement("script");sc.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";const t=setTimeout(()=>reject(Error("No se pudo cargar Supabase")),15000);sc.onload=()=>{clearTimeout(t);window.supabase?.createClient?resolve():reject(Error("Error al cargar Supabase"));};sc.onerror=()=>{clearTimeout(t);reject(Error("No hay conexión con Supabase"));};document.head.appendChild(sc);});return sdk;}
async function client(){if(s.userId)return s.client;const c=window.BOXQUIZ_CONFIG;if(!c?.supabaseUrl||!c?.supabaseAnonKey)throw Error("Falta configurar Supabase");await ensureSDK();s.client=s.client||window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true}});
 let u=(await s.client.auth.getUser()).data.user;if(!u){const a=await s.client.auth.signInAnonymously();if(a.error)throw a.error;u=a.data.user;}s.userId=u.id;return s.client;}
async function rpc(name,args){let c=await client();let {data,error}=await c.rpc(name,args);if(error)throw error;return data;}
async function refresh(quiet=false){if(!s.code||s.polling)return;s.polling=true;try{const room=await rpc("bq_league_state",{p_code:s.code});const h=JSON.stringify(room);if(h!==s.hash){s.hash=h;s.room=room;s.error="";view();}if(!s.poll)s.poll=setInterval(()=>refresh(true),3000);}catch(e){if(!quiet){let m=String(e?.message||e);if(m.includes("Debes unirte antes")){s.room=null;s.error="";view();}else showError(e);}else console.warn("Sincronización",e);}finally{s.polling=false;s.loading=false;}}
async function run(fn){if(s.busy)return;s.busy=true;s.error="";view();try{await fn();}catch(e){showError(e);}finally{s.busy=false;view();}}
function update(code){s.code=code;const url=new URL(location.href);if(code)url.searchParams.set("sala",code);else url.searchParams.delete("sala");history.replaceState(null,"",url.pathname+url.search);}
async function create(){const name=s.draft.trim().slice(0,24);if(!name){s.error="Escribe tu nombre";view();return;}await run(async()=>{const code=await rpc("bq_create_league_room",{p_name:name});localStorage.setItem("bq_league_name",name);update(code);await refresh();});}
async function join(){const name=s.draft.trim().slice(0,24),code=String(s.codeDraft||s.code).trim().toUpperCase();if(!name||!/^[A-Z2-9]{6}$/.test(code)){s.error="Introduce tu nombre y un código de 6 caracteres";view();return;}await run(async()=>{const c=await rpc("bq_join_league_room",{p_code:code,p_name:name});localStorage.setItem("bq_league_name",name);update(c);await refresh();});}
async function start(){await run(async()=>{await rpc("bq_start_league_round",{p_code:s.code,p_questions:pick()});s.qkey="";s.hash="";await refresh();});}
async function begin(){await run(async()=>{await rpc("bq_begin_league_run",{p_code:s.code});s.qkey="";await refresh();});}
async function answer(choice){if(s.busy||!s.room||s.room.phase!=="playing")return;const n=s.room.answers.length;s.busy=true;view();try{await rpc("bq_submit_league_answer",{p_code:s.code,p_index:n,p_choice:choice});s.qkey="";s.hash="";await refresh();}catch(e){showError(e);}finally{s.busy=false;view();}}
async function close(){if(!confirm("¿Cerrar la ronda? Solo es posible después de 12 minutos. Quienes no hayan terminado recibirán 0 puntos."))return;await run(async()=>{await rpc("bq_close_stalled_round",{p_code:s.code});await refresh();});}
function copy(){const url=link();navigator.clipboard?.writeText(url).then(()=>alert("Enlace copiado para WhatsApp")).catch(()=>prompt("Copia el enlace:",url));}
function share(){const url=link();if(navigator.share)navigator.share({title:"BOX QUIZ Liga",text:"¡Únete a mi liga de CrossFit!",url}).catch(()=>{});else copy();}
function leave(){clearInterval(s.poll);s.poll=null;s.room=null;s.hash="";s.qkey="";update("");view();}
root.addEventListener("input",e=>{if(e.target.id==="create-name"||e.target.id==="join-name")s.draft=e.target.value;if(e.target.id==="join-code"){s.codeDraft=e.target.value.toUpperCase().replace(/[^A-Z2-9]/g,"").slice(0,6);e.target.value=s.codeDraft;}});
root.addEventListener("click",e=>{const b=e.target.closest("[data-action]");if(!b||b.disabled)return;switch(b.dataset.action){case "create":create();break;case "join":join();break;case "start":start();break;case "begin":begin();break;case "answer":answer(Number(b.dataset.index));break;case "close":close();break;case "copy":copy();break;case "share":share();break;case "leave":leave();break;}});
setInterval(()=>{if(!s.room||s.room.phase!=="playing"||!s.qkey||s.busy)return;const n=Math.max(0,Math.ceil((s.deadline-Date.now())/1000)),x=document.getElementById("clock");if(x){x.textContent=n+" s";x.classList.toggle("danger",n<=5);}if(n===0){s.qkey="";answer(4);}},250);
view();if(s.code){s.loading=true;view();refresh().then(()=>{s.loading=false;view();});}
})();