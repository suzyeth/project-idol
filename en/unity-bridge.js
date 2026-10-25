/* Keep the landscape registration art and controls on one design coordinate system.
 * IME changes occlusion, not the scale of the game surface. Native Android sends
 * physical keyboard height; browsers/iOS can instead shrink visualViewport. */
(()=>{
 const root=document.documentElement,login=document.querySelector('#starchain-motion-lab');
 const mobile=matchMedia('(pointer:coarse)').matches||/Android|iPhone|iPad/.test(navigator.userAgent);
 let width=0,height=0,keyboardRatio=0,shift=0,pending=0,lastEditing=0;
 const editable=()=>{const e=document.activeElement;return e?.matches('input:not([type=radio],[type=checkbox],[type=button],[type=submit]),textarea,[contenteditable=true]')?e:null};
 function layout(){
  pending=0;
  const w=root.clientWidth,h=root.clientHeight,input=editable();
  if(input)lastEditing=performance.now();
  const closingKeyboard=lastEditing>0&&performance.now()-lastEditing<800;
  // A focused keyboard can shrink the layout viewport on older WebViews. Keep
  // the pre-keyboard height unless the width changes (real rotation/resizing).
  if(!width||Math.abs(w-width)>2){width=w;height=h;keyboardRatio=0;shift=0;root.style.setProperty('--login-keyboard-shift','0px');}
  else if(!keyboardRatio&&!(h<height*.8&&(input||closingKeyboard))){height=h;}
  const landscape=mobile&&width>=height;
  root.classList.toggle('starchain-mobile-viewport',landscape);
  if(!landscape){shift=0;root.style.setProperty('--login-keyboard-shift','0px');return;}
  const scale=Math.min(width/1200,height/520);
  root.style.setProperty('--login-scale',scale);
  root.style.setProperty('--login-left',(width-1200*scale)/2+'px');
  root.style.setProperty('--login-top',(height-520*scale)/2+'px');
  const visible=Math.min(height*(1-keyboardRatio),window.visualViewport?.height||h,h);
  const target=input?.closest('.sc-content');
  const next=target?Math.max(0,input.getBoundingClientRect().bottom+shift-visible+12*scale):0;
  shift=next;
  root.style.setProperty('--login-keyboard-shift',shift/scale+'px');
  if(scrollX||scrollY)window.scrollTo(0,0);
 }
 function schedule(){if(!pending)pending=requestAnimationFrame(layout);}
 window.StarchainViewport={setKeyboard(pixels,screenHeight){keyboardRatio=Math.min(.9,Math.max(0,Number(pixels)||0)/Math.max(1,Number(screenHeight)||1));schedule();}};
 addEventListener('resize',schedule);addEventListener('scroll',schedule,{passive:true});
 window.visualViewport?.addEventListener('resize',schedule);
 window.visualViewport?.addEventListener('scroll',schedule);
 login?.addEventListener('focusin',schedule);login?.addEventListener('focusout',schedule);
 document.fonts?.ready.then(schedule);
 layout();
})();

(()=>{
 const q=s=>document.querySelector(s);
 const send=(type,data={})=>window.Unity?.call(JSON.stringify({type,...data}));
 let announced=false,preparing=false;
 const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
 // Distribute the traffic heads along their routes before any frame is revealed.
 document.querySelectorAll('.sc-conduit').forEach((line,i)=>line.style.setProperty('--delay',(-.45-i*.37)+'s'));
 async function prepare(){
  if(preparing)return;preparing=true;
  // With the boot intro (boot-intro.js) the intro reveals the login scene itself, behind its white; Unity lifted
  // its cover on the intro's first frame already, so 'presented' only confirms the hand-off here.
  if(window.StarchainBoot){await window.StarchainBoot.handoff;await frame();await frame();send('presented');return}
  if(window.StarchainCityReady)await window.StarchainCityReady;
  // Resources and child layout already acknowledged readiness; only allow a paint.
  await frame();
  const boot=window.StarchainNativeBoot;
  const elapsed=boot?boot.age*1000+performance.now()-boot.at:0;
  await window.Starchain?.revealCity?.(elapsed);
  document.documentElement.classList.add('starchain-presented');
  await frame();await frame();send('presented');
 }
 async function ready(){
  if(document.readyState!=='complete')await new Promise(resolve=>window.addEventListener('load',resolve,{once:true}));
  if(document.fonts)await document.fonts.ready;
  await frame();await frame();
  if(!announced&&typeof window.Unity?.call==='function'){announced=true;send('ready')}
 }
 window.Starchain={
  apply(config){
   for(const key of ['speed','mechanical','close','open','hold']){
    const el=q('[data-setting="'+key+'"]');if(!el||!Number.isFinite(config[key]))continue;
    el.max=key==='hold'?'30000':el.max;el.value=String(config[key]);el.dispatchEvent(new Event('input',{bubbles:true}));
   }
   if(Number.isFinite(config.themeDuration)){const e=q('.sc-theme-duration');e.value=config.themeDuration;e.dispatchEvent(new Event('input',{bubbles:true}))}
   if(typeof config.playing==='boolean'&&q('.sc-product').classList.contains('sc-paused')===config.playing)q('.sc-pause').click();
   prepare();
  },
  preview(){q('.sc-preview').click()},
  reset(){if(!q('.sc-transition').hidden)q('.sc-back').click();q('.sc-theme-toggle').click()},
  setName(value){const e=q('input[type=text]');e.value=String(value);e.dispatchEvent(new Event('input',{bubbles:true}))},
  showTheme(){q('input[type=text]').focus()},
  submit(){q('form').requestSubmit()},
  ready
 };
 q('form').addEventListener('submit',()=>{const name=q('input[type=text]').value.trim();if(name)send('enter',{name,gender:q('input[name=fusion-gender]:checked')?.value||''})});
 window.Starchain.ready();
})();

