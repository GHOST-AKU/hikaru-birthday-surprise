import './cover.css';
import { InkRenderer, type Stroke } from './cover/ink';

const ART = ['/ink/calligraphy-placeholder.png', '/ink/portrait-placeholder.png'];
const NAMES = ['HIKARU', 'Happy birthday', 'Calligraphy', 'Portrait'];

export function mountCover(root: HTMLElement): () => void {
  root.innerHTML = `<section class="cover-experience" aria-label="Hikaru ink canvas"><canvas class="cover-canvas" tabindex="0" role="img" aria-label="Paint to reveal HIKARU, Happy birthday, calligraphy and a portrait. Drag to paint. Arrow keys paint, R resets."></canvas><div class="cover-tools"><button class="cover-tool cover-reset" type="button" aria-label="Start again"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 9a8 8 0 1 0 0 7M20 3v6h-6"/></svg></button><button class="cover-tool cover-save" type="button" aria-label="Save painting as PNG"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/></svg></button></div><div class="cover-chapters" aria-hidden="true">${NAMES.map(()=>'<span></span>').join('')}</div><div class="cover-status" role="status" aria-live="polite"></div></section>`;
  const canvas=root.querySelector<HTMLCanvasElement>('canvas')!;
  const status=root.querySelector<HTMLElement>('.cover-status')!;
  const dots=[...root.querySelectorAll('.cover-chapters span')];
  const save=root.querySelector<HTMLButtonElement>('.cover-save')!;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const targets=Array.from({length:4},()=>document.createElement('canvas'));
  const blank=document.createElement('canvas');
  const images: (HTMLImageElement|null)[]=[null,null];
  let engine:InkRenderer;
  try { engine=new InkRenderer(canvas); } catch { status.textContent='This browser could not start the ink canvas. Try a browser with WebGL enabled.'; canvas.setAttribute('aria-label',status.textContent);return ()=>{}; }
  let stage=0,work=0,progress=0,readyAt=0,extra=0,transitionAt=0,previousStage=-1;
  let frame=0,lastTime=performance.now(),disposed=false,pointer:number|null=null;
  let last={x:.5,y:.5},keyboard={x:.3,y:.45};
  let queue:Stroke[]=[];
  let size={width:1,height:1};

  function buildTargets():void {
    const width=canvas.width,height=canvas.height;
    blank.width=width;blank.height=height;const empty=blank.getContext('2d')!;empty.fillStyle='#fff';empty.fillRect(0,0,width,height);
    targets.forEach((target,i)=>{
      target.width=width;target.height=height;const c=target.getContext('2d')!;c.fillStyle='#fff';c.fillRect(0,0,width,height);
      if(i<2){
        const text=i===0?'HIKARU':'Happy birthday';let font=Math.min(height*.31,width*(i===0?.21:.115));
        c.font=`700 ${font}px Georgia, 'Times New Roman', serif`;
        const limit=width*.88;if(c.measureText(text).width>limit)font*=limit/c.measureText(text).width;
        c.font=`700 ${font}px Georgia, 'Times New Roman', serif`;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#131510';c.fillText(text,width*.5,height*.5);
      }else if(images[i-2]){
        const image=images[i-2]!;const scale=Math.min(width*.84/image.width,height*.78/image.height);const w=image.width*scale,h=image.height*scale;c.drawImage(image,(width-w)/2,(height-h)/2,w,h);
      }
    });
    engine.setTargets(targets[stage],previousStage<0?blank:targets[previousStage]);
  }
  function resize():void{
    const box=canvas.getBoundingClientRect();size={width:box.width,height:box.height};
    const ratio=Math.min(devicePixelRatio||1,1.6,1700/Math.max(box.width,box.height));engine.resize(Math.max(1,Math.round(box.width*ratio)),Math.max(1,Math.round(box.height*ratio)));buildTargets();
  }
  function updateChapter():void{dots.forEach((dot,i)=>{dot.classList.toggle('is-active',i===stage);dot.classList.toggle('is-done',i<stage);});canvas.dataset.chapter=String(stage+1);status.textContent=NAMES[stage];}
  function reset():void{stage=0;work=0;progress=0;readyAt=0;extra=0;previousStage=-1;transitionAt=0;queue=[];engine.reset();buildTargets();updateChapter();}
  function paint(next:{x:number;y:number},pressure=.5):void{
    const distance=Math.hypot((next.x-last.x)*size.width,(next.y-last.y)*size.height);
    const unit=distance/Math.hypot(size.width,size.height);
    if(distance>.5){
      if(!transitionAt){
        work+=Math.min(.2,unit);progress=Math.min(1,work/5.5);
        if(progress>=.92){progress=1;if(!readyAt){readyAt=performance.now();extra=0;}else extra+=unit;}
        if(readyAt&&performance.now()-readyAt>1600&&extra>.65&&stage<3&&(stage<1||images[stage-1])){
          previousStage=stage;stage++;work=0;progress=0;readyAt=0;extra=0;transitionAt=performance.now();engine.next();engine.setTargets(targets[stage],targets[previousStage]);updateChapter();
        }
      }
      queue.push({px:last.x,py:last.y,x:next.x,y:next.y,pressure:Math.max(.024,Math.min(.07,(36+pressure*20-distance*.16)/size.height))});
      if(queue.length>24)queue.splice(0,queue.length-24);
    }else queue.push({px:next.x,py:next.y,x:next.x,y:next.y,pressure:Math.min(.07,38/size.height)});
    last=next;
  }
  function point(event:PointerEvent):{x:number;y:number}{const rect=canvas.getBoundingClientRect();return {x:(event.clientX-rect.left)/rect.width,y:(event.clientY-rect.top)/rect.height};}
  const down=(event:PointerEvent)=>{if(event.button!==0||pointer!==null)return;event.preventDefault();pointer=event.pointerId;last=point(event);canvas.setPointerCapture(pointer);root.classList.add('has-pointer-input');canvas.focus({preventScroll:true});paint(last,event.pressure);};
  const move=(event:PointerEvent)=>{if(event.pointerId!==pointer)return;const samples=event.getCoalescedEvents?.()||[];for(const sample of samples.length?samples:[event])paint(point(sample),sample.pressure||.5);};
  const up=(event:PointerEvent)=>{if(event.pointerId!==pointer)return;if(canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);pointer=null;};
  function animate(now:number):void{
    if(disposed)return;if(!queue.length&&now-lastTime<32){frame=requestAnimationFrame(animate);return;}const dt=Math.min(.035,Math.max(.001,(now-lastTime)/1000));lastTime=now;
    let fade=0;if(transitionAt){fade=Math.max(0,1-(now-transitionAt)/2000);if(fade===0){transitionAt=0;previousStage=-1;}}
    const strokes=queue.splice(0,Math.min(3,queue.length));
    if(strokes.length){strokes.forEach((stroke,i)=>engine.draw(now/1000,dt/strokes.length,progress,fade,stroke,reduced.matches,i===strokes.length-1));}else engine.draw(now/1000,dt,progress,fade,null,reduced.matches);
    canvas.dataset.progress=progress.toFixed(3);frame=requestAnimationFrame(animate);
  }
  const pause=()=>{cancelAnimationFrame(frame);pointer=null;queue=[];};
  const visibility=()=>{pause();if(!document.hidden&&!disposed){lastTime=performance.now();frame=requestAnimationFrame(animate);}};
  const key=(event:KeyboardEvent)=>{
    root.classList.remove('has-pointer-input');
    if(event.key.toLowerCase()==='r'){event.preventDefault();reset();return;}
    if(!event.key.startsWith('Arrow'))return;event.preventDefault();last={...keyboard};const step=.035;
    if(event.key==='ArrowLeft')keyboard.x-=step;if(event.key==='ArrowRight')keyboard.x+=step;if(event.key==='ArrowUp')keyboard.y-=step;if(event.key==='ArrowDown')keyboard.y+=step;
    keyboard.x=Math.max(.02,Math.min(.98,keyboard.x));keyboard.y=Math.max(.02,Math.min(.98,keyboard.y));paint(keyboard);
  };
  save.addEventListener('click',()=>{
    save.disabled=true;canvas.toBlob(blob=>{save.disabled=false;if(!blob||disposed)return;const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`hikaru-ink-${stage+1}.png`;document.body.append(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);},'image/png');
  });
  root.querySelector('.cover-reset')!.addEventListener('click',reset);
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',up);canvas.addEventListener('keydown',key);
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();updateChapter();frame=requestAnimationFrame(animate);
  ART.forEach((src,i)=>{const image=new Image();image.onload=()=>{if(disposed)return;images[i]=image;buildTargets();};image.onerror=()=>{status.textContent='Artwork could not load. Reload to try again.';};image.src=src;});
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',pause);window.addEventListener('pageshow',visibility);
  return ()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pause);window.removeEventListener('pageshow',visibility);engine.destroy();};
}
