const video=document.getElementById('camera');
const start=document.getElementById('start');
const stop=document.getElementById('stop');
const status=document.getElementById('status');
const photo=document.getElementById('photo');
const preview=document.getElementById('preview');
let stream=null, detector=null, timer=null, imageUrl=null;
const say=s=>status.textContent=s;
async function detect(){
 if(!stream||!detector||video.readyState<2)return;
 try{const faces=await detector.detect(video);say(`Камера включена. Найдено лиц: ${faces.length}. AI Face Swap ещё не подключён.`)}catch(e){say('Камера включена. Обнаружение лица недоступно: '+e.message)}
}
start.onclick=async()=>{
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('Нужен Safari с HTTPS и разрешением камеры.');
  stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:720},height:{ideal:1280},frameRate:{ideal:24,max:30}}});
  video.srcObject=stream;await video.play();
  start.disabled=true;stop.disabled=false;
  if('FaceDetector' in window){try{detector=new FaceDetector({fastMode:true,maxDetectedFaces:1});timer=setInterval(detect,700)}catch(e){detector=null}}
  say(detector?'Камера включена. Идёт обнаружение лица.':'Камера включена. FaceDetector не поддерживается этим браузером; требуется отдельный модуль Vision/MediaPipe.');
 }catch(e){say('Ошибка запуска: '+e.message)}
};
stop.onclick=()=>{clearInterval(timer);timer=null;stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;start.disabled=false;stop.disabled=true;say('Камера выключена.')};
photo.onchange=()=>{if(imageUrl)URL.revokeObjectURL(imageUrl);const file=photo.files?.[0];if(!file)return;imageUrl=URL.createObjectURL(file);preview.src=imageUrl;preview.hidden=false;say('Фотография выбрана. AI Face Swap ещё не подключён.')};
window.addEventListener('pagehide',()=>{clearInterval(timer);stream?.getTracks().forEach(t=>t.stop());if(imageUrl)URL.revokeObjectURL(imageUrl)});
