import './style.css';
import { SignalDisplay } from './signal';
import { InstrumentAudio } from './audio';
import { Dial } from './dial';
import { downloadTicket, messages, receiptSVG, type Language, type Ticket } from './receipt';

const soundIcon = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M11 4 5 8H2v8h3l6 4V4Z"/><path class="sound-muted" d="m17 9 5 6m0-6-5 6"/><g class="sound-waves"><path d="M15 8a6 6 0 0 1 0 8M18 4a11 11 0 0 1 0 16"/></g></svg>`;
const printIcon = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M8 12V4h16v8M8 24H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h24a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-4"/><path d="M8 20h16v10H8zM12 24h8"/><circle cx="25" cy="15" r="1" fill="currentColor" stroke="none"/></svg>`;
const downloadIcon = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4"/></svg>`;

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="stage">
    <section class="instrument" aria-label="Birthday instrument">
      <div class="machine">
        <div class="faceplate" aria-hidden="true"></div>
        <i class="screw screw-tl" aria-hidden="true"></i>
        <i class="screw screw-tr" aria-hidden="true"></i>
        <i class="screw screw-bl" aria-hidden="true"></i>
        <i class="screw screw-br" aria-hidden="true"></i>
        <header class="device-header">
          <h1>HIKARU</h1>
          <button class="sound-button" type="button" aria-label="Turn sound on" aria-pressed="false">${soundIcon}</button>
        </header>
        <div class="display" aria-hidden="true"><canvas id="signal"></canvas><div class="glass"></div></div>
        <div class="dial-group">
          <svg class="dial-scale" viewBox="0 0 190 150" fill="none" aria-hidden="true">${Array.from({ length: 11 }, (_, index) => {
            const angle = (-62 + index * 12.4) * Math.PI / 180;
            const radius = index % 5 === 0 ? 89 : 85;
            return `<path d="M${95 + Math.sin(angle) * (radius - (index % 5 === 0 ? 14 : 9))} ${105 - Math.cos(angle) * (radius - (index % 5 === 0 ? 14 : 9))} L${95 + Math.sin(angle) * radius} ${105 - Math.cos(angle) * radius}"/>`;
          }).join('')}</svg>
          <div class="dial" role="slider" tabindex="0" aria-label="Comfy to chaos" aria-valuemin="0" aria-valuemax="100" aria-valuenow="64" aria-orientation="vertical">
            <div class="dial-grip"><div class="dial-cap"><span class="dial-pointer"></span></div></div>
          </div>
          <div class="dial-labels" aria-hidden="true"><span>COMFY</span><span>CHAOS</span></div>
        </div>
        <div class="language-switch" role="group" aria-label="Ticket language">
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
const soundButton = element<HTMLButtonElement>('.sound-button');
const printButton = element<HTMLButtonElement>('.print-button');
const saveButton = element<HTMLButtonElement>('.download-button');
const languageSwitch = element('.language-switch');
const status = element('#status');
const signal = new SignalDisplay(element<HTMLCanvasElement>('#signal'));
const audio = new InstrumentAudio();
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const dial = new Dial(element('.dial'), value => {
  signal.setMood(value);
  audio.tick(value);
});
let language: Language = 'en';
let ticket: Ticket | null = null;
let printing = false;
let detached = false;
let dragStart = 0;
let dragPointer: number | null = null;
let pull = 0;

soundButton.addEventListener('click', async () => {
  soundButton.disabled = true;
  const enabled = await audio.toggle(dial.current);
  soundButton.setAttribute('aria-pressed', String(enabled));
  soundButton.setAttribute('aria-label', enabled ? 'Turn sound off' : 'Turn sound on');
  soundButton.disabled = false;
});

document.querySelectorAll<HTMLButtonElement>('[data-language]').forEach(button => {
  button.addEventListener('click', () => {
    language = button.dataset.language as Language;
    languageSwitch.classList.toggle('is-chinese', language === 'zh');
    document.querySelectorAll('[data-language]').forEach(option => {
      option.setAttribute('aria-pressed', String((option as HTMLElement).dataset.language === language));
    });
    audio.tick(language === 'zh' ? 0.7 : 0.2);
  });
});

const delay = (milliseconds: number) => new Promise<void>(resolve => window.setTimeout(resolve, milliseconds));

printButton.addEventListener('click', async () => {
  if (printing) return;
  printing = true;
  detached = false;
  printButton.disabled = true;
  printButton.setAttribute('aria-busy', 'true');
  saveButton.hidden = true;
  saveButton.disabled = true;
  paper.tabIndex = -1;
  mount.setAttribute('aria-hidden', 'true');
  status.textContent = '';
  ticket = { language, mood: dial.current, phase: signal.snapshot() };

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
  audio.print(ticket.mood);
  await delay(reduced.matches ? 30 : 1900);
  mount.classList.add('is-ready');
  machine.classList.remove('is-printing');
  paper.tabIndex = 0;
  printButton.disabled = false;
  printButton.removeAttribute('aria-busy');
  saveButton.hidden = false;
  saveButton.disabled = false;
  saveButton.setAttribute('aria-label', ticket.language === 'zh' ? '儲存生日紙票' : 'Save birthday ticket');
  status.textContent = messages[ticket.language].label;
  printing = false;
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
