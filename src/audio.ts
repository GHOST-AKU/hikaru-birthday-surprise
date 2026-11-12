import { channels, reception, type Channel, type Language } from './radio/channels';
import { renderMusic, renderNews } from './radio/synthesis';
import { assetPath } from './assets';

export class InstrumentAudio {
  private context?: AudioContext;
  private output?: GainNode;
  private tuningGain?: GainNode;
  private lowpass?: BiquadFilterNode;
  private highpass?: BiquadFilterNode;
  private noiseGain?: GainNode;
  private analyser?: AnalyserNode;
  private source?: AudioBufferSourceNode;
  private sourceGain?: GainNode;
  private buffers = new Map<string, Promise<AudioBuffer>>();
  private position = .08;
  private volume = .42;
  private language: Language = 'en';
  private selected = '';
  private generation = 0;
  private started = 0;
  private duration = 1;
  private enabled = false;
  private suspendedByPage = false;
  private noise?: AudioBuffer;

  constructor(private onError: () => void) {}

  async activate(): Promise<void> {
    try {
      if (!this.context) this.initialize();
      this.enabled = true;
      await this.context!.resume();
      await this.select();
    } catch { this.onError(); }
  }

  private initialize(): void {
    const context = this.context = new AudioContext();
    this.output = context.createGain();
    this.output.gain.value = this.volume ** 1.7 * .9;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -12; compressor.ratio.value = 4;
    this.analyser = context.createAnalyser(); this.analyser.fftSize = 512;
    this.output.connect(compressor).connect(this.analyser).connect(context.destination);
    this.tuningGain = context.createGain();
    this.lowpass = context.createBiquadFilter(); this.lowpass.type = 'lowpass';
    this.highpass = context.createBiquadFilter(); this.highpass.type = 'highpass';
    this.highpass.connect(this.lowpass).connect(this.tuningGain).connect(this.output);
    this.noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const data = this.noise.getChannelData(0);
    let previous = 0;
    for (let i = 0; i < data.length; i++) {
      previous = previous * .55 + (Math.random() * 2 - 1) * .45;
      data[i] = previous;
    }
    const hiss = context.createBufferSource(); hiss.buffer = this.noise; hiss.loop = true;
    const band = context.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 1700; band.Q.value = .65;
    this.noiseGain = context.createGain(); this.noiseGain.gain.value = 0;
    hiss.connect(band).connect(this.noiseGain).connect(this.output); hiss.start();
    this.updateReception();
  }

  tune(position: number): void {
    this.position = position;
    this.updateReception();
    if (this.enabled) void this.select();
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.context && this.output) this.smooth(this.output.gain, this.volume ** 1.7 * .9);
  }

  setLanguage(language: Language): void {
    this.language = language;
    if (this.enabled) void this.select();
  }

  private smooth(parameter: AudioParam, target: number, time = .07): void {
    const now = this.context!.currentTime;
    if (typeof parameter.cancelAndHoldAtTime === 'function') parameter.cancelAndHoldAtTime(now);
    else { const value = parameter.value; parameter.cancelScheduledValues(now); parameter.setValueAtTime(value, now); }
    parameter.setTargetAtTime(target, now, time);
  }

  private updateReception(): void {
    if (!this.context) return;
    const { strength } = reception(this.position);
    this.smooth(this.tuningGain!.gain, strength ** 1.3);
    this.smooth(this.lowpass!.frequency, 550 + strength ** 2 * 11000);
    this.smooth(this.highpass!.frequency, 35 + (1 - strength) * 850);
    this.smooth(this.noiseGain!.gain, (1 - strength) ** 1.5 * .16);
  }

  private buffer(channel: Channel): Promise<AudioBuffer> {
    const key = channel.id === 'news' ? `news-${this.language}` : channel.id;
    const existing = this.buffers.get(key);
    if (existing) return existing;
    const task = channel.id === 'news'
      ? fetch(assetPath(`radio/${key}.mp3`)).then(response => {
        if (!response.ok) throw new Error('Broadcast unavailable');
        return response.arrayBuffer();
      }).then(data => this.context!.decodeAudioData(data)).then(renderNews)
      : renderMusic(channel);
    this.buffers.set(key, task);
    void task.catch(() => this.buffers.delete(key));
    return task;
  }

  private async select(): Promise<void> {
    if (!this.context) return;
    const { channel } = reception(this.position);
    const key = channel.id === 'news' ? `news-${this.language}` : channel.id;
    if (key === this.selected) return;
    this.selected = key;
    const generation = ++this.generation;
    const oldSource = this.source;
    const oldGain = this.sourceGain;
    if (oldSource && oldGain) {
      this.smooth(oldGain.gain, 0, .045);
      oldSource.stop(this.context.currentTime + .28);
      this.source = undefined; this.sourceGain = undefined;
    }
    try {
      const buffer = await this.buffer(channel);
      if (generation !== this.generation) return;
      const source = this.context.createBufferSource(); source.buffer = buffer; source.loop = true;
      const gain = this.context.createGain(); gain.gain.value = 0;
      source.connect(gain).connect(this.highpass!);
      source.onended = () => { source.disconnect(); gain.disconnect(); };
      this.source = source; this.sourceGain = gain;
      this.started = this.context.currentTime; this.duration = buffer.duration;
      source.start(); this.smooth(gain.gain, 1, .05);
      if (channel.id === 'birthday') {
        channels.filter(item => item.id !== 'birthday').forEach(item => { void this.buffer(item).catch(() => {}); });
      }
    } catch {
      if (generation === this.generation) { this.selected = ''; this.onError(); }
    }
  }

  snapshot(): number {
    return this.source && this.context ? (this.context.currentTime - this.started) % this.duration : 0;
  }

  waveform(target: Uint8Array<ArrayBuffer>): void {
    if (this.analyser) this.analyser.getByteTimeDomainData(target);
    else target.fill(128);
  }

  print(): void { this.mechanical(1.65, .08, true); }
  tear(): void { this.mechanical(.16, .12, false); }

  private mechanical(duration: number, volume: number, pulse: boolean): void {
    if (!this.context || !this.output || !this.noise || this.context.state !== 'running') return;
    const source = this.context.createBufferSource(); source.buffer = this.noise;
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = pulse ? 1100 : 2100;
    const now = this.context.currentTime;
    gain.gain.setValueAtTime(0, now);
    for (let t = 0; t < duration; t += .04) gain.gain.setValueAtTime(volume * (pulse && Math.floor(t / .04) % 2 ? .12 : 1) * (1 - t / duration), now + t);
    gain.gain.linearRampToValueAtTime(0, now + duration);
    source.connect(filter).connect(gain).connect(this.output); source.start(); source.stop(now + duration);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  async pause(): Promise<void> {
    this.suspendedByPage = true;
    if (this.context?.state === 'running') await this.context.suspend();
  }
  async resume(): Promise<void> {
    if (this.enabled && this.suspendedByPage) {
      this.suspendedByPage = false;
      try { await this.context?.resume(); } catch { this.onError(); }
    }
  }
}
