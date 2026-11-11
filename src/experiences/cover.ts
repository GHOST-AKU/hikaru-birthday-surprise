import './cover.css';
import { InkRenderer, type Stroke } from './cover/ink';

const ART = ['/ink/calligraphy-placeholder.png', '/ink/portrait-placeholder.png'];
const NAMES = ['HIKARU', 'Happy birthday', 'Calligraphy', 'Portrait'];

export function mountCover(root: HTMLElement): () => void {
  root.innerHTML = `<section class="cover-experience" aria-label="Hikaru — Inkflow"><canvas class="cover-canvas" tabindex="0" role="img" aria-label="Paint to reveal HIKARU, Happy birthday, calligraphy and a portrait. Press to release ink; drag to guide the current. Arrow keys paint, R resets."></canvas><div class="cover-tools"><button class="cover-tool cover-reset" type="button" aria-label="Start again"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 9a8 8 0 1 0 0 7M20 3v6h-6"/></svg></button><button class="cover-tool cover-save" type="button" aria-label="Save painting as PNG"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/></svg></button><button class="cover-tool cover-gift" type="button" aria-label="放水，打开下一份礼物" title="放水 · 下一份" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h18v4H3zM5 13v8h14v-8M12 9v12M12 9C3 9 5 2 8 4c2 1 4 5 4 5Zm0 0c9 0 7-7 4-5-2 1-4 5-4 5Z"/></svg><span>下一份</span></button></div><div class="cover-chapters" aria-hidden="true">${NAMES.map(()=>'<span></span>').join('')}</div><div class="cover-status" role="status" aria-live="polite"></div></section>`;
  const canvas=root.querySelector<HTMLCanvasElement>('canvas')!;
  const status=root.querySelector<HTMLElement>('.cover-status')!;
  const dots=[...root.querySelectorAll('.cover-chapters span')];
  const save=root.querySelector<HTMLButtonElement>('.cover-save')!;
  const gift=root.querySelector<HTMLButtonElement>('.cover-gift')!;
  let hasInk=false,focusAfterWash=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const targets=Array.from({length:4},()=>document.createElement('canvas'));
  const blank=document.createElement('canvas');
  const images: (HTMLImageElement|null)[]=[null,null];
  let engine:InkRenderer;
  try { engine=new InkRenderer(canvas); } catch { status.textContent='This browser could not start the ink canvas. Try a browser with WebGL 2 enabled.'; status.classList.add('is-error'); canvas.setAttribute('aria-label',status.textContent);return ()=>{}; }
  let stage=0,progress=0,mode=0,phaseTime=0,clock=0,lastMeasure=0;
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
        const pixels=c.getImageData(0,0,width,height);
        for(let n=0;n<pixels.data.length;n+=4){
          const light=(pixels.data[n]*.2126+pixels.data[n+1]*.7152+pixels.data[n+2]*.0722)/255;
          const value=Math.round(255*(1-Math.max(0,Math.min(1,(1-light-.1)/.85))));
          pixels.data[n]=pixels.data[n+1]=pixels.data[n+2]=value;
        }
        c.putImageData(pixels,0,0);
      }
    });
    engine.setTargets(targets[stage],blank);
  }
  function resize():void{
    const box=canvas.getBoundingClientRect();size={width:box.width,height:box.height};
    const ratio=Math.min(devicePixelRatio||1,2,3000/Math.max(box.width,box.height));
    const width=Math.max(1,Math.round(box.width*ratio)),height=Math.max(1,Math.round(box.height*ratio));
    if(width===canvas.width&&height===canvas.height)return;
    engine.resize(width,height);buildTargets();
  }
  function updateChapter():void{dots.forEach((dot,i)=>{dot.classList.toggle('is-active',i===stage);dot.classList.toggle('is-done',i<stage);});canvas.dataset.chapter=String(stage+1);status.textContent=NAMES[stage];}
  function reset():void{if(pointer!==null&&canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);stage=0;progress=0;mode=0;phaseTime=clock;queue=[];hasInk=false;gift.hidden=true;gift.disabled=false;pointer=null;engine.reset();buildTargets();updateChapter();}
  function paint(next:{x:number;y:number},pressure=.5):void{
    if(mode!==0)return;
    hasInk=true;gift.hidden=false;
    const distance=Math.hypot((next.x-last.x)*size.width,(next.y-last.y)*size.height);
    if(distance>.5){
      queue.push({px:last.x,py:last.y,x:next.x,y:next.y,pressure:Math.max(.008,Math.min(.035,(11+pressure*13-distance*.035)/size.height))});
      if(queue.length>24)queue.splice(0,queue.length-24);
    }else queue.push({px:next.x,py:next.y,x:next.x,y:next.y,pressure:Math.min(.035,18/size.height)});
    last=next;
  }
  function point(event:PointerEvent):{x:number;y:number}{const rect=canvas.getBoundingClientRect();return {x:(event.clientX-rect.left)/rect.width,y:(event.clientY-rect.top)/rect.height};}
  const down=(event:PointerEvent)=>{if(event.button!==0||pointer!==null||mode!==0)return;event.preventDefault();pointer=event.pointerId;last=point(event);canvas.setPointerCapture(pointer);root.classList.add('has-pointer-input');canvas.focus({preventScroll:true});paint(last,event.pressure);};
  const move=(event:PointerEvent)=>{if(event.pointerId!==pointer)return;const samples=event.getCoalescedEvents?.()||[];for(const sample of samples.length?samples:[event])paint(point(sample),sample.pressure||.5);};
  const up=(event:PointerEvent)=>{if(event.pointerId!==pointer)return;if(canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);pointer=null;};
  function animate(now:number):void{
    if(disposed)return;if(!queue.length&&now-lastTime<32){frame=requestAnimationFrame(animate);return;}const dt=Math.min(.035,Math.max(.001,(now-lastTime)/1000));lastTime=now;
    clock+=dt;
    if(pointer!==null&&!queue.length)paint(last,.5);
    if(clock-lastMeasure>.7){
      const measured=engine.coverage();progress=measured.coverage;lastMeasure=clock;
      const next=(stage+1)%4;
      if(mode===0)gift.disabled=!hasInk||(next>1&&!images[next-2]);
      if(mode===1&&clock-phaseTime>7&&measured.coverage<.008&&measured.ink<.006){
        stage=next;mode=0;phaseTime=clock;progress=0;queue=[];hasInk=false;
        gift.hidden=true;gift.disabled=false;engine.next();engine.setTargets(targets[stage],blank);updateChapter();
        if(focusAfterWash){canvas.focus({preventScroll:true});focusAfterWash=false;}
      }
    }
    const strokes=queue.splice(0,Math.min(3,queue.length));
    if(strokes.length){strokes.forEach((stroke,i)=>engine.draw(clock,dt/strokes.length,mode,mode===1?clock-phaseTime:0,stroke,reduced.matches,i===strokes.length-1));}else engine.draw(clock,dt,mode,mode===1?clock-phaseTime:0,null,reduced.matches);
    canvas.dataset.phase=['stain','rinse'][mode];
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
  gift.addEventListener('click',()=>{
    const next=(stage+1)%4;
    if(mode!==0||!hasInk||(next>1&&!images[next-2]))return;
    mode=1;phaseTime=clock;queue=[];gift.disabled=true;focusAfterWash=document.activeElement===gift;
    if(pointer!==null&&canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);
    pointer=null;status.textContent='Water released. The next gift appears when the ink has washed away.';
  });
  root.querySelector('.cover-reset')!.addEventListener('click',reset);
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',up);canvas.addEventListener('keydown',key);
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();updateChapter();frame=requestAnimationFrame(animate);
  ART.forEach((src,i)=>{const image=new Image();image.onload=()=>{if(disposed)return;images[i]=image;buildTargets();};image.onerror=()=>{status.textContent='Artwork could not load. Reload to try again.';};image.src=src;});
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',pause);window.addEventListener('pageshow',visibility);
  return ()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pause);window.removeEventListener('pageshow',visibility);engine.destroy();};
}
