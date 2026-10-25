/* WebView adaptation of the inspected NBShader material technique.
 * Original textures: 光效_I base map + FX_WL_A_H10 noise.
 * Noise intensity/velocity: .18/(.14,-.27), title .05/(.08,.02).
 * This is a focused GLSL implementation, not the entire NBShader/URP package. */
(()=>{
window.StarchainOpticsReady=Promise.resolve(false);
const city=document.querySelector('.scene'),sun=document.querySelector('.optical-halo');if(!sun||!window.StarchainNBAssets)return;
const vertex='attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
const fragment=`precision mediump float;
varying vec2 uv;uniform sampler2D base,noiseTex;uniform float t,mode;
vec2 rot(vec2 p,float a){return mat2(cos(a),-sin(a),sin(a),cos(a))*(p-.5)+.5;}
void main(){vec2 v=vec2(uv.x,1.-uv.y);vec2 velocity=mix(vec2(.14,-.27),vec2(.08,.02),mode);
vec2 nUV=rot(v, mix(2.28638,3.14159,mode))*mix(vec2(2.68,1.4),vec2(1.),mode)+t*velocity;
float n=texture2D(noiseTex,fract(nUV)).r;float n2=texture2D(noiseTex,fract(nUV+vec2(.19,.37))).r;
vec2 warped=v+(vec2(n,n2)-.5)*mix(.18,.05,mode);
vec4 c=texture2D(base,clamp(warped,0.,1.));float lum=max(c.r,max(c.g,c.b));
float edge=smoothstep(0.,.06,v.x)*smoothstep(0.,.06,v.y)*smoothstep(0.,.06,1.-v.x)*smoothstep(0.,.06,1.-v.y);
if(mode<.5){float mask=smoothstep(.05,.42,n*.65+n2*.35);vec3 col=c.rgb*1.5;float core=exp(-dot((v-vec2(.35,.34))*vec2(1.,1.2),(v-vec2(.35,.34))*vec2(1.,1.2))*95.);col+=core*vec3(.7,.78,.85);gl_FragColor=vec4(col,clamp((lum*(.5+mask*.5)*1.6+core*.38)*edge,0.,1.));}
else{float shine=smoothstep(.25,.85,n)*(.65+.35*sin(t*1.3+v.x*9.));gl_FragColor=vec4(mix(c.rgb,vec3(.76,.9,1.),.35)*1.3,c.a*shine*.45*edge);}}
`;
const image=url=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url});
const noiseImage=image(StarchainNBAssets.noise);
async function create(host,url,mode){
const canvas=document.createElement('canvas');canvas.className='nb-optics-canvas';canvas.setAttribute('aria-hidden','true');
try{
// Decode first, then compile/upload. Share the noise decode across both layers.
const images=await Promise.all([image(url),noiseImage]);
const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,depth:false,preserveDrawingBuffer:false});if(!gl)return false;
const shader=(type,code)=>{const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const pos=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
images.forEach((img,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);gl.uniform1i(gl.getUniformLocation(program,i?'noiseTex':'base'),i)});
canvas.width=mode?768:512;canvas.height=mode?Math.round(768*images[0].height/images[0].width):512;gl.viewport(0,0,canvas.width,canvas.height);gl.uniform1f(gl.getUniformLocation(program,'mode'),mode);const time=gl.getUniformLocation(program,'t');
let last=performance.now(),elapsed=0,handle;const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const draw=()=>{gl.uniform1f(time,reduced.matches?0:elapsed);gl.drawArrays(gl.TRIANGLES,0,6);canvas.dataset.frame=String((Number(canvas.dataset.frame)||0)+1)};
// The hidden registration halo needs a real first draw too, before it replaces
// its SVG fallback; input locking must not defer shader warm-up until entry.
host.append(canvas);draw();gl.flush();host.classList.add('nb-optics-ready');
const render=now=>{handle=requestAnimationFrame(render);const inactive=document.hidden||(city?city.classList.contains('city-paused')||'frozen' in city.dataset:document.querySelector('#starchain-motion-lab').inert||document.querySelector('.sc-product').classList.contains('sc-paused')||document.querySelector('.sc-product').classList.contains('sc-transitioning'));if(inactive){last=now;return}if(now-last<33)return;elapsed+=Math.min(now-last,100)/1000;last=now;draw()};handle=requestAnimationFrame(render);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(handle);host.classList.remove('nb-optics-ready');canvas.remove()});window.addEventListener('pagehide',()=>cancelAnimationFrame(handle),{once:true});
return true;
}catch(e){console.warn('NB optics fallback:',e.message);host.classList.remove('nb-optics-ready');canvas.remove();return false}
}
window.StarchainOpticsReady=(async()=>{
 const sunReady=await create(sun,StarchainNBAssets.halo,0);
 if(city){const logo=document.querySelector('.logo'),source=logo?.querySelector(':scope > svg')?.cloneNode(true);if(source){
  // Yield between contexts, rather than compiling the three city shaders in
  // the same long task. The startup handshake waits for these warm frames.
  await new Promise(resolve=>setTimeout(resolve,0));
  source.setAttribute('xmlns','http://www.w3.org/2000/svg');source.setAttribute('width','1940');source.setAttribute('height','811');source.querySelectorAll('animate,animateTransform,animateMotion').forEach(e=>e.remove());
  // The airship and stars fly away from their perches (city-flight.js); keep them out of the static shimmer.
  source.querySelectorAll('.flyer').forEach(e=>e.remove());const layer=document.createElement('div');layer.className='nb-title-shimmer';logo.append(layer);
  return (await create(layer,'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(source)),1))&&sunReady;
 }}
 return sunReady;
})().catch(error=>{console.warn('NB optics fallback:',error.message);return false});
})();
