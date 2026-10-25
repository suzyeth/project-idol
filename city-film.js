/* Full-map film based on the reference 光效_I texture and scrolling noise.
 * This transparent layer never samples or filters the logo or entry text. */
(()=>{
const scene=document.querySelector('.scene'),host=document.querySelector('.city-light-film');
window.StarchainFilmReady=Promise.resolve(false);
if(!scene||!host||!window.StarchainNBAssets)return;
const canvas=document.createElement('canvas');canvas.className='city-film-canvas';canvas.setAttribute('aria-hidden','true');
const vertex='attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
const fragment=`precision mediump float;
varying vec2 uv;uniform sampler2D spectrum,noiseTex;uniform float time,strength;
vec2 rotateUV(vec2 p,float a){return mat2(cos(a),-sin(a),sin(a),cos(a))*(p-.5)+.5;}
vec3 rainbow(float p){return .54+.46*cos(6.28318*(vec3(0.,.34,.67)+p));}
void main(){
 vec2 p=vec2(uv.x,1.-uv.y);float t=time;
 vec2 q=rotateUV(p,2.28638)*vec2(2.68,1.4)+t*vec2(.14,-.27);
 vec2 n=texture2D(noiseTex,fract(q)).rg;
 float n2=texture2D(noiseTex,fract(q*.61+vec2(.37,t*.05))).r;
 // A large off-centre section of the reference arc, not a small isolated ring.
 vec2 arc=vec2(p.x*.67+.16,p.y*.42+.25);
 arc+=vec2(sin(t*.72)*.10,cos(t*.53)*.075)+n*.1126;
 vec3 a=texture2D(spectrum,clamp(arc,0.,1.)).rgb;
 vec2 arc2=vec2(.9-p.x*.68,.23+p.y*.42)+vec2(cos(t*.43)*.12,sin(t*.61)*.08)+n.yx*.065;
 vec3 b=texture2D(spectrum,clamp(arc2,0.,1.)).rgb;
 // Broad moving interference ribbons connect the fine reference texture.
 float wave=p.x*.9+p.y*.48+.09*sin(p.y*5.5-t*.64)+.07*sin(p.x*7.+t*.4)+n2*.065;
 float phase=wave*10.-t*.85;
 float band=pow(.5+.5*sin(phase),5.);
 float fine=.5+.5*sin(wave*195.+n.r*6.-t*3.2);
 vec3 tint=rainbow(wave*2.9-t*.12+.18);
 vec3 ribbons=tint*band*(.27+.18*fine);
 float glint=pow(.5+.5*sin(phase+.65),32.)*(.16+.36*n2);
 vec3 color=(a*1.8+b*1.05+ribbons+vec3(.79,.9,1.)*glint)*1.2;
 // Fade at the image boundary, leaving the surrounding letterbox black.
 float edge=smoothstep(0.,.035,p.x)*smoothstep(0.,.035,1.-p.x)*smoothstep(0.,.055,p.y)*smoothstep(0.,.055,1.-p.y);
 gl_FragColor=vec4(color,clamp(strength*edge,.0,1.));
}`;
const image=url=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url});
let raf=0,observer;
function fallback(){cancelAnimationFrame(raf);observer?.disconnect();host.classList.remove('city-film-ready');canvas.remove()}
async function init(){try{
 // Finish the small optical layers first, yielding before this full-map shader.
 // A failed/unsupported optical layer resolves to its fallback and cannot block us.
 await window.StarchainOpticsReady;
 await new Promise(resolve=>setTimeout(resolve,0));
 const textures=await Promise.all([image(StarchainNBAssets.halo),image(StarchainNBAssets.noise)]);
 const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,depth:false});if(!gl)return false;
 const shader=(type,code)=>{const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
 const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const location=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
 textures.forEach((img,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);gl.uniform1i(gl.getUniformLocation(program,i?'noiseTex':'spectrum'),i)});
 const resize=()=>{const rect=scene.getBoundingClientRect(),width=Math.max(320,Math.min(1440,Math.round(rect.width*devicePixelRatio))),height=Math.round(width*1079/2580);if(canvas.width===width&&canvas.height===height)return false;canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height);return true};resize();
 const uTime=gl.getUniformLocation(program,'time'),uStrength=gl.getUniformLocation(program,'strength');
 let last=performance.now(),elapsed=1.8,amount=.62,period=12;
 const update=()=>{const css=getComputedStyle(scene);amount=parseFloat(css.getPropertyValue('--film-strength'))||0;period=Math.max(4,parseFloat(css.getPropertyValue('--film-period'))||12)};update();
 const styleObserver=new MutationObserver(update);styleObserver.observe(scene,{attributes:true,attributeFilter:['style']});
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');let dirty=false;
 const draw=()=>{gl.uniform1f(uTime,elapsed);gl.uniform1f(uStrength,amount);gl.drawArrays(gl.TRIANGLES,0,6);dirty=false;canvas.dataset.frame=String((Number(canvas.dataset.frame)||0)+1)};
 // Keep the CSS fallback until the real texture has a rendered first frame.
 host.append(canvas);draw();gl.flush();host.classList.add('city-film-ready');
 observer=new ResizeObserver(()=>{if(resize())draw()});observer.observe(document.documentElement);
 window.addEventListener('starchain-film-change',()=>{update();dirty=true});
 const render=now=>{raf=requestAnimationFrame(render);const paused=document.hidden||scene.classList.contains('city-paused')||'frozen' in scene.dataset;if(paused&&!dirty){last=now;return}if(now-last<33&&!dirty)return;if(!paused&&!reduced.matches)elapsed+=Math.min(now-last,80)/1000*(12/period);last=now;draw()};
 raf=requestAnimationFrame(render);canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();styleObserver.disconnect();fallback()});window.addEventListener('pagehide',()=>{styleObserver.disconnect();fallback()},{once:true});
 return true;
}catch(error){console.warn('City film fallback:',error.message);fallback();return false}}
window.StarchainFilmReady=init();
})();
