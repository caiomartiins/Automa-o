import { Skill } from './Skill';

/** Arqueiro: flechas rápidas nos inimigos mais próximos. */
export class ArrowSkill extends Skill {
  readonly id = 'flecha' as const;
  private timer = 250;

  get damage() { return (11 + 4 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return 720 / this.g.stats.haste; }
  get count() { return [1, 2, 2, 3, 4][this.level - 1]; }
  get pierce() { return this.level >= 5 ? 3 : this.level >= 3 ? 2 : 1; }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    const targets = this.g.nearestEnemies(p.x, p.y, this.count, 560);
    if (!targets.length) {
      this.timer = 150;
      return;
    }
    this.timer = this.cooldown;
    this.g.playerAttacked();
    for (let i = 0; i < this.count; i++) {
      const t = targets[i % targets.length];
      const spread = i >= targets.length ? (i % 2 ? 0.18 : -0.18) : 0;
      const angle = Math.atan2(t.y - p.y, t.x - p.x) + spread;
      this.g.projectiles.fire('proj-flecha', p.x, p.y - 4, angle, {
        src: this.id, speed: 620, damage: this.damage, pierce: this.pierce, radius: 7, life: 1100, knockback: 90,
      });
    }
  }
}
