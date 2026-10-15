/** Destructible terrain stored as a 1D heightmap (value = surface Y, larger = lower). */
export class Terrain {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.heights = new Float32Array(width);
    this.layer = document.createElement('canvas');
    this.layer.width = width;
    this.layer.height = height;
    this.lctx = this.layer.getContext('2d');
    this.dirty = true;
  }

  generate() {
    const ph = [0, 1, 2].map(() => Math.random() * Math.PI * 2);
    for (let x = 0; x < this.width; x++) {
      const t = (x / this.width) * Math.PI * 2;
      this.heights[x] = this.height * 0.65 + Math.sin(t + ph[0]) * 45 + Math.sin(t * 2.7 + ph[1]) * 28 + Math.sin(t * 6 + ph[2]) * 9;
    }
    this.dirty = true;
  }

  heightAt(x) {
    return this.heights[Math.max(0, Math.min(this.width - 1, Math.floor(x)))];
  }

  isSolid(x, y) {
    return y >= this.heightAt(x);
  }

  /** Remove a circular crater; columns whose surface is above the blast collapse by the removed chord. */
  carveExplosion(cx, cy, r) {
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(this.width - 1, Math.ceil(cx + r));
    for (let x = x0; x <= x1; x++) {
      const h = Math.sqrt(Math.max(0, r * r - (x - cx) ** 2));
      if (h === 0) continue;
      const top = cy - h, bottom = cy + h, s = this.heights[x];
      if (s >= bottom) continue;                       // blast is in open air above ground
      this.heights[x] = Math.min(this.height, s >= top ? bottom : s + 2 * h);
    }
    this.dirty = true;
  }

  /** Add a circular mound of dirt (Bunker Builder). */
  addMound(cx, cy, r) {
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(this.width - 1, Math.ceil(cx + r));
    for (let x = x0; x <= x1; x++) {
      const h = Math.sqrt(Math.max(0, r * r - (x - cx) ** 2));
      if (h === 0) continue;
      this.heights[x] = Math.max(0, Math.min(this.heights[x], cy - h));
    }
    this.dirty = true;
  }

  draw(ctx) {
    if (this.dirty) {
      const c = this.lctx;
      c.clearRect(0, 0, this.width, this.height);
      const g = c.createLinearGradient(0, this.height * 0.4, 0, this.height);
      g.addColorStop(0, '#8a5d36');
      g.addColorStop(1, '#2f1e10');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(0, this.height);
      for (let x = 0; x < this.width; x++) c.lineTo(x, this.heights[x]);
      c.lineTo(this.width, this.height);
      c.fill();
      c.strokeStyle = '#4caf50';
      c.lineWidth = 4;
      c.beginPath();
      for (let x = 0; x < this.width; x++) x ? c.lineTo(x, this.heights[x]) : c.moveTo(x, this.heights[x]);
      c.stroke();
      this.dirty = false;
    }
    ctx.drawImage(this.layer, 0, 0);
  }
}
