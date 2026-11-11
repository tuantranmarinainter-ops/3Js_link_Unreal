import * as THREE from './vendor/three.module.js';

const $ = id => document.getElementById(id);
const MOTIONS = [ ['idle','Đứng yên','◉'], ['walk','Đi bộ','↗'], ['run','Chạy','↠'], ['jump','Nhảy','↑'],
  ['wave','Vẫy tay','✋'], ['point','Chỉ tay','→'], ['dance','Nhảy múa','♫'], ['sit','Ngồi','⌑'] ];
const state = {anim:'idle',time:0,playing:true,speed:1,face:'smile',hat:'cap',shirt:'#48b8b0',yaw:0,travel:false};
let renderer;
try { renderer = new THREE.WebGLRenderer({canvas:$('scene'),antialias:true,alpha:true}); }
catch (e) { $('fatal').hidden=false; $('fatal').textContent='Không khởi tạo được WebGL. Bật hardware acceleration trong trình duyệt hoặc cập nhật driver GPU. '+e.message; throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.15;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(35,1,0.1,200);
const hemisphere=new THREE.HemisphereLight('#c6eeff','#354440',2.2); scene.add(hemisphere);
const sun=new THREE.DirectionalLight('#fff0d8',3.2);sun.position.set(-5,9,7);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:.1,far:35});sun.shadow.normalBias=.025;scene.add(sun);
const rim=new THREE.DirectionalLight('#8cdfea',2.4);rim.position.set(4,6,-4);scene.add(rim);
const floor=new THREE.Mesh(new THREE.CylinderGeometry(4.9,5.1,.25,80),new THREE.MeshStandardMaterial({color:'#30474e',roughness:.82}));floor.position.y=-.16;floor.receiveShadow=true;scene.add(floor);
const ring=new THREE.Mesh(new THREE.TorusGeometry(4.93,.018,8,100),new THREE.MeshBasicMaterial({color:'#6ba7a5'}));ring.rotation.x=Math.PI/2;ring.position.y=-.025;scene.add(ring);
const grid=new THREE.GridHelper(9,18,'#527276','#405c62');grid.position.y=-.028;scene.add(grid);
const root=new THREE.Group();scene.add(root);
const parts=[];
function pivot(parent,x,y,z){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;}
const body=pivot(root,0,0,0),torso=pivot(body,0,3,0),head=pivot(torso,0,1,0);
const ra=pivot(torso,-1.5,.5,0),la=pivot(torso,1.5,.5,0),rl=pivot(torso,-.5,-1,0),ll=pivot(torso,.5,-1,0);
const pivots=[body,torso,head,ra,la,rl,ll];
const skin='#edbd86',ink='#24333d',pants='#354b69',white='#e6efea';
function box(id,parent,size,pos,color){const m=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color,roughness:.75}));m.name=id;m.scale.set(...size);m.position.set(...pos);m.castShadow=m.receiveShadow=true;parent.add(m);parts.push(m);return m;}
const shirt=box('torso',torso,[2,2,1],[0,0,0],state.shirt);
box('head',head,[1.2,1.2,1.2],[0,.6,0],skin);
box('right_arm',ra,[1,2,1],[0,-.5,0],skin);box('left_arm',la,[1,2,1],[0,-.5,0],skin);
box('right_sleeve',ra,[1.015,.68,1.015],[0,.16,0],state.shirt);box('left_sleeve',la,[1.015,.68,1.015],[0,.16,0],state.shirt);
box('right_leg',rl,[1,2,1],[0,-1,0],pants);box('left_leg',ll,[1,2,1],[0,-1,0],pants);
box('right_shoe',rl,[1.03,.3,1.13],[0,-1.85,.035],white);box('left_shoe',ll,[1.03,.3,1.13],[0,-1.85,.035],white);
box('chest_badge',torso,[.22,.3,.025],[-.48,.37,.515],white);
const eyes=[box('eye_right',head,[.11,.16,.035],[-.24,.7,.615],ink),box('eye_left',head,[.11,.16,.035],[.24,.7,.615],ink)];
const brows=[box('brow_right',head,[.22,.045,.035],[-.24,.87,.62],ink),box('brow_left',head,[.22,.045,.035],[.24,.87,.62],ink)];
const mouth=[];for(let i=0;i<5;i++)mouth.push(box('mouth_'+i,head,[.105,.045,.035],[0,.3,.62],ink));
const hats=[box('hat_crown',head,[1.31,.36,1.31],[0,1.28,0],'#db8852'),box('hat_brim',head,[1.35,.09,.8],[0,1.13,.65],'#db8852')];
const badge=box('hat_badge',head,[.2,.17,.025],[0,1.29,.67],white);hats.push(badge);
$('partCount').textContent=parts.length+' bộ phận';

