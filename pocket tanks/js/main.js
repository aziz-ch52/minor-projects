import { GameContext, STATE } from './engine/GameContext.js';
import { InputHandler } from './engine/InputHandler.js';
import { Physics } from './engine/Physics.js';
import { Tank } from './entities/Tank.js';
import { createProjectile, WEAPONS, WEAPON_ORDER } from './entities/Projectile.js';
import { ParticleSystem } from './entities/Particle.js';
import { Terrain } from './environment/Terrain.js';

const W = 1000, H = 600;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const $ = (id) => document.getElementById(id);

const game = new GameContext();
const terrain = new Terrain(W, H);
const particles = new ParticleSystem();
const physics = new Physics();
const input = new InputHandler(canvas);
const world = { game, terrain, particles, physics, explode };
globalThis.__pocketTanks = { game, terrain }; // debug/test hook
let time = 0, settleTimer = 0, shake = 0;

/* ---------- HUD: DOM overlay, writes only when a value changes ---------- */
class Hud {
  constructor() {
    this.cache = {};
    this.panels = [$('p1'), $('p2')];
    this.buttons = WEAPON_ORDER.map((key, i) => {
      const b = document.createElement('button');
      b.textContent = `${i + 1} ${WEAPONS[key].name}`;
      b.onclick = () => selectWeapon(key);
      $('weapons').append(b);
      return b;
    });
  }
  set(k, v, apply) { if (this.cache[k] !== v) { this.cache[k] = v; apply(v); } }
  update() {
    const t = game.activeTank, over = game.state === STATE.GAME_OVER;
    this.set('angle', Math.round(t.angle), (v) => ($('angle').textContent = v));
    this.set('power', Math.round(t.power), (v) => { $('power').textContent = v; $('powerBar').style.width = v + '%'; });
    this.set('wind', Math.round(game.wind), (v) => ($('wind').textContent = `WIND ${v < 0 ? '◄' : '►'} ${Math.abs(v)}`));
    this.set('turn', `${game.state}|${game.current}`, () => {
      $('turn').textContent = game.state === STATE.AIMING ? `PLAYER ${game.current + 1} — AIM` : over ? 'MATCH OVER' : '…';
    });
    this.set('weapon', t.weaponKey, (k) => this.buttons.forEach((b, i) => b.classList.toggle('on', WEAPON_ORDER[i] === k)));
    game.tanks.forEach((tk, i) => {
      this.set('hp' + i, tk.hp, (v) => (this.panels[i].querySelector('.hp i').style.width = v + '%'));
      this.set('sc' + i, game.scores[i], (v) => (this.panels[i].querySelector('.score').textContent = v + ' pts'));
      this.set('act' + i, game.current === i && !over, (v) => this.panels[i].classList.toggle('active', v));
    });
    this.set('banner', over ? (game.winner ? game.winner.index : 'draw') : null, (v) => {
      $('banner').hidden = v === null;
      $('banner').innerHTML = v === null ? '' : `${v === 'draw' ? 'DRAW' : `PLAYER ${v + 1} WINS`}<br><small>click or press R to restart</small>`;
    });
  }
}
const hud = new Hud();

/* ---------- Actions ---------- */
function selectWeapon(key) { if (game.state === STATE.AIMING) game.activeTank.weaponKey = key; }

function cycleWeapon(e) {
  const i = WEAPON_ORDER.indexOf(game.activeTank.weaponKey), n = WEAPON_ORDER.length;
  selectWeapon(WEAPON_ORDER[(i + (e?.shiftKey ? -1 : 1) + n) % n]);
}

function fire() {
  if (game.state !== STATE.AIMING) return;
  const t = game.activeTank, m = t.muzzle();
  game.projectiles.push(createProjectile(t.weaponKey, t));
  particles.puff(m.x, m.y);
  game.state = STATE.FLYING;
}

