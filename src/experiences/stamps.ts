import './stamps.css';
import { stampKinds, stampSVG, type StampKind } from './letters/stamp-art';
import { incoming, reply } from './letters/content';
import { saveEnvelope } from './letters/export';
import { assetPath } from '../assets';

type Phase = 'address'|'sealed'|'opening'|'open'|'reading'|'reply'|'folding'|'stamp'|'seal'|'postmark'|'done';
const icons={reset:'<path d="M20 9a8 8 0 1 0 0 7M20 3v6h-6"/>',flip:'<path d="m8 3-5 5 5 5M3 8h10a7 7 0 1 1 0 14"/>',save:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>'};
const icon=(name:keyof typeof icons)=>`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${icons[name]}</svg>`;
const seal=`<img src="${assetPath('letters/wax-h.png')}" alt="" draggable="false">`;
const postmark=()=>`<svg class="letter-postmark" viewBox="0 0 240 130" aria-hidden="true"><circle cx="66" cy="65" r="57"/><circle cx="66" cy="65" r="50"/><text x="66" y="40">BIRTHDAY MAIL</text><text class="postmark-love" x="66" y="73">WITH LOVE</text><path d="M39 91h54"/>${[33,47,61,75,89].map(y=>`<path d="M114 ${y}q22-12 44 0t44 0t34 0"/>`).join('')}</svg>`;

function envelope(back:boolean,opened=false,stamped:StampKind|null=null,waxed=false,marked=false,inbound=false):string {
  return `<div class="letter-envelope ${back?'is-back':'is-front'} ${opened?'is-open':''}"><div class="envelope-base"></div>${back?`<div class="envelope-lining"></div>${opened?'<button type="button" class="letter-slip" data-action="read" aria-label="Pull out the letter"><span>Dear Hikaru,</span></button>':''}<div class="envelope-side envelope-side-left"></div><div class="envelope-side envelope-side-right"></div><div class="envelope-bottom"></div><div class="envelope-flap"></div><span class="envelope-note">${waxed?'Hikaru.':'Hikaru.'}</span><span class="envelope-from">${waxed?'with love':'with love, a wolfie'}</span>${waxed?`<div class="wax-target">${seal}</div>`:''}`:`<span class="envelope-sender">${inbound?'From a wolfie':'From Hikaru'}</span><span class="envelope-recipient">${inbound?'To Hikaru':'To a wolfie'}</span><div class="letter-stamp-slot ${stamped?'is-filled':''}" aria-label="Postage stamp position">${stamped?stampSVG(stamped,'envelope'):''}</div>${marked?postmark():''}`}</div>`;
}
function sheet(isReply:boolean):string {
  const letter=isReply?reply:incoming;
  return `<article class="letter-sheet" aria-label="${isReply?'Preset reply':'Birthday letter'}"><div class="sheet-content"><h1>${letter.greeting}</h1>${letter.paragraphs.map(p=>`<p>${p}</p>`).join('')}<footer>${letter.closing}<br><span>${letter.signature}</span></footer></div></article>`;
}
function tool(type:'wax'|'post'):string {
  return `<button type="button" class="letter-press-tool ${type==='post'?'is-post-tool':''}" data-action="${type==='wax'?'seal':'postmark'}" aria-label="${type==='wax'?'Press the wax seal':'Apply the postmark'}"><span class="tool-knob"></span><span class="tool-stem"></span><span class="tool-foot"></span></button>`;
}

export function mountStamps(root:HTMLElement):()=>void {
  root.innerHTML=`<section class="letter-experience" aria-label="Open and reply to a birthday letter"><div class="letter-stage"></div><div class="letter-actions"></div><button type="button" class="letter-reset letter-icon" aria-label="Start the letter again">${icon('reset')}</button><div class="letter-status" role="status" aria-live="polite"></div></section>`;
  const page=root.querySelector<HTMLElement>('.letter-experience')!;
  const stage=root.querySelector<HTMLElement>('.letter-stage')!;
  const actions=root.querySelector<HTMLElement>('.letter-actions')!;
  const status=root.querySelector<HTMLElement>('.letter-status')!;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const timers=new Set<number>();
  let phase:Phase='address',chosen:StampKind|null=null,busy=false,back=false,viewing=false,destroyed=false;
  let ghost:HTMLElement|null=null,drag:StampKind|null=null,pointer=-1,moved=false,suppress=false;
  let start={x:0,y:0};
  const later=(callback:()=>void,delay:number)=>{const id=window.setTimeout(()=>{timers.delete(id);if(!destroyed)callback();},reduced.matches?30:delay);timers.add(id);};
  const action=(label:string,name:string,disabled=false)=>`<button type="button" class="letter-action" data-action="${name}" ${disabled?'disabled':''}>${label}</button>`;

  function render(focus=true):void {
    page.dataset.phase=phase;page.classList.toggle('is-viewing',viewing);
    if(phase==='address'){
      stage.innerHTML=envelope(false,false,'wolf',false,true,true);
      actions.innerHTML=action('Turn over','turn');
    }else if(phase==='sealed'||phase==='opening'||phase==='open'){
      stage.innerHTML=envelope(true,phase!=='sealed')+(phase!=='open'?`<button class="incoming-wax ${phase==='opening'?'is-broken':''}" data-action="open" aria-label="Break the wax seal" ${busy?'disabled':''}><span class="seal-half seal-left">${seal}</span><span class="seal-half seal-right">${seal}</span></button>`:'');
      actions.innerHTML=action(phase==='open'?'Read':'Open',phase==='open'?'read':'open',busy);
    }else if(phase==='reading'||phase==='reply'||phase==='folding'||viewing){
      stage.innerHTML=`<div class="sheet-envelope">${envelope(true,true)}</div>${sheet(phase!=='reading')}`;
      actions.innerHTML=viewing?action('Back','close'):action(phase==='reading'?'Reply':'Fold',phase==='reading'?'reply':'fold',busy);
    }else{
      const rear=phase==='seal'||(phase==='done'&&back);
      stage.innerHTML=envelope(rear,false,chosen,rear&&phase==='done',phase==='done'&&!back);
      if(phase==='stamp'){
        stage.innerHTML+=`<div class="letter-postage" role="group" aria-label="Choose a postage stamp">${stampKinds.map((kind,i)=>`<button type="button" class="letter-loose-stamp" data-kind="${kind}" aria-label="Use the ${kind} stamp" style="--tilt:${[-9,5,-5][i]}deg">${stampSVG(kind,`loose-${kind}`)}</button>`).join('')}</div>`;
        actions.innerHTML=action('Stamp','stamp');
      }else if(phase==='seal'){
        stage.innerHTML+='<div class="wet-wax" aria-hidden="true"></div>'+tool('wax');actions.innerHTML=action('Seal','seal');
      }else if(phase==='postmark'){
        stage.innerHTML+=tool('post');actions.innerHTML=action('Postmark','postmark');
      }else actions.innerHTML=action('Read reply','view')+`<button type="button" class="letter-icon" data-action="flip" aria-label="${back?'Show address':'Show wax seal'}">${icon('flip')}</button><button type="button" class="letter-icon" data-action="save" aria-label="Save sealed letter">${icon('save')}</button>`;
    }
    if(focus) (actions.querySelector('button:not([disabled])') as HTMLButtonElement|null)?.focus({preventScroll:true});
  }
  function change(next:Phase):void{phase=next;busy=false;render();}
  function open():void{
    if(phase!=='sealed'||busy)return;busy=true;phase='opening';render(false);status.textContent='The seal breaks. The envelope opens.';later(()=>change('open'),1100);
  }
  function place(kind:StampKind):void {
    if(phase!=='stamp'||busy)return;chosen=kind;busy=true;
    const slot=stage.querySelector('.letter-stamp-slot')!;slot.innerHTML=stampSVG(kind,'placed');slot.classList.add('is-filled','just-placed');
    stage.querySelectorAll<HTMLButtonElement>('.letter-loose-stamp').forEach(b=>{b.disabled=true;b.classList.toggle('is-used',b.dataset.kind===kind);});
    actions.querySelectorAll('button').forEach(b=>b.disabled=true);status.textContent=`${kind} stamp attached.`;
    later(()=>{stage.classList.add('turning');later(()=>{stage.classList.remove('turning');change('seal');},380);},650);
  }
  function press(type:'seal'|'postmark'):void {
    if(phase!==type||busy)return;busy=true;actions.querySelectorAll('button').forEach(b=>b.disabled=true);
    const handle=stage.querySelector<HTMLButtonElement>('.letter-press-tool')!;handle.disabled=true;
    const env=stage.querySelector<HTMLElement>('.letter-envelope')!;
    const rect=handle.getBoundingClientRect(),target=(type==='seal'?stage.querySelector('.wet-wax')!:stage.querySelector('.letter-stamp-slot')!).getBoundingClientRect();
    const x=target.x+target.width*.5-(rect.x+rect.width*.5);const y=target.y+target.height*.6-(rect.y+rect.height*.85);
    if(!reduced.matches)handle.animate([{transform:'translate(0,0) rotate(-12deg)',opacity:1},{transform:`translate(${x}px,${y-30}px) rotate(0deg)`,offset:.38,opacity:1},{transform:`translate(${x}px,${y+8}px) rotate(0deg)`,offset:.58,opacity:1},{transform:`translate(${x}px,${y-55}px) rotate(0deg)`,offset:.88,opacity:1},{transform:`translate(${x+60}px,${y-90}px) rotate(8deg)`,opacity:0}],{duration:1300,easing:'cubic-bezier(.35,0,.2,1)',fill:'forwards'});
    later(()=>{
      if(type==='seal'){stage.querySelector('.wet-wax')?.classList.add('is-set');env.insertAdjacentHTML('beforeend',`<div class="wax-target wax-fresh">${seal}</div>`);status.textContent='The wax carries your H.';}
      else {env.insertAdjacentHTML('beforeend',postmark());status.textContent='Your reply is stamped and sealed.';}
    },760);
    later(()=>{if(type==='seal'){stage.classList.add('turning');later(()=>{stage.classList.remove('turning');change('postmark');},380);}else change('done');},1450);
  }
  async function perform(name:string):Promise<void>{
    if(busy)return;
    if(name==='turn'&&phase==='address'){busy=true;stage.classList.add('turning');later(()=>{stage.classList.remove('turning');change('sealed');},380);}
    if(name==='open')open();
    if(name==='read'&&phase==='open'){status.textContent='A birthday letter for Hikaru.';change('reading');}
    if(name==='reply'&&phase==='reading'){status.textContent='A preset reply to a wolfie.';change('reply');}
    if(name==='fold'&&phase==='reply'){busy=true;phase='folding';render(false);later(()=>change('stamp'),850);}
    if(name==='stamp')place('wolf');
    if(name==='seal'||name==='postmark')press(name);
    if(name==='view'&&phase==='done'){viewing=true;render();}
    if(name==='close'){viewing=false;render();}
    if(name==='flip'&&phase==='done'){back=!back;stage.classList.add('turning');busy=true;later(()=>{stage.classList.remove('turning');busy=false;render();},380);}
    if(name==='save'&&phase==='done'&&chosen){
      const button=actions.querySelector<HTMLButtonElement>('[data-action="save"]')!;button.disabled=true;
      try{await saveEnvelope(chosen,back);}catch{status.textContent='Could not save. Please try again.';}finally{button.disabled=false;}
    }
  }
  const click=(event:MouseEvent)=>{
    if(suppress)return;const target=(event.target as Element).closest<HTMLElement>('[data-action],[data-kind]');
    if(!target)return;if(target.dataset.kind)place(target.dataset.kind as StampKind);else void perform(target.dataset.action!);
  };
  stage.addEventListener('click',click);actions.addEventListener('click',click);
  function cleanDrag():void{ghost?.remove();ghost=null;stage.classList.remove('is-dropping');pointer=-1;drag=null;moved=false;}
  stage.addEventListener('pointerdown',event=>{
    const button=(event.target as Element).closest<HTMLElement>('[data-kind]');if(!button||phase!=='stamp'||busy||event.button!==0)return;
    pointer=event.pointerId;drag=button.dataset.kind as StampKind;start={x:event.clientX,y:event.clientY};moved=false;stage.setPointerCapture(pointer);
  });
  stage.addEventListener('pointermove',event=>{
    if(pointer!==event.pointerId||!drag)return;if(Math.hypot(event.clientX-start.x,event.clientY-start.y)<7&&!moved)return;moved=true;
    if(!ghost){ghost=document.createElement('div');ghost.className='letter-drag-ghost';ghost.innerHTML=stampSVG(drag,'drag');document.body.append(ghost);}
    ghost.style.left=`${event.clientX}px`;ghost.style.top=`${event.clientY}px`;
    const rect=stage.querySelector('.letter-envelope')!.getBoundingClientRect();stage.classList.toggle('is-dropping',event.clientX>rect.left&&event.clientX<rect.right&&event.clientY>rect.top&&event.clientY<rect.bottom);
  });
  stage.addEventListener('pointerup',event=>{
    if(pointer!==event.pointerId)return;const kind=drag;const dropped=moved&&stage.classList.contains('is-dropping');const clicked=!moved;
    suppress=true;later(()=>{suppress=false;},160);cleanDrag();if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);
    if(kind&&(dropped||clicked))place(kind);
  });
  stage.addEventListener('pointercancel',cleanDrag);stage.addEventListener('lostpointercapture',()=>{if(pointer!==-1)cleanDrag();});
  root.querySelector('.letter-reset')!.addEventListener('click',()=>{timers.forEach(clearTimeout);timers.clear();cleanDrag();phase='address';chosen=null;busy=false;viewing=false;back=false;suppress=false;stage.classList.remove('turning');status.textContent='A letter for Hikaru.';render();});
  render(false);
  return ()=>{destroyed=true;timers.forEach(clearTimeout);cleanDrag();};
}
