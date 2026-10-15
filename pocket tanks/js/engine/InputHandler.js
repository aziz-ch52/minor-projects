/** Captures keyboard + pointer input. Held keys are polled; discrete presses are dispatched. */
export class InputHandler {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();
    this.handlers = new Map();
    this.pointer = { down: false, x: 0, y: 0 };
    const block = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Tab']);

    addEventListener('keydown', (e) => {
      if (block.has(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.down.add(e.code);
      (this.handlers.get(e.code) || []).forEach((fn) => fn(e));
    });
    addEventListener('keyup', (e) => this.down.delete(e.code));
    addEventListener('blur', () => this.down.clear());

    canvas.addEventListener('pointerdown', (e) => { this.pointer.down = true; this.#move(e); canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', (e) => this.pointer.down && this.#move(e));
    canvas.addEventListener('pointerup', () => (this.pointer.down = false));
    canvas.addEventListener('pointercancel', () => (this.pointer.down = false));
  }

  #move(e) { // client coords -> logical canvas coords
    const r = this.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - r.left) / r.width) * this.canvas.width;
    this.pointer.y = ((e.clientY - r.top) / r.height) * this.canvas.height;
  }

  isDown(code) { return this.down.has(code); }

  onPress(codes, fn) {
    for (const c of [].concat(codes)) {
      if (!this.handlers.has(c)) this.handlers.set(c, []);
      this.handlers.get(c).push(fn);
    }
  }
}
