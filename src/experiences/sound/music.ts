export const KEYS = ['H', 'I', 'K', 'A', 'R', 'U'] as const;
export const MIDI = [62, 64, 66, 69, 71, 74] as const;
export const PITCH_NAMES = ['D4', 'E4', 'F♯4', 'A4', 'B4', 'D5'] as const;
export const BPM = 84;
export const STEP = 60 / BPM / 4;
export const BAR = STEP * 16;
const DEFAULT_TONE = .46;

export type Note = { key: number; time: number; velocity: number };
export type StepNote = { key: number; step: number; velocity: number };
export type Phrase = { notes: StepNote[]; steps: number; duration: number };
type Voice = { key: number; start: number; stop: (time: number) => void };
type Graph = { input: GainNode; output: GainNode; filter: BiquadFilterNode; reverb: GainNode };

export function arrange(notes: Note[]): Phrase {
  if (!notes.length) return { notes: [], steps: 16, duration: BAR };
  const first = notes[0].time;
  const cells = new Map<number, Map<number, StepNote>>();
  for (const note of notes) {
    const step = Math.max(0, Math.min(127, Math.round((note.time - first) / STEP)));
    if (!cells.has(step)) cells.set(step, new Map());
    cells.get(step)!.set(note.key, { key: note.key, step, velocity: note.velocity });
  }
  const arranged: StepNote[] = [];
  for (const cell of cells.values()) {
    const chord = [...cell.values()].sort((a, b) => a.key - b.key);
    const selected = chord.length > 3 ? [chord[0], chord[Math.floor(chord.length / 2)], chord[chord.length - 1]] : chord;
    const gain = 1 / Math.sqrt(selected.length);
    arranged.push(...selected.map(note => ({ ...note, velocity: note.velocity * gain })));
  }
  arranged.sort((a, b) => a.step - b.step || a.key - b.key);
  const steps = Math.min(128, Math.max(16, Math.ceil((arranged[arranged.length - 1].step + 2) / 16) * 16));
  return { notes: arranged, steps, duration: steps * STEP };
}

function impulse(context: BaseAudioContext): AudioBuffer {
  const length = Math.floor(context.sampleRate * 1.65);
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    let seed = 7919 + channel * 104729;
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      const noise = (seed >>> 0) / 2147483648 - 1;
      const time = i / context.sampleRate;
      data[i] = noise * Math.exp(-time * 5.5) * Math.min(1, time * 180);
    }
  }
  return buffer;
}

function createGraph(context: BaseAudioContext, destination: AudioNode, tone: number): Graph {
  const input = context.createGain();
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2000 + tone * 6000;
  filter.Q.value = .35;
  input.connect(filter);
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -19;
  compressor.knee.value = 18;
  compressor.ratio.value = 4;
  compressor.attack.value = .004;
  compressor.release.value = .2;
  filter.connect(compressor);
  const convolution = context.createConvolver();
  convolution.buffer = impulse(context);
  const reverb = context.createGain();
  reverb.gain.value = .22 - tone * .09;
  filter.connect(convolution);
  convolution.connect(reverb);
  reverb.connect(compressor);
  const delay = context.createDelay(1);
  delay.delayTime.value = STEP * 3;
  const feedback = context.createGain();
  feedback.gain.value = .16;
  const echoFilter = context.createBiquadFilter();
  echoFilter.type = 'lowpass';
  echoFilter.frequency.value = 1600;
  const echo = context.createGain();
  echo.gain.value = .12;
  filter.connect(delay);
  delay.connect(echoFilter);
  echoFilter.connect(feedback);
  feedback.connect(delay);
  echoFilter.connect(echo);
  echo.connect(compressor);
  const saturator = context.createWaveShaper();
  const curve = new Float32Array(2048);
  for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh((i * 2 / (curve.length - 1) - 1) * 1.2) / 1.2;
  saturator.curve = curve;
  saturator.oversample = '2x';
  const output = context.createGain();
  output.gain.value = .82;
  compressor.connect(saturator);
  saturator.connect(output);
  output.connect(destination);
  return { input, output, filter, reverb };
}

