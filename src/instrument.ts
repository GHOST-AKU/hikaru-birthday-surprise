import './style.css';
import { SignalDisplay } from './signal';
import { InstrumentAudio } from './audio';
import { Dial } from './dial';
import { channels, frequencyAt, reception } from './radio/channels';
import { downloadTicket, ticketLabel, receiptSVG, type Language, type Ticket } from './receipt';

const printIcon = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M8 12V4h16v8M8 24H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h24a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-4"/><path d="M8 20h16v10H8zM12 24h8"/><circle cx="25" cy="15" r="1" fill="currentColor" stroke="none"/></svg>`;
const downloadIcon = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4"/></svg>`;

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="stage">
    <section class="instrument" aria-label="Hikaru birthday radio">
      <div class="machine">
        <div class="faceplate" aria-hidden="true"></div>
        <i class="screw screw-tl" aria-hidden="true"></i>
        <i class="screw screw-tr" aria-hidden="true"></i>
        <i class="screw screw-bl" aria-hidden="true"></i>
        <i class="screw screw-br" aria-hidden="true"></i>
        <header class="device-header">
          <h1>HIKARU</h1>
          <label class="volume-control"><span>VOL</span><span class="volume-rail"><input id="volume" type="range" min="0" max="100" value="42" aria-label="Volume"/><i aria-hidden="true"></i></span></label>
        </header>
        <div class="display">
          <div class="radio-readout"><div><span id="frequency">88.8</span><small>FM</small></div><div class="channel-readout"><i class="lock-light is-locked" aria-hidden="true"></i><span id="channel-name">BIRTHDAY</span></div></div>
          <canvas id="signal" aria-hidden="true"></canvas>
          <div class="tuner-band" aria-hidden="true">${channels.map(item => `<i style="left:${item.position*100}%"></i>`).join('')}<b id="tuner-needle"></b></div><div class="glass" aria-hidden="true"></div>
        </div>
        <div class="dial-group">
          <svg class="dial-scale" viewBox="-10 -10 210 210" fill="none" aria-hidden="true">${Array.from({ length: 26 }, (_, index) => {
            const angle = (-125 + index * 10) * Math.PI / 180;
            const strong = [2,9,16,23].includes(index);
            return `<path d="M${95 + Math.sin(angle) * (strong ? 73 : 78)} ${95 - Math.cos(angle) * (strong ? 73 : 78)} L${95 + Math.sin(angle) * 84} ${95 - Math.cos(angle) * 84}" stroke-width="${strong ? 2.5 : 1}"/>`;
          }).join('')}${channels.map(item => {
            const angle = (-125 + item.position * 250) * Math.PI / 180;
            return `<text x="${95 + Math.sin(angle) * 97}" y="${97 - Math.cos(angle) * 97}" text-anchor="middle" fill="currentColor" stroke="none" font-size="6.5">${item.frequency}</text>`;
          }).join('')}</svg>
          <div class="dial" role="slider" tabindex="0" aria-label="Tune radio" aria-valuemin="0" aria-valuemax="100" aria-valuenow="8" aria-orientation="vertical">
            <div class="dial-grip"><div class="dial-cap"><span class="dial-pointer"></span></div></div>
          </div>
          <div class="dial-labels" aria-hidden="true"><span>FM</span><span>TUNE</span></div>
        </div>
        <div class="language-switch" role="group" aria-label="Broadcast and ticket language">
          <span class="language-thumb" aria-hidden="true"></span>
          <button type="button" data-language="en" aria-label="English" aria-pressed="true">EN</button>
          <button type="button" data-language="zh" aria-label="繁體中文" aria-pressed="false" lang="zh-Hant">中</button>
        </div>
        <button class="print-button" type="button" aria-label="Print birthday ticket">${printIcon}<span>PRINT</span></button>
        <div class="printer-slot" aria-hidden="true"></div>
      </div>
      <div class="receipt-mount" aria-hidden="true">
        <div class="paper" role="button" tabindex="-1" aria-label="Tear off birthday ticket"></div>
        <button class="download-button" type="button" aria-label="Save birthday ticket" hidden>${downloadIcon}</button>
      </div>
    </section>
  </div>
  <div class="sr-only" role="status" aria-live="polite" id="status"></div>`;

function element<T extends HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Missing element: ${selector}`);
  return node;
}

const stage = element('.stage');
const machine = element('.machine');
const paper = element('.paper');
const mount = element('.receipt-mount');
const volume = element<HTMLInputElement>('#volume');
const channelName = element('#channel-name');
const frequency = element('#frequency');
const lockLight = element('.lock-light');
const tunerNeedle = element('#tuner-needle');
const printButton = element<HTMLButtonElement>('.print-button');
const saveButton = element<HTMLButtonElement>('.download-button');
const languageSwitch = element('.language-switch');
const status = element('#status');
let language: Language = 'en';
let printing = false;
const audio = new InstrumentAudio(() => {
  status.textContent = language === 'zh' ? '音訊未能載入，請再撥動旋鈕重試。' : 'Audio could not load. Move the dial to retry.';
});
const signal = new SignalDisplay(element<HTMLCanvasElement>('#signal'), data => audio.waveform(data));
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
function updateTuner(position: number): void {
  const received = reception(position);
  frequency.textContent = frequencyAt(position);
  channelName.textContent = received.strength > .25 ? received.channel.title[language] : '— — —';
  channelName.style.opacity = String(.35 + received.strength * .65);
  lockLight.classList.toggle('is-locked', received.locked);
  tunerNeedle.style.left = `${position * 100}%`;
  printButton.disabled = printing || !received.locked;
  printButton.setAttribute('aria-label', received.locked ? (language === 'zh' ? `列印 ${received.channel.title.zh} 紙票` : `Print ${received.channel.title.en} ticket`) : (language === 'zh' ? '調準頻道後列印' : 'Tune to a station to print'));
}
const dial = new Dial(element('.dial'), position => {
  audio.tune(position);
  updateTuner(position);
}, 8, value => {
  const received = reception(value / 100);
  return `${frequencyAt(value / 100)} FM, ${received.locked ? received.channel.title[language] : language === 'zh' ? '調頻中' : 'tuning'}`;
}, channels.map(item => item.position * 100));
let ticket: Ticket | null = null;
let detached = false;
let dragStart = 0;
let dragPointer: number | null = null;
let pull = 0;

