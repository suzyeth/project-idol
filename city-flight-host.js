/* Entry flight on the host page. Copies of the city title's airship and stars (snapshot from
 * city-flight.js) launch from where they are, sweep across the screen on wide arcs and leave.
 * The airship drags the wipe: the city iframe is clipped to the area ahead of a chevron whose
 * tip rides the trail just behind the airship, revealing the registration page; a glowing
 * stroke along the chevron hides the hard edge.
 * Everything moving is drawn on one canvas. The flyers are rasterised once, before take-off, at
 * the largest size they reach, so no vector artwork or filter is re-rasterised during the flight. */
(()=>{
const ns='http://www.w3.org/2000/svg';
const smooth=x=>x<=0?0:x>=1?1:x*x*(3-2*x);
const mix=(a,b,t)=>a+(b-a)*t;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const bez=(p,t)=>{const u=1-t;return u*u*u*p[0]+3*u*u*t*p[1]+3*u*t*t*p[2]+t*t*t*p[3]};
// Progress along the airship's path: slow while it turns, still fast as it leaves the screen.
const travel=p=>{const x=clamp((p-.02)/.98,0,1);return x*x*(2.4-1.4*x)};
// Growth over time: it swings toward the camera while turning, then keeps closing in as it crosses.
const SHIP_GROW=[1.4,1.7],STAR_GROW=[.7,.9];
const grow=(p,[near,far])=>1+near*smooth(p/.35)+far*smooth((p-.35)/.65);
const tangent=(path,u)=>{const v=Math.min(1,u+.01),w=Math.max(0,v-.02);return [bez(path[0],v)-bez(path[0],w),bez(path[1],v)-bez(path[1],w)]};
// Native art faces left; while the airship faces the camera its width never drops below NOSE_ON.
const NOSE_ON=.22,apparent=a=>(a<0?-1:1)*Math.max(NOSE_ON,Math.abs(a));

// One canvas for every flight, created and drawn once while idle: the first 2D draw on a new
// canvas costs tens of milliseconds, which would otherwise land on the flight's first frame.
let canvas=null,ctx=null;
// Bound the transient effect's pixel cost independently of a phone's physical DPR.
const flightDPR=()=>Math.min(devicePixelRatio||1,1.5,Math.sqrt(1600*900/(innerWidth*innerHeight)));
function surface(){
 const W=innerWidth,H=innerHeight,dpr=flightDPR(),w=Math.round(W*dpr),h=Math.round(H*dpr);
 if(!canvas){canvas=document.createElement('canvas')}
 if(canvas.width!==w||canvas.height!==h||!ctx){canvas.width=w;canvas.height=h;ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.lineCap='round';ctx.lineJoin='round'}
 return ctx;
}
function warm(){const c=surface();c.strokeStyle='rgba(0,0,0,0)';c.lineWidth=40;c.beginPath();c.moveTo(0,0);c.lineTo(10,10);c.stroke();c.clearRect(0,0,canvas.width,canvas.height)}
(window.requestIdleCallback||(f=>setTimeout(f,1000)))(warm,{timeout:3000});
let generation=0; // a newer flight takes over the shared canvas

// Rasterise a frozen flyer (with the title's drop shadow) at `peak` times its on-screen size.
async function sprite(f,data,peak){
 const dpr=flightDPR(),[w,h]=f.box,unit=data.k*peak*dpr,ss=data.sceneScale*peak*dpr;
 const doc=`<svg xmlns="${ns}" width="${Math.ceil(w*unit)}" height="${Math.ceil(h*unit)}" viewBox="${f.cx-w/2} ${f.cy-h/2} ${w} ${h}"><defs>${f.defs}</defs>${f.markup}</svg>`;
 const img=new Image(),url=URL.createObjectURL(new Blob([doc],{type:'image/svg+xml'}));
 img.src=url;await img.decode();URL.revokeObjectURL(url);
 const pad=Math.ceil(8*ss),c=document.createElement('canvas');
 c.width=img.width+2*pad;c.height=img.height+2*pad;
 const g=c.getContext('2d');
 g.filter=`drop-shadow(0 ${ss}px ${ss}px rgba(6,12,35,.8)) drop-shadow(0 0 ${3*ss}px rgba(18,28,57,.42))`;
 g.drawImage(img,pad,pad);
 return {image:c,w:c.width/(peak*dpr),h:c.height/(peak*dpr),peak}; // w,h in CSS px at scale 1
}

// Trail strokes, batched: points are grouped by fade level so each pass is a handful of paths.
function strokeTrail(ctx,pts,now,life,passes){
 const B=8,groups=[];
 for(let i=1;i<pts.length;i++){
  const a=1-(now-pts[i].t)/life;if(a<=0)continue;
  const b=Math.min(B-1,Math.floor(a*B));(groups[b]=groups[b]||[]).push(i);
 }
 for(const [width,color] of passes)for(let b=0;b<B;b++){
  const g=groups[b];if(!g)continue;
  const mid=g[g.length>>1];
  ctx.strokeStyle=color((b+.5)/B,mid/pts.length);ctx.lineWidth=width*pts[mid].w;
  ctx.beginPath();
  ctx.moveTo(pts[g[0]-1].x,pts[g[0]-1].y);for(const i of g)ctx.lineTo(pts[i].x,pts[i].y); // fade levels follow age, so each group is one run
  ctx.stroke();
 }
}
function drawSprite(ctx,sp,x,y,rot,sx,sy){
 ctx.save();ctx.translate(x,y);ctx.rotate(rot*Math.PI/180);ctx.scale(sx/sp.peak,sy/sp.peak);
 ctx.drawImage(sp.image,-sp.w*sp.peak/2,-sp.h*sp.peak/2,sp.w*sp.peak,sp.h*sp.peak);
 ctx.restore();
}

async function play(data,{frame,duration,onMounted}){
 const W=innerWidth,H=innerHeight,k=data.k;
 const all=data.flyers.map(f=>({...f,x0:data.left+(f.cx+f.state.dx)*k,y0:data.top+(f.cy+f.state.dy)*k}));
 const ship=all.find(f=>f.name==='ship'),stars=all.filter(f=>f!==ship);
 const shipPeak=ship.state.s*grow(1,SHIP_GROW),starPeak=Math.max(...stars.map(f=>f.state.s),1)*grow(1,STAR_GROW);
 await Promise.all(all.map(async f=>{f.sprite=await sprite(f,data,f===ship?shipPeak:starPeak)}));
 return new Promise(resolve=>{
  const layer=document.createElement('div');layer.className='city-flight';
  const mine=++generation,ctx=surface();ctx.clearRect(0,0,W,H);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  layer.append(canvas);document.body.append(layer);
  // The airship turns toward the camera while dropping (nose-on, so it reads narrow), comes out
  // facing right and sweeps across, growing steadily as it passes close to the camera.
  ship.path=[[ship.x0,ship.x0-.05*W,.42*W,1.38*W],[ship.y0,ship.y0+.3*H,1.02*H,.22*H]];
  const yaw0=Math.acos(clamp(ship.state.sx??1,-1,1)); // 0 = native art (facing left), π = facing right
  // The stars fly as wingmen: on the airship's own path, a little behind it, one on each side.
  stars.forEach((f,i)=>{f.lag=.025+.025*i;f.side=i%2?1:-1;f.sparks=[]});
  const shipW=ship.box[0]*k*.55;
  const trail=[],lag=.05*W,reachTop=.1*W,reachBottom=.14*W;
  let mounted=false,t0=0,done=false,edge=null;
  const setClip=v=>{frame.style.clipPath=v};

  function draw(now){
   ctx.clearRect(0,0,W,H);
   if(edge){
    // Glowing chevron edge over the clip seam.
    const [t,a,b]=edge;
    for(const [width,color] of [[.09*W,'rgba(156,218,229,.10)'],[.03*W,'rgba(210,196,238,.28)'],[3,'rgba(240,250,255,.85)']]){
     ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(t[0],t[1]);ctx.lineTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
    }
   }
   strokeTrail(ctx,trail,now,duration*.5,[[34,(a,r)=>`rgba(${mix(156,190,r)|0},${mix(218,176,r)|0},${mix(229,238,r)|0},${.12*a})`],[11,(a,r)=>`rgba(${mix(156,210,r)|0},${mix(218,196,r)|0},${mix(229,238,r)|0},${.38*a})`],[2.6,a=>`rgba(242,250,255,${.9*a})`]]);
   for(const f of stars)strokeTrail(ctx,f.sparks,now,duration*.3,[[7,a=>`rgba(214,200,245,${.22*a})`],[1.6,a=>`rgba(255,255,255,${.85*a})`]]);
   if(!done)for(const f of all)if(f.pose)drawSprite(ctx,f.sprite,...f.pose);
  }

  function step(now){
   if(mine!==generation){layer.remove();return}
   if(!t0)t0=now;
   const p=Math.min(1,(now-t0)/duration);
   if(p<1){
    // Airship.
    const u=travel(p),x=bez(ship.path[0],u),y=bez(ship.path[1],u);
    const [vx,vy]=tangent(ship.path,u),len=Math.hypot(vx,vy)||1;
    const a=apparent(Math.cos(mix(yaw0,Math.PI,smooth(p/.32))));
    const s=ship.state.s*grow(p,SHIP_GROW),heading=Math.atan2(vy,vx)*180/Math.PI;
    const nose=a<0?heading:((heading+360)%360)-180;
    const rot=mix(ship.state.rot,clamp(nose,-26,26)*Math.abs(a),smooth(p/.2));
    ship.pose=[x,y,rot,a*s,(1+.1*(1-Math.abs(a)))*s];
    const back=shipW*s*.5;
    if(u>0)trail.push({x:x-vx/len*back,y:y-vy/len*back,t:now,w:.6+.4*s});
    // Stars: ease from their perches into formation beside the airship's path.
    for(const f of stars){
     const pl=Math.max(0,p-f.lag),ul=travel(pl),[tx,ty]=tangent(ship.path,ul),tl=Math.hypot(tx,ty)||1;
     const reach=f.side*(18+16*ship.state.s*grow(pl,SHIP_GROW));
     const fx=bez(ship.path[0],ul)-ty/tl*reach,fy=bez(ship.path[1],ul)+tx/tl*reach;
     const join=smooth(p/(.22+f.lag)),sx=mix(f.x0,fx,join),sy=mix(f.y0,fy,join);
     const sc=f.state.s*grow(pl,STAR_GROW);
     f.pose=[sx,sy,f.state.rot+180*smooth(p),sc,sc];
     if(join>.05)f.sparks.push({x:sx,y:sy,t:now,w:sc*.8});
    }
    // Wipe: the city stays only ahead of a chevron whose tip trails the airship.
    // The tip starts off-screen left and catches up with the airship, so the reveal always
    // begins at the edge even when the airship launches from mid-orbit.
    const catchUp=smooth((p-.04)/.3);
    const tip=[mix(-reachBottom-20,x-vx/len*lag,catchUp),clamp(y-vy/len*lag,0,H)];
    const top=[tip[0]-reachTop,-20],bottom=[tip[0]-reachBottom,H+20];
    if(Math.max(top[0],bottom[0],tip[0])>0){
     edge=[top,tip,bottom];
     setClip(`polygon(${top[0]}px ${top[1]}px,${tip[0]}px ${tip[1]}px,${bottom[0]}px ${bottom[1]}px,${W+40}px ${H+20}px,${W+40}px -20px)`);
    }
   }else if(!done){
    done=true;edge=null;setClip('polygon(0 0,0 0,0 0)');
    resolve();
   }
   draw(now);
   if(!mounted){mounted=true;requestAnimationFrame(()=>onMounted?.())}
   // Let the trail fade out on its own after the hand-off, then clean up.
   if(done&&now-t0>duration*1.5){layer.remove();setClip('');return}
   requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
 });
}
// Stop any flight still running or fading out (e.g. returning to the city right away).
function cancel(frame){generation++;document.querySelectorAll('.city-flight').forEach(e=>e.remove());if(frame)frame.style.clipPath=''}
window.StarchainFlight={play,cancel};
})();
