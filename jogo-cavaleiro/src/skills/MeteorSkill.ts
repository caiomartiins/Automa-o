import Phaser from 'phaser';
import { Skill } from './Skill';

const FALL_MS = 550;

/** Arquimago: meteoros caem sobre inimigos aleatórios na tela e explodem. */
export class MeteorSkill extends Skill {
  readonly id = 'meteoro' as const;
  private timer = 800;
  private pending: { x: number; y: number; at: number }[] = [];

  get damage() { return (60 + 25 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (this.level >= 5 ? 2600 : 3200) / this.g.castHaste; }
  get count() { return [1, 2, 2, 3, 5][this.level - 1]; }
  get radius() { return (this.level >= 3 ? 105 : 85) * this.g.stats.area; }

  update(dt: number) {
    const now = this.g.elapsed;
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const m = this.pending[i];
      if (now < m.at) continue;
      this.g.explode(m.x, m.y, this.radius, this.damage, 260, 0xff5a2a, this.id);
      this.g.cameras.main.shake(120, 0.005);
      this.pending.splice(i, 1);
    }

    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    const view = this.g.cameras.main.worldView;
    const visible = this.g.nearestEnemies(p.x, p.y, 40, Math.max(view.width, view.height) / 2);
    if (!visible.length) {
      this.timer = 300;
      return;
    }
    this.timer = this.cooldown;
    Phaser.Utils.Array.Shuffle(visible);
    for (let i = 0; i < this.count; i++) {
      const t = visible[i % visible.length];
      const x = t.x + (i >= visible.length ? Phaser.Math.Between(-60, 60) : 0);
      const y = t.y + (i >= visible.length ? Phaser.Math.Between(-60, 60) : 0);
      const delay = i * 120;
      // marca no chão avisando onde vai cair, e o meteoro descendo
      this.g.fx.ring(x, y, this.radius * 0.9, 1, FALL_MS + delay, 0xff6a3a, 0.28);
      this.g.time.delayedCall(delay, () => this.g.fx.fall(x, y + 8, 'fx-meteoro', FALL_MS, 1.3));
      this.pending.push({ x, y, at: this.g.elapsed + FALL_MS + delay });
    }
  }
}
