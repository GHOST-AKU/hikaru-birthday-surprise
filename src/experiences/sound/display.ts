export const NOTE_COLORS = ['#ff845e', '#edca53', '#91c7a8', '#b99adc', '#ff845e', '#9bc7cc'] as const;

export class MusicDisplay {
  private context: CanvasRenderingContext2D;
  private observer: ResizeObserver;
  private energies = Array.from({ length: 6 }, () => 0);
  private frame = 0;
  private previous = 0;
  private phase = 0;
  private paused = false;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)');

  constructor(private canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d')!;
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(canvas);
    this.reduced.addEventListener('change', this.motion);
    this.resume();
  }

  pulse(key: number): void {
    this.energies[key] = 1;
    this.draw();
  }

  private resize = (): void => {
    const box = this.canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(box.width * ratio);
    this.canvas.height = Math.round(box.height * ratio);
    this.draw();
  };

  private draw(): void {
    const { width, height } = this.canvas;
    if (!width || !height) return;
    const c = this.context;
    const e = this.energies;
    const movement = this.reduced.matches ? 0 : 1;
    const drift = Math.sin(this.phase * .3) * 1.8 * movement;
    c.clearRect(0, 0, width, height);
    c.save();
    c.scale(width / 1000, height / 450);
    c.lineCap = 'round';
    c.strokeStyle = NOTE_COLORS[0];
    c.lineWidth = 4.8 + e[0] * 2.4;
    c.beginPath();
    c.ellipse(345, 225 + drift, 220 + e[0] * 10 * movement, 220 - e[0] * 7 * movement, 0, 0, Math.PI * 2);
    c.stroke();

    c.save();
    c.translate(735, 305 + drift * 1.2);
    c.scale(1 + e[3] * .2 * movement, 1 - e[3] * .09 * movement);
    c.fillStyle = NOTE_COLORS[3];
    c.beginPath();
    c.arc(0, 0, 113, 0, Math.PI * 2);
    c.fill();
    c.restore();

    c.save();
    c.translate(603, 145);
    c.rotate(e[2] * Math.PI * .45 * movement);
    const side = 38 + e[2] * 12 * movement;
    c.fillStyle = NOTE_COLORS[2];
    c.fillRect(-side / 2, -side / 2, side, side);
    c.restore();

    c.fillStyle = NOTE_COLORS[4];
    const capsule = 100 + e[4] * 46 * movement;
    c.beginPath();
    c.roundRect(355 - capsule / 2, 362 - e[4] * 18 * movement, capsule, 27, 13.5);
    c.fill();

    c.strokeStyle = NOTE_COLORS[1];
    c.lineWidth = 2.2 + e[1] * .7;
    for (let index = 0; index < 3; index++) {
      const wave = e[1] * Math.sin(this.phase * 9 + index) * 30 * movement;
      c.beginPath();
      c.moveTo(4, 278 + index * 70);
      c.bezierCurveTo(265, 35 + index * 60 + wave, 625, 570 - index * 12 - wave, 996, 100 + index * 90);
      c.stroke();
    }

    if (e[5] > .015) {
      c.strokeStyle = NOTE_COLORS[5];
      c.lineWidth = 1.6;
      for (let index = 0; index < 3; index++) {
        c.globalAlpha = e[5] * (.65 - index * .15);
        c.beginPath();
        c.arc(735, 305, 114 + ((1 - e[5]) * 10 + index * 10) * movement, 0, Math.PI * 2);
        c.stroke();
      }
    }
    c.restore();
  }

  private animate = (now: number): void => {
    const delta = Math.min((now - this.previous) / 1000 || 0, .05);
    this.previous = now;
    this.phase += delta;
    this.energies = this.energies.map(value => value * Math.exp(-delta * 3));
    this.draw();
    this.frame = requestAnimationFrame(this.animate);
  };

  private motion = (): void => {
    cancelAnimationFrame(this.frame);
    this.energies.fill(0);
    this.draw();
    if (!this.paused && !this.reduced.matches) {
      this.previous = performance.now();
      this.frame = requestAnimationFrame(this.animate);
    }
  };

  clear(): void { this.energies.fill(0); this.draw(); }
  pause(): void { this.paused = true; cancelAnimationFrame(this.frame); }
  resume(): void { this.paused = false; this.motion(); }
  destroy(): void { this.pause(); this.observer.disconnect(); this.reduced.removeEventListener('change', this.motion); }
}
