(()=>{
const api=window.Starchain,root=document.querySelector('#starchain-motion-lab');
let resolveCity;window.StarchainCityReady=new Promise(resolve=>resolveCity=resolve);
const frame=document.createElement('iframe');frame.className='city-frame';frame.title='城市登录入口';
// With the boot intro, the login scene loads when the intro asks (after its final hit), so its 1 MB page and WebGL
// film never compete with the busiest part of the intro for the main thread.
const boot=window.StarchainBoot;
if(boot?.deferCity)boot.loadCity=()=>{if(!frame.getAttribute('src'))frame.src='city.html'};else frame.src='city.html';
const mask=document.createElement('div');mask.className='city-transit';mask.setAttribute('aria-hidden','true');mask.innerHTML='<i></i>';
const back=document.createElement('button');back.className='city-return';back.textContent='↖ 返回登录';back.hidden=true;
// Keep interaction locking separate from animation suspension: the entrance
// typewriter must already run while the route still locks input.
const suspendedSVGs=new Set();
function suspendRegistration(value){
 root.classList.toggle('starchain-animations-suspended',value);
 if(value){for(const svg of root.querySelectorAll('svg')){if(typeof svg.pauseAnimations==='function'&&!svg.animationsPaused()){svg.pauseAnimations();suspendedSVGs.add(svg)}}}
 else{for(const svg of suspendedSVGs)svg.unpauseAnimations();suspendedSVGs.clear()}
}
document.body.append(frame,mask,back);root.inert=true;window.StarchainIntro?.stop();suspendRegistration(true);
let config={},cityReady=false,busy=false,backgroundURL='',tracks=[];
let backgroundToken=0,backgroundRequested=false,initialConfig=false;
const requestBackground=()=>{backgroundRequested=true;if(cityReady)post('background',{url:backgroundURL,token:++backgroundToken})};
const post=(type,data={})=>frame.contentWindow.postMessage({channel:'starchain-host',type,...data},'*');
const original=api.apply.bind(api);api.apply=c=>{config=c.city||config;root.style.setProperty('--optics-strength',Math.max(0,Math.min(1,config.opticsStrength??.38)));document.documentElement.style.setProperty('--boot-duration',(config.startupDuration??900)+'ms');if(cityReady)post('apply',{config});original(c);initialConfig=true;requestAnimationFrame(()=>{if(!backgroundRequested)requestBackground()})};
api.setBackground=url=>{backgroundURL=url;requestBackground()};
// The boot intro lands its logo on this page's logo, wherever the Inspector puts it.
api.cityConfig=()=>config;
let resolveReveal;
api.revealCity=(elapsed=0)=>new Promise(resolve=>{resolveReveal=resolve;post('reveal',{elapsed})});
window.addEventListener('message',e=>{if(e.source===frame.contentWindow&&e.data?.channel==='starchain-city'&&e.data.type==='reveal-started'){resolveReveal?.();resolveReveal=null}});
// Entry flight lengths for the Inspector's 干脆 / 舒展 choice (city.entryFlight).
const FLIGHT_MS=[1400,2400];
let flightResolve=null;
const captureFlight=()=>new Promise(resolve=>{const timer=setTimeout(()=>{flightResolve=null;resolve(null)},600);flightResolve=data=>{clearTimeout(timer);flightResolve=null;resolve(data)};post('flight-capture')});
// 标题语音（浏览器预览）：在标题页按下进入时，三位有配音的偶像（始皇帝 / 爱 / 零号）随机一位念出日语版游戏名「アイドル、創発の境界！」
// （voice/title_<偶像>.mp3，配音工程 D:\配音工程\标题语音\title_call.py）。按键 / 点击本身就是用户操作，不受自动播放限制；
// 不会连着两次是同一位；音量与静音跟游戏设置（pidol:volume:v1 的 voice / mute）。
const TITLE_VOICES=[100,101,102];let titleAudio=null;
function titleCall(){if(typeof window.Unity?.call==='function')return; // Unity 里标题页一出现就由 Unity 播过了（StarchainWebView.TitleCall）
 try{let v={voice:1,mute:false};try{v={...v,...JSON.parse(localStorage.getItem('pidol:volume:v1')||'{}')}}catch{}if(v.mute||!(+v.voice>0))return;
 let last=0;try{last=+localStorage.getItem('pidol:title-voice:last')||0}catch{}const pool=TITLE_VOICES.filter(i=>i!==last),id=pool[Math.random()*pool.length|0];try{localStorage.setItem('pidol:title-voice:last',String(id))}catch{}
 titleAudio?.pause();titleAudio=new Audio(`voice/title_${id}.mp3`);titleAudio.volume=Math.max(0,Math.min(1,+v.voice));titleAudio.play().catch(()=>{})}catch{}}
async function route(toLogin){if(busy)return;busy=true;if(!toLogin)titleCall();root.inert=true;frame.style.pointerEvents='none';const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches,duration=reduced?0:Math.max(0,config.transitionDuration??1100);mask.style.visibility='visible';
const run=(el,frames,ms,delay=0)=>{const a=el.animate(frames,{duration:ms,delay,fill:'both',easing:'cubic-bezier(.22,.61,.36,1)'});tracks.push(a);return a.finished.catch(()=>{})};
const unlock=()=>{suspendRegistration(false);window.StarchainIntro?.play()};
if(toLogin){window.StarchainFlight?.cancel(frame);frame.hidden=false;frame.style.clipPath='';post('active',{value:true});post('reset');post('flight-reset');window.StarchainIntro?.stop();}
let started=false;const start=()=>{if(!started){started=true;unlock()}};
let flight=null;
if(!toLogin&&!reduced&&window.StarchainFlight){
 // Freeze the city before preparing sprites. Keep the registration scene static during
 // the wipe: its hundreds of SVG/CSS animations and stroke-dash intro otherwise compete
 // with the full-screen flight on every frame, even after creation was spread over frames.
 started=true;
 flight=await captureFlight();
 if(!flight)started=false;
}
if(flight){
 mask.style.visibility='hidden';
 await window.StarchainFlight.play(flight,{frame,duration:FLIGHT_MS[config.entryFlight|0]||FLIGHT_MS[0],onMounted:()=>post('flight-hide')});
 suspendRegistration(false);
}else{
if(!toLogin)start();
const gleam=run(mask.firstChild,[{transform:'translateX(-20vw)',opacity:0},{opacity:.48,offset:.35},{transform:'translateX(120vw)',opacity:0}],duration);
await Promise.all([run(frame,[{opacity:toLogin?0:1},{opacity:toLogin?1:0}],duration*.82,duration*.12),gleam]);
}
frame.hidden=!toLogin;root.inert=toLogin;back.hidden=toLogin;post('active',{value:toLogin});if(toLogin)suspendRegistration(true);
tracks.forEach(a=>a.cancel());tracks=[];mask.style.visibility='hidden';frame.style.pointerEvents='';busy=false;if(toLogin)frame.contentWindow.focus();else back.focus({preventScroll:true});
}
api.showLogin=()=>route(true);api.enterCity=()=>{if(cityReady)route(false)};back.onclick=api.showLogin;
api.previewIdleFlight=()=>post('flight-idle-now');
document.addEventListener('keydown',e=>{if(window.StarchainBoot?.active||frame.hidden||!cityReady||e.defaultPrevented||e.repeat||e.isComposing||e.ctrlKey||e.altKey||e.metaKey||['Tab','Escape','Shift','Control','Alt','Meta'].includes(e.key)||/^F\d+$/.test(e.key))return;e.preventDefault();route(false)});
window.addEventListener('message',e=>{if(e.source!==frame.contentWindow||e.data?.channel!=='starchain-city')return;if(e.data.type==='ready'){cityReady=true;post('apply',{config});if(initialConfig||backgroundRequested)requestBackground()}if(e.data.type==='background-ready'&&e.data.token===backgroundToken)resolveCity();if(e.data.type==='flight')flightResolve?.(e.data.flight);if(e.data.type==='enter')route(false);if(e.data.type==='background-error')window.Unity?.call(JSON.stringify({type:'background-error'}))});
})();
