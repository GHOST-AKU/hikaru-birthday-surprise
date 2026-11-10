import './sound.css';
import { Dial } from '../dial';
import { MusicDisplay } from './sound/display';
import { KEYS, PITCH_NAMES, STEP, MusicEngine, arrange, renderMelody, type Note } from './sound/music';

const icons = {
  speaker: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m11 4-6 4H2v8h3l6 4V4Z"/><g class="music-speaker-on"><path d="M15 8a6 6 0 0 1 0 8M18 4a11 11 0 0 1 0 16"/></g><path class="music-speaker-off" d="m16 9 6 6m0-6-6 6"/></svg>',
  loop: '<svg viewBox="0 0 48 32" fill="none" aria-hidden="true"><path d="M5 17A11 11 0 0 1 16 6h22m-5-4 5 4-5 4M43 15a11 11 0 0 1-11 11H10m5 4-5-4 5-4"/><path class="music-play-icon" d="m21 11 9 5-9 5Z"/><path class="music-stop-icon" d="M20 11h10v10H20Z"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/></svg>',
  reset: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 9A8 8 0 1 0 20 16M20 3v6h-6"/></svg>'
};

export function mountSound(root: HTMLElement): () => void {
  root.innerHTML = `<section class="music-device" aria-label="Hikaru pentatonic instrument">
    <div class="music-machine">
      <div class="music-faceplate" aria-hidden="true"></div>
      <i class="music-screw music-screw-tl" aria-hidden="true"></i><i class="music-screw music-screw-tr" aria-hidden="true"></i><i class="music-screw music-screw-bl" aria-hidden="true"></i><i class="music-screw music-screw-br" aria-hidden="true"></i>
      <header class="music-header"><h1>HIKARU</h1><button type="button" class="music-mute music-dark-key" aria-label="Mute sound" aria-pressed="false">${icons.speaker}</button></header>
      <div class="music-screen"><canvas aria-hidden="true"></canvas><div class="music-sequence" aria-hidden="true">${Array.from({ length: 16 }, () => '<span></span>').join('')}</div><div class="music-birthday" hidden>Happy birthday,<br>Hikaru.</div><div class="music-glass" aria-hidden="true"></div></div>
      <div class="music-keys" role="group" aria-label="D major pentatonic scale">${KEYS.map((letter, key) => `<button type="button" class="music-key" data-note="${key}" aria-label="Play ${letter}, ${PITCH_NAMES[key]}" aria-keyshortcuts="${letter}"><span>${letter}</span></button>`).join('')}</div>
      <div class="music-tone-group"><svg class="music-ticks" viewBox="0 0 160 100" fill="none" aria-hidden="true">${Array.from({ length: 11 }, (_, index) => {
        const angle = (-65 + index * 13) * Math.PI / 180;
        const r = index % 5 === 0 ? 76 : 73;
        return `<path d="M${80 + Math.sin(angle) * (r - (index % 5 === 0 ? 12 : 8))} ${91 - Math.cos(angle) * (r - (index % 5 === 0 ? 12 : 8))} L${80 + Math.sin(angle) * r} ${91 - Math.cos(angle) * r}"/>`;
      }).join('')}</svg><div class="music-tone" role="slider" tabindex="0" aria-label="Tone" aria-valuemin="0" aria-valuemax="100" aria-valuenow="46" aria-orientation="vertical"><div class="music-knurl"><div class="music-knob-cap"><span></span></div></div></div><span class="music-tone-label">TONE</span></div>
      <div class="music-controls"><button type="button" class="music-loop" aria-label="Loop your melody" aria-pressed="false" disabled>${icons.loop}<span>LOOP</span></button><button type="button" class="music-download music-dark-key" aria-label="Download melody as WAV" disabled>${icons.download}</button><button type="button" class="music-reset music-dark-key" aria-label="Clear melody" disabled>${icons.reset}</button></div>
    </div><div class="music-status" role="status" aria-live="polite"></div>
  </section>`;
  const find = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('.music-key')];
  const loopButton = find<HTMLButtonElement>('.music-loop');
  const saveButton = find<HTMLButtonElement>('.music-download');
  const resetButton = find<HTMLButtonElement>('.music-reset');
  const muteButton = find<HTMLButtonElement>('.music-mute');
  const birthday = find('.music-birthday');
  const screen = find('.music-screen');
  const status = find('.music-status');
  const cells = [...root.querySelectorAll<HTMLElement>('.music-sequence span')];
  const keys = find('.music-keys');
  const engine = new MusicEngine();
  const display = new MusicDisplay(find<HTMLCanvasElement>('canvas'));
  const dial = new Dial(find('.music-tone'), value => engine.setTone(value), 46, value => `${value}% brightness`);
  let notes: Note[] = [];
  let phrase = arrange(notes);
  let recent = '';
  let success = false;
  let muted = false;
  let looping = false;
  let disposed = false;
  let generation = 0;
  let transport = 0;
  let nextStep = 0;
  let origin = 0;
  let lastInput = -1;
  let birthdayTimer = 0;
  let exportUrl: string | null = null;
  const lastKey = Array.from({ length: 6 }, () => -1);
  const keyTimers: number[] = [];
  const timers = new Set<number>();
  const pointers = new Map<number, number>();

  function pattern(step = 0, playing = false): void {
    const page = Math.floor(step / 16) * 16;
    const filled = new Set(phrase.notes.filter(note => note.step >= page && note.step < page + 16).map(note => note.step % 16));
    cells.forEach((cell, index) => {
      cell.classList.toggle('is-filled', filled.has(index));
      cell.classList.toggle('is-current', playing && index === step % 16);
    });
  }
  function flash(key: number): void {
    display.pulse(key);
    buttons[key].classList.add('is-down');
    clearTimeout(keyTimers[key]);
    keyTimers[key] = window.setTimeout(() => buttons[key].classList.remove('is-down'), 135);
  }
  function stopLoop(): void {
    generation++;
    looping = false;
    clearInterval(transport);
    timers.forEach(timer => clearTimeout(timer));
    timers.clear();
    engine.stop();
    loopButton.setAttribute('aria-pressed', 'false');
    loopButton.setAttribute('aria-label', 'Loop your melody');
    pattern();
  }
  function play(key: number): void {
    if (disposed) return;
    const now = performance.now() / 1000;
    if (now - lastKey[key] < .065) return;
    lastKey[key] = now;
    if (looping) stopLoop();
    const velocity = now - lastInput < .09 ? .58 : .85;
    lastInput = now;
    notes = notes.filter(note => now - note.time < 20).slice(-63);
    notes.push({ key, time: now, velocity });
    phrase = arrange(notes);
    pattern(phrase.notes[phrase.notes.length - 1].step);
    flash(key);
    loopButton.disabled = saveButton.disabled = resetButton.disabled = false;
    const token = generation;
    void engine.ready().then(() => {
      if (!disposed && !document.hidden && token === generation) engine.play(key, engine.now + .008, velocity, true);
    }).catch(() => { status.textContent = 'Audio is unavailable in this browser.'; });
    recent = (recent + KEYS[key]).slice(-6);
    if (recent === 'HIKARU' && !success) {
      success = true;
      birthday.hidden = false;
      screen.classList.add('has-birthday');
      status.textContent = 'Happy birthday, Hikaru.';
      birthdayTimer = window.setTimeout(() => { birthday.hidden = true; screen.classList.remove('has-birthday'); }, 4500);
    }
  }
  buttons.forEach((button, key) => {
    button.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      button.focus({ preventScroll: true });
      pointers.set(event.pointerId, key);
      keys.setPointerCapture(event.pointerId);
      play(key);
    });
    button.addEventListener('click', event => { if (event.detail === 0) play(key); });
  });
  keys.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLButtonElement>('.music-key');
    if (!target) return;
    const key = Number(target.dataset.note);
    if (pointers.get(event.pointerId) !== key) { pointers.set(event.pointerId, key); play(key); }
  });
  const release = (event: PointerEvent) => pointers.delete(event.pointerId);
  keys.addEventListener('pointerup', release);
  keys.addEventListener('pointercancel', release);
  keys.addEventListener('lostpointercapture', release);
  const keyboard = (event: KeyboardEvent) => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || (event.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"], .experience-nav')) return;
    const key = KEYS.indexOf(event.key.toUpperCase() as typeof KEYS[number]);
    if (key >= 0) { event.preventDefault(); play(key); }
  };
  function pump(): void {
    if (!looping) return;
    while (origin + nextStep * STEP < engine.now + .12) {
      const step = nextStep % phrase.steps;
      const when = origin + nextStep * STEP;
      if (step % 16 === 0) engine.bed(when);
      const played = phrase.notes.filter(note => note.step === step);
      played.forEach(note => engine.play(note.key, when, note.velocity));
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        if (!looping) return;
        pattern(step, true);
        played.forEach(note => flash(note.key));
      }, Math.max(0, (when - engine.now) * 1000));
      timers.add(timer);
      nextStep++;
    }
  }
  loopButton.addEventListener('click', () => {
    if (looping) { stopLoop(); return; }
    if (!notes.length) return;
    generation++;
    engine.stop();
    looping = true;
    loopButton.setAttribute('aria-pressed', 'true');
    loopButton.setAttribute('aria-label', 'Stop melody loop');
    const token = generation;
    void engine.ready().then(() => {
      if (!looping || disposed || token !== generation) return;
      phrase = arrange(notes);
      origin = engine.now + .035;
      nextStep = 0;
      pump();
      transport = window.setInterval(pump, 25);
    }).catch(() => { stopLoop(); status.textContent = 'Audio is unavailable in this browser.'; });
  });
  muteButton.addEventListener('click', () => {
    muted = !muted;
    engine.setMuted(muted);
    muteButton.setAttribute('aria-pressed', String(muted));
    muteButton.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
  });
  resetButton.addEventListener('click', () => {
    stopLoop(); notes = []; phrase = arrange(notes); recent = ''; success = false;
    clearTimeout(birthdayTimer);
    birthday.hidden = true;
    screen.classList.remove('has-birthday');
    loopButton.disabled = saveButton.disabled = resetButton.disabled = true;
    status.textContent = '';
    display.clear(); pattern();
  });
  saveButton.addEventListener('click', async () => {
    if (!notes.length) return;
    saveButton.disabled = true;
    saveButton.setAttribute('aria-busy', 'true');
    const captured = arrange(notes);
    try {
      const blob = await renderMelody(captured, dial.current);
      if (disposed) return;
      if (exportUrl) URL.revokeObjectURL(exportUrl);
      exportUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = exportUrl; link.download = 'hikaru-pentatonic.wav';
      document.body.append(link); link.click(); link.remove();
    } catch { status.textContent = 'Could not save. Please try again.'; }
    finally { saveButton.disabled = !notes.length; saveButton.removeAttribute('aria-busy'); }
  });
  const pause = () => { stopLoop(); display.pause(); void engine.pause(); };
  const visibility = () => { if (document.hidden) pause(); else display.resume(); };
  const pageShow = () => display.resume();
  document.addEventListener('keydown', keyboard);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', pause);
  window.addEventListener('pageshow', pageShow);
  pattern();
  return () => {
    disposed = true; pause(); display.destroy();
    clearTimeout(birthdayTimer); keyTimers.forEach(timer => clearTimeout(timer));
    document.removeEventListener('keydown', keyboard);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('pagehide', pause); window.removeEventListener('pageshow', pageShow);
    if (exportUrl) URL.revokeObjectURL(exportUrl);
    void engine.dispose();
  };
}
