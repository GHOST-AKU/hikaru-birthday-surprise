import './sound.css';

type Note = { key: number; time: number };
const letters = ['H', 'I', 'K', 'A', 'R', 'U'];
const frequencies = [196, 220, 261.6256, 293.6648, 329.6276, 392];
const colors = ['#ff845e', '#ffe17e', '#91c7a8', '#b99adc', '#ff845e', '#b8d6da'];

function synth(context: BaseAudioContext, destination: AudioNode, key: number, start: number): OscillatorNode[] {
  const voices: OscillatorNode[] = [];
  const duration = key === 3 ? 1.15 : key === 5 ? 1.5 : .72;
  const harmonic = key === 1 || key === 5;
  for (let layer = 0; layer < (harmonic ? 2 : 1); layer++) {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const filter = context.createBiquadFilter();
    oscillator.type = key === 2 || key === 4 ? 'triangle' : 'sine';
    oscillator.frequency.value = frequencies[key] * (layer ? 2 : 1);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100 + key * 220, start);
    filter.frequency.exponentialRampToValueAtTime(450, start + duration);
    const volume = layer ? .055 : .24;
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(volume, start + .008);
    envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(filter);
    filter.connect(envelope);
    envelope.connect(destination);
    oscillator.start(start);
    oscillator.stop(start + duration + .05);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); filter.disconnect(); };
    voices.push(oscillator);
  }
  return voices;
}

function encodeWav(buffer: AudioBuffer): Blob {
  const samples = buffer.getChannelData(0);
  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(bytes);
  const write = (offset: number, value: string) => [...value].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
  write(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) => {
    const value = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + index * 2, value < 0 ? value * 0x8000 : value * 0x7fff, true);
  });
  return new Blob([bytes], { type: 'audio/wav' });
}

