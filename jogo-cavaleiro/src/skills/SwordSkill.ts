import Phaser from 'phaser';
import { Skill } from './Skill';

/** Golpe em arco na direção em que o herói está virado. */
export class SwordSkill extends Skill {
  readonly id = 'espada' as const;
  private timer = 300;
  private readonly arc = Phaser.Math.DegToRad(115);

  get damage() { return (15 + 5 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (950 - 80 * (this.level - 1)) / this.g.stats.haste; }
  get range() { return (78 + 10 * (this.level - 1)) * this.g.stats.area; }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = this.cooldown;
    const angle = this.g.facing.angle();
    this.g.playerAttacked();
    this.swing(angle);
    if (this.level >= 5) this.swing(angle + Math.PI);
  }

  private swing(angle: number) {
    const p = this.g.player;
    const r = this.range;
    const color = this.g.classId === 'cavaleiro' ? 0xffe9a0 : this.g.classId === 'guarda' ? 0xcfe0ff : 0xffffff;
    this.g.fx.slash(p.x, p.y, angle, r, color);

    for (const e of this.g.queryEnemies(p.x, p.y, r, this.near)) {
      if (!e.active) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      if (dx * dx + dy * dy > (r + e.def.radius) ** 2) continue;
      const diff = Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - angle);
      if (Math.abs(diff) <= this.arc / 2) this.g.damageEnemy(e, this.damage, 140, p.x, p.y);
    }
  }
}
