import Phaser from 'phaser';
import { Skill } from './Skill';

/** Caçador de Sombras: saraivada de flechas sombrias que fere tudo numa área. */
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
      // flechas sombrias caindo em pontos aleatórios da área, com impacto no chão
      for (let k = 0; k < (z.ticks % 2 ? 1 : 0) + (this.g.fx.animCount < 20 ? 1 : 0); k++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * this.radius;
        const x = z.x + Math.cos(a) * r;
        const y = z.y + Math.sin(a) * r * 0.8;
        this.g.fx.anim('fx-cacador', ['queda0'], x, y - 110, 150, 0.3, { x1: x, y1: y - 22, hold: 0.95 });
        this.g.time.delayedCall(140, () => this.g.fx.anim('fx-cacador', ['impacto0', 'impacto1', 'impacto2', 'impacto3'], x, y - 10, 320, 0.3, { hold: 0.6, depth: y + 1 }));
      }
      for (const e of this.g.queryEnemies(z.x, z.y, this.radius, this.near)) {
        if (e.active && (e.x - z.x) ** 2 + (e.y - z.y) ** 2 <= (this.radius + e.def.radius) ** 2) {
          this.g.damageEnemy(e, this.damage, 30, z.x, z.y, this.id);
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
      // círculo de runas no chão durante a saraivada
      this.g.fx.anim('fx-cacador', ['circulo0', 'circulo1'], t.x, t.y, this.ticks * 160 + 200, (this.radius * 2.2) / 144, { loop: this.ticks, hold: 0.85, alpha: 0.55, depth: -1e6 + 3 });
      this.zones.push({ x: t.x, y: t.y, ticks: this.ticks, next: now + 120 });
    }
  }
}
