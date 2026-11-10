export class MusicDisplay {
  private context: CanvasRenderingContext2D;
  private observer: ResizeObserver;
  private energies = Array.from({ length: 6 }, () => 0);
  private frame = 0;
  private previous = 0;
  private phase = 0;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)');
  constructor(private canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d')!;
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(canvas);
    this.reduced.addEventListener('change', this.resize);
    this.resume();
  }
  pulse(key: number): void { this.energies[key] = 1; this.draw(); }
  private resize = (): void => {
    const box = this.canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(box.width * ratio);
    this.canvas.height = Math.round(box.height * ratio);
    this.draw();
  };
  private draw(): void {
    const { width, height } = this.canvas;
    const c = this.context;
    c.clearRect(0, 0, width, height);
    c.strokeStyle = '#3b4c30';
    c.lineWidth = Math.max(1.8, width / 340);
    c.beginPath();
    const energy = Math.min(1, this.energies.reduce((a, b) => a + b, 0));
    for (let x = 0; x <= width; x += 2) {
      const t = x / width;
      let wave = Math.sin(t * Math.PI * 6 + this.phase) * (.12 + energy * .2);
      for (let key = 0; key < 6; key++) wave += this.energies[key] * .07 * Math.sin(t * Math.PI * (5 + key * 1.5) - this.phase * (key * .1 + 1));
      wave *= .65 + .35 * Math.sin(t * Math.PI);
      const y = height * .5 + wave * height * .7;
      if (x === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.stroke();
  }
  private animate = (now: number): void => {
    const delta = Math.min((now - this.previous) / 1000 || 0, .05);
    this.previous = now;
    this.energies = this.energies.map(value => value * Math.exp(-delta * 2.5));
    if (!this.reduced.matches) { this.phase += delta * .75; this.draw(); }
    this.frame = requestAnimationFrame(this.animate);
  };
  clear(): void { this.energies.fill(0); this.draw(); }
  pause(): void { cancelAnimationFrame(this.frame); }
  resume(): void { this.pause(); this.previous = performance.now(); this.frame = requestAnimationFrame(this.animate); }
  destroy(): void { this.pause(); this.observer.disconnect(); this.reduced.removeEventListener('change', this.resize); }
}