/* PC cursor: the WebView is captured into a texture, so the CSS cursor never reaches the OS. Report the
 * cursor under the pointer to Unity (StarchainCursor) as { type: 'cursor', name }. Over the main UI's
 * iframe the main UI reports its own (pidol-backstage js/cursor.js through pidol-host.js). */
(()=>{
 let target=null,last='',checked=0;
 // cursor:auto leaves the choice to the browser (an I-beam over editable text, else the arrow); resolve it the same way.
 const EDITABLE='textarea,[contenteditable]:not([contenteditable=false]),input:not([type=button],[type=submit],[type=reset],[type=checkbox],[type=radio],[type=range],[type=color],[type=file],[type=image])';
 function report(){
  if(!target||target.tagName==='IFRAME'||!target.isConnected)return;
  let name=getComputedStyle(target).cursor;
  if(name==='auto')name=target.closest(EDITABLE)?'text':'default';
  if(name!==last){last=name;window.Unity?.call(JSON.stringify({type:'cursor',name}))}
 }
 function track(e){
  if(e.pointerType==='touch')return;
  target=e.target instanceof Element?e.target:null;
  // pointermove is throttled; over/down/up (target or :active changes) report at once.
  if(e.type!=='pointermove'||e.timeStamp-checked>80){checked=e.timeStamp;report()}
 }
 for(const type of ['pointerover','pointermove','pointerdown','pointerup'])document.addEventListener(type,track,{capture:true,passive:true});
 // States change under a resting pointer too (e.g. the submit button turns to cursor:wait).
 setInterval(report,250);
})();

(()=>{
 const q=s=>document.querySelector(s),product=q('.sc-product'),stage=q('.sc-stage');
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const hover=document.createElement('span');hover.className='sc-hover-pixels';hover.setAttribute('aria-hidden','true');q('.sc-submit').prepend(hover);
 const options=q('.sc-options'),slider=document.createElement('span');slider.className='sc-gender-slider';slider.setAttribute('aria-hidden','true');options.prepend(slider);
 function syncGender(){const selected=options.querySelector('input:checked')?.closest('label');if(!selected)return;slider.style.width=selected.offsetWidth+'px';slider.style.transform='translateX('+selected.offsetLeft+'px)'}
 options.addEventListener('change',syncGender);new ResizeObserver(syncGender).observe(options);document.fonts?.ready.then(syncGender);syncGender();
 const flow=document.createElement('div');flow.className='sc-data-flow';flow.setAttribute('aria-hidden','true');stage.append(flow);
 const spine=document.createElement('i');spine.className='sc-data-spine';flow.append(spine);
 const packets=Array.from({length:24},(_,i)=>{const p=document.createElement('i');p.className='sc-data-packet'+(i%6===0?' sc-data-code':'');p.style.top=(5+i*3.8)+'%';p.style.width=(12+(i*19)%84)+'px';p.textContent=i%6===0?['01_','>_','101','//'][i/6]:'';flow.append(p);return p});
 let animations=[];
 window.addEventListener('starchain:palette',({detail:{dark,duration}})=>{
  animations.forEach(a=>a.cancel());animations=[];
  if(!duration||reduced.matches||product.classList.contains('sc-paused'))return;
  const width=stage.clientWidth,from=dark?-width*.18:width*1.18,to=dark?width*1.18:-width*.18;
  const colors=dark?['#e7ee10','#f000a8','#00cbd2']:['#00cbd2','#e7ee10','#f000a8'];
  const run=(el,frames,options={})=>{const a=el.animate(frames,{duration,fill:'none',easing:'cubic-bezier(.4,0,.6,1)',...options});animations.push(a)};
  run(spine,[{transform:`translateX(${from}px) skewX(-18deg)`,opacity:0},{opacity:.9,offset:.18},{opacity:.9,offset:.78},{transform:`translateX(${to}px) skewX(-18deg)`,opacity:0}]);
  packets.forEach((p,i)=>{p.style.setProperty('--packet-color',colors[i%3]);const drift=((i*37)%160)-80;run(p,[{transform:`translateX(${from+drift}px)`,opacity:0},{opacity:i%6===0?.7:.85,offset:.2},{opacity:.6,offset:.66},{transform:`translateX(${to+drift}px)`,opacity:0}],{delay:(i%4)*duration*.025,duration:duration*.85})});
 });
})();
