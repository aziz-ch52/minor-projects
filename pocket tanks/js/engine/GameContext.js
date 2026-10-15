export const STATE = Object.freeze({ AIMING: 'AIMING', FLYING: 'FLYING', SETTLING: 'SETTLING', GAME_OVER: 'GAME_OVER' });

/** Global game state: turn order, scores, wind, state machine. */
export class GameContext {
  constructor() {
    this.tanks = [];
    this.projectiles = [];
    this.reset();
  }

  reset() {
    this.state = STATE.AIMING;
    this.current = 0;
    this.scores = [0, 0];
    this.wind = Math.random() * 20 - 10;
    this.winner = null;
    this.projectiles.length = 0;
  }

  get activeTank() { return this.tanks[this.current]; }

  addScore(index, points) { this.scores[index] += points; }

  nextTurn() {
    this.current = 1 - this.current;
    this.wind = Math.max(-10, Math.min(10, this.wind + (Math.random() * 6 - 3)));
    this.state = STATE.AIMING;
  }

  endMatch() {
    const alive = this.tanks.filter((t) => t.alive);
    this.winner = alive.length === 1 ? alive[0] : null; // null = draw
    this.state = STATE.GAME_OVER;
  }
}
