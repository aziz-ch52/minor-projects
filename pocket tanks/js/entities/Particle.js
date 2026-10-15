const FIRE = ['#fff3a0', '#ffd54a', '#ff9a2e', '#ff5a3c'];
const rnd = (a, b) => a + Math.random() * (b - a);

class Particle {
  constructor(o) {
    Object.assign(this, { gravity: 0.05, drag: 0.95, size: 3, color: '#fff', ...o });
    this.maxLife = this.life;
  }
  update() {
    this.vx *= this.drag;
    this.vy = this.vy * this.drag + this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
  }
  draw(ctx) {
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class ParticleSystem {
  constructor(max = 700) { this.list = []; this.max = max; }

  emit(o) { if (this.list.length < this.max) this.list.push(new Particle(o)); }

  explosion(x, y, r) {
    for (let i = 0; i < r * 1.2; i++) {
      const a = rnd(0, Math.PI * 2), s = rnd(0.5, r * 0.12);
      this.emit({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.5, life: rnd(20, 45), size: rnd(2, 6), color: FIRE[(Math.random() * 4) | 0] });
    }
    for (let i = 0; i < r * 0.4; i++) {
      this.emit({ x, y, vx: rnd(-1.5, 1.5), vy: rnd(-2, -0.3), life: rnd(40, 70), size: rnd(4, 9), color: '#555', gravity: -0.02, drag: 0.97 });
    }
  }

  dust(x, y, r) {
    for (let i = 0; i < r; i++) {
      this.emit({ x: x + rnd(-r, r), y: y + rnd(-r / 2, r / 2), vx: rnd(-1, 1), vy: rnd(-1.5, 0), life: rnd(25, 50), size: rnd(2, 5), color: '#b08a5c' });
    }
  }

  puff(x, y) {
    for (let i = 0; i < 10; i++) this.emit({ x, y, vx: rnd(-1, 1), vy: rnd(-1, 1), life: 20, size: 3, color: '#ddd', gravity: 0 });
  }

  update() {
    this.list.forEach((p) => p.update());
    this.list = this.list.filter((p) => p.life > 0);
  }

  draw(ctx) {
    this.list.forEach((p) => p.draw(ctx));
    ctx.globalAlpha = 1;
  }

  clear() { this.list.length = 0; }
}
