export class Dial {
  private value = 64;
  private pointerId: number | null = null;
  private startY = 0;
  private startX = 0;
  private startValue = 64;

  constructor(private element: HTMLElement, private onChange: (value: number) => void) {
    element.addEventListener('pointerdown', this.down);
    element.addEventListener('pointermove', this.move);
    element.addEventListener('pointerup', this.up);
    element.addEventListener('pointercancel', this.cancel);
    element.addEventListener('lostpointercapture', this.cancel);
    element.addEventListener('keydown', this.key);
    this.set(64);
  }

  get current(): number { return this.value / 100; }

  private set(value: number): void {
    this.value = Math.max(0, Math.min(100, Math.round(value)));
    this.element.style.setProperty('--angle', `${-125 + this.value * 2.5}deg`);
    this.element.setAttribute('aria-valuenow', String(this.value));
    this.element.setAttribute('aria-valuetext', `${100 - this.value}% comfy, ${this.value}% chaos`);
    this.onChange(this.value / 100);
  }

  private down = (event: PointerEvent): void => {
    if (event.button !== 0 || this.pointerId !== null) return;
    event.preventDefault();
    this.element.focus({ preventScroll: true });
    this.pointerId = event.pointerId;
    this.startY = event.clientY;
    this.startX = event.clientX;
    this.startValue = this.value;
    this.element.setPointerCapture(event.pointerId);
    this.element.classList.add('is-turning');
  };

  private move = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    const distance = (this.startY - event.clientY) + (event.clientX - this.startX) * 0.65;
    const sensitivity = 130 / this.element.getBoundingClientRect().width;
    this.set(this.startValue + distance * sensitivity);
  };

  private up = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    const distance = Math.hypot(event.clientX - this.startX, event.clientY - this.startY);
    if (distance < 4) {
      const rect = this.element.getBoundingClientRect();
      const angle = Math.atan2(event.clientX - rect.left - rect.width / 2, -(event.clientY - rect.top - rect.height / 2)) * 180 / Math.PI;
      this.set((Math.max(-125, Math.min(125, angle)) + 125) / 2.5);
    }
    this.element.releasePointerCapture(event.pointerId);
    this.cancel();
  };

  private cancel = (): void => {
    this.pointerId = null;
    this.element.classList.remove('is-turning');
  };

  private key = (event: KeyboardEvent): void => {
    const changes: Record<string, number> = { ArrowUp: 2, ArrowRight: 2, ArrowDown: -2, ArrowLeft: -2, PageUp: 10, PageDown: -10 };
    if (event.key in changes) {
      event.preventDefault();
      this.set(this.value + changes[event.key]);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      this.set(event.key === 'Home' ? 0 : 100);
    }
  };
}
