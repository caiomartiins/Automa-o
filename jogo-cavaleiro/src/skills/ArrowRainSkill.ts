import Phaser from 'phaser';
import { Skill } from './Skill';

/** Caçador: chuva de flechas que fere tudo numa área por alguns instantes. */
export class ArrowRainSkill extends Skill {
  readonly id = 'chuva' as const;
  private timer = 600;
  private zones: { x: number; y: number; ticks: number; next: number }[] = [];

  get damage() { return (9 + 3 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return 2600 / this.g.stats.haste; }
  get radius() { return (this.level >= 2 ? 95 : 80) * this.g.stats.area; }
  get zonesPerCast() { return this.level >= 5 ? 3 : this.level >= 3 ? 2 : 1; }
  get ticks() { return this.level >= 4 ? 8 : 6; }

  update(dt: number) {
    const now = this.g.elapsed;
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      if (now < z.next) continue;
      z.next = now + 160;
      z.ticks--;
      // flechinhas caindo em pontos aleatórios da área
      for (let k = 0; k < 3; k++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * this.radius;
        this.g.fx.lance(z.x + Math.cos(a) * r, z.y + Math.sin(a) * r - 40, Math.PI / 2, 40, 10, 0xd8f0a0);
      }
      for (const e of this.g.queryEnemies(z.x, z.y, this.radius, this.near)) {
        if (e.active && (e.x - z.x) ** 2 + (e.y - z.y) ** 2 <= (this.radius + e.def.radius) ** 2) {
          this.g.damageEnemy(e, this.damage, 30, z.x, z.y);
        }
      }
      if (z.ticks <= 0) this.zones.splice(i, 1);
    }

    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    const targets = this.g.nearestEnemies(p.x, p.y, 12, 500);
    if (!targets.length) {
      this.timer = 300;
      return;
    }
    this.timer = this.cooldown;
    Phaser.Utils.Array.Shuffle(targets);
    for (let i = 0; i < this.zonesPerCast; i++) {
      const t = targets[i % targets.length];
      this.g.fx.ring(t.x, t.y, this.radius, 1, this.ticks * 160 + 100, 0x9ad06a, 0.18);
      this.zones.push({ x: t.x, y: t.y, ticks: this.ticks, next: now + 120 });
    }
  }
}
