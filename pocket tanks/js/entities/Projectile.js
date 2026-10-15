/** Projectile base class + weapon sub-behaviours + factory. */
export class Projectile {
  constructor({ x, y, vx, vy, owner, radius = 4, color = '#fff' }) {
    Object.assign(this, { x, y, vx, vy, owner, radius, color });
    this.windFactor = 1;
    this.age = 0;
    this.dead = false;
    this.trail = [];
  }

  update(world) {
    this.age++;
    const prevVy = this.vy;
    const hit = world.physics.step(this, world.game.wind, world.terrain, world.game.tanks);
    this.trail.push(this.x, this.y);
    if (this.trail.length > 24) this.trail.splice(0, 2);
    if (hit) {
      this.dead = true;
      if (hit.type !== 'out') this.onImpact(world, hit);
    } else {
      this.onMove(world, prevVy);
    }
  }

  onMove() {}
  onImpact() {}

  draw(ctx) {
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < this.trail.length; i += 2) i ? ctx.lineTo(this.trail[i], this.trail[i + 1]) : ctx.moveTo(this.trail[i], this.trail[i + 1]);
    ctx.stroke();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

class StandardShell extends Projectile {
  constructor(o) { super({ color: '#ffe066', ...o }); }
  onImpact(world) { world.explode(this.x, this.y, 34, 35, this.owner); }
}

class MirvBomblet extends Projectile {
  constructor(o) { super({ radius: 3, color: '#ff9a2e', ...o }); }
  onImpact(world) { world.explode(this.x, this.y, 24, 20, this.owner); }
}

class MirvSplitter extends Projectile {
  constructor(o) { super({ radius: 5, color: '#ff6ec7', ...o }); this.split = false; }

  onMove(world, prevVy) {
    if (!this.split && prevVy < 0 && this.vy >= 0) {      // apex of the arc
      this.split = true;
      this.dead = true;
      world.particles.puff(this.x, this.y);
      for (let i = -1; i <= 1; i++) {
        world.game.projectiles.push(new MirvBomblet({ x: this.x, y: this.y, vx: this.vx + i * 1.4, vy: this.vy, owner: this.owner }));
      }
    }
  }

  onImpact(world) { world.explode(this.x, this.y, 26, 25, this.owner); } // never reached apex
}

class BunkerBuilder extends Projectile {
  constructor(o) { super({ radius: 5, color: '#8bd3ff', ...o }); }
  onImpact(world) {
    world.terrain.addMound(this.x, this.y, 40);
    world.particles.dust(this.x, this.y, 30);
  }
}

export const WEAPONS = {
  standard: { name: 'Standard Shell', ctor: StandardShell },
  mirv: { name: 'Mirv Splitter', ctor: MirvSplitter },
  bunker: { name: 'Bunker Builder', ctor: BunkerBuilder },
};
export const WEAPON_ORDER = Object.keys(WEAPONS);

export function createProjectile(key, tank) {
  const m = tank.muzzle(), a = (tank.angle * Math.PI) / 180, speed = tank.power * 0.12;
  return new WEAPONS[key].ctor({ x: m.x, y: m.y, vx: Math.cos(a) * speed, vy: -Math.sin(a) * speed, owner: tank });
}
