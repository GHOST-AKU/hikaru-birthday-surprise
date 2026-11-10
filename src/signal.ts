export function sampleWave(x: number, mood: number, phase: number): number {
  const frequency = 2.25 + mood * 2.7;
  const base = Math.sin(x * Math.PI * frequency * 2 - phase);
  const harmony = Math.sin(x * Math.PI * (frequency * 1.8) * 2 + phase * 0.6);
  const detail = Math.sin(x * Math.PI * 23 + phase * 1.4);
  const envelope = 0.6 + Math.sin(x * Math.PI) * 0.4;
  return (base * 0.72 + harmony * (0.1 + mood * 0.2) + detail * mood ** 3 * 0.14) * envelope;
}

export function wavePath(mood: number, phase: number, width: number, height: number): string {
  const points: string[] = [];
  for (let x = 0; x <= width; x += 2) {
    const y = height / 2 + sampleWave(x / width, mood, phase) * height * 0.28;
    points.push(`${x === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return points.join(' ');
}

export class SignalDisplay {
  private context: CanvasRenderingContext2D;
  private frame = 0;
  private previous = 0;
  private currentMood = 0.64;
  private targetMood = 0.64;
  private phase = 0.8;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  private resizeObserver: ResizeObserver;

  constructor(private canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable');
    this.context = context;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.reduced.addEventListener('change', this.drawStatic);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.resize();
    this.frame = requestAnimationFrame(this.animate);
  }

  setMood(value: number): void {
    this.targetMood = value;
    if (this.reduced.matches) {
      this.currentMood = value;
      this.draw();
    }
  }

  snapshot(): number {
    return this.phase;
  }

  private resize(): void {
    const { width, height } = this.canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    this.draw();
  }

  private draw(): void {
    const { context, canvas } = this;
    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);
    context.beginPath();
    for (let x = 0; x <= width; x += 2) {
      const y = height * 0.5 + sampleWave(x / width, this.currentMood, this.phase) * height * 0.31;
      if (x === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = '#364332';
    context.lineWidth = Math.max(1.6, width / 260);
    context.lineJoin = 'round';
    context.stroke();
  }

  private drawStatic = (): void => this.draw();

  private animate = (time: number): void => {
    const delta = Math.min((time - this.previous) / 1000 || 0, 0.05);
    this.previous = time;
    if (!this.reduced.matches) {
      this.currentMood += (this.targetMood - this.currentMood) * 0.08;
      this.phase += delta * (0.28 + this.currentMood * 0.8);
      this.draw();
    }
    this.frame = requestAnimationFrame(this.animate);
  };

  private onVisibility = (): void => {
    cancelAnimationFrame(this.frame);
    if (!document.hidden) {
      this.previous = performance.now();
      this.frame = requestAnimationFrame(this.animate);
    }
  };

  destroy(): void {
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.reduced.removeEventListener('change', this.drawStatic);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }
}