const activate = (): void => { void audio.activate(); };
element('.dial').addEventListener('pointerdown', activate);
element('.dial').addEventListener('keydown', event => {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End'].includes(event.key)) activate();
});
volume.addEventListener('pointerdown', activate);
volume.addEventListener('input', () => {
  audio.setVolume(Number(volume.value) / 100);
  volume.closest<HTMLElement>('.volume-control')!.style.setProperty('--volume', volume.value);
  volume.setAttribute('aria-valuetext', `${volume.value}%`);
  activate();
});

document.querySelectorAll<HTMLButtonElement>('[data-language]').forEach(button => {
  button.addEventListener('click', () => {
    language = button.dataset.language as Language;
    languageSwitch.classList.toggle('is-chinese', language === 'zh');
    document.querySelectorAll('[data-language]').forEach(option => {
      option.setAttribute('aria-pressed', String((option as HTMLElement).dataset.language === language));
    });
    audio.setLanguage(language);
    updateTuner(dial.current);
    activate();
  });
});

const delay = (milliseconds: number) => new Promise<void>(resolve => window.setTimeout(resolve, milliseconds));

printButton.addEventListener('click', async () => {
  if (printing || !reception(dial.current).locked) return;
  activate();
  printing = true;
  detached = false;
  printButton.disabled = true;
  printButton.setAttribute('aria-busy', 'true');
  saveButton.hidden = true;
  saveButton.disabled = true;
  paper.tabIndex = -1;
  mount.setAttribute('aria-hidden', 'true');
  status.textContent = '';
  ticket = { language, channel: reception(dial.current).channel.id, elapsed: audio.snapshot(), waveform: signal.snapshot() };

  if (stage.classList.contains('ticket-visible')) {
    mount.classList.add('is-clearing');
    await delay(reduced.matches ? 0 : 300);
  }

  paper.classList.remove('is-fed', 'is-detached', 'is-dragging');
  paper.style.removeProperty('--pull');
  paper.style.removeProperty('--tilt');
  mount.classList.remove('is-ready');
  paper.innerHTML = receiptSVG(ticket);
  paper.setAttribute('aria-label', ticket.language === 'zh' ? '撕下生日紙票' : 'Tear off birthday ticket');
  stage.classList.add('ticket-visible');
  machine.classList.add('is-printing');
  await delay(reduced.matches ? 30 : 550);
  mount.classList.remove('is-clearing');
  mount.setAttribute('aria-hidden', 'false');
  paper.classList.add('is-fed');
  audio.print();
  await delay(reduced.matches ? 30 : 1900);
  mount.classList.add('is-ready');
  machine.classList.remove('is-printing');
  paper.tabIndex = 0;
  updateTuner(dial.current);
  printButton.removeAttribute('aria-busy');
  saveButton.hidden = false;
  saveButton.disabled = false;
  saveButton.setAttribute('aria-label', ticket.language === 'zh' ? '儲存生日紙票' : 'Save birthday ticket');
  status.textContent = ticketLabel(ticket);
  printing = false;
  updateTuner(dial.current);
});

function detach(): void {
  if (detached || printing || !ticket) return;
  detached = true;
  paper.classList.remove('is-dragging');
  paper.style.removeProperty('--pull');
  paper.style.removeProperty('--tilt');
  paper.classList.add('is-detached');
  paper.tabIndex = -1;
  audio.tear();
  saveButton.focus({ preventScroll: true });
}

paper.addEventListener('pointerdown', event => {
  if (printing || detached || !ticket || event.button !== 0) return;
  dragStart = event.clientY;
  pull = 0;
  dragPointer = event.pointerId;
  paper.setPointerCapture(event.pointerId);
  paper.classList.add('is-dragging');
});

paper.addEventListener('pointermove', event => {
  if (event.pointerId !== dragPointer) return;
  pull = Math.max(0, Math.min(event.clientY - dragStart, 90));
  paper.style.setProperty('--pull', `${pull * 0.55}px`);
  paper.style.setProperty('--tilt', `${-pull * 0.025}deg`);
});

paper.addEventListener('pointerup', event => {
  if (event.pointerId !== dragPointer) return;
  dragPointer = null;
  paper.releasePointerCapture(event.pointerId);
  if (pull > 32) detach();
  else {
    paper.classList.remove('is-dragging');
    paper.style.removeProperty('--pull');
    paper.style.removeProperty('--tilt');
  }
});

paper.addEventListener('pointercancel', () => {
  dragPointer = null;
  paper.classList.remove('is-dragging');
  paper.style.removeProperty('--pull');
  paper.style.removeProperty('--tilt');
});

paper.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    detach();
  }
});

saveButton.addEventListener('click', async () => {
  if (!ticket || printing) return;
  saveButton.disabled = true;
  try {
    await downloadTicket(ticket);
  } catch {
    status.textContent = ticket.language === 'zh' ? '無法儲存，請重試。' : 'Could not save. Please try again.';
  } finally {
    saveButton.disabled = false;
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) void audio.pause();
  else void audio.resume();
});

window.addEventListener('pagehide', () => void audio.pause());

window.addEventListener('pageshow', () => { if (!document.hidden) void audio.resume(); });
