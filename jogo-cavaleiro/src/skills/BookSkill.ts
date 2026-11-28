import { Skill } from './Skill';

/** Professor: arremessa livros que atravessam os inimigos. */
export class BookSkill extends Skill {
  readonly id = 'livro' as const;
  private timer = 300;

  get damage() { return (18 + 7 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (this.level >= 5 ? 1000 : 1250) / this.g.castHaste; }
  get count() { return [1, 2, 2, 3, 4][this.level - 1]; }
  get pierce() { return this.level >= 3 ? 3 : 2; }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    const targets = this.g.nearestEnemies(p.x, p.y, this.count, 540);
    if (!targets.length) {
      this.timer = 200;
      return;
    }
    this.timer = this.cooldown;
    this.g.playerAttacked();
    this.g.onBookCast();
    for (let i = 0; i < this.count; i++) {
      const t = targets[i % targets.length];
      const spread = i >= targets.length ? (i % 2 ? 0.22 : -0.22) : 0;
      const angle = Math.atan2(t.y - p.y, t.x - p.x) + spread;
      this.g.projectiles.fire('proj-livro', p.x, p.y - 8, angle, {
        src: this.id, speed: 400, damage: this.damage, pierce: this.pierce, radius: 11, life: 1400, knockback: 160,
      });
    }
  }
}
