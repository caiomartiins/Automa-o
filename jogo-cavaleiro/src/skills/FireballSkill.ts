import { Skill } from './Skill';

/** Mago: bolas de fogo teleguiadas no inimigo mais próximo, que explodem em área. */
export class FireballSkill extends Skill {
  readonly id = 'fogo' as const;
  private timer = 300;

  get damage() { return (14 + 6 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (this.level >= 5 ? 950 : 1150) / this.g.castHaste; }
  get count() { return [1, 2, 2, 3, 4][this.level - 1]; }
  get blast() { return (this.level >= 3 ? 58 : 44) * this.g.stats.area; }

  trigger() {
    this.timer = 0;
  }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    const targets = this.g.nearestEnemies(p.x, p.y, this.count, 520);
    if (!targets.length) {
      this.timer = 200;
      return;
    }
    this.timer = this.cooldown;
    this.g.playerAttacked();
    for (let i = 0; i < this.count; i++) {
      const t = targets[i % targets.length];
      const spread = i >= targets.length ? (i % 2 ? 0.25 : -0.25) : 0;
      const angle = Math.atan2(t.y - p.y, t.x - p.x) + spread;
      this.g.projectiles.fire('proj-fogo', p.x, p.y - 6, angle, {
        src: this.id, speed: 360, damage: this.damage, pierce: 1, radius: 8, life: 1600, knockback: 120, explode: this.blast,
      });
    }
  }
}
