/* The title's airship and its two right-hand stars.
 * Idle: every few seconds the airship circles the title on a horizontal ring seen slightly from
 * above — small and behind the lettering on the far half, larger and in front of it on the near
 * half. It only turns at the two ends of the ring, where it faces the camera. The two stars ride
 * the same ring from their own perches, so all three go once around the title together and land.
 * Entry: the host asks for a snapshot (flight-capture) and flies copies across the screen; the
 * originals stay hidden until the host sends flight-reset. */
(()=>{
const svg=document.querySelector('.logo > svg'),scene=document.querySelector('.scene');
if(!svg)return;
const picks={ship:'#city-zeppelin',starA:'g[transform="translate(1755 231)"]:not([id])',starB:'g[transform="translate(1820 433)"]:not([id])'};
const ns='http://www.w3.org/2000/svg',TAU=Math.PI*2;
const smooth=x=>x<=0?0:x>=1?1:x*x*(3-2*x);
const mix=(a,b,t)=>a+(b-a)*t;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));

// Wrap each flyer in place; the wrapper carries the flight transform. A marker keeps the
// original slot so the airship can move in front of the lettering and back.
const flyers={};
for(const [name,sel] of Object.entries(picks)){
 const el=svg.querySelector(sel);if(!el)continue;
 const wrap=document.createElementNS(ns,'g');wrap.setAttribute('class','flyer');wrap.dataset.flyer=name;
 const slot=document.createComment('flyer:'+name);
 el.before(slot);slot.after(wrap);wrap.append(el);
 const b=wrap.getBBox();
 flyers[name]={el,wrap,slot,cx:b.x+b.width/2,cy:b.y+b.height/2,w:b.width,h:b.height,dx:0,dy:0,rot:0,s:1,sx:1,sy:1};
}
const ship=flyers.ship;if(!ship)return;
function place(f){
 f.wrap.setAttribute('transform',`translate(${(f.cx+f.dx).toFixed(2)} ${(f.cy+f.dy).toFixed(2)}) rotate(${f.rot.toFixed(2)}) scale(${(f.sx*f.s).toFixed(3)} ${(f.sy*f.s).toFixed(3)}) translate(${-f.cx} ${-f.cy})`);
}
function rest(f){f.dx=f.dy=f.rot=0;f.s=f.sx=f.sy=1;f.wrap.removeAttribute('transform')}
// 'home' = original slot, 'front' = over the lettering, 'back' = under it (next to the airship's slot).
function layer(f,mode){
 if(f.mode===mode)return;f.mode=mode;
 if(mode==='front')svg.append(f.wrap);else if(mode==='back')ship.slot.after(f.wrap);else f.slot.after(f.wrap);
}
// Native art faces left; |apparent width| never drops below this while the airship faces the camera.
const NOSE_ON=.22;
function apparent(a,prev){const sign=Math.abs(a)<1e-3?Math.sign(prev)||1:Math.sign(a);return sign*Math.max(NOSE_ON,Math.abs(a))}

// Ring around the title in logo units (viewBox 1940x811). sin(θ) > 0 is the near half.
const ring={cx:1000,cy:410,rx:930,ry:340};
const at=th=>({x:ring.cx+ring.rx*Math.cos(th),y:ring.cy+ring.ry*Math.sin(th)});
const angleOf=f=>Math.atan2((f.cy-ring.cy)/ring.ry,(f.cx-ring.cx)/ring.rx);
const th0=angleOf(ship);
const depth=th=>(1+.2*Math.sin(th))/(1+.2*Math.sin(th0)); // 1 at the perch
// Counter-clockwise on screen: leaves the perch heading left (its native facing), down around the
// left end, right along the near side, back around the right end and left along the far side.
const shipAngle=e=>th0-TAU*e;
// Stars ride the ring from their own perches, a little after the airship lifts off.
const riders=['starA','starB'].filter(k=>flyers[k]).map((k,i)=>({f:flyers[k],th:angleOf(flyers[k]),delay:.03+.03*i}));
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
let cfg={idleFlight:true,idleFlightInterval:12,idleFlightDuration:8};
let clock=0,last=performance.now(),captured=false;
function idle(t){
 const e=.5-.5*Math.cos(Math.PI*clamp(t,0,1)),th=shipAngle(e);
 const w=smooth(t/.1)*(1-smooth((t-.9)/.1)); // lift off the perch onto the ring, and back
 const p=at(th);
 ship.dx=mix(0,p.x-ship.cx,w);ship.dy=mix(0,p.y-ship.cy,w);
 // Moving along the ring the airship is side-on when crossing the near/far halves and nose-on at
 // the ends; its apparent width is -sin(θ) (negative = mirrored, i.e. facing right).
 const a=mix(1,-Math.sin(th),w);
 ship.sx=apparent(a,ship.sx);ship.sy=1+.1*(1-Math.abs(ship.sx));
 ship.s=mix(1,depth(th),w);
 // Gentle bank along the projected path, only while side-on.
 const vx=ring.rx*Math.sin(th),vy=-ring.ry*Math.cos(th),heading=Math.atan2(vy,vx)*180/Math.PI;
 const nose=ship.sx<0?heading:((heading+360)%360)-180;
 ship.rot=clamp(nose,-12,12)*Math.abs(ship.sx)*w;
 layer(ship,w>.5&&Math.sin(th)>0?'front':'home');
 place(ship);
 for(const r of riders){
  const f=r.f,tl=clamp((t-r.delay)/(1-2*r.delay),0,1);
  const er=.5-.5*Math.cos(Math.PI*tl),thr=r.th-TAU*er,wr=smooth(tl/.12)*(1-smooth((tl-.88)/.12));
  if(wr<=0){if(f.wrap.hasAttribute('transform'))rest(f);layer(f,'home');continue}
  const q=at(thr);
  f.dx=mix(0,q.x-f.cx,wr);f.dy=mix(0,q.y-f.cy,wr);
  f.s=mix(1,(1+.2*Math.sin(thr))/(1+.2*Math.sin(r.th)),wr);
  f.rot=90*er;f.sx=f.sy=1; // a four-pointed star looks the same after a quarter turn
  layer(f,wr<.5?'home':Math.sin(thr)>0?'front':'back');
  place(f);
 }
}
function settle(){for(const f of Object.values(flyers)){rest(f);layer(f,'home')}}
const tick=now=>{
 requestAnimationFrame(tick);
 const dt=Math.min(now-last,100)/1000;last=now;
 if(captured||document.hidden||scene.classList.contains('city-paused'))return;
 if(reduced.matches){if(clock)settle(),clock=0;return}
 const wait=Math.max(1,+cfg.idleFlightInterval||12),fly=Math.max(2,+cfg.idleFlightDuration||8);
 if(clock<wait&&!cfg.idleFlight){clock=0;return}
 clock+=dt;
 if(clock<wait)return;
 if(clock>=wait+fly){settle();clock=0;return}
 idle((clock-wait)/fly);
};
requestAnimationFrame(tick);