export function mountSound(root: HTMLElement): () => void {
  root.innerHTML = `<section class="sound-instrument" aria-label="Hikaru music instrument">
    <div class="sound-visual"><canvas aria-hidden="true"></canvas><div class="sound-birthday" hidden>Happy birthday,<br>Hikaru.</div></div>
    <div class="sound-keys" role="group" aria-label="Musical keys">${letters.map((letter, index) => `<button class="sound-key" type="button" data-note="${index}" aria-label="Play ${letter}" aria-keyshortcuts="${letter}" style="--key-color:${colors[index]}">${letter}</button>`).join('')}</div>
    <div class="sound-controls">
      <button class="sound-control sound-loop" type="button" aria-label="Loop your melody" aria-pressed="false" disabled><svg viewBox="0 0 36 36" aria-hidden="true"><path d="M3 18A15 15 0 0 1 30.6 9.8M30.8 5v5.3h-5.4M33 18A15 15 0 0 1 5.4 26.2M5.2 31v-5.3h5.4"/><path class="sound-play" d="m15 12 9 6-9 6Z"/><path class="sound-stop" d="M14 14h8v8h-8Z"/></svg></button>
      <button class="sound-control sound-download" type="button" aria-label="Download melody as WAV" disabled><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15"/><path d="M18 10v12m-4-4 4 4 4-4M11 23v3h14v-3"/></svg></button>
      <button class="sound-control sound-reset" type="button" aria-label="Clear melody" disabled><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15"/><path d="M24 15a7 7 0 1 0 0 7M24 11v5h-5"/></svg></button>
    </div>
    <div class="sound-status" role="status" aria-live="polite"></div>
  </section>`;
  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
  const drawing = canvas.getContext('2d')!;
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('.sound-key')];
  const loopButton = root.querySelector<HTMLButtonElement>('.sound-loop')!;
  const downloadButton = root.querySelector<HTMLButtonElement>('.sound-download')!;
  const resetButton = root.querySelector<HTMLButtonElement>('.sound-reset')!;
  const birthday = root.querySelector<HTMLElement>('.sound-birthday')!;
  const status = root.querySelector<HTMLElement>('.sound-status')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const energies = Array.from({ length: 6 }, () => 0);
  const keyTimers: number[] = [];
  const loopTimers = new Set<number>();
  const voices = new Set<OscillatorNode>();
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let notes: Note[] = [];
  let recent = '';
  let looping = false;
  let disposed = false;
  let success = false;
  let frame = 0;
  let previous = 0;
  let position = 0;
  let birthdayTimer = 0;
  let exportUrl: string | null = null;

  const draw = () => {
    const width = canvas.width;
    const height = canvas.height;
    drawing.clearRect(0, 0, width, height);
    drawing.save();
    drawing.scale(width / 1000, height / 500);
    const drift = reduced.matches ? 0 : Math.sin(position * .3) * 2;
    drawing.strokeStyle = colors[0];
    drawing.lineWidth = 5.5 + energies[0] * 3;
    drawing.beginPath();
    drawing.ellipse(370, 242 + drift, 230 + energies[0] * 24, 230 - energies[0] * 8, 0, 0, Math.PI * 2);
    drawing.stroke();
    drawing.save();
    drawing.translate(760, 300 + drift * 1.2);
    drawing.scale(1 + energies[3] * .24, 1 - energies[3] * .08);
    drawing.fillStyle = colors[3];
    drawing.beginPath();
    drawing.arc(0, 0, 106, 0, Math.PI * 2);
    drawing.fill();
    drawing.restore();
    drawing.save();
    drawing.translate(535, 190);
    drawing.rotate(energies[2] * Math.PI * .45);
    const side = 46 + energies[2] * 14;
    drawing.fillStyle = colors[2];
    drawing.fillRect(-side / 2, -side / 2, side, side);
    drawing.restore();
    drawing.fillStyle = colors[4];
    drawing.beginPath();
    const capsuleWidth = 103 + energies[4] * 65;
    drawing.roundRect(421 - capsuleWidth / 2, 360 - energies[4] * 24, capsuleWidth, 28, 14);
    drawing.fill();
    drawing.strokeStyle = colors[1];
    drawing.lineWidth = 2.3;
    for (let index = 0; index < 3; index++) {
      const wave = energies[1] * Math.sin(position * 9 + index) * 45;
      drawing.beginPath();
      drawing.moveTo(4, 237 + index * 85);
      drawing.bezierCurveTo(330, -50 + index * 72 + wave, 630, 600 - index * 35 - wave, 996, 130 + index * 85);
      drawing.stroke();
    }
    if (energies[5] > .02) {
      drawing.strokeStyle = colors[5];
      drawing.lineWidth = 1.2;
      for (let index = 0; index < 3; index++) {
        drawing.globalAlpha = energies[5] * (.55 - index * .12);
        drawing.beginPath();
        drawing.arc(760, 300, 112 + (1 - energies[5]) * 100 + index * 25, 0, Math.PI * 2);
        drawing.stroke();
      }
    }
    drawing.restore();
  };

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(bounds.width * ratio);
    canvas.height = Math.round(bounds.height * ratio);
    draw();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  const animate = (time: number) => {
    const delta = Math.min((time - previous) / 1000 || 0, .05);
    previous = time;
    position += delta;
    energies.forEach((value, index) => { energies[index] = value * Math.exp(-delta * 3); });
    if (!reduced.matches) draw();
    frame = requestAnimationFrame(animate);
  };

  const visualNote = (key: number) => {
    energies[key] = 1;
    buttons[key].classList.add('is-down');
    clearTimeout(keyTimers[key]);
    keyTimers[key] = window.setTimeout(() => buttons[key].classList.remove('is-down'), 170);
    if (reduced.matches) draw();
  };

  const unlockAudio = async () => {
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = .7;
      master.connect(context.destination);
    }
    if (context.state === 'suspended') await context.resume();
    return context;
  };

  const soundNote = (key: number, when = 0) => {
    if (!context || !master || disposed) return;
    synth(context, master, key, context.currentTime + when).forEach(oscillator => {
      voices.add(oscillator);
      oscillator.addEventListener('ended', () => voices.delete(oscillator));
    });
  };

  const stopLoop = () => {
    looping = false;
    loopTimers.forEach(timer => clearTimeout(timer));
    loopTimers.clear();
    voices.forEach(voice => { try { voice.stop(); } catch { /* already ended */ } });
    voices.clear();
    loopButton.setAttribute('aria-pressed', 'false');
    loopButton.setAttribute('aria-label', 'Loop your melody');
  };

  const playKey = (key: number) => {
    if (disposed) return;
    if (looping) stopLoop();
    visualNote(key);
    const now = performance.now();
    notes = notes.filter(note => now - note.time <= 30_000).slice(-63);
    notes.push({ key, time: now });
    loopButton.disabled = downloadButton.disabled = resetButton.disabled = false;
    recent = (recent + letters[key]).slice(-6);
    if (recent === 'HIKARU' && !success) {
      success = true;
      birthdayTimer = window.setTimeout(() => {
        birthday.hidden = false;
        requestAnimationFrame(() => birthday.classList.add('is-revealed'));
        status.textContent = 'Happy birthday, Hikaru.';
      }, reduced.matches ? 0 : 350);
    }
    void unlockAudio().then(() => soundNote(key)).catch(() => { status.textContent = 'Audio is unavailable in this browser.'; });
  };

  buttons.forEach((button, index) => button.addEventListener('click', () => playKey(index)));

  const keyboard = (event: KeyboardEvent) => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || (event.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"], .experience-nav')) return;
    const key = letters.indexOf(event.key.toUpperCase());
    if (key < 0) return;
    event.preventDefault();
    playKey(key);
  };

  const schedule = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => { loopTimers.delete(timer); callback(); }, delay);
    loopTimers.add(timer);
  };

  const loop = () => {
    if (!looping || !notes.length || document.hidden) return;
    const captured = notes.map(note => ({ ...note }));
    const first = captured[0].time;
    const duration = Math.max(900, captured[captured.length - 1].time - first + 800);
    captured.forEach(note => {
      const delay = note.time - first;
      soundNote(note.key, delay / 1000);
      schedule(() => visualNote(note.key), delay);
    });
    schedule(loop, duration);
  };

  loopButton.addEventListener('click', () => {
    if (looping) { stopLoop(); return; }
    if (!notes.length) return;
    looping = true;
    loopButton.setAttribute('aria-pressed', 'true');
    loopButton.setAttribute('aria-label', 'Stop melody loop');
    void unlockAudio().then(() => { if (looping) loop(); }).catch(() => { stopLoop(); status.textContent = 'Audio is unavailable in this browser.'; });
  });

  resetButton.addEventListener('click', () => {
    stopLoop();
    notes = [];
    recent = '';
    success = false;
    clearTimeout(birthdayTimer);
    birthday.hidden = true;
    birthday.classList.remove('is-revealed');
    status.textContent = '';
    loopButton.disabled = downloadButton.disabled = resetButton.disabled = true;
    energies.fill(0);
    draw();
  });

  downloadButton.addEventListener('click', async () => {
    if (!notes.length) return;
    downloadButton.disabled = true;
    downloadButton.setAttribute('aria-busy', 'true');
    const captured = notes.map(note => ({ ...note }));
    try {
      const first = captured[0].time;
      const duration = (captured[captured.length - 1].time - first) / 1000 + 1.6;
      const offline = new OfflineAudioContext(1, Math.ceil(44100 * duration), 44100);
      const gain = offline.createGain();
      gain.gain.value = .7;
      gain.connect(offline.destination);
      captured.forEach(note => synth(offline, gain, note.key, (note.time - first) / 1000));
      const rendered = await offline.startRendering();
      if (disposed) return;
      if (exportUrl) URL.revokeObjectURL(exportUrl);
      exportUrl = URL.createObjectURL(encodeWav(rendered));
      const link = document.createElement('a');
      link.href = exportUrl;
      link.download = 'hikaru.wav';
      document.body.append(link);
      link.click();
      link.remove();
    } catch {
      status.textContent = 'Could not save the melody. Please try again.';
    } finally {
      downloadButton.disabled = !notes.length;
      downloadButton.removeAttribute('aria-busy');
    }
  });

  const pause = () => {
    stopLoop();
    cancelAnimationFrame(frame);
    void context?.suspend();
  };
  const visibility = () => {
    if (document.hidden) pause();
    else { previous = performance.now(); frame = requestAnimationFrame(animate); }
  };
  const motion = () => draw();
  document.addEventListener('keydown', keyboard);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', pause);
  reduced.addEventListener('change', motion);
  resize();
  frame = requestAnimationFrame(animate);

  return () => {
    disposed = true;
    pause();
    clearTimeout(birthdayTimer);
    keyTimers.forEach(timer => clearTimeout(timer));
    observer.disconnect();
    document.removeEventListener('keydown', keyboard);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('pagehide', pause);
    reduced.removeEventListener('change', motion);
    if (exportUrl) URL.revokeObjectURL(exportUrl);
    void context?.close();
    root.replaceChildren();
  };
}
