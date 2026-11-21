import { Skill } from './Skill';

/** Atirador de Elite: flecha gigante que atravessa tudo em linha reta até o inimigo mais próximo. */
export class SniperSkill extends Skill {
  readonly id = 'tiro' as const;
  private timer = 700;

  get damage() { return (55 + 20 * (this.level - 1)) * this.g.stats.might; }
  get cooldown() { return (2300 - 150 * (this.level - 1)) / this.g.stats.haste; }
  get length() { return 620 * this.g.stats.area; }
  get width() { return (this.level >= 4 ? 34 : 24) * this.g.stats.area; }
  get shots() { return this.level >= 5 ? 3 : this.level >= 3 ? 2 : 1; }

  update(dt: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    const p = this.g.player;
    const targets = this.g.nearestEnemies(p.x, p.y, this.shots, 620);
    if (!targets.length) {
      this.timer = 300;
      return;
    }
    this.timer = this.cooldown;
    this.g.playerAttacked();
    for (let i = 0; i < this.shots; i++) {
      const t = targets[i % targets.length];
      const angle = Math.atan2(t.y - p.y, t.x - p.x) + (i >= targets.length ? (i % 2 ? 0.3 : -0.3) : 0);
      this.shoot(angle);
    }
  }

  private shoot(angle: number) {
    const p = this.g.player;
    const len = this.length;
    const w = this.width;
    this.g.fx.lance(p.x, p.y, angle, len, w, 0xfff2a0);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (const e of this.g.queryEnemies(p.x + (cos * len) / 2, p.y + (sin * len) / 2, len / 2 + w, this.near)) {
      if (!e.active) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const along = dx * cos + dy * sin;
      const perp = Math.abs(-dx * sin + dy * cos);
      if (along >= -e.def.radius && along <= len + e.def.radius && perp <= w / 2 + e.def.radius) {
        this.g.damageEnemy(e, this.damage, 260, p.x, p.y, this.id);
      }
    }
  }
}
