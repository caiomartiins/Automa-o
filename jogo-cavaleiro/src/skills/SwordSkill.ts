import Phaser from 'phaser';
import { FX_DEPTH, Skill } from './Skill';

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
    this.swing(angle);
    if (this.level >= 5) this.swing(angle + Math.PI);
  }

  private swing(angle: number) {
    const p = this.g.player;
    const r = this.range;
    const color = this.g.classId === 'cavaleiro' ? 0xffe9a0 : this.g.classId === 'guarda' ? 0xcfe0ff : 0xffffff;

    const gfx = this.g.add.graphics({ x: p.x, y: p.y }).setDepth(FX_DEPTH);
    gfx.fillStyle(color, 0.45);
    gfx.slice(0, 0, r, angle - this.arc / 2, angle + this.arc / 2, false);
    gfx.fillPath();
    gfx.lineStyle(3, color, 0.9);
    gfx.beginPath();
    gfx.arc(0, 0, r, angle - this.arc / 2, angle + this.arc / 2, false);
    gfx.strokePath();
    this.g.tweens.add({ targets: gfx, alpha: 0, duration: 180, onComplete: () => gfx.destroy() });

    for (const e of this.enemies()) {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      if (dx * dx + dy * dy > (r + e.def.radius) ** 2) continue;
      const diff = Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - angle);
      if (Math.abs(diff) <= this.arc / 2) this.g.damageEnemy(e, this.damage, 140, p.x, p.y);
    }
  }
}