function explode(x, y, r, dmg, owner) {
  terrain.carveExplosion(x, y, r);
  particles.explosion(x, y, r);
  shake = Math.max(shake, r * 0.25);
  for (const { tank, damage } of Physics.radialDamage(game.tanks, x, y, r, dmg)) {
    const wasAlive = tank.alive;
    tank.takeDamage(damage);
    if (tank !== owner) game.addScore(owner.index, damage);
    if (wasAlive && !tank.alive) particles.explosion(tank.x, tank.y - 10, 55);
  }
}

function newMatch() {
  terrain.generate();
  game.tanks = [
    new Tank({ index: 0, x: 120, color: '#4aa3ff', angle: 45 }),
    new Tank({ index: 1, x: W - 120, color: '#ff6a5a', angle: 135 }),
  ];
  game.reset();
  game.tanks.forEach((t) => t.snapTo(terrain));
  particles.clear();
}

input.onPress('Space', fire);
input.onPress('Enter', fire);
input.onPress('Tab', cycleWeapon);
input.onPress('KeyR', () => game.state === STATE.GAME_OVER && newMatch());
WEAPON_ORDER.forEach((k, i) => input.onPress('Digit' + (i + 1), () => selectWeapon(k)));
$('fire').onclick = fire;
$('banner').onclick = newMatch;

/* ---------- Simulation (fixed 60 Hz) ---------- */
function handleAim() {
  const t = game.activeTank, fine = input.isDown('ShiftLeft') || input.isDown('ShiftRight') ? 0.25 : 1;
  const dA = (input.isDown('ArrowLeft') ? 0.6 : 0) - (input.isDown('ArrowRight') ? 0.6 : 0);
  const dP = (input.isDown('ArrowUp') ? 0.5 : 0) - (input.isDown('ArrowDown') ? 0.5 : 0);
  if (dA || dP) t.adjust(dA * fine, dP * fine);

  if (input.pointer.down) {                              // drag-to-aim: direction = angle, distance = power
    const dx = input.pointer.x - t.x, dy = t.y - 13 - input.pointer.y;
    let ang = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (ang < 0) ang = dx >= 0 ? 0 : 180;
    t.angle = ang;
    t.power = Math.max(5, Math.min(100, Math.hypot(dx, dy) / 1.8));
  }
}

function endTurn() {
  game.tanks.some((t) => !t.alive) ? game.endMatch() : game.nextTurn();
}

function update() {
  time++;
  shake *= 0.9;
  game.tanks.forEach((t) => t.update(terrain));
  particles.update();

  switch (game.state) {
    case STATE.AIMING: handleAim(); break;
    case STATE.FLYING:
      for (const p of [...game.projectiles]) p.update(world);
      game.projectiles = game.projectiles.filter((p) => !p.dead);
      if (!game.projectiles.length) { game.state = STATE.SETTLING; settleTimer = 0; }
      break;
    case STATE.SETTLING:
      if (++settleTimer > 45 && game.tanks.every((t) => t.grounded)) endTurn();
      break;
  }
}

/* ---------- Rendering ---------- */
const sky = ctx.createLinearGradient(0, 0, 0, H);
sky.addColorStop(0, '#16233f');
sky.addColorStop(1, '#6a8fc2');

function render() {
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  if (shake > 0.3) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  terrain.draw(ctx);
  game.tanks.forEach((t) => t.draw(ctx, game.state === STATE.AIMING && t === game.activeTank, time));
  game.projectiles.forEach((p) => p.draw(ctx));
  particles.draw(ctx);
  ctx.restore();
}

/* ---------- Loop ---------- */
const STEP = 1000 / 60;
let last = performance.now(), acc = 0;
function frame(now) {
  acc += Math.min(now - last, 100);
  last = now;
  while (acc >= STEP) { update(); acc -= STEP; }
  render();
  hud.update();
  requestAnimationFrame(frame);
}

newMatch();
requestAnimationFrame(frame);