function poseAt(t){
  for(const g of pivots)g.rotation.set(0,0,0);
  body.position.set(0,0,0);root.position.set(0,0,0);root.rotation.set(0,state.yaw*Math.PI/180,0);
  const sin=Math.sin;
  switch(state.anim){
    case 'idle':head.rotation.y=sin(t*.8)*.09;ra.rotation.z=-.045-sin(t*1.8)*.025;la.rotation.z=-ra.rotation.z;break;
    case 'walk':case 'run':{const fast=state.anim==='run';const s=sin(t*Math.PI*2*(fast?2.5:1.5));const a=fast?1.08:.65;
      ra.rotation.x=s*a;la.rotation.x=-s*a;rl.rotation.x=-s*a;ll.rotation.x=s*a;body.position.y=Math.abs(s)*(fast?.18:.06);torso.rotation.x=fast?.15:0;break;}
    case 'jump':{const u=t%1.2/1.2;body.position.y=4*1.6*u*(1-u);ra.rotation.z=-2.6;la.rotation.z=2.6;rl.rotation.x=-.2;ll.rotation.x=.2;break;}
    case 'wave':ra.rotation.z=-2.7+sin(t*9)*.3;la.rotation.z=.06;head.rotation.z=-.1;break;
    case 'point':ra.rotation.x=-Math.PI/2;head.rotation.y=-.15;break;
    case 'dance':{const b=t*Math.PI*2;body.position.y=Math.abs(sin(b))*.22;torso.rotation.y=sin(b/2)*.35;ra.rotation.z=-1.5-sin(b)*1.1;la.rotation.z=1.5-sin(b)*1.1;head.rotation.z=sin(b)*.12;rl.rotation.x=sin(b)*.3;ll.rotation.x=-sin(b)*.3;break;}
    case 'sit':body.position.y=-1.1;rl.rotation.x=ll.rotation.x=-Math.PI/2;ra.rotation.x=la.rotation.x=-.3;break;
  }
  if(state.travel)root.position.z=Math.sin(t*Math.PI/4)*2.3;
  for(const b of brows)b.visible=state.face==='angry';brows[0].rotation.z=-.3;brows[1].rotation.z=.3;
  for(const e of eyes){e.scale.y=state.face==='surprised'?.21:.16;e.rotation.z=0;}
  for(let i=0;i<mouth.length;i++){
    const m=mouth[i],x=(i-2)*.09;m.visible=true;m.scale.set(.105,.045,.035);m.rotation.z=0;
    if(state.face==='surprised') {const angle=i*2*Math.PI/5;m.position.set(Math.cos(angle)*.09,.31+Math.sin(angle)*.11,.62);m.rotation.z=angle+Math.PI/2;}
    else{const sign=state.face==='smile'?1:-1;m.position.set(x,.3+sign*x*x*1.6,.62);m.rotation.z=Math.atan(sign*3.2*x);}
  }
  for(const h of hats)h.visible=state.hat==='cap';
  scene.updateMatrixWorld(true);
}

const v=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();
function frame(){
  poseAt(state.time);
  return {version:1,time:state.time,animation:state.anim,parts:parts.map(m=>{m.matrixWorld.decompose(v,q,s);return {id:m.name,p:v.toArray(),q:q.toArray(),s:s.toArray(),color:'#'+m.material.color.getHexString(),visible:m.visible};})};
}
let azimuth=.48,elevation=.20,distance=16;
function setCamera(){const target=new THREE.Vector3(0,2.65,0);camera.position.set(Math.sin(azimuth)*Math.cos(elevation)*distance,2.65+Math.sin(elevation)*distance,Math.cos(azimuth)*Math.cos(elevation)*distance);camera.lookAt(target);}
setCamera();
const canvas=$('scene');let drag=null;
canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!drag)return;azimuth-=(e.clientX-drag.x)*.008;elevation=Math.max(-.1,Math.min(1.1,elevation+(e.clientY-drag.y)*.006));drag={x:e.clientX,y:e.clientY};setCamera();});
for(const event of ['pointerup','pointercancel'])canvas.addEventListener(event,()=>drag=null);
canvas.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(9,Math.min(28,distance+e.deltaY*.015));setCamera();},{passive:false});
$('resetView').onclick=()=>{azimuth=.48;elevation=.20;distance=16;setCamera();};
new ResizeObserver(()=>{const r=canvas.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}).observe(canvas);

