import './stamps.css';

type StampKind = 'comfy' | 'wolf' | 'play';
const stampKinds: StampKind[] = ['comfy', 'wolf', 'play'];
const colors: Record<StampKind, string> = { comfy: '#64735d', wolf: '#ad4b29', play: '#434b75' };

function comfyArt(): string {
  const circles = Array.from({ length: 34 }, (_, i) => `<circle cx="100" cy="79" r="${8 + i * 2.55}"/>`).join('');
  const hills = Array.from({ length: 34 }, (_, i) => {
    const y = 133 + i * 2.2;
    return `<path d="M-5 ${y + 22} C23 ${y + 8},29 ${y - 17},48 ${y - 5} S76 ${y + 18},98 ${y - 3} S123 ${y - 36},141 ${y - 22} S174 ${y - 8},205 ${y - 24}"/>`;
  }).join('');
  return `<g fill="none" stroke="#64735d" stroke-width=".68">${circles}<circle cx="100" cy="79" r="32" fill="#f5f0df"/>${Array.from({length:18},(_,i)=>`<path d="M${70+i*1.6} ${58+i*.5}q${25+i} ${8+i*1.1} ${43-i*.6} ${14+i*1.45}"/>`).join('')}<path d="M-5 155 C23 141,29 116,48 128S76 151,98 130S123 97,141 111S174 125,205 109V210H-5Z" fill="#f5f0df"/>${hills}</g>`;
}

function playArt(): string {
  const squares = Array.from({length: 64},(_,i)=>{
    const x=i%8, y=Math.floor(i/8);
    return (x+y)%2===0 ? `<rect x="${x*25}" y="${y*25}" width="25" height="25"/>` : '';
  }).join('');
  const circles = Array.from({length:26},(_,i)=>`<circle cx="100" cy="100" r="${8+i*2.75}"/>`).join('');
  return `<g fill="#434b75">${squares}</g><circle cx="100" cy="100" r="79" fill="#f5f0df"/><g fill="none" stroke="#434b75" stroke-width="1.2">${circles}</g><path d="M100 18C100 78 122 100 182 100C122 100 100 122 100 182C100 122 78 100 18 100C78 100 100 78 100 18Z" fill="#f5f0df" stroke="#434b75" stroke-width=".8"/><path d="M100 38C100 83 117 100 162 100C117 100 100 117 100 162C100 117 83 100 38 100C83 100 100 83 100 38Z" fill="none" stroke="#434b75" stroke-width=".7"/>`;
}

function stampSVG(kind: StampKind, suffix: string, wolfHref = '/stamps-wolf.webp'): string {
  const holes = [...Array.from({length:18},(_,i)=>`<circle cx="${i*14}" cy="0" r="4.4"/><circle cx="${i*14}" cy="300" r="4.4"/>`), ...Array.from({length:22},(_,i)=>`<circle cx="0" cy="${i*14}" r="4.4"/><circle cx="240" cy="${i*14}" r="4.4"/>`)].join('');
  const art = kind === 'comfy' ? comfyArt() : kind === 'play' ? playArt() : `<image href="${wolfHref}" width="200" height="200" preserveAspectRatio="xMidYMid slice"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300" aria-hidden="true"><defs><mask id="stamp-cut-${suffix}"><rect width="240" height="300" fill="white"/><g fill="black">${holes}</g></mask><clipPath id="stamp-art-${suffix}"><rect width="200" height="200"/></clipPath></defs><g mask="url(#stamp-cut-${suffix})"><rect width="240" height="300" fill="#fbf7ec"/><rect x="15" y="15" width="210" height="270" fill="none" stroke="${colors[kind]}" stroke-width=".9"/><text x="120" y="38" fill="${colors[kind]}" font-family="Georgia,serif" font-weight="bold" font-size="17" letter-spacing="4.5" text-anchor="middle">HIKARU</text><path d="M15 47H225M15 251H225" stroke="${colors[kind]}" stroke-width=".9"/><g transform="translate(20 49)" clip-path="url(#stamp-art-${suffix})"><rect width="200" height="200" fill="#f5f0df"/>${art}</g><text x="120" y="275" fill="${colors[kind]}" font-family="Georgia,serif" font-size="17" font-weight="bold" letter-spacing="3.2" text-anchor="middle">${kind.toUpperCase()}</text><path d="M24 266h28m-28 4h28m-28 4h28M188 266h28m-28 4h28m-28 4h28" stroke="${colors[kind]}" stroke-width=".65"/></g></svg>`;
}

const lensIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>';
const flipIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m8 3-5 5 5 5M3 8h10a7 7 0 1 1 0 14"/></svg>';
const saveIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4"/></svg>';

export function mountStamps(root: HTMLElement): () => void {
  root.innerHTML = `<div class="post-experience"><h1 class="post-title">Hikaru.</h1><div class="post-collection" aria-label="Three birthday stamps">${stampKinds.map((kind,i)=>`<button class="post-stamp post-stamp-${kind}" data-stamp="${kind}" aria-label="Place ${kind} stamp on postcard" style="--stamp-angle:${[-11,-7,10][i]}deg">${stampSVG(kind,`main-${kind}`)}</button>`).join('')}</div><div class="postcard-area"><div class="postcard" role="group" aria-label="Birthday postcard"><div class="postcard-front"><div class="postcard-divider"></div><div class="postcard-address" aria-hidden="true"><i></i><i></i><i></i></div><div class="postcard-slots">${stampKinds.map(kind=>`<button class="postcard-slot" data-slot="${kind}" aria-label="Place ${kind} stamp here"></button>`).join('')}</div><div class="postmark" aria-hidden="true"><span>HIKARU</span><svg viewBox="0 0 140 70"><circle cx="40" cy="35" r="30"/><circle cx="40" cy="35" r="26"/>${[18,26,34,42,50].map(y=>`<path d="M66 ${y}q15-7 30 0t30 0"/>`).join('')}</svg></div></div><div class="postcard-back"><div class="postcard-greeting">Happy birthday,<br><em>Hikaru.</em></div><p>May this year be kind to you.</p><span class="postcard-signature">with love, a wolfie</span></div></div></div><div class="post-tools"><button class="post-tool post-inspect" aria-label="Inspect stamps with magnifying glass" aria-pressed="false">${lensIcon}</button><button class="post-tool post-flip" aria-label="Turn postcard over" disabled>${flipIcon}</button><button class="post-tool post-save" aria-label="Save postcard" hidden>${saveIcon}</button></div><div class="post-lens" hidden aria-hidden="true"><div class="post-lens-content"></div></div><div class="post-announcement" role="status" aria-live="polite"></div></div>`;

  const page = root.querySelector<HTMLElement>('.post-experience')!;
  const collection = page.querySelector<HTMLElement>('.post-collection')!;
  const card = page.querySelector<HTMLElement>('.postcard')!;
  const cardFront = card.querySelector<HTMLElement>('.postcard-front')!;
  const cardBack = card.querySelector<HTMLElement>('.postcard-back')!;
  cardBack.inert = true;
  cardBack.setAttribute('aria-hidden', 'true');
  const area = page.querySelector<HTMLElement>('.postcard-area')!;
  const lens = page.querySelector<HTMLElement>('.post-lens')!;
  const lensContent = lens.querySelector<HTMLElement>('.post-lens-content')!;
  const inspect = page.querySelector<HTMLButtonElement>('.post-inspect')!;
  const flip = page.querySelector<HTMLButtonElement>('.post-flip')!;
  const save = page.querySelector<HTMLButtonElement>('.post-save')!;
  const status = page.querySelector<HTMLElement>('.post-announcement')!;
  const stamps = new Map(stampKinds.map(kind=>[kind,page.querySelector<HTMLButtonElement>(`[data-stamp="${kind}"]`)!]));
  const slots = new Map(stampKinds.map(kind=>[kind,page.querySelector<HTMLButtonElement>(`[data-slot="${kind}"]`)!]));
  const placed = new Set<StampKind>();
  let inspecting = false;
  let flipped = false;
  let activeLens: StampKind | null = null;
  let suppressClick = false;
  let ghost: HTMLElement | null = null;
  let draggedKind: StampKind | null = null;
  let start = {x:0,y:0};
  let pointer = -1;
  let dragDistance = 0;
  let destroyed = false;

  const wolfData = fetch('/stamps-wolf.webp').then(response=> {
    if (!response.ok) throw new Error('Stamp artwork unavailable');
    return response.blob();
  }).then(blob=>new Promise<string>((resolve,reject)=> {
    const reader = new FileReader(); reader.onload=()=>resolve(String(reader.result)); reader.onerror=reject; reader.readAsDataURL(blob);
  }));
  void wolfData.catch(()=>{});

  function hideLens(): void { lens.hidden = true; activeLens = null; }

  function showLens(kind: StampKind, clientX?: number, clientY?: number): void {
    if (!inspecting || placed.has(kind)) return;
    const stamp = stamps.get(kind)!;
    const rect = stamp.getBoundingClientRect();
    const x = clientX ?? rect.x + rect.width * .5;
    const y = clientY ?? rect.y + rect.height * .48;
    const diameter = window.innerWidth < 600 ? 140 : 190;
    if (activeLens !== kind) {
      lensContent.innerHTML = stampSVG(kind, `lens-${kind}`);
      activeLens = kind;
    }
    const zoom = 2.35;
    const baseWidth = stamp.offsetWidth;
    const baseHeight = stamp.offsetHeight;
    const matrix = new DOMMatrix(getComputedStyle(stamp).transform);
    const angle = Math.atan2(matrix.b, matrix.a);
    const dx = x - rect.left - rect.width / 2;
    const dy = y - rect.top - rect.height / 2;
    const fractionX = Math.max(0, Math.min(1, .5 + (dx * Math.cos(angle) + dy * Math.sin(angle)) / baseWidth));
    const fractionY = Math.max(0, Math.min(1, .5 + (-dx * Math.sin(angle) + dy * Math.cos(angle)) / baseHeight));
    lens.style.width = `${diameter}px`; lens.style.height = `${diameter}px`;
    lens.style.left = `${Math.max(8,Math.min(innerWidth-diameter-8,x-diameter*.5))}px`;
    lens.style.top = `${Math.max(8,Math.min(innerHeight-diameter-8,y-diameter*.5))}px`;
    lensContent.style.width = `${baseWidth*zoom}px`;
    lensContent.style.transform = `translate(${diameter/2-fractionX*baseWidth*zoom}px,${diameter/2-fractionY*baseHeight*zoom}px)`;
    lens.hidden = false;
  }

  function place(kind: StampKind): void {
    if (placed.has(kind)) return;
    placed.add(kind); hideLens();
    stamps.get(kind)!.classList.add('is-posted');
    stamps.get(kind)!.disabled = true;
    const slot = slots.get(kind)!;
    slot.innerHTML = stampSVG(kind, `placed-${kind}`);
    slot.classList.add('is-filled');
    slot.setAttribute('aria-label', `Remove ${kind} stamp`);
    status.textContent = `${kind} stamp placed.`;
    if (placed.size === 3) {
      flip.disabled = false; save.hidden = false;
      inspecting = false; inspect.disabled = true;
      inspect.setAttribute('aria-pressed', 'false');
      collection.classList.remove('is-inspecting');
      card.classList.add('is-complete');
      status.textContent = 'All stamps placed. The postcard is ready to turn over.';
      flip.focus({preventScroll:true});
    }
  }

  function remove(kind: StampKind): void {
    placed.delete(kind);
    stamps.get(kind)!.classList.remove('is-posted');
    stamps.get(kind)!.disabled = false;
    inspect.disabled = false;
    const slot = slots.get(kind)!;
    slot.innerHTML = ''; slot.classList.remove('is-filled');
    slot.setAttribute('aria-label', `Place ${kind} stamp here`);
    card.classList.remove('is-complete');
    flip.disabled = true; save.hidden = true;
    status.textContent = `${kind} stamp removed.`;
  }

  inspect.addEventListener('click',()=> {
    inspecting = !inspecting;
    inspect.setAttribute('aria-pressed',String(inspecting));
    collection.classList.toggle('is-inspecting',inspecting);
    if (!inspecting) hideLens();
    else {
      const kind = stampKinds.find(item=>!placed.has(item));
      if (kind) { stamps.get(kind)!.focus({preventScroll:true}); showLens(kind); }
    }
  });

  for (const kind of stampKinds) {
    const stamp = stamps.get(kind)!;
    stamp.addEventListener('click',()=> {
      if (suppressClick) { suppressClick=false; return; }
      if (inspecting) showLens(kind); else place(kind);
    });
    stamp.addEventListener('focus',()=>{ if(inspecting) showLens(kind); });
    stamp.addEventListener('pointerdown',event=> {
      if (event.button !== 0 || placed.has(kind)) return;
      if (inspecting) { showLens(kind,event.clientX,event.clientY); stamp.setPointerCapture(event.pointerId); return; }
      pointer=event.pointerId; draggedKind=kind; start={x:event.clientX,y:event.clientY}; dragDistance=0;
      stamp.setPointerCapture(event.pointerId);
    });
    stamp.addEventListener('pointermove',event=> {
      if (inspecting) { showLens(kind,event.clientX,event.clientY); return; }
      if (pointer !== event.pointerId || draggedKind !== kind) return;
      dragDistance=Math.hypot(event.clientX-start.x,event.clientY-start.y);
      if (dragDistance<6) return;
      if (!ghost) {
        ghost=document.createElement('div'); ghost.className='post-drag-ghost'; ghost.innerHTML=stampSVG(kind,`ghost-${kind}`);
        ghost.style.width=`${stamp.offsetWidth}px`; document.body.append(ghost); stamp.classList.add('is-dragging');
      }
      ghost.style.left=`${event.clientX-stamp.offsetWidth/2}px`; ghost.style.top=`${event.clientY-stamp.offsetHeight/2}px`;
      const rect=area.getBoundingClientRect();
      area.classList.toggle('is-drop-target',event.clientX>rect.left&&event.clientX<rect.right&&event.clientY>rect.top&&event.clientY<rect.bottom);
    });
    stamp.addEventListener('pointerup',event=> {
      if (inspecting) return;
      if(pointer!==event.pointerId) return;
      if(dragDistance>6) {
        suppressClick=true;
        window.setTimeout(()=>{ suppressClick=false; },0);
        const rect=area.getBoundingClientRect();
        if(event.clientX>rect.left&&event.clientX<rect.right&&event.clientY>rect.top&&event.clientY<rect.bottom) place(kind);
      }
      pointer=-1; draggedKind=null; ghost?.remove(); ghost=null;
      stamp.classList.remove('is-dragging'); area.classList.remove('is-drop-target');
    });
    stamp.addEventListener('pointercancel',()=> {
      pointer=-1; draggedKind=null; ghost?.remove(); ghost=null;
      stamp.classList.remove('is-dragging'); area.classList.remove('is-drop-target');
    });
    stamp.addEventListener('pointerleave',()=> { if(pointer===-1) hideLens(); });
    slots.get(kind)!.addEventListener('click',()=> { if(placed.has(kind)) remove(kind); else place(kind); });
  }

  flip.addEventListener('click',()=> {
    if(placed.size!==3) return;
    flipped=!flipped;
    card.classList.toggle('is-flipped',flipped);
    flip.setAttribute('aria-label',flipped?'Show stamps':'Turn postcard over');
    cardFront.inert=flipped;
    cardBack.inert=!flipped;
    cardFront.setAttribute('aria-hidden', String(flipped));
    cardBack.setAttribute('aria-hidden', String(!flipped));
    status.textContent=flipped?'Happy birthday, Hikaru. May this year be kind to you. With love, a wolfie.':'Postcard stamp side.';
    hideLens();
  });

  save.addEventListener('click',async()=> {
    if(placed.size!==3) return;
    save.disabled=true;
    try {
      const wolfHref=await wolfData;
      const canvas=document.createElement('canvas'); canvas.width=1600; canvas.height=760;
      const context=canvas.getContext('2d'); if(!context) throw new Error('Canvas unavailable');
      context.fillStyle='#fbf7ec'; context.fillRect(0,0,1600,760);
      context.strokeStyle='#c3b79e'; context.lineWidth=1.5;
      const images=await Promise.all(stampKinds.map(async kind=>{
        const url=URL.createObjectURL(new Blob([stampSVG(kind,`download-${kind}`,wolfHref)],{type:'image/svg+xml'}));
        const image=new Image(); image.src=url; await image.decode(); URL.revokeObjectURL(url); return image;
      }));
      if(flipped) {
        context.fillStyle='#ad4b29'; context.font='italic 96px Georgia, serif';
        context.fillText('Happy birthday,',90,225); context.fillText('Hikaru.',90,335);
        context.fillStyle='#605846'; context.font='28px Georgia, serif';
        context.fillText('May this year be kind to you.',95,445);
        context.font='italic 23px Georgia, serif'; context.fillText('with love, a wolfie',95,630);
        images.forEach((image,index)=>context.drawImage(image,950+index*190,245,165,206));
      } else {
        context.beginPath(); context.moveTo(780,55); context.lineTo(780,705); context.stroke();
        [480,560,640].forEach(y=>{context.beginPath();context.moveTo(875,y);context.lineTo(1500,y);context.stroke();});
        images.forEach((image,index)=>context.drawImage(image,1060+index*145,65,125,156));
        context.save();
        context.translate(1120,280);
        context.rotate(-16*Math.PI/180);
        context.strokeStyle='#8c806b'; context.fillStyle='#8c806b'; context.lineWidth=1.3;
        [61,53].forEach(radius=>{context.beginPath();context.arc(0,0,radius,0,Math.PI*2);context.stroke();});
        for (const y of [-34,-18,-2,14,30]) {
          context.beginPath(); context.moveTo(53,y);
          context.bezierCurveTo(80,y-14,101,y+14,130,y);
          context.bezierCurveTo(157,y-14,178,y+14,207,y); context.stroke();
        }
        context.font='15px Courier New, monospace'; context.textAlign='center';
        context.fillText('HIKARU',0,5); context.restore();
      }
      const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Export failed')),'image/png'));
      if(destroyed) return;
      const url=URL.createObjectURL(blob); const anchor=document.createElement('a');
      anchor.href=url; anchor.download='hikaru-postcard.png'; document.body.append(anchor); anchor.click(); anchor.remove(); window.setTimeout(()=>URL.revokeObjectURL(url),60000);
    } catch { status.textContent='Could not save the postcard. Please try again.'; }
    finally { save.disabled=false; }
  });

  const onKey=(event:KeyboardEvent)=> { if(event.key==='Escape'){ inspecting=false; inspect.setAttribute('aria-pressed','false');collection.classList.remove('is-inspecting');hideLens(); } };
  document.addEventListener('keydown',onKey);
  return ()=> { destroyed=true; document.removeEventListener('keydown',onKey); ghost?.remove(); };
}
