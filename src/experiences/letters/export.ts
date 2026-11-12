import { assetPath } from '../../assets';
import { stampSVG, type StampKind } from './stamp-art';

export async function saveEnvelope(kind: StampKind, back: boolean): Promise<void> {
  const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1000;
  const c=canvas.getContext('2d')!;
  c.fillStyle='#ede8dc';c.fillRect(0,0,1600,1000);
  c.shadowColor='#57422c36';c.shadowBlur=28;c.shadowOffsetY=18;c.fillStyle='#fbf4e5';c.fillRect(100,100,1400,800);c.shadowColor='transparent';
  const load=async(src:string)=>{const image=new Image();image.src=src;await image.decode();return image;};
  if(back){
    c.strokeStyle='#d2c4ac';c.lineWidth=2;c.beginPath();c.moveTo(100,900);c.lineTo(800,400);c.lineTo(1500,900);c.stroke();
    c.fillStyle='#f8efde';c.beginPath();c.moveTo(100,100);c.lineTo(800,560);c.lineTo(1500,100);c.closePath();c.fill();c.stroke();
    const seal=await load(assetPath('letters/wax-h.png'));c.drawImage(seal,690,450,220,220);
  }else{
    c.fillStyle='#734b39';c.font='italic 52px Georgia,serif';c.fillText('Hikaru.',180,240);c.font='italic 96px Georgia,serif';c.textAlign='center';c.fillText('To a wolfie',800,555);
    let wolf=assetPath('stamps-wolf.webp');
    if(kind==='wolf'){
      const response=await fetch(wolf);if(!response.ok)throw new Error('Artwork unavailable');const blob=await response.blob();
      wolf=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob);});
    }
    const url=URL.createObjectURL(new Blob([stampSVG(kind,'saved-letter',wolf)],{type:'image/svg+xml'}));
    try{const stamp=await load(url);c.drawImage(stamp,1240,150,160,200);}finally{URL.revokeObjectURL(url);}
    c.save();c.translate(1215,340);c.rotate(-.18);c.strokeStyle='#545348bb';c.fillStyle='#545348bb';c.lineWidth=2;
    [77,67].forEach(r=>{c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.stroke();});
    c.font='15px Georgia,serif';c.fillText('BIRTHDAY MAIL',0,-28);c.font='18px Georgia,serif';c.fillText('WITH LOVE',0,12);
    for(let i=0;i<5;i++){c.beginPath();c.moveTo(65,-35+i*16);c.bezierCurveTo(100,-55+i*16,115,-15+i*16,145,-35+i*16);c.bezierCurveTo(175,-55+i*16,190,-15+i*16,220,-35+i*16);c.stroke();}c.restore();
  }
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Export unavailable')),'image/png'));
  const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=back?'hikaru-sealed-letter.png':'hikaru-reply.png';document.body.append(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
