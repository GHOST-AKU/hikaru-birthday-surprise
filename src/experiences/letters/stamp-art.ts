import { assetPath } from '../../assets';

export type StampKind = 'comfy' | 'wolf' | 'play';
export const stampKinds: StampKind[] = ['comfy', 'wolf', 'play'];
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

export function stampSVG(kind: StampKind, suffix: string, wolfHref = assetPath('stamps-wolf.webp')): string {
  const holes = [...Array.from({length:18},(_,i)=>`<circle cx="${i*14}" cy="0" r="4.4"/><circle cx="${i*14}" cy="300" r="4.4"/>`), ...Array.from({length:22},(_,i)=>`<circle cx="0" cy="${i*14}" r="4.4"/><circle cx="240" cy="${i*14}" r="4.4"/>`)].join('');
  const art = kind === 'comfy' ? comfyArt() : kind === 'play' ? playArt() : `<image href="${wolfHref}" width="200" height="200" preserveAspectRatio="xMidYMid slice"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300" aria-hidden="true"><defs><mask id="stamp-cut-${suffix}"><rect width="240" height="300" fill="white"/><g fill="black">${holes}</g></mask><clipPath id="stamp-art-${suffix}"><rect width="200" height="200"/></clipPath></defs><g mask="url(#stamp-cut-${suffix})"><rect width="240" height="300" fill="#fbf7ec"/><rect x="15" y="15" width="210" height="270" fill="none" stroke="${colors[kind]}" stroke-width=".9"/><text x="120" y="38" fill="${colors[kind]}" font-family="Georgia,serif" font-weight="bold" font-size="17" letter-spacing="4.5" text-anchor="middle">HIKARU</text><path d="M15 47H225M15 251H225" stroke="${colors[kind]}" stroke-width=".9"/><g transform="translate(20 49)" clip-path="url(#stamp-art-${suffix})"><rect width="200" height="200" fill="#f5f0df"/>${art}</g><text x="120" y="275" fill="${colors[kind]}" font-family="Georgia,serif" font-size="17" font-weight="bold" letter-spacing="3.2" text-anchor="middle">${kind.toUpperCase()}</text><path d="M24 266h28m-28 4h28m-28 4h28M188 266h28m-28 4h28m-28 4h28" stroke="${colors[kind]}" stroke-width=".65"/></g></svg>`;
}

