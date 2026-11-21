import { FX_DEPTH, Skill } from './Skill';

/** Estocada longa e perfurante (habilidade do Cavaleiro). */
export class LanceSkill extends Skill {
  readonly id = 'lanca' as const;
  private timer = 400;

  get damage() { return (30 + 15 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (2400 - 150 * (this.level - 1)) / this.g.stats.haste; }
  get length() { return (240 + 20 * (this.level - 1)) * this.g.stats.area; }
  get width() { return 34 * this.g.stats.area; }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = this.cooldown;
    const base = this.g.facing.angle();
    const dirs = this.level >= 5 ? 4 : this.level >= 3 ? 2 : 1;
    for (let i = 0; i < dirs; i++) this.thrust(base + (i * Math.PI * 2) / dirs);
  }

  private thrust(angle: number) {
    const p = this.g.player;
    const len = this.length;
    const w = this.width;

    const gfx = this.g.add.graphics({ x: p.x, y: p.y }).setDepth(FX_DEPTH).setRotation(angle);
    gfx.fillStyle(0xffd04a, 0.35);
    gfx.fillRect(0, -w / 2, len, w);
    gfx.fillStyle(0xfff3c4, 0.95);
    gfx.fillRect(0, -3, len - 18, 6);
    gfx.fillTriangle(len - 22, -10, len - 22, 10, len, 0);
    gfx.scaleX = 0.15;
    this.g.tweens.add({ targets: gfx, scaleX: 1, duration: 90, ease: 'Cubic.Out' });
    this.g.tweens.add({ targets: gfx, alpha: 0, delay: 120, duration: 200, onComplete: () => gfx.destroy() });

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (const e of this.enemies()) {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const along = dx * cos + dy * sin;
      const perp = Math.abs(-dx * sin + dy * cos);
      if (along >= -e.def.radius && along <= len + e.def.radius && perp <= w / 2 + e.def.radius) {
        this.g.damageEnemy(e, this.damage, 320, p.x, p.y);
      }
    }
  }
}