MOTIONS.forEach(([id,label,icon])=>{const b=document.createElement('button');b.className='motion'+(id==='idle'?' active':'');b.dataset.anim=id;b.innerHTML='<span class="icon">'+icon+'</span>'+label;b.onclick=()=>{state.anim=id;state.time=0;document.querySelectorAll('.motion').forEach(x=>x.classList.toggle('active',x===b));$('stageAnim').textContent=label;};$('motions').append(b);});
['#48b8b0','#d85e64','#6f87d8','#e0b763'].forEach((color,i)=>{const b=document.createElement('button');b.className='swatch'+(!i?' active':'');b.style.background=color;b.setAttribute('aria-label',['Áo xanh ngọc','Áo đỏ','Áo xanh tím','Áo vàng'][i]);b.onclick=()=>{state.shirt=color;for(const m of parts)if(['torso','right_sleeve','left_sleeve'].includes(m.name))m.material.color.set(color);document.querySelectorAll('.swatch').forEach(x=>x.classList.toggle('active',x===b));};$('swatches').append(b);});
function playUI(){ $('play').textContent=state.playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',state.playing?'Tạm dừng':'Phát'); }
$('play').onclick=()=>{state.playing=!state.playing;playUI();};
$('seek').oninput=e=>{state.time=+e.target.value;state.playing=false;playUI();};
$('speed').onchange=e=>state.speed=+e.target.value;
$('face').onchange=e=>state.face=e.target.value;
$('hat').onchange=e=>state.hat=e.target.value;
$('yaw').oninput=e=>state.yaw=+e.target.value;
$('travel').onchange=e=>state.travel=e.target.checked;

let linked=false,sending=false,lastSend=0,lastAck=0,ackChangedAt=0;
function status(kind,title,detail){$('linkState').className='link-state '+kind;$('statusTitle').textContent=title;$('statusDetail').textContent=detail;}
$('link').onclick=()=>{linked=!linked;$('link').innerHTML=linked?'Ngắt link <span>×</span>':'Link Unreal <span>↗</span>';if(!linked)status('','Đã ngắt kết nối','Unreal giữ tư thế cuối. Bấm Link để tiếp tục.');else status('wait','Đang chờ Unreal','Chạy lệnh Python trong Output Log của Unreal.');};
async function send(){sending=true;try{const r=await fetch('/api/frame',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(frame()),signal:AbortSignal.timeout(1500)});if(!r.ok)throw Error((await r.json()).error);}catch(e){status('error','Không gửi được dữ liệu','Kiểm tra cửa sổ server.py. '+e.message);}finally{sending=false;}}
setInterval(async()=>{try{const r=await fetch('/api/status',{signal:AbortSignal.timeout(1500)});if(!r.ok)throw Error('HTTP '+r.status);const st=await r.json();
  if(st.applied_seq!==lastAck){lastAck=st.applied_seq;ackChangedAt=performance.now();}
  $('ack').textContent=st.applied_seq?'Unreal đã áp dụng frame #'+st.applied_seq:'Chưa có frame được Unreal xác nhận';
  if(!linked)return;
  if(st.error && st.unreal_live)status('error','Unreal báo lỗi',st.error);
  else if(st.unreal_live&&st.parts>0&&performance.now()-ackChangedAt<3000)status('live','Đang đồng bộ với Unreal',st.parts+' bộ phận · Nhân vật đã được áp dụng trong Editor');
  else if(st.unreal_live)status('wait','Unreal đã kết nối','Đang chờ Editor áp dụng frame. Bật Realtime và giữ Editor hoạt động.');
  else status('wait','Đang chờ Unreal','Web đang gửi. Chạy lệnh Python trong level bạn chọn.');
}catch(e){if(linked)status('error','Mất kết nối local bridge','Mở lại START_WINDOWS.bat hoặc python server.py.');}},700);

$('help').onclick=()=>$('guide').showModal();$('closeHelp').onclick=()=>$('guide').close();
fetch('/api/setup').then(r=>r.json()).then(d=>$('setupCommand').value=d.command).catch(()=>$('setupCommand').value='Chạy trang bằng START_WINDOWS.bat để lấy lệnh chính xác.');
$('copyCommand').onclick=async()=>{try{await navigator.clipboard.writeText($('setupCommand').value);$('copyCommand').textContent='Đã sao chép ✓';}catch{$('setupCommand').select();$('copyCommand').textContent='Nhấn Ctrl+C để sao chép';}};
let previous=performance.now();
function tick(now){const dt=Math.min(.1,(now-previous)/1000);previous=now;if(state.playing)state.time=(state.time+dt*state.speed)%8;
  poseAt(state.time);$('clock').textContent=state.time.toFixed(2)+' / 8.00s';$('seek').value=state.time;renderer.render(scene,camera);
  if(linked&&!sending&&now-lastSend>=1000/30){lastSend=now;send();}requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
// Read-only inspection plus deterministic seek used by the included browser tests.
window.blocklink={state,frame,seek(t){state.playing=false;state.time=t;poseAt(t);renderer.render(scene,camera);playUI();},get partCount(){return parts.length;}};
window.__ready=true;