// Entry hand-off to the host page. The host draws each flyer as a bitmap, so the markup is frozen:
// every SMIL animation is replaced by the value it has right now.
const matrix=m=>`matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`;
// animVal transform lists are read-only (no consolidate()), so multiply the items out.
const combined=list=>{if(!list?.numberOfItems)return null;let m=new DOMMatrix();for(let i=0;i<list.numberOfItems;i++){const x=list.getItem(i).matrix;m=m.multiply(new DOMMatrix([x.a,x.b,x.c,x.d,x.e,x.f]))}return m};
function frozen(el){
 const copy=el.cloneNode(true),from=[el,...el.querySelectorAll('*')],to=[copy,...copy.querySelectorAll('*')];
 const twin=n=>to[from.indexOf(n)];
 for(const a of from){
  if(!(a instanceof SVGAnimationElement))continue;
  const target=a.targetElement,dst=target&&twin(target),name=a.getAttribute('attributeName');
  if(!dst)continue;
  if(a.localName==='animateMotion'){const p=target.parentNode?.getCTM?.(),t=target.getCTM?.();if(p&&t)dst.setAttribute('transform',matrix(p.inverse().multiply(t)))}
  else if(a.localName==='animateTransform'){const m=combined(target[name]?.animVal);if(m)dst.setAttribute(name,matrix(m));else dst.removeAttribute(name)}
  else{const v=getComputedStyle(target).getPropertyValue(name)||target[name]?.animVal?.value;if(v!=null&&v!=='')dst.setAttribute(name,v)}
 }
 for(const n of to)if(n instanceof SVGAnimationElement)n.remove();
 return copy.outerHTML;
}
function defsFor(el){
 const out=new Map();
 const scan=node=>{for(const e of [node,...node.querySelectorAll('*')])for(const a of e.attributes){
  for(const m of a.value.matchAll(/url\(#([^)"]+)\)/g))add(m[1]);
  if((a.name==='href'||a.name==='xlink:href')&&a.value[0]==='#')add(a.value.slice(1));
 }};
 const add=id=>{if(out.has(id))return;const d=svg.querySelector('#'+CSS.escape(id));if(!d||el.contains(d))return;out.set(id,frozen(d));scan(d)};
 scan(el);return [...out.values()].join('');
}
function capture(){
 if(reduced.matches)return null;
 captured=true;
 const r=svg.getBoundingClientRect(),k=r.width/1940,ss=Number(getComputedStyle(scene).getPropertyValue('--scene-scale'))||1;
 const data={k,left:r.left,top:r.top,sceneScale:ss,
  flyers:Object.entries(flyers).map(([name,f])=>({name,markup:frozen(f.el),defs:defsFor(f.el),cx:f.cx,cy:f.cy,box:[f.w+40,f.h+40],state:{dx:f.dx,dy:f.dy,rot:f.rot,s:f.s,sx:f.sx,sy:f.sy}}))};
 // The city is about to be wiped away: freeze the logo animations, film and optics so the GPU
 // spends the transition on the flight and the registration page. This deliberately avoids the
 // city-paused class, whose descendant rule would restyle the whole city in one frame.
 svg.pauseAnimations();scene.dataset.frozen='';scene.classList.add('is-entering');
 return data;
}
window.addEventListener('message',e=>{
 if(e.source!==parent||e.data?.channel!=='starchain-host')return;const m=e.data;
 if(m.type==='apply'&&m.config)for(const k of Object.keys(cfg))if(k in m.config)cfg[k]=m.config[k];
 if(m.type==='flight-capture')parent.postMessage({channel:'starchain-city',type:'flight',flight:capture()},'*');
 if(m.type==='flight-hide')for(const f of Object.values(flyers))f.wrap.style.visibility='hidden';
 if(m.type==='flight-reset'){captured=false;clock=0;settle();scene.classList.remove('is-entering');delete scene.dataset.frozen;for(const f of Object.values(flyers))f.wrap.style.visibility=''}
 if(m.type==='flight-idle-now'&&!captured){const wait=Math.max(1,+cfg.idleFlightInterval||12);if(clock<wait)clock=wait}
});
})();
