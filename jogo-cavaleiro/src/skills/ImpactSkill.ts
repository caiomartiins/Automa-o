import { Skill } from './Skill';

/** Cavaleiro: golpe de espadão que explode no chão à frente. */
export class ImpactSkill extends Skill {
  readonly id = 'impacto' as const;
  private timer = 500;

  get damage() { return (45 + 20 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (this.level >= 5 ? 1900 : 2500) / this.g.stats.haste; }
  get radius() { return (100 + 12 * (this.level - 1)) * this.g.stats.area; }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    // só golpeia quando há inimigo perto o bastante
    if (!this.g.nearestEnemies(p.x, p.y, 1, this.radius + 50).length) {
      this.timer = 150;
      return;
    }
    this.timer = this.cooldown;
    this.g.playerAttacked();
    const x = p.x + this.g.facing.x * 34;
    const y = p.y + this.g.facing.y * 34 + 12;
    const r = this.radius;
    const dmg = this.damage;
    this.g.explode(x, y, r, dmg, 380, 0xffd04a, this.id);
    this.g.cameras.main.shake(110, 0.005);
    if (this.level >= 3) {
      this.g.time.delayedCall(230, () => this.g.explode(x, y, r * 1.45, dmg * 0.5, 260, 0xffb040, this.id));
    }
  }
}
