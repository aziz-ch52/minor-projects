/** Explicit vector physics: gravity, wind force, swept terrain/tank collision. */
export class Physics {
  constructor({ gravity = 0.15, windScale = 0.0025, maxStep = 2 } = {}) {
    this.gravity = gravity;
    this.windScale = windScale;
    this.maxStep = maxStep;
  }

  /** Advance one frame. Returns null, or {type:'terrain'|'tank'|'out', tank?}. */
  step(p, wind, terrain, tanks) {
    p.vx += wind * this.windScale * p.windFactor;
    p.vy += this.gravity;
    const n = Math.max(1, Math.ceil(Math.hypot(p.vx, p.vy) / this.maxStep)); // sub-steps stop tunnelling
    const sx = p.vx / n, sy = p.vy / n;
    for (let i = 0; i < n; i++) {
      p.x += sx;
      p.y += sy;
      if (p.x < 0 || p.x >= terrain.width || p.y >= terrain.height) return { type: 'out' };
      if (terrain.isSolid(p.x, p.y)) return { type: 'terrain' };
      for (const t of tanks) {
        if (t.alive && (t !== p.owner || p.age > 20) && t.contains(p.x, p.y)) return { type: 'tank', tank: t };
      }
    }
    return null;
  }

  /** Linear-falloff blast damage. Returns [{tank, damage}]. */
  static radialDamage(tanks, x, y, radius, maxDamage) {
    const out = [];
    for (const t of tanks) {
      if (!t.alive) continue;
      const reach = radius + 14;
      const d = Math.hypot(t.x - x, t.y - 10 - y);
      if (d < reach) out.push({ tank: t, damage: Math.round(maxDamage * (1 - d / reach)) });
    }
    return out;
  }
}
