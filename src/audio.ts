export class InstrumentAudio {
  private context?: AudioContext;
  private output?: GainNode;
  private enabled = false;
  private lastTick = 0;

  async toggle(mood: number): Promise<boolean> {
    this.enabled = !this.enabled;
    if (this.enabled) {
      try {
        this.context ??= new AudioContext();
        if (!this.output) {
          this.output = this.context.createGain();
          this.output.gain.value = 0.17;
          this.output.connect(this.context.destination);
        }
        await this.context.resume();
        this.preview(mood);
      } catch {
        this.enabled = false;
      }
    } else if (this.context) {
      await this.context.suspend();
    }
    return this.enabled;
  }

  tick(mood: number): void {
    if (!this.enabled || !this.context) return;
    if (this.context.currentTime - this.lastTick < 0.055) return;
    this.lastTick = this.context.currentTime;
    const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
    const semitone = scale[Math.min(scale.length - 1, Math.floor(mood * scale.length))];
    this.note(196 * 2 ** (semitone / 12), 0, 0.2, 0.32, mood);
  }

  preview(mood: number): void {
    [0, 7, 12, 16].forEach((semitone, index) => {
      this.note(196 * 2 ** (semitone / 12), index * (0.24 - mood * 0.1), 0.75, 0.25, mood);
    });
  }

  print(mood: number): void {
    if (!this.enabled || !this.context || !this.output) return;
    const context = this.context;
    const length = context.sampleRate * 1.6;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const pulse = Math.sin(i / context.sampleRate * 2 * Math.PI * 24) > 0 ? 1 : 0.12;
      data[i] = (Math.random() * 2 - 1) * 0.035 * pulse;
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1100;
    source.connect(filter);
    filter.connect(this.output);
    source.start();
    source.onended = () => { source.disconnect(); filter.disconnect(); };
    [0, 0, 2, 0, 5, 4].forEach((step, index) => {
      const offsets = [0, 0.24, 0.42, 0.8, 1.16, 1.55];
      this.note(261.63 * 2 ** (step / 12), 1.7 + offsets[index], index === 5 ? 0.9 : 0.3, 0.23, mood);
    });
  }

  tear(): void {
    this.note(92, 0, 0.08, 0.18, 0.9);
  }

  private note(frequency: number, delay: number, duration: number, volume: number, mood: number): void {
    if (!this.enabled || !this.context || !this.output || this.context.state !== 'running') return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    const now = this.context.currentTime + delay;
    oscillator.type = mood > 0.75 ? 'triangle' : 'sine';
    oscillator.frequency.value = frequency;
    filter.type = 'lowpass';
    filter.frequency.value = 800 + mood * 2400;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(this.output);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
    oscillator.onended = () => { oscillator.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  async pause(): Promise<void> {
    if (this.context?.state === 'running') await this.context.suspend();
  }

  async resume(): Promise<void> {
    if (this.enabled && this.context?.state === 'suspended') await this.context.resume();
  }
}