function strike(context: BaseAudioContext, destination: AudioNode, key: number, start: number, tone: number, velocity: number, ended?: () => void): Voice {
  const frequency = 440 * 2 ** ((MIDI[key] - 69) / 12);
  const duration = 1.75 - tone * .65;
  const bus = context.createGain();
  const pan = context.createStereoPanner();
  pan.pan.value = (key - 2.5) * .085;
  bus.connect(pan);
  pan.connect(destination);
  const oscillators: OscillatorNode[] = [];
  const envelopes: GainNode[] = [];
  const level = velocity * (.25 - key * .009);
  [1, 2, 3].forEach((harmonic, index) => {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency * harmonic;
    const amplitude = level * [1, .13 + tone * .12, .025 + tone * .055][index];
    const tail = duration / [1, 2.5, 5][index];
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(amplitude, start + .006);
    envelope.gain.exponentialRampToValueAtTime(Math.max(.0001, amplitude * .38), start + .14);
    envelope.gain.exponentialRampToValueAtTime(.0001, start + tail);
    oscillator.connect(envelope);
    envelope.connect(bus);
    oscillator.start(start);
    oscillator.stop(start + duration + .04);
    oscillators.push(oscillator);
    envelopes.push(envelope);
  });
  oscillators[0].onended = () => {
    oscillators.forEach(node => node.disconnect());
    envelopes.forEach(node => node.disconnect());
    bus.disconnect(); pan.disconnect(); ended?.();
  };
  return { key, start, stop(time) {
    const when = Math.max(context.currentTime, time);
    bus.gain.cancelScheduledValues(when);
    bus.gain.setValueAtTime(1, when);
    bus.gain.exponentialRampToValueAtTime(.0001, when + .045);
    oscillators.forEach(node => node.stop(when + .05));
  } };
}

function anchor(context: BaseAudioContext, destination: AudioNode, start: number, ended?: () => void): Voice {
  const bus = context.createGain();
  bus.connect(destination);
  const voices: OscillatorNode[] = [];
  [50, 57].forEach((midi, index) => {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(index ? .021 : .036, start + .12);
    envelope.gain.exponentialRampToValueAtTime(.0001, start + BAR * .95);
    oscillator.connect(envelope); envelope.connect(bus);
    oscillator.start(start); oscillator.stop(start + BAR);
    voices.push(oscillator);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); if (index === 1) { bus.disconnect(); ended?.(); } };
  });
  return { key: -1, start, stop(time) {
    const when = Math.max(context.currentTime, time);
    bus.gain.cancelScheduledValues(when);
    bus.gain.setValueAtTime(1, when);
    bus.gain.exponentialRampToValueAtTime(.0001, when + .045);
    voices.forEach(voice => voice.stop(when + .05));
  } };
}

export class MusicEngine {
  context: AudioContext | null = null;
  private graph: Graph | null = null;
  private voices = new Set<Voice>();
  private readonly tone = DEFAULT_TONE;
  private muted = false;
  private lastAnchor = -100;

  get now(): number { return this.context?.currentTime ?? 0; }

  async ready(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext({ latencyHint: 'interactive' });
      this.graph = createGraph(this.context, this.context.destination, this.tone);
      this.graph.output.gain.value = this.muted ? 0 : .82;
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }

  setMuted(value: boolean): void {
    this.muted = value;
    this.graph?.output.gain.setTargetAtTime(value ? 0 : .82, this.now, .025);
  }

  play(key: number, when: number, velocity = .8, live = false): void {
    if (!this.context || !this.graph) return;
    if (live) {
      for (const voice of this.voices) {
        if (voice.key === key || this.voices.size >= 6) {
          voice.stop(when); this.voices.delete(voice);
        }
      }
      if (when - this.lastAnchor > BAR) this.bed(when);
    }
    let voice: Voice;
    voice = strike(this.context, this.graph.input, key, when, this.tone, velocity, () => this.voices.delete(voice));
    this.voices.add(voice);
  }

  bed(when: number): void {
    if (!this.context || !this.graph) return;
    this.lastAnchor = when;
    let voice: Voice;
    voice = anchor(this.context, this.graph.input, when, () => this.voices.delete(voice));
    this.voices.add(voice);
  }

  stop(): void {
    for (const voice of this.voices) voice.stop(this.now);
    this.voices.clear();
    this.lastAnchor = -100;
  }

  async pause(): Promise<void> { this.stop(); await this.context?.suspend(); }
  async dispose(): Promise<void> { this.stop(); await this.context?.close(); }
}

export async function renderMelody(phrase: Phrase, tone = DEFAULT_TONE): Promise<Blob> {
  const context = new OfflineAudioContext(2, Math.ceil((phrase.duration + 2.5) * 44100), 44100);
  const graph = createGraph(context, context.destination, tone);
  for (let bar = 0; bar * BAR < phrase.duration; bar++) anchor(context, graph.input, bar * BAR);
  for (const note of phrase.notes) strike(context, graph.input, note.key, note.step * STEP, tone, note.velocity);
  const rendered = await context.startRendering();
  return wav(rendered);
}

function wav(buffer: AudioBuffer): Blob {
  const frames = buffer.length;
  const channels = buffer.numberOfChannels;
  const bytes = new ArrayBuffer(44 + frames * channels * 2);
  const view = new DataView(bytes);
  const text = (offset: number, value: string) => [...value].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, bytes.byteLength - 8, true); text(8, 'WAVE'); text(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, frames * channels * 2, true);
  const data = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(channel));
  for (let i = 0; i < frames; i++) for (let channel = 0; channel < channels; channel++) {
    const sample = Math.max(-1, Math.min(1, data[channel][i]));
    view.setInt16(44 + (i * channels + channel) * 2, sample < 0 ? sample * 32768 : sample * 32767, true);
  }
  return new Blob([bytes], { type: 'audio/wav' });
}
