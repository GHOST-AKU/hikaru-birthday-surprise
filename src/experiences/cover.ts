import './cover.css';

type Point = { x: number; y: number };
type Pull = { from: Point; to: Point; radius: number };
const WIDTH = 600;
const HEIGHT = 840;

export function mountCover(root: HTMLElement): () => void {
  root.innerHTML = `<section class="cover-experience" aria-label="Hikaru birthday cover">
    <div class="cover-workspace">
      <div class="cover-poster">
        <canvas class="cover-canvas" width="1200" height="1680" tabindex="0" role="img" aria-label="Interactive birthday cover. Drag to shape the lines. Use arrow keys to sculpt, Enter to regenerate."></canvas>
        <h1 class="cover-title" aria-label="Hikaru"><span>HI</span><span>KARU</span></h1>
        <p class="cover-caption">HAPPY BIRTHDAY</p>
        <span class="cover-cursor" aria-hidden="true"></span>
      </div>
      <div class="cover-tools">
        <div class="cover-presets" role="group" aria-label="Composition">
          ${[1, 2, 3].map((item) => `<button type="button" class="cover-preset" data-preset="${item - 1}" aria-label="Composition ${item}" aria-pressed="${item === 1}"><span></span></button>`).join('')}
        </div>
        <button type="button" class="cover-tool cover-shuffle" aria-label="Regenerate cover"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 7h3c5 0 7 10 12 10h3m-4-4 4 4-4 4M3 17h3c2 0 4-3 5-5m2-3c1-1 3-2 5-2h3m-4-4 4 4-4 4"/></svg></button>
        <button type="button" class="cover-tool cover-save" aria-label="Save cover as PNG"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></svg></button>
      </div>
      <div class="cover-status" role="status" aria-live="polite"></div>
    </div>
  </section>`;

  const canvas = root.querySelector<HTMLCanvasElement>('.cover-canvas')!;
  const context = canvas.getContext('2d')!;
  const poster = root.querySelector<HTMLElement>('.cover-poster')!;
  const cursor = root.querySelector<HTMLElement>('.cover-cursor')!;
  const status = root.querySelector<HTMLElement>('.cover-status')!;
  const save = root.querySelector<HTMLButtonElement>('.cover-save')!;
  const presets = Array.from(root.querySelectorAll<HTMLButtonElement>('.cover-preset'));
  let preset = 0;
  let seed = 0;
  let pulls: Pull[] = [];
  let active: Pull | null = null;
  let pointerId: number | null = null;
  let frame = 0;
  let revision = 0;
  let disposed = false;

  function point(event: PointerEvent): Point {
    const bounds = canvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) / bounds.width * WIDTH, y: (event.clientY - bounds.top) / bounds.height * HEIGHT };
  }

  function transform(point: Point): Point {
    const result = { ...point };
    for (const pull of pulls) {
      const distance = ((result.x - pull.from.x) ** 2 + (result.y - pull.from.y) ** 2) / pull.radius ** 2;
      const weight = Math.exp(-distance * 1.6);
      result.x += (pull.to.x - pull.from.x) * weight * .78;
      result.y += (pull.to.y - pull.from.y) * weight * .78;
    }
    return result;
  }

  function draw(target: CanvasRenderingContext2D, width: number, height: number, type = false): void {
    target.setTransform(width / WIDTH, 0, 0, height / HEIGHT, 0, 0);
    target.clearRect(0, 0, WIDTH, HEIGHT);
    target.fillStyle = '#f8f5ed';
    target.fillRect(0, 0, WIDTH, HEIGHT);
    const centers = [{ x: 300, y: 435 }, { x: 315, y: 439 }, { x: 280, y: 425 }];
    const center = centers[preset];
    const rotation = [0, .65, -.42][preset] + seed * .16;
    const loops = 43;
    target.strokeStyle = '#42463c';
    target.lineWidth = .53;

    for (let ring = 0; ring < loops; ring++) {
      const t = ring / (loops - 1);
      target.beginPath();
      for (let step = 0; step <= 400; step++) {
        const theta = step / 400 * Math.PI * 2;
        const harmonic = Math.cos(theta * (preset === 2 ? 3 : 4) + rotation) * (33 + t * 19)
          + Math.sin(theta * 3 - .9 + rotation) * 30
          + Math.cos(theta * 2 + .5) * 25;
        const lobe = harmonic * Math.sin(t * Math.PI * .64) + Math.sin(theta * 5 + rotation) * t * 9;
        const radius = 121 + t * 162 + lobe;
        const x = center.x + Math.cos(theta) * radius * (1 + t * .08);
        const y = center.y + Math.sin(theta) * radius * (1.04 + t * .16);
        const finalPoint = transform({ x, y });
        if (step === 0) target.moveTo(finalPoint.x, finalPoint.y);
        else target.lineTo(finalPoint.x, finalPoint.y);
      }
      target.closePath();
      target.stroke();
    }

    if (type) {
      target.fillStyle = '#0c0d0b';
      target.font = '900 146px Arial, sans-serif';
      target.textBaseline = 'alphabetic';
      target.letterSpacing = '-8.4px';
      const metrics = target.measureText('HI');
      const baseline = 12 + (146 * .78 - metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / 2 + metrics.fontBoundingBoxAscent;
      target.fillText('HI', 20, baseline);
      target.save();
      target.translate(20, 0);
      target.scale(.92, 1);
      target.fillText('KARU', 0, baseline + 146 * .78 + 3.3);
      target.restore();
      target.font = '500 11px Arial, sans-serif';
      target.letterSpacing = '0px';
      const text = 'HAPPY BIRTHDAY';
      const spacing = 11;
      const total = target.measureText(text).width + (text.length - 1) * spacing;
      let x = (WIDTH - total) / 2;
      for (const character of text) {
        target.fillText(character, x, 821);
        x += target.measureText(character).width + spacing;
      }
    }
  }

  function render(): void {
    frame = 0;
    if (!disposed) draw(context, canvas.width, canvas.height);
  }

  function schedule(): void {
    if (!frame) frame = requestAnimationFrame(render);
  }

  function regenerate(nextPreset = preset, randomize = true): void {
    preset = nextPreset;
    seed = randomize ? Math.random() * Math.PI * 2 : 0;
    pulls = [];
    active = null;
    revision++;
    canvas.dataset.revision = String(revision);
    presets.forEach((button, index) => button.setAttribute('aria-pressed', String(index === preset)));
    schedule();
  }

  function down(event: PointerEvent): void {
    if (event.button !== 0 || pointerId !== null) return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    pointerId = event.pointerId;
    const start = point(event);
    active = { from: start, to: { ...start }, radius: 195 };
    if (pulls.length >= 10) pulls.shift();
    pulls.push(active);
    canvas.setPointerCapture(event.pointerId);
    poster.classList.add('is-sculpting');
  }

  function move(event: PointerEvent): void {
    const next = point(event);
    cursor.style.left = `${next.x / WIDTH * 100}%`;
    cursor.style.top = `${next.y / HEIGHT * 100}%`;
    if (event.pointerType === 'mouse') poster.classList.add('has-pointer');
    if (event.pointerId !== pointerId || !active) return;
    const dx = next.x - active.from.x;
    const dy = next.y - active.from.y;
    const distance = Math.hypot(dx, dy);
    const multiplier = distance > 200 ? 200 / distance : 1;
    active.to = { x: active.from.x + dx * multiplier, y: active.from.y + dy * multiplier };
    revision++;
    canvas.dataset.revision = String(revision);
    schedule();
  }

  function up(event: PointerEvent): void {
    if (event.pointerId !== pointerId) return;
    if (active && Math.hypot(active.to.x - active.from.x, active.to.y - active.from.y) < 5) {
      active.to.y -= 35;
      schedule();
    }
    pointerId = null;
    active = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    poster.classList.remove('is-sculpting');
  }

  function key(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      regenerate();
    } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      if (!pulls.length) pulls.push({ from: { x: 300, y: 435 }, to: { x: 300, y: 435 }, radius: 280 });
      const pull = pulls[pulls.length - 1];
      if (event.key === 'ArrowUp') pull.to.y -= 12;
      if (event.key === 'ArrowDown') pull.to.y += 12;
      if (event.key === 'ArrowLeft') pull.to.x -= 12;
      if (event.key === 'ArrowRight') pull.to.x += 12;
      revision++;
      canvas.dataset.revision = String(revision);
      schedule();
    }
  }

  async function download(): Promise<void> {
    save.disabled = true;
    try {
      const output = document.createElement('canvas');
      output.width = 1800;
      output.height = 2520;
      draw(output.getContext('2d')!, output.width, output.height, true);
      const blob = await new Promise<Blob>((resolve, reject) => output.toBlob(result => result ? resolve(result) : reject(new Error('Export failed')), 'image/png'));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'hikaru-birthday-cover.png';
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      status.textContent = 'Cover saved.';
    } catch {
      status.textContent = 'Could not save. Please try again.';
    } finally {
      save.disabled = false;
    }
  }

  presets.forEach((button, index) => button.addEventListener('click', () => regenerate(index, false)));
  root.querySelector('.cover-shuffle')!.addEventListener('click', () => regenerate());
  save.addEventListener('click', () => void download());
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', () => poster.classList.remove('has-pointer'));
  canvas.addEventListener('keydown', key);
  render();

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
  };
}
