/* Login → Project:IDOL main UI (pidol.html, exported from WebPrototypes/pidol-backstage).
 * Submitting a name plays the registration shutter as before. Once it is closed, pidol.html loads in
 * a full-screen iframe above this page (clipped away); after the configured hold and once the main UI
 * reports ready, the iframe is wiped in along the shutter's diagonal and this page is suspended.
 * The producer profile (name + gender typed here, then Unity's saved profile via
 * window.Starchain.setProducer) is posted to the main UI before it starts. Renames in its 制作人档案
 * come back here (and to Unity); 返回登录 wipes it away and resumes this page.
 * Messages to Unity: main-ready, producer {name, gender}, logout, main-error, cursor {name} (the CSS cursor
 * under the pointer, for StarchainCursor), and every main-UI event as main-event {name, json}. Unity's commands arrive as window.Starchain.toMain(name, data) and are
 * posted to the main UI (js/api.js). Contract: Assets/Starchain/Docs/主界面接口说明.md. */
(()=>{
const api=window.Starchain,root=document.querySelector('#starchain-motion-lab'),q=s=>root.querySelector(s);
const form=q('form'),input=q('input[type=text]'),overlay=q('.sc-transition'),back=q('.sc-back');
const send=(type,data={})=>window.Unity?.call(JSON.stringify({type,...data}));
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const SHOW='polygon(-35% 0%,165% 0%,135% 100%,-65% 100%)',BEFORE='polygon(-35% 0%,-35% 0%,-65% 100%,-65% 100%)',AFTER='polygon(165% 0%,165% 0%,135% 100%,135% 100%)';
let entryVisual=null;
// Capture before the registration's submit handler moves its title, button and name.
form.addEventListener('submit',()=>{if(phase==='idle')entryVisual=window.StarchainMemoryEmergence?.capture();},true);
let enabled=true,frame=null,edge=null,phase='idle',profile=null,frameReady=null,token=0,loadError='';
const post=(type,data={})=>frame?.contentWindow?.postMessage({channel:'pidol-host',type,...data},'*');
const setting=key=>Math.max(0,Number(q(`[data-setting="${key}"]`)?.value)||0);
const gender=()=>q('input[name=fusion-gender]:checked')?.value||'';

const style=document.createElement('style');
style.textContent=`.pidol-frame{position:fixed;inset:0;width:100%;height:100%;border:0;z-index:120;background:#111318}
.pidol-edge{position:fixed;left:0;top:0;width:3px;height:100%;z-index:121;pointer-events:none;opacity:0;transform-origin:0 0;background:linear-gradient(180deg,#d4f53c,#36c6da 55%,#ff3d82);box-shadow:0 0 18px 3px rgba(212,245,60,.4)}`;
document.head.append(style);
const original=api.apply.bind(api);
api.apply=c=>{if(typeof c?.enterMainUi==='boolean')enabled=c.enterMainUi;original(c)};
/** Unity's saved profile: forwarded to the main UI, and prefills the form while it is idle. */
api.setProducer=p=>{
 profile={...profile,...p};
 if(phase==='idle'&&p?.name&&!input.value.trim())fill(profile);
 if(frameReady)post('producer',{profile});
};
// Commands for the main UI. Content and story mode are kept and replayed into every new main UI
// (it is rebuilt on each login); other commands wait while it loads and are refused when it is closed.
const STICKY=new Set(['content.load','story.mode']),sticky=[],pending=[];
api.toMain=(name,data={})=>{
 if(typeof name!=='string'||!name){send('main-event',{name:'api.error',json:JSON.stringify({command:String(name),reason:'命令名为空'})});return}
 if(name==='story.mode'){const i=sticky.findIndex(([n])=>n===name);if(i>=0)sticky.splice(i,1)}
 if(STICKY.has(name))sticky.push([name,data]);
 if(frameReady)post('cmd',{name,data});
 else if(phase==='loading'){if(!STICKY.has(name))pending.push([name,data])}
 else if(!STICKY.has(name))send('main-event',{name:'api.error',json:JSON.stringify({command:name,reason:'主界面未打开'})});
};
function fill(p){
 api.setName(p.name||'');
 const radio=p.gender&&q(`input[name=fusion-gender][value="${p.gender}"]`);
 if(radio&&!radio.checked){radio.checked=true;radio.dispatchEvent(new Event('change',{bubbles:true}))}
}

// The registration transition's WAAPI tracks (not its CSS animations), and where the shutter is fully closed.
const TRACKED=['.sc-shutter','.sc-loading','.sc-diagonal-accent','.sc-streak','.sc-content','.sc-art'];
const tracks=()=>TRACKED.flatMap(s=>q(s)?.getAnimations().filter(a=>!(a instanceof CSSAnimation)&&!(a instanceof CSSTransition)&&a.playState!=='finished')??[]);
function shutterTiming(){
 const a=q('.sc-shutter').getAnimations().find(x=>!(x instanceof CSSAnimation)&&x.effect?.getKeyframes().some(k=>k.clipPath));
 if(!a)return null;
 const k=a.effect.getKeyframes(),d=a.effect.getComputedTiming().duration;
 return {a,closed:k[1].computedOffset*d,holdEnd:k[2].computedOffset*d};
}
const until=(t,ms,id)=>new Promise(resolve=>{const start=performance.now();(function tick(){if(id!==token||!t.a||t.a.playState!=='running'||t.a.currentTime>=ms||performance.now()-start>ms+2000)resolve();else requestAnimationFrame(tick)})()});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function mount(){
 frame=document.createElement('iframe');
 frame.className='pidol-frame';frame.title='Project:IDOL 主界面';
 frame.style.clipPath=BEFORE;
 frameReady=null;
 loadError='';
 const ready=new Promise(resolve=>{frame.onready=resolve});
 // In Unity (index.html?unity=1) the main UI leaves music and voices to Unity (StarchainAudio): audio=unity.
 frame.src='pidol.html?host=starchain'+(new URLSearchParams(location.search).has('unity')?'&audio=unity':'');
 edge=document.createElement('i');edge.className='pidol-edge';edge.setAttribute('aria-hidden','true');
 document.body.append(frame,edge);
 return ready;
}
window.addEventListener('message',e=>{
 if(!frame||e.source!==frame.contentWindow||e.data?.channel!=='pidol')return;
 const d=e.data;
 if(d.type==='event'&&d.name==='page.error')loadError=String(d.data?.message||d.data?.where||'主界面脚本错误').split('\n')[0].slice(0,300);
 if(d.type==='ready'){frameReady=true;post('producer',{profile});for(const [name,data] of [...sticky,...pending.splice(0)])post('cmd',{name,data});frame.onready?.();if(phase==='shown'){post('start');send('main-ready')}}
 if(d.type==='event'&&typeof d.name==='string')send('main-event',{name:d.name,json:JSON.stringify(d.data??{})});
 if(d.type==='memory-emergence-setting'&&typeof d.always==='boolean')window.StarchainMemoryEmergence?.setAlways(d.always);
 if(d.type==='cursor'&&typeof d.name==='string')send('cursor',{name:d.name});
 if(d.type==='producer'&&d.profile?.name){profile={...profile,...d.profile};api.setName(profile.name);send('producer',{name:profile.name,gender:profile.gender||''})}
 if(d.type==='logout')leave();
});

// Under the main UI the registration page stays mounted but idle: inert, invisible, its CSS and SVG
// animations paused, and marked sc-paused so its WebGL halo (nb-optics.js) stops drawing.
let pausedByHost=false;
function suspend(value){
 const product=q('.sc-product');
 if(value&&!product.classList.contains('sc-paused')){product.classList.add('sc-paused');pausedByHost=true}
 else if(!value&&pausedByHost){product.classList.remove('sc-paused');pausedByHost=false}
 root.inert=value;root.classList.toggle('starchain-animations-suspended',value);root.style.visibility=value?'hidden':'';
 for(const svg of root.querySelectorAll('svg')){if(typeof svg.pauseAnimations!=='function')continue;value?svg.pauseAnimations():svg.unpauseAnimations()}
}
function sweep(from,to,ms){
 const ease='cubic-bezier(.4,0,.2,1)',W=innerWidth,H=innerHeight;
 // Entering or leaving, the moving edge runs from -35% to 165% at the top and trails by 30% at the
 // bottom, like the registration shutter. A glowing bar rides it.
 edge.style.transform=`skewX(${-Math.atan(.3*W/H)}rad)`;
 edge.animate([{translate:`${-.35*W}px 0`,opacity:1},{opacity:1,offset:.85},{translate:`${1.65*W}px 0`,opacity:0}],{duration:ms,easing:ease,fill:'both'});
 return frame.animate([{clipPath:from},{clipPath:to}],{duration:ms,easing:ease,fill:'forwards'}).finished.catch(()=>{});
}
// A clip-path animation left filling on the iframe makes Chromium skip repainting parts of it.
function settle(clip){frame.style.clipPath=clip;frame.getAnimations().forEach(a=>a.cancel());edge.getAnimations().forEach(a=>a.cancel())}

async function enter(name){
 if(!enabled||phase!=='idle')return;
 const id=++token;phase='loading';
 try {
 profile={...profile,name,gender:gender()};
 const emergence=window.StarchainMemoryEmergence?.play(profile,entryVisual);
 // Keep the original name-line flash and morph visible before the registration shutter closes.
 const anchorReady=emergence?emergence.then(value=>({value}),error=>({error})):null;
 back.hidden=true; // nothing to skip back to: the main UI is loading under the shutter
 const t=shutterTiming()||{a:null,closed:160,holdEnd:160};
 if(t.a)await until(t,t.closed,id);else await sleep(160);
 if(id!==token)return;
 const ready=mount();
 if(emergence)frame.inert=true;
 if(t.a)await until(t,Math.max(t.closed,t.holdEnd-34),id);
 const frozen=tracks();frozen.forEach(a=>a.pause()); // keep the shutter closed while loading
 if(emergence)suspend(true);
 const ok=await Promise.race([ready.then(()=>true),sleep(20000).then(()=>false)]);
 if(id!==token)return;
 if(!ok)throw new Error(loadError||'主界面加载超时（20 秒），请重试');
 if(anchorReady){const result=await anchorReady;if(result.error)throw result.error;if(!result.value)throw new Error('身份锚定已中断');}
 post('start');
 const open=reduced.matches?0:Math.max(380,setting('open'));
 if(open)await sweep(BEFORE,SHOW,open);
 settle('none');
 if(emergence){await window.StarchainMemoryEmergence.finish();frame.inert=false;}
 back.click(); // the registration's own reset cancels its tracks, now hidden under the main UI
 suspend(true);
 phase='shown';
 window.StarchainMemoryEmergence?.complete();
 frame.contentWindow.focus();
 send('main-ready');
 }catch(error){
  if(id!==token)return;
  await window.StarchainMemoryEmergence?.cancel();
  frame?.remove();edge?.remove();frame=null;edge=null;frameReady=null;phase='idle';
  back.click();suspend(false);
  const detail='主界面未能打开：'+String(error.message||error);
  q('.sc-a11y-status').textContent=detail;
  q('.sc-status').textContent=detail;
  send('main-error',{message:String(error)});
 }
}
async function leave(){
 if(phase!=='shown')return;
 phase='leaving';
 suspend(false);
 const ms=reduced.matches?0:Math.max(380,setting('open'));
 if(ms)await sweep(SHOW,AFTER,ms);
 frame.remove();edge.remove();frame=null;edge=null;frameReady=null;phase='idle';
 input.focus({preventScroll:true});
 send('logout');
}
// Escape would reset the registration mid-load; the main UI is already on its way.
root.addEventListener('keydown',e=>{if(phase==='loading'&&e.key==='Escape'){e.preventDefault();e.stopPropagation()}},true);
// Navigation must not depend on the animation class: zero-duration transitions reset it synchronously.
form.addEventListener('submit',()=>{const name=input.value.trim();if(input.dataset.composing!=='true'&&!window.StarchainNamePolicy.nameError(name)&&!input.matches('[aria-invalid="true"]'))enter(name)});
api.leaveMain=leave;
})();
