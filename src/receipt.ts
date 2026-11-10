import { wavePath } from './signal';

export type Language = 'en' | 'zh';
export interface Ticket { language: Language; mood: number; phase: number }

export const messages = {
  en: {
    heading: ['HAPPY', 'BIRTHDAY.'],
    body: ['Good games.', 'Gentle days.', 'A little more joy,', 'every time around.'],
    ending: 'with love, a wolfie',
    label: 'Happy birthday, Hikaru. Good games. Gentle days. A little more joy, every time around. With love, a wolfie.'
  },
  zh: {
    heading: ['生日', '快樂。'],
    body: ['願新的一歲，', '有盡興的遊戲，', '也有安心的日常。'],
    ending: '一隻 wolfie 敬上',
    label: 'Hikaru，生日快樂。願新的一歲，有盡興的遊戲，也有安心的日常。一隻 wolfie 敬上。'
  }
};

export function receiptSVG(ticket: Ticket, accessible = true): string {
  const message = messages[ticket.language];
  const lines = Array.from({ length: 11 }, (_, index) => {
    const shift = index * 0.12;
    return `<path d="${wavePath(ticket.mood, ticket.phase + shift, 230, 45)}" transform="translate(35 ${164 + index * 4.2})"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 410"${accessible ? ` role="img" aria-label="${message.label}" lang="${ticket.language === 'zh' ? 'zh-Hant' : 'en'}"` : ''}>
    <defs>
      <pattern id="paper-grain" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1" cy="2" r="0.45" fill="#695f43" opacity=".075"/><circle cx="5" cy="5" r=".4" fill="#695f43" opacity=".05"/></pattern>
    </defs>
    <path d="M0 0H300V404L295 410L290 404L285 410L280 404L275 410L270 404L265 410L260 404L255 410L250 404L245 410L240 404L235 410L230 404L225 410L220 404L215 410L210 404L205 410L200 404L195 410L190 404L185 410L180 404L175 410L170 404L165 410L160 404L155 410L150 404L145 410L140 404L135 410L130 404L125 410L120 404L115 410L110 404L105 410L100 404L95 410L90 404L85 410L80 404L75 410L70 404L65 410L60 404L55 410L50 404L45 410L40 404L35 410L30 404L25 410L20 404L15 410L10 404L5 410L0 404Z" fill="#f8f5e9"/>
    <path d="M0 8H300" stroke="#b4ae9e" stroke-width="1" stroke-dasharray="3 5"/>
    <rect width="300" height="403" fill="url(#paper-grain)"/>
    <g fill="#343a31" font-family="'Courier New', 'Noto Sans CJK TC', monospace">
      <text x="150" y="48" text-anchor="middle" font-size="12" letter-spacing="5">HIKARU</text>
      <g text-anchor="middle" font-family="Arial, 'Noto Sans CJK TC', sans-serif" font-size="${ticket.language === 'zh' ? '40' : '38'}" font-weight="800" letter-spacing="${ticket.language === 'zh' ? '7' : '-1.2'}">
        <text x="150" y="102">${message.heading[0]}</text>
        <text x="150" y="143">${message.heading[1]}</text>
      </g>
      <g fill="none" stroke="#4b5644" stroke-width=".7" opacity=".86">${lines}</g>
      <g text-anchor="middle" font-size="${ticket.language === 'zh' ? '12.5' : '12.8'}" letter-spacing="${ticket.language === 'zh' ? '1' : '0'}">${message.body.map((line, index) => `<text x="150" y="${270 + index * 20}">${line}</text>`).join('')}</g>
      <path d="M45 357H255" stroke="#343a31" stroke-width=".6" stroke-dasharray="2 3"/>
      <text x="150" y="382" text-anchor="middle" font-size="10" letter-spacing=".4">${message.ending}</text>
    </g>
  </svg>`;
}

export async function downloadTicket(ticket: Ticket): Promise<void> {
  const svg = receiptSVG(ticket, false);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1640;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(result => result ? resolve(result) : reject(new Error('Image export failed')), 'image/png');
    });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `hikaru-${ticket.language}-${Math.round(ticket.mood * 100)}.png`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);
  } finally {
    URL.revokeObjectURL(url);
  }
}
