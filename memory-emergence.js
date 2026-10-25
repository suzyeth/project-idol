/* First successful entry only. Unity supplies the native state; standalone previews keep it locally.
 * Keep the imported anchor renderer separate from the export's demo host/repeat-login flow. */
(() => {
 'use strict';
 const KEY='starchain:memory-emergence:v1',PENDING=KEY+':pending';
 const api=window.Starchain,root=document.getElementById('starchain-motion-lab');
 const input=root.querySelector('input[type="text"]');
  function makeMorph() {
    const out = {};
    const title = root.querySelector('#title > text') || root.querySelector('#title text');
    const button = root.querySelector('.sc-submit');
    const formEl = root.querySelector('.sc-form');
    const product = root.querySelector('.sc-product');
    const dark = !!product?.classList.contains('sc-dark');
    if (title) {
      const r = title.getBoundingClientRect();
      const cs = getComputedStyle(title);
      if (r.width > 20) {
        out.title = {
          left: r.left, top: r.top, width: r.width, height: r.height,
          text: title.textContent.trim(),
          font: cs.fontFamily || 'Microsoft YaHei, sans-serif',
          weight: cs.fontWeight || '700',
          size: Math.max(16, Math.round(r.height * 1.12)),
          color: cs.fill && cs.fill !== 'none' ? cs.fill : (dark ? '#fafafa' : '#182825'),
          spacing: cs.letterSpacing && cs.letterSpacing !== 'normal' ? cs.letterSpacing : '1px'
        };
      }
    }
    if (button) {
      const r = button.getBoundingClientRect();
      const bg = getComputedStyle(button).backgroundColor;
      if (r.width > 20 && bg && bg !== 'rgba(0, 0, 0, 0)') {
        out.button = { left: r.left, top: r.top, width: r.width, height: r.height, background: bg };
      }
    }
    if (formEl) {
      const r = formEl.getBoundingClientRect();
      if (r.width > 20) {
        out.panel = {
          left: r.left, top: r.top, width: r.width, height: r.height,
          border: dark ? 'rgba(255,255,255,.18)' : 'rgba(24,40,37,.18)'
        };
      }
    }
    if (input.value.trim()) {
      const r = input.getBoundingClientRect();
      const cs = getComputedStyle(input);
      out.name = {
        left: r.left + 4, top: r.top + Math.max(0, r.height * .28),
        text: input.value.trim(),
        font: cs.fontFamily || 'Microsoft YaHei, sans-serif',
        size: Math.max(14, Math.round(r.height * .48)),
        color: cs.color || (dark ? '#f7f7f2' : '#182825'),
        spacing: cs.letterSpacing && cs.letterSpacing !== 'normal' ? cs.letterSpacing : '0px'
      };
    }
    return Object.keys(out).length ? out : null;
  }


 let completed=false,played=false,always=false;
 try {
  const legacy=JSON.parse(localStorage.getItem('pidol:producer:v1')||'null');
  completed=localStorage.getItem(KEY)==='1'||(localStorage.getItem(PENDING)!=='1'&&!!legacy?.id);
 } catch {}
 const apply=api.apply.bind(api);
 api.apply=config=>{
  if(typeof config?.memoryEmergenceCompleted==='boolean')completed=config.memoryEmergenceCompleted;
  apply(config);
 };
 window.StarchainMemoryEmergence={
  setAlways(value){
   always=value===true;
   try {localStorage.setItem('pidol:memory-emergence-always:v1',always?'1':'0');} catch {}
  },
  capture(){
   const input=root.querySelector('input[type="text"]'),line=root.querySelector('.name-underline');
   const rect=(line||input).getBoundingClientRect();
   return {morph:makeMorph(),origin:{left:rect.left,top:rect.top,width:rect.width,height:rect.height},theme:root.querySelector('.sc-product')?.classList.contains('sc-dark')?'dark':'light'};
  },
  play(profile,visual){
   // Read on every entry so a toggle changed inside the lobby takes effect on relogin.
   try {always=localStorage.getItem('pidol:memory-emergence-always:v1')==='1';} catch {}
   if((completed&&!always)||!window.StarchainAnchor)return null;
   played=true;
   try {localStorage.setItem(PENDING,'1');} catch {}
   return window.StarchainAnchor.play(profile,{
    theme:visual?.theme||(document.querySelector('.sc-product')?.classList.contains('sc-dark')?'dark':'light'),
    origin:visual?.origin,morph:visual?.morph,
    simplified:false,allowCancel:false,cta:false,autoFinish:false,
   });
  },
  finish(){return played?window.StarchainAnchor.finish():Promise.resolve();},
  complete(){
   if(!played)return;
   completed=true;played=false;
   try {localStorage.setItem(KEY,'1');localStorage.removeItem(PENDING);} catch {}
   window.Unity?.call(JSON.stringify({type:'memory-emergence-complete'}));
  },
  async cancel(){
   if(played)await window.StarchainAnchor.close({instant:true,silent:true});
   played=false;
  },
 };
})();
