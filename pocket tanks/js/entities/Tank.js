export class Tank {
  constructor({ index, x, color, angle }) {
    this.index = index;
    this.x = x;
    this.y = 0;
    this.color = color;
    this.angle = angle;      // 0 = right, 90 = up, 180 = left
    this.power = 50;
    this.weaponKey = 'standard';
    this.hp = 100;
    this.alive = true;
    this.vy = 0;
    this.grounded = false;
    this.tilt = 0;
  }

  groundY(t) { return Math.min(t.heightAt(this.x - 12), t.heightAt(this.x), t.heightAt(this.x + 12)); }

  snapTo(t) { this.y = this.groundY(t); this.vy = 0; this.grounded = true; }

  /** Gravity-driven settle: tanks fall smoothly when terrain is carved away beneath them. */
  update(t) {
    const g = this.groundY(t);
    this.tilt = Math.atan2(t.heightAt(this.x + 14) - t.heightAt(this.x - 14), 28);
    if (this.y < g - 0.01) {
      this.vy = Math.min(this.vy + 0.25, 7);
      this.y = Math.min(g, this.y + this.vy);
      this.grounded = this.y >= g - 0.01;
    } else {
      this.y = g; // also lifts the tank if terrain was added around it
      this.vy = 0;
      this.grounded = true;
    }
  }

  adjust(dAngle, dPower) {
    this.angle = Math.max(0, Math.min(180, this.angle + dAngle));
    this.power = Math.max(5, Math.min(100, this.power + dPower));
  }

  muzzle() {
    const a = (this.angle * Math.PI) / 180;
    return { x: this.x + Math.cos(a) * 22, y: this.y - 14 - Math.sin(a) * 22 };
  }

  contains(px, py) { return Math.abs(px - this.x) <= 18 && py >= this.y - 22 && py <= this.y + 2; }

  takeDamage(d) {
    this.hp = Math.max(0, this.hp - d);
    if (this.hp === 0) this.alive = false;
  }

  draw(ctx, active, time) {
    if (!this.alive) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.tilt);
    ctx.fillStyle = '#1b1b1b';
    ctx.fillRect(-18, -8, 36, 8);                       // tracks
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.roundRect(-14, -16, 28, 10, 4);                 // hull
    ctx.fill();
    ctx.restore();

    const a = (this.angle * Math.PI) / 180, px = this.x, py = this.y - 13;
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(a) * 22, py - Math.sin(a) * 22);
    ctx.stroke();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0008';
    ctx.fillRect(this.x - 18, this.y - 34, 36, 4);
    ctx.fillStyle = this.hp > 40 ? '#4cd964' : '#ff5a3c';
    ctx.fillRect(this.x - 18, this.y - 34, 36 * (this.hp / 100), 4);

    if (active) {
      const b = Math.sin(time / 8) * 3;
      ctx.fillStyle = '#ffd54a';
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - 42 + b);
      ctx.lineTo(this.x - 6, this.y - 52 + b);
      ctx.lineTo(this.x + 6, this.y - 52 + b);
      ctx.fill();
    }
  }
}
