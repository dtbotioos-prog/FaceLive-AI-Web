const $=id=>document.getElementById(id);
const video=$('video'), canvas=$('canvas'),ctx=canvas.getContext('2d'),status=$('status'),source=$('source');
let stream=null,landmarker=null,raf=0,sourceLandmarks=null,lastSource='',processing=false;
function say(s){status.textContent=s;}
$('opacity').oninput=()=>{$('percent').textContent=$('opacity').value+'%';};
$('photo').onchange=()=>{const file=$('photo').files?.[0];if(!file)return;source.src=URL.createObjectURL(file);sourceLandmarks=null;lastSource='';say('Фото выбрано. Для наложения нужно распознать лицо.');};
async function loadDetector(){
  if(landmarker)return;
  say('Камера работает. Загружаем MediaPipe…');
  const mod=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm');
  const files=await mod.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
  landmarker=await mod.FaceLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',delegate:'CPU'},runningMode:'VIDEO',numFaces:1});
  say('Распознавание запущено. Смотрите в камеру.');
}
async function getSourceLandmarks(){
  if(!landmarker||!source.complete||!source.naturalWidth)return null;
  if(sourceLandmarks&&lastSource===source.src)return sourceLandmarks;
  const off=document.createElement('canvas');off.width=source.naturalWidth;off.height=source.naturalHeight;off.getContext('2d').drawImage(source,0,0);
  const old=landmarker;
  // A second IMAGE-mode detector is needed; VIDEO mode cannot detect static images.
  const mod=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm');
  const files=await mod.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
  const imgDetector=await mod.FaceLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',delegate:'CPU'},runningMode:'IMAGE',numFaces:1});
  sourceLandmarks=imgDetector.detect(off).faceLandmarks[0]||null;imgDetector.close();lastSource=source.src;
  if(!sourceLandmarks)say('На выбранной фотографии лицо не найдено.');
  return sourceLandmarks;
}
function eyeCenter(l,ids){return ids.reduce((a,i)=>({x:a.x+l[i].x/ids.length,y:a.y+l[i].y/ids.length}),{x:0,y:0});}
// A soft, face-shaped alpha mask replaces the old hard oval crop.
// This remains a 2D overlay; it does not synthesize facial expressions.
const faceLayer=document.createElement('canvas');
const maskLayer=document.createElement('canvas');
function transformFace(target,src){
  const sw=source.naturalWidth,sh=source.naturalHeight,w=canvas.width,h=canvas.height;
  if(!sw||!sh||!w||!h)return;
  const sl=eyeCenter(src,[33,133]),sr=eyeCenter(src,[362,263]);
  const tl=eyeCenter(target,[33,133]),tr=eyeCenter(target,[362,263]);
  const sx=(sl.x+sr.x)/2*sw,sy=(sl.y+sr.y)/2*sh;
  const tx=(tl.x+tr.x)/2*w,ty=(tl.y+tr.y)/2*h;
  const srcD=Math.hypot((sr.x-sl.x)*sw,(sr.y-sl.y)*sh);
  const dstD=Math.hypot((tr.x-tl.x)*w,(tr.y-tl.y)*h);
  if(srcD<1||dstD<1)return;
  const scale=dstD/srcD;
  const angle=Math.atan2((tr.y-tl.y)*h,(tr.x-tl.x)*w)-Math.atan2((sr.y-sl.y)*sh,(sr.x-sl.x)*sw);
  const xs=src.map(p=>p.x*sw),ys=src.map(p=>p.y*sh);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
  // Smaller than the previous ellipse, so the original hairline, ears and jaw stay visible.
  const rx=(maxX-minX)*0.405,ry=(maxY-minY)*0.435;
  if(faceLayer.width!==w||faceLayer.height!==h){faceLayer.width=maskLayer.width=w;faceLayer.height=maskLayer.height=h;}
  const fc=faceLayer.getContext('2d'),mc=maskLayer.getContext('2d');
  fc.clearRect(0,0,w,h);mc.clearRect(0,0,w,h);
  const position=c=>{c.translate(tx,ty);c.rotate(angle);c.scale(scale,scale);c.translate(-sx,-sy);};
  fc.save();position(fc);fc.drawImage(source,0,0,sw,sh);fc.restore();
  // Soft elliptical falloff; feather is wide enough to avoid a visible sticker edge.
  mc.save();position(mc);mc.translate(cx,cy);mc.scale(rx,ry);
  const grad=mc.createRadialGradient(0,0,0,0,0,1);
  grad.addColorStop(0,'rgba(255,255,255,1)');
  grad.addColorStop(0.60,'rgba(255,255,255,1)');
  grad.addColorStop(0.80,'rgba(255,255,255,0.85)');
  grad.addColorStop(0.94,'rgba(255,255,255,0.28)');
  grad.addColorStop(1,'rgba(255,255,255,0)');
  mc.fillStyle=grad;mc.beginPath();mc.arc(0,0,1,0,Math.PI*2);mc.fill();mc.restore();
  fc.save();fc.globalCompositeOperation='destination-in';fc.drawImage(maskLayer,0,0);fc.restore();
  ctx.save();ctx.globalAlpha=Number($('opacity').value)/100;ctx.drawImage(faceLayer,0,0);ctx.restore();
}
let lastVideoTime=-1,frameCount=0;
function draw(){
  if(!stream)return;
  if(video.readyState>=2){
    if(canvas.width!==video.videoWidth||canvas.height!==video.videoHeight){canvas.width=video.videoWidth;canvas.height=video.videoHeight;}
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // Canvas is mirrored by CSS, matching video; landmarks use unmirrored coordinates.
    if(landmarker&&video.currentTime!==lastVideoTime){
      lastVideoTime=video.currentTime;
      try{
        const faces=landmarker.detectForVideo(video,performance.now()).faceLandmarks;
        if(faces.length){const f=faces[0];if($('overlay').checked&&sourceLandmarks)transformFace(f,sourceLandmarks);
          if($('points').checked){ctx.fillStyle='#23f0c7';for(let i=0;i<f.length;i+=3){ctx.beginPath();ctx.arc(f[i].x*canvas.width,f[i].y*canvas.height,1.3,0,Math.PI*2);ctx.fill();}}
        }else if(++frameCount%100===0)say('Лицо в кадре не обнаружено.');
      }catch(e){say('Ошибка обработки: '+e.message);}
    }
  }
  raf=requestAnimationFrame(draw);
}
$('start').onclick=async()=>{
  if(stream)return;
  try{
    say('Запрашиваем разрешение камеры…');
    stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:640},height:{ideal:854}}});
    video.srcObject=stream;await video.play();say('Камера включена. Подключаем отслеживание лица…');
    draw();
    try{await loadDetector();await getSourceLandmarks();if(sourceLandmarks)say('Камера и наложение готовы. Повернитесь лицом к камере.');}
    catch(e){say('Камера работает, но распознавание не загрузилось: '+e.message);}
  }catch(e){say('Не удалось включить камеру: '+e.message);stream?.getTracks().forEach(t=>t.stop());stream=null;}
};
$('stop').onclick=()=>{cancelAnimationFrame(raf);stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;ctx.clearRect(0,0,canvas.width,canvas.height);say('Камера остановлена.');};
source.onload=()=>{sourceLandmarks=null;lastSource='';if(landmarker)getSourceLandmarks().then(()=>say(sourceLandmarks?'Новое лицо готово.':'Лицо на фото не обнаружено.')).catch(e=>say('Ошибка фотографии: '+e.message));};
