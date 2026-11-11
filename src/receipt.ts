import { broadcast, channels, type ChannelId, type Language } from './radio/channels';
export type { Language } from './radio/channels';
export interface Ticket { language: Language; channel: ChannelId; elapsed: number; waveform: number[] }
const ink = '#343a31';
const escape = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const text = (value: string, x: number, y: number, size: number, attributes = ''): string => `<text x="${x}" y="${y}" font-size="${size}" ${attributes}>${escape(value)}</text>`;
const centered = 'text-anchor="middle"';
const bold = `${centered} font-family="Arial, Noto Sans CJK TC, sans-serif" font-weight="800"`;
export function ticketLabel(ticket: Ticket): string {
  const channel = channels.find(item => item.id === ticket.channel)!;
  return `${channel.title[ticket.language]} · ${channel.frequency} FM · ${ticket.language === 'zh' ? '生日電台紙票' : 'Birthday radio ticket'}`;
}
function birthday(language: Language): string {
  const notes = channels[0].notes;
  const total = notes.reduce((sum, [,beats]) => sum + beats, 0);
  let beat = 0;
  const holes = notes.map(([midi, duration]) => {
    const x = 35 + beat / total * 230; beat += duration;
    return `<rect x="${x}" y="${200 - (midi - 67) * 3.3}" width="${Math.max(3,duration / total * 210)}" height="3.8" rx="1.9"/>`;
  }).join('');
  const edges = Array.from({length:24}, (_,i) => `<circle cx="${35+i*10}" cy="147" r="1.2"/><circle cx="${35+i*10}" cy="218" r="1.2"/>`).join('');
  return `${text(language === 'zh' ? '生日' : 'HAPPY',150,89,46,bold)}${text(language === 'zh' ? '快樂' : 'BIRTHDAY',150,130,42,bold)}
    <path d="M25 140H275V225H25Z" fill="none" stroke="currentColor" stroke-width=".6"/>${edges}${holes}
    ${text('HIKARU',150,279,29,`${bold} letter-spacing="7"`)}
    ${text(language === 'zh' ? '新的一歲，好好快樂。' : 'ANOTHER YEAR OF YOU.',150,309,11,`${centered} letter-spacing="1"`)}
    ${text(language === 'zh' ? '來自一隻 wolfie' : 'with love, a wolfie',150,331,11,centered)}`;
}
function spring(language: Language): string {
  const notes = channels[1].notes;
  const lines = Array.from({length:17}, (_,row) => {
    const y = 130 + row * 7.5;
    return `<path d="M25 ${y} C85 ${y-45-row} 155 ${y+53-row} 260 ${y-10}"/>`;
  }).join('');
  const petals = notes.map(([pitch],i) => {
    const x = 36+i*16.5; const y = 185 - (pitch-55)*5 + Math.sin(i)*10;
    return `<ellipse cx="${x}" cy="${y}" rx="2" ry="5" transform="rotate(${i*37} ${x} ${y})"/>`;
  }).join('');
  return `${text('望春風',150,105,49,`${centered} font-family="serif" letter-spacing="10"`)}
    <g fill="none" stroke="currentColor" stroke-width=".65" opacity=".8">${lines}</g>${petals}
    ${text(language === 'zh' ? '鄧雨賢・旋律選段' : 'TENG YU-HSIEN · EXCERPT',150,298,10,`${centered} letter-spacing="1"`)}
    ${text(language === 'zh' ? '把春風，留在這一頁。' : 'A LITTLE SPRING, ON PAPER.',150,327,11,centered)}`;
}
function river(language: Language): string {
  const hills = Array.from({length:25}, (_,i) => {
    const y = 119+i*5.4;
    return `<path d="M25 ${y+14} Q65 ${y-57} 110 ${y+4} T275 ${y-6}"/>`;
  }).join('');
  const bends = Array.from({length:7}, (_,i) => `<path d="M${170+i*.8} 116 C${112+i*1.7} 147 ${217+i*2} 172 ${156+i*2.4} 200 S${99+i*4.4} 249 ${72+i*6} 263"/>`).join('');
  return `${text('SHENANDOAH',150,88,26,`${bold} letter-spacing="-.8"`)}
    <defs><clipPath id="river-window"><rect x="25" y="109" width="250" height="160"/></clipPath></defs>
    <g clip-path="url(#river-window)" fill="none" stroke="currentColor" stroke-width=".7">${hills}
      <path d="M173 116 C120 147 235 172 164 200 S112 249 92 263" stroke="#f8f5e9" stroke-width="28"/>
      <g stroke-width=".55">${bends}</g>
    </g>
    ${text(language === 'zh' ? '河流，帶著旋律往前。' : 'AWAY, YOU ROLLING RIVER.',150,307,11,centered)}
    ${text(language === 'zh' ? '傳統旋律・選段' : 'TRADITIONAL · EXCERPT',150,331,10,`${centered} letter-spacing="1"`)}`;
}
function news(language: Language): string {
  const content = broadcast[language];
  return `<path d="M25 58H275M25 62H275" stroke="currentColor" stroke-width=".8"/>
    ${text(language === 'zh' ? '生日特報' : 'BIRTHDAY POST',150,86,25,`${centered} font-family="Georgia, Noto Serif CJK TC, serif" font-weight="bold"`)}
    <path d="M25 96H275" stroke="currentColor"/>
    ${text('HIKARU',150,126,33,`${bold} letter-spacing="5"`)}
    ${text(language === 'zh' ? content.headline : 'TODAY’S HEADLINE.',150,146,11,`${centered} letter-spacing="1"`)}
    ${content.lines.map((line,i) => text(line,34,176+i*13.8,language === 'zh' ? 12 : 11.4,'font-family="Georgia, Noto Serif CJK TC, serif"')).join('')}
    <path d="M25 337H275" stroke="currentColor" stroke-width=".6"/>`;
}
export function receiptSVG(ticket: Ticket, accessible = true): string {
  const channel = channels.find(item => item.id === ticket.channel)!;
  const index = channels.indexOf(channel)+1;
  const art = ticket.channel === 'birthday' ? birthday(ticket.language) : ticket.channel === 'spring' ? spring(ticket.language) : ticket.channel === 'river' ? river(ticket.language) : news(ticket.language);
  const time = `${String(Math.floor(ticket.elapsed / 60)).padStart(2,'0')}:${String(Math.floor(ticket.elapsed % 60)).padStart(2,'0')}`;
  const fingerprint = ticket.waveform.map((value,i) => `<path d="M${35+i*3.6} ${356-Math.abs(value)*11}v${Math.max(.8,Math.abs(value)*22)}"/>`).join('');
  const teeth = Array.from({length:30},(_,i) => `L${295-i*10} 410L${290-i*10} 404`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 410"${accessible ? ` role="img" aria-label="${escape(ticketLabel(ticket))}" lang="${ticket.language === 'zh' ? 'zh-Hant' : 'en'}"` : ''}>
    <defs><pattern id="paper-grain" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1" cy="2" r=".45" fill="#695f43" opacity=".075"/><circle cx="5" cy="5" r=".4" fill="#695f43" opacity=".05"/></pattern></defs>
    <path d="M0 0H300V404${teeth}V0Z" fill="#f8f5e9"/>
    <rect width="300" height="403" fill="url(#paper-grain)"/>
    <path d="M0 8H300" stroke="#b4ae9e" stroke-dasharray="3 5"/>
    <g fill="${ink}" color="${ink}" font-family="Courier New, Noto Sans CJK TC, monospace">
      ${text('HIKARU',25,37,11,'letter-spacing="3"')}${text(`${channel.frequency} FM`,275,37,10,'text-anchor="end"')}
      ${art}
      <g fill="none" stroke="currentColor" stroke-width=".8" opacity=".6">${fingerprint}</g>
      <path d="M25 374H275" stroke="currentColor" stroke-width=".6" stroke-dasharray="2 3"/>
      ${text(`0${index} / 04`,25,393,10)}${text(ticket.language === 'zh' ? '生日電台' : 'BIRTHDAY RADIO',150,393,9,centered)}${text(time,275,393,10,'text-anchor="end"')}
    </g>
  </svg>`;
}
export async function downloadTicket(ticket: Ticket): Promise<void> {
  const url = URL.createObjectURL(new Blob([receiptSVG(ticket,false)], {type:'image/svg+xml;charset=utf-8'}));
  try {
    const image = new Image(); image.src = url; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 1640;
    const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas unavailable');
    context.drawImage(image,0,0,canvas.width,canvas.height);
    const blob = await new Promise<Blob>((resolve,reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Export failed')),'image/png'));
    const downloadUrl = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = downloadUrl; link.download = `hikaru-radio-${ticket.channel}-${ticket.language}.png`;
    document.body.append(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl),60000);
  } finally { URL.revokeObjectURL(url); }
}
