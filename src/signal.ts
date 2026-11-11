export class SignalDisplay {
  private context: CanvasRenderingContext2D;
  private frame = 0;
  private data = new Uint8Array(512);
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  private resizeObserver: ResizeObserver;
  private last = 0;

  constructor(private canvas: HTMLCanvasElement, private sample: (target: Uint8Array<ArrayBuffer>) => void) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    this.context = context;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.resize(); this.frame = requestAnimationFrame(this.animate);
  }
  snapshot(): number[] {
    this.sample(this.data);
    const samples = Array.from({length:64}, (_,i) => (this.data[i*8]-128)/128);
    const peak = Math.max(.02,...samples.map(Math.abs));
    return samples.map(value => value / peak * .9);
  }
  private resize(): void {
    const {width,height} = this.canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1,2);
    this.canvas.width = Math.round(width*ratio); this.canvas.height = Math.round(height*ratio);
    this.draw();
  }
  private draw(): void {
    this.sample(this.data);
    const {width,height} = this.canvas; const ctx = this.context;
    ctx.clearRect(0,0,width,height);
    ctx.strokeStyle = '#364332'; ctx.lineWidth = Math.max(1.2,width/330);
    ctx.beginPath();
    for (let i=0;i<this.data.length;i++) {
      const x = i/(this.data.length-1)*width;
      const amplitude = Math.max(-.44,Math.min(.44,(this.data[i]-128)/128*4));
      const y = height*(.5+amplitude);
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
  }
  private animate = (time: number): void => {
    if (time-this.last > (this.reduced.matches ? 250 : 30)) { this.draw(); this.last=time; }
    this.frame=requestAnimationFrame(this.animate);
  };
  private onVisibility = (): void => {
    cancelAnimationFrame(this.frame);
    if (!document.hidden) this.frame=requestAnimationFrame(this.animate);
  };
  destroy(): void {
    cancelAnimationFrame(this.frame); this.resizeObserver.disconnect();
    document.removeEventListener('visibilitychange',this.onVisibility);
  }
}
